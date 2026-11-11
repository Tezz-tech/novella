import mongoose from 'mongoose';

const { Schema, Types } = mongoose;

const refundSchema = new Schema(
  {
    order: { type: Types.ObjectId, ref: 'Order', required: true, index: true },
    paymentReference: { type: String, required: true },
    amount: { type: Number, required: true, min: 1, validate: Number.isInteger }, // kobo
    reason: { type: String, default: '' },
    paystackRefundId: { type: String, default: null, index: true },
    status: { type: String, enum: ['pending', 'processed', 'failed'], default: 'pending' },
    restockItems: { type: Boolean, default: false },
    by: { type: Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export const Refund = mongoose.model('Refund', refundSchema);
