# Stat Base Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the missing +3 base stat correction into every FIFAAddict player enrichment record once, then ensure the UI only applies user-selected grade/lvl/team-color bonuses at runtime.

**Architecture:** Add a small pure service that applies the +3 correction to one `PlayerEnrichment`-shaped object and reports whether it changed. Add a guarded MongoDB script that dry-runs by default and only updates records missing `statBaseCorrection: 3`, preventing double-adds. Keep frontend detail bonus logic scoped to grade/lvl/team-color and verify no separate base +3 remains in the detail view path.

**Tech Stack:** Node.js ES modules, Mongoose, built-in `node:test`, React/Vite client tests using existing Node-compatible test files.

## Global Constraints

- Always prefix shell commands with `rtk`.
- Do not create git commits unless the user explicitly asks during execution.
- The one-time DB correction value is exactly `3`.
- The DB correction must be idempotent via `statBaseCorrection: 3` and `statBaseCorrectedAt`.
- Runtime UI bonuses for grade, lvl, and team-color bonus remain intact.
- No destructive database operations; the script must default to dry-run and require `--apply` to write.

---

## File Structure

- Create `server/src/services/statBaseCorrection.js` — pure correction helper for PlayerEnrichment-shaped objects.
- Create `server/src/services/statBaseCorrection.test.js` — unit tests for correction coverage and idempotency.
- Modify `server/src/models/PlayerEnrichment.js` — add marker fields to the schema.
- Create `server/scripts/apply-stat-base-correction.js` — CLI migration script with dry-run default and `--apply` mode.
- Modify `client/src/fco/views/detailBonus.js` only if a non-grade/lvl/team-color base `+3` is found during implementation; otherwise leave it unchanged and rely on tests/grep verification.
- Modify `client/src/fco/views/DetailView.bonus.test.js` only if expectations reveal a hidden base +3; otherwise leave it unchanged.

---

### Task 1: Add Pure Stat Base Correction Helper

**Files:**
- Create: `server/src/services/statBaseCorrection.js`
- Test: `server/src/services/statBaseCorrection.test.js`

**Interfaces:**
- Consumes: a plain PlayerEnrichment-shaped object with optional numeric fields and arrays.
- Produces: `BASE_STAT_CORRECTION`, `hasBaseStatCorrection(record)`, `applyBaseStatCorrection(record, correction = BASE_STAT_CORRECTION)`.
- `applyBaseStatCorrection` returns `{ changed: boolean, record: object }` and never mutates its input.

- [ ] **Step 1: Write the failing tests**

Create `server/src/services/statBaseCorrection.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_STAT_CORRECTION,
  applyBaseStatCorrection,
  hasBaseStatCorrection,
} from './statBaseCorrection.js';

test('applies +3 to all persisted player stat fields', () => {
  const input = {
    source: 'fifaaddict-vn',
    overall: 100,
    pace: 90,
    shooting: 80,
    passing: 70,
    dribbling: 60,
    defending: 50,
    physical: 40,
    positions: [
      { position: 'ST', overall: 101 },
      { position: 'CF', overall: null },
    ],
    positionRatings: [
      { label: 'ST', value: 102, recommended: true },
      { label: 'CF', value: undefined, recommended: false },
    ],
    stats: [{ key: 'acceleration', labelVi: 'Tăng tốc', value: 91 }],
    keyStats: [{ key: 'finishing', labelVi: 'Dứt điểm', value: 82 }],
    detailedStats: [{ key: 'strength', labelVi: 'Sức mạnh', value: 73 }],
  };

  const result = applyBaseStatCorrection(input);

  assert.equal(BASE_STAT_CORRECTION, 3);
  assert.equal(result.changed, true);
  assert.deepEqual(result.record, {
    source: 'fifaaddict-vn',
    overall: 103,
    pace: 93,
    shooting: 83,
    passing: 73,
    dribbling: 63,
    defending: 53,
    physical: 43,
    positions: [
      { position: 'ST', overall: 104 },
      { position: 'CF', overall: null },
    ],
    positionRatings: [
      { label: 'ST', value: 105, recommended: true },
      { label: 'CF', value: undefined, recommended: false },
    ],
    stats: [{ key: 'acceleration', labelVi: 'Tăng tốc', value: 94 }],
    keyStats: [{ key: 'finishing', labelVi: 'Dứt điểm', value: 85 }],
    detailedStats: [{ key: 'strength', labelVi: 'Sức mạnh', value: 76 }],
    statBaseCorrection: 3,
  });
  assert.deepEqual(input.positions[0], { position: 'ST', overall: 101 });
});

test('skips records that already have the +3 correction marker', () => {
  const input = {
    overall: 100,
    pace: 90,
    statBaseCorrection: 3,
    detailedStats: [{ key: 'acceleration', labelVi: 'Tăng tốc', value: 91 }],
  };

  const result = applyBaseStatCorrection(input);

  assert.equal(hasBaseStatCorrection(input), true);
  assert.equal(result.changed, false);
  assert.deepEqual(result.record, input);
});

test('does not coerce non-numeric values while applying correction', () => {
  const input = {
    overall: null,
    pace: '90',
    shooting: Number.NaN,
    positions: [{ position: 'ST', overall: '101' }],
    detailedStats: [{ key: 'acceleration', labelVi: 'Tăng tốc', value: '91' }],
  };

  const result = applyBaseStatCorrection(input);

  assert.equal(result.changed, true);
  assert.equal(result.record.overall, null);
  assert.equal(result.record.pace, '90');
  assert.ok(Number.isNaN(result.record.shooting));
  assert.equal(result.record.positions[0].overall, '101');
  assert.equal(result.record.detailedStats[0].value, '91');
});
```

- [ ] **Step 2: Run the helper tests to verify they fail**

Run:

```bash
rtk node --test server/src/services/statBaseCorrection.test.js
```

Expected: FAIL with module not found for `./statBaseCorrection.js`.

- [ ] **Step 3: Implement the helper**

Create `server/src/services/statBaseCorrection.js`:

```js
export const BASE_STAT_CORRECTION = 3;

const TOP_LEVEL_STAT_FIELDS = Object.freeze([
  'overall',
  'pace',
  'shooting',
  'passing',
  'dribbling',
  'defending',
  'physical',
]);

function addCorrection(value, correction) {
  return typeof value === 'number' && Number.isFinite(value) ? value + correction : value;
}

function correctStatArray(items, field, correction) {
  if (!Array.isArray(items)) return items;
  return items.map((item) => ({
    ...item,
    [field]: addCorrection(item?.[field], correction),
  }));
}

export function hasBaseStatCorrection(record, correction = BASE_STAT_CORRECTION) {
  return Number(record?.statBaseCorrection) === correction;
}

export function applyBaseStatCorrection(record, correction = BASE_STAT_CORRECTION) {
  if (!record || hasBaseStatCorrection(record, correction)) {
    return { changed: false, record };
  }

  const corrected = { ...record };

  for (const field of TOP_LEVEL_STAT_FIELDS) {
    corrected[field] = addCorrection(corrected[field], correction);
  }

  corrected.positions = correctStatArray(corrected.positions, 'overall', correction);
  corrected.positionRatings = correctStatArray(corrected.positionRatings, 'value', correction);
  corrected.stats = correctStatArray(corrected.stats, 'value', correction);
  corrected.keyStats = correctStatArray(corrected.keyStats, 'value', correction);
  corrected.detailedStats = correctStatArray(corrected.detailedStats, 'value', correction);
  corrected.statBaseCorrection = correction;

  return { changed: true, record: corrected };
}
```

- [ ] **Step 4: Run helper tests to verify they pass**

Run:

```bash
rtk node --test server/src/services/statBaseCorrection.test.js
```

Expected: PASS all 3 tests.

---

### Task 2: Add PlayerEnrichment Marker Fields

**Files:**
- Modify: `server/src/models/PlayerEnrichment.js:102-108`
- Test: `server/src/services/statBaseCorrection.test.js`

**Interfaces:**
- Consumes: `statBaseCorrection` and `statBaseCorrectedAt` values produced by the helper/script.
- Produces: schema support for persisting the migration marker.

- [ ] **Step 1: Update the schema with marker fields**

In `server/src/models/PlayerEnrichment.js`, replace the block around `rawDescription` with:

```js
    rawDescription: { type: String, default: '' },
    raw: { type: mongoose.Schema.Types.Mixed },
    parseWarnings: [{ type: String }],
    dataQuality: { type: dataQualitySchema, default: () => ({}) },
    statBaseCorrection: { type: Number, default: null, index: true },
    statBaseCorrectedAt: { type: Date },
    lastDetailSyncedAt: { type: Date },
    syncedAt: { type: Date, default: Date.now, index: true },
```

- [ ] **Step 2: Run the focused server tests**

Run:

```bash
rtk node --test server/src/services/statBaseCorrection.test.js server/src/services/fifaAddictSource.test.js server/src/controllers/player.controller.test.js
```

Expected: PASS all tests. If an existing unrelated test fails, capture its exact failure before changing anything.

---

### Task 3: Add Dry-Run First Migration Script

**Files:**
- Create: `server/scripts/apply-stat-base-correction.js`
- Modify: `server/src/services/statBaseCorrection.js` if the script needs an exported field list; keep the existing helper interface intact.

**Interfaces:**
- Consumes: `applyBaseStatCorrection(record)` from `server/src/services/statBaseCorrection.js`.
- Produces: CLI script with dry-run default and `--apply` write mode.

- [ ] **Step 1: Create the script**

Create `server/scripts/apply-stat-base-correction.js`:

```js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import PlayerEnrichment from '../src/models/PlayerEnrichment.js';
import { BASE_STAT_CORRECTION, applyBaseStatCorrection } from '../src/services/statBaseCorrection.js';

dotenv.config();

const shouldApply = process.argv.includes('--apply');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : 0;
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fco-hub';

function buildQuery() {
  return {
    source: 'fifaaddict-vn',
    $or: [
      { statBaseCorrection: { $exists: false } },
      { statBaseCorrection: { $ne: BASE_STAT_CORRECTION } },
    ],
  };
}

function buildUpdate(correctedRecord) {
  return {
    $set: {
      overall: correctedRecord.overall,
      pace: correctedRecord.pace,
      shooting: correctedRecord.shooting,
      passing: correctedRecord.passing,
      dribbling: correctedRecord.dribbling,
      defending: correctedRecord.defending,
      physical: correctedRecord.physical,
      positions: correctedRecord.positions,
      positionRatings: correctedRecord.positionRatings,
      stats: correctedRecord.stats,
      keyStats: correctedRecord.keyStats,
      detailedStats: correctedRecord.detailedStats,
      statBaseCorrection: BASE_STAT_CORRECTION,
      statBaseCorrectedAt: new Date(),
    },
  };
}

async function main() {
  await mongoose.connect(mongoUri);

  const query = buildQuery();
  const total = await PlayerEnrichment.countDocuments(query);
  const cursorQuery = PlayerEnrichment.find(query).lean().cursor();
  let scanned = 0;
  let changed = 0;
  let written = 0;

  for await (const record of cursorQuery) {
    if (limit > 0 && scanned >= limit) break;
    scanned += 1;

    const result = applyBaseStatCorrection(record);
    if (!result.changed) continue;
    changed += 1;

    if (shouldApply) {
      await PlayerEnrichment.updateOne({ _id: record._id }, buildUpdate(result.record));
      written += 1;
    }
  }

  console.log(JSON.stringify({
    mode: shouldApply ? 'apply' : 'dry-run',
    correction: BASE_STAT_CORRECTION,
    totalMatching: total,
    scanned,
    changed,
    written,
  }, null, 2));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
```

- [ ] **Step 2: Run the script in dry-run mode with a small limit**

Run:

```bash
rtk node server/scripts/apply-stat-base-correction.js --limit=5
```

Expected: exits 0 and prints JSON with `"mode": "dry-run"`, `"written": 0`, and `changed` between 0 and 5.

- [ ] **Step 3: Run the focused tests again**

Run:

```bash
rtk node --test server/src/services/statBaseCorrection.test.js server/src/services/fifaAddictSource.test.js server/src/controllers/player.controller.test.js
```

Expected: PASS all tests.

---

### Task 4: Verify and Remove Any Runtime Base +3 in Detail UI

**Files:**
- Inspect: `client/src/fco/views/detailBonus.js`
- Inspect: `client/src/fco/views/DetailView.jsx`
- Test: `client/src/fco/views/DetailView.bonus.test.js`

**Interfaces:**
- Consumes: corrected DB values after migration.
- Produces: UI that only adds selected `grade`, `level`, and `teamColorBonus` via `getDetailBonusModel` and `applyDetailBonuses`.

- [ ] **Step 1: Search for non-selected base +3 logic in the detail path**

Run:

```bash
rtk grep "\+ 3|\+3|statBaseCorrection|base.*3" client/src/fco/views client/src/fco/helpers.js
```

Expected: no detail UI code that blindly adds 3 to player stats. Matches inside text labels or DB marker references are acceptable only if they do not affect runtime stat math.

- [ ] **Step 2: Confirm bonus helper still only models grade/lvl/team-color**

Read `client/src/fco/views/detailBonus.js` and keep the model equivalent to:

```js
export function getDetailBonusModel({ grade, level = 1, teamColorBonus = 0 }) {
  const gradeOvrBonus = getOvrBonusForGrade(grade);
  const gradeStatBonus = getStatBonusForGrade(grade);
  const levelStatBonus = clampInteger(level, 1, 5) - 1;
  const bonusStatBonus = clampInteger(teamColorBonus, 0, 10);
  const flatBonus = levelStatBonus + bonusStatBonus;

  return {
    gradeOvrBonus,
    gradeStatBonus,
    levelStatBonus,
    bonusStatBonus,
    flatBonus,
    statBonus: gradeStatBonus + flatBonus,
    ovrBonus: gradeOvrBonus + flatBonus,
  };
}
```

If implementation finds a separate unconditional `+3`, remove only that unconditional addition and leave the above selected-bonus math unchanged.

- [ ] **Step 3: Run existing frontend bonus test**

Run:

```bash
rtk node --test client/src/fco/views/DetailView.bonus.test.js
```

Expected: PASS. The test should continue to prove grade/lvl/team-color bonuses work without any unconditional base +3.

---

### Task 5: Apply Migration Only After Dry-Run Looks Correct

**Files:**
- Execute: `server/scripts/apply-stat-base-correction.js`
- No code changes expected in this task unless dry-run output exposes a bug.

**Interfaces:**
- Consumes: dry-run output from Task 3.
- Produces: corrected DB records with `statBaseCorrection: 3` and `statBaseCorrectedAt`.

- [ ] **Step 1: Run full dry-run**

Run:

```bash
rtk node server/scripts/apply-stat-base-correction.js
```

Expected: exits 0 and prints JSON with `"mode": "dry-run"`, `"written": 0`, and `totalMatching` equal to the number of FIFAAddict records not yet corrected.

- [ ] **Step 2: Apply the migration**

Run only after reviewing the dry-run count:

```bash
rtk node server/scripts/apply-stat-base-correction.js --apply
```

Expected: exits 0 and prints JSON with `"mode": "apply"`, `written` equal to `changed`, and no stack trace.

- [ ] **Step 3: Prove idempotency immediately after apply**

Run:

```bash
rtk node server/scripts/apply-stat-base-correction.js
```

Expected: exits 0 and prints JSON with `"mode": "dry-run"`, `changed: 0`, and `written: 0`.

---

### Task 6: Final Verification

**Files:**
- Verify: `server/src/services/statBaseCorrection.test.js`
- Verify: `client/src/fco/views/DetailView.bonus.test.js`
- Verify: `server/scripts/apply-stat-base-correction.js`

**Interfaces:**
- Consumes: completed helper, schema fields, migration script, and UI bonus behavior.
- Produces: confidence that DB correction is persisted once and UI bonus math is not double-counting base +3.

- [ ] **Step 1: Run all relevant focused tests**

Run:

```bash
rtk node --test server/src/services/statBaseCorrection.test.js server/src/services/fifaAddictSource.test.js server/src/controllers/player.controller.test.js client/src/fco/views/DetailView.bonus.test.js
```

Expected: PASS all tests.

- [ ] **Step 2: Inspect git diff**

Run:

```bash
rtk git diff -- server/src/services/statBaseCorrection.js server/src/services/statBaseCorrection.test.js server/src/models/PlayerEnrichment.js server/scripts/apply-stat-base-correction.js client/src/fco/views/detailBonus.js client/src/fco/views/DetailView.bonus.test.js
```

Expected: diff contains only the correction helper/tests/schema/script and any necessary removal of unconditional detail UI +3 logic.

- [ ] **Step 3: Report execution status**

Report these facts to the user:

```text
- Dry-run count before apply: <number from script output>
- Records written: <number from apply output>
- Idempotency dry-run changed count after apply: 0
- Focused test result: pass/fail with exact failing test if any
```

---

## Self-Review

- Spec coverage: The plan covers DB persistence, marker-based idempotency, all selected player stat fields, UI cleanup for unconditional base +3, and focused verification.
- Placeholder scan: No TBD/TODO/fill-in-later placeholders remain. The final report uses runtime values because those are produced only after execution.
- Type consistency: `BASE_STAT_CORRECTION`, `hasBaseStatCorrection`, and `applyBaseStatCorrection` are defined in Task 1 and consumed consistently by later tasks.
