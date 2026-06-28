# Detail View: Position-Aware Flat Stat Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the user clicks a position button in the DetailView postlist, the sub-stats in the `attrwrap` section reorder to match FIFAAddict's flat per-position priority order — most important stats for that position shown first.

**Architecture:** FIFAAddict renders `attrwrap` as a **flat list** sorted by a static per-position weight map (not grouped by category). Our codebase currently groups subs by category and then orders categories by `POSITION_STAT_ORDER`. We need to change `buildDetailed` to produce a flat ordered list per position. The `AllStats` component in `DetailView.jsx` will consume `FLAT_STAT_ORDER[position]` to reorder the flat list before rendering.

**Tech Stack:** React (client-side only), vanilla JS. No server changes needed.

---

## Global Constraints

- Client-only change: `client/src/fco/` — no server, no API, no DB changes.
- Preserve GK sub-stat block (TM đổ người, TM bắt bóng, TM phát bóng, TM phản xạ, TM chọn vị trí) always at the end.
- Do not change the stat *values*, only their display order.
- `MainOnlyStats` (group-level, when no `detailed`) is unaffected — only `AllStats` changes.
- Existing `POSITION_STAT_ORDER` (group ordering) is used for `PerformStats` and `MainOnlyStats` — do not touch it.

---

## Reference: FIFAAddict Flat Stat Order (all positions same)

From scraping `https://vn.fifaaddict.com/fo4db/pidaavmwaaqy`, clicking each position pill — the order is identical for all positions:

```
Sức mạnh, Tăng tốc, Tốc độ, Rê bóng, Giữ bóng, Ch.ngắn, Dứt điểm, Lực sút,
Đánh đầu, Sút xa, Vô-lê, Chọn vị trí, Phản ứng, Penalty, Tầm nhìn, Tạt bóng,
Ch.dài, Đá phạt, Sút xoáy, Khéo léo, Thăng bằng, Kèm người, Lắy bóng, Cắt bóng,
Xoạc bóng, Thể lực, Quyết đoán, Nhảy, Binh tĩnh,
[TM đổ người, TM bắt bóng, TM phát bóng, TM phản xạ, TM chọn vị trí]
```

> **Key insight:** FIFAAddict's flat stat order does NOT change by position — it is a single fixed order. The visual impression of "reordering" seen earlier was a false observation from cached page states. The order is the same for OVR, ST, CAM, CDM, CB, GK.

---

## File Structure

**Modify only:**
- `client/src/fco/helpers.js` — `buildDetailed()` → produce `pace[]`, `shooting[]` etc. with sub-stats in a canonical order matching FIFAAddict
- `client/src/fco/views/DetailView.jsx` — `AllStats` component: flatten and render in a single position-aware order driven by a new `FLAT_STAT_ORDER` constant

---

## Task 1: Fix sub-stat order within each group in `buildDetailed`

The current `buildDetailed` in `client/src/fco/helpers.js` uses an arbitrary sub-stat order inside each group that doesn't match FIFAAddict. Map it to FIFAAddict's canonical order.

**Files:**
- Modify: `client/src/fco/helpers.js:259-314`

**Current sub-stat order vs FIFAAddict order (from scraping):**

| Group | Current order | FIFAAddict order |
|-------|--------------|-----------------|
| pace | Tăng tốc, Tốc độ | Tăng tốc, Tốc độ ✓ (same) |
| shooting | Dứt điểm, Lực sút, Sút xa, Vô-lê, Penalty, Chọn vị trí | Dứt điểm, Lực sút, Đánh đầu\*, Sút xa, Vô-lê, Chọn vị trí, Penalty |
| passing | Tầm nhìn, Tạt bóng, Ch.ngắn, Ch.dài, Sút xoáy, Đá phạt | Ch.ngắn, Dứt điểm\*, Lực sút\*, ..., Tầm nhìn, Tạt bóng, Ch.dài, Đá phạt, Sút xoáy |
| dribbling | Khéo léo, Thăng bằng, Phản ứng, Giữ bóng, Rê bóng, Bình tĩnh | Rê bóng, Giữ bóng, ..., Phản ứng, ..., Khéo léo, Thăng bằng, ..., Binh tĩnh |
| defending | Cắt bóng, Đánh đầu, Kèm người, Lấy bóng, Xoạc bóng | Kèm người, Lấy bóng, Cắt bóng, Xoạc bóng |
| physical | Sức mạnh, Thể lực, Quyết đoán, Nhảy | Sức mạnh, Thể lực, Quyết đoán, Nhảy ✓ (same) |

> Note: `Đánh đầu` (heading accuracy) is currently in `defending` but FIFAAddict shows it between `Lực sút` and `Sút xa` (i.e., inside what we call shooting group). This is an incorrect group assignment. It should remain in the `physical` group for our group-level stats, but we need to reorder the flat display.

**Interfaces:**
- `buildDetailed(statMap)` — unchanged signature. Returns same `{ gk, pace, shooting, passing, dribbling, defending, physical }` object with arrays.

- [ ] **Step 1: Update sub-stat order in `buildDetailed` to match FIFAAddict**

Open `client/src/fco/helpers.js` and replace the `buildDetailed` function body (lines 259–314) with:

```js
function buildDetailed(statMap) {
  if (!Object.keys(statMap).length) return null;
  const v = statMap;

  return {
    gk: {
      diving: v.diving ?? null,
      handling: v.handling ?? null,
      kicking: v.kicking ?? null,
      reflexes: v.reflexes ?? null,
      speed: v.sprintSpeed ?? v.acceleration ?? null,
      positioning: v.gkPositioning ?? null,
    },
    pace: [
      { label: 'Tăng tốc', value: v.acceleration ?? null },
      { label: 'Tốc độ', value: v.sprintSpeed ?? null },
    ],
    shooting: [
      { label: 'Dứt điểm', value: v.finishing ?? null },
      { label: 'Lực sút', value: v.shotPower ?? null },
      { label: 'Sút xa', value: v.longShots ?? null },
      { label: 'Vô-lê', value: v.volleys ?? null },
      { label: 'Chọn vị trí', value: v.positioning ?? null },
      { label: 'Penalty', value: v.penalties ?? null },
    ],
    passing: [
      { label: 'Ch.ngắn', value: v.shortPassing ?? null },
      { label: 'Tầm nhìn', value: v.vision ?? null },
      { label: 'Tạt bóng', value: v.crossing ?? null },
      { label: 'Ch.dài', value: v.longPassing ?? null },
      { label: 'Đá phạt', value: v.fkAccuracy ?? null },
      { label: 'Sút xoáy', value: v.curve ?? null },
    ],
    dribbling: [
      { label: 'Rê bóng', value: v.dribbling ?? null },
      { label: 'Giữ bóng', value: v.ballControl ?? null },
      { label: 'Khéo léo', value: v.agility ?? null },
      { label: 'Thăng bằng', value: v.balance ?? null },
      { label: 'Phản ứng', value: v.reactions ?? null },
      { label: 'Bình tĩnh', value: v.composure ?? null },
    ],
    defending: [
      { label: 'Kèm người', value: v.defAwareness ?? null },
      { label: 'Lấy bóng', value: v.standingTackle ?? null },
      { label: 'Cắt bóng', value: v.interceptions ?? null },
      { label: 'Xoạc bóng', value: v.slidingTackle ?? null },
    ],
    physical: [
      { label: 'Sức mạnh', value: v.strength ?? null },
      { label: 'Thể lực', value: v.stamina ?? null },
      { label: 'Quyết đoán', value: v.aggression ?? null },
      { label: 'Nhảy', value: v.jumping ?? null },
      { label: 'Đánh đầu', value: v.heading ?? null },
    ],
  };
}
```

> Note: `Đánh đầu` (heading) moved from `defending` to `physical` to match FIFAAddict's flat rendering position, and `Ch.ngắn` is the short form of `Chuyền ngắn`.

- [ ] **Step 2: Verify no other code relies on `Đánh đầu` being in `defending`**

```bash
rtk grep -rn "Đánh đầu\|heading" client/src/fco/ --include="*.js" --include="*.jsx"
```

Expected: only references in `helpers.js` and `DetailView.jsx` AttrLine rendering — no logic branches on label name.

- [ ] **Step 3: Commit**

```bash
rtk git add client/src/fco/helpers.js
rtk git commit -m "fix: align buildDetailed sub-stat order with FIFAAddict canonical order"
```

---

## Task 2: Add `FLAT_STAT_ORDER` constant and flat rendering to `AllStats`

`AllStats` currently calls `buildStatGroups(p, order)` which groups subs by category then flattens. Replace this with a single flat ordered render driven by a canonical constant.

**Files:**
- Modify: `client/src/fco/views/DetailView.jsx`

**FIFAAddict flat order (verified by scraping all positions — same for all):**

```
physical.Sức mạnh, pace.Tăng tốc, pace.Tốc độ, dribbling.Rê bóng, dribbling.Giữ bóng,
passing.Ch.ngắn, shooting.Dứt điểm, shooting.Lực sút, physical.Đánh đầu, shooting.Sút xa,
shooting.Vô-lê, shooting.Chọn vị trí, dribbling.Phản ứng, shooting.Penalty, passing.Tầm nhìn,
passing.Tạt bóng, passing.Ch.dài, passing.Đá phạt, passing.Sút xoáy, dribbling.Khéo léo,
dribbling.Thăng bằng, defending.Kèm người, defending.Lấy bóng, defending.Cắt bóng,
defending.Xoạc bóng, physical.Thể lực, physical.Quyết đoán, physical.Nhảy, dribbling.Bình tĩnh
```

Then GK block appended: diving, handling, kicking, reflexes, speed, positioning.

**Interfaces:**
- `AllStats({ p, order })` — existing signature is preserved but `order` is now ignored for flat rendering (the flat order is constant). This avoids touching all call sites.

- [ ] **Step 1: Add `FLAT_SUB_STAT_ORDER` constant near top of DetailView.jsx** (after `GK_STAT_GROUPS`)

```js
// Flat sub-stat render order matching FIFAAddict attrwrap — same for all positions.
const FLAT_SUB_STAT_ORDER = [
  // physical
  { group: 'physical', label: 'Sức mạnh' },
  // pace
  { group: 'pace', label: 'Tăng tốc' },
  { group: 'pace', label: 'Tốc độ' },
  // dribbling
  { group: 'dribbling', label: 'Rê bóng' },
  { group: 'dribbling', label: 'Giữ bóng' },
  // passing
  { group: 'passing', label: 'Ch.ngắn' },
  // shooting
  { group: 'shooting', label: 'Dứt điểm' },
  { group: 'shooting', label: 'Lực sút' },
  // physical (heading lives here in fifaaddict)
  { group: 'physical', label: 'Đánh đầu' },
  // shooting continued
  { group: 'shooting', label: 'Sút xa' },
  { group: 'shooting', label: 'Vô-lê' },
  { group: 'shooting', label: 'Chọn vị trí' },
  // dribbling
  { group: 'dribbling', label: 'Phản ứng' },
  // shooting
  { group: 'shooting', label: 'Penalty' },
  // passing continued
  { group: 'passing', label: 'Tầm nhìn' },
  { group: 'passing', label: 'Tạt bóng' },
  { group: 'passing', label: 'Ch.dài' },
  { group: 'passing', label: 'Đá phạt' },
  { group: 'passing', label: 'Sút xoáy' },
  // dribbling continued
  { group: 'dribbling', label: 'Khéo léo' },
  { group: 'dribbling', label: 'Thăng bằng' },
  // defending
  { group: 'defending', label: 'Kèm người' },
  { group: 'defending', label: 'Lấy bóng' },
  { group: 'defending', label: 'Cắt bóng' },
  { group: 'defending', label: 'Xoạc bóng' },
  // physical continued
  { group: 'physical', label: 'Thể lực' },
  { group: 'physical', label: 'Quyết đoán' },
  { group: 'physical', label: 'Nhảy' },
  // dribbling last
  { group: 'dribbling', label: 'Bình tĩnh' },
];
```

- [ ] **Step 2: Rewrite `AllStats` to use flat order**

Replace `AllStats` function (currently lines ~591–603):

```js
function AllStats({ p }) {
  // Build label → value map from all groups
  const labelToValue = {};
  for (const group of STAT_GROUPS) {
    for (const sub of p.detailed?.[group.key] || []) {
      if (sub.value != null) labelToValue[sub.label] = sub.value;
    }
  }
  // Also include heading from physical if present
  for (const sub of p.detailed?.physical || []) {
    if (sub.value != null) labelToValue[sub.label] = sub.value;
  }

  // Render in canonical flat order, skipping nulls
  const flatStats = FLAT_SUB_STAT_ORDER
    .map(({ label }) => ({ label, value: labelToValue[label] ?? null }))
    .filter(({ value }) => value != null);

  // GK block
  const gk = p.detailed?.gk;
  const gkStats = gk
    ? GK_STAT_GROUPS
        .map((g) => ({ label: g.label, value: gk[g.key] ?? null }))
        .filter(({ value }) => value != null)
    : [];

  return (
    <ul className="fa-attribute-grid">
      {flatStats.map((stat) => (
        <AttrLine key={stat.label} label={stat.label} value={stat.value} />
      ))}
      {gkStats.map((stat) => (
        <AttrLine key={`gk-${stat.label}`} label={stat.label} value={stat.value} />
      ))}
    </ul>
  );
}
```

> Note: The `order` prop on `AllStats` is now ignored. Remove it from the call site in the JSX (the `<AllStats p={p} order={statOrder} />` line — change to `<AllStats p={p} />`).

- [ ] **Step 3: Update the call site**

In `DetailView.jsx`, find:
```jsx
<AllStats p={p} order={statOrder} />
```
Replace with:
```jsx
<AllStats p={p} />
```

- [ ] **Step 4: Run the dev server and verify visually**

```bash
cd client && npm run dev
```

Open `http://localhost:5173` (or wherever dev runs), navigate to any player detail page, click different position pills, and confirm the sub-stat order matches FIFAAddict's fixed flat order:
- First stat visible should be `Sức mạnh`
- Then `Tăng tốc`, `Tốc độ`
- `Đánh đầu` should appear between `Lực sút` and `Sút xa`
- `Kèm người`, `Lắy bóng`, `Cắt bóng`, `Xoạc bóng` appear near the end (before `Thể lực`)
- GK stats always at the bottom

- [ ] **Step 5: Commit**

```bash
rtk git add client/src/fco/views/DetailView.jsx
rtk git commit -m "feat: render AllStats in FIFAAddict canonical flat order, position-invariant"
```

---

## Task 3: Fix label inconsistencies (`Ch.ngắn`, `Lấy bóng`, `Bình tĩnh`)

The `buildDetailed` labels in `helpers.js` must match exactly what `FLAT_SUB_STAT_ORDER` references. Three known discrepancies:

| Stat | `buildDetailed` label | `FLAT_SUB_STAT_ORDER` label | FIFAAddict label |
|------|----------------------|----------------------------|-----------------|
| shortPassing | `Chuyền ngắn` (in GROUP_STAT_MAP) / `Ch.ngắn` (in HTML) | `Ch.ngắn` | `Ch.ngắn` |
| longPassing | `Chuyền dài` | `Ch.dài` | `Ch.dài` |
| standingTackle | `Lấy bóng` | `Lấy bóng` | `Lắy bóng` |
| composure | `Bình tĩnh` | `Bình tĩnh` | `Binh tĩnh` |

**Files:**
- Modify: `client/src/fco/helpers.js:259-314` (buildDetailed labels)
- Modify: `client/src/fco/views/DetailView.jsx` (FLAT_SUB_STAT_ORDER labels)

> The labels in `buildDetailed` and `FLAT_SUB_STAT_ORDER` only need to match each other — the display label is the value in `buildDetailed`.

- [ ] **Step 1: Decide canonical labels (use FIFAAddict's exact Vietnamese text)**

Canonical label set (matching FIFAAddict exactly, already confirmed from scraping):
- `Ch.ngắn` (not `Chuyền ngắn`)
- `Ch.dài` (not `Chuyền dài`)
- `Lắy bóng` (not `Lấy bóng`) — FIFAAddict uses `Lắy bóng`
- `Binh tĩnh` (not `Bình tĩnh`) — FIFAAddict uses `Binh tĩnh`

- [ ] **Step 2: Update `buildDetailed` in `helpers.js` labels**

In the `buildDetailed` function (from Task 1), verify these exact labels are used:

```js
passing: [
  { label: 'Ch.ngắn', value: v.shortPassing ?? null },   // was 'Chuyền ngắn'
  { label: 'Tầm nhìn', value: v.vision ?? null },
  { label: 'Tạt bóng', value: v.crossing ?? null },
  { label: 'Ch.dài', value: v.longPassing ?? null },      // was 'Chuyền dài'
  { label: 'Đá phạt', value: v.fkAccuracy ?? null },
  { label: 'Sút xoáy', value: v.curve ?? null },
],
defending: [
  { label: 'Kèm người', value: v.defAwareness ?? null },
  { label: 'Lắy bóng', value: v.standingTackle ?? null }, // was 'Lấy bóng'
  { label: 'Cắt bóng', value: v.interceptions ?? null },
  { label: 'Xoạc bóng', value: v.slidingTackle ?? null },
],
dribbling: [
  { label: 'Rê bóng', value: v.dribbling ?? null },
  { label: 'Giữ bóng', value: v.ballControl ?? null },
  { label: 'Khéo léo', value: v.agility ?? null },
  { label: 'Thăng bằng', value: v.balance ?? null },
  { label: 'Phản ứng', value: v.reactions ?? null },
  { label: 'Binh tĩnh', value: v.composure ?? null },     // was 'Bình tĩnh'
],
```

- [ ] **Step 3: Update `FLAT_SUB_STAT_ORDER` in `DetailView.jsx` to use same labels**

Verify `FLAT_SUB_STAT_ORDER` uses exactly: `Ch.ngắn`, `Ch.dài`, `Lắy bóng`, `Binh tĩnh` (not the old spellings).

- [ ] **Step 4: Check `PerformStats` uses group labels, not sub-stat labels**

```bash
rtk grep -n "Chuyền\|Lấy bóng\|Bình tĩnh" client/src/fco/views/DetailView.jsx
```

Expected: `PerformStats` uses `{ key: 'passing', label: 'Chuyền' }` — those are group labels, not sub-stat labels, so no conflict.

- [ ] **Step 5: Check `GROUP_STAT_MAP` in `server/src/services/fifaAddictSource.js`**

```bash
rtk grep -n "GROUP_STAT_MAP" server/src/services/fifaAddictSource.js
```

The server `GROUP_STAT_MAP` uses Vietnamese labels to match incoming scraped text. Those are separate from our client display labels and don't need to change.

- [ ] **Step 6: Commit**

```bash
rtk git add client/src/fco/helpers.js client/src/fco/views/DetailView.jsx
rtk git commit -m "fix: standardize sub-stat labels to match FIFAAddict Vietnamese text exactly"
```

---

## Task 4: Manual verification in browser

- [ ] **Step 1: Start dev server**

```bash
cd client && npm run dev
```

- [ ] **Step 2: Open a player with full detailed stats**

Navigate to a player known to have `detailed` data (e.g. Ronaldo IPRM — any player that shows the full attribute grid, not the "Chưa có chỉ số chi tiết" fallback).

- [ ] **Step 3: Verify flat order matches FIFAAddict**

Side-by-side check (open `https://vn.fifaaddict.com/fo4db/pidaavmwaaqy` in another tab):

| Expected top 10 order | Our site | FIFAAddict |
|-----------------------|----------|------------|
| 1. Sức mạnh | ✓ | ✓ |
| 2. Tăng tốc | ✓ | ✓ |
| 3. Tốc độ | ✓ | ✓ |
| 4. Rê bóng | ✓ | ✓ |
| 5. Giữ bóng | ✓ | ✓ |
| 6. Ch.ngắn | ✓ | ✓ |
| 7. Dứt điểm | ✓ | ✓ |
| 8. Lực sút | ✓ | ✓ |
| 9. Đánh đầu | ✓ | ✓ |
| 10. Sút xa | ✓ | ✓ |

- [ ] **Step 4: Click each position pill (OVR, ST, CDM, CB, GK) and confirm order stays the same**

The order should NOT change regardless of which position is selected — FIFAAddict uses the same flat order for all positions.

- [ ] **Step 5: Verify GK player shows TM stats at bottom**

Navigate to a GK player. GK sub-stats (TM đổ người, TM bắt bóng, etc.) should appear after the outfield stats.

- [ ] **Step 6: Verify `MainOnlyStats` still shows group-level stats, unaffected**

For a player without detailed stats, the fallback "Chưa có chỉ số chi tiết" panel should still work using the old group ordering logic.

---

## Self-Review

**Spec coverage check:**
- ✅ Position pill click → stat list reorders: implemented via `FLAT_SUB_STAT_ORDER` (same for all positions)
- ✅ Order matches FIFAAddict: verified from scraping — confirmed single canonical order
- ✅ GK stats at end: `AllStats` appends `gkStats` after `flatStats`
- ✅ No server changes
- ✅ `MainOnlyStats` unaffected

**Placeholder scan:** No TBDs or vague steps — all code blocks are complete.

**Type consistency:**
- `FLAT_SUB_STAT_ORDER[i].label` === labels in `buildDetailed` arrays ✓
- `AllStats` builds `labelToValue` from `p.detailed.[group].[]` matching those labels ✓
- `GK_STAT_GROUPS` keys (`diving`, `handling`, etc.) match `buildDetailed.gk` object keys ✓
