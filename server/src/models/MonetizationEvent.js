import mongoose from 'mongoose';

const monetizationEventSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MonetizationItem', required: true },
    placementKey: { type: String, required: true },
    eventType: { type: String, enum: ['impression', 'click'], required: true },
    entityType: { type: String },
    entityId: { type: String },
    sessionId: { type: String },
    userAgent: { type: String },
    referrer: { type: String },
  },
  { timestamps: true }
);

monetizationEventSchema.index({ itemId: 1, eventType: 1 });
monetizationEventSchema.index({ placementKey: 1, createdAt: -1 });
monetizationEventSchema.index({ createdAt: -1 });

const MonetizationEvent = mongoose.model('MonetizationEvent', monetizationEventSchema);
export default MonetizationEvent;
