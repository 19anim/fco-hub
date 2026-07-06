import mongoose from 'mongoose';
import { ASSET_CATEGORIES, normalizeAssetIdentity } from '../services/assetService.js';

const assetVersionSchema = new mongoose.Schema(
  {
    version: { type: Number, required: true, min: 1 },
    cloudinaryPublicId: { type: String, required: true, trim: true },
    secureUrl: { type: String, required: true, trim: true },
    width: { type: Number, required: true, min: 1 },
    height: { type: Number, required: true, min: 1 },
    format: { type: String, required: true, trim: true },
    bytes: { type: Number, required: true, min: 1 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true },
    uploadedAt: { type: Date, required: true },
    source: { type: String, enum: ['migration', 'admin'], required: true },
  },
  { _id: false }
);

const assetSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      trim: true,
      enum: Object.keys(ASSET_CATEGORIES),
    },
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator(value) {
          if (!ASSET_CATEGORIES[this.category]) {
            return true;
          }
          try {
            normalizeAssetIdentity(this.category, value);
            return true;
          } catch {
            return false;
          }
        },
        message: 'Invalid asset category or key',
      },
    },
    label: { type: String, trim: true },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived', 'disabled'],
      default: 'draft',
      required: true,
    },
    sourcePath: {
      type: String,
      trim: true,
      default: null,
      validate: {
        validator(value) {
          return value == null || value.startsWith('/');
        },
        message: 'Source path must be a former public path beginning with /',
      },
    },
    activeVersion: { type: Number, min: 1 },
    versions: [assetVersionSchema],
  },
  { timestamps: true }
);

assetSchema.index({ category: 1, key: 1 }, { unique: true });
assetSchema.index({ status: 1, category: 1, updatedAt: -1 });
assetSchema.index({
  key: 'text',
  label: 'text',
  sourcePath: 'text',
  'versions.cloudinaryPublicId': 'text',
});

assetSchema.pre('validate', function validateActiveAsset(next) {
  if (this.category && this.key) {
    try {
      const normalized = normalizeAssetIdentity(this.category, this.key);
      this.category = normalized.category;
      this.key = normalized.key;
    } catch {
      // Let field validators report exact category/key paths.
    }
  }

  const versionNumbers = this.versions.map((entry) => entry.version).filter((value) => value != null);
  if (new Set(versionNumbers).size !== versionNumbers.length) {
    this.invalidate('versions', 'Asset versions must have unique version numbers');
  }

  if (this.status === 'active') {
    if (this.versions.length === 0) {
      this.invalidate('versions', 'Active assets must have at least one version');
    } else if (!versionNumbers.includes(this.activeVersion)) {
      this.invalidate('activeVersion', 'Active version must reference an existing version');
    }
  }

  next();
});

const Asset = mongoose.models.Asset || mongoose.model('Asset', assetSchema);
export default Asset;
