# FIFAAddict PID Discovery Crawler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reliable FIFAAddict crawler that discovers card PIDs from existing records and optional Nexon/search seeds, then expands coverage through each detail API response's `dbrelate` list.

**Architecture:** The crawler uses the working detail endpoint `/api2?fo4pid=pid{uid}&locale=vn` as the source of truth. It keeps a queue of UIDs, fetches each detail payload with existing X-ARAIWA token handling, normalizes and upserts the full record, extracts `dbrelate[].uid`, and enqueues unseen related UIDs. It supports three seed modes: explicit UIDs, existing `PlayerEnrichment` UIDs, and optional Nexon-name search seeds.

**Tech Stack:** Node.js ESM, Express, Mongoose/MongoDB, Axios, existing `PlayerEnrichment`, `Player`, `SyncRun`, and FIFAAddict helpers in `server/src/services/fifaAddictSource.js`.

---

## File Structure

- Modify: `server/src/services/fifaAddictSource.js`
  - Add detail payload normalization helpers.
  - Add PID graph discovery service and status flag.
  - Add `pidDiscoveryRunning` to enrichment status.
- Modify: `server/src/controllers/enrichment.controller.js`
  - Add controller `discoverFifaAddictPids`.
- Modify: `server/src/routes/enrichment.routes.js`
  - Add route `POST /api/enrichment/fifaaddict/discover-pids`.
- Create: `server/scripts/test-fifaaddict-pid-crawler.js`
  - Smoke test starting from Pele `kmjrrzdn`.

---

### Task 1: Add detail payload normalization helpers

**Files:**
- Modify: `server/src/services/fifaAddictSource.js`

- [ ] **Step 1: Add helpers after `apiRowToEnrichment(row)`**

Add:

```js
function detailPayloadToEnrichment(payload, sourceUid) {
  const db = payload.pre || payload.db || {};
  const row = {
    ...db,
    uid: db.uid || sourceUid,
    year: db.year,
    year_short: db.year_short || db.class || '',
    attrA: db.salary || db.attrA,
    attrB: db.current_ovr || db.attrB,
    attrC: db.stamina || db.attrC,
    pricekr: db.pricekr,
  };

  const enrichment = apiRowToEnrichment(row);
  const boost = Number(db.all_statchange || db.update_statchange || 0);
  const detailedStats = extractDetailedStatsFromJson(payload.attr, boost);
  const traits = extractTraitsFromJson(payload);
  const meta = payload.meta || {};

  const detailUpdate = {
    ...enrichment,
    detailedStats,
    keyStats: detailedStats.length ? detailedStats.slice(0, 16) : enrichment.keyStats,
    hiddenTraits: traits.hiddenTraits,
    traitsDescription: traits.traitsDescription,
    positionRatings: extractPositionRatings(db.postlist),
    clubCareer: extractClubCareer(db.clubcareer),
    rawDescription: normalizeText(meta.desc || db.desc || ''),
    lastDetailSyncedAt: new Date(),
    syncedAt: new Date(),
    parseWarnings: detailedStats.length ? [] : ['missing-detail-stats'],
  };

  const ag = db.attrgroup;
  if (ag && Array.isArray(ag.data) && ag.data.length >= 6) {
    [detailUpdate.pace, detailUpdate.shooting, detailUpdate.passing, detailUpdate.dribbling, detailUpdate.defending, detailUpdate.physical] =
      ag.data.map((n) => Number(n) || null);
  } else if (detailedStats.length) {
    Object.assign(detailUpdate, deriveGroupStats(detailedStats));
  }

  if (db.height) detailUpdate.heightCm = Number(db.height);
  if (db.weight) detailUpdate.weightKg = Number(db.weight);
  if (db.age) detailUpdate.age = Number(db.age);
  if (db.foot_weak) detailUpdate.weakFoot = Number(db.foot_weak);
  if (db.skill_level) detailUpdate.skillMoves = Number(db.skill_level);
  if (db.foot_pref) detailUpdate.preferredFoot = db.foot_pref;
  if (db.workrate_att) detailUpdate.workRateAttack = String(db.workrate_att);
  if (db.workrate_def) detailUpdate.workRateDefense = String(db.workrate_def);
  if (db.reputation) detailUpdate.reputation = db.reputation;
  if (db.birthdate) detailUpdate.birthDateText = db.birthdate;
  if (db.league_name) detailUpdate.league = db.league_name;
  if (db.nation_name) detailUpdate.nation = db.nation_name;
  if (db.team_name) detailUpdate.club = db.team_name;

  detailUpdate.dataQuality = buildDataQuality(detailUpdate, detailUpdate.parseWarnings);
  return detailUpdate;
}

function extractRelatedUids(payload) {
  const relate = payload.dbrelate || payload.db?.dbrelate || payload.pre?.dbrelate || [];
  if (!Array.isArray(relate)) return [];
  return [...new Set(relate.map((row) => String(row.uid || '')).filter(Boolean))];
}
```

- [ ] **Step 2: Run syntax check**

Run:

```bash
cd server
node --check src/services/fifaAddictSource.js
```

Expected: no syntax errors.

---

### Task 2: Add PID graph crawler service

**Files:**
- Modify: `server/src/services/fifaAddictSource.js`

- [ ] **Step 1: Add service before `getFifaAddictStatus()`**

Add:

```js
let pidDiscoveryRunning = false;

export function isPidDiscoveryRunning() {
  return pidDiscoveryRunning;
}

async function getExistingFifaAddictSeeds(limit = 1000) {
  const rows = await PlayerEnrichment.find({ source: 'fifaaddict-vn', sourceUid: { $exists: true, $ne: '' } })
    .select('sourceUid')
    .limit(limit)
    .lean();
  return rows.map((row) => String(row.sourceUid)).filter(Boolean);
}

async function getSearchSeedsFromNexonNames({ limit = 200, delayMs = DEFAULT_API_DELAY_MS } = {}) {
  const players = await Player.find({ isActive: true }).select('name searchName').limit(limit).lean();
  const uniqueNames = [...new Set(players.map((player) => normalizeText(player.searchName || player.name)).filter(Boolean))];
  const seeds = [];

  for (const name of uniqueNames) {
    try {
      const cards = await searchFifaAddictCards(name);
      for (const card of cards) {
        if (card.sourceUid) seeds.push(card.sourceUid);
      }
    } catch {
      // Search seed failures are non-fatal.
    }
    if (delayMs > 0) await sleep(delayMs);
  }

  return [...new Set(seeds)];
}

export async function discoverFifaAddictByPidGraph({
  initialUids = [],
  includeExistingSeeds = true,
  includeNexonSearchSeeds = false,
  nexonSearchLimit = 200,
  maxVisits = 5000,
  delayMs = DEFAULT_API_DELAY_MS,
} = {}) {
  if (pidDiscoveryRunning) throw new Error('PID discovery is already running.');
  pidDiscoveryRunning = true;

  const run = await SyncRun.create({
    source: 'fifaaddict-vn',
    status: 'running',
    requested: maxVisits,
    message: 'PID discovery: preparing seeds...',
  });

  const job = (async () => {
    const visited = new Set();
    const queued = new Set();
    const queue = [];
    let processed = 0;
    let upserted = 0;
    let failed = 0;
    const errors = [];

    const enqueue = (uid) => {
      const clean = String(uid || '').trim();
      if (!clean || visited.has(clean) || queued.has(clean)) return;
      queued.add(clean);
      queue.push(clean);
    };

    try {
      for (const uid of initialUids) enqueue(uid);
      if (includeExistingSeeds) {
        const existingSeeds = await getExistingFifaAddictSeeds(Math.min(maxVisits, 2000));
        for (const uid of existingSeeds) enqueue(uid);
      }
      if (includeNexonSearchSeeds) {
        const searchSeeds = await getSearchSeedsFromNexonNames({ limit: nexonSearchLimit, delayMs });
        for (const uid of searchSeeds) enqueue(uid);
      }

      await SyncRun.findByIdAndUpdate(run._id, {
        $set: { message: `PID discovery: ${queue.length} seeds queued. Starting BFS...` },
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

          for (const relatedUid of extractRelatedUids(payload)) enqueue(relatedUid);
          processed += 1;
        } catch (error) {
          failed += 1;
          processed += 1;
          if (errors.length < 50) errors.push(`${uid}: ${error.message}`);
        }

        if (processed % 10 === 0) {
          await SyncRun.findByIdAndUpdate(run._id, {
            $set: {
              processed,
              updated: upserted,
              failed,
              errors,
              message: `PID discovery: ${processed}/${maxVisits} visited, ${upserted} upserted, ${queue.length} queued`,
            },
          }).catch(() => {});
        }

        if (delayMs > 0) await sleep(delayMs);
      }

      await SyncRun.findByIdAndUpdate(run._id, {
        $set: {
          status: failed === processed && processed > 0 ? 'failed' : 'success',
          finishedAt: new Date(),
          processed,
          updated: upserted,
          failed,
          errors,
          message: `PID discovery done: ${processed} visited, ${upserted} upserted, ${queue.length} remaining queued`,
        },
      });
    } catch (error) {
      await SyncRun.findByIdAndUpdate(run._id, {
        $set: { status: 'failed', finishedAt: new Date(), message: error.message, errors: [error.message] },
      }).catch(() => {});
    } finally {
      pidDiscoveryRunning = false;
    }
  })();

  job.catch(() => {});

  return { runId: run._id, message: 'PID discovery started in background. Poll /api/enrichment/status.' };
}
```

- [ ] **Step 2: Add status flag to `getFifaAddictStatus()` response**

Add `pidDiscoveryRunning` next to `bulkSyncRunning` and `bulkDetailRunning`.

- [ ] **Step 3: Run syntax check**

```bash
cd server
node --check src/services/fifaAddictSource.js
```

Expected: no syntax errors.

---

### Task 3: Add API endpoint

**Files:**
- Modify: `server/src/controllers/enrichment.controller.js`
- Modify: `server/src/routes/enrichment.routes.js`

- [ ] **Step 1: Import service functions in controller**

Add to the `fifaAddictSource.js` import list:

```js
  isPidDiscoveryRunning,
  discoverFifaAddictByPidGraph,
```

- [ ] **Step 2: Add controller**

Append:

```js
export const discoverFifaAddictPids = async (req, res) => {
  try {
    if (isPidDiscoveryRunning() || isDiscoverRunning() || isDiscoverV2Running()) {
      return res.status(409).json({ success: false, message: 'A discovery job is already running. Poll /api/enrichment/status.' });
    }

    const result = await discoverFifaAddictByPidGraph({
      initialUids: Array.isArray(req.body?.initialUids) ? req.body.initialUids : [],
      includeExistingSeeds: req.body?.includeExistingSeeds !== false,
      includeNexonSearchSeeds: req.body?.includeNexonSearchSeeds === true,
      nexonSearchLimit: req.body?.nexonSearchLimit || 200,
      maxVisits: req.body?.maxVisits || 5000,
      delayMs: req.body?.delayMs || 600,
    });

    res.status(202).json({ success: true, message: result.message, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error starting PID discovery', error: error.message });
  }
};
```

- [ ] **Step 3: Add route import and route**

In `server/src/routes/enrichment.routes.js`, import `discoverFifaAddictPids` and add:

```js
router.post('/fifaaddict/discover-pids', requireAdminSync, discoverFifaAddictPids);
```

- [ ] **Step 4: Syntax checks**

```bash
cd server
node --check src/controllers/enrichment.controller.js
node --check src/routes/enrichment.routes.js
```

Expected: no syntax errors.

---

### Task 4: Add and run Pele smoke test script

**Files:**
- Create: `server/scripts/test-fifaaddict-pid-crawler.js`

- [ ] **Step 1: Create smoke test script**

```js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import { discoverFifaAddictByPidGraph } from '../src/services/fifaAddictSource.js';
import SyncRun from '../src/models/SyncRun.js';

dotenv.config();

async function main() {
  await connectDB();
  const result = await discoverFifaAddictByPidGraph({
    initialUids: ['kmjrrzdn'],
    includeExistingSeeds: false,
    includeNexonSearchSeeds: false,
    maxVisits: 20,
    delayMs: 300,
  });

  console.log('Started:', result);

  let latest = null;
  for (let i = 0; i < 120; i += 1) {
    latest = await SyncRun.findById(result.runId).lean();
    console.log(`[${i}]`, latest.status, latest.processed, latest.updated, latest.message);
    if (latest.status !== 'running') break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  await mongoose.disconnect();
  if (!latest || latest.status !== 'success') process.exitCode = 1;
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
```

- [ ] **Step 2: Run smoke test**

```bash
cd server
node scripts/test-fifaaddict-pid-crawler.js
```

Expected: status ends as `success`, with more than one Pele-related UID upserted.

---

### Task 5: Endpoint smoke test and cautious full run

**Files:**
- No file changes.

- [ ] **Step 1: Start server**

```bash
cd server
npm run dev
```

Expected: server listens on port 5000.

- [ ] **Step 2: Trigger small API run**

```bash
curl -X POST http://localhost:5000/api/enrichment/fifaaddict/discover-pids \
  -H "Content-Type: application/json" \
  -d '{"initialUids":["kmjrrzdn"],"includeExistingSeeds":false,"includeNexonSearchSeeds":false,"maxVisits":20,"delayMs":300}'
```

Expected: HTTP 202 and a `runId`.

- [ ] **Step 3: Run existing-seed discovery**

```bash
curl -X POST http://localhost:5000/api/enrichment/fifaaddict/discover-pids \
  -H "Content-Type: application/json" \
  -d '{"includeExistingSeeds":true,"includeNexonSearchSeeds":false,"maxVisits":1000,"delayMs":600}'
```

Expected: `playerenrichments` count grows beyond 100 if related cards are not yet stored.

- [ ] **Step 4: Run combined seed discovery after existing-seed run succeeds**

```bash
curl -X POST http://localhost:5000/api/enrichment/fifaaddict/discover-pids \
  -H "Content-Type: application/json" \
  -d '{"includeExistingSeeds":true,"includeNexonSearchSeeds":true,"nexonSearchLimit":200,"maxVisits":2000,"delayMs":800}'
```

Expected: If `players` collection has Nexon rows, search seeds are added; if it is empty, run still succeeds from existing seeds.

---

## Self-Review

- Spec coverage: Covers explicit seeds, existing 100 FIFAAddict seeds, optional Nexon/search seeds, `dbrelate` BFS, API endpoint, status, and smoke tests.
- Placeholder scan: No placeholders remain.
- Type consistency: Uses `sourceUid`, `seasonCode`, `PlayerEnrichment`, `SyncRun`, `discoverFifaAddictByPidGraph`, and `isPidDiscoveryRunning` consistently.
