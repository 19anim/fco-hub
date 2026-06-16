# FCO Crawler Date Extraction Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **⚠️ NOT YET STARTED.** This plan touches the running backend (`server/`). The BE was running live crawl/scan jobs at planning time. Before implementing: confirm it's safe to edit `fcoCrawler.js`, or stop the job first. All new tests run OFFLINE (no DB, no network) and are safe to run anytime.

**Goal:** Make the crawler extract each article's OWN event dates (the official "Bắt đầu/Kết thúc" block) instead of accidentally borrowing a cross-promoted event's date range, so expired events are correctly marked `Expired` and stop leaking into the valid list.

**Architecture:** Refactor the date logic in `fcoCrawler.js` into three pure, exported, side-effect-free functions (`extractDateRanges`, `pickRepresentativeRange`, `computeStatus`) that take `today` as an explicit argument. The class method `getDateRanges` and the `getEvents` range loop delegate to them. Pure functions get offline `node:test` unit tests.

**Tech Stack:** Node ESM, `node:test` + `node:assert/strict` (already used by `fifaAddictDiscoveryDiagnostics.test.mjs`), cheerio/axios unchanged.

**Root cause (verified):** `getDateRanges` merges matches from 3 regex tiers into one flat array; `getEvents` then keeps any range containing "today" as `Active`. When an article's real range is expired but it cross-promotes another event whose range is current, the wrong range wins. Example: `nap-tich-luy-fc-mc-09-06-12-06` has official block `09.06→12.06` (expired) but also text `"Từ ngày 13.06 - 21.06..."` (a different event) — DB wrongly stored 13–21 as Active.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `server/src/services/fcoCrawler.js` | **Modify.** Add 3 exported pure helpers near top; rewrite `getDateRanges` to use tiered priority; rewrite the `getEvents` range loop to pick one representative range + compute status. |
| `server/src/services/fcoCrawler.dates.test.mjs` | **New.** Offline unit tests for the 3 pure helpers using fixture text. |

CWD for all commands: `d:\ReactJS\fco-hub\server`.

---

## Task 1: Add pure helper `computeStatus` + its test

**Files:**
- Modify: `server/src/services/fcoCrawler.js` (add exported function above the `class FCOCrawler` line)
- Create: `server/src/services/fcoCrawler.dates.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `server/src/services/fcoCrawler.dates.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeStatus } from './fcoCrawler.js';

const today = new Date(2026, 5, 14); // 14 June 2026 (month is 0-based)

test('computeStatus: expired when end is before today', () => {
  const r = { start: new Date(2026, 5, 9), end: new Date(2026, 5, 12) };
  assert.equal(computeStatus(r, today), 'Expired');
});

test('computeStatus: active when today is within range', () => {
  const r = { start: new Date(2026, 5, 13), end: new Date(2026, 5, 21) };
  assert.equal(computeStatus(r, today), 'Active');
});

test('computeStatus: active (upcoming) when start is after today', () => {
  const r = { start: new Date(2026, 5, 20), end: new Date(2026, 5, 25) };
  assert.equal(computeStatus(r, today), 'Active');
});

test('computeStatus: unknown when range is null', () => {
  assert.equal(computeStatus(null, today), 'Unknown');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test src/services/fcoCrawler.dates.test.mjs`
Expected: FAIL — `computeStatus` is not exported / not a function.

- [ ] **Step 3: Implement `computeStatus`**

In `server/src/services/fcoCrawler.js`, add ABOVE the `class FCOCrawler {` line (after the constant arrays):

```js
// Midnight-normalized comparison helper.
function atMidnight(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

// Status for a single representative range relative to `today`.
// Expired only when the END date is strictly before today; upcoming events stay Active.
export function computeStatus(range, today = new Date()) {
  if (!range || !range.start || !range.end) return 'Unknown';
  const t = atMidnight(today);
  const end = atMidnight(range.end);
  if (end < t) return 'Expired';
  return 'Active';
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test src/services/fcoCrawler.dates.test.mjs`
Expected: PASS (4/4).

---

## Task 2: Add pure helper `extractDateRanges` (tiered priority) + tests

**Files:**
- Modify: `server/src/services/fcoCrawler.js`
- Modify: `server/src/services/fcoCrawler.dates.test.mjs`

**Context:** `extractDateRanges` reproduces the existing parsing (same 3 regex, same `convertFcoDate`/diacritic handling) but returns ONLY the highest-priority tier that matched, plus a `tier` label. It must be self-contained (not depend on `this`), so it inlines the diacritic strip and date conversion.

- [ ] **Step 1: Write the failing tests**

Append to `server/src/services/fcoCrawler.dates.test.mjs`:

```js
import { extractDateRanges } from './fcoCrawler.js';

test('extractDateRanges: prefers Bắt đầu/Kết thúc block over cross-promo ranges', () => {
  const text = 'Thời gian diễn ra: Bắt đầu: 11h00 ngày 09.06.2026 Kết thúc: 23h59 ngày 12.06.2026. '
    + 'Từ ngày 13.06 - 21.06, Sự kiện nạp tích lũy FC sẽ xuất hiện.';
  const { ranges, tier } = extractDateRanges(text);
  assert.equal(tier, 'startEnd');
  assert.equal(ranges.length, 1);
  assert.equal(ranges[0].start.getMonth(), 5); // June
  assert.equal(ranges[0].start.getDate(), 9);
  assert.equal(ranges[0].end.getDate(), 12);
});

test('extractDateRanges: falls back to "Từ ngày X đến Y" when no start/end block', () => {
  const text = 'Từ ngày 13.06 đến 21.06, sự kiện diễn ra tưng bừng.';
  const { ranges, tier } = extractDateRanges(text);
  assert.equal(tier, 'fromTo');
  assert.equal(ranges[0].start.getDate(), 13);
  assert.equal(ranges[0].end.getDate(), 21);
});

test('extractDateRanges: falls back to bare "X - Y" range last', () => {
  const text = 'Khuyến mãi 05.06 - 09.06 cực hot.';
  const { ranges, tier } = extractDateRanges(text);
  assert.equal(tier, 'bare');
  assert.equal(ranges[0].start.getDate(), 5);
  assert.equal(ranges[0].end.getDate(), 9);
});

test('extractDateRanges: empty when no dates present', () => {
  const { ranges, tier } = extractDateRanges('Không có ngày tháng nào ở đây.');
  assert.equal(ranges.length, 0);
  assert.equal(tier, 'none');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test src/services/fcoCrawler.dates.test.mjs`
Expected: FAIL — `extractDateRanges` not exported.

- [ ] **Step 3: Implement `extractDateRanges`**

In `server/src/services/fcoCrawler.js`, add below `computeStatus` (still above the class):

```js
function stripDiacritics(text) {
  if (!text) return '';
  return text
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
}

function convertFcoDate(raw, fallbackYear) {
  const m = raw.match(/(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  let year = fallbackYear;
  if (m[3]) {
    year = parseInt(m[3], 10);
    if (year < 100) year += 2000;
  }
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${d.getFullYear()}`;
}

// Tiered date-range extraction. Returns ONLY the highest-priority tier that matched.
// Priority: startEnd (official block) > fromTo (sentence) > bare (loose range).
export function extractDateRanges(readableText) {
  const norm = stripDiacritics(readableText || '');
  const tiers = [
    ['startEnd', /Bat dau\s*:?.{0,60}?(\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?).{0,120}?Ket thuc\s*:?.{0,60}?(\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?)/gi],
    ['fromTo',  /(?:Tu ngay|Tu|Dien ra tu|Thoi gian(?: dien ra)?\s*:?)\s*(?:\d{1,2}h\d{0,2}\s*ngay\s*)?(\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?)\s*(?:den|toi|[-–—])\s*(?:\d{1,2}h\d{0,2}\s*ngay\s*)?(\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?)/gi],
    ['bare',    /(\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?)\s*[-–—]\s*(\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?)/g],
  ];

  for (const [tier, pattern] of tiers) {
    const seen = new Set();
    const ranges = [];
    for (const match of norm.matchAll(pattern)) {
      const fallbackYear = (`${match[1]} ${match[2]}`.match(/\d{1,2}[./-]\d{1,2}[./-](\d{4})/) || [])[1];
      const yr = fallbackYear ? parseInt(fallbackYear, 10) : new Date().getFullYear();
      const start = convertFcoDate(match[1], yr);
      const end = convertFcoDate(match[2], yr);
      if (!start || !end) continue;
      const startDate = new Date(start);
      let endDate = new Date(end);
      if (endDate < startDate) endDate.setFullYear(endDate.getFullYear() + 1);
      const key = `${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      ranges.push({ start: startDate, end: endDate, label: `${formatDate(startDate)} - ${formatDate(endDate)}` });
    }
    if (ranges.length > 0) return { ranges, tier };
  }
  return { ranges: [], tier: 'none' };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test src/services/fcoCrawler.dates.test.mjs`
Expected: PASS (all tests from Task 1 + Task 2).

---

## Task 3: Add `pickRepresentativeRange` + test

**Files:**
- Modify: `server/src/services/fcoCrawler.js`
- Modify: `server/src/services/fcoCrawler.dates.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `server/src/services/fcoCrawler.dates.test.mjs`:

```js
import { pickRepresentativeRange } from './fcoCrawler.js';

test('pickRepresentativeRange: returns earliest-start range', () => {
  const ranges = [
    { start: new Date(2026, 5, 13), end: new Date(2026, 5, 21) },
    { start: new Date(2026, 5, 9), end: new Date(2026, 5, 12) },
  ];
  const r = pickRepresentativeRange(ranges);
  assert.equal(r.start.getDate(), 9);
});

test('pickRepresentativeRange: null on empty', () => {
  assert.equal(pickRepresentativeRange([]), null);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test src/services/fcoCrawler.dates.test.mjs`
Expected: FAIL — `pickRepresentativeRange` not exported.

- [ ] **Step 3: Implement**

In `server/src/services/fcoCrawler.js`, add below `extractDateRanges`:

```js
// The article's own range: within the chosen tier, the earliest start is the
// canonical event window (cross-promo ranges, if any slipped into a lower tier,
// are never reached because a higher tier already returned).
export function pickRepresentativeRange(ranges) {
  if (!ranges || ranges.length === 0) return null;
  return [...ranges].sort((a, b) => new Date(a.start) - new Date(b.start))[0];
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test src/services/fcoCrawler.dates.test.mjs`
Expected: PASS (all).

---

## Task 4: Wire the pure helpers into the class

**Files:**
- Modify: `server/src/services/fcoCrawler.js` — `getDateRanges` method + the `getEvents` range loop (lines ~113-150)

- [ ] **Step 1: Replace `getDateRanges` method body**

Find the existing `getDateRanges(text) { ... }` method (≈ lines 257-299) and replace its ENTIRE body with a delegation to the pure function:

```js
  getDateRanges(text) {
    return extractDateRanges(text).ranges;
  }
```

(Keep the method for backward compatibility / any other callers. The class methods `convertFcoDate`, `getYearFromDateText`, `formatDate`, `removeDiacritics` can stay as-is — they're now unused by date extraction but removing them is out of scope.)

- [ ] **Step 2: Replace the `getEvents` range loop**

In `getEvents`, replace the block from `const ranges = this.getDateRanges(readable);` through the end of the `for (const range of ranges) { ... }` loop (current lines ≈ 113-150) with:

```js
        const { ranges } = extractDateRanges(readable);
        const range = pickRepresentativeRange(ranges);

        if (!range) {
          results.push({
            title,
            sourceUrl: articleUrl,
            launchUrl,
            dateLabel: 'No public end date found',
            status: 'Unknown',
            sortDate: new Date('2099-12-31'),
            isSubdomain: this.isSubdomain(launchUrl),
            isNewsPage: this.isNewsPage(launchUrl),
          });
          continue;
        }

        const status = computeStatus(range, today);

        results.push({
          title,
          sourceUrl: articleUrl,
          launchUrl,
          dateLabel: range.label,
          status,
          startDate: range.start,
          endDate: range.end,
          sortDate: range.end,
          isSubdomain: this.isSubdomain(launchUrl),
          isNewsPage: this.isNewsPage(launchUrl),
        });
```

Note: this now stores ONE representative range per article (not one row per matched range) and assigns `Expired`/`Active`/`Unknown` correctly. The old "skip ranges not containing today" logic is gone — that was the bug.

- [ ] **Step 3: Verify the module still imports cleanly**

Run: `node -e "import('./src/services/fcoCrawler.js').then(m => console.log('exports:', Object.keys(m), 'default?', typeof m.default))"`
Expected: logs `exports: [ 'computeStatus', 'extractDateRanges', 'pickRepresentativeRange' ] default? function` (named exports + the default class).

- [ ] **Step 4: Run the full offline test suite**

Run: `node --test src/services/fcoCrawler.dates.test.mjs`
Expected: PASS (all tests, 12 total).

---

## Task 5: End-to-end dry verification (offline, no DB write)

**Files:** none (verification only)

- [ ] **Step 1: Run the crawler's parse path against the real saved page WITHOUT touching DB**

A copy of the problem page may already be at `/tmp/event-page.html` (from investigation). If not, fetch it:

```bash
curl -s 'https://fconline.garena.vn/nap-tich-luy-fc-mc-09-06-12-06/' \
  -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36' \
  -o /tmp/event-page.html
```

Then run a standalone check (does NOT import DB or run scan):

```bash
node --input-type=module -e "
import { readFileSync } from 'node:fs';
import { extractDateRanges, pickRepresentativeRange, computeStatus } from './src/services/fcoCrawler.js';
let raw = readFileSync('/tmp/event-page.html','utf8');
let t = raw.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
const { ranges, tier } = extractDateRanges(t);
const r = pickRepresentativeRange(ranges);
console.log('tier:', tier);
console.log('range:', r && r.label);
console.log('status @14Jun:', computeStatus(r, new Date(2026,5,14)));
"
```

Expected output:
```
tier: startEnd
range: 09.06.2026 - 12.06.2026
status @14Jun: Expired
```

This confirms the fix: the article now resolves to its OWN 09–12 window and is correctly `Expired`, instead of borrowing 13–21.

- [ ] **Step 2: (Optional, only when safe) Re-scan to backfill DB**

⚠️ Only if the running job won't conflict. Trigger a fresh scan so stored events get corrected dates (upsert by `launchUrl`):

```bash
curl -X POST http://localhost:5000/api/events/scan
```

Then reload the FE Events view — the 09–12 event should disappear from the valid list, and remaining events should show their true individual date ranges.

---

## Self-Review Notes

- **Spec coverage:** §3.1 tiered priority → Task 2 `extractDateRanges`. §3.2 status from own range → Task 1 `computeStatus` + Task 4 loop. §4 pure functions w/ explicit `today` → Tasks 1-3. §5 offline tests → Tasks 1-3 test steps. §7 criteria → Task 5 dry run asserts `09.06–12.06 / Expired`.
- **Placeholder scan:** none — all code blocks are complete.
- **Type/name consistency:** `extractDateRanges` returns `{ ranges, tier }` everywhere; `pickRepresentativeRange(ranges)` → range|null; `computeStatus(range, today)` → string. Consistent across Tasks 1-5.
- **Regex fidelity:** the three patterns in `extractDateRanges` are copied verbatim from the original `getDateRanges` (same `–—` en/em dashes, same lookahead bounds), so matching behavior is preserved — only tier selection + dedup-per-tier changed.
- **Risk note:** `getEvents` now emits one row per article instead of one per range. `deduplicate()` already keys by `launchUrl`, so downstream behavior is unaffected.
```
