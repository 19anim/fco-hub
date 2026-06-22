import mongoose from 'mongoose';

const monetizationPlacementSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true, trim: true },
    page: { type: String, required: true },
    supportedTypes: [{ type: String, enum: ['youtube_video', 'affiliate_link', 'sponsor_banner', 'ad_slot', 'custom_cta'] }],
    defaultLimit: { type: Number, default: 3 },
    enabled: { type: Boolean, default: true },
    description: { type: String },
  },
  { timestamps: true }
);

monetizationPlacementSchema.index({ page: 1, enabled: 1 });

const MonetizationPlacement = mongoose.model('MonetizationPlacement', monetizationPlacementSchema);
export default MonetizationPlacement;
