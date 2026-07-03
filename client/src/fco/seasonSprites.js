import { getSeason } from './helpers.js';

const seasonVisuals = new Map();

function normalizeKey(value) {
  return String(value || '').trim().toUpperCase();
}

function toLocalSpriteUrl(url) {
  if (!url) return '';
  if (url.includes('f14371f.png')) return '/fifaaddict-season-sprite.png';
  return url;
}

function pickFirst(...values) {
  return values.find((value) => typeof value === 'string' && value.trim()) || '';
}

export function registerSeasonSprites(seasons = []) {
  for (const season of seasons) {
    const key = normalizeKey(season.seasonId || season.value || season.code || season.id);
    if (!key) continue;

    const sprite = season.seasonSprite || season.sprite || season;
    const visual = {
      cardImage: pickFirst(season.cardImage, season.cardBg, season.cardBackground, season.cardBackgroundUrl, season.backgroundImage),
      cardSideColor: pickFirst(season.cardSideColor, season.sideColor, season.color),
      cardNameColor: pickFirst(season.cardNameColor, season.nameColor),
      cardTextColor: pickFirst(season.cardTextColor, season.textColor),
    };

    if (sprite?.backgroundPosition) {
      visual.sprite = {
        ...sprite,
        spriteUrl: toLocalSpriteUrl(sprite.spriteUrl),
        width: Number(sprite.width) || 30,
        height: Number(sprite.height) || 24,
      };
    }

    seasonVisuals.set(key, visual);
  }
}

export function getSeasonVisual(code) {
  const key = normalizeKey(code);
  const fallback = getSeason(key);
  const visual = seasonVisuals.get(key) || {};
  return {
    ...visual,
    sprite: visual.sprite || null,
    cardSideColor: visual.cardSideColor || fallback.ring,
    cardNameColor: visual.cardNameColor || fallback.fg,
    cardTextColor: visual.cardTextColor || fallback.fg,
    cardBg: fallback.bg,
    cardRing: fallback.ring,
  };
}

export function getSeasonSprite(code) {
  return getSeasonVisual(code).sprite;
}
