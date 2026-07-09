import { getSeason } from './helpers.js';
import { getAssetUrl } from './assets/assetMap.js';

const LOCAL_FIFAADDICT_SPRITE_URL = '/fifaaddict-season-sprite.png';

const seasonVisuals = new Map();

function normalizeKey(value) {
  return String(value || '').trim().toUpperCase();
}

function resolveAssetUrl(assetMapOrLookup, category, key) {
  if (typeof assetMapOrLookup === 'function') return assetMapOrLookup(category, key);
  return getAssetUrl(assetMapOrLookup, category, key);
}

export function normalizeSeasonSpriteAsset(sprite = {}) {
  const spriteUrl = String(sprite.spriteUrl || sprite.url || '').trim();
  if (!/fifaaddict\.com\/ffaddv2\/img\/.*\.png/i.test(spriteUrl)) return null;
  return { category: 'seasonSprite', key: 'fifaaddict' };
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
        spriteUrl: null,
        asset: normalizeSeasonSpriteAsset(sprite),
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

export function resolveSeasonSprite(sprite, assetMapOrLookup) {
  if (!sprite) return null;

  const asset = sprite.asset || normalizeSeasonSpriteAsset(sprite);
  if (!asset) return null;

  const spriteUrl = resolveAssetUrl(assetMapOrLookup, asset.category, asset.key) || LOCAL_FIFAADDICT_SPRITE_URL;

  return { ...sprite, spriteUrl, asset };
}

export function getSeasonSprite(code, assetMapOrLookup) {
  return resolveSeasonSprite(getSeasonVisual(code).sprite, assetMapOrLookup);
}
