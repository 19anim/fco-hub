export const FIXED_KEYS = Object.freeze({
  upgradeMascot: ['happy', 'sad'],
  upgradeBase: ['default'],
  upgradeEffect: ['shatter'],
  seasonSprite: ['fifaaddict'],
  badgeSprite: ['fc-online'],
  siteAsset: ['icons', 'favicon'],
  teamColorIcon: ['club', 'grade', 'relation'],
  playerDetailAsset: ['foot'],
});

export const CATEGORY_LABELS = Object.freeze({
  cardTheme: 'Card theme',
  upgradeBadge: 'Upgrade badge',
  upgradeMascot: 'Upgrade mascot',
  upgradeBase: 'Upgrade base',
  upgradeEffect: 'Upgrade effect',
  seasonSprite: 'Season sprite',
  badgeSprite: 'Badge sprite',
  siteAsset: 'Site asset',
  teamColorIcon: 'Team color icon',
  playerDetailAsset: 'Player detail asset',
  general: 'General',
});

export const CATEGORY_OPTIONS = Object.freeze([
  ['all', 'All categories'],
  ['cardTheme', 'Card themes'],
  ['upgradeBadge', 'Upgrade badges'],
  ['upgradeMascot', 'Upgrade mascots'],
  ['upgradeBase', 'Upgrade base'],
  ['upgradeEffect', 'Upgrade effect'],
  ['seasonSprite', 'Season sprite'],
  ['badgeSprite', 'Badge sprite'],
  ['siteAsset', 'Site assets'],
  ['teamColorIcon', 'Team color icons'],
  ['playerDetailAsset', 'Player detail assets'],
  ['general', 'General'],
]);

export const STATUS_OPTIONS = Object.freeze([
  ['active', 'Active'],
  ['archived', 'Archived'],
  ['all', 'All statuses'],
]);

export function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!value) return '—';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}
