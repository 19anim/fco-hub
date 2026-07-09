import collectedCardThemes from './cardThemeRegistry.json';
import { getAssetUrl } from './assets/assetMap.js';

export const CARD_THEME_FALLBACK_ID = 'fallback';

const CARD_THEMES = {
  NG: {
    themeId: 'ng',
    className: 'card-theme-ng',
  },
  ...collectedCardThemes,
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

function resolveAssetUrl(assetMapOrLookup, category, key) {
  if (typeof assetMapOrLookup === 'function') return assetMapOrLookup(category, key);
  return getAssetUrl(assetMapOrLookup, category, key);
}

function getFallbackTheme(seasonCode) {
  return {
    seasonCode,
    themeId: CARD_THEME_FALLBACK_ID,
    className: 'card-theme-fallback',
    backgroundImage: null,
    hasAsset: false,
    source: 'fallback',
  };
}

export function getCardThemeForPlayer(playerOrSeason, assetMapOrLookup) {
  const seasonCode = normalizeSeasonCode(playerOrSeason);
  if (!seasonCode) return getFallbackTheme('');

  const theme = CARD_THEMES[seasonCode];
  if (!theme) return getFallbackTheme(seasonCode);

  const themeId = normalizeThemeId(theme.themeId || seasonCode);
  const backgroundImage = resolveAssetUrl(assetMapOrLookup, 'cardTheme', themeId);

  return {
    seasonCode,
    themeId,
    className: theme.className || `card-theme-${themeId}`,
    backgroundImage,
    hasAsset: Boolean(backgroundImage),
    source: 'asset-map',
  };
}

export function getCardThemeCoverage(players = [], assetMapOrLookup) {
  const bySeason = new Map();

  for (const player of players) {
    const theme = getCardThemeForPlayer(player, assetMapOrLookup);
    const key = `${theme.source}:${theme.seasonCode}:${theme.themeId}`;
    const existing = bySeason.get(key) || { ...theme, count: 0 };
    existing.count += 1;
    bySeason.set(key, existing);
  }

  const coverage = { cloned: [], fallback: [], seasonVisual: [] };
  for (const theme of bySeason.values()) {
    if (theme.source === 'asset-map') coverage.cloned.push(theme);
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
