import mongoose from 'mongoose';

const statSchema = new mongoose.Schema(
  {
    key: String,
    labelVi: String,
    value: Number,
  },
  { _id: false }
);

const dataQualitySchema = new mongoose.Schema(
  {
    hasDetail: { type: Boolean, default: false },
    hasImage: { type: Boolean, default: false },
    hasStats: { type: Boolean, default: false },
    hasTraits: { type: Boolean, default: false },
    score: { type: Number, default: 0 },
    warnings: [{ type: String }],
  },
  { _id: false }
);

const playerEnrichmentSchema = new mongoose.Schema(
  {
    source: { type: String, default: 'fifaaddict-vn', index: true },
    sourceUid: { type: String, required: true },
    sourceUrl: { type: String, required: true },

    displayNameVi: { type: String, required: true, trim: true, index: true },
    displayNameEn: { type: String, trim: true, default: '' },
    fullNameVi: { type: String, trim: true, default: '' },

    seasonCode: { type: String, trim: true, default: '' },
    seasonName: { type: String, trim: true, default: '' },
    seasonImg: { type: String, trim: true, default: '' },
    imageUrl: { type: String, trim: true, default: '' },

    positions: [{ position: String, overall: Number }],
    bestPosition: { type: String, trim: true, default: '' },
    ovrByPosition: { type: Map, of: Number, default: {} },
    overall: { type: Number, default: null },
    pace: { type: Number, default: null },
    shooting: { type: Number, default: null },
    passing: { type: Number, default: null },
    dribbling: { type: Number, default: null },
    defending: { type: Number, default: null },
    physical: { type: Number, default: null },

    salary: { type: Number, default: null },
    fp: { type: Number, default: null },
    price: { type: Number, default: null },
    priceText: { type: String, default: '' },

    stats: [statSchema],
    keyStats: [statSchema],
    detailedStats: [statSchema],
    hiddenTraits: [{ type: String }],
    traitsDescription: [
      {
        name: String,
        description: String,
        id: String,
        slug: String,
        iconUrl: String,
      },
    ],

    // OVR cho từng vị trí (từ FIFAAddict postlist)
    positionRatings: [
      {
        code: String,
        label: String,
        value: Number,
        recommended: Boolean,
      },
    ],
    // Lịch sử khoác áo câu lạc bộ
    clubCareer: [
      {
        team: String,
        teamId: String,
        season: String,
      },
    ],

    club: { type: String, default: '' },
    nation: { type: String, default: '' },
    league: { type: String, default: '' },
    teamColor: [{ type: String }],

    heightCm: { type: Number, default: null },
    weightKg: { type: Number, default: null },
    birthDateText: { type: String, default: '' },
    age: { type: Number, default: null },
    preferredFoot: { type: String, default: '' },
    weakFoot: { type: Number, default: null },
    skillMoves: { type: Number, default: null },
    reputation: { type: String, default: '' },
    workRateAttack: { type: String, default: '' },
    workRateDefense: { type: String, default: '' },

    rawDescription: { type: String, default: '' },
    raw: { type: mongoose.Schema.Types.Mixed },
    parseWarnings: [{ type: String }],
    dataQuality: { type: dataQualitySchema, default: () => ({}) },
    lastDetailSyncedAt: { type: Date },
    syncedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

playerEnrichmentSchema.index({ source: 1, sourceUid: 1 }, { unique: true });
playerEnrichmentSchema.index({ displayNameVi: 'text', displayNameEn: 'text', fullNameVi: 'text', seasonName: 'text' });

const PlayerEnrichment = mongoose.model('PlayerEnrichment', playerEnrichmentSchema);
export default PlayerEnrichment;
