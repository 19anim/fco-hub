import mongoose from 'mongoose';

const lineupPlayerSchema = new mongoose.Schema(
  {
    spid: Number,
    spPosition: Number,
    position: String,
    grade: Number,
  },
  { _id: false }
);

const matchSampleSchema = new mongoose.Schema(
  {
    matchId: { type: String, required: true, unique: true, index: true },
    matchType: { type: Number, index: true },
    sampledFromOuid: { type: String, index: true },
    sampledFromNickname: { type: String, default: '' },
    matchDate: { type: Date },
    rankBucket: { type: String, default: '' },
    lineups: [
      {
        ouid: String,
        nickname: String,
        result: String,
        formation: String,
        players: [lineupPlayerSchema],
      },
    ],
    raw: { type: mongoose.Schema.Types.Mixed },
    sampledAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

const MatchSample = mongoose.model('MatchSample', matchSampleSchema);
export default MatchSample;
