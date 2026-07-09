const warnedKeys = new Set();

function warnMissingAsset(category, key) {
  if (import.meta.env.PROD) return;

  const warningKey = `${category}/${key}`;
  if (warnedKeys.has(warningKey)) return;

  warnedKeys.add(warningKey);
  console.warn(`Missing Cloudinary asset URL for ${warningKey}`);
}

export function resetAssetDiagnosticsForTest() {
  warnedKeys.clear();
}

export function getAssetUrl(map, category, key) {
  const categoryKey = String(category ?? '');
  const assetKey = String(key ?? '');
  const entry = map?.[categoryKey]?.[assetKey];
  const value = typeof entry === 'string' ? entry : entry?.url;

  if (typeof value !== 'string') {
    warnMissingAsset(categoryKey, assetKey);
    return null;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || value.startsWith('/')) {
      warnMissingAsset(categoryKey, assetKey);
      return null;
    }
    return url.href;
  } catch {
    warnMissingAsset(categoryKey, assetKey);
    return null;
  }
}
