import dotenv from 'dotenv';
import mongoose from 'mongoose';
import PlayerEnrichment from '../src/models/PlayerEnrichment.js';
import { buildSearchKey } from '../src/services/searchText.js';
import { fetchHtml, extractFullNameFromHtml } from '../src/services/fifaAddictSource.js';

dotenv.config();
await mongoose.connect(process.env.MONGODB_URI);

const CONCURRENCY = Number(process.env.FIFAADDICT_FULLNAME_CONCURRENCY || 8);
const DELAY_MS = Number(process.env.FIFAADDICT_CRAWL_DELAY_MS || 0);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const rows = await PlayerEnrichment.find({ source: 'fifaaddict-vn' })
  .select('_id sourceUid sourceUrl displayNameVi displayNameEn fullNameVi searchKey')
  .lean();

console.log(`Found ${rows.length} fifaaddict-vn records to backfill.`);
console.log(`Running with concurrency=${CONCURRENCY}, delayMs=${DELAY_MS}.`);

let cursor = 0;
let processed = 0;
let updated = 0;
let skipped = 0;
let failed = 0;
const startedAt = Date.now();

async function processRow(row, index) {
  const html = await fetchHtml(row.sourceUrl);
  const fullNameVi = extractFullNameFromHtml(html);

  if (fullNameVi && fullNameVi !== row.fullNameVi) {
    const searchKey = buildSearchKey(row.displayNameVi, row.displayNameEn, fullNameVi);
    await PlayerEnrichment.updateOne({ _id: row._id }, { $set: { fullNameVi, searchKey } });
    updated += 1;
  } else {
    skipped += 1;
  }

  processed += 1;
  if (processed % 200 === 0 || processed === rows.length) {
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const perSecond = (processed / elapsedSeconds).toFixed(2);
    console.log(`Progress: ${processed}/${rows.length} (updated ${updated}, skipped ${skipped}, failed ${failed}, ${perSecond}/s)`);
  }

  if (DELAY_MS > 0) await sleep(DELAY_MS);
}

async function worker() {
  while (cursor < rows.length) {
    const index = cursor++;
    const row = rows[index];
    try {
      await processRow(row, index);
    } catch (error) {
      failed += 1;
      processed += 1;
      console.error(`[${index + 1}/${rows.length}] Failed ${row.sourceUid}: ${error.message}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

console.log(`Done. Updated ${updated}, skipped ${skipped}, failed ${failed} of ${rows.length}.`);
await mongoose.disconnect();
