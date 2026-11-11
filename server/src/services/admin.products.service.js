import { Product, Category, Brand, Order } from '../models/index.js';
import { HttpError } from '../utils/httpError.js';
import { nairaToKobo } from '../utils/money.js';
import { slugify, escapeRegex } from '../utils/text.js';
import { logFromRequest, snapshot } from './activity.service.js';
import { refreshComboStock, refreshCombosContaining } from './stock.service.js';

/**
 * Admin product management. Admin payloads carry prices in NAIRA (the form speaks naira); they are
 * converted to kobo here, at the boundary, and stored as integers (CLAUDE.md money rule).
 */

const ADMIN_LIST_FIELDS =
  'name slug type status brand category condition tags images priceMin priceMax totalStock variants.stock variants.isActive createdAt updatedAt';

export async function listProductsAdmin({ q, status, category, brand, page, limit, sort }) {
  const match = {};
  if (status) match.status = status;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    const brandIds = (await Brand.find({ name: rx }).select('_id').lean()).map((b) => b._id);
    match.$or = [{ name: rx }, { slug: rx }, { brand: { $in: brandIds } }];
  }
  if (category) match.category = category;
  if (brand) match.brand = brand;

  const sorts = {
    updated: { updatedAt: -1 },
    name: { name: 1 },
    price_desc: { priceMin: -1 },
    price_asc: { priceMin: 1 },
    stock_asc: { totalStock: 1 },
  };
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Product.find(match)
      .select(ADMIN_LIST_FIELDS)
      .sort(sorts[sort] ?? sorts.updated)
      .skip(skip)
      .limit(limit)
      .populate('brand', 'name')
      .populate('category', 'name')
      .lean(),
    Product.countDocuments(match),
  ]);
  return { items, page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getProductAdmin(id) {
  const product = await Product.findById(id)
    .populate('brand', 'name slug')
    .populate('category', 'name slug')
    .lean();
  if (!product) throw new HttpError(404, 'Product not found');
  return product;
}

async function assertUniqueSlug(slug, exceptId) {
  const clash = await Product.exists({ slug, ...(exceptId ? { _id: { $ne: exceptId } } : {}) });
  if (clash)
    throw new HttpError(
      409,
      `Another product already uses the slug “${slug}”. Change the name or slug.`
    );
}

async function assertRefs({ brand, category }) {
  if (!(await Brand.exists({ _id: brand }))) throw new HttpError(400, 'Choose a valid brand');
  if (!(await Category.exists({ _id: category })))
    throw new HttpError(400, 'Choose a valid category');
}

/** Admin variant shape (naira) to the stored shape (kobo). Keeps existing variant ids when given. */
function toStoredVariants(variants, type) {
  return variants.map((v, i) => ({
    ...(v.id ? { _id: v.id } : {}),
    sku: (
      v.sku || `${type === 'combo' ? 'COMBO' : 'SKU'}-${Date.now().toString(36)}-${i + 1}`
    ).toUpperCase(),
    optionValues: v.optionValues ?? {},
    price: nairaToKobo(v.price),
    compareAtPrice: v.compareAtPrice ? nairaToKobo(v.compareAtPrice) : null,
    stock: v.stock,
    lowStockThreshold: v.lowStockThreshold ?? 3,
    image: v.image ?? null,
    isActive: v.isActive !== false,
  }));
}

function applyFields(doc, input) {
  const fields = [
    'name',
    'type',
    'brand',
    'category',
    'shortDescription',
    'description',
    'specs',
    'images',
    'condition',
    'warranty',
    'tags',
    'status',
    'options',
    'seo',
  ];
  for (const f of fields) if (input[f] !== undefined) doc[f] = input[f];
  doc.slug = input.slug || slugify(input.name);
  doc.dealEndsAt = input.dealEndsAt ? new Date(input.dealEndsAt) : null;
  doc.variants = toStoredVariants(input.variants, input.type);
  doc.comboItems = input.type === 'combo' ? input.comboItems : [];
  if (input.type === 'combo' && input.comboItems.length === 0) {
    throw new HttpError(400, 'A combo needs at least one item');
  }
}

export async function createProduct(req, input) {
  await assertRefs(input);
  const slug = input.slug || slugify(input.name);
  await assertUniqueSlug(slug);
  const doc = new Product();
  applyFields(doc, { ...input, slug });
  await doc.save();
  if (doc.type === 'combo') await refreshComboStock(doc._id);
  await logFromRequest(req, {
    action: 'create',
    entity: 'product',
    entityId: doc._id,
    after: snapshot(doc),
  });
  return getProductAdmin(doc._id);
}

export async function updateProduct(req, id, input) {
  const doc = await Product.findById(id);
  if (!doc) throw new HttpError(404, 'Product not found');
  await assertRefs(input);
  const slug = input.slug || slugify(input.name);
  await assertUniqueSlug(slug, doc._id);
  const before = snapshot(doc);
  applyFields(doc, { ...input, slug });
  await doc.save();
  if (doc.type === 'combo') await refreshComboStock(doc._id);
  await refreshCombosContaining(doc._id);
  await logFromRequest(req, {
    action: 'update',
    entity: 'product',
    entityId: doc._id,
    before,
    after: snapshot(doc),
  });
  return getProductAdmin(doc._id);
}

export async function setProductStatus(req, id, status) {
  const doc = await Product.findById(id);
  if (!doc) throw new HttpError(404, 'Product not found');
  const before = doc.status;
  doc.status = status;
  await doc.save();
  await logFromRequest(req, {
    action: 'status',
    entity: 'product',
    entityId: id,
    before: { status: before },
    after: { status },
  });
  return { id: doc._id, status };
}

/** Quick edit of one variant's price, compare-at price, stock or active flag (naira in, kobo stored). */
export async function patchVariant(req, id, variantId, patch) {
  const doc = await Product.findById(id);
  const variant = doc?.variants.id(variantId);
  if (!variant) throw new HttpError(404, 'Variant not found');
  const before = {
    price: variant.price,
    compareAtPrice: variant.compareAtPrice,
    stock: variant.stock,
    isActive: variant.isActive,
  };

  if (patch.price !== undefined) variant.price = nairaToKobo(patch.price);
  if (patch.compareAtPrice !== undefined)
    variant.compareAtPrice = patch.compareAtPrice ? nairaToKobo(patch.compareAtPrice) : null;
  if (patch.stock !== undefined) variant.stock = patch.stock;
  if (patch.isActive !== undefined) variant.isActive = patch.isActive;
  await doc.save();
  await refreshCombosContaining(doc._id);

  const after = {
    price: variant.price,
    compareAtPrice: variant.compareAtPrice,
    stock: variant.stock,
    isActive: variant.isActive,
  };
  await logFromRequest(req, {
    action: 'variant',
    entity: 'product',
    entityId: id,
    before: { variant: variantId, ...before },
    after: { variant: variantId, ...after },
  });
  return { id: doc._id, variantId, ...after };
}

/**
 * Deletes a product that has never been ordered. A product with orders is archived instead, so
 * order history keeps its links (docs/05: "deletes of products with orders become archive").
 */
export async function removeProduct(req, id) {
  const doc = await Product.findById(id);
  if (!doc) throw new HttpError(404, 'Product not found');
  const ordered = await Order.exists({ 'items.product': doc._id });
  if (ordered) {
    doc.status = 'archived';
    await doc.save();
    await logFromRequest(req, {
      action: 'archive',
      entity: 'product',
      entityId: id,
      after: { status: 'archived' },
    });
    return { archived: true };
  }
  await Product.deleteOne({ _id: id });
  await logFromRequest(req, {
    action: 'delete',
    entity: 'product',
    entityId: id,
    before: snapshot(doc),
  });
  return { deleted: true };
}

/** Bulk price change. mode: percent | fixed (±naira) | set (naira). round: none | nearest_100 | nearest_1000 (naira). */
export function computeNewPrice(oldKobo, { mode, value, round }) {
  let n;
  if (mode === 'percent') n = oldKobo * (1 + value / 100);
  else if (mode === 'fixed') n = oldKobo + value * 100;
  else n = value * 100;

  if (round === 'nearest_100') n = Math.round(n / 10_000) * 10_000;
  if (round === 'nearest_1000') n = Math.round(n / 100_000) * 100_000;
  return Math.max(0, Math.round(n));
}

async function bulkTargets({ ids, filter }) {
  if (ids?.length) return Product.find({ _id: { $in: ids } });
  const match = { status: { $ne: 'archived' } };
  if (filter?.category) match.category = filter.category;
  if (filter?.brand) match.brand = filter.brand;
  return Product.find(match);
}

export async function bulkPriceUpdate(req, input, { dryRun }) {
  const products = await bulkTargets(input);
  const rows = [];

  for (const p of products) {
    for (const v of p.variants) {
      const old = input.field === 'price' ? v.price : v.compareAtPrice;
      if (old == null) continue; // compare-at not set: nothing to change
      const next = computeNewPrice(old, input);
      if (next !== old) {
        rows.push({
          productId: p._id,
          variantId: v._id,
          name: p.name,
          label:
            Object.values(
              v.optionValues instanceof Map
                ? Object.fromEntries(v.optionValues)
                : (v.optionValues ?? {})
            ).join(' · ') || 'Standard',
          oldNaira: old / 100,
          newNaira: next / 100,
        });
      }
    }
  }

  if (dryRun) return { dryRun: true, count: rows.length, rows: rows.slice(0, 500) };

  const touched = new Map();
  for (const p of products) {
    const before = snapshot(p);
    let changed = false;
    for (const v of p.variants) {
      const old = input.field === 'price' ? v.price : v.compareAtPrice;
      if (old == null) continue;
      const next = computeNewPrice(old, input);
      if (next === old) continue;
      if (input.field === 'price') v.price = next;
      else v.compareAtPrice = next;
      changed = true;
    }
    if (changed) {
      await p.save();
      touched.set(String(p._id), { before, after: snapshot(p) });
    }
  }
  for (const [id, diff] of touched) {
    await logFromRequest(req, {
      action: 'bulk_price',
      entity: 'product',
      entityId: id,
      before: diff.before,
      after: diff.after,
    });
  }
  return { dryRun: false, updatedProducts: touched.size, updatedVariants: rows.length };
}
