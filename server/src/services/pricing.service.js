import { Product, DeliveryZone, Settings, Coupon } from '../models/index.js';
import { HttpError } from '../utils/httpError.js';

/**
 * Server-side pricing (CLAUDE.md non-negotiable 1). Every price, fee, discount and total is read
 * from the database. Amounts sent by the browser are ignored; only ids and quantities are used.
 */

export const MAX_LINES = 50;
export const MAX_QTY = 99;

const emptySettings = {
  features: { coupons: false },
  freeDeliveryThreshold: 0,
};

export async function getSettingsDoc() {
  const doc = await Settings.findOneAndUpdate(
    { key: 'main' },
    { $setOnInsert: { key: 'main' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  return doc ?? emptySettings;
}

/** Merges duplicate variant lines and caps quantities. Input is trusted only for ids and qty. */
export function mergeItems(items) {
  const map = new Map();
  for (const it of items) {
    const key = String(it.variantId);
    const prev = map.get(key);
    if (prev) {
      prev.qty = Math.min(prev.qty + it.qty, MAX_QTY);
    } else {
      map.set(key, {
        productId: String(it.productId),
        variantId: key,
        qty: Math.min(it.qty, MAX_QTY),
      });
    }
  }
  return [...map.values()];
}

export function variantLabel(optionValues) {
  const values =
    optionValues instanceof Map ? [...optionValues.values()] : Object.values(optionValues ?? {});
  return values.length ? values.join(' · ') : 'Standard';
}

/** Prices every line from the database and flags anything that cannot be bought as requested. */
export async function resolveLines(items) {
  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await Product.find({ _id: { $in: productIds }, status: 'active' }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  return items.map((it) => {
    const product = byId.get(it.productId);
    const variant = product?.variants.find((v) => String(v._id) === it.variantId);
    const base = {
      productId: it.productId,
      variantId: it.variantId,
      qty: it.qty,
      slug: product?.slug ?? null,
      name: product?.name ?? 'Unavailable item',
      image: product?.images?.[0]?.url ?? null,
      label: variant ? variantLabel(variant.optionValues) : '',
      type: product?.type ?? null,
    };

    if (!product || !variant || variant.isActive === false) {
      return {
        ...base,
        unitPrice: 0,
        compareAtPrice: null,
        lineTotal: 0,
        stock: 0,
        available: false,
        warning: 'This item is no longer available. Remove it to continue.',
      };
    }

    let warning = null;
    let available = true;
    if (variant.stock <= 0) {
      available = false;
      warning = 'Out of stock';
    } else if (it.qty > variant.stock) {
      available = false;
      warning = `Only ${variant.stock} left. Reduce the quantity to continue.`;
    }

    return {
      ...base,
      unitPrice: variant.price,
      compareAtPrice: variant.compareAtPrice ?? null,
      lineTotal: variant.price * it.qty,
      stock: variant.stock,
      available,
      warning,
    };
  });
}

/**
 * Delivery fee for a state/city from the DeliveryZone table. A city-specific zone wins over the
 * whole-state zone ('*'). Free delivery applies above the store threshold.
 */
export async function deliveryFor({ method, state, city, subtotal, settings }) {
  if (method === 'pickup') {
    return { method, fee: 0, zone: null, freeDelivery: false, needsAddress: false };
  }
  if (!state) {
    return { method, fee: 0, zone: null, freeDelivery: false, needsAddress: true };
  }

  const zones = await DeliveryZone.find({
    state,
    isActive: true,
    city: { $in: [city ?? '', '*'] },
  })
    .sort({ city: -1 })
    .lean();
  const zone = zones.find((z) => z.city !== '*') ?? zones[0];
  if (!zone) {
    throw new HttpError(400, `We do not deliver to ${state} yet. Choose pickup or another state.`);
  }

  const threshold = settings.freeDeliveryThreshold ?? 0;
  const freeDelivery = threshold > 0 && subtotal >= threshold;
  return {
    method,
    fee: freeDelivery ? 0 : zone.fee,
    zone: { state: zone.state, city: zone.city, etaText: zone.etaText, baseFee: zone.fee },
    freeDelivery,
    needsAddress: false,
  };
}

const couponFail = (code, message) => ({ code, valid: false, discount: 0, message });

/** Checks a coupon against the rules in the Coupon model. Returns the discount in kobo. */
export async function evaluateCoupon(rawCode, subtotal, settings) {
  const code = String(rawCode).trim().toUpperCase();
  if (!settings.features?.coupons) return couponFail(code, 'Coupons are not available right now.');

  const c = await Coupon.findOne({ code }).lean();
  const now = Date.now();
  if (!c || !c.isActive) return couponFail(code, 'This coupon code is not valid.');
  if (c.startsAt && now < new Date(c.startsAt).getTime())
    return couponFail(code, 'This coupon is not active yet.');
  if (c.endsAt && now > new Date(c.endsAt).getTime())
    return couponFail(code, 'This coupon has expired.');
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) {
    return couponFail(code, 'This coupon has been fully used.');
  }
  if (subtotal < (c.minSubtotal ?? 0)) {
    return couponFail(
      code,
      `Spend at least ₦${((c.minSubtotal ?? 0) / 100).toLocaleString('en-NG')} to use this coupon.`
    );
  }

  let discount = c.type === 'percent' ? Math.floor((subtotal * c.value) / 100) : c.value;
  if (c.maxDiscount != null) discount = Math.min(discount, c.maxDiscount);
  discount = Math.min(discount, subtotal);
  return { code, valid: true, discount, message: 'Coupon applied.' };
}

/**
 * The full cart quote used by the cart drawer, the cart page and (later) checkout.
 * Everything returned in kobo, and every value is computed here.
 */
export async function quoteCart({ items, state, city, method = 'delivery', coupon }) {
  const settings = await getSettingsDoc();
  const merged = mergeItems(items);
  const lines = await resolveLines(merged);

  const subtotal = lines.reduce((sum, l) => (l.available ? sum + l.lineTotal : sum), 0);
  const delivery = await deliveryFor({ method, state, city, subtotal, settings });
  const couponResult = coupon ? await evaluateCoupon(coupon, subtotal, settings) : null;
  const discount = couponResult?.valid ? couponResult.discount : 0;
  const total = Math.max(0, subtotal + delivery.fee - discount);

  return {
    lines,
    subtotal,
    deliveryFee: delivery.fee,
    delivery,
    discount,
    coupon: couponResult,
    total,
    currency: settings.currency ?? 'NGN',
    freeDeliveryThreshold: settings.freeDeliveryThreshold ?? 0,
    hasIssues: lines.some((l) => !l.available),
  };
}
