import mongoose from 'mongoose';

const { Schema, Types } = mongoose;

// One row per Paystack event or attempt (for the admin Payments screen).
const paymentSchema = new Schema(
  {
    order: { type: Types.ObjectId, ref: 'Order', required: true, index: true },
    reference: { type: String, required: true, index: true },
    amount: { type: Number, required: true, validate: Number.isInteger }, // kobo
    currency: { type: String, default: 'NGN' },
    status: { type: String, required: true },
    channel: { type: String, default: null },
    raw: { type: Schema.Types.Mixed, default: {} },
    source: { type: String, enum: ['verify', 'webhook', 'admin_reverify'], required: true },
    // Paystack event id (webhooks). Unique when present, so a replayed webhook is stored once.
    eventId: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

paymentSchema.index(
  { reference: 1, eventId: 1 },
  { unique: true, partialFilterExpression: { eventId: { $type: 'string' } } }
);

export const Payment = mongoose.model('Payment', paymentSchema);
