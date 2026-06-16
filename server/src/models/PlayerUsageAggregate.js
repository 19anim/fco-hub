import mongoose from 'mongoose';

const playerUsageAggregateSchema = new mongoose.Schema(
  {
    spid: { type: Number, required: true, index: true },
    matchType: { type: Number, default: 50, index: true },
    period: { type: String, default: 'all', index: true },
    rankBucket: { type: String, default: 'all', index: true },
    usageCount: { type: Number, default: 0 },
    matchCount: { type: Number, default: 0 },
    winCount: { type: Number, default: 0 },
    drawCount: { type: Number, default: 0 },
    lossCount: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    positions: [{ position: String, count: Number }],
    formations: [{ formation: String, count: Number }],
    trendScore: { type: Number, default: 0 },
    lastSeenAt: { type: Date },
    source: { type: String, default: 'nexon-match' },
  },
  { timestamps: true }
);

playerUsageAggregateSchema.index({ spid: 1, matchType: 1, period: 1, rankBucket: 1 }, { unique: true });
playerUsageAggregateSchema.index({ usageCount: -1, winRate: -1 });

const PlayerUsageAggregate = mongoose.model('PlayerUsageAggregate', playerUsageAggregateSchema);
export default PlayerUsageAggregate;
