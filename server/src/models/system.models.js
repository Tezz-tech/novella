import mongoose from 'mongoose';

const { Schema, Types } = mongoose;

// Every admin write lands here with before/after diffs (CLAUDE.md non-negotiable 4).
const activityLogSchema = new Schema(
  {
    actor: { type: Types.ObjectId, ref: 'User', default: null },
    actorEmail: { type: String, default: null },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String, default: null },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    ip: { type: String, default: null },
    at: { type: Date, default: Date.now },
  },
  { timestamps: false }
);
activityLogSchema.index({ entity: 1, entityId: 1, at: -1 });
activityLogSchema.index({ at: -1 });

// Sequence counters, e.g. one per YYMM for order numbers.
const counterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export const Counter = mongoose.model('Counter', counterSchema);
