import { Product, Category, Brand } from '../models/index.js';
import { escapeRegex } from '../utils/text.js';
import { HttpError } from '../utils/httpError.js';

/** Fields a listing card needs. Long text and SEO are only sent on the detail page. */
const CARD_FIELDS =
  'name slug type brand category shortDescription images condition warranty tags status options variants priceMin priceMax totalStock soldCount ratingAvg ratingCount dealEndsAt createdAt';

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  relevance: { createdAt: -1, _id: -1 },
  price_asc: { priceMin: 1, _id: 1 },
  price_desc: { priceMin: -1, _id: -1 },
  best_selling: { soldCount: -1, createdAt: -1 },
};

/** Keeps only what the storefront needs from a variant. Never exposes internal fields. */
export function publicVariant(v) {
  return {
    id: v._id,
    sku: v.sku,
    optionValues:
      v.optionValues instanceof Map ? Object.fromEntries(v.optionValues) : v.optionValues,
    price: v.price,
    compareAtPrice: v.compareAtPrice ?? null,
    stock: v.stock,
    inStock: v.stock > 0,
    image: v.image ?? null,
  };
}

/** Public shape of a product. Brand and category arrive populated. */
export function toPublicProduct(p, { detail = false } = {}) {
  const base = {
    id: p._id,
    name: p.name,
    slug: p.slug,
    type: p.type,
    brand: p.brand && p.brand.name ? { name: p.brand.name, slug: p.brand.slug } : null,
    category:
      p.category && p.category.name ? { name: p.category.name, slug: p.category.slug } : null,
    shortDescription: p.shortDescription,
    condition: p.condition,
    warranty: p.warranty,
    tags: p.tags,
    options: p.options,
    images: p.images,
    coverImage: p.images?.[0] ?? null,
    priceMin: p.priceMin,
    priceMax: p.priceMax,
    totalStock: p.totalStock,
    inStock: p.totalStock > 0,
    soldCount: p.soldCount,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    dealEndsAt: p.dealEndsAt ?? null,
    hasDiscount: (p.variants || []).some((v) => v.compareAtPrice && v.compareAtPrice > v.price),
    variants: (p.variants || []).filter((v) => v.isActive !== false).map(publicVariant),
  };
  if (!detail) return base;
  return {
    ...base,
    description: p.description,
    specs: p.specs,
    seo: p.seo,
  };
}

/**
 * Builds the Mongo filter for the shop. Relations (category, brand) are resolved by slug first.
 * An unknown slug yields an empty result, not an error.
 */
async function buildFilter(q) {
  const match = { status: 'active' };

  if (q.category) {
    const cat = await Category.findOne({ slug: q.category.toLowerCase() }).select('_id').lean();
    match.category = cat ? cat._id : { $in: [] };
  }
  if (q.brand) {
    const brand = await Brand.findOne({ slug: q.brand.toLowerCase() }).select('_id').lean();
    match.brand = brand ? brand._id : { $in: [] };
  }
  if (q.condition?.length) match.condition = { $in: q.condition };
  if (q.tag) match.tags = q.tag;
  if (q.type) match.type = q.type;
  if (q.inStock) match.totalStock = { $gt: 0 };
  if (q.storage) match['variants.optionValues.Storage'] = q.storage;

  // A product matches a price range when its lowest active price is inside it.
  if (q.minPrice != null || q.maxPrice != null) {
    match.priceMin = {};
    if (q.minPrice != null) match.priceMin.$gte = q.minPrice;
    if (q.maxPrice != null) match.priceMin.$lte = q.maxPrice;
  }

  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    const brandIds = (await Brand.find({ name: rx }).select('_id').lean()).map((b) => b._id);
    const catIds = (await Category.find({ name: rx }).select('_id').lean()).map((c) => c._id);
    match.$or = [
      { name: rx },
      { shortDescription: rx },
      { tags: rx },
      { brand: { $in: brandIds } },
      { category: { $in: catIds } },
    ];
  }

  return match;
}

const pick = ({ name, slug }) => ({ name, slug });

/** Facet counts for the filter sidebar, computed over the current result set. */
async function buildFacets(match) {
  const [agg] = await Product.aggregate([
    { $match: match },
    {
      $facet: {
        brands: [{ $group: { _id: '$brand', count: { $sum: 1 } } }],
        categories: [{ $group: { _id: '$category', count: { $sum: 1 } } }],
        conditions: [{ $group: { _id: '$condition', count: { $sum: 1 } } }],
        storage: [
          { $unwind: '$variants' },
          { $match: { 'variants.optionValues.Storage': { $exists: true } } },
          { $group: { _id: '$variants.optionValues.Storage', ids: { $addToSet: '$_id' } } },
          { $project: { count: { $size: '$ids' } } },
        ],
        priceRange: [
          { $group: { _id: null, min: { $min: '$priceMin' }, max: { $max: '$priceMax' } } },
        ],
      },
    },
  ]);

  const [brandDocs, catDocs] = await Promise.all([
    Brand.find({ _id: { $in: (agg?.brands ?? []).map((b) => b._id) } })
      .select('name slug')
      .lean(),
    Category.find({ _id: { $in: (agg?.categories ?? []).map((c) => c._id) } })
      .select('name slug')
      .lean(),
  ]);
  const brandMap = new Map(brandDocs.map((b) => [String(b._id), b]));
  const catMap = new Map(catDocs.map((c) => [String(c._id), c]));

  const range = agg?.priceRange?.[0];
  return {
    brands: (agg?.brands ?? [])
      .filter((b) => brandMap.has(String(b._id)))
      .map((b) => ({ ...pick(brandMap.get(String(b._id))), count: b.count }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    categories: (agg?.categories ?? [])
      .filter((c) => catMap.has(String(c._id)))
      .map((c) => ({ ...pick(catMap.get(String(c._id))), count: c.count }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    conditions: (agg?.conditions ?? []).map((c) => ({ value: c._id, count: c.count })),
    storage: (agg?.storage ?? [])
      .map((s) => ({ value: s._id, count: s.count }))
      .sort((a, b) => parseInt(a.value, 10) - parseInt(b.value, 10)),
    priceRange: range ? { min: range.min, max: range.max } : { min: 0, max: 0 },
  };
}

/** Paginated, filtered product list. Used by /shop, /category/:slug, /combos and /deals. */
export async function listProducts(query) {
  const match = await buildFilter(query);
  const skip = (query.page - 1) * query.limit;

  const [items, total, facets] = await Promise.all([
    Product.find(match)
      .select(CARD_FIELDS)
      .sort(SORTS[query.sort] ?? SORTS.newest)
      .skip(skip)
      .limit(query.limit)
      .populate('brand', 'name slug')
      .populate('category', 'name slug')
      .lean(),
    Product.countDocuments(match),
    buildFacets(match),
  ]);

  return {
    items: items.map((p) => toPublicProduct(p)),
    page: query.page,
    limit: query.limit,
    total,
    pages: Math.max(1, Math.ceil(total / query.limit)),
    facets,
  };
}

/** Bundle breakdown for a combo: what is included, what it costs separately, and the saving. */
async function comboSummary(product) {
  const childIds = [...new Set(product.comboItems.map((i) => String(i.product)))];
  const children = await Product.find({ _id: { $in: childIds }, status: 'active' })
    .select('name slug images variants')
    .lean();
  const byId = new Map(children.map((c) => [String(c._id), c]));

  let separately = 0;
  let availableBundles = Infinity;
  const included = [];

  for (const item of product.comboItems) {
    const child = byId.get(String(item.product));
    const variant = child?.variants.find((v) => String(v._id) === String(item.variant));
    if (!child || !variant) {
      availableBundles = 0;
      continue;
    }
    separately += variant.price * item.qty;
    availableBundles = Math.min(availableBundles, Math.floor(variant.stock / item.qty));
    included.push({
      productName: child.name,
      productSlug: child.slug,
      image: child.images?.[0] ?? null,
      // .lean() returns Map fields as plain objects.
      variantLabel: Object.values(variant.optionValues ?? {}).join(' · ') || 'Standard',
      qty: item.qty,
      unitPrice: variant.price,
    });
  }

  const bundlePrice = product.variants[0]?.price ?? 0;
  return {
    included,
    separatelyTotal: separately,
    bundlePrice,
    saving: Math.max(0, separately - bundlePrice),
    available: availableBundles !== Infinity && availableBundles > 0,
  };
}

/** One product by slug, with related products and combo breakdown. */
export async function getProductDetail(slug) {
  const product = await Product.findOne({ slug, status: 'active' })
    .populate('brand', 'name slug')
    .populate('category', 'name slug')
    .lean();
  if (!product) throw new HttpError(404, 'Product not found');

  const [related, combo] = await Promise.all([
    Product.find({ category: product.category._id, status: 'active', _id: { $ne: product._id } })
      .select(CARD_FIELDS)
      .sort({ soldCount: -1, createdAt: -1 })
      .limit(6)
      .populate('brand', 'name slug')
      .populate('category', 'name slug')
      .lean(),
    product.type === 'combo' ? comboSummary(product) : Promise.resolve(null),
  ]);

  return {
    product: toPublicProduct(product, { detail: true }),
    combo,
    related: related.map((p) => toPublicProduct(p)),
  };
}

/** Top matches for the header's instant search. Keep it small and fast. */
export async function suggestProducts(q) {
  const match = await buildFilter({ q });
  const items = await Product.find(match)
    .select('name slug images priceMin totalStock')
    .sort({ soldCount: -1, createdAt: -1 })
    .limit(6)
    .lean();
  return items.map((p) => ({
    id: p._id,
    name: p.name,
    slug: p.slug,
    image: p.images?.[0] ?? null,
    priceMin: p.priceMin,
    inStock: p.totalStock > 0,
  }));
}
