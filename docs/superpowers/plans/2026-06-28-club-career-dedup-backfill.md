# Club Career Dedup Backfill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make club career backfill fetch each normalized player name once, then safely apply the fetched `clubCareer` to all matching season/card records.

**Architecture:** The backfill job snapshots eligible records at run start, groups them by normalized player name, refreshes one representative per group with FIFAAddict detail JSON, then applies the resulting `clubCareer` to compatible group members. Compatibility is guarded by normalized name plus optional `nation` and `birthDateText` equality when both sides have values, so same-name collisions are less likely to receive copied career data.

**Tech Stack:** Node.js ESM, Mongoose, MongoDB, `node:test`, existing FIFAAddict service helpers.

## Global Constraints

- Do not invent fallback `clubCareer` entries from current club/season; only write data returned by FIFAAddict detail payload.
- `limit: 0` must mean all eligible groups/records for the run.
- The job must not repeatedly process the same empty `clubCareer` record in one run.
- Fetch one representative detail per normalized player-name group when possible, then fan out to compatible cards.
- Prefer modifying existing service/test files; do not add new dependencies.

---

## File Structure

- `server/src/services/fifaAddictSource.js` owns the backfill query, grouping, representative selection, compatibility guard, and fan-out update logic.
- `server/src/services/fifaAddictSource.test.js` owns unit coverage for query/cap helpers plus the new grouping and compatibility helpers.
- `server/src/controllers/enrichment.controller.js` can remain unchanged unless implementation reveals the route does not pass `limit`/`onlyMissing` through correctly.

---

### Task 1: Add deterministic grouping and compatibility helpers

**Files:**
- Modify: `server/src/services/fifaAddictSource.js:1429-1450`
- Test: `server/src/services/fifaAddictSource.test.js:73-95`

**Interfaces:**
- Consumes: existing `normalizeText(value)` helper in `server/src/services/fifaAddictSource.js`.
- Produces:
  - `getClubCareerPlayerKey(doc: object): string`
  - `hasCompatibleClubCareerIdentity(reference: object, candidate: object): boolean`
  - These helpers are exported for tests and used by Task 2.

- [ ] **Step 1: Write failing tests for normalized player key and identity guard**

Add these tests after the existing `resolveClubCareerBackfillCap` test in `server/src/services/fifaAddictSource.test.js`:

```js
test('clubCareer player key prefers English name and normalizes casing/space', () => {
  assert.equal(
    getClubCareerPlayerKey({ displayNameEn: '  Cristiano Ronaldo ', displayNameVi: 'Cristiano Ronaldo dos Santos Aveiro' }),
    'cristiano ronaldo'
  );
  assert.equal(
    getClubCareerPlayerKey({ displayNameEn: '', displayNameVi: '  Nguyễn   Văn A  ' }),
    'nguyễn văn a'
  );
  assert.equal(getClubCareerPlayerKey({ displayNameEn: '', displayNameVi: '', fullNameVi: '' }), '');
});

test('clubCareer identity guard allows matching optional metadata', () => {
  const reference = {
    displayNameEn: 'Cristiano Ronaldo',
    nation: 'Portugal',
    birthDateText: '1985-02-05',
  };

  assert.equal(
    hasCompatibleClubCareerIdentity(reference, {
      displayNameEn: ' Cristiano Ronaldo ',
      nation: 'Portugal',
      birthDateText: '1985-02-05',
    }),
    true
  );
  assert.equal(
    hasCompatibleClubCareerIdentity(reference, {
      displayNameEn: 'Cristiano Ronaldo',
      nation: '',
      birthDateText: '',
    }),
    true
  );
  assert.equal(
    hasCompatibleClubCareerIdentity(reference, {
      displayNameEn: 'Cristiano Ronaldo',
      nation: 'Brazil',
      birthDateText: '1985-02-05',
    }),
    false
  );
  assert.equal(
    hasCompatibleClubCareerIdentity(reference, {
      displayNameEn: 'Cristiano Ronaldo',
      nation: 'Portugal',
      birthDateText: '1999-01-01',
    }),
    false
  );
});
```

Update the import list at the top of the same test file to include the new exports:

```js
import {
  buildClubCareerBackfillQuery,
  extractClubCareer,
  getClubCareerPlayerKey,
  getClubCareerSource,
  getFifaAddictLeagueSlug,
  hasCompatibleClubCareerIdentity,
  resolveClubCareerBackfillCap,
} from './fifaAddictSource.js';
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
rtk node --test server/src/services/fifaAddictSource.test.js
```

Expected: FAIL because `getClubCareerPlayerKey` and `hasCompatibleClubCareerIdentity` are not exported yet.

- [ ] **Step 3: Implement minimal helpers**

Add this code after `resolveClubCareerBackfillCap` in `server/src/services/fifaAddictSource.js`:

```js
export function getClubCareerPlayerKey(doc = {}) {
  return normalizeText(doc.displayNameEn || doc.displayNameVi || doc.fullNameVi || '').toLowerCase();
}

function normalizedOptionalIdentityValue(value) {
  return normalizeText(value || '').toLowerCase();
}

function optionalIdentityMatches(left, right) {
  const normalizedLeft = normalizedOptionalIdentityValue(left);
  const normalizedRight = normalizedOptionalIdentityValue(right);
  return !normalizedLeft || !normalizedRight || normalizedLeft === normalizedRight;
}

export function hasCompatibleClubCareerIdentity(reference = {}, candidate = {}) {
  const referenceKey = getClubCareerPlayerKey(reference);
  if (!referenceKey || referenceKey !== getClubCareerPlayerKey(candidate)) return false;

  return optionalIdentityMatches(reference.nation, candidate.nation)
    && optionalIdentityMatches(reference.birthDateText, candidate.birthDateText);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
rtk node --test server/src/services/fifaAddictSource.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add server/src/services/fifaAddictSource.js server/src/services/fifaAddictSource.test.js
rtk git commit -m "feat: add club career grouping guards"
```

---

### Task 2: Snapshot and group missing clubCareer records

**Files:**
- Modify: `server/src/services/fifaAddictSource.js:1587-1672`
- Test: `server/src/services/fifaAddictSource.test.js:91-120`

**Interfaces:**
- Consumes:
  - `buildClubCareerBackfillQuery({ onlyMissing?: boolean }): object`
  - `resolveClubCareerBackfillCap({ limit?: number, total?: number }): number`
  - `getClubCareerPlayerKey(doc: object): string`
- Produces:
  - `buildClubCareerBackfillGroups(records: object[]): Array<{ key: string, records: object[] }>`
  - Backfill run processes a snapshot of groups instead of repeatedly querying live missing records.

- [ ] **Step 1: Write failing test for grouping**

Add this test after the identity guard tests:

```js
test('clubCareer backfill groups records by normalized player key and skips empty names', () => {
  const groups = buildClubCareerBackfillGroups([
    { _id: '1', displayNameEn: 'A. Adli', displayNameVi: 'A. Adli' },
    { _id: '2', displayNameEn: ' a.  adli ', displayNameVi: 'A. Adli' },
    { _id: '3', displayNameEn: '', displayNameVi: 'A Lan' },
    { _id: '4', displayNameEn: '', displayNameVi: '' },
  ]);

  assert.deepEqual(
    groups.map((group) => ({ key: group.key, ids: group.records.map((record) => record._id) })),
    [
      { key: 'a. adli', ids: ['1', '2'] },
      { key: 'a lan', ids: ['3'] },
    ]
  );
});
```

Update the import list to include `buildClubCareerBackfillGroups`:

```js
import {
  buildClubCareerBackfillGroups,
  buildClubCareerBackfillQuery,
  extractClubCareer,
  getClubCareerPlayerKey,
  getClubCareerSource,
  getFifaAddictLeagueSlug,
  hasCompatibleClubCareerIdentity,
  resolveClubCareerBackfillCap,
} from './fifaAddictSource.js';
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
rtk node --test server/src/services/fifaAddictSource.test.js
```

Expected: FAIL because `buildClubCareerBackfillGroups` is not exported yet.

- [ ] **Step 3: Implement grouping helper**

Add this code after `hasCompatibleClubCareerIdentity`:

```js
export function buildClubCareerBackfillGroups(records = []) {
  const groupsByKey = new Map();

  for (const record of records) {
    const key = getClubCareerPlayerKey(record);
    if (!key) continue;
    if (!groupsByKey.has(key)) groupsByKey.set(key, []);
    groupsByKey.get(key).push(record);
  }

  return [...groupsByKey.entries()].map(([key, recordsForKey]) => ({
    key,
    records: recordsForKey,
  }));
}
```

- [ ] **Step 4: Modify `backfillClubCareer` to snapshot groups**

Replace the start of `backfillClubCareer` from the query/total/cap calculation through `SyncRun.create` with this code:

```js
  const query = buildClubCareerBackfillQuery({ onlyMissing });
  const total = await PlayerEnrichment.countDocuments(query);
  const cap = resolveClubCareerBackfillCap({ limit, total });
  const snapshot = cap > 0
    ? await PlayerEnrichment.find(query)
      .select('sourceUid sourceUrl displayNameVi displayNameEn fullNameVi nation birthDateText club league clubCareer')
      .limit(cap)
      .lean()
    : [];
  const groups = buildClubCareerBackfillGroups(snapshot);

  const run = await SyncRun.create({
    source: 'fifaaddict-vn',
    status: 'running',
    requested: snapshot.length,
    message: `Club career backfill: ${groups.length} player groups queued (${snapshot.length}/${total} records)`,
  });
```

- [ ] **Step 5: Keep the existing loop temporarily compatible**

In the same function, replace:

```js
      while (processed + failed < cap) {
        const batch = await PlayerEnrichment.find(query).limit(batchSize).lean();
        if (!batch.length) break;

        for (const doc of batch) {
          if (processed + failed >= cap) break;
```

with:

```js
      for (let offset = 0; offset < groups.length; offset += batchSize) {
        const batch = groups.slice(offset, offset + batchSize);
        if (!batch.length) break;

        for (const group of batch) {
          const doc = group.records[0];
```

This step still only refreshes one representative and does not fan out yet; Task 3 completes the behavior.

- [ ] **Step 6: Update progress messages to count groups and records**

Replace the progress update message inside the loop with:

```js
            message: `Club career backfill: ${processed + failed}/${groups.length} groups done (${updated} records updated, ${failed} failed)`,
```

Replace the final success message with:

```js
          message: `Club career backfill done: ${updated} records updated, ${processed} groups processed, ${failed} failed`,
```

- [ ] **Step 7: Run tests**

Run:

```bash
rtk node --test server/src/services/fifaAddictSource.test.js
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
rtk git add server/src/services/fifaAddictSource.js server/src/services/fifaAddictSource.test.js
rtk git commit -m "fix: snapshot club career backfill groups"
```

---

### Task 3: Fan out fetched clubCareer to compatible same-name records

**Files:**
- Modify: `server/src/services/fifaAddictSource.js:1587-1672`
- Test: `server/src/services/fifaAddictSource.test.js:120-170`

**Interfaces:**
- Consumes:
  - `hasCompatibleClubCareerIdentity(reference, candidate): boolean`
  - `ensureEnrichmentDetail(enrichmentDoc, { force: true }): Promise<object>`
- Produces:
  - `buildClubCareerFanoutOperations(reference: object, records: object[], clubCareer: object[]): Array<{ updateOne: object }>`
  - Backfill updates all compatible records in a group with the representative's fetched `clubCareer`.

- [ ] **Step 1: Write failing fan-out operation test**

Add this test after the grouping test:

```js
test('clubCareer fanout operations update compatible same-name records only', () => {
  const career = [{ team: 'Manchester United', teamId: '', season: '2003 - 2009' }];
  const reference = {
    _id: '1',
    displayNameEn: 'Cristiano Ronaldo',
    nation: 'Portugal',
    birthDateText: '1985-02-05',
  };

  const operations = buildClubCareerFanoutOperations(reference, [
    reference,
    {
      _id: '2',
      displayNameEn: 'Cristiano Ronaldo',
      nation: 'Portugal',
      birthDateText: '',
    },
    {
      _id: '3',
      displayNameEn: 'Cristiano Ronaldo',
      nation: 'Brazil',
      birthDateText: '1985-02-05',
    },
  ], career);

  assert.deepEqual(operations, [
    {
      updateOne: {
        filter: { _id: '1' },
        update: { $set: { clubCareer: career } },
      },
    },
    {
      updateOne: {
        filter: { _id: '2' },
        update: { $set: { clubCareer: career } },
      },
    },
  ]);
});

test('clubCareer fanout operations skip empty career payloads', () => {
  assert.deepEqual(
    buildClubCareerFanoutOperations(
      { _id: '1', displayNameEn: 'A Lan' },
      [{ _id: '1', displayNameEn: 'A Lan' }],
      []
    ),
    []
  );
});
```

Update the import list to include `buildClubCareerFanoutOperations`:

```js
import {
  buildClubCareerBackfillGroups,
  buildClubCareerBackfillQuery,
  buildClubCareerFanoutOperations,
  extractClubCareer,
  getClubCareerPlayerKey,
  getClubCareerSource,
  getFifaAddictLeagueSlug,
  hasCompatibleClubCareerIdentity,
  resolveClubCareerBackfillCap,
} from './fifaAddictSource.js';
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
rtk node --test server/src/services/fifaAddictSource.test.js
```

Expected: FAIL because `buildClubCareerFanoutOperations` is not exported yet.

- [ ] **Step 3: Implement fan-out operation builder**

Add this code after `buildClubCareerBackfillGroups`:

```js
export function buildClubCareerFanoutOperations(reference, records = [], clubCareer = []) {
  if (!Array.isArray(clubCareer) || !clubCareer.length) return [];

  return records
    .filter((record) => hasCompatibleClubCareerIdentity(reference, record))
    .map((record) => ({
      updateOne: {
        filter: { _id: record._id },
        update: { $set: { clubCareer } },
      },
    }));
}
```

- [ ] **Step 4: Replace representative-only update with fan-out update**

Inside `backfillClubCareer`, replace the current try block body that starts with:

```js
            const refreshed = await ensureEnrichmentDetail(doc, { force: true });
            const careerCount = (refreshed?.clubCareer || []).length;
            if (careerCount > 0) updated += 1;
            processed += 1;
            console.log(`[OK] clubCareer ${doc.displayNameVi} (${careerCount})`);
```

with:

```js
            const refreshed = await ensureEnrichmentDetail(doc, { force: true });
            const clubCareer = refreshed?.clubCareer || [];
            const operations = buildClubCareerFanoutOperations(refreshed || doc, group.records, clubCareer);

            if (operations.length) {
              await PlayerEnrichment.bulkWrite(operations, { ordered: false });
              updated += operations.length;
            }

            processed += 1;
            console.log(`[OK] clubCareer ${group.key} fetched ${clubCareer.length}, applied ${operations.length}`);
```

- [ ] **Step 5: Make failure logging group-aware**

Replace the catch block logging inside the group loop with:

```js
            failed += 1;
            console.error(`[FAIL] clubCareer ${group.key} -> ${doc.sourceUrl} : ${err.message}`);
            if (errors.length < 50) errors.push(`${group.key}: ${err.message}`);
```

- [ ] **Step 6: Run tests**

Run:

```bash
rtk node --test server/src/services/fifaAddictSource.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
rtk git add server/src/services/fifaAddictSource.js server/src/services/fifaAddictSource.test.js
rtk git commit -m "feat: fan out club career backfill by player name"
```

---

### Task 4: Verify full-run controls and run a safe smoke query

**Files:**
- Modify: `server/src/services/fifaAddictSource.test.js:73-170` if assertions need adjustment after implementation.
- No production file changes expected unless tests reveal controller defaults do not pass query options through.

**Interfaces:**
- Consumes:
  - `backfillClubCareer({ limit: 0, onlyMissing: true })`
  - existing enrichment status endpoint reports `clubCareerBackfillRunning`.
- Produces:
  - Verified behavior for all-record runs and no repeated empty-record loop.

- [ ] **Step 1: Run service tests**

Run:

```bash
rtk node --test server/src/services/fifaAddictSource.test.js
```

Expected: PASS.

- [ ] **Step 2: Run controller tests touching career filters**

Run:

```bash
rtk node --test server/src/controllers/player.controller.test.js
```

Expected: PASS.

- [ ] **Step 3: Run a read-only count of missing clubCareer records**

Run:

```bash
cd server && rtk node --input-type=module -e "import 'dotenv/config'; import mongoose from 'mongoose'; import PlayerEnrichment from './src/models/PlayerEnrichment.js'; await mongoose.connect(process.env.MONGODB_URI); const total = await PlayerEnrichment.countDocuments({ source: 'fifaaddict-vn', sourceUid: { \$exists: true, \$ne: '' }, \$or: [{ clubCareer: { \$exists: false } }, { clubCareer: { \$size: 0 } }] }); const names = await PlayerEnrichment.aggregate([{ \$match: { source: 'fifaaddict-vn', sourceUid: { \$exists: true, \$ne: '' }, \$or: [{ clubCareer: { \$exists: false } }, { clubCareer: { \$size: 0 } }] } }, { \$project: { key: { \$toLower: { \$ifNull: [{ \$cond: [{ \$ne: ['$displayNameEn', ''] }, '$displayNameEn', '$displayNameVi'] }, ''] } } } }, { \$group: { _id: '$key', count: { \$sum: 1 } } }, { \$count: 'groups' }]); console.log(JSON.stringify({ totalMissingRecords: total, approxMissingNameGroups: names[0]?.groups || 0 }, null, 2)); await mongoose.disconnect();"
```

Expected: prints `totalMissingRecords` and `approxMissingNameGroups`; this command must not mutate data.

- [ ] **Step 4: Optionally start a tiny backfill smoke run**

Only run this if the user approves mutating the database:

```bash
cd server && rtk node --input-type=module -e "import 'dotenv/config'; import mongoose from 'mongoose'; import { backfillClubCareer } from './src/services/fifaAddictSource.js'; await mongoose.connect(process.env.MONGODB_URI); const result = await backfillClubCareer({ limit: 5, batchSize: 5, delayMs: 300, onlyMissing: true }); console.log(JSON.stringify(result, null, 2)); setTimeout(async () => { await mongoose.disconnect(); }, 1000);"
```

Expected: creates a `SyncRun`, starts a background job, and returns `{ runId, queued, total, message }`. Because this mutates shared DB data, do not run it without explicit user approval.

- [ ] **Step 5: Commit any test-only adjustments**

If Task 4 changed tests, commit them:

```bash
rtk git add server/src/services/fifaAddictSource.test.js server/src/controllers/player.controller.test.js
rtk git commit -m "test: verify club career backfill controls"
```

If Task 4 made no file changes, skip this commit.

---

## Self-Review

- Spec coverage: The plan covers normalized-name grouping, optional `nation`/`birthDateText` guard, snapshot processing, fan-out updates, `limit: 0`, and no fallback fake career records.
- Placeholder scan: No `TBD`, `TODO`, or unspecified test steps remain.
- Type consistency: Helper names and signatures match across tasks: `getClubCareerPlayerKey`, `hasCompatibleClubCareerIdentity`, `buildClubCareerBackfillGroups`, and `buildClubCareerFanoutOperations`.
