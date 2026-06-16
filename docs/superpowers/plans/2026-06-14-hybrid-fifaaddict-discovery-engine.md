# Hybrid FIFAAddict Discovery Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a hybrid FIFAAddict discovery job that collects FIFAAddict UID seeds from multiple sources, expands them through `api2`/`dbrelate`, and reports why coverage stops.

**Architecture:** Keep the queue namespace strictly FIFAAddict `sourceUid`; Nexon `pid/spid/name` is only a search source, not directly enqueued. Add a new background endpoint beside existing discovery jobs, using existing `fetchPlayerJson`, `searchFifaAddictCards`, `detailPayloadToEnrichment`, and `upsertEnrichmentRow` helpers. Add detailed `SyncRun` progress fields/messages so we can distinguish seed shortage, queue exhaustion, cap reached, and API failures.

**Tech Stack:** Node.js ES modules, Express, Mongoose, Axios, existing React/Vite Data Ops UI.

---

## File Structure

- Modify `server/src/services/fifaAddictSource.js`
  - Add hybrid discovery runner.
  - Add helper functions for unique Nexon player grouping, seed collection, safe search variants, queue expansion, and progress summaries.
  - Export `isHybridDiscoveryRunning()` and `discoverFifaAddictHybridGraph()`.
- Modify `server/src/controllers/enrichment.controller.js`
  - Import and expose new hybrid discovery controller action.
  - Prevent concurrent discovery jobs.
- Modify `server/src/routes/enrichment.routes.js`
  - Add `POST /api/enrichment/fifaaddict/discover-hybrid`.
- Modify `server/src/services/fifaAddictSource.js:getFifaAddictStatus()`
  - Include `hybridDiscoveryRunning`.
- Modify `client/src/fco/views/DataOpsView.jsx`
  - Add a Data Ops button for Hybrid Discovery MVP.
  - Keep destructive cleanup separate and confirmed.
- Create `server/src/services/fifaAddictDiscoveryDiagnostics.js`
  - Pure helper functions that can be unit-tested without network/DB: normalize names, group unique Nexon players, build search variants, classify stop reason.
- Create `server/src/services/fifaAddictDiscoveryDiagnostics.test.mjs`
  - Node built-in test coverage for pure helpers.

---

### Task 1: Add Pure Discovery Diagnostics Helpers

**Files:**
- Create: `server/src/services/fifaAddictDiscoveryDiagnostics.js`
- Create: `server/src/services/fifaAddictDiscoveryDiagnostics.test.mjs`

- [ ] **Step 1: Create failing tests for helper behavior**

Create `server/src/services/fifaAddictDiscoveryDiagnostics.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeDiscoveryName,
  groupUniqueNexonPlayers,
  buildSearchVariants,
  classifyDiscoveryStop,
} from './fifaAddictDiscoveryDiagnostics.js';

test('normalizeDiscoveryName trims and collapses whitespace', () => {
  assert.equal(normalizeDiscoveryName('  Cristiano   Ronaldo  '), 'Cristiano Ronaldo');
});

test('groupUniqueNexonPlayers groups by pid and keeps names/spids/seasons', () => {
  const rows = [
    { pid: 123, spid: 801000123, seasonId: 801, name: 'A', searchName: 'A' },
    { pid: 123, spid: 802000123, seasonId: 802, name: 'A Alt', searchName: 'A' },
    { pid: 0, spid: 999000777, seasonId: 999, name: 'No PID', searchName: '' },
  ];

  const groups = groupUniqueNexonPlayers(rows);

  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0], {
    key: 'pid:123',
    pid: 123,
    names: ['A', 'A Alt'],
    spids: [801000123, 802000123],
    seasonIds: [801, 802],
  });
  assert.equal(groups[1].key, 'name:no pid');
});

test('buildSearchVariants returns deduped name variants', () => {
  const variants = buildSearchVariants({ names: ['Ronaldo Luís Nazário de Lima', 'Ronaldo'] }, 4);
  assert.deepEqual(variants, ['Ronaldo Luís Nazário de Lima', 'Ronaldo', 'Lima']);
});

test('classifyDiscoveryStop reports queue exhausted before cap reached', () => {
  assert.equal(classifyDiscoveryStop({ queueLength: 0, processed: 1566, maxVisits: 30000 }), 'queue-exhausted');
});

test('classifyDiscoveryStop reports max visits reached when queue remains', () => {
  assert.equal(classifyDiscoveryStop({ queueLength: 10, processed: 30000, maxVisits: 30000 }), 'max-visits-reached');
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
node --test "D:\ReactJS\fco-hub\server\src\services\fifaAddictDiscoveryDiagnostics.test.mjs"
```

Expected: FAIL with module/function not found.

- [ ] **Step 3: Implement pure helper module**

Create `server/src/services/fifaAddictDiscoveryDiagnostics.js`:

```js
export function normalizeDiscoveryName(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function nameKey(value = '') {
  return normalizeDiscoveryName(value).toLowerCase();
}

export function groupUniqueNexonPlayers(players = []) {
  const byKey = new Map();

  for (const player of players) {
    const pid = Number(player.pid) || 0;
    const primaryName = normalizeDiscoveryName(player.searchName || player.name);
    if (!pid && !primaryName) continue;

    const key = pid ? `pid:${pid}` : `name:${nameKey(primaryName)}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        key,
        pid: pid || null,
        names: [],
        spids: [],
        seasonIds: [],
      });
    }

    const group = byKey.get(key);
    for (const candidateName of [player.searchName, player.name]) {
      const clean = normalizeDiscoveryName(candidateName);
      if (clean && !group.names.includes(clean)) group.names.push(clean);
    }

    const spid = Number(player.spid) || 0;
    if (spid && !group.spids.includes(spid)) group.spids.push(spid);

    const seasonId = Number(player.seasonId) || 0;
    if (seasonId && !group.seasonIds.includes(seasonId)) group.seasonIds.push(seasonId);
  }

  return [...byKey.values()];
}

export function buildSearchVariants(group, maxVariants = 3) {
  const variants = [];
  for (const name of group.names || []) {
    const clean = normalizeDiscoveryName(name);
    if (clean && !variants.includes(clean)) variants.push(clean);

    const parts = clean.split(' ').filter(Boolean);
    const last = parts.length > 1 ? parts[parts.length - 1] : '';
    if (last && last.length >= 3 && !variants.includes(last)) variants.push(last);

    if (variants.length >= maxVariants) break;
  }
  return variants.slice(0, maxVariants);
}

export function classifyDiscoveryStop({ queueLength, processed, maxVisits }) {
  if (queueLength > 0 && processed >= maxVisits) return 'max-visits-reached';
  if (queueLength === 0) return 'queue-exhausted';
  return 'stopped';
}
```

- [ ] **Step 4: Run tests to verify pass**

Run:

```powershell
node --test "D:\ReactJS\fco-hub\server\src\services\fifaAddictDiscoveryDiagnostics.test.mjs"
```

Expected: PASS.

---

### Task 2: Implement Hybrid Discovery Service

**Files:**
- Modify: `server/src/services/fifaAddictSource.js`
- Uses: `server/src/services/fifaAddictDiscoveryDiagnostics.js`

- [ ] **Step 1: Import helpers**

At the top of `server/src/services/fifaAddictSource.js`, add after existing imports:

```js
import {
  buildSearchVariants,
  classifyDiscoveryStop,
  groupUniqueNexonPlayers,
} from './fifaAddictDiscoveryDiagnostics.js';
```

- [ ] **Step 2: Add running flag exports**

Near existing `pidDiscoveryRunning`, add:

```js
let hybridDiscoveryRunning = false;

export function isHybridDiscoveryRunning() {
  return hybridDiscoveryRunning;
}
```

- [ ] **Step 3: Add seed enqueue utility inside new service section**

Add this before `getFifaAddictStatus()`:

```js
function addHybridSeed({ uid, source, seeds, queued, queue, meta = {} }) {
  const clean = String(uid || '').trim();
  if (!clean) return false;

  const existing = seeds.get(clean);
  if (existing) {
    existing.sources = [...new Set([...existing.sources, source])];
    existing.meta = { ...existing.meta, ...meta };
  } else {
    seeds.set(clean, { uid: clean, sources: [source], meta });
  }

  if (!queued.has(clean)) {
    queued.add(clean);
    queue.push(clean);
    return true;
  }

  return false;
}
```

- [ ] **Step 4: Add hybrid discovery function**

Add this before `getFifaAddictStatus()`:

```js
export async function discoverFifaAddictHybridGraph({
  includeExistingSeeds = true,
  includeNexonSearchSeeds = true,
  nexonUniqueLimit = 1000,
  searchVariantLimit = 2,
  maxVisits = 10000,
  delayMs = DEFAULT_API_DELAY_MS,
} = {}) {
  if (hybridDiscoveryRunning) throw new Error('Hybrid discovery is already running.');
  hybridDiscoveryRunning = true;

  const run = await SyncRun.create({
    source: 'fifaaddict-vn',
    status: 'running',
    requested: maxVisits,
    message: 'Hybrid discovery: preparing multi-source seeds...',
  });

  const job = (async () => {
    const visited = new Set();
    const queued = new Set();
    const queue = [];
    const seeds = new Map();
    let processed = 0;
    let upserted = 0;
    let failed = 0;
    let searchAttempts = 0;
    let searchHits = 0;
    let searchMisses = 0;
    let relatedFound = 0;
    const errors = [];

    try {
      if (includeExistingSeeds) {
        const existingSeeds = await getExistingFifaAddictSeeds(Math.min(maxVisits, 5000));
        for (const uid of existingSeeds) {
          addHybridSeed({ uid, source: 'existing-enrichment', seeds, queued, queue });
        }
      }

      if (includeNexonSearchSeeds) {
        const nexonPlayers = await Player.find({ isActive: true })
          .select('spid pid name searchName seasonId')
          .limit(Number(nexonUniqueLimit) || 1000)
          .lean();
        const uniquePlayers = groupUniqueNexonPlayers(nexonPlayers);

        await SyncRun.findByIdAndUpdate(run._id, {
          $set: {
            message: `Hybrid discovery: searching ${uniquePlayers.length} unique Nexon players...`,
            processed: 0,
            updated: 0,
          },
        }).catch(() => {});

        for (const group of uniquePlayers) {
          const variants = buildSearchVariants(group, searchVariantLimit);
          let groupHit = false;

          for (const name of variants) {
            try {
              searchAttempts += 1;
              const cards = await searchFifaAddictCards(name);
              if (cards.length) {
                groupHit = true;
                searchHits += 1;
              }
              for (const card of cards) {
                addHybridSeed({
                  uid: card.sourceUid,
                  source: 'nexon-name-search',
                  seeds,
                  queued,
                  queue,
                  meta: { nexonKey: group.key, name },
                });
              }
            } catch (error) {
              if (errors.length < 50) errors.push(`search ${name}: ${error.message}`);
            }
            if (delayMs > 0) await sleep(delayMs);
          }

          if (!groupHit) searchMisses += 1;

          if ((searchAttempts + searchMisses) % 25 === 0) {
            await SyncRun.findByIdAndUpdate(run._id, {
              $set: {
                message: `Hybrid discovery: ${seeds.size} seeds, ${searchAttempts} searches, ${searchMisses} misses`,
                processed,
                updated: upserted,
                failed,
                errors,
              },
            }).catch(() => {});
          }
        }
      }

      await SyncRun.findByIdAndUpdate(run._id, {
        $set: {
          message: `Hybrid discovery: ${queue.length} seeds queued. Expanding FIFAAddict UID graph...`,
          processed,
          updated: upserted,
          failed,
          errors,
        },
      }).catch(() => {});

      while (queue.length && processed < maxVisits) {
        const uid = queue.shift();
        queued.delete(uid);
        if (visited.has(uid)) continue;
        visited.add(uid);

        try {
          const payload = await fetchPlayerJson(uid);
          const enrichment = detailPayloadToEnrichment(payload, uid);
          await upsertEnrichmentRow(enrichment);
          upserted += 1;

          const related = extractRelatedUids(payload);
          relatedFound += related.length;
          for (const relatedUid of related) {
            addHybridSeed({ uid: relatedUid, source: 'fifaaddict-dbrellate', seeds, queued, queue });
          }
        } catch (error) {
          failed += 1;
          if (errors.length < 50) errors.push(`${uid}: ${error.message}`);
        }

        processed += 1;

        if (processed % 10 === 0) {
          await SyncRun.findByIdAndUpdate(run._id, {
            $set: {
              processed,
              updated: upserted,
              failed,
              errors,
              message: `Hybrid discovery: ${processed}/${maxVisits} visited, ${upserted} upserted, ${queue.length} queued, ${seeds.size} seeds, ${relatedFound} related found`,
            },
          }).catch(() => {});
        }

        if (delayMs > 0) await sleep(delayMs);
      }

      const stopReason = classifyDiscoveryStop({ queueLength: queue.length, processed, maxVisits });
      await SyncRun.findByIdAndUpdate(run._id, {
        $set: {
          status: failed === processed && processed > 0 ? 'failed' : 'success',
          finishedAt: new Date(),
          processed,
          updated: upserted,
          failed,
          errors,
          message: `Hybrid discovery done (${stopReason}): ${processed} visited, ${upserted} upserted, ${queue.length} remaining queued, ${seeds.size} seeds, ${searchAttempts} searches, ${searchMisses} search misses`,
        },
      });
    } catch (error) {
      await SyncRun.findByIdAndUpdate(run._id, {
        $set: { status: 'failed', finishedAt: new Date(), message: error.message, errors: [error.message] },
      }).catch(() => {});
    } finally {
      hybridDiscoveryRunning = false;
    }
  })();

  job.catch(() => {});

  return { runId: run._id, message: 'Hybrid discovery started in background. Poll /api/enrichment/status.' };
}
```

- [ ] **Step 5: Update status return**

Inside `getFifaAddictStatus()` return object, add:

```js
hybridDiscoveryRunning,
```

- [ ] **Step 6: Run syntax check**

Run:

```powershell
node --check "D:\ReactJS\fco-hub\server\src\services\fifaAddictSource.js"
```

Expected: no output.

---

### Task 3: Add Controller and Route

**Files:**
- Modify: `server/src/controllers/enrichment.controller.js`
- Modify: `server/src/routes/enrichment.routes.js`

- [ ] **Step 1: Update imports in controller**

In `server/src/controllers/enrichment.controller.js`, add imports from `fifaAddictSource.js`:

```js
isHybridDiscoveryRunning,
discoverFifaAddictHybridGraph,
```

- [ ] **Step 2: Add controller action**

Add after `discoverFifaAddictPids`:

```js
export const discoverFifaAddictHybrid = async (req, res) => {
  try {
    if (isHybridDiscoveryRunning() || isPidDiscoveryRunning() || isDiscoverRunning() || isDiscoverV2Running()) {
      return res.status(409).json({ success: false, message: 'A discovery job is already running. Poll /api/enrichment/status.' });
    }

    const result = await discoverFifaAddictHybridGraph({
      includeExistingSeeds: req.body?.includeExistingSeeds !== false,
      includeNexonSearchSeeds: req.body?.includeNexonSearchSeeds !== false,
      nexonUniqueLimit: req.body?.nexonUniqueLimit || 1000,
      searchVariantLimit: req.body?.searchVariantLimit || 2,
      maxVisits: req.body?.maxVisits || 10000,
      delayMs: req.body?.delayMs || 600,
    });

    res.status(202).json({ success: true, message: result.message, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error starting hybrid discovery', error: error.message });
  }
};
```

- [ ] **Step 3: Update route imports**

In `server/src/routes/enrichment.routes.js`, import:

```js
discoverFifaAddictHybrid,
```

- [ ] **Step 4: Add route**

Add after `/fifaaddict/discover-pids`:

```js
router.post('/fifaaddict/discover-hybrid', requireAdminSync, discoverFifaAddictHybrid);
```

- [ ] **Step 5: Run syntax checks**

Run:

```powershell
node --check "D:\ReactJS\fco-hub\server\src\controllers\enrichment.controller.js"
node --check "D:\ReactJS\fco-hub\server\src\routes\enrichment.routes.js"
```

Expected: no output.

---

### Task 4: Add Data Ops UI Button

**Files:**
- Modify: `client/src/fco/views/DataOpsView.jsx`

- [ ] **Step 1: Add Hybrid Discovery card above PID Fallback**

Insert before the `PID Discovery — fallback mở rộng related` `OpCard`:

```jsx
          <OpCard
            icon={I.Zap} iconColor="#37a0ff"
            title="Hybrid Discovery — unique player seeds"
            sub="Gom seed từ existing FIFAAddict và search unique Nexon players, rồi mở rộng bằng api2/dbrelate. Đây là pipeline thử nghiệm cho coverage tốt hơn."
            meta="MVP an toàn: 1000 unique Nexon players, 2 name variants, maxVisits 10000, delay 600ms. Không xóa DB."
            action={
              <Button variant="secondary" size="lg" icon={I.Zap}
                loading={busy.hybridDiscovery || status?.hybridDiscoveryRunning}
                onClick={() => run('hybridDiscovery', '/enrichment/fifaaddict/discover-hybrid', {
                  includeExistingSeeds: true,
                  includeNexonSearchSeeds: true,
                  nexonUniqueLimit: 1000,
                  searchVariantLimit: 2,
                  maxVisits: 10000,
                  delayMs: 600,
                })}>
                Chạy Hybrid Discovery
              </Button>
            }
          />
```

- [ ] **Step 2: Build client**

Run:

```powershell
npm --prefix "D:\ReactJS\fco-hub\client" run build
```

Expected: Vite build succeeds.

---

### Task 5: Smoke Test Without Deleting DB

**Files:**
- No code files.

- [ ] **Step 1: Restart backend**

Run the backend the same way the project is normally run. If using npm dev:

```powershell
npm --prefix "D:\ReactJS\fco-hub\server" run dev
```

Expected: server logs `FCO Hub Server running on port 5000`.

- [ ] **Step 2: Start a very small hybrid discovery run**

Run:

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/enrichment/fifaaddict/discover-hybrid" -Method Post -ContentType "application/json" -Body '{"includeExistingSeeds":true,"includeNexonSearchSeeds":true,"nexonUniqueLimit":10,"searchVariantLimit":1,"maxVisits":20,"delayMs":200}' | ConvertTo-Json -Depth 5
```

Expected: HTTP 202 response with `Hybrid discovery started in background`.

- [ ] **Step 3: Poll status**

Run after 15-30 seconds:

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/enrichment/status" -Method Get | ConvertTo-Json -Depth 5
```

Expected: `latestRun.message` includes `Hybrid discovery` and shows seeds/searches/visited counts.

- [ ] **Step 4: Confirm no destructive cleanup happened**

Run:

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/players/meta" -Method Get | Select-Object -ExpandProperty totalPlayers
```

Expected: count is non-zero. No DB deletion occurred.

---

### Task 6: Optional Clean DB Full Test Gate

**Files:**
- No code files.

- [ ] **Step 1: Ask for explicit destructive confirmation**

Before calling cleanup, ask the user exactly:

```text
Bạn có chắc muốn xóa sạch Player, PlayerAlias, và PlayerEnrichment hiện tại để chạy hybrid discovery từ DB trống không? Trả lời chính xác: XOA SACH DB
```

Expected: Do not proceed unless the user replies exactly `XOA SACH DB`.

- [ ] **Step 2: Run cleanup only after exact confirmation**

Run:

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/players/cleanup" -Method Post -ContentType "application/json" -Body '{"mode":"all"}' | ConvertTo-Json -Depth 5
```

Expected: response says records were deleted.

- [ ] **Step 3: Re-import Nexon metadata before hybrid discovery**

Run:

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/players/sync-nexon" -Method Post -ContentType "application/json" -Body '{"limit":90000}' | ConvertTo-Json -Depth 5
```

Expected: response includes requested and totalAvailable counts.

- [ ] **Step 4: Run a medium hybrid discovery test**

Run:

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/enrichment/fifaaddict/discover-hybrid" -Method Post -ContentType "application/json" -Body '{"includeExistingSeeds":false,"includeNexonSearchSeeds":true,"nexonUniqueLimit":200,"searchVariantLimit":2,"maxVisits":1000,"delayMs":500}' | ConvertTo-Json -Depth 5
```

Expected: job starts and status later reports search attempts, search misses, seeds, visited, and upserted counts.

---

## Self-Review

- Spec coverage: Covers hybrid multi-seed discovery, namespace safety, progress diagnostics, UI entry point, and non-destructive testing.
- Placeholder scan: No TBD/TODO placeholders. Optional destructive cleanup has exact gate phrase.
- Type consistency: Helper names and service/controller names are consistent across tasks.
- Scope: Focused on MVP hybrid discovery only; resume/persistent queue and advanced scoring are intentionally excluded from this first implementation.
