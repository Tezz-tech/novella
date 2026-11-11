import mongoose from 'mongoose';

const { Schema, Types } = mongoose;

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    image: { type: String, default: null },
    parent: { type: Types.ObjectId, ref: 'Category', default: null },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
categorySchema.index({ isActive: 1, sortOrder: 1 });

const brandSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    logo: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const deliveryZoneSchema = new Schema(
  {
    state: { type: String, required: true, trim: true },
    city: { type: String, default: '*', trim: true }, // '*' = whole state
    fee: { type: Number, required: true, min: 0, validate: Number.isInteger }, // kobo
    etaText: { type: String, default: '1–3 days' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
deliveryZoneSchema.index({ state: 1, city: 1 }, { unique: true });

const couponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percent', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 }, // percent 0-100, or kobo when fixed
    minSubtotal: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, default: null, min: 0 },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    usageLimit: { type: Number, default: null, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const reviewSchema = new Schema(
  {
    product: { type: Types.ObjectId, ref: 'Product', required: true, index: true },
    user: { type: Types.ObjectId, ref: 'User', required: true },
    order: { type: Types.ObjectId, ref: 'Order', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: '', maxlength: 120 },
    body: { type: String, default: '', maxlength: 2000 },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

const subscriberSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    source: { type: String, default: 'footer' },
  },
  { timestamps: true }
);

export const Category = mongoose.model('Category', categorySchema);
export const Brand = mongoose.model('Brand', brandSchema);
export const DeliveryZone = mongoose.model('DeliveryZone', deliveryZoneSchema);
export const Coupon = mongoose.model('Coupon', couponSchema);
export const Review = mongoose.model('Review', reviewSchema);
export const Subscriber = mongoose.model('Subscriber', subscriberSchema);
