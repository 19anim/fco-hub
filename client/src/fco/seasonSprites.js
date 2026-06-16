const seasonSprites = new Map();

function normalizeKey(value) {
  return String(value || '').trim().toUpperCase();
}

function toLocalSpriteUrl(url) {
  if (!url) return '';
  if (url.includes('f14371f.png')) return '/fifaaddict-season-sprite.png';
  return url;
}

export function registerSeasonSprites(seasons = []) {
  for (const season of seasons) {
    const key = normalizeKey(season.seasonId || season.value);
    const sprite = season.seasonSprite || season.sprite || season;
    if (!key || !sprite?.backgroundPosition) continue;
    seasonSprites.set(key, {
      ...sprite,
      spriteUrl: toLocalSpriteUrl(sprite.spriteUrl),
      width: Number(sprite.width) || 30,
      height: Number(sprite.height) || 24,
    });
  }
}

export function getSeasonSprite(code) {
  return seasonSprites.get(normalizeKey(code)) || null;
}
