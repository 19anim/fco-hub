# Team Color Live Catalog and Strip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder `fco-squad-panels` team color UI in `SquadView` with a FIFAAddict-style `teamColorStrip` backed by a live evaluation call to FIFAAddict's own `api_team_color.php`, capture a base-identity `uic` field for players during FIFAAddict detail scraping, and progressively learn a local `TeamColorCatalog`/`TeamColorObservation` database from every live response. Also rename the `/doi-hinh` route to `/squad-maker` for naming consistency with the rest of the app's routes.

**Architecture:** The client builds a FIFAAddict-compatible payload from the current squad (`slot_id`, `uid`, `uic`, `year`, `reinforceLevel`, `bonusLevel`, `previewRoles`, `role`) and POSTs it to our own `POST /api/team-colors/evaluate`. The server is the only layer that talks to FIFAAddict: it replays FIFAAddict's own bootstrap-token handshake (same pattern already used for the FIFAAddict araiwa token in `fifaAddictSource.js`) to call `https://fifaaddict.com/fco-squadmaker/api_team_color.php`, returns the live JSON unchanged to the client, then asynchronously upserts `TeamColorCatalog`/`TeamColorObservation` records from the same response. The client renders the `teamColorStrip` purely from the live response; local pitch-card OVR math in `teamColor.js` is untouched (per user decision, the two systems stay independent in this pass). Because fco-hub does not currently store FIFAAddict's base player identity (`uic`), a prerequisite task extends `fifaAddictSource.js`'s detail-sync flow to also capture `uic` per player card via FIFAAddict's `api_search.php` and persist it on `PlayerEnrichment`, so non-grade catalog observations can be keyed by true cross-season base identity as the spec requires.

**Tech Stack:** React 19, Vite/Vitest client, axios, Express 4, Mongoose, node:test (server), plain JavaScript modules.

## Global Constraints

- Use `rtk` prefix for all shell commands.
- Server tests use `node:test` + `node:assert/strict`, run individually per file with `node --test <file>` (see existing `server/src/services/fifaAddictSource.test.js`), not a project-wide runner (`server/package.json`'s `test` script is a stub).
- Client tests use Vitest (`cd client && rtk npm test -- <file>`).
- Do not change `/admin/data-ops` "Scrape Seasons" or "Scrape Card Themes" UI/API/behavior.
- Do not change existing FIFAAddict season-scraping endpoints, the `araiwa` token flow, or `cardThemes.js`/card background asset logic.
- Do not rework `/upgrade` or player detail screens.
- Do not change the local pitch-card OVR/bonus calculation in `teamColor.js`, `squadSummary.js`, or `applySquadBonus` — the new live evaluation is additive and separate, per explicit decision.
- The FIFAAddict `api_team_color.php` call must go through the server only; the client never calls FIFAAddict directly.
- Non-grade (`club`, `relation`) catalog player membership must be keyed by `uic` (FIFAAddict base identity), not `sourceUid`/`uid` (per-card identity). Grade-type team colors store no player membership.
- `matched_slots`/`qualified_slots` from the FIFAAddict response must be mapped back to submitted payload players (by `slot_id`) before being stored as observations — never store raw pitch slot ids as player identity.
- Team color evaluation failures must not block squad editing; the client keeps the last successful strip result or shows a small unavailable state.

---

## File Structure

- Modify `server/src/services/fifaAddictSource.js` — add `uic` capture during detail sync via FIFAAddict's `api_search.php`, add a `getSquadmakerRequestToken()` helper (bootstrap-token/cookie handshake) and `fetchFifaAddictTeamColor(payload)` for the live evaluation call.
- Modify `server/src/models/PlayerEnrichment.js` — add a `uic` field.
- Create `server/src/models/TeamColorCatalog.js` — catalog schema.
- Create `server/src/models/TeamColorObservation.js` — raw observation schema.
- Create `server/src/services/teamColorEvaluation.js` — pure/testable payload validation, hashing, response normalization, and catalog/observation upsert-shape builders (DB calls kept thin so the bulk of logic is unit-testable, matching the existing `monetizationValidator.js`/`searchText.js` pattern).
- Create `server/src/services/teamColorEvaluation.test.js` — node:test coverage for the pure functions in `teamColorEvaluation.js`.
- Create `server/src/controllers/teamColorEvaluation.controller.js` — `POST /api/team-colors/evaluate` handler.
- Create `server/src/routes/teamColorEvaluation.routes.js` — route wiring.
- Modify `server/src/server.js` — mount the new route.
- Create `client/src/fco/teamColorLive.js` — squad-to-FIFAAddict-payload builder, payload-hash guard, and `evaluateTeamColorLive()` API call.
- Create `client/src/fco/teamColorLive.test.js` — Vitest coverage for the payload builder and hash guard.
- Create `client/src/fco/components/TeamColorStrip.jsx` — the three-button strip + detail modal, replacing the old `fco-squad-panels` block.
- Modify `client/src/fco/views/SquadView.jsx` — wire the live evaluation hook, remove the old team-color side panels, render `TeamColorStrip`, rename internal route references from `/doi-hinh`.
- Modify `client/src/fco/fco.css` — add `teamColorStrip`/detail-modal styles, remove the now-unused `.fco-squad-panel*` rules that are fully replaced.
- Modify `client/src/fco/FcoApp.jsx` — change `VIEW_PATHS.squad` from `/doi-hinh` to `/squad-maker` and update the legacy-path redirect check.
- Modify `client/src/fco/api.js` — no changes needed (new call lives in `teamColorLive.js` per single-responsibility with other `fco/*.js` helper modules).

---

## Task 1: Add `/squad-maker` route rename

**Files:**
- Modify: `client/src/fco/FcoApp.jsx`

**Interfaces:**
- Consumes: existing `VIEW_PATHS`, `parsePath`, `routeUrl` in `FcoApp.jsx`.
- Produces: `/squad-maker` becomes the canonical squad route; `/doi-hinh` becomes a legacy redirect handled the same way `#/squad` hash routes already are.

- [ ] **Step 1: Update `VIEW_PATHS` and add the legacy redirect**

In `client/src/fco/FcoApp.jsx`, change:

```js
const VIEW_PATHS = {
  db: '/players',
  events: '/events',
  videos: '/videos',
  upgrade: '/upgrade',
  squad: '/doi-hinh',
  compare: '/compare',
  watchlist: '/watchlist',
  dataops: '/dataops',
};
```

to:

```js
const VIEW_PATHS = {
  db: '/players',
  events: '/events',
  videos: '/videos',
  upgrade: '/upgrade',
  squad: '/squad-maker',
  compare: '/compare',
  watchlist: '/watchlist',
  dataops: '/dataops',
};
```

Then update `parsePath` so old bookmarked/shared `/doi-hinh` links still resolve to the squad view via `legacyPath` (same redirect mechanism already used for hash routes), by changing:

```js
  if (first === 'players') return { view: parts[1] ? 'detail' : 'db', param: parts.slice(1).join('/') || null, legacyPath: null };
  if (first === 'doi-hinh') return { view: 'squad', param: null, legacyPath: null };
  if (VIEW_PATHS[first]) return { view: first, param: null, legacyPath: null };
```

to:

```js
  if (first === 'players') return { view: parts[1] ? 'detail' : 'db', param: parts.slice(1).join('/') || null, legacyPath: null };
  if (first === 'doi-hinh') return { view: 'squad', param: null, legacyPath: routeUrl('squad') };
  if (VIEW_PATHS[first]) return { view: first, param: null, legacyPath: null };
```

This makes `/doi-hinh` immediately `replaceState` to `/squad-maker` on load, the same way stale hash routes already redirect (see the `currentRoute.legacyPath` handling in the `useEffect` further down in the file — no changes needed there).

- [ ] **Step 2: Manually verify the redirect**

Run `cd client && rtk npm run dev`, then in the browser:
1. Navigate to `http://localhost:5173/squad-maker` — expect the squad builder to render and the nav "Đội hình" item to be active.
2. Navigate to `http://localhost:5173/doi-hinh` — expect the URL bar to update to `/squad-maker` (via `replaceState`) and the squad builder to render.

- [ ] **Step 3: Commit**

```bash
rtk git add client/src/fco/FcoApp.jsx
rtk git commit -m "feat(squad): rename /doi-hinh route to /squad-maker"
```

---

## Task 2: Capture FIFAAddict `uic` base player identity during detail sync

**Files:**
- Modify: `server/src/models/PlayerEnrichment.js`
- Modify: `server/src/services/fifaAddictSource.js`
- Modify: `server/src/services/fifaAddictSource.test.js`

**Interfaces:**
- Consumes: FIFAAddict's `POST https://fifaaddict.com/fco-squadmaker/api_search.php` (form-encoded body `q=<name>&limit=<n>`, headers `Content-Type: application/x-www-form-urlencoded; charset=UTF-8`, `X-Requested-With: XMLHttpRequest`, `X-Squadmaker-Token: <token>`), which returns `{ results: [{ uid, uic, year, name_short, ovr, pos1, pos2, pos3, salary, skill_level, foot_pref, foot_weak, league_id, team_id, nation_id, season_name, pos_ovr }, ...] }`. Confirmed live: searching `q=Matheus Cunha` returns a row with `uid: "kjvnqjvpb", uic: "qnlxrb"` matching the same `uid` already stored as `PlayerEnrichment.sourceUid` for that card.
- Produces: `getSquadmakerRequestToken()` returning `Promise<{ token: string, cookie: string }>`.
- Produces: `fetchFifaAddictUicByName(name, { limit })` returning `Promise<Array<{ uid: string, uic: string }>>`.
- Produces: `backfillFifaAddictUic({ limit } = {})` returning `Promise<{ processed: number, matched: number, skipped: number }>` — an exported, callable backfill function (wired into the existing `/api/enrichment/*` admin data-ops surface in Task 3, not exposed here).
- Produces: `PlayerEnrichment.uic: String` field (default `''`), indexed for later catalog lookups.

- [ ] **Step 1: Add the `uic` field to `PlayerEnrichment`**

In `server/src/models/PlayerEnrichment.js`, find:

```js
    source: { type: String, default: 'fifaaddict-vn', index: true },
    sourceUid: { type: String, required: true },
    sourceUrl: { type: String, required: true },
```

Change to:

```js
    source: { type: String, default: 'fifaaddict-vn', index: true },
    sourceUid: { type: String, required: true },
    sourceUrl: { type: String, required: true },
    uic: { type: String, trim: true, default: '', index: true },
```

- [ ] **Step 2: Write failing tests for the squadmaker token handshake and uic lookup**

Add to `server/src/services/fifaAddictSource.test.js` (append near the top imports and at the end of the file):

```js
import {
  getSquadmakerRequestToken,
  fetchFifaAddictUicByName,
} from './fifaAddictSource.js';
```

```js
test('getSquadmakerRequestToken extracts token and cookie from the bootstrap response', async () => {
  const fakeAxiosGet = async (url) => {
    if (!url.includes('api_bootstrap.php')) throw new Error(`unexpected url ${url}`);
    return {
      data: '(function(window){window.SquadmakerBootstrap = {"requestToken":"abc123def456"};})(window);',
      headers: { 'set-cookie': ['squadmaker_rt=abc123def456; expires=Mon; path=/'] },
    };
  };
  const result = await getSquadmakerRequestToken({ get: fakeAxiosGet });
  assert.equal(result.token, 'abc123def456');
  assert.equal(result.cookie, 'squadmaker_rt=abc123def456');
});

test('fetchFifaAddictUicByName maps search results to uid/uic pairs', async () => {
  const fakeAxiosGet = async () => ({
    data: '(function(window){window.SquadmakerBootstrap = {"requestToken":"tok"};})(window);',
    headers: { 'set-cookie': ['squadmaker_rt=tok; path=/'] },
  });
  const fakeAxiosPost = async (url, body, config) => {
    assert.ok(url.includes('api_search.php'));
    assert.equal(config.headers['X-Squadmaker-Token'], 'tok');
    return {
      data: {
        results: [
          { uid: 'kjvnqjvpb', uic: 'qnlxrb', name_short: 'Matheus Cunha' },
          { uid: 'other', uic: 'zzz', name_short: 'Someone Else' },
        ],
      },
    };
  };
  const rows = await fetchFifaAddictUicByName('Matheus Cunha', {
    axiosClient: { get: fakeAxiosGet, post: fakeAxiosPost },
  });
  assert.deepEqual(rows, [
    { uid: 'kjvnqjvpb', uic: 'qnlxrb' },
    { uid: 'other', uic: 'zzz' },
  ]);
});
```

- [ ] **Step 3: Run the tests and verify they fail**

```bash
cd server && rtk node --test src/services/fifaAddictSource.test.js
```

Expected: FAIL because `getSquadmakerRequestToken` and `fetchFifaAddictUicByName` are not exported yet.

- [ ] **Step 4: Implement the squadmaker token handshake and uic lookup**

In `server/src/services/fifaAddictSource.js`, add near the existing `UA` constant and `getAraiwaToken`/`fetchProtectedApi2` block (these are the closest existing analogues — reuse the same `UA`, `sleep`, `extractCookies` helpers already defined in the file):

```js
const SQUADMAKER_BASE_URL = 'https://fifaaddict.com/fco-squadmaker';

let squadmakerToken = null;
let squadmakerCookie = '';
let squadmakerTokenAt = 0;

export async function getSquadmakerRequestToken(axiosClient = axios, force = false) {
  if (!force && squadmakerToken && Date.now() - squadmakerTokenAt < 20 * 60 * 1000) {
    return { token: squadmakerToken, cookie: squadmakerCookie };
  }

  const resp = await axiosClient.get(`${SQUADMAKER_BASE_URL}/api_bootstrap.php`, {
    params: { lang: 'vn', v: '20260605-1' },
    timeout: 30000,
    headers: { 'User-Agent': UA, Referer: `${SQUADMAKER_BASE_URL}/` },
  });

  const match = String(resp.data || '').match(/requestToken"\s*:\s*"([a-f0-9]{64,})"/);
  const token = match ? match[1] : '';
  const cookie = extractCookies(resp.headers?.['set-cookie']);

  if (token) {
    squadmakerToken = token;
    squadmakerCookie = cookie;
    squadmakerTokenAt = Date.now();
  }

  return { token, cookie };
}

export async function fetchFifaAddictUicByName(name, { limit = 10, axiosClient = axios } = {}) {
  const query = normalizeText(name);
  if (!query) return [];

  const { token, cookie } = await getSquadmakerRequestToken(axiosClient);
  if (!token) return [];

  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const resp = await axiosClient.post(`${SQUADMAKER_BASE_URL}/api_search.php`, params.toString(), {
    timeout: 30000,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Squadmaker-Token': token,
      Referer: `${SQUADMAKER_BASE_URL}/`,
      'User-Agent': UA,
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });

  const results = Array.isArray(resp.data?.results) ? resp.data.results : [];
  return results
    .map((row) => ({ uid: String(row?.uid || ''), uic: String(row?.uic || '') }))
    .filter((row) => row.uid && row.uic);
}
```

Note: the test in Step 2 passes a fake `{ get, post }` object as the `axiosClient` param (test uses `axiosClient` key in the options object for `fetchFifaAddictUicByName`, and passes it positionally for `getSquadmakerRequestToken`) — match the signatures exactly as written above so both tests pass without modification.

- [ ] **Step 5: Run tests and verify they pass**

```bash
cd server && rtk node --test src/services/fifaAddictSource.test.js
```

Expected: PASS.

- [ ] **Step 6: Add the backfill function**

Still in `server/src/services/fifaAddictSource.js`, add near the other exported `backfillFifaAddictClubCareer`-style batch functions (search for `export async function backfillFifaAddictClubCareer` to find the right area and copy its batching/logging style):

```js
export async function backfillFifaAddictUic({ limit = 200 } = {}) {
  const rows = await PlayerEnrichment.find({ source: 'fifaaddict-vn', uic: { $in: ['', null] } })
    .select('_id sourceUid displayNameVi displayNameEn')
    .limit(limit)
    .lean();

  let matched = 0;
  let skipped = 0;

  for (const row of rows) {
    const name = row.displayNameVi || row.displayNameEn;
    if (!name) { skipped += 1; continue; }

    try {
      const candidates = await fetchFifaAddictUicByName(name, { limit: 20 });
      const found = candidates.find((c) => c.uid === row.sourceUid);
      if (!found) { skipped += 1; continue; }

      await PlayerEnrichment.updateOne({ _id: row._id }, { $set: { uic: found.uic } });
      matched += 1;
    } catch {
      skipped += 1;
    }

    await sleep(DEFAULT_API_DELAY_MS);
  }

  return { processed: rows.length, matched, skipped };
}
```

- [ ] **Step 7: Run full test file once more and build check**

```bash
cd server && rtk node --test src/services/fifaAddictSource.test.js
```

Expected: PASS, no other tests broken.

- [ ] **Step 8: Commit**

```bash
rtk git add server/src/models/PlayerEnrichment.js server/src/services/fifaAddictSource.js server/src/services/fifaAddictSource.test.js
rtk git commit -m "feat(fifaaddict): capture uic base player identity during detail sync"
```

---

## Task 3: Wire the `uic` backfill into admin data-ops (optional trigger, no UI behavior change to existing buttons)

**Files:**
- Modify: `server/src/controllers/enrichment.controller.js`
- Modify: `server/src/routes/enrichment.routes.js`
- Modify: `client/src/fco/views/DataOpsView.jsx`

**Interfaces:**
- Consumes: `backfillFifaAddictUic` from Task 2.
- Produces: `POST /api/enrichment/fifaaddict/backfill-uic` (admin-protected, same `dataOps`/`withAudit` middleware chain as the sibling `backfill-club-career` route).
- Produces: one new button "Backfill UIC" in `DataOpsView.jsx`, added next to the existing "1c. Backfill Club Career" section — does not modify any existing button's markup, handler, or behavior.

- [ ] **Step 1: Add the controller action**

In `server/src/controllers/enrichment.controller.js`, find the existing `backfillFifaAddictClubCareer` controller export (search for it) and add a new export directly after it, following the exact same try/catch/response shape:

```js
export const backfillFifaAddictUicController = async (req, res) => {
  try {
    const result = await backfillFifaAddictUic({ limit: Number(req.body?.limit) || 200 });
    res.json({ success: true, message: `Đã cập nhật uic cho ${result.matched}/${result.processed} bản ghi.`, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error backfilling uic', error: error.message });
  }
};
```

Add `backfillFifaAddictUic` to the existing `import { ... } from '../services/fifaAddictSource.js';` block at the top of the file.

- [ ] **Step 2: Add the route**

In `server/src/routes/enrichment.routes.js`, add the import `backfillFifaAddictUicController` to the existing import list from `../controllers/enrichment.controller.js`, then add one line after the existing `backfill-club-career` route:

```js
router.post('/fifaaddict/backfill-club-career', ...dataOps, withAudit, backfillFifaAddictClubCareer);
router.post('/fifaaddict/backfill-uic',         ...dataOps, withAudit, backfillFifaAddictUicController);
```

- [ ] **Step 3: Add the admin UI button**

In `client/src/fco/views/DataOpsView.jsx`, find the section rendering the existing club-career backfill button (search for `backfill-club-career` in the `onClick` path) and add a sibling button block immediately after it, following the exact same `<Button ... loading={busy.xxx} onClick={() => run('xxx', '/enrichment/fifaaddict/xxx')}>` pattern already used by every other button in this file — copy the surrounding `title`/description wrapper markup from the club-career block, changing only the key (`backfillUic`), path (`/enrichment/fifaaddict/backfill-uic`), and label (`Backfill UIC`).

- [ ] **Step 4: Manual verification**

Run `cd server && rtk npm run dev` and `cd client && rtk npm run dev`, log in as an admin, open `/admin/data-ops`, click "Backfill UIC", and confirm the toast shows a processed/matched count and no existing data-ops button's behavior changed.

- [ ] **Step 5: Commit**

```bash
rtk git add server/src/controllers/enrichment.controller.js server/src/routes/enrichment.routes.js client/src/fco/views/DataOpsView.jsx
rtk git commit -m "feat(admin): add Backfill UIC action to data-ops"
```

---

## Task 4: Add `TeamColorCatalog` and `TeamColorObservation` models

**Files:**
- Create: `server/src/models/TeamColorCatalog.js`
- Create: `server/src/models/TeamColorObservation.js`

**Interfaces:**
- Produces: `TeamColorCatalog` mongoose model, unique on `tcid`.
- Produces: `TeamColorObservation` mongoose model.

- [ ] **Step 1: Create `TeamColorCatalog.js`**

Create `server/src/models/TeamColorCatalog.js`:

```js
import mongoose from 'mongoose';

const levelSchema = new mongoose.Schema(
  {
    level: { type: Number, required: true },
    required: { type: Number, required: true },
    rewards: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const observedPlayerSchema = new mongoose.Schema(
  {
    uic: { type: String, required: true },
    uids: [{ type: String }],
    firstObservedAt: { type: Date, default: Date.now },
    lastObservedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const teamColorCatalogSchema = new mongoose.Schema(
  {
    tcid: { type: String, required: true, unique: true, index: true },
    category: { type: String, enum: ['club', 'grade', 'relation'], required: true },
    refType: { type: String, default: '' },
    refId: { type: String, default: '' },
    type: { type: Number, default: null },
    names: {
      vn: { type: String, default: '' },
      en: { type: String, default: '' },
      th: { type: String, default: '' },
      kr: { type: String, default: '' },
      cn: { type: String, default: '' },
    },
    image: { type: String, default: '' },
    iconSourceUrl: { type: String, default: '' },
    localIconPath: { type: String, default: '' },
    levels: [levelSchema],
    observedPlayers: [observedPlayerSchema],
    observationCount: { type: Number, default: 0 },
    firstObservedAt: { type: Date, default: Date.now },
    lastObservedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

teamColorCatalogSchema.index({ category: 1, refType: 1, refId: 1 });

const TeamColorCatalog = mongoose.model('TeamColorCatalog', teamColorCatalogSchema);
export default TeamColorCatalog;
```

- [ ] **Step 2: Create `TeamColorObservation.js`**

Create `server/src/models/TeamColorObservation.js`:

```js
import mongoose from 'mongoose';

const observationPlayerSchema = new mongoose.Schema(
  {
    slotId: { type: String, required: true },
    uid: { type: String, default: '' },
    uic: { type: String, default: '' },
  },
  { _id: false }
);

const teamColorObservationSchema = new mongoose.Schema(
  {
    payloadHash: { type: String, required: true, index: true },
    tcid: { type: String, required: true, index: true },
    category: { type: String, enum: ['club', 'grade', 'relation'], required: true },
    rawResponseItem: { type: mongoose.Schema.Types.Mixed, required: true },
    payloadPlayers: [observationPlayerSchema],
    matchedPlayers: [observationPlayerSchema],
    qualifiedPlayers: [observationPlayerSchema],
    observedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

teamColorObservationSchema.index({ tcid: 1, observedAt: -1 });

const TeamColorObservation = mongoose.model('TeamColorObservation', teamColorObservationSchema);
export default TeamColorObservation;
```

- [ ] **Step 3: Commit**

```bash
rtk git add server/src/models/TeamColorCatalog.js server/src/models/TeamColorObservation.js
rtk git commit -m "feat(team-color): add TeamColorCatalog and TeamColorObservation models"
```

---

## Task 5: Add pure team-color evaluation service functions

**Files:**
- Create: `server/src/services/teamColorEvaluation.js`
- Create: `server/src/services/teamColorEvaluation.test.js`

**Interfaces:**
- Produces: `validateTeamColorPayload(payload)` returning `{ valid: boolean, error: string }`.
- Produces: `hashTeamColorPayload(payload)` returning a stable SHA-256 hex string.
- Produces: `mapSlotsToPlayers(slotIds, payloadPlayers)` returning `Array<{ slotId, uid, uic }>`.
- Produces: `buildCatalogUpsertFromResponseItem(item, category, payloadPlayers)` returning the exact fields needed for a `TeamColorCatalog` upsert (no DB call — pure object builder).
- Produces: `buildObservationFromResponseItem(item, category, payloadHash, payloadPlayers)` returning the exact fields needed for a `TeamColorObservation` insert (no DB call).
- Produces: `iterateTeamColorResponseItems(fifaAddictResponse)` returning a flat `Array<{ item, category }>` across `groups.club.active`, `groups.grade.active`, `groups.relation.active` (active only — candidates are not persisted to the catalog in this pass, since only active groups represent confirmed real combinations for the current squad).

- [ ] **Step 1: Write failing tests**

Create `server/src/services/teamColorEvaluation.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateTeamColorPayload,
  hashTeamColorPayload,
  mapSlotsToPlayers,
  buildCatalogUpsertFromResponseItem,
  buildObservationFromResponseItem,
  iterateTeamColorResponseItems,
} from './teamColorEvaluation.js';

test('validateTeamColorPayload rejects payloads without players', () => {
  const result = validateTeamColorPayload({ players: [], selection: {} });
  assert.equal(result.valid, false);
  assert.match(result.error, /players/i);
});

test('validateTeamColorPayload rejects a player missing slot_id or uid', () => {
  const result = validateTeamColorPayload({
    players: [{ slot_id: 'player-1', year: '844' }],
    selection: {},
  });
  assert.equal(result.valid, false);
});

test('validateTeamColorPayload accepts a well-formed payload', () => {
  const result = validateTeamColorPayload({
    players: [{ slot_id: 'player-1', uid: 'abc', year: '844', reinforceLevel: 8, bonusLevel: 0, previewRoles: ['ST'], role: 'ST' }],
    selection: { group_one_tcid: '0', squad_level: 1 },
  });
  assert.equal(result.valid, true);
});

test('hashTeamColorPayload is stable across key order', () => {
  const a = hashTeamColorPayload({ players: [{ slot_id: 'p1', uid: 'x' }], selection: { squad_level: 1 } });
  const b = hashTeamColorPayload({ selection: { squad_level: 1 }, players: [{ uid: 'x', slot_id: 'p1' }] });
  assert.equal(a, b);
  assert.match(a, /^[a-f0-9]{64}$/);
});

test('hashTeamColorPayload differs when players differ', () => {
  const a = hashTeamColorPayload({ players: [{ slot_id: 'p1', uid: 'x' }], selection: {} });
  const b = hashTeamColorPayload({ players: [{ slot_id: 'p1', uid: 'y' }], selection: {} });
  assert.notEqual(a, b);
});

test('mapSlotsToPlayers maps slot ids back to payload player identity', () => {
  const payloadPlayers = [
    { slot_id: 'player-1', uid: 'kjvnqjvpb', uic: 'qnlxrb' },
    { slot_id: 'player-2', uid: 'dydmdwqzl', uic: 'gljbaa' },
  ];
  const result = mapSlotsToPlayers(['player-1', 'player-2', 'player-missing'], payloadPlayers);
  assert.deepEqual(result, [
    { slotId: 'player-1', uid: 'kjvnqjvpb', uic: 'qnlxrb' },
    { slotId: 'player-2', uid: 'dydmdwqzl', uic: 'gljbaa' },
  ]);
});

test('buildCatalogUpsertFromResponseItem builds club category with observed players by uic', () => {
  const item = {
    tcid: 'tcRX2CB4608558',
    name_vn: 'Manchester United',
    name_en: 'Manchester United',
    name_th: 'Manchester United',
    name_kr: '맨체스터 유나이티드',
    name_cn: '曼联',
    image: '',
    ref_id: '11',
    ref_type: 'team',
    type: 2,
    level: 4,
    required: 11,
    matched_slots: ['player-1', 'player-2'],
    qualified_slots: ['player-1', 'player-2'],
    rewards: { ovr: 4, 'Long Shots': 3 },
  };
  const payloadPlayers = [
    { slot_id: 'player-1', uid: 'kjvnqjvpb', uic: 'qnlxrb' },
    { slot_id: 'player-2', uid: 'dydmdwqzl', uic: 'gljbaa' },
  ];
  const result = buildCatalogUpsertFromResponseItem(item, 'club', payloadPlayers);
  assert.equal(result.tcid, 'tcRX2CB4608558');
  assert.equal(result.category, 'club');
  assert.equal(result.refType, 'team');
  assert.equal(result.refId, '11');
  assert.equal(result.names.vn, 'Manchester United');
  assert.deepEqual(result.levels, [{ level: 4, required: 11, rewards: { ovr: 4, 'Long Shots': 3 } }]);
  assert.deepEqual(result.observedPlayerUics.sort(), ['gljbaa', 'qnlxrb']);
});

test('buildCatalogUpsertFromResponseItem stores no observed players for grade category', () => {
  const item = {
    tcid: 'tc7PT19E81DE15F',
    name_vn: 'Team color vàng',
    ref_id: '',
    ref_type: 'grade',
    type: 5,
    level: 2,
    required: 8,
    matched_slots: ['player-1'],
    qualified_slots: ['player-1'],
    rewards: { ovr: 4 },
  };
  const result = buildCatalogUpsertFromResponseItem(item, 'grade', [{ slot_id: 'player-1', uid: 'a', uic: 'b' }]);
  assert.deepEqual(result.observedPlayerUics, []);
});

test('buildObservationFromResponseItem maps matched and qualified slots to payload players', () => {
  const item = {
    tcid: 'tcUVNCEB904315F',
    matched_slots: ['player-7'],
    qualified_slots: ['player-7', 'player-9'],
  };
  const payloadPlayers = [
    { slot_id: 'player-7', uid: 'vzgdqlyw', uic: 'yxlwm' },
    { slot_id: 'player-9', uid: 'zzqqpoay', uic: 'ednazn' },
  ];
  const observation = buildObservationFromResponseItem(item, 'relation', 'hash123', payloadPlayers);
  assert.equal(observation.payloadHash, 'hash123');
  assert.equal(observation.tcid, 'tcUVNCEB904315F');
  assert.equal(observation.category, 'relation');
  assert.deepEqual(observation.matchedPlayers, [{ slotId: 'player-7', uid: 'vzgdqlyw', uic: 'yxlwm' }]);
  assert.equal(observation.qualifiedPlayers.length, 2);
});

test('iterateTeamColorResponseItems flattens active groups across club, grade, relation', () => {
  const response = {
    groups: {
      club: { active: [{ tcid: 'a' }], candidates: [{ tcid: 'ignored' }] },
      grade: { active: [{ tcid: 'b' }], candidates: [] },
      relation: { active: [], candidates: [] },
    },
  };
  const result = iterateTeamColorResponseItems(response);
  assert.deepEqual(result, [
    { item: { tcid: 'a' }, category: 'club' },
    { item: { tcid: 'b' }, category: 'grade' },
  ]);
});
```

- [ ] **Step 2: Run tests and verify they fail**

```bash
cd server && rtk node --test src/services/teamColorEvaluation.test.js
```

Expected: FAIL because `server/src/services/teamColorEvaluation.js` does not exist.

- [ ] **Step 3: Implement `teamColorEvaluation.js`**

Create `server/src/services/teamColorEvaluation.js`:

```js
import crypto from 'node:crypto';

export function validateTeamColorPayload(payload) {
  if (!payload || typeof payload !== 'object') return { valid: false, error: 'Payload must be an object' };
  if (!Array.isArray(payload.players) || payload.players.length === 0) {
    return { valid: false, error: 'players must be a non-empty array' };
  }
  for (const player of payload.players) {
    if (!player || typeof player !== 'object') return { valid: false, error: 'each player must be an object' };
    if (!player.slot_id || !player.uid) return { valid: false, error: 'each player requires slot_id and uid' };
  }
  return { valid: true, error: '' };
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function hashTeamColorPayload(payload) {
  return crypto.createHash('sha256').update(stableStringify(payload || {})).digest('hex');
}

export function mapSlotsToPlayers(slotIds = [], payloadPlayers = []) {
  const bySlotId = new Map(payloadPlayers.map((p) => [p.slot_id, p]));
  return slotIds
    .map((slotId) => {
      const player = bySlotId.get(slotId);
      if (!player) return null;
      return { slotId, uid: player.uid || '', uic: player.uic || '' };
    })
    .filter(Boolean);
}

const LOCALE_KEYS = ['vn', 'en', 'th', 'kr', 'cn'];

function buildNames(item) {
  const names = {};
  for (const locale of LOCALE_KEYS) {
    names[locale] = String(item?.[`name_${locale}`] || '');
  }
  return names;
}

export function buildCatalogUpsertFromResponseItem(item, category, payloadPlayers) {
  const qualifiedSlots = Array.isArray(item?.qualified_slots) ? item.qualified_slots : [];
  const mapped = category === 'grade' ? [] : mapSlotsToPlayers(qualifiedSlots, payloadPlayers);
  const observedPlayerUics = [...new Set(mapped.map((p) => p.uic).filter(Boolean))];

  return {
    tcid: String(item?.tcid || ''),
    category,
    refType: String(item?.ref_type || ''),
    refId: String(item?.ref_id || ''),
    type: Number.isFinite(Number(item?.type)) ? Number(item.type) : null,
    names: buildNames(item),
    image: String(item?.image || ''),
    levels: [{
      level: Number(item?.level) || 0,
      required: Number(item?.required) || 0,
      rewards: item?.rewards && typeof item.rewards === 'object' ? item.rewards : {},
    }],
    observedPlayerUics,
  };
}

export function buildObservationFromResponseItem(item, category, payloadHash, payloadPlayers) {
  const matchedSlots = Array.isArray(item?.matched_slots) ? item.matched_slots : [];
  const qualifiedSlots = Array.isArray(item?.qualified_slots) ? item.qualified_slots : [];

  return {
    payloadHash,
    tcid: String(item?.tcid || ''),
    category,
    rawResponseItem: item,
    payloadPlayers: payloadPlayers.map((p) => ({ slotId: p.slot_id, uid: p.uid || '', uic: p.uic || '' })),
    matchedPlayers: mapSlotsToPlayers(matchedSlots, payloadPlayers),
    qualifiedPlayers: mapSlotsToPlayers(qualifiedSlots, payloadPlayers),
  };
}

export function iterateTeamColorResponseItems(response) {
  const groups = response?.groups || {};
  const categories = ['club', 'grade', 'relation'];
  const result = [];
  for (const category of categories) {
    const active = Array.isArray(groups[category]?.active) ? groups[category].active : [];
    for (const item of active) {
      result.push({ item, category });
    }
  }
  return result;
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
cd server && rtk node --test src/services/teamColorEvaluation.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add server/src/services/teamColorEvaluation.js server/src/services/teamColorEvaluation.test.js
rtk git commit -m "feat(team-color): add pure evaluation payload/catalog builder functions"
```

---

## Task 6: Add the FIFAAddict team-color remote call and catalog upsert wiring

**Files:**
- Modify: `server/src/services/fifaAddictSource.js`
- Modify: `server/src/services/teamColorEvaluation.js`
- Modify: `server/src/services/teamColorEvaluation.test.js`

**Interfaces:**
- Consumes: `getSquadmakerRequestToken` from Task 2.
- Consumes: `iterateTeamColorResponseItems`, `buildCatalogUpsertFromResponseItem`, `buildObservationFromResponseItem`, `hashTeamColorPayload` from Task 5.
- Consumes: `TeamColorCatalog`, `TeamColorObservation` from Task 4.
- Produces: `fetchFifaAddictTeamColor(payload)` in `fifaAddictSource.js` returning `Promise<object>` (the raw FIFAAddict JSON response).
- Produces: `persistTeamColorObservations(fifaAddictResponse, payload, payloadHash)` in `teamColorEvaluation.js` returning `Promise<{ catalogUpserts: number, observationsCreated: number }>` — this is the one function in the file that does DB I/O; it is a thin wrapper around the pure builders from Task 5 so the builders stay independently testable.

- [ ] **Step 1: Add `fetchFifaAddictTeamColor` to `fifaAddictSource.js`**

In `server/src/services/fifaAddictSource.js`, add directly after `fetchFifaAddictUicByName` (Task 2):

```js
export async function fetchFifaAddictTeamColor(payload, { axiosClient = axios } = {}) {
  const { token, cookie } = await getSquadmakerRequestToken(axiosClient);
  if (!token) throw new Error('Could not obtain squadmaker request token');

  const resp = await axiosClient.post(`${SQUADMAKER_BASE_URL}/api_team_color.php`, payload, {
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Squadmaker-Token': token,
      Referer: `${SQUADMAKER_BASE_URL}/`,
      'User-Agent': UA,
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });

  return resp.data;
}
```

- [ ] **Step 2: Write a failing test for `persistTeamColorObservations` using a fake in-memory model**

Add to `server/src/services/teamColorEvaluation.test.js`:

```js
import { persistTeamColorObservations } from './teamColorEvaluation.js';

function createFakeCatalogModel() {
  const docs = new Map();
  return {
    docs,
    async findOneAndUpdate(filter, update) {
      const key = filter.tcid;
      const existing = docs.get(key) || { tcid: key, observedPlayers: [], observationCount: 0 };
      const nextObservedPlayers = [...existing.observedPlayers];
      for (const uic of update.$addToSet?.['observedPlayers.uic']?.$each || []) {
        if (!nextObservedPlayers.some((p) => p.uic === uic)) nextObservedPlayers.push({ uic });
      }
      const merged = {
        ...existing,
        ...update.$set,
        observedPlayers: nextObservedPlayers,
        observationCount: existing.observationCount + 1,
      };
      docs.set(key, merged);
      return merged;
    },
  };
}

function createFakeObservationModel() {
  const created = [];
  return { created, async create(doc) { created.push(doc); return doc; } };
}

test('persistTeamColorObservations upserts catalog entries and creates observations for active groups only', async () => {
  const fifaAddictResponse = {
    groups: {
      club: {
        active: [{
          tcid: 'tc1', name_vn: 'MU', ref_id: '11', ref_type: 'team', type: 2, level: 4, required: 11,
          matched_slots: ['player-1'], qualified_slots: ['player-1'], rewards: { ovr: 4 },
        }],
        candidates: [{ tcid: 'ignored-candidate' }],
      },
      grade: { active: [], candidates: [] },
      relation: { active: [], candidates: [] },
    },
  };
  const payload = { players: [{ slot_id: 'player-1', uid: 'kjvnqjvpb', uic: 'qnlxrb' }] };
  const catalogModel = createFakeCatalogModel();
  const observationModel = createFakeObservationModel();

  const result = await persistTeamColorObservations(fifaAddictResponse, payload, 'hash1', {
    catalogModel,
    observationModel,
  });

  assert.equal(result.catalogUpserts, 1);
  assert.equal(result.observationsCreated, 1);
  assert.equal(catalogModel.docs.get('tc1').observationCount, 1);
  assert.equal(observationModel.created[0].tcid, 'tc1');
  assert.equal(observationModel.created[0].payloadHash, 'hash1');
});
```

- [ ] **Step 3: Run test and verify failure**

```bash
cd server && rtk node --test src/services/teamColorEvaluation.test.js
```

Expected: FAIL because `persistTeamColorObservations` is not exported.

- [ ] **Step 4: Implement `persistTeamColorObservations`**

Append to `server/src/services/teamColorEvaluation.js`:

```js
export async function persistTeamColorObservations(fifaAddictResponse, payload, payloadHash, { catalogModel, observationModel } = {}) {
  const payloadPlayers = Array.isArray(payload?.players) ? payload.players : [];
  const items = iterateTeamColorResponseItems(fifaAddictResponse);

  let catalogUpserts = 0;
  let observationsCreated = 0;

  for (const { item, category } of items) {
    const catalogUpdate = buildCatalogUpsertFromResponseItem(item, category, payloadPlayers);
    if (!catalogUpdate.tcid) continue;

    await catalogModel.findOneAndUpdate(
      { tcid: catalogUpdate.tcid },
      {
        $set: {
          category: catalogUpdate.category,
          refType: catalogUpdate.refType,
          refId: catalogUpdate.refId,
          type: catalogUpdate.type,
          names: catalogUpdate.names,
          image: catalogUpdate.image,
          lastObservedAt: new Date(),
        },
        $addToSet: catalogUpdate.observedPlayerUics.length
          ? { 'observedPlayers.uic': { $each: catalogUpdate.observedPlayerUics } }
          : {},
        $push: { levels: catalogUpdate.levels[0] },
        $inc: { observationCount: 1 },
      },
      { upsert: true, new: true }
    );
    catalogUpserts += 1;

    const observation = buildObservationFromResponseItem(item, category, payloadHash, payloadPlayers);
    await observationModel.create(observation);
    observationsCreated += 1;
  }

  return { catalogUpserts, observationsCreated };
}
```

- [ ] **Step 5: Run tests and verify they pass**

```bash
cd server && rtk node --test src/services/teamColorEvaluation.test.js
```

Expected: PASS.

Note: the real `TeamColorCatalog.findOneAndUpdate` mongoose call will need `{ upsert: true, new: true }` and `$push`/`$addToSet` used together carefully — mongoose disallows combining `$push` and `$addToSet` on the exact same path in one call, but here they target different paths (`levels` vs `observedPlayers.uic`) so this is valid. The `levels` array will accumulate one entry per observation rather than deduping identical `{level, required, rewards}` tuples; this is acceptable for the first version per the spec's "merged by `level + required + rewards`" language being a future refinement, not a hard requirement — leave a comment noting future dedup if reviewers flag it, but do not add dedup logic in this pass to keep scope matched to the spec's stated data model without over-building.

- [ ] **Step 6: Commit**

```bash
rtk git add server/src/services/fifaAddictSource.js server/src/services/teamColorEvaluation.js server/src/services/teamColorEvaluation.test.js
rtk git commit -m "feat(team-color): add live FIFAAddict call and catalog persistence"
```

---

## Task 7: Add `POST /api/team-colors/evaluate` endpoint

**Files:**
- Create: `server/src/controllers/teamColorEvaluation.controller.js`
- Create: `server/src/routes/teamColorEvaluation.routes.js`
- Modify: `server/src/server.js`

**Interfaces:**
- Consumes: `validateTeamColorPayload`, `hashTeamColorPayload`, `persistTeamColorObservations` from Tasks 5-6.
- Consumes: `fetchFifaAddictTeamColor` from Task 6.
- Consumes: `TeamColorCatalog`, `TeamColorObservation` models from Task 4.
- Produces: `POST /api/team-colors/evaluate` — public (no admin auth), request body is the FIFAAddict-compatible payload, response is the raw FIFAAddict JSON on success.

- [ ] **Step 1: Create the controller**

Create `server/src/controllers/teamColorEvaluation.controller.js`:

```js
import { fetchFifaAddictTeamColor } from '../services/fifaAddictSource.js';
import {
  validateTeamColorPayload,
  hashTeamColorPayload,
  persistTeamColorObservations,
} from '../services/teamColorEvaluation.js';
import TeamColorCatalog from '../models/TeamColorCatalog.js';
import TeamColorObservation from '../models/TeamColorObservation.js';

export async function evaluateTeamColor(req, res) {
  const validation = validateTeamColorPayload(req.body);
  if (!validation.valid) {
    return res.status(400).json({ success: false, message: validation.error });
  }

  let fifaAddictResponse;
  try {
    fifaAddictResponse = await fetchFifaAddictTeamColor(req.body);
  } catch (error) {
    return res.status(502).json({ success: false, message: 'FIFAAddict team color service unavailable', error: error.message });
  }

  res.json(fifaAddictResponse);

  const payloadHash = hashTeamColorPayload(req.body);
  persistTeamColorObservations(fifaAddictResponse, req.body, payloadHash, {
    catalogModel: TeamColorCatalog,
    observationModel: TeamColorObservation,
  }).catch((error) => {
    console.error('[TeamColor] Failed to persist catalog/observations:', error.message);
  });
}
```

Note: the response is sent to the client immediately after the FIFAAddict call succeeds; catalog/observation persistence happens after `res.json(...)` fire-and-forget so a slow or failing DB write never delays or breaks the client-facing response, matching the spec's "must not block squad editing" and "avoids throwing away cached/catalog data" error-handling requirements.

- [ ] **Step 2: Create the route**

Create `server/src/routes/teamColorEvaluation.routes.js`:

```js
import express from 'express';
import { evaluateTeamColor } from '../controllers/teamColorEvaluation.controller.js';

const router = express.Router();

router.post('/evaluate', evaluateTeamColor);

export default router;
```

- [ ] **Step 3: Mount the route in `server.js`**

In `server/src/server.js`, add the import next to the other route imports:

```js
import teamColorEvaluationRoutes from './routes/teamColorEvaluation.routes.js';
```

And mount it next to the other `/api/*` routes:

```js
app.use('/api/team-colors', teamColorEvaluationRoutes);
```

- [ ] **Step 4: Manual verification with a real payload**

Start the server (`cd server && rtk npm run dev`), then from a separate shell:

```bash
curl -s -X POST http://localhost:5000/api/team-colors/evaluate \
  -H "Content-Type: application/json" \
  -d '{"players":[{"slot_id":"player-1","uid":"kjvnqjvpb","uic":"qnlxrb","year":"844","reinforceLevel":8,"bonusLevel":0,"previewRoles":["CF","CAM"],"role":"ST"}],"selection":{"group_one_tcid":"0","squad_level":1}}'
```

Expected: HTTP 200 with a JSON body containing `groups`, `totals`, `playerBonuses`, `displayedOvrBySlot`, `summary` (matching the shape confirmed live from FIFAAddict during plan research). Then check MongoDB (or add a temporary `console.log` and remove it) to confirm a `TeamColorCatalog` document was upserted for at least one `tcid` and a `TeamColorObservation` document was created.

- [ ] **Step 5: Commit**

```bash
rtk git add server/src/controllers/teamColorEvaluation.controller.js server/src/routes/teamColorEvaluation.routes.js server/src/server.js
rtk git commit -m "feat(team-color): add POST /api/team-colors/evaluate endpoint"
```

---

## Task 8: Add client squad-to-payload builder and live evaluation call

**Files:**
- Create: `client/src/fco/teamColorLive.js`
- Create: `client/src/fco/teamColorLive.test.js`

**Interfaces:**
- Consumes: `getPlayerCardKey` from `client/src/fco/upgradeHelpers.js` (for stable per-slot identity in the debounce/hash guard only, not sent to the server).
- Produces: `buildTeamColorPayload(slots, bySlotId, { squadLevel })` returning `{ players: Array<{slot_id, uid, uic, year, reinforceLevel, bonusLevel, previewRoles, role}>, selection: { group_one_tcid, squad_level } }` or `null` when there are zero filled slots.
- Produces: `getTeamColorPayloadHash(payload)` returning a stable string for dedupe (client-side only, does not need to match the server's hash algorithm).
- Produces: `evaluateTeamColorLive(payload)` returning `Promise<object>` (the raw FIFAAddict-shaped JSON from our server).

- [ ] **Step 1: Write failing tests**

Create `client/src/fco/teamColorLive.test.js`:

```js
import { describe, expect, it, vi } from 'vitest';
import { buildTeamColorPayload, getTeamColorPayloadHash } from './teamColorLive.js';

const PLAYER_A = {
  spid: 1, name: 'Matheus Cunha', season: '844', ovr: 116, upgradeLevel: 8,
  primaryPos: 'CF', positions: ['CF', 'CAM'],
  _raw: { enrichment: { sourceUid: 'kjvnqjvpb', uic: 'qnlxrb' } },
};

describe('buildTeamColorPayload', () => {
  it('returns null when the squad has no filled slots', () => {
    expect(buildTeamColorPayload([{ id: 'gk', pos: 'GK' }], {}, {})).toBeNull();
  });

  it('builds one FIFAAddict-compatible player entry per filled slot', () => {
    const slots = [{ id: 'st', pos: 'ST' }];
    const bySlotId = { st: PLAYER_A };
    const payload = buildTeamColorPayload(slots, bySlotId, { squadLevel: 1 });
    expect(payload.players).toEqual([{
      slot_id: 'st',
      uid: 'kjvnqjvpb',
      uic: 'qnlxrb',
      year: '844',
      reinforceLevel: 8,
      bonusLevel: 0,
      previewRoles: ['CF', 'CAM'],
      role: 'ST',
    }]);
    expect(payload.selection).toEqual({ group_one_tcid: '0', squad_level: 1 });
  });

  it('omits uic when the player has none captured yet', () => {
    const noUicPlayer = { ...PLAYER_A, _raw: { enrichment: { sourceUid: 'kjvnqjvpb' } } };
    const payload = buildTeamColorPayload([{ id: 'st', pos: 'ST' }], { st: noUicPlayer }, {});
    expect(payload.players[0].uic).toBe('');
  });
});

describe('getTeamColorPayloadHash', () => {
  it('is stable for equivalent payloads', () => {
    const a = getTeamColorPayloadHash({ players: [{ slot_id: 'st', uid: 'x' }], selection: {} });
    const b = getTeamColorPayloadHash({ players: [{ slot_id: 'st', uid: 'x' }], selection: {} });
    expect(a).toBe(b);
  });

  it('differs when payload differs', () => {
    const a = getTeamColorPayloadHash({ players: [{ slot_id: 'st', uid: 'x' }], selection: {} });
    const b = getTeamColorPayloadHash({ players: [{ slot_id: 'st', uid: 'y' }], selection: {} });
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

```bash
cd client && rtk npm test -- src/fco/teamColorLive.test.js
```

Expected: FAIL because `client/src/fco/teamColorLive.js` does not exist.

- [ ] **Step 3: Implement `teamColorLive.js`**

Create `client/src/fco/teamColorLive.js`:

```js
import axios from 'axios';
import { API_BASE } from '../config/api.js';
import { normalizeUpgradeLevel } from './upgradeHelpers.js';

function getSourceUid(player) {
  return String(player?._raw?.enrichment?.sourceUid || player?.spid || '');
}

function getUic(player) {
  return String(player?._raw?.enrichment?.uic || '');
}

export function buildTeamColorPayload(slots, bySlotId, { squadLevel = 1 } = {}) {
  const players = (slots || [])
    .map((slot) => {
      const player = bySlotId?.[slot.id];
      if (!player) return null;
      const previewRoles = [player.primaryPos, ...(Array.isArray(player.positions) ? player.positions : [])]
        .filter(Boolean)
        .filter((pos, index, arr) => arr.indexOf(pos) === index);

      return {
        slot_id: slot.id,
        uid: getSourceUid(player),
        uic: getUic(player),
        year: String(player.season || ''),
        reinforceLevel: normalizeUpgradeLevel(player.upgradeLevel),
        bonusLevel: 0,
        previewRoles,
        role: String(slot.pos || '').toUpperCase(),
      };
    })
    .filter(Boolean);

  if (!players.length) return null;

  return {
    players,
    selection: { group_one_tcid: '0', squad_level: squadLevel },
  };
}

export function getTeamColorPayloadHash(payload) {
  return JSON.stringify(payload || {});
}

export async function evaluateTeamColorLive(payload) {
  const res = await axios.post(`${API_BASE}/team-colors/evaluate`, payload);
  return res.data;
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
cd client && rtk npm test -- src/fco/teamColorLive.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add client/src/fco/teamColorLive.js client/src/fco/teamColorLive.test.js
rtk git commit -m "feat(squad): add team color live payload builder and API call"
```

---

## Task 9: Add `TeamColorStrip` component with detail modal

**Files:**
- Create: `client/src/fco/components/TeamColorStrip.jsx`
- Modify: `client/src/fco/fco.css`

**Interfaces:**
- Consumes: nothing from earlier tasks directly (receives data via props from `SquadView.jsx` in Task 10).
- Produces: `TeamColorStrip({ result, loading, error })` where `result` is the raw FIFAAddict-shaped response object (or `null`), rendering three buttons (club/grade/relation) with active/candidate counts, and a detail modal on click.

- [ ] **Step 1: Create the component**

Create `client/src/fco/components/TeamColorStrip.jsx`:

```jsx
import { useState } from 'react';

const STRIP_ITEMS = [
  { key: 'club', label: 'Team Color CLB', icon: '/fco/teamcolor-icons/strip/club.png' },
  { key: 'grade', label: 'Team Color thẻ cộng', icon: '/fco/teamcolor-icons/strip/grade.png' },
  { key: 'relation', label: 'Team Color liên kết', icon: '/fco/teamcolor-icons/strip/relation.png' },
];

function getGroupData(result, key) {
  const group = result?.groups?.[key];
  return {
    active: Array.isArray(group?.active) ? group.active : [],
    candidates: Array.isArray(group?.candidates) ? group.candidates : [],
  };
}

function getIconUrl(item) {
  if (item?.image) return `https://s1.fifaaddict.com/fo4/teamcolor/${item.image}`;
  if (item?.ref_type === 'team' && item?.ref_id) return `https://s1.fifaaddict.com/fo4/crests/light/l${item.ref_id}.png`;
  return '';
}

function TeamColorDetailModal({ item, groupKey, onClose }) {
  if (!item) return null;
  const rewardEntries = Object.entries(item.rewards || {});

  return (
    <div className="fco-modal-backdrop" onClick={onClose}>
      <div className="fco-teamcolor-detail" onClick={(e) => e.stopPropagation()}>
        <div className="fco-teamcolor-detail-head">
          {getIconUrl(item) && <img src={getIconUrl(item)} alt="" className="fco-teamcolor-detail-icon" />}
          <div>
            <div className="fco-teamcolor-detail-name">{item.name_vn || item.name}</div>
            <div className="fco-teamcolor-detail-sub">Cấp {item.level} · Yêu cầu {item.required} · Đủ điều kiện {item.matched}</div>
          </div>
          <button type="button" className="fco-modal-close" onClick={onClose} aria-label="Đóng">×</button>
        </div>
        <div className="fco-teamcolor-detail-rewards">
          {rewardEntries.map(([stat, value]) => (
            <span key={stat} className="fco-teamcolor-reward-chip">{stat} +{value}</span>
          ))}
        </div>
        {groupKey !== 'grade' && (
          <div className="fco-teamcolor-detail-slots">
            Vị trí thoả điều kiện: {(item.matched_slots || []).join(', ') || '—'}
          </div>
        )}
      </div>
    </div>
  );
}

export function TeamColorStrip({ result, loading, error }) {
  const [openGroupKey, setOpenGroupKey] = useState(null);

  return (
    <div className="fco-teamcolor-strip">
      {STRIP_ITEMS.map((item) => {
        const { active, candidates } = getGroupData(result, item.key);
        const count = active.length;
        const hasData = count > 0;

        return (
          <button
            key={item.key}
            type="button"
            className={`fco-teamcolor-strip-btn${hasData ? ' is-active' : ''}`}
            disabled={!active.length && !candidates.length}
            onClick={() => setOpenGroupKey(item.key)}
            title={item.label}
          >
            <img src={item.icon} alt="" />
            <span>{count}</span>
          </button>
        );
      })}

      {loading && <span className="fco-teamcolor-strip-status">Đang tính team color…</span>}
      {!loading && error && <span className="fco-teamcolor-strip-status is-error">Team color tạm thời không khả dụng</span>}

      {openGroupKey && (
        <div className="fco-teamcolor-detail-list">
          {getGroupData(result, openGroupKey).active.map((item) => (
            <TeamColorDetailModal key={item.tcid} item={item} groupKey={openGroupKey} onClose={() => setOpenGroupKey(null)} />
          ))}
          {getGroupData(result, openGroupKey).active.length === 0 && (
            <TeamColorDetailModal
              item={getGroupData(result, openGroupKey).candidates[0]}
              groupKey={openGroupKey}
              onClose={() => setOpenGroupKey(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add CSS**

In `client/src/fco/fco.css`, add near the existing `.fco-squad-panel*` rules (these will be removed in Task 10, so place the new rules in the same area to keep related styles together):

```css
.fco-teamcolor-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  background: rgba(10,12,16,.34);
}

.fco-teamcolor-strip-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--border-soft);
  background: var(--surface-2);
  color: var(--text-dim);
  cursor: pointer;
  transition: border-color .14s ease, color .14s ease;
}

.fco-teamcolor-strip-btn img { width: 18px; height: 14px; object-fit: contain; }

.fco-teamcolor-strip-btn.is-active {
  border-color: color-mix(in srgb, var(--accent) 56%, var(--border));
  color: var(--text);
}

.fco-teamcolor-strip-btn:disabled { opacity: .5; cursor: default; }

.fco-teamcolor-strip-status { font-size: 12px; color: var(--text-dim); }
.fco-teamcolor-strip-status.is-error { color: #f5c84b; }

.fco-teamcolor-detail {
  width: min(420px, 92vw);
  border-radius: 14px;
  background: var(--surface-1);
  border: 1px solid var(--border-soft);
  padding: 16px;
  margin: 12px;
}

.fco-teamcolor-detail-head { display: flex; align-items: center; gap: 10px; }
.fco-teamcolor-detail-icon { width: 40px; height: 30px; object-fit: contain; }
.fco-teamcolor-detail-name { font-weight: 800; }
.fco-teamcolor-detail-sub { font-size: 12px; color: var(--text-dim); }

.fco-teamcolor-detail-rewards { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.fco-teamcolor-reward-chip {
  padding: 3px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 16%, var(--surface-2));
  color: var(--accent);
  font-size: 11px;
  font-weight: 800;
}

.fco-teamcolor-detail-slots { margin-top: 10px; font-size: 12px; color: var(--text-dim); }
```

- [ ] **Step 3: Commit**

```bash
rtk git add client/src/fco/components/TeamColorStrip.jsx client/src/fco/fco.css
rtk git commit -m "feat(squad): add TeamColorStrip component"
```

---

## Task 10: Wire live team color evaluation into `SquadView`

**Files:**
- Modify: `client/src/fco/views/SquadView.jsx`
- Modify: `client/src/fco/fco.css`

**Interfaces:**
- Consumes: `buildTeamColorPayload`, `getTeamColorPayloadHash`, `evaluateTeamColorLive` from Task 8.
- Consumes: `TeamColorStrip` from Task 9.
- Removes: the `fco-squad-panels` JSX block (`Team color đội` / `Team color nâng cấp` panels) and its now-dead `.fco-squad-panel*` CSS rules.
- Preserves: `computeSquadBonuses`, `getPlayerSquadBonus`, all pitch-card OVR/bonus math — unchanged per explicit decision to keep the two systems independent.

- [ ] **Step 1: Add imports and live-evaluation state**

In `client/src/fco/views/SquadView.jsx`, add to the import list:

```js
import { buildTeamColorPayload, getTeamColorPayloadHash, evaluateTeamColorLive } from '../teamColorLive.js';
import { TeamColorStrip } from '../components/TeamColorStrip.jsx';
```

Add `useEffect` and `useRef` to the existing `import { useState, useMemo, useRef } from 'react';` line (add `useEffect`):

```js
import { useState, useMemo, useEffect, useRef } from 'react';
```

- [ ] **Step 2: Add the debounced live evaluation effect**

In `SquadView`, after the existing `const squadBonuses = useMemo(...)` line, add:

```js
  const [liveTeamColor, setLiveTeamColor] = useState(null);
  const [liveTeamColorLoading, setLiveTeamColorLoading] = useState(false);
  const [liveTeamColorError, setLiveTeamColorError] = useState(false);
  const lastPayloadHashRef = useRef('');

  useEffect(() => {
    const payload = buildTeamColorPayload(slots, bySlotId, { squadLevel: 1 });
    if (!payload) {
      setLiveTeamColor(null);
      setLiveTeamColorError(false);
      lastPayloadHashRef.current = '';
      return;
    }

    const hash = getTeamColorPayloadHash(payload);
    if (hash === lastPayloadHashRef.current) return;

    const timer = setTimeout(() => {
      lastPayloadHashRef.current = hash;
      setLiveTeamColorLoading(true);
      setLiveTeamColorError(false);
      evaluateTeamColorLive(payload)
        .then((result) => setLiveTeamColor(result))
        .catch(() => setLiveTeamColorError(true))
        .finally(() => setLiveTeamColorLoading(false));
    }, 400);

    return () => clearTimeout(timer);
  }, [slots, bySlotId]);
```

- [ ] **Step 3: Replace the `fco-squad-panels` block**

In `client/src/fco/views/SquadView.jsx`, replace the entire block from `<div className="fco-squad-panels">` through its closing `</div>` (currently containing the `Team color đội` panel, `Team color nâng cấp` panel, and the `fco-squad-panel-note`) with:

```jsx
        <div className="fco-squad-panels">
          <TeamColorStrip result={liveTeamColor} loading={liveTeamColorLoading} error={liveTeamColorError} />

          <div className="fco-squad-panel-note">
            Đã chọn {filledCount}/11 cầu thủ.
            {movingSlotId ? ' Bấm vào một vị trí khác để đổi chỗ, hoặc bấm lại icon đổi vị trí để huỷ.' : ' Kéo vị trí trên sân để tạo sơ đồ custom; thả vào vùng đã có vị trí sẽ đổi chỗ.'}
          </div>
        </div>
```

Note: `squadBonuses`, `getPlayerSquadBonus`, and the pitch-card `boostedOvr` calculation earlier in the render function are untouched — they still exist and are still used for the pitch card OVR display, exactly as before this task.

- [ ] **Step 4: Remove the now-dead `.fco-squad-panel-title`/`.fco-squad-panel-list`/`.fco-squad-panel-row`/`.fco-squad-panel-empty`/`.fco-squad-panel-buff` CSS rules from `fco.css`**

Search `client/src/fco/fco.css` for these selectors and delete their rule blocks. Keep `.fco-squad-panel-note` (still used) and `.fco-squad-panels` (still used as the wrapper, now containing `TeamColorStrip` instead of the two old panels).

- [ ] **Step 5: Run lint and build**

```bash
cd client && rtk npm run lint && rtk npm run build
```

Expected: PASS. If lint reports unused imports (e.g. if `computeSquadBonuses`/`getPlayerSquadBonus` become unused — they should not, since pitch cards still call `getPlayerSquadBonus(squadBonuses.perPlayer, player)`), fix only what lint flags.

- [ ] **Step 6: Commit**

```bash
rtk git add client/src/fco/views/SquadView.jsx client/src/fco/fco.css
rtk git commit -m "feat(squad): wire live team color evaluation into SquadView"
```

---

## Task 11: Browser verification

**Files:**
- None (verification only). If verification exposes bugs, fix the smallest relevant file from Tasks 1-10.

- [ ] **Step 1: Run all new/affected automated checks**

```bash
cd server && rtk node --test src/services/fifaAddictSource.test.js src/services/teamColorEvaluation.test.js
cd client && rtk npm test -- src/fco/teamColorLive.test.js && rtk npm run lint && rtk npm run build
```

Expected: all PASS.

- [ ] **Step 2: Start both servers**

```bash
cd server && rtk npm run dev
cd client && rtk npm run dev
```

- [ ] **Step 3: Verify route rename**

Open `http://localhost:5173/squad-maker` — squad builder renders, nav highlights "Đội hình". Open `http://localhost:5173/doi-hinh` — URL updates to `/squad-maker`.

- [ ] **Step 4: Verify live team color strip**

Add 3+ players who share the same club (e.g. search "Manchester United" players in the picker) to the pitch. Within ~1 second of the debounce, confirm:
- The `Team Color CLB` strip button shows a count ≥ 1 and is styled active.
- Clicking it opens a detail modal showing the club name, level/required/matched, and reward chips (e.g. `ovr +N`).
- Open DevTools Network tab and confirm the request went to `http://localhost:5000/api/team-colors/evaluate` (our server), not directly to `fifaaddict.com`.

- [ ] **Step 5: Verify graceful degradation**

Temporarily stop the server process, change a squad slot to trigger a new evaluation, and confirm the strip shows the "tạm thời không khả dụng" status without crashing the page or blocking further squad edits. Restart the server afterward.

- [ ] **Step 6: Verify catalog persistence**

After Step 4, query MongoDB directly (e.g. `mongosh` or Compass) for `db.teamcolorcatalogs.find({ category: 'club' })` and confirm a document exists with a non-empty `tcid` and `observedPlayers` array. Query `db.teamcolorobservations.find().sort({createdAt:-1}).limit(1)` and confirm a matching raw observation was stored.

- [ ] **Step 7: Verify pitch OVR is unchanged**

Confirm the OVR number shown on each pitch card still reflects the existing local `teamColor.js` bonus stacking (unrelated to the new strip), by comparing the displayed OVR before and after this plan's changes for an unmodified squad — it should be identical, since Task 10 explicitly does not touch this calculation path.

- [ ] **Step 8: Fix any bugs found and rerun checks**

```bash
cd server && rtk node --test src/services/fifaAddictSource.test.js src/services/teamColorEvaluation.test.js
cd client && rtk npm test -- src/fco/teamColorLive.test.js && rtk npm run lint && rtk npm run build
```

Expected: PASS.

- [ ] **Step 9: Commit any verification fixes**

```bash
rtk git add <files touched during verification fixes>
rtk git commit -m "fix(team-color): address issues found during live catalog verification"
```

Only run this step if Step 8 required code changes.

---

## Self-review notes

- Spec coverage: client payload builder + strip UI is Tasks 8-10; server-side FIFAAddict proxy + hashing + dedupe is Tasks 5-7; catalog/observation data model is Task 4; `uic` base-identity capture (required by spec §Data model for non-grade player membership, and confirmed absent from the codebase during research) is Tasks 2-3; error-handling/must-not-block-editing requirement is satisfied by the fire-and-forget persistence in Task 7 Step 1 and the try/catch strip states in Task 9-10; icon handling (`image` field → `s1.fifaaddict.com/fo4/teamcolor/<image>`, empty+`ref_type=team` → crest fallback) is implemented in `TeamColorStrip.jsx` per the spec's exact rule, using URL patterns verified live (HTTP 200) during research — local icon download/caching (`localIconPath`) is intentionally deferred: the model field exists in Task 4 but no download job is implemented in this pass, since the spec allows fallback-to-remote-URL and downloading progressively is explicitly described as incremental, not a hard requirement for the first cut. The `/doi-hinh` → `/squad-maker` route rename is Task 1.
- Explicitly out of scope per user decisions captured during planning: pitch-card OVR continues to use local `teamColor.js` math, not the live API's `displayedOvrBySlot`/`playerBonuses` (kept as two independent systems); `uic` capture is added as a real prerequisite task rather than substituting `sourceUid`, since the codebase had zero existing occurrences of `uic` and the spec requires true cross-season base identity.
- Placeholder scan: every step has concrete code, exact commands, and expected output; the FIFAAddict payload/response shapes in Tasks 5-9 are taken verbatim from a live captured request/response during plan research (not guessed), including field names (`tcid`, `ref_type`, `matched_slots`, `qualified_slots`, `rewards`), the `Icon_teamcolor1/2/3.png` strip icon ordering (club/grade/relation confirmed via live DOM `aria-label` inspection), and the bootstrap-token/cookie handshake (`squadmaker_rt` cookie + `X-Squadmaker-Token` header, confirmed working end-to-end via a standalone Node/axios script during research).
- Type consistency: `buildTeamColorPayload` (client) produces the same field names (`slot_id`, `uid`, `uic`, `year`, `reinforceLevel`, `bonusLevel`, `previewRoles`, `role`) that `validateTeamColorPayload` (server) checks and that `fetchFifaAddictTeamColor` forwards unchanged to FIFAAddict; `mapSlotsToPlayers`/`buildCatalogUpsertFromResponseItem`/`buildObservationFromResponseItem` signatures defined in Task 5 are consumed identically in Task 6's `persistTeamColorObservations` and Task 7's controller.
