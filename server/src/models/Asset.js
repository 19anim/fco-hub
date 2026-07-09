import mongoose from 'mongoose';
import { ASSET_CATEGORIES, normalizeAssetIdentity } from '../services/assetService.js';

const assetVersionSchema = new mongoose.Schema(
  {
    version: { type: Number, required: true, min: 1 },
    cloudinaryPublicId: { type: String, required: true, trim: true },
    secureUrl: { type: String, required: true, trim: true },
    width: { type: Number, required: true, min: 0 },
    height: { type: Number, required: true, min: 0 },
    format: { type: String, required: true, trim: true },
    bytes: { type: Number, required: true, min: 0 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
    uploadedAt: { type: Date, required: true, default: Date.now },
    source: { type: String, enum: ['migration', 'admin'], required: true },
  },
  { _id: false }
);

const assetSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      enum: Object.keys(ASSET_CATEGORIES),
      trim: true,
    },
    key: { type: String, required: true, trim: true, lowercase: true },
    label: { type: String, trim: true, default: '' },
    sourcePath: { type: String, trim: true, default: null },
    status: { type: String, enum: ['active', 'archived'], default: 'active', required: true },
    activeVersion: { type: Number, required: true, min: 1 },
    versions: {
      type: [assetVersionSchema],
      default: [],
      validate: [
        {
          validator(versions) {
            const seen = new Set();
            return versions.every((item) => {
              if (!Number.isInteger(item.version) || item.version < 1) {
                return true;
              }
              if (seen.has(item.version)) {
                return false;
              }
              seen.add(item.version);
              return true;
            });
          },
          message: 'Asset version numbers must be unique positive integers',
        },
      ],
    },
  },
  { timestamps: true }
);

assetSchema.index({ category: 1, key: 1 }, { unique: true });
assetSchema.index({ status: 1, category: 1, updatedAt: -1 });
assetSchema.index({ key: 'text', label: 'text', sourcePath: 'text', 'versions.cloudinaryPublicId': 'text' });

assetSchema.pre('validate', function validateAssetIdentity(next) {
  try {
    const normalized = normalizeAssetIdentity(this.category, this.key);
    this.category = normalized.category;
    this.key = normalized.key;
  } catch (error) {
    this.invalidate('key', error.message, this.key);
  }

  if (!this.versions?.length) {
    this.invalidate('versions', 'Assets require at least one version', this.versions);
  } else if (!this.versions.some((item) => item.version === this.activeVersion)) {
    this.invalidate('activeVersion', 'Active version must exist in versions', this.activeVersion);
  }

  next();
});

const Asset = mongoose.models.Asset || mongoose.model('Asset', assetSchema);
export default Asset;
