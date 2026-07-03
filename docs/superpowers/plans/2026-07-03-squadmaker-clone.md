# FCO Squadmaker Clone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clone the fifaaddict.com FCO Squadmaker pitch-builder UI into fco-hub's `SquadView`, working entirely on localStorage persistence (no auth/server changes).

**Architecture:** Extend existing `squadHelpers.js` (formations/state), `teamColor.js` (bonus calc), `SquadView.jsx` (UI) in place. Add new small focused files for: formation coordinate data research output, player-edit-modal, desktop-rail, search-modal filters. Team Color real data (thresholds/buffs/link catalogs/icons) is out of scope for this plan — a separate research task produces `client/src/fco/teamColorData.js` which this plan's UI consumes via existing exports from `teamColor.js`, keeping current placeholder thresholds until that data lands.

**Tech Stack:** React (client/src/fco), plain JS, CSS in `fco.css`, existing `fetchPlayers`/`fetchPlayerDetail` API, localStorage persistence via `squadHelpers.js`.

## Global Constraints

- No server changes, no auth changes, no `SquadPlan` model — out of scope (deferred, see note file Phần 5).
- Desktop-rail breakpoint: `min-width: 1121px` (matches existing `1120px` breakpoint used elsewhere in `fco.css`).
- `MonetizationSlot` placement name for the new rail ad slot: `squad-builder-sidebar-top`.
- Squad bonus stays on the existing `upgradeLevel` (FO4 Grade 1-13) + `teamColorBonus` model in `teamColor.js`/`squadHelpers.js` — do NOT introduce `detailBonus.js`'s `grade/level/teamColorBonus` model into Squad.
- All new Vietnamese UI copy follows existing tone in `SquadView.jsx`/`DetailView.jsx` (informal, no exclamation spam).
- Every task must leave `SquadView` in a working, manually-verifiable state (run `npm run dev` in `client/`, visit `/doi-hinh`).

---

## Task 1: Research real formation coordinates (39 formations)

**Files:**
- Create: `docs/superpowers/plans/2026-07-03-formation-coords-research.md` (raw findings, intermediate artifact)
- Modify: `client/src/fco/squadHelpers.js` (replace `FORMATIONS` with all 39 entries)

**Interfaces:**
- Produces: `FORMATIONS` object keyed by formation id string (e.g. `'3-4-3'`, `'3-4-3-2'` for the `(2)` variant — see naming rule below), each entry `{ id, label, slots: [{ id, pos, x, y }] }`. `x`/`y` are percentages (0-100) of pitch container, top-left origin, matching the existing convention (`y: 91` = near own goal, `y: 14` = near opponent goal).
- Consumes: nothing new — `getFormationSlots`, `mapSquadToFormation` in the same file already operate generically on `FORMATIONS[id].slots`.

This is a research + data-entry task, not exploratory coding. Dispatch it as an isolated research pass before touching UI, since every later task in Phần 1/2/4 reads `slot.x`/`slot.y`/`slot.pos`.

- [ ] **Step 1: Capture the real layout for all 39 formations from fifaaddict**

Visit `https://fifaaddict.com/vn/fco-squadmaker/` (or wherever the formation selector lives on that site) using a browser tool. For each of the 39 formation names below, select it and record every slot's role code and approximate on-pitch (x%, y%) position by reading the rendered card positions (inspect DOM style `left`/`top` percentages directly if the site uses percentage-based absolute positioning — this is the fastest, most accurate method; do not eyeball pixel positions if percentages are readable in devtools).

Formation list (39 total, `(2)` suffix = distinct layout variant of the same numeric shape):
```
3-4-3, 3-4-3(2), 3-4-1-2, 3-2-3-2, 3-2-2-1-2, 3-1-2-1-3, 3-1-4-2,
4-5-1, 4-4-2, 4-4-2(2), 4-4-1-1, 4-3-3, 4-3-3(2),
4-3-2-1, 4-3-1-2, 4-2-4, 4-2-3-1, 4-2-2-2, 4-2-2-2(2), 4-2-2-1-1,
4-2-1-3, 4-2-1-3(2), 4-1-4-1, 4-1-3-2,
4-1-2-3, 4-1-2-3(2), 4-1-2-1-2, 4-1-2-1-2(2),
5-4-1, 5-3-2, 5-2-3, 5-2-1-2, 5-1-2-1-1
```

Naming rule for duplicate numeric ids (avoids clashing with the existing 5 formations already coded, which use plain numeric ids like `'4-3-3'`): give the `(2)` variant the id `'<shape>-alt'`, e.g. `4-3-3(2)` → id `'4-3-3-alt'`, label stays `'4-3-3 (2)'` for display. Apply consistently to all 8 `(2)` variants in the list.

Write raw findings (slot list with x/y per formation) to `docs/superpowers/plans/2026-07-03-formation-coords-research.md` as you go — this is your scratch pad, not user-facing.

- [ ] **Step 2: Cross-check position codes against `POSITIONS_META`**

Read `client/src/fco/constants.js` `POSITIONS_META` keys (the valid position codes already known to the app: GK, LB, CB, RB, LWB, RWB, CDM, CM, CAM, LM, RM, LAM, RAM, ST, CF, LW, RW — confirm exact list by reading the file). Every `pos` value you recorded in Step 1 must map to one of these. If fifaaddict uses a code not in `POSITIONS_META` (e.g. some formations may use `CF` or `LF`/`RF`), note it explicitly in the research file — do not silently rename it to something already in the list.

- [ ] **Step 3: Write the full `FORMATIONS` object**

Open `client/src/fco/squadHelpers.js`. Replace the existing `FORMATIONS` object (lines defining the 7 current formations) with all 39, using the exact ids and x/y values captured in Step 1. Keep the existing 7 formations' coordinates if your research confirms they already match fifaaddict (don't regenerate ones that are already correct — compare against your findings and only fix what's wrong).

Each formation entry follows this exact shape (example for one entry):

```js
'4-3-3': {
  id: '4-3-3',
  label: '4-3-3',
  slots: [
    { id: 'gk', pos: 'GK', x: 50, y: 91 },
    { id: 'lb', pos: 'LB', x: 14, y: 73 },
    { id: 'cb1', pos: 'CB', x: 38, y: 78 },
    { id: 'cb2', pos: 'CB', x: 62, y: 78 },
    { id: 'rb', pos: 'RB', x: 86, y: 73 },
    { id: 'cdm', pos: 'CDM', x: 50, y: 58 },
    { id: 'cm1', pos: 'CM', x: 30, y: 46 },
    { id: 'cm2', pos: 'CM', x: 70, y: 46 },
    { id: 'lw', pos: 'LW', x: 18, y: 22 },
    { id: 'st', pos: 'ST', x: 50, y: 15 },
    { id: 'rw', pos: 'RW', x: 82, y: 22 },
  ],
},
```

`slot.id` must be unique within the formation (use `pos.toLowerCase()` + a numeric suffix when there are duplicates of the same position, matching the existing convention e.g. `cb1`/`cb2`).

- [ ] **Step 4: Verify slot count per formation matches the shape name**

Write a throwaway Node check (run via `node -e`) that imports nothing (plain copy-paste the object literal isn't feasible via `node -e` with ESM easily) — instead, manually verify by eye: for shape name `A-B-C` (e.g. `4-2-3-1`), total outfield slots = A+B+C+... and total slots (incl. GK) = sum + 1 = 11. Cross-check each of the 39 entries sums to exactly 11 slots. Fix any that don't.

- [ ] **Step 5: Manual verification in the app**

Run `cd client && rtk npm run dev`. Navigate to `/doi-hinh`. For at least 5 formations spread across the list (one 3-back, one 4-back, one 5-back, one `(2)` variant, one exotic like `4-1-2-3`), switch the formation selector and visually confirm all 11 slots render at sensible pitch positions (no overlapping slots, GK at bottom, forwards at top, no slot outside pitch bounds).

- [ ] **Step 6: Commit**

```bash
rtk git add client/src/fco/squadHelpers.js docs/superpowers/plans/2026-07-03-formation-coords-research.md
rtk git commit -m "feat(squad): add all 39 fifaaddict formations with real coordinates"
```

---

## Task 2: FIFAAddict-style slot dragging — custom layout, role changes, occupant swap

**Files:**
- Modify: `client/src/fco/squadHelpers.js`
- Modify: `client/src/fco/views/SquadView.jsx`
- Modify: `client/src/fco/fco.css` if needed for drag visual state
- Test: manual browser verification on `/doi-hinh`

**Corrected scope from FIFAAddict research:**
- Every non-GK position card is draggable whether it is empty or filled.
- Dragging updates the slot/card `x`/`y` coordinates freely inside pitch bounds, not only by dropping onto another slot.
- While dragging, the slot role changes to the closest allowed role zone (`ST`, `CM`, `LCB`, etc.). The displayed role follows the new zone.
- If the released role is already occupied by another slot/card, the dragged slot and occupant swap coordinates/roles; player assignments move with the slot that was dragged.
- GK remains fixed.
- Once any slot is custom-dragged, the squad persists `customSlots` in localStorage. Selecting a preset formation resets `customSlots` and remaps players into the preset via existing `mapSquadToFormation`.

**Interfaces:**
- `loadSquad()` / `saveSquad()` persist `{ formationId, bySlotId, customSlots? }`.
- New helper `normalizeSquadSlots(slots)` returns safe slot objects with unique ids, `pos`, `x`, `y`.
- New helper `getActiveSquadSlots(squad)` returns `squad.customSlots` when present, otherwise `getFormationSlots(squad.formationId)`.
- Existing `swapSquadSlots` and `movePlayerToSlot` remain available for click-mode fallback, but pointer dragging is the primary behavior.

- [ ] **Step 1: Update persistence helpers for `customSlots`**

Extend `loadSquad()` and `saveSquad()` so custom slot coordinates survive reloads. Validate custom slots defensively: array length 11, unique ids, finite x/y inside 0-100, known position metadata.

- [ ] **Step 2: Render active slots from custom layout when present**

In `SquadView.jsx`, compute `slots` from `getActiveSquadSlots(squad)` instead of only `getFormationSlots(formationId)`. Formation preset buttons still list the researched fifaaddict presets; clicking one resets `customSlots` to `null` and uses `mapSquadToFormation` to place existing players.

- [ ] **Step 3: Add pointer-drag slot layout behavior**

Replace HTML5 card-only drag/drop with pointer events on the whole `.fco-squad-slot`. On pointer down for any non-GK slot, capture starting pointer and slot `{ x, y, pos }`. On pointer move, clamp x to `[5, 95]` and y to `[10, gkY - 0.1]`, resolve the closest role zone, and render live slot movement. On pointer up, persist the new custom layout.

- [ ] **Step 4: Swap custom slots when released into an occupied role**

If another slot already has the final role, swap the dragged slot's previous `{ pos, x, y }` with that occupant's current `{ pos, x, y }`, matching fifaaddict's occupant behavior. Player assignments stay keyed by slot id, so the dragged card/player moves with its slot.

- [ ] **Step 5: Keep click move-mode fallback working**

Until Task 12 removes the old move button, keep click-based move/swap behavior functional for users who click the old "đổi vị trí" icon.

- [ ] **Step 6: Manual verification**

With the dev server already running, go to `/doi-hinh`. Verify: empty non-GK slots can be dragged; filled non-GK slots can be dragged; GK cannot be dragged; dragging into free space changes x/y and role label; dragging into an occupied role swaps the two slots; custom layout survives reload; selecting a preset formation resets the custom layout and remaps players.

- [ ] **Step 7: Commit**

```bash
rtk git add client/src/fco/squadHelpers.js client/src/fco/views/SquadView.jsx client/src/fco/fco.css docs/superpowers/plans/2026-07-03-squadmaker-clone.md
rtk git commit -m "feat(squad): add fifaaddict-style custom slot dragging"
```

---

## Task 3: OVR-by-slot-position with fallback badge

**Files:**
- Create: `client/src/fco/positionOvr.js`
- Modify: `client/src/fco/views/SquadView.jsx`
- Modify: `client/src/fco/ui.jsx` (`PlayerCardMini`)
- Modify: `client/src/fco/fco.css`

**Interfaces:**
- Produces (in `positionOvr.js`): `getOvrForSlotPosition(player, slotPos)` → returns `{ value: number, isFallback: boolean }`. `value` is the position-specific OVR from `player.positionRatings` when a matching entry exists (case-insensitive match on `rating.label === slotPos`), otherwise `player.ovr` with `isFallback: true`.
- Consumes: `player.positionRatings` (array of `{ code, label, value, recommended }`, already normalized by `normalizePlayer` in `helpers.js`), `player.ovr`.
- Consumes (in `PlayerCardMini`): new prop `ovrIsFallback` (boolean) to render the warning indicator.

- [ ] **Step 1: Write `getOvrForSlotPosition`**

Create `client/src/fco/positionOvr.js`:

```js
export function getOvrForSlotPosition(player, slotPos) {
  if (!player) return { value: 0, isFallback: false };
  const targetPos = String(slotPos || '').toUpperCase();
  const rating = (player.positionRatings || []).find(
    (r) => String(r.label || '').toUpperCase() === targetPos
  );
  if (rating && rating.value != null) {
    return { value: rating.value, isFallback: false };
  }
  return { value: player.ovr ?? 0, isFallback: true };
}
```

- [ ] **Step 2: Use it in `SquadView.jsx` where the card is rendered**

Find where `PlayerCardMini` is rendered inside the slot-mapping loop (currently passes `ovr={boosted.ovr}`). Import `getOvrForSlotPosition` from `../positionOvr.js`. Before the `applySquadBonus` call, compute the position-specific base OVR and feed it through the existing bonus-application step instead of `player.ovr`:

```js
const positionOvr = getOvrForSlotPosition(player, slot.pos);
const bonus = getPlayerSquadBonus(squadBonuses.perPlayer, player);
const boosted = applySquadBonus({ ...player, ovr: positionOvr.value }, bonus);
```

Pass the fallback flag through to the card:

```jsx
<PlayerCardMini
  player={player}
  slotPos={slot.pos}
  ovr={boosted.ovr}
  ovrIsFallback={positionOvr.isFallback}
  bonus={bonus}
  level={player.upgradeLevel}
  onClick={() => setPickerSlotId(slot.id)}
/>
```

- [ ] **Step 3: Render the fallback warning in `PlayerCardMini`**

Open `client/src/fco/ui.jsx`, find `PlayerCardMini`. Add `ovrIsFallback = false` to the destructured props. Inside `fco-player-card-mini-top` span (where OVR is rendered), add a warning icon next to the OVR value when the flag is set:

```jsx
<span className="fco-player-card-mini-top">
  <span className="fco-player-card-mini-ovr" style={{ color: statColor(ovr ?? player?.ovr) }}>
    {ovr ?? player?.ovr}
  </span>
  {ovrIsFallback && (
    <I.Alert size={11} className="fco-player-card-mini-ovr-warn" title="Không có chỉ số theo vị trí này, đang dùng OVR gốc" />
  )}
  <span className="fco-player-card-mini-pos">{slotPos || player?.primaryPos}</span>
</span>
```

- [ ] **Step 4: Add the warning icon style to `fco.css`**

Add near the existing `.fco-player-card-mini-*` rules:

```css
.fco-player-card-mini-ovr-warn {
  color: #ff8a3d;
  margin-left: 2px;
  flex: 0 0 auto;
}
```

- [ ] **Step 5: Manual verification**

Run the dev server, go to `/doi-hinh`. Place a player whose `primaryPos` differs from a slot's `pos` (e.g. put a striker into a CB slot) and confirm the OVR shown changes to the position-rated value (or shows the warning icon + original OVR, if that player has no CB rating). Place a player in their natural position slot and confirm no warning icon appears and the OVR matches their normal position rating.

- [ ] **Step 6: Commit**

```bash
rtk git add client/src/fco/positionOvr.js client/src/fco/views/SquadView.jsx client/src/fco/ui.jsx client/src/fco/fco.css
rtk git commit -m "feat(squad): show position-specific OVR on pitch cards with fallback warning"
```

---

## Task 4: Salary summary card with configurable cap

**Files:**
- Create: `client/src/fco/squadSummary.js`
- Modify: `client/src/fco/views/SquadView.jsx`
- Modify: `client/src/fco/fco.css`

**Interfaces:**
- Produces (in `squadSummary.js`): `getSquadSalaryTotal(starters)` → number (sum of `player.salary` across the array, treating missing/non-finite as 0). `DEFAULT_SALARY_CAP = 300`, `MAX_SALARY_CAP = 9999`.
- Consumes: `starters` (array of player objects, already available in `SquadView.jsx` via `getStartersFromSquad`).

- [ ] **Step 1: Write the salary helper**

Create `client/src/fco/squadSummary.js`:

```js
export const DEFAULT_SALARY_CAP = 300;
export const MAX_SALARY_CAP = 9999;

export function getSquadSalaryTotal(starters) {
  return (starters || []).reduce((sum, player) => {
    const salary = Number(player?.salary);
    return sum + (Number.isFinite(salary) ? salary : 0);
  }, 0);
}
```

- [ ] **Step 2: Add salary cap state and summary card to `SquadView.jsx`**

Add state near the top of the component (alongside existing `useState` calls):

```js
const [salaryCap, setSalaryCap] = useState(DEFAULT_SALARY_CAP);
```

Import `DEFAULT_SALARY_CAP, MAX_SALARY_CAP, getSquadSalaryTotal` from `../squadSummary.js`.

Compute the total alongside the existing `squadBonuses` memo:

```js
const salaryTotal = useMemo(() => getSquadSalaryTotal(starters), [starters]);
const isOverSalaryCap = salaryTotal > salaryCap;
```

Add a summary card block right above `fco-squad-toolbar` (new markup, new wrapping div `fco-squad-summary`):

```jsx
<div className="fco-squad-summary">
  <div className={`fco-squad-summary-card${isOverSalaryCap ? ' is-over-limit' : ''}`}>
    <div className="fco-squad-summary-label">Tổng lương</div>
    <div className="fco-squad-summary-value">
      {salaryTotal} / <input
        type="number"
        min={0}
        max={MAX_SALARY_CAP}
        value={salaryCap}
        onChange={(e) => {
          const next = Math.max(0, Math.min(MAX_SALARY_CAP, Number(e.target.value) || 0));
          setSalaryCap(next);
        }}
        className="fco-squad-summary-cap-input"
      />
    </div>
  </div>
</div>
```

- [ ] **Step 3: Style the summary card in `fco.css`**

Add:

```css
.fco-squad-summary { display: flex; gap: 12px; margin-bottom: 14px; }
.fco-squad-summary-card {
  background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px;
  padding: 10px 14px; display: flex; flex-direction: column; gap: 4px;
}
.fco-squad-summary-card.is-over-limit { border-color: rgba(226,86,111,.5); background: rgba(226,86,111,.08); }
.fco-squad-summary-label { font-size: 11.5px; color: var(--text-faint); }
.fco-squad-summary-value { font-family: var(--mono); font-weight: 700; font-size: 15px; display: flex; align-items: center; gap: 4px; }
.fco-squad-summary-cap-input {
  width: 64px; background: transparent; border: 1px solid var(--border); border-radius: 6px;
  color: var(--text); font-family: var(--mono); font-size: 13px; padding: 2px 6px;
}
```

- [ ] **Step 4: Manual verification**

Run the dev server, add several players with nonzero salary to the squad, confirm the total updates live. Lower the cap input below the current total and confirm the card turns into the "over limit" visual state. Raise it back above and confirm it clears.

- [ ] **Step 5: Commit**

```bash
rtk git add client/src/fco/squadSummary.js client/src/fco/views/SquadView.jsx client/src/fco/fco.css
rtk git commit -m "feat(squad): add salary summary card with configurable cap"
```

---

## Task 5: OVR-by-line summary card (GK/DF/MF/FW)

**Files:**
- Modify: `client/src/fco/squadSummary.js`
- Modify: `client/src/fco/views/SquadView.jsx`
- Modify: `client/src/fco/fco.css`

**Interfaces:**
- Consumes: `POSITIONS_META` (`constants.js`, already has `group` field: `GK`/`DEF`/`MID`/`FWD` per position code), `getOvrForSlotPosition` (from Task 3, `positionOvr.js`).
- Produces (in `squadSummary.js`): `getLineAverages(slots, bySlotId)` → `{ GK: number|null, DEF: number|null, MID: number|null, FWD: number|null, overall: number|null }`. Each value is the rounded average of `getOvrForSlotPosition(player, slot.pos).value` for filled slots in that group; `null` if the group has zero filled slots. `overall` is the average across all filled slots (not the average of the 4 group averages — matches "average of all 11 players" semantics, since group sizes are uneven).

- [ ] **Step 1: Add `getLineAverages` to `squadSummary.js`**

Import `POSITIONS_META` from `./constants.js` and `getOvrForSlotPosition` from `./positionOvr.js` at the top of `squadSummary.js`. Add:

```js
const GROUP_LABELS = { GK: 'GK', DEF: 'DF', MID: 'MF', FWD: 'FW' };

export function getLineAverages(slots, bySlotId) {
  const buckets = { GK: [], DEF: [], MID: [], FWD: [] };
  const all = [];

  (slots || []).forEach((slot) => {
    const player = bySlotId?.[slot.id];
    if (!player) return;
    const group = POSITIONS_META[String(slot.pos || '').toUpperCase()]?.group;
    const ovr = getOvrForSlotPosition(player, slot.pos).value;
    if (!Number.isFinite(ovr)) return;
    all.push(ovr);
    if (group && buckets[group]) buckets[group].push(ovr);
  });

  function avg(arr) {
    if (!arr.length) return null;
    return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
  }

  return {
    GK: avg(buckets.GK),
    DEF: avg(buckets.DEF),
    MID: avg(buckets.MID),
    FWD: avg(buckets.FWD),
    overall: avg(all),
  };
}

export { GROUP_LABELS };
```

Note: `POSITIONS_META` groups are named `GK/DEF/MID/FWD` (confirmed from `constants.js`) — this matches the "tách riêng GK" decision (4 groups, not 3+GK-merged-into-DEF).

- [ ] **Step 2: Render the OVR-by-line card in `SquadView.jsx`**

Import `getLineAverages, GROUP_LABELS` from `../squadSummary.js`. Compute alongside `salaryTotal`:

```js
const lineAverages = useMemo(() => getLineAverages(slots, bySlotId), [slots, bySlotId]);
```

Add a second card inside the `fco-squad-summary` wrapper (from Task 4), after the salary card:

```jsx
<div className="fco-squad-summary-card">
  <div className="fco-squad-summary-label">OVR trung bình</div>
  <div className="fco-squad-summary-lines">
    {['GK', 'DEF', 'MID', 'FWD'].map((key) => (
      <span key={key} className="fco-squad-summary-line">
        <b>{GROUP_LABELS[key]}</b> {lineAverages[key] ?? '—'}
      </span>
    ))}
    <span className="fco-squad-summary-line fco-squad-summary-line-total">
      <b>Đội</b> {lineAverages.overall ?? '—'}
    </span>
  </div>
</div>
```

- [ ] **Step 3: Style in `fco.css`**

```css
.fco-squad-summary-lines { display: flex; gap: 10px; font-size: 12.5px; }
.fco-squad-summary-line { display: flex; align-items: center; gap: 4px; color: var(--text-dim); }
.fco-squad-summary-line b { color: var(--text-faint); font-weight: 600; font-size: 11px; }
.fco-squad-summary-line-total { border-left: 1px solid var(--border); padding-left: 10px; color: var(--text); font-weight: 700; }
```

- [ ] **Step 4: Manual verification**

Fill several slots across different lines (GK, a CB, a CM, a ST) and confirm each group average and the overall average render correctly and update as players/positions change. Confirm an empty group shows `—` instead of `0` or `NaN`.

- [ ] **Step 5: Commit**

```bash
rtk git add client/src/fco/squadSummary.js client/src/fco/views/SquadView.jsx client/src/fco/fco.css
rtk git commit -m "feat(squad): add OVR-by-line summary card (GK/DF/MF/FW)"
```

---

## Task 6: Research real Team Color data (thresholds, buffs, link catalog, icons)

**Files:**
- Create: `docs/superpowers/plans/2026-07-03-teamcolor-data-research.md` (raw findings)
- Modify: `client/src/fco/teamColor.js` (replace placeholder thresholds with real values)
- Create: `client/src/fco/teamColorLinks.js` (new catalog for "liên kết" type)
- Create: `client/public/teamcolor-icons/` or similar (downloaded icon assets) — exact path decided in Step 3 based on how other static assets are stored in this repo

This is a research task, not exploratory coding — dispatch as an isolated pass. UI in Tasks 7-8 consumes whatever this task produces, so it must run first (or its output must be stubbed with clearly-fake placeholder data that Tasks 7-8 can swap out later — see Step 5).

**Interfaces:**
- Produces: updated `CLUB_TIER_THRESHOLDS` and `UPGRADE_TIERS` in `teamColor.js` (same shape as currently defined — `{ min, up, full }` and `{ key, label, min, max, color, thresholds }` respectively — only the numeric values change, not the shape, so Tasks 7-8 don't need to know whether real or placeholder data is in place).
- Produces: `LINKED_TEAM_COLORS` in new file `client/src/fco/teamColorLinks.js` — array of `{ id, name, iconUrl, requiredPlayers: [{ name, season? }], buff: { up: number } }` (season-agnostic name match unless fifaaddict's real links require a specific season variant — confirm during research).

- [ ] **Step 1: Capture real Team Color CLB/Quốc gia/Season thresholds and buffs**

Visit the fifaaddict squadmaker page (or wherever Team Color rules are documented/visible, e.g. in-game help tooltips reachable from that page) using a browser tool. Record, for the "CLB" category and separately for "Quốc gia" and "Season" (if their thresholds differ), the exact count-to-buff mapping (currently guessed as `CLUB_TIER_THRESHOLDS` in `teamColor.js`: `{min:10,up:3,full:true}, {min:8,up:3}, {min:6,up:2}, {min:3,up:1}`). Write findings to the research file with a citation of where you found each number (screenshot description or page section).

- [ ] **Step 2: Capture real upgrade-tier (bronze/silver/gold/platinum) thresholds and buffs**

Same process for the "Team color nâng cấp" (per-card upgrade level tiers). Current guessed values are `UPGRADE_TIERS` in `teamColor.js` (bronze 3-4, silver 5-7, gold ..., with nested `thresholds` arrays for count-based buffs). Confirm the real level ranges per tier name and the real count-based buff thresholds within each tier.

- [ ] **Step 3: Catalog every "liên kết" (linked) team color set**

This is the largest sub-task. On fifaaddict, find and enumerate every named linked set (e.g. "Bức tường thành Quỷ Đỏ" = Ferdinand + Vidic + Van der Sar). For each: record the exact display name, the exact list of required player names (and season variant if the link requires a specific card, not just the player's name in general), the buff granted, and the icon image URL. Do not guess or invent any sets — if the full catalog isn't visible/reachable, note in the research file exactly how far you got and what's missing, rather than inventing plausible-sounding entries.

Decide and document the icon asset storage approach in the research file: download images to `client/public/teamcolor-icons/<slug>.png` and reference by local path (preferred — avoids hotlinking fifaaddict and breaking if their CDN changes), or store the fifaaddict URL directly (`iconUrl: 'https://...'`) if downloading isn't feasible in this environment. Check how other image assets are already handled in this repo (e.g. `imageUrl`/`seasonImg` fields already store remote URLs per `helpers.js` `normalizePlayer` — following that existing pattern of storing remote URLs directly is likely simpler and consistent with current conventions, unless there's a reason to self-host).

- [ ] **Step 4: Update `teamColor.js` with real threshold/buff values**

Replace the numeric values in `CLUB_TIER_THRESHOLDS` and `UPGRADE_TIERS` with the confirmed real values from Steps 1-2, keeping the exact same object shape (do not rename keys — Tasks 7-8 and the existing `computeClubTeamColors`/`computeUpgradeTeamColors` functions read these keys directly).

- [ ] **Step 5: Create `teamColorLinks.js` with the real catalog**

```js
export const LINKED_TEAM_COLORS = [
  // one entry per confirmed linked set from Step 3, e.g.:
  // { id: 'buc-tuong-thanh-quy-do', name: 'Bức tường thành Quỷ Đỏ', iconUrl: '...',
  //   requiredPlayers: [{ name: 'Ferdinand' }, { name: 'Vidic' }, { name: 'Van der Sar' }],
  //   buff: { up: 2 } },
];
```

If Step 3 could not produce a confident full catalog, populate this with only the sets you did confirm — leave it a short but 100%-accurate array rather than padding it with guesses. Note the gap explicitly in the research file so a later pass can finish it.

- [ ] **Step 6: Manual sanity check**

Run the dev server, build a squad that should trigger at least one club/nation group (3+ players sharing a club) and confirm `SquadView`'s existing "Team color đội" panel still renders a nonzero buff using the new threshold values (this doesn't require Task 7's UI — the existing panel already calls `computeSquadBonuses`, so it's the fastest way to confirm the new numbers don't crash anything).

- [ ] **Step 7: Commit**

```bash
rtk git add client/src/fco/teamColor.js client/src/fco/teamColorLinks.js docs/superpowers/plans/2026-07-03-teamcolor-data-research.md
rtk git commit -m "feat(squad): update team color thresholds with real fifaaddict data, add linked-set catalog"
```

---

## Task 7: Extend team color computation — season grouping + linked sets + unified active-groups list

**Files:**
- Modify: `client/src/fco/teamColor.js`

**Interfaces:**
- Produces: `computeClubTeamColors(starters)` extended to also group by `player.season` (kind `'season'`, label `'Mùa giải'`) alongside existing `club`/`nation` grouping — same output shape (`{ groups, bonusByPlayer, groupByPlayer }`), no signature change.
- Produces: new function `computeLinkedTeamColors(starters)` → `{ groups, bonusByPlayer, groupByPlayer }` matching the same shape as `computeClubTeamColors`'s return, computed by checking `LINKED_TEAM_COLORS` (from Task 6's `teamColorLinks.js`) against `starters` names.
- Produces: new function `computeAllActiveTeamColors(starters)` → `{ club, upgrade, linked, perPlayer, allGroups }` where `allGroups` is a flat array of every active group across all 3 kinds (each tagged with its `kind`: `'club'`, `'nation'`, `'season'`, `'upgrade'`, `'linked'`), sorted by player count descending — this is the single source both the header strip (Task 8) and the pitch list (Task 9) will read, per the "cùng 1 nguồn data" decision.
- Consumes: `LINKED_TEAM_COLORS` from `./teamColorLinks.js` (Task 6).

- [ ] **Step 1: Add season grouping into `computeClubTeamColors`**

Find the `computeClubTeamColors` function body (loops over `starters`, calls `addGroup` for club-career entries, `club`, and `nation`). Add one more `addGroup` call for season:

```js
starters.forEach((player) => {
  if (!player) return;
  const key = getPlayerCardKey(player);

  getTeamColorEntries(player).forEach((entry) => {
    addGroup(groups, key, 'teamColor', 'Team color', typeof entry === 'string' ? entry : entry.name || entry.team || entry.label || entry.title);
  });

  getClubCareerEntries(player).forEach((entry) => {
    addGroup(groups, key, 'club', 'CLB', entry.team || entry.name || entry.club);
  });

  addGroup(groups, key, 'club', 'CLB', player.club);
  addGroup(groups, key, 'nation', 'Quốc gia', player.nation);
  addGroup(groups, key, 'season', 'Mùa giải', player.seasonName || player.season);
});
```

(Only the last line is new — added right after the existing `nation` line.) No other change needed in this function; the rest of the pipeline (`.filter(group => group.players.length >= 3)`, buff lookup) already works generically per group regardless of `kind`.

- [ ] **Step 2: Write `computeLinkedTeamColors`**

Add near the bottom of the file, after `computeUpgradeTeamColors`:

```js
import { LINKED_TEAM_COLORS } from './teamColorLinks.js';

function normalizePlayerNameForMatch(name) {
  return String(name || '').trim().toLowerCase();
}

export function computeLinkedTeamColors(starters) {
  const presentNames = new Set(
    (starters || []).filter(Boolean).map((p) => normalizePlayerNameForMatch(p.name))
  );
  const keyByName = new Map();
  (starters || []).filter(Boolean).forEach((p) => {
    keyByName.set(normalizePlayerNameForMatch(p.name), getPlayerCardKey(p));
  });

  const active = LINKED_TEAM_COLORS.filter((set) =>
    set.requiredPlayers.every((req) => presentNames.has(normalizePlayerNameForMatch(req.name)))
  ).map((set) => ({
    kind: 'linked',
    kindLabel: 'Liên kết',
    name: set.name,
    id: set.id,
    iconUrl: set.iconUrl,
    players: set.requiredPlayers.map((req) => keyByName.get(normalizePlayerNameForMatch(req.name))).filter(Boolean),
    count: set.requiredPlayers.length,
    buff: set.buff,
  }));

  const bonusByPlayer = new Map();
  const groupByPlayer = new Map();
  active.forEach((group) => {
    group.players.forEach((key) => {
      bonusByPlayer.set(key, (bonusByPlayer.get(key) || 0) + (group.buff?.up || 0));
      groupByPlayer.set(key, group);
    });
  });

  return { groups: active, bonusByPlayer, groupByPlayer };
}
```

Note this deliberately sums bonuses across multiple simultaneously-active linked sets for `bonusByPlayer` (a player could theoretically be in 2 linked sets at once), unlike `computeClubTeamColors`'s per-player "keep the single best group" logic — linked sets are meant to stack since they're rarer and more specific. Move the `import { LINKED_TEAM_COLORS } from './teamColorLinks.js';` line to the top of the file with the other imports instead of inline (shown inline above only for readability in this plan).

- [ ] **Step 3: Add `players` arrays to `computeUpgradeTeamColors` tiers**

Current `computeUpgradeTeamColors` returns `tiers` with `count` and `buff`, but not the player keys belonging to each tier. Add player-key collection so the unified `allGroups` list can highlight matching cards from upgrade-tier rows/icons.

Inside `computeUpgradeTeamColors`, add a `playerKeysByTierKey` map while looping starters:

```js
const countByTierKey = new Map();
const playerKeysByTierKey = new Map();

starters.forEach((player) => {
  if (!player) return;
  const tier = getUpgradeTierForLevel(player.upgradeLevel);
  if (!tier) return;
  countByTierKey.set(tier.key, (countByTierKey.get(tier.key) || 0) + 1);
  const key = getPlayerCardKey(player);
  playerKeysByTierKey.set(tier.key, [...(playerKeysByTierKey.get(tier.key) || []), key]);
});
```

Then include `players` when mapping tiers:

```js
const active = UPGRADE_TIERS
  .map((tier) => {
    const count = countByTierKey.get(tier.key) || 0;
    const buff = getUpgradeBuff(tier, count);
    return { ...tier, count, buff, players: playerKeysByTierKey.get(tier.key) || [] };
  })
  .filter((tier) => tier.count > 0 && tier.buff);
```

Keep the existing `bonusByPlayer`/`tierByPlayer` loop unchanged except that it now reads `activeTier.players` later in Task 8/9.

- [ ] **Step 4: Write `computeAllActiveTeamColors`**

Add after `computeSquadBonuses` (the existing function that already combines club+upgrade):

```js
export function computeAllActiveTeamColors(starters) {
  const club = computeClubTeamColors(starters);
  const upgrade = computeUpgradeTeamColors(starters);
  const linked = computeLinkedTeamColors(starters);

  const allGroups = [
    ...club.groups,
    ...upgrade.tiers.map((tier) => ({
      kind: 'upgrade',
      kindLabel: 'Nâng cấp',
      name: tier.label,
      id: tier.key,
      players: tier.players || [],
      count: (tier.players || []).length,
      buff: { up: tier.buff?.up || 0 },
    })),
    ...linked.groups,
  ].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const perPlayer = new Map();
  const allPlayerKeys = new Set([
    ...club.bonusByPlayer.keys(),
    ...upgrade.bonusByPlayer.keys(),
    ...linked.bonusByPlayer.keys(),
  ]);
  allPlayerKeys.forEach((key) => {
    perPlayer.set(key, {
      clubBonus: club.bonusByPlayer.get(key) || 0,
      upgradeBonus: upgrade.bonusByPlayer.get(key) || 0,
      linkedBonus: linked.bonusByPlayer.get(key) || 0,
      totalBonus: (club.bonusByPlayer.get(key) || 0) + (upgrade.bonusByPlayer.get(key) || 0) + (linked.bonusByPlayer.get(key) || 0),
    });
  });

  return { club, upgrade, linked, perPlayer, allGroups };
}
```


- [ ] **Step 5: Manual verification**

This is a pure-logic task with no UI change yet (Tasks 8-9 consume it). Verify via a quick scratch check: temporarily add a `console.log(computeAllActiveTeamColors(starters))` in `SquadView.jsx`'s render (remove before commit), fill the squad with players sharing a club and a season, and confirm `allGroups` includes entries for club, season, and upgrade tier with correct `players`/`count`/`buff`.

- [ ] **Step 6: Commit**

```bash
rtk git add client/src/fco/teamColor.js
rtk git commit -m "feat(squad): add season grouping, linked-set computation, unified active team colors"
```

---

## Task 8: Header team-color-strip with per-group breakdown

**Files:**
- Modify: `client/src/fco/views/SquadView.jsx`
- Modify: `client/src/fco/fco.css`

**Interfaces:**
- Consumes: `computeAllActiveTeamColors` (Task 7).
- Produces: shared state `hoveredTeamColorId` (string|null) in `SquadView.jsx`, lifted to component level so Task 9's pitch list can read/write the same state (satisfies "phải dùng chung 1 state đang hover/active nhóm nào" requirement).

- [ ] **Step 1: Replace `computeSquadBonuses` usage with `computeAllActiveTeamColors`**

In `SquadView.jsx`, change the import from `teamColor.js` to include `computeAllActiveTeamColors` alongside the existing `getPlayerSquadBonus, applySquadBonus`. Replace:

```js
const squadBonuses = useMemo(() => computeSquadBonuses(starters), [starters]);
```

with:

```js
const squadBonuses = useMemo(() => computeAllActiveTeamColors(starters), [starters]);
```

`squadBonuses.perPlayer` now has the shape from Task 7 Step 3 (`clubBonus/upgradeBonus/linkedBonus/totalBonus`) — this is a superset of what `getPlayerSquadBonus`/`applySquadBonus` currently read (they read `.totalBonus`), so no changes needed to those two functions or their call sites elsewhere in this file.

- [ ] **Step 2: Add `hoveredTeamColorId` state**

Add alongside the other `useState` calls at the top of the component:

```js
const [hoveredTeamColorId, setHoveredTeamColorId] = useState(null);
```

- [ ] **Step 3: Replace the existing "Team color đội" / "Team color nâng cấp" panels with a unified breakdown strip**

Find the two `fco-squad-panel` blocks currently rendering `squadBonuses.club.groups` and `squadBonuses.upgrade.tiers` separately (in the `fco-squad-panels` section near the bottom of the render). Replace both with one unified block iterating `squadBonuses.allGroups`:

```jsx
<div className="fco-squad-panel fco-squad-teamcolor-strip">
  <div className="fco-squad-panel-title">Team color</div>
  {squadBonuses.allGroups.length === 0 ? (
    <div className="fco-squad-panel-empty">Chưa có team color nào được kích hoạt.</div>
  ) : (
    <div className="fco-squad-panel-list">
      {squadBonuses.allGroups.map((group) => (
        <div
          key={`${group.kind}:${group.id || group.name}`}
          className={`fco-squad-panel-row fco-teamcolor-row${hoveredTeamColorId === (group.id || group.name) ? ' is-active' : ''}`}
          onMouseEnter={() => setHoveredTeamColorId(group.id || group.name)}
          onMouseLeave={() => setHoveredTeamColorId((cur) => (cur === (group.id || group.name) ? null : cur))}
        >
          <div>
            <div className="fco-squad-panel-name">{group.name}</div>
            <div className="fco-squad-panel-sub">{group.kindLabel} · {group.count} cầu thủ</div>
          </div>
          <div className="fco-squad-panel-buff">+{group.buff?.up || 0} OVR</div>
        </div>
      ))}
    </div>
  )}
</div>
```

Note: the buff breakdown here is intentionally still flat "+N OVR" per group, matching the current data model (Task 6 confirmed thresholds/buffs are flat `up` values, not per-stat) — if Task 6's research later reveals per-stat buffs, this render block is the one to extend with a per-stat list, but that's out of scope until real data says otherwise (per the still-open note-file question on this point).

- [ ] **Step 4: Style the interactive row + active state in `fco.css`**

Add:

```css
.fco-teamcolor-row { cursor: pointer; transition: background .15s ease; border-radius: 8px; }
.fco-teamcolor-row:hover, .fco-teamcolor-row.is-active { background: var(--surface-3); }
```

- [ ] **Step 5: Manual verification**

Run the dev server, build a squad triggering at least 2 different group kinds (e.g. a club group and an upgrade tier). Confirm the strip lists both with correct counts and buffs. Hover a row and confirm it visually highlights (full pitch-card highlighting wired up in Task 9 — for this task, just confirm the row's own hover/active state toggles correctly and `hoveredTeamColorId` updates, checkable via React DevTools or a temporary console log).

- [ ] **Step 6: Commit**

```bash
rtk git add client/src/fco/views/SquadView.jsx client/src/fco/fco.css
rtk git commit -m "feat(squad): unify team color header strip with breakdown across all 3 types"
```

---

## Task 9: Pitch team-color icon list + card highlight + bonus indicator icon

**Files:**
- Modify: `client/src/fco/views/SquadView.jsx`
- Modify: `client/src/fco/ui.jsx` (`PlayerCardMini`)
- Modify: `client/src/fco/fco.css`

**Interfaces:**
- Consumes: `squadBonuses.allGroups`, `hoveredTeamColorId`/`setHoveredTeamColorId` (both from Task 8, already lifted to `SquadView.jsx` component scope).
- Produces (in `PlayerCardMini`): new prop `activeTeamColorKinds` (array of strings, e.g. `['club', 'upgrade']`) to render one small corner icon per active kind; new prop `isDimmed` (boolean) for the highlight-dim behavior.

- [ ] **Step 1: Render the pitch team-color icon row**

In `SquadView.jsx`, add a new row of clickable icons near the pitch (above or below the pitch container — place it directly above the existing pitch div, matching fifaaddict's `pitch-teamcolor-row` position):

```jsx
<div className="fco-pitch-teamcolor-list">
  {squadBonuses.allGroups.map((group) => {
    const groupId = group.id || group.name;
    return (
      <button
        key={`${group.kind}:${groupId}`}
        type="button"
        className={`fco-pitch-teamcolor-btn${hoveredTeamColorId === groupId ? ' is-active' : ''}`}
        onMouseEnter={() => setHoveredTeamColorId(groupId)}
        onMouseLeave={() => setHoveredTeamColorId((cur) => (cur === groupId ? null : cur))}
        onClick={() => setHoveredTeamColorId((cur) => (cur === groupId ? null : groupId))}
        title={group.name}
      >
        {group.iconUrl ? (
          <img src={group.iconUrl} alt={group.name} onError={(e) => { e.target.style.display = 'none'; }} />
        ) : (
          <span className="fco-pitch-teamcolor-fallback">{group.name.slice(0, 2).toUpperCase()}</span>
        )}
      </button>
    );
  })}
</div>
```

Click toggles a "pinned" highlight (stays active without hovering) by reusing the same `hoveredTeamColorId` state — clicking the already-active one clears it, matching common toggle-button UX.

- [ ] **Step 2: Compute per-slot highlight/dim and active-kind list, pass to `PlayerCardMini`**

In the slot-rendering loop (same loop touched in Task 3), add a helper before the `return` of the component or inline in the loop:

```js
const playerCardKey = player ? getPlayerCardKey(player) : null;
const activeGroupForPlayer = playerCardKey
  ? squadBonuses.allGroups.filter((g) => g.players.includes(playerCardKey))
  : [];
const activeTeamColorKinds = [...new Set(activeGroupForPlayer.map((g) => g.kind))];
const isDimmed = Boolean(hoveredTeamColorId) && !activeGroupForPlayer.some((g) => (g.id || g.name) === hoveredTeamColorId);
```

Pass to the card:

```jsx
<PlayerCardMini
  player={player}
  slotPos={slot.pos}
  ovr={boosted.ovr}
  ovrIsFallback={positionOvr.isFallback}
  bonus={bonus}
  level={player.upgradeLevel}
  activeTeamColorKinds={activeTeamColorKinds}
  isDimmed={isDimmed}
  onClick={() => setPickerSlotId(slot.id)}
/>
```

- [ ] **Step 3: Render corner icons + dim state in `PlayerCardMini`**

In `ui.jsx`, add `activeTeamColorKinds = [], isDimmed = false` to the destructured props of `PlayerCardMini`. Add a dim class to the root button:

```jsx
className={`fco-player-card-mini ${className}${isDimmed ? ' is-dimmed' : ''}`.trim()}
```

Add a corner-icon row inside the card markup (near `fco-player-card-mini-badges`, which already renders the bonus number):

```jsx
{activeTeamColorKinds.length > 0 && (
  <span className="fco-player-card-mini-tc-icons">
    {activeTeamColorKinds.map((kind) => (
      <span key={kind} className={`fco-player-card-mini-tc-icon fco-tc-kind-${kind}`} />
    ))}
  </span>
)}
```

- [ ] **Step 4: Style dim state, corner icons, and pitch icon row in `fco.css`**

```css
.fco-player-card-mini.is-dimmed { opacity: .35; filter: grayscale(.4); transition: opacity .15s ease, filter .15s ease; }
.fco-player-card-mini-tc-icons { position: absolute; top: 4px; left: 4px; display: flex; gap: 2px; }
.fco-player-card-mini-tc-icon { width: 8px; height: 8px; border-radius: 50%; }
.fco-tc-kind-club { background: #37a0ff; }
.fco-tc-kind-nation { background: #2dd4bf; }
.fco-tc-kind-season { background: #f5b942; }
.fco-tc-kind-upgrade { background: #b9c2cc; }
.fco-tc-kind-linked { background: #ff7088; }

.fco-pitch-teamcolor-list { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.fco-pitch-teamcolor-btn {
  width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--surface-2); display: flex; align-items: center; justify-content: center;
  padding: 0; cursor: pointer; overflow: hidden;
}
.fco-pitch-teamcolor-btn.is-active { border-color: var(--accent); box-shadow: 0 0 0 1.5px var(--accent); }
.fco-pitch-teamcolor-btn img { width: 100%; height: 100%; object-fit: cover; }
.fco-pitch-teamcolor-fallback { font-size: 10px; font-weight: 700; color: var(--text-faint); }
```

Also confirm `.fco-player-card-mini` has `position: relative` already (needed for the absolutely-positioned corner icons) — check the existing rule in `fco.css` and add it if missing.

- [ ] **Step 5: Manual verification**

Build a squad with a triggered club group. Hover the corresponding icon in both the header strip (Task 8) and the new pitch icon row, and confirm cards for players in that group stay full-opacity while all other filled cards dim. Click a pitch icon to pin the highlight, move the mouse away, confirm it stays pinned; click it again to unpin. Confirm each card shows a small colored dot per active team-color kind it belongs to.

- [ ] **Step 6: Commit**

```bash
rtk git add client/src/fco/views/SquadView.jsx client/src/fco/ui.jsx client/src/fco/fco.css
rtk git commit -m "feat(squad): add pitch team-color icon row with synced hover/pin highlight"
```

---

## Task 10: Search modal sidebar filters

**Files:**
- Create: `client/src/fco/components/PlayerPickerFilters.jsx`
- Modify: `client/src/fco/components/PlayerPicker.jsx`
- Modify: `client/src/fco/fco.css`

**Interfaces:**
- Produces (in `PlayerPickerFilters.jsx`): default export component `PlayerPickerFilters({ filters, onChange })` where `filters` is `{ seasons: [], ovr: [50,150], salaryMax: 9999, priceMax: 9999, league: '', nation: '', careerClub: '', preferredFoot: '', weakFoot: '', skillMoves: '', workRateAttack: '', workRateDefense: '', heightMin: '', heightMax: '', weightMin: '', weightMax: '', reputation: '', statFilter: '', statMin: '', statMax: '', traits: [] }` and `onChange(nextFilters)` is called on every field change.
- Consumes: `fetchClubsByLeague`, `fetchMeta` (existing, `api.js`) for populating league/club dropdown options. `RangeControl`, `MaxControl`, `FilterButton`, `Popover` (existing, `ui.jsx`) for the range/dropdown widgets — reuse these rather than building new range sliders.

- [ ] **Step 1: Read the existing filter widget building blocks**

Read `client/src/fco/ui.jsx`'s `RangeControl`, `MaxControl`, `FilterButton`, `Popover`, `FilterChip` implementations (already shown earlier in this plan's research) and find where they're currently used elsewhere in the app (search for `RangeControl` usage, likely in `DatabaseView.jsx` filter sidebar) to copy the established interaction pattern exactly rather than inventing a new one.

- [ ] **Step 2: Build `PlayerPickerFilters.jsx`**

Create the component reusing `RangeControl`/`MaxControl` for numeric ranges and simple `<select>` elements for the rest (league, nation, foot, work rates, trait) to keep this task scoped — don't build custom dropdown components when a native `<select>` populated from existing constants/API data is sufficient:

```jsx
import { useState, useEffect } from 'react';
import { fetchClubsByLeague } from '../api.js';
import { RangeControl, MaxControl } from '../ui.jsx';

const FEET = ['left', 'right'];
const SKILL_MOVES = [1, 2, 3, 4, 5];
const WORK_RATES = ['low', 'medium', 'high'];

export default function PlayerPickerFilters({ filters, onChange, leagues = [] }) {
  const [clubs, setClubs] = useState([]);

  useEffect(() => {
    if (!filters.league) { setClubs([]); return; }
    let ignore = false;
    fetchClubsByLeague(filters.league).then((list) => { if (!ignore) setClubs(list); });
    return () => { ignore = true; };
  }, [filters.league]);

  function set(key, value) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="fco-picker-filters">
      <div className="fco-picker-filter-group">
        <label>OVR</label>
        <RangeControl min={40} max={200} value={filters.ovr} onChange={(v) => set('ovr', v)} />
      </div>
      <div className="fco-picker-filter-group">
        <label>Lương tối đa</label>
        <MaxControl min={0} max={9999} value={filters.salaryMax} onChange={(v) => set('salaryMax', v)} />
      </div>
      <div className="fco-picker-filter-group">
        <label>Giá tối đa</label>
        <MaxControl min={0} max={9999} value={filters.priceMax} onChange={(v) => set('priceMax', v)} />
      </div>
      <div className="fco-picker-filter-group">
        <label>Giải đấu</label>
        <select value={filters.league} onChange={(e) => set('league', e.target.value)}>
          <option value="">Tất cả</option>
          {leagues.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      {clubs.length > 0 && (
        <div className="fco-picker-filter-group">
          <label>CLB</label>
          <select value={filters.careerClub} onChange={(e) => set('careerClub', e.target.value)}>
            <option value="">Tất cả</option>
            {clubs.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}
      <div className="fco-picker-filter-group">
        <label>Chân thuận</label>
        <select value={filters.preferredFoot} onChange={(e) => set('preferredFoot', e.target.value)}>
          <option value="">Tất cả</option>
          {FEET.map((f) => <option key={f} value={f}>{f === 'left' ? 'Trái' : 'Phải'}</option>)}
        </select>
      </div>
      <div className="fco-picker-filter-group">
        <label>Kỹ thuật</label>
        <select value={filters.skillMoves} onChange={(e) => set('skillMoves', e.target.value)}>
          <option value="">Tất cả</option>
          {SKILL_MOVES.map((n) => <option key={n} value={n}>{n} sao</option>)}
        </select>
      </div>
      <div className="fco-picker-filter-group">
        <label>Work rate tấn công</label>
        <select value={filters.workRateAttack} onChange={(e) => set('workRateAttack', e.target.value)}>
          <option value="">Tất cả</option>
          {WORK_RATES.map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
      </div>
      <div className="fco-picker-filter-group">
        <label>Work rate phòng ngự</label>
        <select value={filters.workRateDefense} onChange={(e) => set('workRateDefense', e.target.value)}>
          <option value="">Tất cả</option>
          {WORK_RATES.map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
      </div>
    </div>
  );
}
```

After the shown controls, add the remaining backend-supported filters so the sidebar maps the full `fetchPlayers()` surface already present in `api.js`: `seasons` (comma-separated text input initially, later can become checkbox chips when meta options are available), `nation` (text input), `weakFoot` (select 1-5), `heightMin/heightMax`, `weightMin/weightMax`, `reputation` (text/select), `statFilter + statMin/statMax` (stat select + numeric min/max), and `traits` (comma-separated text input, split into array). Keep the controls simple and native; do not block this task on cloning fifaaddict's exact input widgets. The critical requirement is that changing each UI field sends the matching param name already supported by `fetchPlayers()`.

- [ ] **Step 3: Wire filters into `PlayerPicker.jsx`**

Read the current `PlayerPicker.jsx` `useEffect` that calls `fetchPlayers` (shown earlier in this plan's research, around line 41). Add filter state and pass it through:

```js
import PlayerPickerFilters from './PlayerPickerFilters.jsx';

const DEFAULT_FILTERS = {
  seasons: [], ovr: [40, 200], salaryMax: 9999, priceMax: 9999,
  league: '', nation: '', careerClub: '', preferredFoot: '', weakFoot: '', skillMoves: '',
  workRateAttack: '', workRateDefense: '', heightMin: '', heightMax: '', weightMin: '', weightMax: '',
  reputation: '', statFilter: '', statMin: '', statMax: '', traits: [],
};
```

Inside the component, add `const [filters, setFilters] = useState(DEFAULT_FILTERS);` and extend the `fetchPlayers` call to pass the new fields through (merge with existing `search`/`posGroups`/`sort`/`pageSize` args already sent):

```js
fetchPlayers({
  search,
  posGroups: posGroups?.length ? posGroups : undefined,
  sort: 'ovr_desc',
  pageSize: search ? pageSize : 10,
  seasons: filters.seasons,
  ovr: filters.ovr,
  salaryMax: filters.salaryMax,
  priceMax: filters.priceMax,
  league: filters.league,
  nation: filters.nation,
  careerClub: filters.careerClub,
  preferredFoot: filters.preferredFoot,
  weakFoot: filters.weakFoot,
  skillMoves: filters.skillMoves,
  workRateAttack: filters.workRateAttack,
  workRateDefense: filters.workRateDefense,
  heightMin: filters.heightMin,
  heightMax: filters.heightMax,
  weightMin: filters.weightMin,
  weightMax: filters.weightMax,
  reputation: filters.reputation,
  statFilter: filters.statFilter,
  statMin: filters.statMin,
  statMax: filters.statMax,
  traits: filters.traits,
})
```

Add `filters` to the `useEffect` dependency array so changing a filter re-triggers the search. Render `<PlayerPickerFilters filters={filters} onChange={setFilters} />` in the modal layout — add it as a left sidebar column alongside the existing search input + result list (wrap both in a flex row, e.g. new class `fco-modal-body-with-filters`).

- [ ] **Step 4: Style the filter sidebar layout in `fco.css`**

```css
.fco-modal-body-with-filters { display: flex; gap: 14px; }
.fco-picker-filters { width: 200px; flex: 0 0 200px; display: flex; flex-direction: column; gap: 12px; padding-right: 12px; border-right: 1px solid var(--border); }
.fco-picker-filter-group { display: flex; flex-direction: column; gap: 4px; }
.fco-picker-filter-group label { font-size: 11px; color: var(--text-faint); }
.fco-picker-filter-group select { background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; color: var(--text); padding: 5px 8px; font-size: 12.5px; }
```

- [ ] **Step 5: Manual verification**

Open the search modal from a pitch slot, set an OVR range and a salary max, confirm the result list narrows accordingly (cross-check against the Database view's own filters producing consistent results for the same query). Select a league, confirm the CLB dropdown populates with clubs from `fetchClubsByLeague`. Reset filters and confirm results widen back out.

- [ ] **Step 6: Commit**

```bash
rtk git add client/src/fco/components/PlayerPickerFilters.jsx client/src/fco/components/PlayerPicker.jsx client/src/fco/fco.css
rtk git commit -m "feat(squad): add sidebar filters to player search modal"
```

---

## Task 11: Search result rows — foot/skill display, hover detail popover, separate detail-nav click target

**Files:**
- Modify: `client/src/fco/components/PlayerPicker.jsx`
- Modify: `client/src/fco/fco.css`

**Interfaces:**
- Consumes: `Popover` (existing, `ui.jsx`), `player.foot`, `player.weakFoot`, `player.skillMoves`, `player.traitsDescription`/`player.traits`, `player.pace/shooting/passing/dribbling/defending/physical` (all already present on normalized player objects per `helpers.js`).

- [ ] **Step 1: Split each result row into two click targets**

Find the `fco-modal-item` button in `PlayerPicker.jsx` (currently one `<button>` wrapping the whole row, `onClick={() => choosePlayer(p)}`). Change the outer element from `<button>` to `<div>` (a row container), with two independent interactive children: a `<button>` for the info area (opens detail in a new tab) and a separate `<button>` with a `+` icon (adds to slot, replacing what the whole row used to do):

```jsx
<div key={cardKey || p.id} className={`fco-modal-item${disabled ? ' disabled' : ''}`}>
  <button
    type="button"
    className="fco-modal-item-info"
    onClick={() => window.open(`/players/${p.id}`, '_blank', 'noopener')}
  >
    <PlayerAvatar player={p} size={36} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className="fco-modal-itemname">{cleanName(p.name)}</div>
      <div className="fco-modal-itemsub">
        <SeasonChip code={p.season} img={p.seasonImg} />
        {' '}<PosPill pos={p.primaryPos} />
        <span style={{ marginLeft: 6, fontFamily: 'var(--mono)', fontSize: 12, color: statColor(p.ovr) }}>{p.ovr}</span>
        <span className="fco-modal-item-meta">
          {p.foot === 'left' ? 'Trái' : 'Phải'} · WF {p.weakFoot} · SM {p.skillMoves}★
        </span>
      </div>
    </div>
  </button>
  {allowLevelSelect && !disabled && (
    <LevelSelect value={selectedLevel} onChange={(lv) => setLevelById(prev => ({ ...prev, [cardKey]: lv }))} />
  )}
  {disabled ? (
    <I.Check size={14} style={{ color: 'var(--accent)', flex: '0 0 14px' }} />
  ) : (
    <button type="button" className="fco-modal-item-add" onClick={() => choosePlayer(p)} aria-label="Thêm vào đội hình">
      <I.Plus size={16} />
    </button>
  )}
</div>
```

Confirm `I.Plus` exists in `Icons.jsx` (it's already used elsewhere in this plan's research, e.g. `SquadView.jsx`'s level stepper) — no new icon needed.

- [ ] **Step 2: Add hover popover with hidden stats/traits**

Add local state near the top of the component: `const [hoveredId, setHoveredId] = useState(null);` and a ref map for anchor positioning (following the same pattern as `Popover`'s existing usage elsewhere — check how `Popover` expects `anchorRef`, it's a single ref, so for a list you need one ref per row; use a `Map` ref: `const anchorRefs = useRef(new Map());`).

Wrap the info button with hover handlers:

```jsx
<button
  type="button"
  className="fco-modal-item-info"
  ref={(el) => { if (el) anchorRefs.current.set(cardKey, { current: el }); }}
  onMouseEnter={() => setHoveredId(cardKey)}
  onMouseLeave={() => setHoveredId((cur) => (cur === cardKey ? null : cur))}
  onClick={() => window.open(`/players/${p.id}`, '_blank', 'noopener')}
>
  ...
</button>
```

Render the popover content once, outside the `.map()`, keyed to whichever row is currently hovered — using the existing `Popover` component with `open={Boolean(hoveredId)}` and `anchorRef={anchorRefs.current.get(hoveredId)}`:

```jsx
{hoveredId && (() => {
  const hp = results.find((r) => getPlayerCardKey(r) === hoveredId);
  if (!hp) return null;
  return (
    <Popover open anchorRef={anchorRefs.current.get(hoveredId)} onClose={() => setHoveredId(null)} width={220}>
      <div className="fco-modal-hover-stats">
        {['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'].map((key) => (
          <div key={key} className="fco-modal-hover-stat-row">
            <span>{key}</span><b>{hp[key] ?? '—'}</b>
          </div>
        ))}
      </div>
      {(hp.traitsDescription?.length > 0 || hp.traits?.length > 0) && (
        <div className="fco-modal-hover-traits">
          {(hp.traitsDescription?.map((t) => t.name) || hp.traits || []).map((name, i) => (
            <span key={i} className="fco-trait">{name}</span>
          ))}
        </div>
      )}
    </Popover>
  );
})()}
```

Import `Popover` from `../ui.jsx` and `getPlayerCardKey` (already imported per existing code).

- [ ] **Step 3: Style new elements in `fco.css`**

```css
.fco-modal-item { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 8px; }
.fco-modal-item.disabled { opacity: .5; }
.fco-modal-item-info { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; background: transparent; border: none; text-align: left; cursor: pointer; padding: 4px; border-radius: 6px; }
.fco-modal-item-info:hover { background: var(--surface-2); }
.fco-modal-item-add { flex: 0 0 auto; width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--border); background: var(--surface-2); color: var(--accent); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.fco-modal-item-meta { margin-left: 8px; font-size: 11px; color: var(--text-faint); }
.fco-modal-hover-stats { display: flex; flex-direction: column; gap: 3px; font-size: 12px; }
.fco-modal-hover-stat-row { display: flex; justify-content: space-between; }
.fco-modal-hover-traits { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
```

- [ ] **Step 4: Manual verification**

Open the search modal, confirm each row shows foot/weak-foot/skill-moves inline. Hover a row and confirm the stat popover appears without needing a click, and disappears on mouse-leave. Click the info area (avatar/name) and confirm it opens `/players/:id` in a new tab, leaving the Squad page and its in-progress build untouched. Click the `+` button and confirm it still adds the player to the pending slot exactly as before.

- [ ] **Step 5: Commit**

```bash
rtk git add client/src/fco/components/PlayerPicker.jsx client/src/fco/fco.css
rtk git commit -m "feat(squad): show foot/skill info + hover stat popover in search results, split detail-nav from add"
```

---

## Task 12: `player-edit-modal` — hover-to-edit on pitch cards

**Files:**
- Create: `client/src/fco/components/PlayerEditModal.jsx`
- Modify: `client/src/fco/views/SquadView.jsx`
- Modify: `client/src/fco/ui.jsx` (`PlayerCardMini` — add hover-revealed edit/delete buttons)
- Modify: `client/src/fco/fco.css`

**Interfaces:**
- Produces (`PlayerEditModal.jsx`): default export `PlayerEditModal({ player, slot, onChangeGrade, onChangeSeason, onResearch, onRemove, onClose })`. `onChangeGrade(newGrade: number)` sets `upgradeLevel` for this slot (reuses `updateSquadPlayerLevel`, called by the parent). `onChangeSeason(relatedPlayerObject)` swaps in a different season-variant card for the same slot, keeping the slot's `upgradeLevel`. `onResearch()` closes this modal and opens the search-modal (Task 10/existing `PlayerPicker`) for the same slot. `onRemove()` clears the slot.
- Consumes: `fetchPlayerDetail` (existing, `api.js`) to fetch `related` season variants for the current player — same data source `DetailView.jsx` already uses for "Các phiên bản khác".
- Consumes: `GRADE_OPTIONS`-equivalent (1-13) — define locally rather than importing from `DetailView.jsx` (that file's `GRADE_OPTIONS` is not exported; duplicating a 13-item `Array.from` is cheaper than adding a cross-view export for one constant).

- [ ] **Step 1: Add hover-revealed Edit + Delete buttons to `PlayerCardMini`**

In `ui.jsx`, `PlayerCardMini` currently renders as a single `<button>` with `onClick`. Since we now need a corner "edit" button that must not trigger the card's own click, wrap the card in an outer `<div>` with `position: relative` and put the corner buttons as siblings of the existing inner button content — but the existing root element IS the clickable button, so restructure: change the root from `<button>` to `<div className="fco-player-card-mini-wrap">`, move the current button's content into an inner `<button className="fco-player-card-mini">` (unchanged behavior — clicking the card body still calls `onClick`, i.e. opens the picker for empty-swap or whatever the existing behavior is), and add the hover buttons as additional siblings inside the wrap div, only when a new prop `showEditControls` is true:

```jsx
export function PlayerCardMini({ player, slotPos, ovr, bonus, level, className = '', onClick, title, ovrIsFallback = false, activeTeamColorKinds = [], isDimmed = false, showEditControls = false, onEdit, onRemove }) {
  // ...existing season/upgradeLevel/cardStyle computation unchanged...
  return (
    <div className={`fco-player-card-mini-wrap${isDimmed ? ' is-dimmed' : ''}`}>
      <button
        type="button"
        className={`fco-player-card-mini ${className}`.trim()}
        style={cardStyle}
        onClick={onClick}
        title={title || cleanName(player?.name)}
      >
        {/* ...existing inner content unchanged (bg, top, season, art, name, badges)... */}
      </button>
      {showEditControls && (
        <span className="fco-player-card-mini-hover-controls">
          <button type="button" className="fco-player-card-mini-edit-btn" onClick={(e) => { e.stopPropagation(); onEdit?.(); }} aria-label="Sửa cầu thủ">
            <I.Edit size={12} />
          </button>
          <button type="button" className="fco-player-card-mini-remove-btn" onClick={(e) => { e.stopPropagation(); onRemove?.(); }} aria-label="Xoá khỏi đội hình">
            <I.X size={12} />
          </button>
        </span>
      )}
    </div>
  );
}
```

Move the `is-dimmed` class from the button (Task 9 put it on `fco-player-card-mini`) to this new wrap div instead, since the wrap div is now the outer element — update Task 9's className logic in `SquadView.jsx` accordingly if Task 9 already landed (dim styling in `fco.css` from Task 9 should target `.fco-player-card-mini-wrap.is-dimmed .fco-player-card-mini` or simply move the `opacity`/`filter` rule to the wrap class — adjust the Task 9 CSS selector `.fco-player-card-mini.is-dimmed` to `.fco-player-card-mini-wrap.is-dimmed` while touching this file).

Check `Icons.jsx` for an existing `Edit`/`Pencil` icon export (search the file — this plan's earlier research didn't confirm one exists). If none exists, add one following the existing `mk([...])` pattern used by every other icon in that file, e.g.:

```js
export const Edit = mk(['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z']);
```

- [ ] **Step 2: Wire `showEditControls`/`onEdit`/`onRemove` from `SquadView.jsx`**

Add state for which slot's edit modal is open: `const [editSlotId, setEditSlotId] = useState(null);`. In the slot-rendering loop, pass the new props to `PlayerCardMini`:

```jsx
<PlayerCardMini
  player={player}
  slotPos={slot.pos}
  ovr={boosted.ovr}
  ovrIsFallback={positionOvr.isFallback}
  bonus={bonus}
  level={player.upgradeLevel}
  activeTeamColorKinds={activeTeamColorKinds}
  isDimmed={isDimmed}
  showEditControls
  onEdit={() => setEditSlotId(slot.id)}
  onRemove={() => persist(clearSlot(bySlotId, slot.id))}
  onClick={() => setPickerSlotId(slot.id)}
/>
```

Remove the old always-visible level-stepper block (`fco-squad-cardlevel` with `I.Minus`/`LevelSelect`/`I.Plus`) and the old "đổi vị trí" (`I.ArrowUpDown`) button block from the slot markup — both are superseded by drag-and-drop (Task 2) for repositioning and by the new edit modal (this task) for grade changes. Deleting dead code here is intentional per the user's explicit decision to drop the swap button.

- [ ] **Step 3: Build `PlayerEditModal.jsx`**

```jsx
import { useState, useEffect } from 'react';
import { fetchPlayerDetail } from '../api.js';
import { PlayerAvatar, SeasonChip, Button } from '../ui.jsx';
import { cleanName, statColor } from '../helpers.js';
import * as I from '../Icons.jsx';

const GRADE_OPTIONS = Array.from({ length: 13 }, (_, i) => i + 1);

export default function PlayerEditModal({ player, slot, onChangeGrade, onChangeSeason, onResearch, onRemove, onClose }) {
  const [related, setRelated] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  useEffect(() => {
    if (!player?.id) return;
    let ignore = false;
    setLoadingRelated(true);
    fetchPlayerDetail(player.id)
      .then((res) => { if (!ignore) setRelated(res.related || []); })
      .finally(() => { if (!ignore) setLoadingRelated(false); });
    return () => { ignore = true; };
  }, [player?.id]);

  return (
    <div className="fco-modal-overlay" onClick={onClose}>
      <div className="fco-modal fco-player-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fco-modal-head">
          <h3>{cleanName(player?.name)}</h3>
          <button type="button" className="fco-modal-close" onClick={onClose} aria-label="Đóng"><I.X size={16} /></button>
        </div>

        <div className="fco-player-edit-section">
          <div className="fco-player-edit-label">Grade (vị trí {slot?.pos})</div>
          <div className="fco-grade-grid">
            {GRADE_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                className={`fco-grade-btn grade${value}${player?.upgradeLevel === value ? ' on' : ''}`}
                onClick={() => onChangeGrade(value)}
              >
                +{value}
              </button>
            ))}
          </div>
        </div>

        {related.length > 0 && (
          <div className="fco-player-edit-section">
            <div className="fco-player-edit-label">Đổi sang mùa khác</div>
            <div className="fco-player-edit-related-grid">
              {related.map((r) => (
                <button key={r.id} type="button" className="fco-player-edit-related-item" onClick={() => onChangeSeason(r)}>
                  <PlayerAvatar player={r} size={36} />
                  <SeasonChip code={r.season} name={r.seasonName} img={r.seasonImg} />
                  <span style={{ color: statColor(r.ovr), fontFamily: 'var(--mono)', fontWeight: 700 }}>{r.ovr}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {loadingRelated && <div className="fco-player-edit-loading">Đang tải các mùa khác…</div>}

        <div className="fco-player-edit-actions">
          <Button variant="outline" onClick={onResearch}>Tìm lại</Button>
          <Button variant="outline" danger onClick={onRemove}>Xoá khỏi đội hình</Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire the modal into `SquadView.jsx`**

Import `PlayerEditModal` and `updateSquadPlayerLevel` (already imported), `assignPlayerToSlot` (already imported). Add render logic near where `PlayerPicker` is conditionally rendered (find `activePickerSlot` usage):

```jsx
const editSlot = slots.find((s) => s.id === editSlotId) || null;
const editPlayer = editSlot ? bySlotId[editSlot.id] : null;
```

```jsx
{editSlot && editPlayer && (
  <PlayerEditModal
    player={editPlayer}
    slot={editSlot}
    onChangeGrade={(grade) => persist(updateSquadPlayerLevel(bySlotId, editSlot.id, grade))}
    onChangeSeason={(relatedPlayer) => {
      persist(assignPlayerToSlot(bySlotId, editSlot.id, { ...relatedPlayer, upgradeLevel: editPlayer.upgradeLevel }));
      setEditSlotId(null);
    }}
    onResearch={() => { setEditSlotId(null); setPickerSlotId(editSlot.id); }}
    onRemove={() => { persist(clearSlot(bySlotId, editSlot.id)); setEditSlotId(null); }}
    onClose={() => setEditSlotId(null)}
  />
)}
```

- [ ] **Step 5: Style the modal in `fco.css`**

Check for existing `.fco-modal-overlay`/`.fco-modal` rules first (the app already has a modal pattern used by `PlayerPicker`) — reuse those base classes rather than redefining overlay/positioning from scratch. Add only what's new:

```css
.fco-player-edit-modal { width: 420px; max-width: calc(100vw - 32px); }
.fco-player-edit-section { margin-top: 14px; }
.fco-player-edit-label { font-size: 12px; color: var(--text-faint); margin-bottom: 6px; }
.fco-player-edit-related-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.fco-player-edit-related-item { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-2); cursor: pointer; }
.fco-player-edit-actions { display: flex; gap: 10px; margin-top: 16px; }
.fco-player-card-mini-wrap { position: relative; }
.fco-player-card-mini-hover-controls { position: absolute; top: 4px; left: 4px; display: none; gap: 4px; z-index: 2; }
.fco-player-card-mini-wrap:hover .fco-player-card-mini-hover-controls { display: flex; }
.fco-player-card-mini-edit-btn, .fco-player-card-mini-remove-btn {
  width: 20px; height: 20px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center;
  background: rgba(13,16,21,.75); color: #fff; cursor: pointer;
}
.fco-player-card-mini-remove-btn:hover { background: rgba(226,86,111,.85); }
```

- [ ] **Step 6: Manual verification**

Place a player on the pitch. Hover the card and confirm 2 small buttons appear (edit, remove) at the top-left — confirm the old always-on level stepper and swap-position button are gone. Click edit → modal opens showing grade grid (confirm clicking a grade updates the card's level badge immediately after closing, or live if visible), related-season grid (if the player has other season cards, confirm clicking one swaps the card in-place keeping the same grade), "Tìm lại" (confirm it closes this modal and opens the search modal for the same slot), and "Xoá" (confirm it empties the slot and closes the modal). Click the small remove (X) button directly on the hovered card without opening the modal and confirm it removes the player immediately.

- [ ] **Step 7: Commit**

```bash
rtk git add client/src/fco/components/PlayerEditModal.jsx client/src/fco/views/SquadView.jsx client/src/fco/ui.jsx client/src/fco/fco.css client/src/fco/Icons.jsx
rtk git commit -m "feat(squad): add hover-to-edit player-edit-modal on pitch cards"
```

---

## Task 13: Desktop rail — ad slot + roster list panel

**Files:**
- Create: `client/src/fco/components/SquadDesktopRail.jsx`
- Modify: `client/src/fco/views/SquadView.jsx`
- Modify: `client/src/fco/fco.css`

**Interfaces:**
- Produces (`SquadDesktopRail.jsx`): default export `SquadDesktopRail({ slots, bySlotId, onSlotClick, onEditSlot, onRemoveSlot, onOpenDetail })`. `onSlotClick(slotId)` fires for empty-slot rows (opens search modal). `onEditSlot(slotId)` fires from the hover-revealed edit button on filled rows (opens the same `PlayerEditModal` from Task 12). `onRemoveSlot(slotId)` fires from the hover-revealed remove button. `onOpenDetail(playerId)` fires when the player name text itself is clicked.
- Consumes: `MonetizationSlot` (existing, `client/src/components/monetization/MonetizationSlot.jsx`) with `placement="squad-builder-sidebar-top"`.

- [ ] **Step 1: Build `SquadDesktopRail.jsx`**

```jsx
import MonetizationSlot from '../../components/monetization/MonetizationSlot';
import { cleanName, statColor } from '../helpers.js';
import * as I from '../Icons.jsx';

export default function SquadDesktopRail({ slots, bySlotId, onSlotClick, onEditSlot, onRemoveSlot, onOpenDetail }) {
  return (
    <div className="fco-squad-desktop-rail">
      <MonetizationSlot placement="squad-builder-sidebar-top" className="fco-squad-rail-ad" />

      <div className="fco-squad-desktop-rail-panel">
        <div className="fco-squad-desktop-rail-head">Đội hình</div>
        <div className="fco-squad-desktop-rail-list">
          {slots.map((slot) => {
            const player = bySlotId?.[slot.id];
            if (!player) {
              return (
                <button
                  key={slot.id}
                  type="button"
                  className="fco-squad-rail-row fco-squad-rail-row-empty"
                  onClick={() => onSlotClick(slot.id)}
                >
                  <span className="fco-squad-rail-plus">+</span>
                  <span>{slot.pos}</span>
                </button>
              );
            }
            return (
              <div key={slot.id} className="fco-squad-rail-row fco-squad-rail-row-filled">
                <span className="fco-squad-rail-pos">{slot.pos}</span>
                <button
                  type="button"
                  className="fco-squad-rail-name-line"
                  onClick={() => onOpenDetail(player.id)}
                >
                  {cleanName(player.name)}
                </button>
                <span className="fco-squad-rail-ovr" style={{ color: statColor(player.ovr) }}>{player.ovr}</span>
                <span className="fco-squad-rail-row-actions">
                  <button type="button" onClick={() => onEditSlot(slot.id)} aria-label="Sửa"><I.Edit size={13} /></button>
                  <button type="button" onClick={() => onRemoveSlot(slot.id)} aria-label="Xoá"><I.X size={13} /></button>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Decide the detail-nav behavior for `onOpenDetail`**

Per the decided requirement, clicking the player name line opens a detail view "modal kiểu DetailView hoặc mở DetailView ở tab mới" (either is acceptable, left as an implementer choice in the note file). Implement it as opening `/players/:id` in a new tab — this matches the already-established pattern from Task 11 (search modal detail nav) and avoids building a second, redundant in-app modal that duplicates `DetailView.jsx`'s entire rendering logic. In `SquadView.jsx`, wire:

```js
function openPlayerDetail(playerId) {
  window.open(`/players/${playerId}`, '_blank', 'noopener');
}
```

- [ ] **Step 3: Wire the rail into `SquadView.jsx` layout**

Import `SquadDesktopRail`. Find the `fco-squad-layout` div (currently containing `fco-squad-pitch` and `fco-squad-panels` as the 2 children). Add the rail as a third child, after `fco-squad-panels`:

```jsx
<div className="fco-squad-layout">
  <div className="fco-squad-pitch">
    {/* ...existing pitch markup... */}
  </div>
  <div className="fco-squad-panels">
    {/* ...existing panels (team color strip etc.)... */}
  </div>
  <SquadDesktopRail
    slots={slots}
    bySlotId={bySlotId}
    onSlotClick={(slotId) => setPickerSlotId(slotId)}
    onEditSlot={(slotId) => setEditSlotId(slotId)}
    onRemoveSlot={(slotId) => persist(clearSlot(bySlotId, slotId))}
    onOpenDetail={openPlayerDetail}
  />
</div>
```

- [ ] **Step 4: Style the rail with the desktop-only breakpoint in `fco.css`**

Per the decided `1121px` breakpoint (matching the existing `1120px` breakpoint convention used by `fco-detail-grid`/`fco-ops-grid`):

```css
.fco-squad-desktop-rail { display: none; }

@media (min-width: 1121px) {
  .fco-squad-layout { grid-template-columns: 1fr 260px 220px; }
  .fco-squad-desktop-rail { display: flex; flex-direction: column; gap: 12px; }
}

.fco-squad-desktop-rail-panel { background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; padding: 10px; }
.fco-squad-desktop-rail-head { font-size: 12px; font-weight: 700; color: var(--text-faint); margin-bottom: 8px; }
.fco-squad-desktop-rail-list { display: flex; flex-direction: column; gap: 4px; }
.fco-squad-rail-row { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 8px; background: transparent; border: none; width: 100%; text-align: left; }
.fco-squad-rail-row-empty { color: var(--text-faint); cursor: pointer; }
.fco-squad-rail-row-empty:hover { background: var(--surface-3); }
.fco-squad-rail-pos { font-family: var(--mono); font-size: 11px; color: var(--text-faint); flex: 0 0 30px; }
.fco-squad-rail-name-line { flex: 1; min-width: 0; background: none; border: none; text-align: left; color: var(--text); cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0; }
.fco-squad-rail-name-line:hover { text-decoration: underline; }
.fco-squad-rail-ovr { font-family: var(--mono); font-weight: 700; font-size: 12.5px; }
.fco-squad-rail-row-actions { display: none; gap: 4px; }
.fco-squad-rail-row-filled:hover .fco-squad-rail-row-actions { display: flex; }
```

Check the existing `.fco-squad-layout` rule (likely already a grid or flex with 2 columns for pitch + panels) before adding the 3-column override — adjust the base rule's column count/widths to match rather than blindly appending a conflicting `grid-template-columns`.

- [ ] **Step 5: Manual verification**

Resize the browser window (or dev tools responsive mode) across the `1120px`/`1121px` boundary and confirm the rail appears only at ≥1121px width, matching the same breakpoint behavior as the detail page's 2-column layout. At desktop width, confirm the roster list shows all 11 slots in formation order, empty slots open the search modal on click, hovering a filled row reveals edit/remove buttons that work, and clicking the player name opens `/players/:id` in a new tab. Change formation and confirm the rail list re-orders to match instantly (shared `slots` state, no separate sync code needed). Drag a player to a new pitch slot and confirm the rail row order updates immediately.

- [ ] **Step 6: Commit**

```bash
rtk git add client/src/fco/components/SquadDesktopRail.jsx client/src/fco/views/SquadView.jsx client/src/fco/fco.css
rtk git commit -m "feat(squad): add desktop rail with ad slot and synced roster list"
```

---

## Task 14: Squad-level-toggle (1↔13) + bulk-reinforce grade selector

**Files:**
- Modify: `client/src/fco/views/SquadView.jsx`
- Modify: `client/src/fco/fco.css`

**Interfaces:**
- Consumes: `applyQuickLevel` (existing function in `SquadView.jsx`, already generalized to set any `upgradeLevel` value across all filled slots — no changes needed to it).

Per the note file's recorded decision (since Squad does not adopt `detailBonus.js`'s separate `grade`/`level` fields, only `upgradeLevel` 1-13 exists): `squad-level-toggle` becomes a 1↔13 toggle, and `header-bulk-reinforce-btn` becomes a full 1-13 grade selector replacing the current 5-value preset row.

- [ ] **Step 1: Replace the `QUICK_LEVELS` preset row with a full 1-13 grade grid**

Find `const QUICK_LEVELS = [1, 5, 8, 10, 13];` near the top of `SquadView.jsx`. Replace with:

```js
const BULK_GRADE_OPTIONS = Array.from({ length: 13 }, (_, i) => i + 1);
```

Find the toolbar block rendering `QUICK_LEVELS.map(...)` (inside `fco-squad-toolbar-group` labeled "Cấp nhanh cả đội"). Replace the button row:

```jsx
{filledCount > 0 && (
  <div className="fco-squad-toolbar-group">
    <span className="fco-squad-toolbar-label">Grade cả đội</span>
    <div className="fco-squad-bulk-grade-grid">
      {BULK_GRADE_OPTIONS.map((value) => (
        <button
          key={value}
          type="button"
          className={`fco-grade-btn grade${value}`}
          onClick={() => applyQuickLevel(value)}
        >
          +{value}
        </button>
      ))}
    </div>
  </div>
)}
```

Reuses the existing `fco-grade-btn grade${value}` class (already styled per-grade in `fco.css` for `DetailView.jsx`'s `GradeSelector` — confirm those styles exist and are visible from `SquadView.jsx`'s CSS scope, which they should be since `fco.css` is one shared stylesheet for the whole `fco` app).

- [ ] **Step 2: Add the 1↔13 quick-toggle button**

Add a small toggle button in the same toolbar group row (before or after the grade grid), tracking which extreme was last applied to flip correctly:

```js
const [lastBulkGrade, setLastBulkGrade] = useState(1);

function toggleBulkGradeExtreme() {
  const next = lastBulkGrade === 1 ? 13 : 1;
  setLastBulkGrade(next);
  applyQuickLevel(next);
}
```

```jsx
{filledCount > 0 && (
  <Button variant="ghost" size="sm" onClick={toggleBulkGradeExtreme}>
    Toggle +1 / +13
  </Button>
)}
```

- [ ] **Step 3: Style the grade grid in `fco.css`**

```css
.fco-squad-bulk-grade-grid { display: flex; flex-wrap: wrap; gap: 4px; max-width: 320px; }
```

- [ ] **Step 4: Manual verification**

Fill several slots. Click a specific grade button (e.g. +8) in the bulk grid and confirm every filled slot's level badge updates to +8 immediately. Click the toggle button and confirm it flips all players to +13, click again and confirm it flips to +1.

- [ ] **Step 5: Commit**

```bash
rtk git add client/src/fco/views/SquadView.jsx client/src/fco/fco.css
rtk git commit -m "feat(squad): replace level presets with full grade selector and 1/13 toggle"
```

---

## Task 15: Card-view-toggle (full vs compact-with-extra-info layout)

**Files:**
- Modify: `client/src/fco/views/SquadView.jsx`
- Modify: `client/src/fco/ui.jsx` (`PlayerCardMini`)
- Modify: `client/src/fco/fco.css`

**Interfaces:**
- Produces (`PlayerCardMini`): new prop `variant` (`'full' | 'compact'`, default `'full'`). In `'compact'` mode, render avatar + name + OVR + salary + season + slot position as a stacked list instead of the full season-art card background, per the decided requirement.

- [ ] **Step 1: Add `cardViewMode` state and toggle button**

In `SquadView.jsx`, add: `const [cardViewMode, setCardViewMode] = useState('full');` near the other `useState` calls. Add a toggle button in the toolbar:

```jsx
<Button variant="ghost" size="sm" onClick={() => setCardViewMode((m) => (m === 'full' ? 'compact' : 'full'))}>
  {cardViewMode === 'full' ? 'Xem gọn' : 'Xem đầy đủ'}
</Button>
```

Pass `variant={cardViewMode}` to every `PlayerCardMini` usage in the slot loop.

- [ ] **Step 2: Add the compact layout branch to `PlayerCardMini`**

In `ui.jsx`, destructure `variant = 'full'` in `PlayerCardMini`'s props. Keep the existing full-card JSX under an `if (variant === 'full')`-equivalent branch, and add a new compact branch:

```jsx
if (variant === 'compact') {
  return (
    <div className={`fco-player-card-mini-wrap${isDimmed ? ' is-dimmed' : ''}`}>
      <button type="button" className={`fco-player-card-mini-compact ${className}`.trim()} onClick={onClick} title={title || cleanName(player?.name)}>
        <PlayerAvatar player={player} size={40} />
        <div className="fco-player-card-mini-compact-info">
          <span className="fco-player-card-mini-compact-name">{cleanName(player?.name)}</span>
          <span className="fco-player-card-mini-compact-meta">
            <b style={{ color: statColor(ovr ?? player?.ovr) }}>{ovr ?? player?.ovr}</b>
            {' · '}{slotPos || player?.primaryPos}
            {player?.salary > 0 && <> · {player.salary}</>}
            {' · '}<SeasonChip code={player?.season} name={player?.seasonName} img={player?.seasonImg} />
          </span>
        </div>
      </button>
      {showEditControls && (
        <span className="fco-player-card-mini-hover-controls">
          <button type="button" className="fco-player-card-mini-edit-btn" onClick={(e) => { e.stopPropagation(); onEdit?.(); }} aria-label="Sửa cầu thủ"><I.Edit size={12} /></button>
          <button type="button" className="fco-player-card-mini-remove-btn" onClick={(e) => { e.stopPropagation(); onRemove?.(); }} aria-label="Xoá khỏi đội hình"><I.X size={12} /></button>
        </span>
      )}
    </div>
  );
}
// ...existing full-card return unchanged below this point
```

Place this branch check right after the existing `cardStyle`/`upgradeLevel`/`totalBonus` computations (which the compact branch doesn't need, but computing them unconditionally is harmless and keeps the function simpler than duplicating the season lookup).

- [ ] **Step 3: Style the compact card in `fco.css`**

```css
.fco-player-card-mini-compact {
  display: flex; align-items: center; gap: 8px; padding: 6px 8px; width: 100%;
  background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px; cursor: pointer;
}
.fco-player-card-mini-compact-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.fco-player-card-mini-compact-name { font-size: 12.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fco-player-card-mini-compact-meta { font-size: 11px; color: var(--text-dim); display: flex; align-items: center; gap: 2px; }
```

- [ ] **Step 4: Manual verification**

Toggle to compact mode and confirm every filled pitch slot switches to the stacked avatar+name+OVR+salary+season+position layout, still clickable, still shows edit/remove buttons on hover, still respects the dim/highlight state from Task 9. Toggle back to full and confirm the original season-art card returns unchanged.

- [ ] **Step 5: Commit**

```bash
rtk git add client/src/fco/views/SquadView.jsx client/src/fco/ui.jsx client/src/fco/fco.css
rtk git commit -m "feat(squad): add compact card view toggle showing salary/season/slot-position"
```

---

## Task 16: Confirm dialog before clearing the whole squad

**Files:**
- Modify: `client/src/fco/views/SquadView.jsx`

**Interfaces:**
- No new exports — purely an inline UX change to the existing `clearSquad` function and its trigger button.

- [ ] **Step 1: Gate `clearSquad` behind a confirmation**

Find the existing `clearSquad` function and its trigger (`<Button variant="ghost" size="sm" icon={I.Refresh} onClick={clearSquad}>Xoá đội hình</Button>`). Wrap the call with a native `window.confirm` (simplest option consistent with this codebase not having a custom confirm-dialog component anywhere else yet — check for one first; if `ui.jsx` has no existing confirm/dialog primitive, `window.confirm` is the right scope for this task rather than building a new modal component just for this one button):

```js
function handleClearSquadClick() {
  if (filledCount === 0) return;
  const confirmed = window.confirm(`Xoá toàn bộ ${filledCount} cầu thủ khỏi đội hình hiện tại?`);
  if (!confirmed) return;
  clearSquad();
}
```

Update the button:

```jsx
{filledCount > 0 && (
  <Button variant="ghost" size="sm" icon={I.Refresh} onClick={handleClearSquadClick}>
    Xoá đội hình
  </Button>
)}
```

- [ ] **Step 2: Manual verification**

Fill a few slots, click "Xoá đội hình", confirm a native browser confirm dialog appears with the player count. Click Cancel and confirm nothing is cleared. Click again and accept, confirm the squad empties.

- [ ] **Step 3: Commit**

```bash
rtk git add client/src/fco/views/SquadView.jsx
rtk git commit -m "feat(squad): require confirmation before clearing the whole squad"
```

---

## Task 17: Full end-to-end verification pass

**Files:**
- No product code changes unless verification finds a bug.
- If fixes are needed, modify the relevant files from earlier tasks and commit a targeted fix.

**Interfaces:**
- Consumes every feature from Tasks 1-16.
- Produces a verified working Squad Builder flow.

- [ ] **Step 1: Start the app**

Run:

```bash
cd client && rtk npm run dev
```

Expected: Vite dev server starts successfully and serves the app.

- [ ] **Step 2: Verify formation + pitch baseline**

Open `/doi-hinh`. Confirm the formation selector lists all 39 formations from Task 1. Switch across at least 8 formations (include a `(2)` variant and one 5-back formation). Expected: exactly 11 slots render, no slot appears outside the pitch, and the roster rail (desktop) updates to the same order.

- [ ] **Step 3: Verify player search and add flow**

Click an empty slot. Expected: search modal opens, default results are biased by that slot's position group. Use text search, OVR range, salary max, league/club, foot, weakFoot, skillMoves, work-rate, height/weight, reputation, stat filter, traits. Expected: each filter triggers a new request and results update without breaking add behavior. Click the player info area: detail opens in a new tab. Click the `+` button: the player is added to the selected slot.

- [ ] **Step 4: Verify card OVR, grade, edit modal, and season swap**

Place a player into a natural position and an unnatural position. Expected: pitch card OVR uses slot-position rating when available; when missing, it uses `player.ovr` and shows the warning icon. Hover the card: only edit and remove controls appear (no old swap button, no old always-visible level stepper). Open edit modal, set grade, swap season, use "Tìm lại", and remove. Expected: each action updates the slot and persists correctly.

- [ ] **Step 5: Verify drag/drop and clear behavior**

Drag a player to an empty slot. Expected: move, original slot empties. Drag onto an occupied slot. Expected: swap. Click "Xoá đội hình". Expected: confirm dialog appears; Cancel keeps squad intact; OK clears all slots.

- [ ] **Step 6: Verify summary + team color interactions**

Add players that trigger salary, OVR line averages, and at least one team color. Expected: salary total updates and over-limit styling appears when cap is below total; GK/DF/MF/FW averages update from slot-position OVR; header team-color strip and pitch icon list show the same active groups with different display styles; hover/click any team-color group/icon dims unrelated cards and leaves related cards highlighted; pitch cards show small bonus-kind icons.

- [ ] **Step 7: Verify desktop rail and responsive behavior**

At width ≥1121px, confirm the desktop rail appears with `MonetizationSlot` placement `squad-builder-sidebar-top` and roster list. At width ≤1120px, confirm rail hides. In the rail, empty rows open search, filled row edit button opens the same player-edit-modal, remove clears the slot, player name opens detail in a new tab.

- [ ] **Step 8: Run build/check commands**

Run the project's available client build/check commands (inspect `client/package.json` first if needed). Prefer:

```bash
cd client && rtk npm run build
```

Expected: build succeeds. If the repo has lint/test scripts, also run them with `rtk npm run <script>`.

- [ ] **Step 9: Commit verification fixes if any**

If verification required fixes:

```bash
rtk git add <fixed-files>
rtk git commit -m "fix(squad): address end-to-end verification issues"
```

If no fixes were needed, do not create an empty commit.

---

## Self-review checklist

- [ ] Phần 5 auth/OAuth/JWT/server-side squad/share-public is excluded from implementation and kept deferred.
- [ ] Formation and Team Color data collection are explicit research tasks before dependent UI work.
- [ ] Search modal exposes every backend-supported filter from `fetchPlayers()`; exact fifaaddict widget styling can be refined later without changing API mapping.
- [ ] `team-color-strip` and `pitch-teamcolor-list` both consume one shared active-groups source and one shared hover/pin state.
- [ ] Squad bonus remains on existing `upgradeLevel`/`teamColorBonus` model, not `detailBonus.js`.
- [ ] All shell commands in this plan use `rtk` per project/global instruction.

---

Plan complete and saved to `docs/superpowers/plans/2026-07-03-squadmaker-clone.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

Which approach?

---
