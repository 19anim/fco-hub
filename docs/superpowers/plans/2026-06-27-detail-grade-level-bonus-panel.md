# Detail Grade Level Bonus Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add collapsible Grade/Lvl/Bonus controls to player detail so Lvl and Bonus manually add flat stat points alongside the existing Grade behavior.

**Architecture:** Keep the feature local to the existing FCO detail page. Extract the stat bonus calculation into pure exported helpers in `DetailView.jsx` so Vitest can verify the math without rendering the full page, then wire the new UI state and CSS into the existing `fa-upgrade-panel`.

**Tech Stack:** React 19, Vite, Vitest via `npx vitest run`, existing CSS in `client/src/fco/fco.css`.

## Global Constraints

- Grade keeps current behavior: OVR/position rating uses `getOvrIncreaseForLevel(grade)`; main and detailed stats use `grade - 1`.
- Lvl and Bonus are flat manual stat points: selecting `10` adds `+10` to OVR, position ratings, main stats, and detailed stats.
- The panel defaults collapsed and resets to `Grade +1`, `Lvl +0`, `Bonus +0` when the route player id changes.
- No API/server schema changes.
- Do not crawl or infer FIFAAddict team color data.
- Use the label `Bonus` in the UI.

---

## File Structure

- Modify `client/src/fco/views/DetailView.jsx`
  - Owns the new local state: `levelBonus`, `teamColorBonus`, `isUpgradePanelOpen`.
  - Exports pure calculation helpers for test coverage.
  - Renders the collapsible summary and expanded selectors in the existing `fa-upgrade-panel` location.
- Modify `client/src/fco/fco.css`
  - Adds styles for collapsed/expanded panel layout, summary row, chevron button, and compact bonus selectors.
- Create `client/src/fco/views/DetailView.bonus.test.js`
  - Tests pure math helpers for grade-only behavior, flat Lvl/Bonus behavior, and combined behavior.

---

### Task 1: Extract and test detail bonus math

**Files:**
- Modify: `client/src/fco/views/DetailView.jsx`
- Create: `client/src/fco/views/DetailView.bonus.test.js`

**Interfaces:**
- Consumes: `getOvrIncreaseForLevel(grade: number): number` from `client/src/fco/upgradeHelpers.js`.
- Produces: `getDetailBonusModel({ grade, levelBonus, teamColorBonus }): { gradeOvrBonus: number, gradeStatBonus: number, flatBonus: number, statBonus: number, ovrBonus: number }`.
- Produces: `applyDetailBonuses(player, bonuses): object`, where `bonuses` is the object returned by `getDetailBonusModel`.

- [ ] **Step 1: Write the failing tests**

Create `client/src/fco/views/DetailView.bonus.test.js` with this content:

```js
import { describe, expect, it } from 'vitest';
import { applyDetailBonuses, getDetailBonusModel } from './DetailView.jsx';

describe('detail bonus math', () => {
  it('keeps grade-only stat and ovr behavior', () => {
    const bonuses = getDetailBonusModel({ grade: 5, levelBonus: 0, teamColorBonus: 0 });

    expect(bonuses.gradeStatBonus).toBe(4);
    expect(bonuses.statBonus).toBe(4);
    expect(bonuses.flatBonus).toBe(0);
    expect(bonuses.ovrBonus).toBeGreaterThan(0);
  });

  it('adds level and bonus as flat points', () => {
    const bonuses = getDetailBonusModel({ grade: 1, levelBonus: 10, teamColorBonus: 3 });

    expect(bonuses.gradeStatBonus).toBe(0);
    expect(bonuses.flatBonus).toBe(13);
    expect(bonuses.statBonus).toBe(13);
    expect(bonuses.ovrBonus).toBe(13);
  });

  it('applies combined bonuses to player stats, positions, and detailed stats', () => {
    const player = {
      ovr: 100,
      pace: 90,
      shooting: 80,
      passing: 70,
      dribbling: 60,
      defending: 50,
      physical: 40,
      positionRatings: [
        { label: 'ST', value: 101, recommended: true },
        { label: 'CF', value: 99, recommended: false },
      ],
      detailed: {
        acceleration: 91,
        finishing: 82,
      },
    };

    const result = applyDetailBonuses(
      player,
      getDetailBonusModel({ grade: 1, levelBonus: 10, teamColorBonus: 3 })
    );

    expect(result.ovr).toBe(113);
    expect(result.pace).toBe(103);
    expect(result.shooting).toBe(93);
    expect(result.positionRatings).toEqual([
      { label: 'ST', value: 114, recommended: true },
      { label: 'CF', value: 112, recommended: false },
    ]);
    expect(result.detailed).toEqual({
      acceleration: 104,
      finishing: 95,
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run from the repo root:

```bash
rtk npx --prefix client vitest run client/src/fco/views/DetailView.bonus.test.js
```

Expected: FAIL because `DetailView.jsx` does not export `getDetailBonusModel` or `applyDetailBonuses` yet.

- [ ] **Step 3: Export the pure helpers from `DetailView.jsx`**

In `client/src/fco/views/DetailView.jsx`, replace the existing grade helper block:

```js
function getOvrBonusForGrade(grade) {
  return getOvrIncreaseForLevel(grade);
}

function getStatBonusForGrade(grade) {
  return Math.max(0, Number(grade) - 1);
}

function addGrade(value, grade) {
  if (value == null) return value;
  const number = Number(value);
  return Number.isFinite(number) ? number + grade : value;
}
```

with:

```js
function toNonNegativeInteger(value) {
  return Math.max(0, Math.trunc(Number(value) || 0));
}

function getOvrBonusForGrade(grade) {
  return getOvrIncreaseForLevel(grade);
}

function getStatBonusForGrade(grade) {
  return Math.max(0, Number(grade) - 1);
}

export function getDetailBonusModel({ grade, levelBonus = 0, teamColorBonus = 0 }) {
  const gradeOvrBonus = getOvrBonusForGrade(grade);
  const gradeStatBonus = getStatBonusForGrade(grade);
  const flatBonus = toNonNegativeInteger(levelBonus) + toNonNegativeInteger(teamColorBonus);

  return {
    gradeOvrBonus,
    gradeStatBonus,
    flatBonus,
    statBonus: gradeStatBonus + flatBonus,
    ovrBonus: gradeOvrBonus + flatBonus,
  };
}

function addBonus(value, bonus) {
  if (value == null) return value;
  const number = Number(value);
  return Number.isFinite(number) ? number + bonus : value;
}
```

Then replace the existing `applyGradeBonus` function with:

```js
export function applyDetailBonuses(player, bonuses) {
  if (!player) return player;

  const ovrBonus = bonuses?.ovrBonus || 0;
  const statBonus = bonuses?.statBonus || 0;

  return {
    ...player,
    ovr: addBonus(player.ovr, ovrBonus),
    positionRatings: player.positionRatings?.map((rating) => ({
      ...rating,
      value: addBonus(rating.value, ovrBonus),
    })),
    ...Object.fromEntries(
      GRADE_STAT_KEYS.map((key) => [key, addBonus(player[key], statBonus)])
    ),
    detailed: player.detailed
      ? Object.fromEntries(
        Object.entries(player.detailed).map(([key, value]) => [key, addBonus(value, statBonus)])
      )
      : player.detailed,
  };
}
```

- [ ] **Step 4: Wire the current grade-only UI to the new helper**

In `DetailView`, replace:

```js
const p = applyGradeBonus(player, grade);
```

with:

```js
const bonuses = getDetailBonusModel({ grade });
const p = applyDetailBonuses(player, bonuses);
```

- [ ] **Step 5: Run the focused tests**

Run:

```bash
rtk npx --prefix client vitest run client/src/fco/views/DetailView.bonus.test.js
```

Expected: PASS for all 3 tests.

- [ ] **Step 6: Commit**

Run:

```bash
rtk git add "client/src/fco/views/DetailView.jsx" "client/src/fco/views/DetailView.bonus.test.js"
rtk git commit -m "$(cat <<'EOF'
feat: extract detail bonus calculations

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Add Level and Bonus state and selectors

**Files:**
- Modify: `client/src/fco/views/DetailView.jsx`

**Interfaces:**
- Consumes: `getDetailBonusModel({ grade, levelBonus, teamColorBonus })` from Task 1.
- Consumes: `applyDetailBonuses(player, bonuses)` from Task 1.
- Produces: UI state and selector behavior for `levelBonus: number` and `teamColorBonus: number`.

- [ ] **Step 1: Add selector option constants**

In `client/src/fco/views/DetailView.jsx`, after:

```js
const GRADE_OPTIONS = Array.from({ length: 13 }, (_, index) => index + 1);
```

add:

```js
const FLAT_BONUS_OPTIONS = Array.from({ length: 21 }, (_, index) => index);
```

- [ ] **Step 2: Add the new state and reset behavior**

In `DetailView`, replace:

```js
const [grade, setGrade] = useState(1);
const [activePosition, setActivePosition] = useState('');
```

with:

```js
const [grade, setGrade] = useState(1);
const [levelBonus, setLevelBonus] = useState(0);
const [teamColorBonus, setTeamColorBonus] = useState(0);
const [activePosition, setActivePosition] = useState('');
```

Inside the `useEffect` reset block, replace:

```js
setGrade(1);
setActivePosition('');
```

with:

```js
setGrade(1);
setLevelBonus(0);
setTeamColorBonus(0);
setActivePosition('');
```

- [ ] **Step 3: Use the new bonus inputs in the render math**

Replace:

```js
const bonuses = getDetailBonusModel({ grade });
```

with:

```js
const bonuses = getDetailBonusModel({ grade, levelBonus, teamColorBonus });
```

- [ ] **Step 4: Add the reusable flat selector component**

Near the existing `GradeSelector` function, add this component:

```jsx
function FlatBonusSelector({ title, value, onChange }) {
  return (
    <div className="fco-flat-bonus-selector">
      <div className="fco-grade-title">
        <span>{title}</span>
        <strong>+{value}</strong>
      </div>
      <div className="fco-flat-bonus-grid">
        {FLAT_BONUS_OPTIONS.map((option) => (
          <button
            type="button"
            key={option}
            className={`fco-flat-bonus-btn${option === value ? ' on' : ''}`}
            onClick={() => onChange(option)}
          >
            +{option}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Render the Level and Bonus selectors next to Grade**

Find the current upgrade panel content:

```jsx
<div className="fa-upgrade-panel">
  <div className="fa-upgrade-label">GRADE</div>
  <GradeSelector value={grade} onChange={setGrade} />
</div>
```

Replace it with:

```jsx
<div className="fa-upgrade-panel">
  <div className="fa-upgrade-label">GRADE</div>
  <div className="fa-upgrade-controls">
    <GradeSelector value={grade} onChange={setGrade} />
    <FlatBonusSelector title="Lvl" value={levelBonus} onChange={setLevelBonus} />
    <FlatBonusSelector title="Bonus" value={teamColorBonus} onChange={setTeamColorBonus} />
  </div>
</div>
```

- [ ] **Step 6: Run the focused tests and lint**

Run:

```bash
rtk npx --prefix client vitest run client/src/fco/views/DetailView.bonus.test.js
rtk npm --prefix client run lint
```

Expected: Vitest PASS. Lint PASS or only pre-existing unrelated warnings; fix any new `DetailView.jsx` issues.

- [ ] **Step 7: Commit**

Run:

```bash
rtk git add "client/src/fco/views/DetailView.jsx"
rtk git commit -m "$(cat <<'EOF'
feat: add manual level and bonus stat controls

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Add collapsible panel behavior and styling

**Files:**
- Modify: `client/src/fco/views/DetailView.jsx`
- Modify: `client/src/fco/fco.css`

**Interfaces:**
- Consumes: `bonuses.statBonus` and `bonuses.ovrBonus` from Task 1.
- Consumes: `grade`, `levelBonus`, `teamColorBonus` state from Task 2.
- Produces: collapsible `fa-upgrade-panel` with summary row and expanded selector body.

- [ ] **Step 1: Add collapsed state and reset it on player change**

In `DetailView`, replace the state block from Task 2:

```js
const [teamColorBonus, setTeamColorBonus] = useState(0);
const [activePosition, setActivePosition] = useState('');
```

with:

```js
const [teamColorBonus, setTeamColorBonus] = useState(0);
const [isUpgradePanelOpen, setIsUpgradePanelOpen] = useState(false);
const [activePosition, setActivePosition] = useState('');
```

Inside the `useEffect` reset block, replace:

```js
setTeamColorBonus(0);
setActivePosition('');
```

with:

```js
setTeamColorBonus(0);
setIsUpgradePanelOpen(false);
setActivePosition('');
```

- [ ] **Step 2: Add summary values before render**

After:

```js
const p = applyDetailBonuses(player, bonuses);
```

add:

```js
const gradeStatBonus = bonuses.gradeStatBonus;
const gradeOvrBonus = bonuses.gradeOvrBonus;
```

- [ ] **Step 3: Replace the expanded-only panel with a collapsible panel**

Replace the Task 2 panel JSX:

```jsx
<div className="fa-upgrade-panel">
  <div className="fa-upgrade-label">GRADE</div>
  <div className="fa-upgrade-controls">
    <GradeSelector value={grade} onChange={setGrade} />
    <FlatBonusSelector title="Lvl" value={levelBonus} onChange={setLevelBonus} />
    <FlatBonusSelector title="Bonus" value={teamColorBonus} onChange={setTeamColorBonus} />
  </div>
</div>
```

with:

```jsx
<div className={`fa-upgrade-panel${isUpgradePanelOpen ? ' open' : ''}`}>
  <button
    type="button"
    className="fa-upgrade-summary"
    onClick={() => setIsUpgradePanelOpen((open) => !open)}
    aria-expanded={isUpgradePanelOpen}
  >
    <span className="fa-upgrade-label">GRADE</span>
    <span className="fa-upgrade-summary-text">
      Grade +{grade} (stat +{gradeStatBonus}, OVR +{gradeOvrBonus}) · Lvl +{levelBonus} · Bonus +{teamColorBonus} · Stat +{bonuses.statBonus}
    </span>
    <I.ChevronDown size={16} className="fa-upgrade-chevron" />
  </button>
  {isUpgradePanelOpen && (
    <div className="fa-upgrade-controls">
      <GradeSelector value={grade} onChange={setGrade} />
      <FlatBonusSelector title="Lvl" value={levelBonus} onChange={setLevelBonus} />
      <FlatBonusSelector title="Bonus" value={teamColorBonus} onChange={setTeamColorBonus} />
    </div>
  )}
</div>
```

- [ ] **Step 4: Add CSS for collapsed and expanded layouts**

In `client/src/fco/fco.css`, replace the existing `.fa-upgrade-panel` and `.fa-upgrade-label` rules:

```css
.fa-upgrade-panel { display: flex; align-items: center; gap: 12px; width: min(100%, 580px); margin-left: 6px; padding: 9px 10px; border: 1px solid rgba(179,228,0,.18); border-radius: 8px; background: linear-gradient(90deg, rgba(116,0,77,.78), rgba(30,36,48,.58)); box-shadow: inset 0 1px 0 rgba(255,255,255,.07); }
.fa-upgrade-label { flex: 0 0 auto; height: 24px; display: flex; align-items: center; justify-content: center; padding: 0 9px; border-radius: 5px; background: #74004d; color: #b3e400; font-family: var(--mono); font-size: 12px; font-weight: 900; letter-spacing: .08em; text-shadow: 0 0 10px rgba(179,228,0,.35); }
```

with:

```css
.fa-upgrade-panel { display: flex; flex-direction: column; gap: 10px; width: min(100%, 680px); margin-left: 6px; padding: 9px 10px; border: 1px solid rgba(179,228,0,.18); border-radius: 8px; background: linear-gradient(90deg, rgba(116,0,77,.78), rgba(30,36,48,.58)); box-shadow: inset 0 1px 0 rgba(255,255,255,.07); }
.fa-upgrade-summary { display: flex; align-items: center; gap: 10px; width: 100%; padding: 0; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }
.fa-upgrade-label { flex: 0 0 auto; height: 24px; display: flex; align-items: center; justify-content: center; padding: 0 9px; border-radius: 5px; background: #74004d; color: #b3e400; font-family: var(--mono); font-size: 12px; font-weight: 900; letter-spacing: .08em; text-shadow: 0 0 10px rgba(179,228,0,.35); }
.fa-upgrade-summary-text { min-width: 0; flex: 1; overflow: hidden; color: #dfe6ee; font-family: var(--mono); font-size: 12px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.fa-upgrade-chevron { flex: 0 0 auto; color: #b3e400; transition: transform .14s ease; }
.fa-upgrade-panel.open .fa-upgrade-chevron { transform: rotate(180deg); }
.fa-upgrade-controls { display: grid; grid-template-columns: minmax(210px, 1.3fr) repeat(2, minmax(160px, .85fr)); gap: 10px; width: 100%; }
.fco-flat-bonus-selector { width: 100%; }
.fco-flat-bonus-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
.fco-flat-bonus-btn { min-height: 28px; border: 1px solid var(--border); border-radius: 7px; background: var(--surface); color: var(--text-muted); font-family: var(--mono); font-size: 11px; font-weight: 850; cursor: pointer; }
.fco-flat-bonus-btn:hover { border-color: #465366; background: #151a22; color: #e8edf5; }
.fco-flat-bonus-btn.on { border-color: #b3e400; background: rgba(179,228,0,.1); color: #b3e400; box-shadow: inset 0 0 0 1px rgba(179,228,0,.22); }
```

- [ ] **Step 5: Add responsive CSS**

Near the existing responsive rules in `client/src/fco/fco.css`, add:

```css
@media (max-width: 760px) {
  .fa-upgrade-panel { width: 100%; margin-left: 0; }
  .fa-upgrade-controls { grid-template-columns: 1fr; }
  .fa-upgrade-summary-text { white-space: normal; }
}
```

- [ ] **Step 6: Run tests and lint**

Run:

```bash
rtk npx --prefix client vitest run client/src/fco/views/DetailView.bonus.test.js
rtk npm --prefix client run lint
```

Expected: Vitest PASS. Lint PASS or only pre-existing unrelated warnings; fix any new `DetailView.jsx` issues.

- [ ] **Step 7: Commit**

Run:

```bash
rtk git add "client/src/fco/views/DetailView.jsx" "client/src/fco/fco.css"
rtk git commit -m "$(cat <<'EOF'
feat: collapse detail bonus controls

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Verify in the browser

**Files:**
- Modify: no source files expected unless verification finds a defect.

**Interfaces:**
- Consumes: UI implemented by Tasks 1-3.
- Produces: verified behavior on `http://localhost:5173/players/6a3171e35e6c2103bf42549b`.

- [ ] **Step 1: Start the Vite app**

Run:

```bash
rtk npm --prefix client run dev
```

Expected: Vite starts and prints a local URL, usually `http://localhost:5173/`.

- [ ] **Step 2: Open the detail page in a browser**

Navigate to:

```text
http://localhost:5173/players/6a3171e35e6c2103bf42549b
```

Expected: player detail page loads with a collapsed upgrade/bonus panel in the hero area.

- [ ] **Step 3: Verify collapsed summary default**

Expected visible summary includes:

```text
Grade +1 (stat +0, OVR +0) · Lvl +0 · Bonus +0 · Stat +0
```

- [ ] **Step 4: Verify expand/collapse**

Click the collapsed panel summary.

Expected: the panel expands and shows Grade, Lvl, and Bonus selectors.

Click the summary again.

Expected: the panel collapses and the selector body disappears.

- [ ] **Step 5: Verify flat Lvl behavior**

Expand the panel, record the displayed OVR and one visible stat value, then click `Lvl +10`.

Expected: displayed OVR and the visible stat both increase by `10` compared with the default Grade +1 state.

- [ ] **Step 6: Verify flat Bonus behavior**

Click `Bonus +10` while `Lvl +10` is still selected.

Expected: displayed OVR and the visible stat both increase by another `10`; summary shows `Lvl +10 · Bonus +10`.

- [ ] **Step 7: Verify Grade still uses existing behavior**

Click a Grade value above `+1`, such as `+5`.

Expected: summary shows `Grade +5`; stat increase includes `stat +4`, while OVR increase follows the existing upgrade rule rather than simply `+4`.

- [ ] **Step 8: Verify reset on player change**

Navigate to a different player detail page from related players or the app search, then inspect the panel.

Expected: panel is collapsed and summary returns to `Grade +1`, `Lvl +0`, `Bonus +0`.

- [ ] **Step 9: Stop the dev server and commit any verification fixes**

If no fixes were needed, do not commit. If fixes were needed, run:

```bash
rtk git add "client/src/fco/views/DetailView.jsx" "client/src/fco/fco.css" "client/src/fco/views/DetailView.bonus.test.js"
rtk git commit -m "$(cat <<'EOF'
fix: verify detail bonus panel behavior

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Notes

- Spec coverage: Tasks cover Grade/Lvl/Bonus controls, flat Lvl/Bonus math, collapsible UI, reset-on-player-change, no server/API changes, and browser verification.
- Placeholder scan: no TBD/TODO/fill-in-later language remains.
- Type consistency: `getDetailBonusModel`, `applyDetailBonuses`, `levelBonus`, `teamColorBonus`, and `isUpgradePanelOpen` names are consistent across tasks.
