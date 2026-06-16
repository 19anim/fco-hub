import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import { discoverFifaAddictByPidGraph } from '../src/services/fifaAddictSource.js';
import SyncRun from '../src/models/SyncRun.js';

dotenv.config();

async function main() {
  await connectDB();
  const result = await discoverFifaAddictByPidGraph({
    initialUids: ['kmjrrzdn'],
    includeExistingSeeds: false,
    includeNexonSearchSeeds: false,
    maxVisits: 20,
    delayMs: 300,
  });

  console.log('Started:', result);

  let latest = null;
  for (let i = 0; i < 120; i += 1) {
    latest = await SyncRun.findById(result.runId).lean();
    console.log(`[${i}]`, latest.status, latest.processed, latest.updated, latest.message);
    if (latest.status !== 'running') break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  await mongoose.disconnect();
  if (!latest || latest.status !== 'success') process.exitCode = 1;
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
