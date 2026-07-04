# FIFAAddict Card Background Collection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crawl every card background season exposed by FIFAAddict squadmaker, download local PNG backgrounds, and map app seasons to local assets through `LOCAL_CARD_THEMES`.

**Architecture:** Keep this as a background-only collector/reporting workflow, independent from `/admin/data-ops` and the existing "Scrape Seasons" UI/API. The collector reads season options from FIFAAddict squadmaker, renders one representative card per season, downloads unique rendered PNGs, and generates reconciliation artifacts. Pure client helpers format `LOCAL_CARD_THEMES` entries and coverage markdown so the registry logic is testable without Playwright.

**Tech Stack:** React 19, Vite 8, Vitest 4, Node.js ESM, Playwright Chromium, Mongoose models, plain JavaScript modules, existing `client/src/fco/cardThemes.js` registry.

## Global Constraints

- Use `rtk` prefix for all shell commands.
- This work is only about card background assets.
- Do not change the admin `/admin/data-ops` "Scrape Seasons" UI/API flow.
- Do not change existing season-scraping endpoints or database update behavior.
- Use `https://fifaaddict.com/vn/fco-squadmaker/` season filter options as the source of truth for FIFAAddict seasons to crawl.
- Do not guess FIFAAddict asset URLs.
- Clone backgrounds only from rendered `card-theme-*` classes and `img.card-bg-img.fc-bg[src]` values.
- Download assets into `client/public/fco/card-themes/`.
- Map app seasons through the JavaScript `LOCAL_CARD_THEMES` registry in `client/src/fco/cardThemes.js`.
- Multiple app seasons may map to the same downloaded `card-theme-*` PNG.
- Keep unresolved seasons rendering through the existing fallback path and include them in coverage.
- Do not change card renderer layout, squad card behavior, `/upgrade`, or player detail screens in this pass.
- Do not commit unless the user explicitly asks for a commit.

---

## File Structure

- Modify `client/src/fco/cardThemeRegistryTools.js` — keep pure registry helpers and add reconciliation helpers for FIFAAddict season records vs app seasons.
- Modify `client/src/fco/cardThemeRegistryTools.test.js` — test registry generation, shared PNG mappings, unresolved reasons, and app/FIFAAddict reconciliation report sections.
- Modify `server/src/services/fifaAddictCardBackgroundCollector.js` — update Playwright collector to discover all FIFAAddict squadmaker season options from the UI before collecting backgrounds.
- Modify `server/scripts/collectFifaAddictCardBackgrounds.js` — run the collector, load app seasons only for reconciliation, and write JSON/markdown/snippet artifacts.
- Modify `client/src/fco/cardThemes.js` — insert generated `LOCAL_CARD_THEMES` entries after full collection.
- Generated `docs/superpowers/plans/2026-07-04-fifaaddict-card-background-collection.json` — raw collection output.
- Generated `docs/superpowers/plans/2026-07-04-fifaaddict-card-background-coverage.md` — coverage and reconciliation report.
- Generated `docs/superpowers/plans/2026-07-04-fifaaddict-card-background-registry-snippet.txt` — paste-ready `LOCAL_CARD_THEMES` entries.
- Generated `client/public/fco/card-themes/card-theme-*.png` — downloaded local background assets.

---

### Task 1: Add background reconciliation helpers

**Files:**
- Modify: `client/src/fco/cardThemeRegistryTools.js`
- Modify: `client/src/fco/cardThemeRegistryTools.test.js`

**Interfaces:**
- Consumes: collector records shaped as `{ seasonCode: string, themeId?: string, className?: string, backgroundImage?: string, localPath?: string, reason?: string }`.
- Consumes: app seasons shaped as `{ value?: string, season?: string, seasonCode?: string, title?: string, className?: string }`.
- Produces: `buildLocalCardThemeEntries(records: Array): { entries: Record<string, { themeId: string, className: string, backgroundImage: string }>, unresolved: Array, sharedThemes: Array }`.
- Produces: `reconcileCardThemeCoverage({ fifaAddictSeasons?: Array, records?: Array, appSeasons?: Array, entries?: object, unresolved?: Array, sharedThemes?: Array }): object`.
- Produces: `formatCollectionCoverage(coverageOrInput: object): string`.
- Produces: `formatLocalCardThemeEntries(entries: Record<string, object>): string`.

- [ ] **Step 1: Add failing reconciliation tests**

Add these imports and tests to `client/src/fco/cardThemeRegistryTools.test.js`:

```js
import {
  buildLocalCardThemeEntries,
  formatCollectionCoverage,
  formatLocalCardThemeEntries,
  reconcileCardThemeCoverage,
} from './cardThemeRegistryTools.js';

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
        { seasonCode: '865', title: 'Icon The Moment B' },
        { seasonCode: '999', title: 'Future FIFAAddict Only' },
        { seasonCode: '777', title: 'Broken Season' },
      ],
      records: [
        { seasonCode: '865', title: 'Icon The Moment B', themeId: '865', localPath: '/fco/card-themes/card-theme-865.png' },
        { seasonCode: '999', title: 'Future FIFAAddict Only', themeId: '999', localPath: '/fco/card-themes/card-theme-999.png' },
        { seasonCode: '777', title: 'Broken Season', reason: 'no representative player' },
      ],
      appSeasons: [
        { value: '865', title: 'Icon The Moment B' },
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
      { seasonCode: '865', title: 'Icon The Moment B', themeId: '865', localPath: '/fco/card-themes/card-theme-865.png' },
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
```

Also replace the existing import block at the top of the file with the expanded import block shown above so `reconcileCardThemeCoverage` is imported once.

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
rtk npm --prefix client test -- src/fco/cardThemeRegistryTools.test.js
```

Expected: FAIL with an export error for `reconcileCardThemeCoverage` or assertion failures for the new coverage format.

- [ ] **Step 3: Implement reconciliation helpers**

Replace `client/src/fco/cardThemeRegistryTools.js` with:

```js
function normalizeSeasonCode(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeThemeId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^card-theme-/, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeLocalPath(value, themeId) {
  const path = String(value || '').trim();
  return path || `/fco/card-themes/card-theme-${themeId}.png`;
}

function normalizeTitle(value) {
  return String(value || '').trim();
}

function normalizeSeasonRecord(record = {}) {
  const seasonCode = normalizeSeasonCode(record.seasonCode || record.season || record.value);
  return {
    seasonCode,
    title: normalizeTitle(record.title || record.name || record.label),
    className: String(record.className || '').trim(),
  };
}

function getRecordTitle(record = {}) {
  return normalizeTitle(record.title || record.name || record.label);
}

function formatSeasonTitle(title) {
  return title ? ` — ${title}` : '';
}

function formatAssetLine(item) {
  return `- ${item.seasonCode} / ${item.themeId}${formatSeasonTitle(item.title)} — \`${item.localPath || item.backgroundImage}\``;
}

export function buildLocalCardThemeEntries(records = []) {
  const entries = {};
  const unresolved = [];
  const themeUsage = new Map();

  for (const record of records) {
    const seasonCode = normalizeSeasonCode(record?.seasonCode || record?.season || record?.value);
    if (!seasonCode) continue;

    const themeId = normalizeThemeId(record?.themeId || record?.className);
    const reason = String(record?.reason || '').trim();
    if (!themeId || reason) {
      unresolved.push({ seasonCode, reason: reason || 'missing rendered theme class' });
      continue;
    }

    const localPath = normalizeLocalPath(record?.localPath, themeId);
    entries[seasonCode] = {
      themeId,
      className: `card-theme-${themeId}`,
      backgroundImage: localPath,
    };

    const existing = themeUsage.get(themeId) || { themeId, seasons: [], localPath };
    existing.seasons.push(seasonCode);
    themeUsage.set(themeId, existing);
  }

  const sharedThemes = [...themeUsage.values()]
    .filter((theme) => theme.seasons.length > 1)
    .map((theme) => ({ ...theme, seasons: theme.seasons.sort() }))
    .sort((a, b) => a.themeId.localeCompare(b.themeId));

  unresolved.sort((a, b) => a.seasonCode.localeCompare(b.seasonCode));

  return { entries, unresolved, sharedThemes };
}

export function reconcileCardThemeCoverage({
  fifaAddictSeasons = [],
  records = [],
  appSeasons = [],
  entries = {},
  sharedThemes = [],
  unresolved = [],
} = {}) {
  const fifaSeasonsByCode = new Map(
    fifaAddictSeasons
      .map(normalizeSeasonRecord)
      .filter((season) => season.seasonCode)
      .map((season) => [season.seasonCode, season]),
  );
  const appSeasonsByCode = new Map(
    appSeasons
      .map(normalizeSeasonRecord)
      .filter((season) => season.seasonCode)
      .map((season) => [season.seasonCode, season]),
  );
  const recordsByCode = new Map(
    records
      .map((record) => ({ ...record, seasonCode: normalizeSeasonCode(record?.seasonCode || record?.season || record?.value) }))
      .filter((record) => record.seasonCode)
      .map((record) => [record.seasonCode, record]),
  );

  const cloned = Object.entries(entries)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([seasonCode, theme]) => {
      const record = recordsByCode.get(seasonCode) || {};
      const fifaSeason = fifaSeasonsByCode.get(seasonCode) || {};
      return {
        seasonCode,
        title: getRecordTitle(record) || fifaSeason.title || '',
        themeId: theme.themeId,
        localPath: theme.backgroundImage,
      };
    });

  const appMappedSeasons = cloned.filter((item) => appSeasonsByCode.has(item.seasonCode));

  const appMissingFromFifaAddict = [...appSeasonsByCode.values()]
    .filter((season) => !fifaSeasonsByCode.has(season.seasonCode))
    .map((season) => ({
      seasonCode: season.seasonCode,
      title: season.title,
      reason: 'not found in FIFAAddict season options',
    }))
    .sort((a, b) => a.seasonCode.localeCompare(b.seasonCode));

  const fifaAddictOnlySeasons = cloned
    .filter((item) => !appSeasonsByCode.has(item.seasonCode))
    .map((item) => ({
      seasonCode: item.seasonCode,
      title: item.title,
      themeId: item.themeId,
      localPath: item.localPath,
    }));

  const uniqueDownloadedThemes = new Set(cloned.map((item) => item.themeId)).size;
  const normalizedUnresolved = unresolved
    .map((item) => ({
      seasonCode: normalizeSeasonCode(item.seasonCode || item.season || item.value),
      reason: String(item.reason || 'missing rendered theme class').trim(),
    }))
    .filter((item) => item.seasonCode)
    .sort((a, b) => a.seasonCode.localeCompare(b.seasonCode));

  return {
    summary: {
      fifaAddictSeasons: fifaSeasonsByCode.size,
      downloadedSeasonMappings: cloned.length,
      uniqueDownloadedThemes,
      appSeasons: appSeasonsByCode.size,
      appMappedSeasons: appMappedSeasons.length,
      appMissingFromFifaAddict: appMissingFromFifaAddict.length,
      fifaAddictOnlySeasons: fifaAddictOnlySeasons.length,
      unresolvedSeasons: normalizedUnresolved.length,
    },
    cloned,
    sharedThemes,
    appMappedSeasons,
    appMissingFromFifaAddict,
    fifaAddictOnlySeasons,
    unresolved: normalizedUnresolved,
  };
}

export function formatLocalCardThemeEntries(entries = {}) {
  return Object.entries(entries)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([seasonCode, theme]) => [
      `  '${seasonCode}': {`,
      `    themeId: '${theme.themeId}',`,
      `    className: '${theme.className}',`,
      `    backgroundImage: '${theme.backgroundImage}',`,
      '  },',
    ].join('\n'))
    .join('\n');
}

export function formatCollectionCoverage(input = {}) {
  const coverage = input.summary ? input : reconcileCardThemeCoverage(input);
  const summary = coverage.summary || {};
  const clonedLines = (coverage.cloned || []).map(formatAssetLine);
  const sharedLines = (coverage.sharedThemes || []).map((theme) => `- ${theme.themeId} — shared by ${theme.seasons.join(', ')} — \`${theme.localPath}\``);
  const appMappedLines = (coverage.appMappedSeasons || []).map(formatAssetLine);
  const appMissingLines = (coverage.appMissingFromFifaAddict || []).map((item) => `- ${item.seasonCode}${formatSeasonTitle(item.title)} — ${item.reason}`);
  const fifaOnlyLines = (coverage.fifaAddictOnlySeasons || []).map(formatAssetLine);
  const unresolvedLines = (coverage.unresolved || []).map((item) => `- ${item.seasonCode} — ${item.reason}`);

  return [
    '# FIFAAddict card background collection coverage',
    '',
    '## Summary',
    '',
    `- FIFAAddict squadmaker seasons discovered: ${summary.fifaAddictSeasons || 0}`,
    `- FIFAAddict season mappings with local assets: ${summary.downloadedSeasonMappings || 0}`,
    `- Unique downloaded theme PNGs: ${summary.uniqueDownloadedThemes || 0}`,
    `- App seasons considered: ${summary.appSeasons || 0}`,
    `- App seasons mapped to local assets: ${summary.appMappedSeasons || 0}`,
    `- App seasons not found in FIFAAddict query: ${summary.appMissingFromFifaAddict || 0}`,
    `- FIFAAddict seasons not matched to app seasons: ${summary.fifaAddictOnlySeasons || 0}`,
    `- Unresolved FIFAAddict seasons: ${summary.unresolvedSeasons || 0}`,
    '',
    '## FIFAAddict local assets',
    '',
    clonedLines.length ? clonedLines.join('\n') : '- None',
    '',
    '## Shared downloaded themes',
    '',
    sharedLines.length ? sharedLines.join('\n') : '- None',
    '',
    '## App seasons mapped to local assets',
    '',
    appMappedLines.length ? appMappedLines.join('\n') : '- None',
    '',
    '## App seasons not found in FIFAAddict query',
    '',
    appMissingLines.length ? appMissingLines.join('\n') : '- None',
    '',
    '## FIFAAddict seasons not matched to app seasons',
    '',
    fifaOnlyLines.length ? fifaOnlyLines.join('\n') : '- None',
    '',
    '## Unresolved FIFAAddict seasons',
    '',
    unresolvedLines.length ? unresolvedLines.join('\n') : '- None',
    '',
  ].join('\n');
}
```

- [ ] **Step 4: Run registry helper tests**

Run:

```bash
rtk npm --prefix client test -- src/fco/cardThemeRegistryTools.test.js
```

Expected: PASS.

---

### Task 2: Discover all FIFAAddict squadmaker season options

**Files:**
- Modify: `server/src/services/fifaAddictCardBackgroundCollector.js`

**Interfaces:**
- Consumes: Playwright `page` on `https://fifaaddict.com/vn/fco-squadmaker/`.
- Produces: `discoverFifaAddictSquadmakerSeasons(page): Promise<Array<{ seasonCode: string, value: string, title: string, className: string }>>`.
- Produces: `normalizeFifaAddictSeasonOption(raw: object): { seasonCode: string, value: string, title: string, className: string }`.
- Later tasks use the returned season list as the crawl source of truth.

- [ ] **Step 1: Add exported normalization helpers**

In `server/src/services/fifaAddictCardBackgroundCollector.js`, add these helpers after `toLocalCardThemePath`:

```js
export function normalizeFifaAddictSeasonOption(raw = {}) {
  const value = String(raw.value || raw.seasonCode || raw.season || '').trim();
  const title = String(raw.title || raw.label || '').trim();
  const className = String(raw.className || '').trim();
  const seasonCode = String(value || title.replace(/^\[\s*([^\]]+)\].*$/, '$1')).trim().toUpperCase();

  return {
    seasonCode,
    value,
    title,
    className,
  };
}
```

- [ ] **Step 2: Sanity-check normalization helper**

Run:

```bash
rtk node --input-type=module -e "import { normalizeFifaAddictSeasonOption } from './server/src/services/fifaAddictCardBackgroundCollector.js'; console.log(normalizeFifaAddictSeasonOption({ value: '865', title: '[ICON TM B] Icon The Moment B', className: 'search-season-option y865' }));"
```

Expected: output includes `seasonCode: '865'`, `value: '865'`, and `className: 'search-season-option y865'`.

- [ ] **Step 3: Add UI season discovery function**

In `server/src/services/fifaAddictCardBackgroundCollector.js`, add this function before `selectRepresentativePlayer`:

```js
export async function discoverFifaAddictSquadmakerSeasons(page) {
  await page.goto(FIFAADDICT_SQUADMAKER_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForSelector('.search-season-option', { timeout: 30000 });

  const options = await page.evaluate(() => Array.from(document.querySelectorAll('.search-season-option')).map((node) => {
    const label = node.getAttribute('aria-label') || node.getAttribute('title') || node.textContent || '';
    const className = node.className || '';
    const classSeason = String(className).match(/(?:^|\s)y([a-z0-9_-]+)(?:\s|$)/i)?.[1] || '';
    return {
      value: node.getAttribute('data-value') || node.getAttribute('value') || classSeason,
      title: label,
      className,
    };
  }));

  const seen = new Set();
  return options
    .map(normalizeFifaAddictSeasonOption)
    .filter((season) => season.seasonCode && !seen.has(season.seasonCode) && seen.add(season.seasonCode))
    .sort((a, b) => a.seasonCode.localeCompare(b.seasonCode));
}
```

- [ ] **Step 4: Add a limited discovery mode to the collector**

In `collectFifaAddictCardBackgrounds`, replace:

```js
const appSeasons = seasons || await attachRepresentativePlayers(await getActiveSeasons(limit));
const records = [];
```

with:

```js
const records = [];
```

Then after `const page = await context.newPage();`, add:

```js
const fifaAddictSeasons = seasons || await discoverFifaAddictSquadmakerSeasons(page);
const crawlSeasons = Number.isFinite(limit) && limit > 0 ? fifaAddictSeasons.slice(0, limit) : fifaAddictSeasons;
```

Then replace the loop header:

```js
for (const season of appSeasons) {
```

with:

```js
for (const season of crawlSeasons) {
```

Finally replace the return line:

```js
return { total: appSeasons.length, records };
```

with:

```js
return { total: fifaAddictSeasons.length, fifaAddictSeasons, records };
```

- [ ] **Step 5: Remove app-player representative dependency from source-of-truth setup**

In `server/src/services/fifaAddictCardBackgroundCollector.js`, remove this import if it is now unused:

```js
import PlayerEnrichment from '../models/PlayerEnrichment.js';
```

Remove the `attachRepresentativePlayers` function if no code uses it after Step 4.

Keep `FifaAddictSeason` and `getActiveSeasons` only if Task 3 still uses an exported app-season loader; otherwise move app-season loading to the CLI script in Task 3.

- [ ] **Step 6: Sanity-check collector imports**

Run:

```bash
rtk node --input-type=module -e "import { discoverFifaAddictSquadmakerSeasons, extractThemeId, normalizeFifaAddictSeasonOption, toLocalCardThemePath } from './server/src/services/fifaAddictCardBackgroundCollector.js'; console.log(typeof discoverFifaAddictSquadmakerSeasons, extractThemeId('player-card card-theme-865'), normalizeFifaAddictSeasonOption({ value: '865' }).seasonCode, toLocalCardThemePath('865'));"
```

Expected: output includes `function 865 865 /fco/card-themes/card-theme-865.png`.

---

### Task 3: Reconcile collector output with app seasons in the CLI script

**Files:**
- Modify: `server/scripts/collectFifaAddictCardBackgrounds.js`
- Modify: `server/src/services/fifaAddictCardBackgroundCollector.js` only if `getActiveSeasons` needs to be exported instead of duplicated.

**Interfaces:**
- Consumes: `collectFifaAddictCardBackgrounds({ headless?: boolean, limit?: number }): Promise<{ total: number, fifaAddictSeasons: Array, records: Array }>`.
- Consumes: `buildLocalCardThemeEntries(records)` and `reconcileCardThemeCoverage(input)` from `client/src/fco/cardThemeRegistryTools.js`.
- Produces: JSON artifact with `total`, `fifaAddictSeasons`, and `records`.
- Produces: coverage markdown artifact with reconciliation sections.
- Produces: registry snippet artifact for `LOCAL_CARD_THEMES`.

- [ ] **Step 1: Import the new reconciliation helper**

In `server/scripts/collectFifaAddictCardBackgrounds.js`, replace the existing helper import:

```js
import { buildLocalCardThemeEntries, formatCollectionCoverage, formatLocalCardThemeEntries } from '../../client/src/fco/cardThemeRegistryTools.js';
```

with:

```js
import {
  buildLocalCardThemeEntries,
  formatCollectionCoverage,
  formatLocalCardThemeEntries,
  reconcileCardThemeCoverage,
} from '../../client/src/fco/cardThemeRegistryTools.js';
```

- [ ] **Step 2: Load app seasons for report-only reconciliation**

In `server/scripts/collectFifaAddictCardBackgrounds.js`, add this import near the existing imports:

```js
import FifaAddictSeason from '../src/models/FifaAddictSeason.js';
```

Add this helper before `main()`:

```js
async function getReportAppSeasons() {
  return FifaAddictSeason.find({ isActive: true }).sort({ value: 1 }).lean();
}
```

This reads app season metadata only for coverage reporting. It must not call or modify any `/admin/data-ops` API.

- [ ] **Step 3: Generate reconciled coverage**

In `main()`, replace:

```js
const result = await collectFifaAddictCardBackgrounds({ headless: !headed, limit });
const built = buildLocalCardThemeEntries(result.records);
const coverage = formatCollectionCoverage({
  total: result.total,
  entries: built.entries,
  sharedThemes: built.sharedThemes,
  unresolved: built.unresolved,
});
const snippet = formatLocalCardThemeEntries(built.entries);
```

with:

```js
const result = await collectFifaAddictCardBackgrounds({ headless: !headed, limit });
const appSeasons = await getReportAppSeasons();
const built = buildLocalCardThemeEntries(result.records);
const reconciledCoverage = reconcileCardThemeCoverage({
  fifaAddictSeasons: result.fifaAddictSeasons,
  records: result.records,
  appSeasons,
  entries: built.entries,
  sharedThemes: built.sharedThemes,
  unresolved: built.unresolved,
});
const coverage = formatCollectionCoverage(reconciledCoverage);
const snippet = formatLocalCardThemeEntries(built.entries);
```

- [ ] **Step 4: Update completion logging**

In `main()`, replace:

```js
console.log(`Mapped ${Object.keys(built.entries).length}/${result.total} app seasons.`);
```

with:

```js
console.log(`Discovered ${result.total} FIFAAddict squadmaker seasons.`);
console.log(`Mapped ${Object.keys(built.entries).length} FIFAAddict season backgrounds to local assets.`);
console.log(`Matched ${reconciledCoverage.summary.appMappedSeasons}/${reconciledCoverage.summary.appSeasons} app seasons to local assets.`);
```

- [ ] **Step 5: Verify missing database config still fails cleanly**

Run:

```bash
rtk node server/scripts/collectFifaAddictCardBackgrounds.js --limit=1
```

Expected if no DB env var is configured: FAIL with `Set MONGODB_URI or MONGO_URI before running the collector.`

Expected if DB env var is configured: the script launches Playwright and attempts a one-season collection.

- [ ] **Step 6: Run helper tests after CLI changes**

Run:

```bash
rtk npm --prefix client test -- src/fco/cardThemeRegistryTools.test.js
```

Expected: PASS.

---

### Task 4: Run FIFAAddict background collection and update `LOCAL_CARD_THEMES`

**Files:**
- Modify: `client/src/fco/cardThemes.js`
- Read generated: `docs/superpowers/plans/2026-07-04-fifaaddict-card-background-registry-snippet.txt`
- Read generated: `docs/superpowers/plans/2026-07-04-fifaaddict-card-background-coverage.md`
- Generated assets: `client/public/fco/card-themes/card-theme-*.png`

**Interfaces:**
- Consumes: generated registry snippet lines shaped as `'SEASON': { themeId, className, backgroundImage }`.
- Produces: expanded `LOCAL_CARD_THEMES` in `client/src/fco/cardThemes.js`.
- Produces: local PNG files served from `/fco/card-themes/`.

- [ ] **Step 1: Run a limited headed collection first**

Run:

```bash
rtk node server/scripts/collectFifaAddictCardBackgrounds.js --limit=3 --headed
```

Expected: Browser opens, collector discovers FIFAAddict squadmaker season options, attempts three seasons, writes JSON/markdown/snippet files, and downloads any rendered theme PNGs.

If the run maps zero seasons, inspect `docs/superpowers/plans/2026-07-04-fifaaddict-card-background-collection.json` and update only FIFAAddict DOM selectors inside `discoverFifaAddictSquadmakerSeasons`, `selectRepresentativePlayer`, or `readRenderedCard` before continuing.

- [ ] **Step 2: Run full collection**

Run:

```bash
rtk node server/scripts/collectFifaAddictCardBackgrounds.js
```

Expected: Script downloads one PNG per unique rendered theme and writes coverage plus registry snippet. Unresolved seasons are acceptable only when the coverage report gives a concrete reason.

- [ ] **Step 3: Inspect generated coverage**

Read `docs/superpowers/plans/2026-07-04-fifaaddict-card-background-coverage.md`.

Expected: It contains these sections:

```markdown
## Summary
## FIFAAddict local assets
## Shared downloaded themes
## App seasons mapped to local assets
## App seasons not found in FIFAAddict query
## FIFAAddict seasons not matched to app seasons
## Unresolved FIFAAddict seasons
```

- [ ] **Step 4: Inspect generated registry snippet**

Read `docs/superpowers/plans/2026-07-04-fifaaddict-card-background-registry-snippet.txt`.

Expected snippet shape:

```js
  '865': {
    themeId: '865',
    className: 'card-theme-865',
    backgroundImage: '/fco/card-themes/card-theme-865.png',
  },
```

- [ ] **Step 5: Insert generated entries into `LOCAL_CARD_THEMES`**

Modify `client/src/fco/cardThemes.js` so `LOCAL_CARD_THEMES` includes generated entries. Keep `NG` and any existing hand-authored entries unless an identical generated season key replaces them.

Resulting shape must remain:

```js
const LOCAL_CARD_THEMES = {
  NG: {
    themeId: 'ng',
    className: 'card-theme-ng',
    backgroundImage: '/fco/card-themes/card-theme-ng.svg',
  },
  '865': {
    themeId: '865',
    className: 'card-theme-865',
    backgroundImage: '/fco/card-themes/card-theme-865.png',
  },
};
```

- [ ] **Step 6: Run card theme tests**

Run:

```bash
rtk npm --prefix client test -- src/fco/cardThemes.test.js src/fco/cardThemeRegistryTools.test.js
```

Expected: PASS.

- [ ] **Step 7: Run client build**

Run:

```bash
rtk npm --prefix client run build
```

Expected: PASS.

---

### Task 5: Verify the app uses local background assets without affecting data-ops

**Files:**
- Modify if verification exposes missing mapping: `client/src/fco/cardThemes.js`
- Modify if coverage needs regenerated output: `docs/superpowers/plans/2026-07-04-fifaaddict-card-background-coverage.md`

**Interfaces:**
- Consumes: updated `getCardThemeForPlayer(playerOrSeason)` from `client/src/fco/cardThemes.js`.
- Produces: verified local background loading in `/doi-hinh`.
- Confirms: `/admin/data-ops` "Scrape Seasons" UI/API behavior was not changed by this work.

- [ ] **Step 1: Run automated checks before browser verification**

Run:

```bash
rtk npm --prefix client test -- src/fco/cardThemes.test.js src/fco/cardThemeRegistryTools.test.js && rtk npm --prefix client run lint && rtk npm --prefix client run build
```

Expected: PASS.

- [ ] **Step 2: Start the app**

Run:

```bash
rtk npm --prefix client run dev
```

Expected: Vite starts and prints a local URL, usually `http://localhost:5173/`.

- [ ] **Step 3: Open `/doi-hinh` and verify local card backgrounds**

Use the browser app to open `http://localhost:5173/doi-hinh` and add at least three players whose `season` values are covered by generated `LOCAL_CARD_THEMES` entries.

Expected: each filled card renders with `player-card has-player fc-card card-theme-*` and an `img.card-bg-img.fc-bg` element.

- [ ] **Step 4: Verify image URLs are local**

Inspect each rendered `img.card-bg-img.fc-bg[src]`.

Expected: `src` begins with the local app origin and path `/fco/card-themes/card-theme-`.

- [ ] **Step 5: Verify data-ops screen still shows Scrape Seasons without code changes**

Open `http://localhost:5173/admin/data-ops`.

Expected: The existing card with this copy is still present and unchanged by this work:

```text
Scrape Seasons
```

Do not click the button unless the user explicitly asks to run that admin action.

- [ ] **Step 6: Verify unresolved seasons are documented**

Read `docs/superpowers/plans/2026-07-04-fifaaddict-card-background-coverage.md`.

Expected: every unresolved season has one of these concrete reasons:

```text
season filter not found
no representative player
missing rendered theme class
missing card background image
download failed <status>
```

- [ ] **Step 7: Fix any missed registry entries and rerun checks**

If a player from a supposedly cloned season still falls back, update the key in `LOCAL_CARD_THEMES` to match the normalized frontend `player.season` value and rerun:

```bash
rtk npm --prefix client test -- src/fco/cardThemes.test.js src/fco/cardThemeRegistryTools.test.js && rtk npm --prefix client run build
```

Expected: PASS and the browser card loads a local background.

---

## Self-review notes

- Spec coverage: Task 2 changes source of truth to FIFAAddict squadmaker UI; Task 4 downloads local PNGs and updates `LOCAL_CARD_THEMES`; Task 1 and Task 3 produce coverage/reconcile report; Task 5 verifies local assets and explicitly checks that data-ops was not changed.
- Placeholder scan: no `TBD`, `TODO`, `implement later`, or vague "add tests" steps remain. Code steps include concrete snippets, and command steps include expected outcomes.
- Type consistency: collector returns `total`, `fifaAddictSeasons`, and `records`; registry helpers consume `records`, `entries`, `sharedThemes`, `unresolved`, and `appSeasons`; coverage formatter consumes either raw reconciliation input or the reconciled coverage object.
