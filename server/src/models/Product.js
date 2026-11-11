import mongoose from 'mongoose';

const { Schema, Types } = mongoose;

export const CONDITIONS = ['brand_new', 'uk_used', 'refurbished', 'open_box'];
export const PRODUCT_TAGS = ['new_arrival', 'best_seller', 'hot_deal', 'featured'];
export const PRODUCT_STATUSES = ['draft', 'active', 'archived'];
export const PRODUCT_TYPES = ['single', 'combo'];

const specSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: null }, // null for seeded placeholders
    alt: { type: String, default: '' },
  },
  { _id: false }
);

const optionSchema = new Schema(
  { name: { type: String, required: true, trim: true }, values: [{ type: String, trim: true }] },
  { _id: false }
);

// Money is always an integer in kobo (minor unit). See CLAUDE.md.
const variantSchema = new Schema({
  sku: { type: String, trim: true, uppercase: true },
  optionValues: { type: Map, of: String, default: () => new Map() },
  price: { type: Number, required: true, min: 0, validate: Number.isInteger },
  compareAtPrice: {
    type: Number,
    default: null,
    min: 0,
    validate: { validator: (v) => v == null || Number.isInteger(v) },
  },
  stock: { type: Number, required: true, default: 0, min: 0, validate: Number.isInteger },
  lowStockThreshold: { type: Number, default: 3, min: 0 },
  image: { type: String, default: null },
  isActive: { type: Boolean, default: true },
});

const comboItemSchema = new Schema(
  {
    product: { type: Types.ObjectId, ref: 'Product', required: true },
    variant: { type: Types.ObjectId, required: true },
    qty: { type: Number, required: true, min: 1, default: 1, validate: Number.isInteger },
  },
  { _id: false }
);

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    type: { type: String, enum: PRODUCT_TYPES, default: 'single' },
    brand: { type: Types.ObjectId, ref: 'Brand', required: true },
    category: { type: Types.ObjectId, ref: 'Category', required: true },
    shortDescription: { type: String, default: '', maxlength: 240 },
    description: { type: String, default: '' },
    specs: { type: [specSchema], default: [] },
    images: { type: [imageSchema], default: [] },
    condition: { type: String, enum: CONDITIONS, default: 'brand_new' },
    warranty: { type: String, default: '' },
    tags: { type: [{ type: String, enum: PRODUCT_TAGS }], default: [] },
    status: { type: String, enum: PRODUCT_STATUSES, default: 'draft' },
    options: { type: [optionSchema], default: [] },
    variants: { type: [variantSchema], default: [] },
    comboItems: { type: [comboItemSchema], default: [] },
    seo: { title: { type: String, default: '' }, description: { type: String, default: '' } },
    soldCount: { type: Number, default: 0, min: 0 },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    dealEndsAt: { type: Date, default: null }, // drives the Hot Deals countdown (see DECISIONS.md)

    // Derived from variants on every save, so listings can filter and sort cheaply.
    priceMin: { type: Number, default: 0, index: true },
    priceMax: { type: Number, default: 0 },
    totalStock: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', shortDescription: 'text', tags: 'text' });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ brand: 1, status: 1 });
productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ 'variants.sku': 1 }, { unique: true, sparse: true });

/**
 * Keeps priceMin, priceMax and totalStock in step with the variants.
 * Combo stock is refreshed from its child variants by the stock service, not here.
 */
productSchema.pre('validate', function derive(next) {
  const active = (this.variants || []).filter((v) => v.isActive !== false);
  const prices = active.map((v) => v.price);
  this.priceMin = prices.length ? Math.min(...prices) : 0;
  this.priceMax = prices.length ? Math.max(...prices) : 0;
  if (this.type !== 'combo') {
    this.totalStock = active.reduce((sum, v) => sum + (v.stock || 0), 0);
  }
  next();
});

export const Product = mongoose.model('Product', productSchema);
