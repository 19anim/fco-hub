import { describe, expect, it } from 'vitest';
import { CARD_THEME_FALLBACK_ID, formatCardThemeCoverage, getCardThemeCoverage, getCardThemeForPlayer } from './cardThemes.js';

const assetMap = {
  cardTheme: {
    ng: 'https://res.cloudinary.com/demo/card-themes/ng-v1.svg',
    865: 'https://res.cloudinary.com/demo/card-themes/865-v1.png',
  },
};

describe('getCardThemeForPlayer', () => {
  it('returns a stable fallback theme for an unknown season', () => {
    expect(getCardThemeForPlayer({ season: 'UNKNOWN_SEASON' }, assetMap)).toEqual({
      seasonCode: 'UNKNOWN_SEASON',
      themeId: CARD_THEME_FALLBACK_ID,
      className: 'card-theme-fallback',
      backgroundImage: null,
      hasAsset: false,
      source: 'fallback',
    });
  });

  it('resolves a registry theme through the asset map', () => {
    expect(getCardThemeForPlayer({ season: 'NG' }, assetMap)).toMatchObject({
      seasonCode: 'NG',
      themeId: 'ng',
      className: 'card-theme-ng',
      backgroundImage: 'https://res.cloudinary.com/demo/card-themes/ng-v1.svg',
      hasAsset: true,
      source: 'asset-map',
    });
  });

  it('uses null when the asset map is missing the theme URL', () => {
    expect(getCardThemeForPlayer('NG', {})).toMatchObject({
      seasonCode: 'NG',
      themeId: 'ng',
      className: 'card-theme-ng',
      backgroundImage: null,
      hasAsset: false,
    });
  });

  it('accepts a raw season string and lookup function', () => {
    expect(getCardThemeForPlayer('NG', (category, key) => assetMap[category]?.[key] || null)).toMatchObject({
      seasonCode: 'NG',
      themeId: 'ng',
      className: 'card-theme-ng',
      backgroundImage: 'https://res.cloudinary.com/demo/card-themes/ng-v1.svg',
    });
  });
});

describe('getCardThemeCoverage', () => {
  it('deduplicates seasons and groups asset-map and fallback themes', () => {
    const coverage = getCardThemeCoverage([
      { season: 'NG', name: 'A' },
      { season: 'NG', name: 'B' },
      { season: 'UNKNOWN_SEASON', name: 'C' },
    ], assetMap);

    expect(coverage.cloned).toEqual([
      expect.objectContaining({ seasonCode: 'NG', themeId: 'ng', count: 2, backgroundImage: assetMap.cardTheme.ng }),
    ]);
    expect(coverage.fallback).toEqual([
      expect.objectContaining({ seasonCode: 'UNKNOWN_SEASON', themeId: CARD_THEME_FALLBACK_ID, count: 1 }),
    ]);
    expect(coverage.seasonVisual).toEqual([]);
  });
});

describe('FIFAAddict-compatible class names', () => {
  it('returns card-theme classes without spaces', () => {
    const theme = getCardThemeForPlayer({ season: 'NG' }, assetMap);
    expect(theme.className).toBe('card-theme-ng');
    expect(theme.className).not.toMatch(/\s/);
  });
});

describe('formatCardThemeCoverage', () => {
  it('formats asset-map and fallback themes as markdown', () => {
    const markdown = formatCardThemeCoverage({
      cloned: [{ seasonCode: 'NG', themeId: 'ng', count: 2, backgroundImage: assetMap.cardTheme.ng }],
      seasonVisual: [],
      fallback: [{ seasonCode: 'UNKNOWN', themeId: 'fallback', count: 1 }],
    });

    expect(markdown).toContain('## Card theme coverage');
    expect(markdown).toContain('- NG / ng — 2 player(s) — `https://res.cloudinary.com/demo/card-themes/ng-v1.svg`');
    expect(markdown).toContain('- UNKNOWN / fallback — 1 player(s) — fallback');
    expect(markdown).not.toContain('/fco/card-themes');
  });
});
