const NO_MATCH = Object.freeze({
  status: 'unresolved',
  reason: 'No classification rule matched',
});

const ROOT_ASSET_RULES = new Map([
  ['/upgrade-happy.png', { category: 'upgradeMascot', key: 'happy', label: 'Upgrade happy mascot' }],
  ['/upgrade-sad.png', { category: 'upgradeMascot', key: 'sad', label: 'Upgrade sad mascot' }],
  ['/upgrade.png', { category: 'upgradeBase', key: 'default', label: 'Upgrade base image' }],
  ['/fifaaddict-season-sprite.png', { category: 'seasonSprite', key: 'fifaaddict', label: 'FIFAAddict season sprite' }],
  ['/fc_online_badges_css_sprite.png', { category: 'badgeSprite', key: 'fc-online', label: 'FC Online badge sprite' }],
  ['/icons.svg', { category: 'siteAsset', key: 'icons', label: 'Site icons sprite' }],
  ['/favicon.svg', { category: 'siteAsset', key: 'favicon', label: 'Site favicon' }],
]);

const TEAM_COLOR_ICON_LABELS = Object.freeze({
  club: 'Team color club icon',
  grade: 'Team color grade icon',
  relation: 'Team color relation icon',
});

function normalizeSourcePath(sourcePath) {
  const normalized = String(sourcePath ?? '').replace(/\\/g, '/');
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function resolved(category, key, label) {
  return { status: 'classified', category, key, label };
}

export function classifyAssetSourcePath(sourcePath) {
  const normalizedPath = normalizeSourcePath(sourcePath);
  const lowerPath = normalizedPath.toLowerCase();

  const rootRule = ROOT_ASSET_RULES.get(lowerPath);
  if (rootRule) {
    return resolved(rootRule.category, rootRule.key, rootRule.label);
  }

  const cardThemeMatch = lowerPath.match(/^\/fco\/card-themes\/card-theme-([a-z0-9-]+)\.(?:png|jpe?g|webp|gif|svg|avif)$/);
  if (cardThemeMatch) {
    const key = cardThemeMatch[1];
    return resolved('cardTheme', key, `Card theme ${key}`);
  }

  const upgradeBadgeMatch = lowerPath.match(/^\/upgrade-badges\/grade_([0-9]|1[0-3])\.(?:png|jpe?g|webp|gif|svg|avif)$/);
  if (upgradeBadgeMatch) {
    const key = upgradeBadgeMatch[1];
    return resolved('upgradeBadge', key, `Upgrade badge ${key}`);
  }

  if (/^\/upgrade-effects\/shatter_sprite\.(?:png|jpe?g|webp|gif|svg|avif)$/.test(lowerPath)) {
    return resolved('upgradeEffect', 'shatter', 'Upgrade shatter effect');
  }

  const teamColorIconMatch = lowerPath.match(/^\/fco\/teamcolor-icons\/strip\/(club|grade|relation)\.(?:png|jpe?g|webp|gif|svg|avif)$/);
  if (teamColorIconMatch) {
    const key = teamColorIconMatch[1];
    return resolved('teamColorIcon', key, TEAM_COLOR_ICON_LABELS[key]);
  }

  return { ...NO_MATCH };
}
