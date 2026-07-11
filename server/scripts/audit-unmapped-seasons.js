import dotenv from 'dotenv';
import mongoose from 'mongoose';
import PlayerEnrichment from '../src/models/PlayerEnrichment.js';
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
  { $group: { _id: '$seasonCode', count: { $sum: 1 }, sample: { $first: '$sourceUid' } } },
  { $sort: { count: -1 } },
]);

console.log(`Total distinct seasonCode values for source=fifaaddict-vn: ${counts.length}\n`);

for (const row of counts) {
  const code = String(row._id || '');
  const isKnown = validFifaAddictClassIds.has(code) || validFifaAddictValues.has(code.toUpperCase()) || validNexonIds.has(code);
  console.log(`${isKnown ? '  OK ' : 'UNMAPPED'}  seasonCode="${code}"  count=${row.count}  sample=${row.sample}`);
}

await mongoose.disconnect();
