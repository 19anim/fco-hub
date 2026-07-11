import dotenv from 'dotenv';
import mongoose from 'mongoose';
import PlayerEnrichment from '../src/models/PlayerEnrichment.js';
import { buildSearchKey } from '../src/services/searchText.js';

dotenv.config();
await mongoose.connect(process.env.MONGODB_URI);

const rows = await PlayerEnrichment.find({ source: 'fifaaddict-vn' })
  .select('_id displayNameVi displayNameEn fullNameVi searchKey')
  .lean();

const BATCH_SIZE = 500;
let updated = 0;
let operations = [];

for (const row of rows) {
  const searchKey = buildSearchKey(row.displayNameVi, row.displayNameEn, row.fullNameVi);
  if (searchKey === (row.searchKey || '')) continue;

  operations.push({
    updateOne: { filter: { _id: row._id }, update: { $set: { searchKey } } },
  });

  if (operations.length >= BATCH_SIZE) {
    await PlayerEnrichment.bulkWrite(operations, { ordered: false });
    updated += operations.length;
    operations = [];
  }
}

if (operations.length) {
  await PlayerEnrichment.bulkWrite(operations, { ordered: false });
  updated += operations.length;
}

console.log(`Backfilled searchKey for ${updated}/${rows.length} enrichment records.`);
await mongoose.disconnect();
