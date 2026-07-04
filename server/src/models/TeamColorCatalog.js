import mongoose from 'mongoose';

const levelSchema = new mongoose.Schema(
  {
    level: { type: Number, required: true },
    required: { type: Number, required: true },
    rewards: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const observedPlayerSchema = new mongoose.Schema(
  {
    uic: { type: String, required: true },
    uids: [{ type: String }],
    firstObservedAt: { type: Date, default: Date.now },
    lastObservedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const teamColorCatalogSchema = new mongoose.Schema(
  {
    tcid: { type: String, required: true, unique: true, index: true },
    category: { type: String, enum: ['club', 'grade', 'relation'], required: true },
    refType: { type: String, default: '' },
    refId: { type: String, default: '' },
    type: { type: Number, default: null },
    names: {
      vn: { type: String, default: '' },
      en: { type: String, default: '' },
      th: { type: String, default: '' },
      kr: { type: String, default: '' },
      cn: { type: String, default: '' },
    },
    image: { type: String, default: '' },
    iconSourceUrl: { type: String, default: '' },
    localIconPath: { type: String, default: '' },
    levels: [levelSchema],
    observedPlayers: [observedPlayerSchema],
    observationCount: { type: Number, default: 0 },
    firstObservedAt: { type: Date, default: Date.now },
    lastObservedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

teamColorCatalogSchema.index({ category: 1, refType: 1, refId: 1 });

const TeamColorCatalog = mongoose.model('TeamColorCatalog', teamColorCatalogSchema);
export default TeamColorCatalog;
