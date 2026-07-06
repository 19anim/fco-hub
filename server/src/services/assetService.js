export const ASSET_CATEGORIES = Object.freeze({
  cardTheme: { folder: 'card-themes', key: /^(?:ng|[a-z0-9-]+)$/ },
  upgradeBadge: { folder: 'upgrade-badges', key: /^(?:[0-9]|1[0-3])$/ },
  upgradeMascot: { folder: 'upgrade-mascots', keys: ['happy', 'sad'] },
  upgradeBase: { folder: 'upgrade-bases', keys: ['default'] },
  upgradeEffect: { folder: 'upgrade-effects', keys: ['shatter'] },
  seasonSprite: { folder: 'season-sprites', keys: ['fifaaddict'] },
  badgeSprite: { folder: 'badge-sprites', keys: ['fc-online'] },
  siteAsset: { folder: 'site-assets', keys: ['icons', 'favicon'] },
  teamColorIcon: { folder: 'team-color-icons', keys: ['club', 'grade', 'relation'] },
  general: { folder: 'general', key: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
});

export function normalizeAssetIdentity(category, key) {
  const normalizedCategory = String(category ?? '').trim();
  const normalizedKey = String(key ?? '').trim().toLowerCase();
  const rule = ASSET_CATEGORIES[normalizedCategory];
  if (!rule || !(rule.keys?.includes(normalizedKey) || rule.key?.test(normalizedKey))) {
    const error = new Error('Invalid asset category or key');
    error.statusCode = 400;
    throw error;
  }
  return { category: normalizedCategory, key: normalizedKey };
}
