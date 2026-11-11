import crypto from 'node:crypto';
import { Order, Payment, Counter, Coupon, Product, Refund } from '../models/index.js';
import { quoteCart } from './pricing.service.js';
import { initializeTransaction, verifyTransaction } from './paystack.service.js';
import { decrementVariant, refreshCombosContaining, refreshComboStock } from './stock.service.js';
import { HttpError } from '../utils/httpError.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import { formatNaira } from '../utils/money.js';

const UNPAID_WINDOW_MS = 24 * 60 * 60 * 1000;
const clientBase = () => env.CLIENT_URL.replace(/\/$/, '');

/** NVT-YYMM-NNNNN, sequence reset each month (DECISIONS.md). Atomic via Counter. */
export async function nextOrderNumber(date = new Date()) {
  const yy = String(date.getUTCFullYear()).slice(2);
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const counter = await Counter.findByIdAndUpdate(
    `order-${yy}${mm}`,
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return `NVT-${yy}${mm}-${String(counter.seq).padStart(5, '0')}`;
}

/** Unique per attempt, e.g. NVT-2611-00042-8F3K. */
export const newReference = (orderNumber) =>
  `${orderNumber}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

const addressSnapshot = (a = {}) => ({
  line1: a.line1,
  line2: a.line2 ?? '',
  landmark: a.landmark ?? '',
  city: a.city,
  state: a.state,
});

async function buildItems(lines) {
  const ids = [...new Set(lines.map((l) => l.productId))];
  const products = await Product.find({ _id: { $in: ids } }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  return lines.map((l) => {
    const product = byId.get(l.productId);
    const variant = product?.variants.find((v) => String(v._id) === l.variantId);
    const comboItems =
      product?.type === 'combo'
        ? product.comboItems.map((ci) => {
            const child = byId.get(String(ci.product)) ?? null;
            const childVariant = child?.variants.find((v) => String(v._id) === String(ci.variant));
            return {
              name: child?.name ?? 'Item',
              qty: ci.qty,
              unitPrice: childVariant?.price ?? 0,
              product: ci.product,
              variant: ci.variant,
            };
          })
        : [];
    return {
      product: l.productId,
      variant: l.variantId,
      name: product?.name ?? l.name,
      variantLabel: l.label,
      image: l.image,
      sku: variant?.sku ?? '',
      unitPrice: l.unitPrice,
      qty: l.qty,
      lineTotal: l.lineTotal,
      comboItems,
    };
  });
}

/**
 * Creates a pending order from the cart and starts a Paystack transaction.
 * Every amount is recomputed here. The browser's numbers are never read.
 */
export async function createOrder({
  items,
  customer,
  method,
  address,
  notes,
  coupon,
  user = null,
}) {
  const quote = await quoteCart({
    items,
    state: address?.state,
    city: address?.city,
    method,
    coupon,
  });

  if (quote.lines.length === 0) throw new HttpError(400, 'Your cart is empty');
  if (quote.hasIssues) {
    throw new HttpError(
      400,
      'Some items in your cart need attention. Review your cart and try again.',
      quote.lines.filter((l) => !l.available).map((l) => ({ path: l.name, message: l.warning }))
    );
  }
  if (method === 'delivery' && quote.delivery.needsAddress) {
    throw new HttpError(400, 'Add a delivery address to continue');
  }
  if (quote.total <= 0)
    throw new HttpError(400, 'This order total is zero, so there is nothing to pay');

  const orderNumber = await nextOrderNumber();
  const reference = newReference(orderNumber);
  const order = await Order.create({
    user: user ? user._id : null,
    orderNumber,
    customer,
    items: await buildItems(quote.lines),
    delivery: {
      method,
      address: method === 'delivery' ? addressSnapshot(address) : {},
      notes: notes ?? '',
      zone: quote.delivery.zone?.id ?? null,
      fee: quote.deliveryFee,
    },
    coupon: { code: quote.coupon?.valid ? quote.coupon.code : null, discount: quote.discount },
    subtotal: quote.subtotal,
    deliveryFee: quote.deliveryFee,
    discount: quote.discount,
    total: quote.total,
    currency: quote.currency,
    status: 'pending_payment',
    paymentStatus: 'unpaid',
    payment: { provider: 'paystack', reference, references: [reference] },
    timeline: [
      { status: 'pending_payment', note: 'Order created, awaiting payment', by: 'system' },
    ],
    expiresAt: new Date(Date.now() + UNPAID_WINDOW_MS),
  });

  return startTransaction(order, reference);
}

/** Opens (or re-opens) a Paystack transaction for an order. The amount is always the stored total. */
async function startTransaction(order, reference) {
  let init;
  try {
    init = await initializeTransaction({
      email: order.customer.email,
      amount: order.total,
      currency: order.currency,
      reference,
      callback_url: `${clientBase()}/order/success`,
      metadata: {
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        custom_fields: [
          { display_name: 'Order', variable_name: 'order', value: order.orderNumber },
        ],
      },
    });
  } catch (err) {
    // The order is kept as pending so the customer can retry from the track page.
    logger.warn(`Paystack initialize failed for ${order.orderNumber}: ${err.message}`);
    throw new HttpError(err.statusCode ?? 502, err.message, [
      { path: 'orderNumber', message: order.orderNumber },
    ]);
  }

  order.payment.accessCode = init.access_code;
  order.payment.reference = reference;
  await order.save();
  return {
    orderNumber: order.orderNumber,
    reference,
    accessCode: init.access_code,
    authorizationUrl: init.authorization_url,
    amount: order.total,
    currency: order.currency,
  };
}

/** New reference for an unpaid order, after a failed or cancelled attempt. Checks the email on the order. */
export async function retryPayment(orderNumber, email) {
  const order = await Order.findOne({ orderNumber });
  if (!order || order.customer.email !== email.toLowerCase().trim()) {
    throw new HttpError(404, 'We could not find an order matching those details.');
  }
  if (order.paymentStatus === 'paid') throw new HttpError(400, 'This order is already paid.');
  if (order.status === 'cancelled')
    throw new HttpError(400, 'This order was cancelled. Please place a new order.');

  const reference = newReference(orderNumber);
  order.payment.references.push(reference);
  order.timeline.push({
    status: 'pending_payment',
    note: 'New payment attempt started',
    by: 'customer',
  });
  return startTransaction(order, reference);
}

/** Records one Paystack event or attempt. A duplicate webhook event is ignored. */
async function recordPayment({ order, reference, tx, source, eventId = null }) {
  try {
    await Payment.create({
      order: order._id,
      reference,
      amount: tx.amount ?? 0,
      currency: tx.currency ?? 'NGN',
      status: tx.status,
      channel: tx.channel ?? null,
      raw: {
        id: tx.id,
        status: tx.status,
        gateway_response: tx.gateway_response,
        channel: tx.channel,
        paid_at: tx.paid_at,
        fees: tx.fees,
      },
      source,
      eventId,
    });
  } catch (err) {
    if (err.code !== 11000) throw err; // 11000 = already recorded: fine
  }
}

/** Atomically takes stock for every paid line. Never drives stock below zero. */
async function deductStock(order) {
  const issues = [];
  for (const item of order.items) {
    if (item.comboItems?.length) {
      for (const child of item.comboItems) {
        const ok = await decrementVariant(child.product, child.variant, child.qty * item.qty);
        if (!ok) issues.push(`${child.name} (needed ${child.qty * item.qty})`);
      }
      await Product.updateOne({ _id: item.product }, { $inc: { soldCount: item.qty } });
      await refreshComboStock(item.product);
      for (const child of item.comboItems) await refreshCombosContaining(child.product);
    } else {
      const ok = await decrementVariant(item.product, item.variant, item.qty);
      if (!ok) issues.push(`${item.name} ${item.variantLabel} (needed ${item.qty})`);
      else await Product.updateOne({ _id: item.product }, { $inc: { soldCount: item.qty } });
      await refreshCombosContaining(item.product);
    }
  }
  return issues;
}

/**
 * The one place an order becomes paid (docs/04-paystack.md). Used by the verify endpoint, the
 * webhook, admin re-verify and the stale-order job. Idempotent: a second call changes nothing.
 *
 * source: 'verify' | 'webhook' | 'admin_reverify'
 */
export async function confirmPayment(reference, source, { eventId = null } = {}) {
  const order = await Order.findOne({ 'payment.references': reference });
  if (!order) throw new HttpError(404, 'We could not find a payment for that reference.');
  if (order.paymentStatus === 'paid') return { order, status: 'paid' };

  const tx = await verifyTransaction(reference);
  const amountOk = Number(tx.amount) === order.total;
  const currencyOk = (tx.currency ?? 'NGN') === order.currency;
  const referenceOk = tx.reference === reference;

  if (tx.status === 'success' && (!amountOk || !currencyOk || !referenceOk)) {
    // Never fulfil a mismatch. Flag it for the owner.
    await recordPayment({ order, reference, tx: { ...tx, status: 'mismatch' }, source, eventId });
    await Order.updateOne(
      { _id: order._id },
      {
        $set: { paymentStatus: 'failed', stockIssue: false },
        $push: {
          timeline: {
            status: order.status,
            note: `Payment amount mismatch (paid ${tx.amount}, expected ${order.total}). Flagged for review.`,
            by: 'system',
          },
        },
      }
    );
    logger.error(
      `Amount mismatch on ${order.orderNumber}: paid ${tx.amount}, expected ${order.total}`
    );
    return { order: await Order.findById(order._id).lean(), status: 'mismatch' };
  }

  if (tx.status !== 'success') {
    await recordPayment({ order, reference, tx, source, eventId });
    if (tx.status === 'failed') {
      await Order.updateOne(
        { _id: order._id, paymentStatus: { $ne: 'paid' } },
        {
          $set: { paymentStatus: 'failed' },
          $push: { timeline: { status: order.status, note: 'Payment failed', by: source } },
        }
      );
    }
    const fresh = await Order.findById(order._id).lean();
    return { order: fresh, status: tx.status === 'failed' ? 'failed' : 'pending' };
  }

  // Claim the order atomically. Only one caller can move it from unpaid to paid.
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, paymentStatus: { $ne: 'paid' } },
    {
      $set: {
        paymentStatus: 'paid',
        status: 'paid',
        'payment.reference': reference,
        'payment.channel': tx.channel ?? null,
        'payment.paidAt': tx.paid_at ? new Date(tx.paid_at) : new Date(),
        'payment.amountPaid': Number(tx.amount),
        'payment.fees': Number(tx.fees ?? 0),
        'payment.gatewayResponse': tx.gateway_response ?? null,
        'payment.customerCode': tx.customer?.customer_code ?? null,
        'payment.authorizationLast4': tx.authorization?.last4 ?? null,
        'payment.cardType': tx.authorization?.card_type ?? null,
      },
      $push: {
        timeline: {
          status: 'paid',
          note: `Paid via ${tx.channel ?? 'Paystack'}`,
          by: source,
          at: new Date(),
        },
      },
    },
    { new: true }
  ).lean();

  if (!claimed) {
    return { order: await Order.findById(order._id).lean(), status: 'paid' };
  }

  await recordPayment({ order: claimed, reference, tx, source, eventId });
  const issues = await deductStock(claimed);
  await Order.updateOne(
    { _id: claimed._id },
    {
      $set: { stockDeducted: true, stockIssue: issues.length > 0 },
      ...(issues.length && {
        $push: {
          timeline: {
            status: 'paid',
            note: `Stock short for: ${issues.join(', ')}. Order kept; review stock.`,
            by: 'system',
          },
        },
      }),
    }
  );
  if (claimed.coupon?.code)
    await Coupon.updateOne({ code: claimed.coupon.code }, { $inc: { usedCount: 1 } });

  const finalOrder = await Order.findById(claimed._id).lean();
  if (issues.length)
    logger.warn(`Stock issue on paid order ${finalOrder.orderNumber}: ${issues.join('; ')}`);
  return { order: finalOrder, status: 'paid' };
}

/** Refund webhooks: update the Refund row and the order's payment status. */
export async function applyRefundEvent(type, data) {
  const refundId = data.id ? String(data.id) : null;
  const reference = data.transaction?.reference ?? data.transaction_reference ?? null;
  const refund = await Refund.findOne({
    $or: [{ paystackRefundId: refundId }, { paymentReference: reference, status: 'pending' }],
  });
  if (!refund) return { ignored: true };

  refund.status = type === 'refund.processed' ? 'processed' : 'failed';
  refund.paystackRefundId = refundId ?? refund.paystackRefundId;
  await refund.save();

  const order = await Order.findById(refund.order);
  if (!order) return { ignored: true };
  if (refund.status === 'processed') {
    const processed = await Refund.aggregate([
      { $match: { order: order._id, status: 'processed' } },
      { $group: { _id: null, sum: { $sum: '$amount' } } },
    ]);
    const refunded = processed[0]?.sum ?? 0;
    const full = refunded >= order.total;
    order.paymentStatus = full ? 'refunded' : 'partially_refunded';
    if (full) order.status = 'refunded';
    order.timeline.push({
      status: order.status,
      note: `Refund of ${formatNaira(refund.amount)} processed`,
      by: 'paystack',
    });
    await order.save();
  }
  return { refund: refund.status };
}

/** Webhook entry point. Routes Paystack events to the right handler. */
export async function handlePaystackEvent(event) {
  const type = event?.event;
  const data = event?.data ?? {};
  const eventId = `${type}:${data.id ?? data.reference ?? ''}`;

  if (type === 'charge.success') {
    return confirmPayment(data.reference, 'webhook', { eventId });
  }
  if (type === 'refund.processed' || type === 'refund.failed') {
    return applyRefundEvent(type, data);
  }
  return { ignored: true };
}

/** Summary safe to show on the success page: no address, no internal notes. */
export function orderSummary(order) {
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    total: order.total,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    discount: order.discount,
    currency: order.currency,
    deliveryMethod: order.delivery?.method,
    createdAt: order.createdAt,
    items: order.items.map((i) => ({
      name: i.name,
      variantLabel: i.variantLabel,
      qty: i.qty,
      lineTotal: i.lineTotal,
      image: i.image,
    })),
  };
}

/** Public order tracking: status and timeline only. Matched by order number plus email or phone. */
export async function trackOrder(orderNumber, emailOrPhone) {
  const order = await Order.findOne({ orderNumber }).lean();
  const needle = emailOrPhone.trim().toLowerCase();
  const digits = needle.replace(/\D/g, '');
  const match =
    order &&
    (order.customer.email === needle ||
      (digits.length >= 7 && order.customer.phone.replace(/\D/g, '').endsWith(digits.slice(-7))));
  if (!match) throw new HttpError(404, 'We could not find an order matching those details.');
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    total: order.total,
    createdAt: order.createdAt,
    deliveryMethod: order.delivery.method,
    timeline: order.timeline.map((t) => ({ status: t.status, note: t.note, at: t.at })),
  };
}

/** Pending orders older than 24 hours: verify once with Paystack (a webhook may have been missed), then cancel. */
export async function cancelStaleOrders(now = new Date()) {
  const stale = await Order.find({ status: 'pending_payment', expiresAt: { $lt: now } }).limit(200);
  let cancelled = 0;
  for (const order of stale) {
    try {
      const result = await confirmPayment(order.payment.reference, 'verify');
      if (result.status === 'paid') continue;
    } catch (err) {
      // Paystack not configured means the order can never be paid: cancel it. Other errors: try next run.
      if (err.statusCode !== 503) continue;
    }
    await Order.updateOne(
      { _id: order._id, status: 'pending_payment' },
      {
        $set: { status: 'cancelled' },
        $push: {
          timeline: { status: 'cancelled', note: 'Cancelled: unpaid after 24 hours', by: 'system' },
        },
      }
    );
    cancelled += 1;
  }
  return cancelled;
}
