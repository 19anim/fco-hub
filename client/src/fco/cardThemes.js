import { getSeasonVisual } from './seasonSprites.js';

export const CARD_THEME_FALLBACK_ID = 'fallback';

const LOCAL_CARD_THEMES = {
  NG: {
    themeId: 'ng',
    className: 'card-theme-ng',
    backgroundImage: '/fco/card-themes/card-theme-ng.svg',
  },
};

function normalizeSeasonCode(value) {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value || '').trim().toUpperCase();
  }
  return String(value?.season || value?.seasonCode || '').trim().toUpperCase();
}

function normalizeThemeId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || CARD_THEME_FALLBACK_ID;
}

function getFallbackTheme(seasonCode) {
  return {
    seasonCode,
    themeId: CARD_THEME_FALLBACK_ID,
    className: 'card-theme-fallback',
    backgroundImage: '',
    hasLocalAsset: false,
    source: 'fallback',
  };
}

export function getCardThemeForPlayer(playerOrSeason) {
  const seasonCode = normalizeSeasonCode(playerOrSeason);
  if (!seasonCode) return getFallbackTheme('');

  const localTheme = LOCAL_CARD_THEMES[seasonCode];
  if (localTheme) {
    const themeId = normalizeThemeId(localTheme.themeId || seasonCode);
    return {
      seasonCode,
      themeId,
      className: localTheme.className || `card-theme-${themeId}`,
      backgroundImage: localTheme.backgroundImage || '',
      hasLocalAsset: Boolean(localTheme.backgroundImage),
      source: 'local',
    };
  }

  const seasonVisual = getSeasonVisual(seasonCode);
  if (seasonVisual.cardImage) {
    const themeId = normalizeThemeId(seasonCode);
    return {
      seasonCode,
      themeId,
      className: `card-theme-${themeId}`,
      backgroundImage: seasonVisual.cardImage,
      hasLocalAsset: false,
      source: 'season-visual',
    };
  }

  return getFallbackTheme(seasonCode);
}

export function getCardThemeCoverage(players = []) {
  const bySeason = new Map();

  for (const player of players) {
    const theme = getCardThemeForPlayer(player);
    const key = `${theme.source}:${theme.seasonCode}:${theme.themeId}`;
    const existing = bySeason.get(key) || { ...theme, count: 0 };
    existing.count += 1;
    bySeason.set(key, existing);
  }

  const coverage = { cloned: [], fallback: [], seasonVisual: [] };
  for (const theme of bySeason.values()) {
    if (theme.source === 'local') coverage.cloned.push(theme);
    else if (theme.source === 'season-visual') coverage.seasonVisual.push(theme);
    else coverage.fallback.push(theme);
  }

  for (const group of Object.values(coverage)) {
    group.sort((a, b) => String(a.seasonCode).localeCompare(String(b.seasonCode)));
  }

  return coverage;
}

function formatThemeLine(theme, status) {
  const asset = theme.backgroundImage ? `\`${theme.backgroundImage}\`` : status;
  return `- ${theme.seasonCode || '(unknown)'} / ${theme.themeId} — ${theme.count} player(s) — ${asset}`;
}

export function formatCardThemeCoverage(coverage) {
  const cloned = coverage?.cloned || [];
  const seasonVisual = coverage?.seasonVisual || [];
  const fallback = coverage?.fallback || [];

  return [
    '## Card theme coverage',
    '',
    '### Cloned local assets',
    cloned.length ? cloned.map((theme) => formatThemeLine(theme, 'local')).join('\n') : '- None',
    '',
    '### External/season visual fallback',
    seasonVisual.length ? seasonVisual.map((theme) => formatThemeLine(theme, 'season visual')).join('\n') : '- None',
    '',
    '### Missing or CSS fallback',
    fallback.length ? fallback.map((theme) => formatThemeLine(theme, 'fallback')).join('\n') : '- None',
    '',
  ].join('\n');
}
