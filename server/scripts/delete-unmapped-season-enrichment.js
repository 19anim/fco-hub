import dotenv from 'dotenv';
import mongoose from 'mongoose';
import PlayerEnrichment from '../src/models/PlayerEnrichment.js';
import PlayerAlias from '../src/models/PlayerAlias.js';
import FifaAddictSeason from '../src/models/FifaAddictSeason.js';
import { getNexonMetadata } from '../src/services/nexonMetadata.js';

dotenv.config();
await mongoose.connect(process.env.MONGODB_URI);

function getFifaAddictSeasonClassId(season) {
  return String(season?.className || '').match(/(?:^|\s)y(\d+)(?:\s|$)/)?.[1] || '';
}

const [seasons, nexonMeta] = await Promise.all([
  FifaAddictSeason.find({}).lean(),
  getNexonMetadata().catch(() => ({ seasons: [] })),
]);

const validFifaAddictClassIds = new Set(seasons.map(getFifaAddictSeasonClassId).filter(Boolean));
const validFifaAddictValues = new Set(seasons.map((s) => String(s.value || '').toUpperCase()));
const validNexonIds = new Set((nexonMeta.seasons || []).map((s) => String(s.seasonId)));

const counts = await PlayerEnrichment.aggregate([
  { $match: { source: 'fifaaddict-vn' } },
  { $group: { _id: '$seasonCode' } },
]);

const unmappedCodes = counts
  .map((row) => String(row._id || ''))
  .filter((code) => code && !validFifaAddictClassIds.has(code) && !validFifaAddictValues.has(code.toUpperCase()) && !validNexonIds.has(code));

console.log('Unmapped seasonCodes to delete:', unmappedCodes);

const rows = await PlayerEnrichment.find({ source: 'fifaaddict-vn', seasonCode: { $in: unmappedCodes } }).lean();
const sourceUids = rows.map((r) => r.sourceUid);

const aliasResult = await PlayerAlias.deleteMany({ source: 'fifaaddict-vn', sourceUid: { $in: sourceUids } });
const enrichmentResult = await PlayerEnrichment.deleteMany({ source: 'fifaaddict-vn', seasonCode: { $in: unmappedCodes } });

console.log(`Deleted PlayerEnrichment: ${enrichmentResult.deletedCount}`);
console.log(`Deleted PlayerAlias: ${aliasResult.deletedCount}`);

await mongoose.disconnect();
