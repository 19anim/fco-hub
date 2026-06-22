import mongoose from 'mongoose';

const linkedEntitySchema = new mongoose.Schema(
  {
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    label: { type: String },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const affiliateLinkSchema = new mongoose.Schema(
  {
    platform: { type: String },
    url: { type: String, required: true },
    label: { type: String },
    imageUrl: { type: String },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const monetizationItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['youtube_video', 'affiliate_link', 'sponsor_banner', 'ad_slot', 'custom_cta'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published', 'disabled', 'archived'],
      default: 'draft',
    },
    platform: {
      type: String,
      enum: ['youtube', 'shopee', 'tiktok_shop', 'google_ads', 'custom'],
    },
    placementIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MonetizationPlacement' }],
    linkedEntities: [linkedEntitySchema],
    priority: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    displayStrategy: {
      type: String,
      enum: ['manual', 'priority', 'newest', 'weighted_rotation'],
      default: 'priority',
    },
    startAt: { type: Date },
    endAt: { type: Date },

    content: {
      youtubeVideoId: { type: String },
      youtubeUrl: { type: String },
      channelName: { type: String },
      thumbnailUrl: { type: String },
      targetUrl: { type: String },
      imageUrl: { type: String },
      ctaLabel: { type: String },
      providerConfig: { type: mongoose.Schema.Types.Mixed },
    },

    affiliateLinks: [affiliateLinkSchema],

    tracking: {
      impressionCount: { type: Number, default: 0 },
      clickCount: { type: Number, default: 0 },
      lastClickedAt: { type: Date },
    },

    publishedAt: { type: Date },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    archivedAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true }
);

monetizationItemSchema.index({ status: 1, priority: -1 });
monetizationItemSchema.index({ placementIds: 1, status: 1 });
monetizationItemSchema.index({ type: 1, status: 1 });
monetizationItemSchema.index({ createdAt: -1 });

const MonetizationItem = mongoose.model('MonetizationItem', monetizationItemSchema);
export default MonetizationItem;
