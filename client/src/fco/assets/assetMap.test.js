import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAssetUrl, resetAssetDiagnosticsForTest } from './assetMap.js';

afterEach(() => {
  resetAssetDiagnosticsForTest();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('getAssetUrl', () => {
  it('returns an HTTPS URL for an existing category/key', () => {
    const map = { cardTheme: { 865: 'https://res.cloudinary.com/demo/card-theme.png' } };

    expect(getAssetUrl(map, 'cardTheme', '865')).toBe('https://res.cloudinary.com/demo/card-theme.png');
  });

  it('returns the URL from public-map asset entry objects', () => {
    const map = {
      cardTheme: {
        865: {
          url: 'https://res.cloudinary.com/demo/card-theme.png',
          width: 208,
          height: 260,
          format: 'png',
          bytes: 1234,
        },
      },
    };

    expect(getAssetUrl(map, 'cardTheme', '865')).toBe('https://res.cloudinary.com/demo/card-theme.png');
  });

  it('returns null for missing categories and keys', () => {
    const map = { cardTheme: { 865: 'https://res.cloudinary.com/demo/card-theme.png' } };

    expect(getAssetUrl(map, 'upgradeBadge', '13')).toBeNull();
    expect(getAssetUrl(map, 'cardTheme', '999')).toBeNull();
  });

  it('returns null for invalid, non-HTTPS, and local public values', () => {
    expect(getAssetUrl({ cardTheme: { 865: 'http://res.cloudinary.com/demo/card-theme.png' } }, 'cardTheme', '865')).toBeNull();
    expect(getAssetUrl({ cardTheme: { 865: '/fco/card-themes/card-theme-865.png' } }, 'cardTheme', '865')).toBeNull();
    expect(getAssetUrl({ cardTheme: { 865: 'not a url' } }, 'cardTheme', '865')).toBeNull();
    expect(getAssetUrl({ cardTheme: { 865: null } }, 'cardTheme', '865')).toBeNull();
  });

  it('never returns a result beginning with slash', () => {
    const result = getAssetUrl({ upgradeBase: { default: '/upgrade.png' } }, 'upgradeBase', 'default');

    expect(result).toBeNull();
  });

  it('warns once per category/key in development diagnostics', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    getAssetUrl({}, 'cardTheme', '865');
    getAssetUrl({}, 'cardTheme', '865');
    getAssetUrl({}, 'cardTheme', 'ng');

    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenNthCalledWith(1, 'Missing Cloudinary asset URL for cardTheme/865');
    expect(warn).toHaveBeenNthCalledWith(2, 'Missing Cloudinary asset URL for cardTheme/ng');
  });

  it('is silent in production diagnostics', () => {
    vi.stubEnv('PROD', true);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(getAssetUrl({}, 'cardTheme', '865')).toBeNull();

    expect(warn).not.toHaveBeenCalled();
  });
});
