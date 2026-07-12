import mongoose from 'mongoose';

const squadSlotSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    pos: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  { _id: false }
);

const squadVariantSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    conditionLabel: { type: String, default: '' },
    conditionType: {
      type: String,
      enum: ['default', 'losing', 'drawing', 'leading'],
      default: 'default',
    },
    conditionThreshold: { type: Number, default: null },
    formationId: { type: String, required: true },
    bySlotId: { type: mongoose.Schema.Types.Mixed, default: {} },
    customSlots: { type: [squadSlotSchema], default: null },
  },
  { _id: false }
);

const squadShareSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      default: '',
    },
    mode: {
      type: String,
      enum: ['da_tay', 'glxh'],
      default: 'da_tay',
    },
    managerName: {
      type: String,
      trim: true,
      default: '',
    },
    tacticName: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    pitchColor: {
      type: String,
      trim: true,
      default: '',
    },
    variants: {
      type: [squadVariantSchema],
      validate: (v) => Array.isArray(v) && v.length > 0,
    },
  },
  {
    timestamps: true,
  }
);

squadShareSchema.index({ mode: 1, createdAt: -1 });

const SquadShare = mongoose.model('SquadShare', squadShareSchema);

export default SquadShare;
