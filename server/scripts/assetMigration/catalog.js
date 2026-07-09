import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyAssetSourcePath } from './classifier.js';

const SUPPORTED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif']);

const EXCLUDED_SEGMENTS = new Set([
  '.cache',
  '.claude',
  '.next',
  '.playwright-mcp',
  '.turbo',
  'build',
  'cache',
  'caches',
  'coverage',
  'dist',
  'node_modules',
  'screenshots',
]);

const INCLUDED_PREFIXES = [
  '/fco/card-themes/',
  '/upgrade-badges/',
  '/upgrade-effects/',
  '/fco/teamcolor-icons/strip/',
];

const KNOWN_ROOT_ASSETS = new Set([
  '/upgrade-happy.png',
  '/upgrade-sad.png',
  '/upgrade.png',
  '/fifaaddict-season-sprite.png',
  '/fc_online_badges_css_sprite.png',
  '/icons.svg',
  '/favicon.svg',
]);

function defaultPublicRoot() {
  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), '../../../client/public');
}

function normalizeSourcePath(relativePath) {
  return `/${relativePath.split(path.sep).join('/')}`;
}

function isInsidePublicRoot(publicRoot, candidatePath) {
  const relative = path.relative(publicRoot, candidatePath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function shouldSkipDirectory(directoryName) {
  return EXCLUDED_SEGMENTS.has(directoryName.toLowerCase());
}

function isSupportedAsset(filePath) {
  return SUPPORTED_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function isIncludedSourcePath(sourcePath) {
  const lowerSourcePath = sourcePath.toLowerCase();
  return KNOWN_ROOT_ASSETS.has(lowerSourcePath) || INCLUDED_PREFIXES.some((prefix) => lowerSourcePath.startsWith(prefix));
}

async function walkPublicAssets(publicRoot, directory, records) {
  if (!isInsidePublicRoot(publicRoot, directory)) {
    return;
  }

  const entries = await readdir(directory, { withFileTypes: true });
  const sortedEntries = [...entries].sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of sortedEntries) {
    if (entry.isDirectory()) {
      if (shouldSkipDirectory(entry.name)) {
        continue;
      }
      await walkPublicAssets(publicRoot, path.join(directory, entry.name), records);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const absolutePath = path.join(directory, entry.name);
    if (!isInsidePublicRoot(publicRoot, absolutePath) || !isSupportedAsset(absolutePath)) {
      continue;
    }

    const sourcePath = normalizeSourcePath(path.relative(publicRoot, absolutePath));
    if (!isIncludedSourcePath(sourcePath)) {
      continue;
    }

    const classification = classifyAssetSourcePath(sourcePath);
    if (classification.status !== 'classified') {
      records.push({
        absolutePath,
        sourcePath,
        status: classification.status,
        reason: classification.reason,
      });
      continue;
    }

    records.push({
      absolutePath,
      sourcePath,
      category: classification.category,
      key: classification.key,
      label: classification.label,
    });
  }
}

export async function discoverAssetCatalog(options = {}) {
  const publicRoot = path.resolve(options.publicRoot ?? defaultPublicRoot());
  const records = [];

  await walkPublicAssets(publicRoot, publicRoot, records);

  return records.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
}

export const assetCatalogRules = Object.freeze({
  supportedExtensions: [...SUPPORTED_EXTENSIONS],
  includedPrefixes: [...INCLUDED_PREFIXES],
  knownRootAssets: [...KNOWN_ROOT_ASSETS],
  excludedSegments: [...EXCLUDED_SEGMENTS],
});
