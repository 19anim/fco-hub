import mongoose from 'mongoose';

const fifaAddictSeasonSchema = new mongoose.Schema(
  {
    value: { type: String, required: true, unique: true, trim: true, index: true }, // e.g. "icontmb"
    title: { type: String, default: '' }, // e.g. "[ ICONTMB ] ICON THE MOMENT B"
    servers: [{ type: String }], // e.g. ["th", "vn", "kr", "cn"]
    className: { type: String, default: '' }, // e.g. "badgedss y865"
    spriteUrl: { type: String, default: '' },
    backgroundPosition: { type: String, default: '' },
    backgroundSize: { type: String, default: '' },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    sortOrder: { type: Number, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const FifaAddictSeason = mongoose.model('FifaAddictSeason', fifaAddictSeasonSchema);
export default FifaAddictSeason;
