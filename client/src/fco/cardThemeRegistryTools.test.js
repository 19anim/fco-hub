import { describe, expect, it } from 'vitest';
import {
  buildLocalCardThemeEntries,
  formatCollectionCoverage,
  formatLocalCardThemeEntries,
  mergeCardThemeRegistry,
  reconcileCardThemeCoverage,
} from './cardThemeRegistryTools.js';

describe('buildLocalCardThemeEntries', () => {
  it('builds local card theme entries from collected FIFAAddict backgrounds', () => {
    const result = buildLocalCardThemeEntries([
      {
        seasonCode: 'ICONTMB',
        themeId: '865',
        backgroundImage: 'https://fifaaddict.com/example/card-theme-865.png',
        localPath: '/fco/card-themes/card-theme-865.png',
      },
      {
        seasonCode: 'ICONTM',
        themeId: '865',
        backgroundImage: 'https://fifaaddict.com/example/card-theme-865.png',
        localPath: '/fco/card-themes/card-theme-865.png',
      },
      {
        seasonCode: 'UNKNOWN',
        reason: 'no representative player',
      },
    ]);

    expect(result.entries).toEqual({
      ICONTMB: {
        themeId: '865',
        className: 'card-theme-865',
        backgroundImage: '/fco/card-themes/card-theme-865.png',
      },
      ICONTM: {
        themeId: '865',
        className: 'card-theme-865',
        backgroundImage: '/fco/card-themes/card-theme-865.png',
      },
    });
    expect(result.unresolved).toEqual([
      { seasonCode: 'UNKNOWN', reason: 'no representative player' },
    ]);
    expect(result.sharedThemes).toEqual([
      { themeId: '865', seasons: ['ICONTM', 'ICONTMB'], localPath: '/fco/card-themes/card-theme-865.png' },
    ]);
  });
});

describe('mergeCardThemeRegistry', () => {
  it('adds new seasons, updates changed ones, and keeps untouched entries', () => {
    const existing = {
      ICONTM: { themeId: '865', className: 'card-theme-865', backgroundImage: '/fco/card-themes/card-theme-865.png' },
      OLD: { themeId: '100', className: 'card-theme-100', backgroundImage: '/fco/card-themes/card-theme-100.png' },
    };
    const newEntries = {
      ICONTM: { themeId: '865', className: 'card-theme-865', backgroundImage: '/fco/card-themes/card-theme-865.png' },
      NEWSEASON: { themeId: '999', className: 'card-theme-999', backgroundImage: '/fco/card-themes/card-theme-999.png' },
      OLD: { themeId: '101', className: 'card-theme-101', backgroundImage: '/fco/card-themes/card-theme-101.png' },
    };

    const { registry, added, updated } = mergeCardThemeRegistry(existing, newEntries);

    expect(added).toEqual(['NEWSEASON']);
    expect(updated).toEqual(['OLD']);
    expect(registry.NEWSEASON).toEqual(newEntries.NEWSEASON);
    expect(registry.OLD).toEqual(newEntries.OLD);
    expect(registry.ICONTM).toEqual(existing.ICONTM);
    expect(Object.keys(registry)).toEqual(['ICONTM', 'NEWSEASON', 'OLD']);
  });
});

describe('formatLocalCardThemeEntries', () => {
  it('formats entries for pasting into LOCAL_CARD_THEMES', () => {
    const text = formatLocalCardThemeEntries({
      ICONTMB: {
        themeId: '865',
        className: 'card-theme-865',
        backgroundImage: '/fco/card-themes/card-theme-865.png',
      },
    });

    expect(text).toBe(`  'ICONTMB': {\n    themeId: '865',\n    className: 'card-theme-865',\n    backgroundImage: '/fco/card-themes/card-theme-865.png',\n  },`);
  });
});

describe('formatCollectionCoverage', () => {
  it('formats collection coverage as markdown', () => {
    const markdown = formatCollectionCoverage({
      total: 3,
      entries: {
        ICONTMB: {
          themeId: '865',
          className: 'card-theme-865',
          backgroundImage: '/fco/card-themes/card-theme-865.png',
        },
        ICONTM: {
          themeId: '865',
          className: 'card-theme-865',
          backgroundImage: '/fco/card-themes/card-theme-865.png',
        },
      },
      sharedThemes: [{ themeId: '865', seasons: ['ICONTMB', 'ICONTM'], localPath: '/fco/card-themes/card-theme-865.png' }],
      unresolved: [{ seasonCode: 'UNKNOWN', reason: 'no representative player' }],
    });

    expect(markdown).toContain('- FIFAAddict squadmaker seasons discovered: 0');
    expect(markdown).toContain('- ICONTMB / 865 — `/fco/card-themes/card-theme-865.png`');
    expect(markdown).toContain('- 865 — shared by ICONTMB, ICONTM — `/fco/card-themes/card-theme-865.png`');
    expect(markdown).toContain('- UNKNOWN — no representative player');
  });
});

describe('reconcileCardThemeCoverage', () => {
  it('compares FIFAAddict crawled seasons with app seasons', () => {
    const built = buildLocalCardThemeEntries([
      {
        seasonCode: '865',
        title: 'Icon The Moment B',
        themeId: '865',
        className: 'card-theme-865',
        backgroundImage: 'https://fifaaddict.com/card-theme-865.png',
        localPath: '/fco/card-themes/card-theme-865.png',
      },
      {
        seasonCode: '999',
        title: 'Future FIFAAddict Only',
        themeId: '999',
        className: 'card-theme-999',
        backgroundImage: 'https://fifaaddict.com/card-theme-999.png',
        localPath: '/fco/card-themes/card-theme-999.png',
      },
      {
        seasonCode: '777',
        title: 'Broken Season',
        reason: 'no representative player',
      },
    ]);

    const coverage = reconcileCardThemeCoverage({
      fifaAddictSeasons: [
        { seasonCode: '865', title: 'Icon The Moment B', className: 'search-season-option__badge y865' },
        { seasonCode: '999', title: 'Future FIFAAddict Only' },
        { seasonCode: '777', title: 'Broken Season' },
      ],
      records: [
        { seasonCode: '865', title: 'Icon The Moment B', themeId: '865', localPath: '/fco/card-themes/card-theme-865.png' },
        { seasonCode: '999', title: 'Future FIFAAddict Only', themeId: '999', localPath: '/fco/card-themes/card-theme-999.png' },
        { seasonCode: '777', title: 'Broken Season', reason: 'no representative player' },
      ],
      appSeasons: [
        { value: 'ICONTMB', title: '[ ICONTMB ] Icon The Moment B', className: 'badgedss y865' },
        { value: 'APPONLY', title: 'App Only Season' },
      ],
      entries: built.entries,
      unresolved: built.unresolved,
      sharedThemes: built.sharedThemes,
    });

    expect(coverage.summary).toEqual({
      fifaAddictSeasons: 3,
      downloadedSeasonMappings: 2,
      uniqueDownloadedThemes: 2,
      appSeasons: 2,
      appMappedSeasons: 1,
      appMissingFromFifaAddict: 1,
      fifaAddictOnlySeasons: 1,
      unresolvedSeasons: 1,
    });
    expect(coverage.appMappedSeasons).toEqual([
      { seasonCode: 'ICONTMB', title: '[ ICONTMB ] Icon The Moment B', themeId: '865', localPath: '/fco/card-themes/card-theme-865.png' },
    ]);
    expect(coverage.appMissingFromFifaAddict).toEqual([
      { seasonCode: 'APPONLY', title: 'App Only Season', reason: 'not found in FIFAAddict season options' },
    ]);
    expect(coverage.fifaAddictOnlySeasons).toEqual([
      { seasonCode: '999', title: 'Future FIFAAddict Only', themeId: '999', localPath: '/fco/card-themes/card-theme-999.png' },
    ]);
    expect(coverage.unresolved).toEqual([
      { seasonCode: '777', reason: 'no representative player' },
    ]);
  });
});

describe('formatCollectionCoverage reconciliation sections', () => {
  it('formats app and FIFAAddict reconciliation sections', () => {
    const markdown = formatCollectionCoverage({
      summary: {
        fifaAddictSeasons: 2,
        downloadedSeasonMappings: 1,
        uniqueDownloadedThemes: 1,
        appSeasons: 2,
        appMappedSeasons: 1,
        appMissingFromFifaAddict: 1,
        fifaAddictOnlySeasons: 0,
        unresolvedSeasons: 1,
      },
      cloned: [{ seasonCode: '865', title: 'Icon The Moment B', themeId: '865', localPath: '/fco/card-themes/card-theme-865.png' }],
      sharedThemes: [],
      appMappedSeasons: [{ seasonCode: '865', title: 'Icon The Moment B', themeId: '865', localPath: '/fco/card-themes/card-theme-865.png' }],
      appMissingFromFifaAddict: [{ seasonCode: 'APPONLY', title: 'App Only Season', reason: 'not found in FIFAAddict season options' }],
      fifaAddictOnlySeasons: [],
      unresolved: [{ seasonCode: '777', reason: 'no representative player' }],
    });

    expect(markdown).toContain('- FIFAAddict squadmaker seasons discovered: 2');
    expect(markdown).toContain('- Unique downloaded theme PNGs: 1');
    expect(markdown).toContain('## App seasons mapped to local assets');
    expect(markdown).toContain('- 865 / 865 — Icon The Moment B — `/fco/card-themes/card-theme-865.png`');
    expect(markdown).toContain('## App seasons not found in FIFAAddict query');
    expect(markdown).toContain('- APPONLY — App Only Season — not found in FIFAAddict season options');
    expect(markdown).toContain('## FIFAAddict seasons not matched to app seasons');
    expect(markdown).toContain('- None');
    expect(markdown).toContain('## Unresolved FIFAAddict seasons');
    expect(markdown).toContain('- 777 — no representative player');
  });
});
