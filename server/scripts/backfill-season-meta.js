import dotenv from 'dotenv';
import mongoose from 'mongoose';
import PlayerEnrichment from '../src/models/PlayerEnrichment.js';
import { getNexonMetadata } from '../src/services/nexonMetadata.js';

dotenv.config();
await mongoose.connect(process.env.MONGODB_URI);
const meta = await getNexonMetadata();
const seasonMap = new Map((meta.seasons || []).map((season) => [String(season.seasonId), season]));
const rows = await PlayerEnrichment.find({ source: 'fifaaddict-vn' }).select('_id seasonCode seasonName seasonImg').lean();
let updated = 0;
for (const row of rows) {
  const season = seasonMap.get(String(row.seasonCode || ''));
  if (!season) continue;
  const patch = {};
  if (!row.seasonName && season.seasonName) patch.seasonName = season.seasonName;
  if (!row.seasonImg && season.seasonImg) patch.seasonImg = season.seasonImg;
  if (Object.keys(patch).length) {
    await PlayerEnrichment.updateOne({ _id: row._id }, { $set: patch });
    updated += 1;
  }
}
console.log(`Backfilled ${updated}/${rows.length} enrichment records with season metadata.`);
await mongoose.disconnect();
