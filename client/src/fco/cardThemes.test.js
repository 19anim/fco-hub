import { describe, expect, it } from 'vitest';
import { CARD_THEME_FALLBACK_ID, getCardThemeCoverage, getCardThemeForPlayer } from './cardThemes.js';

describe('getCardThemeForPlayer', () => {
  it('returns a stable fallback theme for an unknown season', () => {
    expect(getCardThemeForPlayer({ season: 'UNKNOWN_SEASON' })).toEqual({
      seasonCode: 'UNKNOWN_SEASON',
      themeId: CARD_THEME_FALLBACK_ID,
      className: 'card-theme-fallback',
      backgroundImage: '',
      hasLocalAsset: false,
      source: 'fallback',
    });
  });

  it('uses an explicit local registry entry when available', () => {
    expect(getCardThemeForPlayer({ season: 'NG' })).toMatchObject({
      seasonCode: 'NG',
      themeId: 'ng',
      className: 'card-theme-ng',
      hasLocalAsset: true,
      source: 'local',
    });
  });

  it('accepts a raw season string', () => {
    expect(getCardThemeForPlayer('NG')).toMatchObject({
      seasonCode: 'NG',
      themeId: 'ng',
      className: 'card-theme-ng',
    });
  });
});

describe('getCardThemeCoverage', () => {
  it('deduplicates seasons and groups cloned and fallback themes', () => {
    const coverage = getCardThemeCoverage([
      { season: 'NG', name: 'A' },
      { season: 'NG', name: 'B' },
      { season: 'UNKNOWN_SEASON', name: 'C' },
    ]);

    expect(coverage.cloned).toEqual([
      expect.objectContaining({ seasonCode: 'NG', themeId: 'ng', count: 2 }),
    ]);
    expect(coverage.fallback).toEqual([
      expect.objectContaining({ seasonCode: 'UNKNOWN_SEASON', themeId: CARD_THEME_FALLBACK_ID, count: 1 }),
    ]);
    expect(coverage.seasonVisual).toEqual([]);
  });
});

describe('FIFAAddict-compatible class names', () => {
  it('returns card-theme classes without spaces', () => {
    const theme = getCardThemeForPlayer({ season: 'NG' });
    expect(theme.className).toBe('card-theme-ng');
    expect(theme.className).not.toMatch(/\s/);
  });
});
