import mongoose from 'mongoose';

const { Schema, Types } = mongoose;

export const ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];
export const PAYMENT_STATUSES = ['unpaid', 'paid', 'failed', 'refunded', 'partially_refunded'];

const kobo = { type: Number, default: 0, min: 0, validate: Number.isInteger };

const comboLineSchema = new Schema(
  { name: String, qty: Number, unitPrice: Number },
  { _id: false }
);

// Snapshot of what was bought, so later price or name changes never alter old orders.
const itemSchema = new Schema(
  {
    product: { type: Types.ObjectId, ref: 'Product', required: true },
    variant: { type: Types.ObjectId, required: true },
    name: { type: String, required: true },
    variantLabel: { type: String, default: '' },
    image: { type: String, default: null },
    sku: { type: String, default: '' },
    unitPrice: { ...kobo, required: true },
    qty: { type: Number, required: true, min: 1, validate: Number.isInteger },
    lineTotal: { ...kobo, required: true },
    comboItems: { type: [comboLineSchema], default: [] },
  },
  { _id: true }
);

const addressSnapshot = new Schema(
  {
    line1: String,
    line2: String,
    landmark: String,
    city: String,
    state: String,
  },
  { _id: false }
);

const timelineSchema = new Schema(
  {
    status: { type: String, required: true },
    note: { type: String, default: '' },
    by: { type: String, default: 'system' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: Types.ObjectId, ref: 'User', default: null },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true, lowercase: true },
      phone: { type: String, required: true },
    },
    items: { type: [itemSchema], validate: (v) => v.length > 0 },
    delivery: {
      method: { type: String, enum: ['delivery', 'pickup'], required: true },
      address: { type: addressSnapshot, default: () => ({}) },
      notes: { type: String, default: '' },
      zone: { type: Types.ObjectId, ref: 'DeliveryZone', default: null },
      fee: { ...kobo },
    },
    coupon: {
      code: { type: String, default: null },
      discount: { ...kobo },
    },
    subtotal: { ...kobo, required: true },
    deliveryFee: { ...kobo },
    discount: { ...kobo },
    total: { ...kobo, required: true },
    currency: { type: String, default: 'NGN' },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending_payment', index: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'unpaid', index: true },
    payment: {
      provider: { type: String, default: 'paystack' },
      // Latest reference shown to the customer; `references` keeps every attempt (retry-payment).
      reference: { type: String, default: null },
      references: { type: [String], default: [] },
      accessCode: { type: String, default: null },
      channel: { type: String, default: null },
      paidAt: { type: Date, default: null },
      amountPaid: { ...kobo },
      fees: { ...kobo },
      gatewayResponse: { type: String, default: null },
      customerCode: { type: String, default: null },
      authorizationLast4: { type: String, default: null },
      cardType: { type: String, default: null },
    },
    fulfilment: {
      courier: { type: String, default: null },
      trackingNumber: { type: String, default: null },
      trackingUrl: { type: String, default: null },
      shippedAt: { type: Date, default: null },
      deliveredAt: { type: Date, default: null },
    },
    timeline: { type: [timelineSchema], default: [] },
    stockDeducted: { type: Boolean, default: false },
    stockIssue: { type: Boolean, default: false, index: true },
    adminNotes: { type: String, default: '' },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Sparse so orders without a payment attempt yet do not collide on null.
orderSchema.index({ 'payment.reference': 1 }, { unique: true, sparse: true });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, expiresAt: 1 });

export const Order = mongoose.model('Order', orderSchema);
