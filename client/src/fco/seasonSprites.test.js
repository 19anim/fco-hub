import { describe, expect, it } from 'vitest';
import { resolveSeasonSprite } from './seasonSprites.js';

describe('resolveSeasonSprite', () => {
  it('uses the local FIFAAddict sprite when the asset map has no Cloudinary URL', () => {
    const sprite = {
      spriteUrl: 'https://vn.fifaaddict.com/ffaddv2/img/f14371f.png',
      backgroundPosition: '-30px -48px',
      backgroundSize: '1800% 1100%',
      width: 30,
      height: 24,
    };

    expect(resolveSeasonSprite(sprite, () => null)).toMatchObject({
      spriteUrl: '/fifaaddict-season-sprite.png',
      backgroundPosition: '-30px -48px',
      backgroundSize: '1800% 1100%',
      width: 30,
      height: 24,
    });
  });

  it('recognizes current FIFAAddict sprite URLs from live season metadata', () => {
    expect(resolveSeasonSprite({
      spriteUrl: 'https://fifaaddict.com/ffaddv2/img/85ec08d.png',
      backgroundPosition: '17.6471% 100%',
      backgroundSize: '1800% 1100%',
      width: 30,
      height: 24,
    }, () => null)).toMatchObject({
      spriteUrl: '/fifaaddict-season-sprite.png',
      backgroundPosition: '17.6471% 100%',
    });
  });

  it('normalizes legacy FIFAAddict sprite URLs to the current versioned asset', () => {
    const legacySprite = {
      spriteUrl: 'https://vn.fifaaddict.com/ffaddv2/img/f14371f.png',
      backgroundPosition: '-30px -48px',
    };
    const resolved = resolveSeasonSprite(legacySprite, () => 'https://cloudinary/v2.png');
    expect(resolved.spriteUrl).toBe('https://cloudinary/v2.png');
    expect(resolved.asset).toEqual({ category: 'seasonSprite', key: 'fifaaddict' });
    expect(resolved).toMatchObject({
      spriteUrl: 'https://cloudinary/v2.png',
      asset: { category: 'seasonSprite', key: 'fifaaddict' },
      backgroundPosition: '-30px -48px',
    });
  });
});
