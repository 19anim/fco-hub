import mongoose from 'mongoose';

const syncRunSchema = new mongoose.Schema(
  {
    source: { type: String, required: true, index: true },
    status: { type: String, enum: ['running', 'success', 'failed'], required: true, index: true },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date },
    requested: { type: Number, default: 0 },
    processed: { type: Number, default: 0 },
    inserted: { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    message: { type: String, default: '' },
    errors: [{ type: String }],
  },
  { timestamps: true, suppressReservedKeysWarning: true }
);

const SyncRun = mongoose.model('SyncRun', syncRunSchema);
export default SyncRun;
