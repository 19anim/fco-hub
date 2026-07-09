import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverAssetCatalog } from './assetMigration/catalog.js';
import { createMigrationReport, countDiscovered, finishMigrationReport, safeErrorMessage, toJsonReport } from './assetMigration/report.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const defaultReportDir = path.join(repoRoot, 'server/reports/assets');

export function parseMigrationArgs(argv) {
  const parsed = { mode: null, replace: false, reportPath: null };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      if (parsed.mode) {
        throw new Error('Choose exactly one mode: --dry-run or --upload');
      }
      parsed.mode = 'dry-run';
      continue;
    }
    if (arg === '--upload') {
      if (parsed.mode) {
        throw new Error('Choose exactly one mode: --dry-run or --upload');
      }
      parsed.mode = 'upload';
      continue;
    }
    if (arg === '--replace') {
      parsed.replace = true;
      continue;
    }
    if (arg === '--report') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--report requires a path');
      }
      parsed.reportPath = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown flag: ${arg}`);
  }

  if (!parsed.mode) {
    throw new Error('Choose exactly one mode: --dry-run or --upload');
  }
  if (parsed.replace && parsed.mode !== 'upload') {
    throw new Error('--replace requires --upload');
  }

  return parsed;
}

function hasMongoUri(env) {
  return Boolean(env.MONGODB_URI || env.MONGO_URI);
}

function mongoUri(env) {
  return env.MONGODB_URI || env.MONGO_URI;
}

function identityOf(record) {
  return `${record.category}\0${record.key}`;
}

function activeVersion(asset) {
  return asset?.versions?.find((version) => version.version === asset.activeVersion) ?? null;
}

function mapExistingAssets(assets) {
  return new Map((assets ?? []).map((asset) => [identityOf(asset), asset]));
}

async function findExistingAssets(repository, records) {
  if (!records.length) {
    return [];
  }

  const identities = records.map((record) => ({ category: record.category, key: record.key }));
  const query = repository.find({ $or: identities });
  if (query && typeof query.lean === 'function') {
    return query.lean();
  }
  if (query && typeof query.exec === 'function') {
    return query.exec();
  }
  return query;
}

function planRecords(records, existingByIdentity, replace) {
  const uploads = [];
  const skips = [];
  const replacements = [];

  for (const record of records) {
    const existing = existingByIdentity.get(identityOf(record));
    const entry = { sourcePath: record.sourcePath, category: record.category, key: record.key };
    if (!existing) {
      uploads.push(entry);
      continue;
    }
    if (replace) {
      replacements.push({
        ...entry,
        existingRecordId: String(existing._id ?? existing.id ?? ''),
        activeVersion: existing.activeVersion ?? null,
      });
      continue;
    }
    skips.push({
      ...entry,
      reason: 'existing',
      existingRecordId: String(existing._id ?? existing.id ?? ''),
      activeVersion: existing.activeVersion ?? null,
    });
  }

  return { uploads, skips, replacements };
}

function recordMapping(report, sourceRecord, asset) {
  const version = activeVersion(asset);
  if (!version?.secureUrl) {
    return;
  }
  report.mappings.push({
    sourcePath: sourceRecord.sourcePath,
    category: sourceRecord.category,
    key: sourceRecord.key,
    secureUrl: version.secureUrl,
  });
}

function recordChanged(report, asset) {
  const recordId = String(asset?._id ?? asset?.id ?? '');
  if (recordId) {
    report.changed.recordIds.push(recordId);
  }
  if (asset?.activeVersion != null) {
    report.changed.activeVersions.push({ id: recordId, activeVersion: asset.activeVersion });
  }
}

async function writeReportFile(reportPath, report, dependencies) {
  if (!reportPath) {
    return;
  }
  const fsModule = dependencies.fs ?? fs;
  await fsModule.mkdir(path.dirname(reportPath), { recursive: true });
  await fsModule.writeFile(reportPath, toJsonReport(report));
}

function defaultReportPath(mode, startedAt) {
  return path.join(defaultReportDir, `cloudinary-assets-${mode}-${startedAt.replace(/[:.]/g, '-')}.json`);
}

async function loadRuntimeDependencies() {
  const [{ default: mongoose }, { v2: cloudinary }, { configureCloudinary }, { default: Asset }, assetService, cloudinaryAssets] = await Promise.all([
    import('mongoose'),
    import('cloudinary'),
    import('../src/config/cloudinary.js'),
    import('../src/models/Asset.js'),
    import('../src/services/assetService.js'),
    import('../src/services/cloudinaryAssets.js'),
  ]);
  return { mongoose, cloudinary, configureCloudinary, Asset, assetService, cloudinaryAssets };
}

export async function runMigration(options = {}, dependencies = {}) {
  const env = options.env ?? process.env;
  const parsed = options.parsedArgs ?? parseMigrationArgs(options.argv ?? process.argv.slice(2));
  const startedAt = options.startedAt ?? new Date().toISOString();
  const report = createMigrationReport({ mode: parsed.mode, startedAt });
  const runtime = dependencies.runtime ?? (dependencies.repository ? {} : await loadRuntimeDependencies());
  const connect = dependencies.connect ?? ((uri) => runtime.mongoose.connect(uri));
  const disconnect = dependencies.disconnect ?? (() => runtime.mongoose.disconnect());
  const repository = dependencies.repository ?? runtime.Asset;
  const discover = dependencies.discover ?? discoverAssetCatalog;
  const configure = dependencies.configureCloudinary ?? ((sdk, configEnv) => runtime.configureCloudinary(sdk, configEnv));
  const cloudinarySdk = dependencies.cloudinarySdk ?? runtime.cloudinary;
  const uploader = dependencies.uploader ?? ((input) => runtime.cloudinaryAssets.uploadAssetPath(cloudinarySdk, input.absolutePath, input));
  const service = dependencies.service ?? {
    createAssetUpload: runtime.assetService.createAssetUpload,
    replaceAssetUpload: runtime.assetService.replaceAssetUpload,
  };
  const logger = dependencies.logger ?? console;
  let connected = false;

  try {
    if (parsed.mode === 'upload') {
      if (!hasMongoUri(env)) {
        throw new Error('Upload requires MONGODB_URI or MONGO_URI');
      }
      configure(cloudinarySdk, env);
    }

    if (hasMongoUri(env)) {
      await connect(mongoUri(env));
      connected = true;
      report.existingStatus = 'checked';
    }

    const discovered = await discover(options.discoverOptions ?? {});
    countDiscovered(report, discovered);
    const classified = discovered.filter((record) => record.category && record.key);

    let existingByIdentity = new Map();
    if (connected) {
      existingByIdentity = mapExistingAssets(await findExistingAssets(repository, classified));
    }

    report.planned = planRecords(classified, existingByIdentity, parsed.replace);
    if (!connected) {
      report.planned.uploads = classified.map((record) => ({ sourcePath: record.sourcePath, category: record.category, key: record.key }));
    }
    report.counts.skipped = report.planned.skips.length;

    if (parsed.mode === 'upload') {
      for (const record of classified) {
        const existing = existingByIdentity.get(identityOf(record));
        if (existing && !parsed.replace) {
          recordMapping(report, record, existing);
          continue;
        }

        try {
          const input = {
            absolutePath: record.absolutePath,
            sourcePath: record.sourcePath,
            category: record.category,
            key: record.key,
            label: record.label,
            source: 'migration',
          };
          const saved = existing
            ? await service.replaceAssetUpload(input, { repository, uploader })
            : await service.createAssetUpload(input, { repository, uploader });
          recordMapping(report, record, saved);
          recordChanged(report, saved);
          if (existing) {
            report.counts.replaced += 1;
          } else {
            report.counts.uploaded += 1;
          }
        } catch (error) {
          const safeMessage = safeErrorMessage(error);
          report.counts.failed += 1;
          report.failures.push({ sourcePath: record.sourcePath, message: safeMessage });
          logger.error?.(`Asset migration failed: ${JSON.stringify({ sourcePath: record.sourcePath, message: safeMessage })}`);
        }
      }
    } else if (connected) {
      for (const record of classified) {
        const existing = existingByIdentity.get(identityOf(record));
        if (existing) {
          recordMapping(report, record, existing);
        }
      }
    }

    return finishMigrationReport(report, options.finishedAt ?? new Date().toISOString());
  } finally {
    if (connected) {
      await disconnect();
    }
  }
}

export async function main(argv = process.argv.slice(2), dependencies = {}) {
  if (!dependencies.skipDotenv) {
    const { default: dotenv } = await import('dotenv');
    dotenv.config({ path: path.join(repoRoot, 'server/.env') });
  }
  const parsedArgs = parseMigrationArgs(argv);
  const startedAt = new Date().toISOString();
  const reportPath = parsedArgs.reportPath ? path.resolve(parsedArgs.reportPath) : defaultReportPath(parsedArgs.mode, startedAt);
  const report = await runMigration({ argv, parsedArgs, startedAt, env: process.env }, dependencies);
  await writeReportFile(reportPath, report, dependencies);
  console.log(`Asset migration ${parsedArgs.mode} report: ${reportPath}`);
  console.log(`Discovered ${report.discovered}; classified ${report.classified}; uploads ${report.planned.uploads.length}; skips ${report.planned.skips.length}; replacements ${report.planned.replacements.length}; failed ${report.counts.failed}.`);
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(safeErrorMessage(error));
    process.exitCode = 1;
  });
}
