import mongoose from 'mongoose';

const playerAliasSchema = new mongoose.Schema(
  {
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', index: true },
    enrichmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'PlayerEnrichment', index: true },
    spid: { type: Number, index: true },
    pid: { type: Number, index: true },
    source: { type: String, default: 'fifaaddict-vn' },
    sourceUid: { type: String, required: true },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    reason: { type: String, default: '' },
    status: { type: String, enum: ['matched', 'candidate', 'rejected'], default: 'candidate', index: true },
  },
  { timestamps: true }
);

playerAliasSchema.index({ source: 1, sourceUid: 1, spid: 1 }, { unique: true, sparse: true });

const PlayerAlias = mongoose.model('PlayerAlias', playerAliasSchema);
export default PlayerAlias;
