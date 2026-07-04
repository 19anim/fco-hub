import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import PlayerEnrichment from '../src/models/PlayerEnrichment.js';
import { collectFifaAddictCardBackgrounds } from '../src/services/fifaAddictCardBackgroundCollector.js';
import {
  buildLocalCardThemeEntries,
  formatCollectionCoverage,
  mergeCardThemeRegistry,
  reconcileCardThemeCoverage,
} from '../../client/src/fco/cardThemeRegistryTools.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(rootDir, 'server/.env') });
const coveragePath = path.join(rootDir, 'docs/superpowers/plans/2026-07-04-fifaaddict-card-background-coverage.md');
const jsonPath = path.join(rootDir, 'docs/superpowers/plans/2026-07-04-fifaaddict-card-background-collection.json');
const registryPath = path.join(rootDir, 'client/src/fco/cardThemeRegistry.json');

function getArgValue(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : '';
}

async function getReportAppSeasons() {
  const seasons = await PlayerEnrichment.aggregate([
    { $match: { seasonCode: { $ne: '' } } },
    { $group: { _id: '$seasonCode', title: { $first: '$seasonName' } } },
    { $sort: { _id: 1 } },
  ]);
  return seasons.map((season) => ({ value: season._id, title: season.title || '' }));
}

function logCollectionProgress(event) {
  const prefix = `[${event.index}/${event.total}] ${event.seasonCode}`;
  if (event.status === 'start') {
    console.log(`${prefix} — querying ${event.title}`);
    return;
  }
  if (event.status === 'downloaded') {
    console.log(`${prefix} — downloaded card-theme-${event.themeId} -> ${event.localPath}`);
    return;
  }
  if (event.status === 'mapped') {
    console.log(`${prefix} — mapped existing card-theme-${event.themeId} -> ${event.localPath}`);
    return;
  }
  console.log(`${prefix} — ${event.status}: ${event.reason}`);
}

async function main() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('Set MONGODB_URI or MONGO_URI before running the collector.');
  }

  const limitArg = getArgValue('limit');
  const limit = limitArg ? Number(limitArg) : undefined;
  const headed = process.argv.includes('--headed');

  await mongoose.connect(mongoUri);
  const result = await collectFifaAddictCardBackgrounds({ headless: !headed, limit, onProgress: logCollectionProgress });
  const appSeasons = await getReportAppSeasons();
  const built = buildLocalCardThemeEntries(result.records);
  const reconciledCoverage = reconcileCardThemeCoverage({
    fifaAddictSeasons: result.fifaAddictSeasons,
    records: result.records,
    appSeasons,
    entries: built.entries,
    sharedThemes: built.sharedThemes,
    unresolved: built.unresolved,
  });
  const coverage = formatCollectionCoverage(reconciledCoverage);

  const existingRegistry = JSON.parse(await fs.readFile(registryPath, 'utf8').catch(() => '{}'));
  const { registry, added, updated } = mergeCardThemeRegistry(existingRegistry, built.entries);

  await fs.writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
  await fs.writeFile(coveragePath, coverage);
  await fs.writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`);

  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${coveragePath}`);
  console.log(`Wrote ${registryPath}`);
  console.log(`Discovered ${result.total} FIFAAddict squadmaker seasons.`);
  console.log(`Mapped ${Object.keys(built.entries).length} FIFAAddict season backgrounds to local assets.`);
  console.log(`Matched ${reconciledCoverage.summary.appMappedSeasons}/${reconciledCoverage.summary.appSeasons} app seasons (admin catalog codes) to local assets for reporting.`);
  console.log(`Registry: ${added.length} new season(s) added${added.length ? ` (${added.join(', ')})` : ''}, ${updated.length} updated${updated.length ? ` (${updated.join(', ')})` : ''}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
