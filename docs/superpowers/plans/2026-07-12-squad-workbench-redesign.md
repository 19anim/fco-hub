# Squad Workbench Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Squad page into a FIFAAddict-native squadmaker workbench that is pitch-first, dense, asset-driven, and not a generic SaaS dashboard.

**Architecture:** Keep existing squad state, helpers, drag/drop, modals, and player picker behavior. Add focused workbench/HUD components inside `SquadView.jsx`, pass them into `SquadPitchEditor.jsx`, and adjust `squad.css` so the page reads as a compact utility tool rather than a vertical dashboard. Avoid broad restructuring outside the Squad page.

**Tech Stack:** React 19, Vite, CSS modules imported through `client/src/fco/fco.css`, existing FCO helpers/components, Vitest for unit tests, Playwright/browser verification for UI behavior.

## Global Constraints

- Do not redesign every FCO page uniformly.
- Do not create a SaaS-style hero/card dashboard.
- Do not add decorative glow, loud gradients, or invented visual effects.
- Do not replace the current pitch/card asset system.
- Preserve current drag/drop squad editing behavior.
- Preserve salary cap editing.
- Preserve team grade selection.
- Preserve team-color focus interactions.
- Keep touch targets usable; compact does not mean tiny.
- Do not rely on hover-only controls for critical actions.
- Use `rtk` prefix for shell commands.
- Do not commit unless the user explicitly asks.

---

## File Structure

- Modify: `client/src/fco/views/SquadView.jsx`
  - Owns the page-level workbench: command bar, compact salary HUD, compact OVR HUD, team-color status module, and layout passed to `SquadPitchEditor`.
- Modify: `client/src/fco/components/SquadPitchEditor.jsx`
  - Keeps editing behavior and pitch/rail internals. Accepts optional `toolbar`, `pitchHeader`, and `railHeader` nodes so `SquadView` can place workbench controls without duplicating editor logic.
- Modify: `client/src/fco/styles/squad.css`
  - Restyles Squad page, control bar, compact HUD, pitch/rail workbench, and responsive layout.
- Test: `client/src/fco/squadSummary.test.js`
  - Existing helper-level behavior if present; otherwise add minimal tests only if helper behavior is changed. This plan should not require helper changes.

---

### Task 1: Move Squad page controls into a workbench command bar

**Files:**
- Modify: `client/src/fco/views/SquadView.jsx:1-181`
- Modify: `client/src/fco/components/SquadPitchEditor.jsx:163-739`
- Modify: `client/src/fco/styles/squad.css:1-117`

**Interfaces:**
- Consumes: `SquadPitchEditor` props `squad`, `onChange`, `perPlayerBonus`, `ovrBonusBySlot`, `defaultAddLevel`, `headTeamGrade`, `onHeadTeamGradeChange`, `activeTeamColorFocus`, `railTop`, `railBottom`.
- Produces: New optional props on `SquadPitchEditor`:
  - `toolbar?: ReactNode` renders inside the editor control bar before formation controls.
  - `pitchHeader?: ReactNode` renders immediately above the pitch inside the main column.
  - `railHeader?: ReactNode` renders at the top of the rail panel before roster rows.

- [ ] **Step 1: Add optional editor slots**

In `client/src/fco/components/SquadPitchEditor.jsx`, update the function signature:

```jsx
export default function SquadPitchEditor({
  squad,
  onChange,
  readOnly = false,
  perPlayerBonus = EMPTY_BONUS_MAP,
  ovrBonusBySlot = EMPTY_BONUS_MAP,
  defaultAddLevel = MIN_UPGRADE_LEVEL,
  showQuickGrade = true,
  railTop = null,
  railBottom = null,
  toolbar = null,
  pitchHeader = null,
  railHeader = null,
  headTeamGrade = MIN_UPGRADE_LEVEL,
  onHeadTeamGradeChange = null,
  activeTeamColorFocus = null,
  pitchColor = null,
}) {
```

- [ ] **Step 2: Render the new slots without changing behavior**

In the JSX around the existing controls, render `toolbar` first and `pitchHeader` before the pitch:

```jsx
<div className="fco-squad-controls-bar">
  {toolbar}
  <div className="fco-squad-controls-actions">
    <div className="fco-squad-formation-select-wrap">
      {/* existing formation select block stays unchanged */}
    </div>

    {!readOnly && showQuickGrade && filledCount > 0 && (
      <div className="fco-squad-toolbar-group">
        <span className="fco-squad-toolbar-label">Cấp nhanh cả đội</span>
        <TeamGradePopover value={headTeamGrade} onChange={applyQuickLevel} />
      </div>
    )}

    {!readOnly && filledCount > 0 && (
      <Button variant="ghost" size="sm" icon={I.Refresh} onClick={clearSquad}>
        Xoá đội hình
      </Button>
    )}
  </div>
</div>

{pitchHeader}

<div
  className={`fco-squad-pitch${activeTeamColorFocus ? ' pitch--teamcolor-focus' : ''}${pitchColor ? ' fco-squad-pitch--tinted' : ''}`}
```

Inside the rail roster section, render `railHeader` before the roster header:

```jsx
<section className="fco-squad-rail-panel fco-squad-rail-roster">
  {railHeader}
  <div className="fco-squad-rail-roster-head">
```

- [ ] **Step 3: Replace the page header in SquadView**

In `client/src/fco/views/SquadView.jsx`, remove this block:

```jsx
<div className="fco-up-machine-head">
  <div>
    <h2 className="fco-h2">Xây dựng đội hình</h2>
    <p className="fco-sub">Chọn 11 cầu thủ đá chính, kéo thả để đổi vị trí và xem team color được kích hoạt.</p>
  </div>
</div>
```

Add compact nodes before `return`:

```jsx
const filledCount = starters.length;
const emptyCount = Math.max(0, 11 - filledCount);

const workbenchToolbar = (
  <div className="fco-squad-workbench-bar" aria-label="Công cụ đội hình">
    <div className="fco-squad-workbench-title">
      <span className="fco-squad-workbench-kicker">Squadmaker</span>
      <strong>Xây dựng đội hình</strong>
    </div>
    <div className="fco-squad-workbench-meta">
      <span>{filledCount}/11 cầu thủ</span>
      <span>{emptyCount} vị trí trống</span>
    </div>
  </div>
);
```

Pass it to `SquadPitchEditor`:

```jsx
<SquadPitchEditor
  squad={squad}
  onChange={handleSquadChange}
  perPlayerBonus={squadBonuses.perPlayer}
  ovrBonusBySlot={liveOvrBonusBySlot}
  defaultAddLevel={teamGrade}
  headTeamGrade={teamGrade}
  onHeadTeamGradeChange={setTeamGrade}
  activeTeamColorFocus={activeTeamColorFocus}
  toolbar={workbenchToolbar}
  railTop={<MonetizationSlot placement="squad_top" limit={1} className="fco-squad-rail-ad" />}
  railBottom={<MonetizationSlot placement="squad_bottom" limit={1} className="fco-squad-rail-ad" />}
/>
```

- [ ] **Step 4: Add command bar CSS**

In `client/src/fco/styles/squad.css`, replace the first control block with:

```css
.fco-squad-view { display: flex; flex-direction: column; gap: 10px; }
.fco-squad-controls-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 7px 9px;
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.01)), #0d1116;
  border: 1px solid var(--border);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.035);
}
.fco-squad-workbench-bar { display: flex; align-items: center; gap: 12px; min-width: 0; }
.fco-squad-workbench-title { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.fco-squad-workbench-title strong { font-size: 14px; font-weight: 850; color: var(--text); white-space: nowrap; }
.fco-squad-workbench-kicker { font-family: var(--mono); font-size: 10px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; color: var(--accent); }
.fco-squad-workbench-meta { display: flex; align-items: center; gap: 7px; color: var(--text-faint); font-size: 11px; font-weight: 750; }
.fco-squad-workbench-meta span { padding-left: 7px; border-left: 1px solid var(--border-soft); }
.fco-squad-controls-actions { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 8px; }
.fco-squad-toolbar-group { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.fco-squad-toolbar-label { font-family: var(--mono); font-size: 10px; font-weight: 800; color: var(--text-faint); text-transform: uppercase; letter-spacing: .06em; }
```

- [ ] **Step 5: Run lint**

Run:

```bash
rtk npm --prefix client run lint
```

Expected: no new lint errors in `SquadView.jsx` or `SquadPitchEditor.jsx`.

- [ ] **Step 6: Browser check**

Run the app if not already running:

```bash
rtk npm --prefix client run dev
```

Open the Squad page. Expected: the old page title is gone; a compact command bar appears above the pitch; formation, quick grade, and clear squad still work.

---

### Task 2: Convert summary cards into compact workbench HUD modules

**Files:**
- Modify: `client/src/fco/views/SquadView.jsx:80-179`
- Modify: `client/src/fco/styles/squad.css:28-66`

**Interfaces:**
- Consumes: `salaryTotal`, `salaryCap`, `salaryProgress`, `isOverSalaryCap`, `isEditingSalaryCap`, `lineAverages`, `TeamColorStrip`.
- Produces:
  - `pitchHeader: ReactNode` passed to `SquadPitchEditor`.
  - compact salary and OVR HUD blocks using existing data.

- [ ] **Step 1: Create compact pitch header in SquadView**

Replace the existing top-level `fco-squad-summary-strip` JSX with a `pitchHeader` constant before `return`:

```jsx
const pitchHeader = (
  <div className="fco-squad-pitch-hud" aria-label="Tóm tắt đội hình">
    <div className={`fco-squad-hud-cell fco-squad-hud-cell--salary${isOverSalaryCap ? ' is-over-limit' : ''}`}>
      <span className="fco-squad-hud-label">Lương</span>
      <span className="fco-squad-hud-value">
        <strong>{salaryTotal}</strong>
        <span>/</span>
        <span className="fco-squad-hud-cap">
          {isEditingSalaryCap ? (
            <input
              type="number"
              min={0}
              max={MAX_SALARY_CAP}
              value={salaryCap}
              autoFocus
              onChange={(e) => {
                const next = Math.max(0, Math.min(MAX_SALARY_CAP, Number(e.target.value) || 0));
                setSalaryCap(next);
              }}
              onBlur={() => setIsEditingSalaryCap(false)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setIsEditingSalaryCap(false); }}
              className="fco-squad-summary-cap-input"
            />
          ) : (
            <button type="button" className="fco-squad-hud-cap-button" onClick={() => setIsEditingSalaryCap(true)}>
              {salaryCap}
            </button>
          )}
        </span>
      </span>
      <span className="fco-squad-hud-meter"><span style={{ width: `${salaryProgress}%` }} /></span>
    </div>

    <div className="fco-squad-hud-cell fco-squad-hud-cell--ovr">
      <span className="fco-squad-hud-label">OVR</span>
      <strong className="fco-squad-hud-overall">{lineAverages.overall ?? '—'}</strong>
      <div className="fco-squad-hud-lines">
        {['GK', 'DEF', 'MID', 'FWD'].map((key) => {
          const value = lineAverages[key];
          const progress = value == null ? 0 : Math.min(100, (value / 150) * 100);
          return (
            <span key={key} className={`fco-squad-hud-line line-${key.toLowerCase()}`}>
              <em>{key}</em>
              <span><span style={{ width: `${progress}%` }} /></span>
              <b>{value ?? '—'}</b>
            </span>
          );
        })}
      </div>
    </div>

    <TeamColorStrip result={liveTeamColor} loading={liveTeamColorLoading} error={liveTeamColorError} bySlotId={bySlotId} />
  </div>
);
```

- [ ] **Step 2: Pass pitchHeader into SquadPitchEditor**

Update the `SquadPitchEditor` call:

```jsx
<SquadPitchEditor
  squad={squad}
  onChange={handleSquadChange}
  perPlayerBonus={squadBonuses.perPlayer}
  ovrBonusBySlot={liveOvrBonusBySlot}
  defaultAddLevel={teamGrade}
  headTeamGrade={teamGrade}
  onHeadTeamGradeChange={setTeamGrade}
  activeTeamColorFocus={activeTeamColorFocus}
  toolbar={workbenchToolbar}
  pitchHeader={pitchHeader}
  railTop={<MonetizationSlot placement="squad_top" limit={1} className="fco-squad-rail-ad" />}
  railBottom={<MonetizationSlot placement="squad_bottom" limit={1} className="fco-squad-rail-ad" />}
/>
```

Remove the old inline `fco-squad-summary-strip` block from the returned JSX.

- [ ] **Step 3: Add compact HUD CSS**

In `client/src/fco/styles/squad.css`, replace `.fco-squad-summary-strip` through `.fco-squad-summary-ovr-total` with:

```css
.fco-squad-pitch-hud {
  width: min(100%, 900px);
  justify-self: center;
  display: grid;
  grid-template-columns: minmax(148px, 180px) minmax(220px, 1fr) minmax(150px, 188px);
  gap: 6px;
  margin-top: 4px;
}
.fco-squad-hud-cell,
.fco-squad-summary-card {
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.012)), rgba(9,13,18,.92);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.035);
}
.fco-squad-hud-cell { display: grid; gap: 5px; padding: 7px 9px; }
.fco-squad-hud-cell.is-over-limit { border-color: rgba(226,86,111,.58); background: rgba(53,18,25,.88); }
.fco-squad-hud-label,
.fco-squad-summary-eyebrow { font-family: var(--mono); font-size: 9.5px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; color: var(--text-faint); }
.fco-squad-hud-value { display: flex; align-items: baseline; gap: 4px; font-family: var(--mono); line-height: 1; }
.fco-squad-hud-value strong { font-size: 22px; font-weight: 900; color: var(--accent); }
.fco-squad-hud-value span { color: var(--text-dim); font-weight: 750; }
.fco-squad-hud-cap-button { border: 0; background: transparent; color: var(--text-dim); font: inherit; cursor: pointer; padding: 0; }
.fco-squad-hud-cap-button:hover,
.fco-squad-hud-cap-button:focus-visible { color: var(--text); outline: none; }
.fco-squad-hud-meter { height: 5px; overflow: hidden; border-radius: 999px; background: rgba(255,255,255,.08); }
.fco-squad-hud-meter > span { display: block; height: 100%; border-radius: inherit; background: #79d86e; }
.fco-squad-hud-cell.is-over-limit .fco-squad-hud-value strong { color: #ff7a7a; }
.fco-squad-hud-cell.is-over-limit .fco-squad-hud-meter > span { background: #e2566f; }
.fco-squad-hud-cell--ovr { grid-template-columns: auto minmax(0, 1fr); align-items: center; }
.fco-squad-hud-cell--ovr .fco-squad-hud-label { grid-column: 1 / -1; }
.fco-squad-hud-overall { font-family: var(--mono); font-size: 26px; line-height: .9; color: var(--text); }
.fco-squad-hud-lines { display: grid; gap: 4px; }
.fco-squad-hud-line { display: grid; grid-template-columns: 28px minmax(0, 1fr) 24px; align-items: center; gap: 5px; }
.fco-squad-hud-line em { font-style: normal; font-family: var(--mono); font-size: 9.5px; font-weight: 900; color: var(--text-faint); }
.fco-squad-hud-line > span { height: 5px; overflow: hidden; border-radius: 99px; background: rgba(255,255,255,.08); }
.fco-squad-hud-line > span > span { display: block; height: 100%; border-radius: inherit; }
.fco-squad-hud-line b { font-family: var(--mono); font-size: 10.5px; color: var(--text-dim); text-align: right; }
.fco-squad-hud-line.line-gk > span > span { background: #f5b642; }
.fco-squad-hud-line.line-def > span > span { background: #4c9cff; }
.fco-squad-hud-line.line-mid > span > span { background: #53c66f; }
.fco-squad-hud-line.line-fwd > span > span { background: #e96565; }
```

- [ ] **Step 4: Preserve TeamColorStrip compactness**

Keep `TeamColorStrip` in `TeamColorStrip.jsx` unchanged. The CSS above intentionally keeps `.fco-squad-summary-card` compatibility so the component does not need new props.

- [ ] **Step 5: Run lint**

Run:

```bash
rtk npm --prefix client run lint
```

Expected: no new lint errors.

- [ ] **Step 6: Browser check**

Expected on Squad page: salary cap edit still works; OVR line bars render compactly; Team Color status still opens details; the pitch begins below a compact HUD instead of separate metric cards.

---

### Task 3: Make the pitch and rail read as one workbench

**Files:**
- Modify: `client/src/fco/views/SquadView.jsx:80-179`
- Modify: `client/src/fco/styles/squad.css:67-113`

**Interfaces:**
- Consumes: `filledCount`, `salaryTotal`, `salaryCap`, `lineAverages.overall`.
- Produces: `railHeader: ReactNode` passed into `SquadPitchEditor`.

- [ ] **Step 1: Add rail header in SquadView**

Add this constant before `return`:

```jsx
const railHeader = (
  <div className="fco-squad-rail-workbench-head">
    <div>
      <span className="fco-squad-workbench-kicker">Roster</span>
      <strong>{filledCount}/11 starters</strong>
    </div>
    <div className="fco-squad-rail-workbench-numbers">
      <span>FP {salaryTotal}/{salaryCap}</span>
      <span>OVR {lineAverages.overall ?? '—'}</span>
    </div>
  </div>
);
```

Pass it to `SquadPitchEditor`:

```jsx
railHeader={railHeader}
```

- [ ] **Step 2: Tighten workbench layout CSS**

In `client/src/fco/styles/squad.css`, update the layout and rail section:

```css
.fco-squad-layout { display: grid; grid-template-columns: minmax(0, 900px) minmax(276px, 340px); justify-content: center; align-items: start; gap: 12px; margin-top: 8px; }
.fco-squad-maincol { min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.fco-squad-rail { display: grid; grid-template-rows: auto 1fr auto; gap: 8px; align-self: start; position: sticky; top: 94px; }
.fco-squad-rail-panel { background: #0d1116; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; box-shadow: inset 0 1px 0 rgba(255,255,255,.035); }
.fco-squad-rail-workbench-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 10px; border-bottom: 1px solid var(--border); background: rgba(255,255,255,.025); }
.fco-squad-rail-workbench-head div:first-child { display: grid; gap: 2px; }
.fco-squad-rail-workbench-head strong { font-size: 12px; color: var(--text); }
.fco-squad-rail-workbench-numbers { display: grid; gap: 2px; text-align: right; font-family: var(--mono); font-size: 10px; font-weight: 800; color: var(--text-faint); }
.fco-squad-rail-roster-head { display: grid; grid-template-columns: 34px minmax(0, 1fr) 46px 32px 40px; align-items: center; gap: 6px; padding: 7px 10px; border-bottom: 1px solid var(--border-soft); font-family: var(--mono); font-size: 9.5px; font-weight: 900; text-transform: uppercase; letter-spacing: .06em; color: var(--text-faint); }
.fco-squad-rail-roster-row { display: grid; grid-template-columns: 34px minmax(0, 1fr) 46px 32px 40px; align-items: center; gap: 6px; min-height: 36px; padding: 5px 10px; border: none; border-bottom: 1px solid var(--border-soft); background: transparent; color: var(--text); font-size: 12px; text-align: left; cursor: pointer; transition: background .12s ease, color .12s ease; }
```

Keep the existing `.fco-squad-rail-roster-row` hover/empty/add rules after this block.

- [ ] **Step 3: Check rail keyboard behavior**

No code changes required. Verify that filled rail rows still have `role="button"`, `tabIndex={0}`, and `onKeyDown={handleRosterEditKey}`.

- [ ] **Step 4: Run lint**

Run:

```bash
rtk npm --prefix client run lint
```

Expected: no new lint errors.

- [ ] **Step 5: Browser check**

Expected: the roster rail appears as a first-class editor panel with a compact header; filled rows open edit modal; empty rows open picker; rail remains adjacent to pitch on desktop.

---

### Task 4: Tune responsive workbench behavior

**Files:**
- Modify: `client/src/fco/styles/squad.css:114-end`

**Interfaces:**
- Consumes: CSS classes from Tasks 1-3.
- Produces: responsive Squad page that avoids horizontal page scroll and keeps pitch before roster details.

- [ ] **Step 1: Add desktop/tablet breakpoints**

Add or update the existing media rules:

```css
@media (max-width: 1160px) {
  .fco-squad-layout { grid-template-columns: minmax(0, 900px); }
  .fco-squad-rail { position: static; }
  .fco-squad-pitch-hud { grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); }
  .fco-squad-pitch-hud .team-color-strip { grid-column: 1 / -1; }
}

@media (max-width: 760px) {
  .fco-squad-controls-bar { grid-template-columns: minmax(0, 1fr); }
  .fco-squad-controls-actions { justify-content: flex-start; }
  .fco-squad-workbench-bar { align-items: flex-start; flex-direction: column; gap: 4px; }
  .fco-squad-workbench-meta { flex-wrap: wrap; }
  .fco-squad-pitch-hud { grid-template-columns: minmax(0, 1fr); }
  .fco-squad-hud-cell--ovr { grid-template-columns: auto minmax(0, 1fr); }
  .fco-squad-rail-roster-head,
  .fco-squad-rail-roster-row { grid-template-columns: 32px minmax(0, 1fr) 38px 30px 36px; padding-left: 8px; padding-right: 8px; }
}
```

- [ ] **Step 2: Ensure compact controls remain tappable**

Add CSS for minimum heights where needed:

```css
.fco-squad-formation-select,
.fco-team-grade-trigger,
.fco-squad-hud-cap-button,
.summary-edit-icon { min-height: 32px; }
.fco-squad-rail-roster-row { min-height: 36px; }
@media (pointer: coarse) {
  .fco-squad-formation-select,
  .fco-team-grade-trigger,
  .fco-squad-hud-cap-button,
  .summary-edit-icon { min-height: 40px; }
  .fco-squad-rail-roster-row { min-height: 44px; }
}
```

- [ ] **Step 3: Run lint**

Run:

```bash
rtk npm --prefix client run lint
```

Expected: no JS lint errors; CSS is not linted by the current package scripts.

- [ ] **Step 4: Browser check at desktop and narrow width**

Use browser devtools or resize the Playwright/browser window.

Expected desktop: pitch and rail are side by side.
Expected narrow viewport: pitch/HUD stack first, roster follows, no horizontal page scroll.

---

### Task 5: Verify behavior end-to-end in the real app

**Files:**
- No source changes expected.

**Interfaces:**
- Consumes: completed Tasks 1-4.
- Produces: verified Squad page behavior and notes for any follow-up fixes.

- [ ] **Step 1: Start the app**

Run:

```bash
rtk npm --prefix client run dev
```

Expected: Vite dev server starts and prints a local URL.

- [ ] **Step 2: Open the Squad page**

Use the browser at the local dev URL and navigate to `/squad-maker`.

Expected: the Squad page loads with the workbench command bar, compact HUD, pitch, and roster rail.

- [ ] **Step 3: Verify salary cap editing**

Click the salary cap value in the compact HUD, change it to `260`, press Enter.

Expected: cap value updates, the salary meter changes, and over-limit styling appears only when `salaryTotal > 260`.

- [ ] **Step 4: Verify team grade selection**

Use the quick grade control in the command bar.

Expected: filled player cards update their displayed grade; no picker or modal opens accidentally.

- [ ] **Step 5: Verify roster interactions**

Click an empty roster row.

Expected: player picker opens for that slot.

Click a filled roster row if a saved squad has players.

Expected: edit modal opens, grade controls and season switching remain available.

- [ ] **Step 6: Verify pitch interactions**

Click an empty pitch slot.

Expected: player picker opens.

Drag a non-GK slot.

Expected: custom formation drag behavior still works and position zone feedback appears.

- [ ] **Step 7: Verify team-color interactions**

If the squad has active team colors, click a pitch team-color badge.

Expected: matched/qualified players focus on pitch, dimming behavior still works, and detail modal still opens from the Team Color status module.

- [ ] **Step 8: Run production build**

Run:

```bash
rtk npm --prefix client run build
```

Expected: build succeeds.

- [ ] **Step 9: Record final status**

Summarize:

```text
Verified:
- Squad page workbench layout loads
- Salary cap edit works
- Team grade selection works
- Roster/pitch picker flows work
- Team-color focus/details work when data is present
- Desktop and narrow viewport do not horizontally scroll
- Build succeeds
```

If any item fails, fix the source change in the task that introduced the failure and rerun the relevant verification step.
