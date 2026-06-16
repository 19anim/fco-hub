import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema(
  {
    spid: { type: Number, required: true, unique: true, index: true },
    pid: { type: Number, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    searchName: { type: String, index: true },
    position: { type: String, default: '' },
    overall: { type: Number, default: null },
    pace: { type: Number, default: null },
    shooting: { type: Number, default: null },
    passing: { type: Number, default: null },
    dribbling: { type: Number, default: null },
    defending: { type: Number, default: null },
    physical: { type: Number, default: null },

    club: { type: String, trim: true },
    league: { type: String, trim: true },
    nation: { type: String, trim: true },

    seasonId: { type: Number, required: true, index: true },
    seasonName: { type: String, default: '' },
    seasonImg: { type: String, default: '' },
    cardType: { type: String, default: '' },
    imageUrl: { type: String, default: '' },

    marketPrice: { type: Number, default: null },
    priceHistory: [
      {
        date: { type: Date, default: Date.now },
        price: Number,
      },
    ],

    videos: [
      {
        youtubeId: { type: String, required: true },
        title: { type: String, required: true },
        channel: { type: String },
        type: { type: String, enum: ['review', 'gameplay', 'tutorial'], default: 'review' },
        publishedAt: { type: Date },
      },
    ],

    tags: [{ type: String }], // e.g. 'meta', 'hidden-gem', 'toty'
    dataSource: { type: String, default: 'nexon-meta' },
    syncedAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Text search index
playerSchema.index({ name: 'text', searchName: 'text', club: 'text', league: 'text', nation: 'text', seasonName: 'text' });
playerSchema.index({ overall: -1, position: 1 });
playerSchema.index({ marketPrice: -1 });
playerSchema.index({ seasonId: 1, name: 1 });

const Player = mongoose.model('Player', playerSchema);
export default Player;
