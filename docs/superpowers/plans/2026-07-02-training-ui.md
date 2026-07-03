# Training OVR UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the FCO Training OVR tab into a larger, clearer coach-dashboard UI without heavy AI-looking glow effects.

**Architecture:** Keep the implementation local to `TrainingOvrTab` in `client/src/fco/views/DetailView.jsx` and its styles in `client/src/fco/fco.css`. Reuse the existing `training` state, OVR calculation helper, and plus/minus constraints while changing only rendering and presentation.

**Tech Stack:** React 19, Vite, Vitest, plain CSS using existing FCO design tokens.

## Global Constraints

- Implement on branch `master`.
- Do not change `calculateTrainingOvr` or `trainingOvrConfig.js` coefficient data.
- Do not change the tab system or player detail data model.
- Preserve maximum 5 trained stats and maximum +2 per stat.
- Preserve reset and reset-on-position-change behavior.
- Avoid strong glow, loud gradients, or AI-looking visual effects.
- Use `rtk` prefix for shell commands.
- Do not commit unless the user explicitly requests a commit.

---

## File Structure

- Modify `client/src/fco/views/DetailView.jsx`: replace the current compact summary/table markup inside `TrainingOvrTab` with a dashboard header, five training slots, and clearer stat rows.
- Modify `client/src/fco/fco.css`: replace the existing `.fco-training-*` rules with dashboard, slot, and row styles plus responsive behavior.
- Test `client/src/fco/views/trainingOvrConfig.test.js`: unchanged, run to verify formula/config behavior still passes.
- Test `client/src/fco/views/DetailView.bonus.test.js`: unchanged, run to catch detail-view regressions.

---

### Task 1: Redesign TrainingOvrTab markup

**Files:**
- Modify: `client/src/fco/views/DetailView.jsx:257-365`

**Interfaces:**
- Consumes: `calculateTrainingOvr({ position, statValues, training })`, `getTrainingStats(position)`, `statColor(value)`.
- Produces: CSS class hooks `.fco-training-dashboard`, `.fco-training-slots`, `.fco-training-row`, `.fco-training-row.on`, `.fco-training-points`, `.fco-training-controls`.

- [ ] **Step 1: Replace the old summary/table JSX**

In `client/src/fco/views/DetailView.jsx`, inside `TrainingOvrTab`, keep all existing state, `useEffect`, `setPoint`, `reset`, `byKey`, `statValues`, and `trainingOvr` calculation. After `const gained = trainingOvr.gained;`, add:

```jsx
  const selectedTraining = stats
    .map((stat) => ({ ...stat, points: training[stat.name] || 0 }))
    .filter((stat) => stat.points > 0);
  const trainingSlots = Array.from({ length: 5 }, (_, index) => selectedTraining[index] || null);
```

Then replace the returned JSX with:

```jsx
  return (
    <div className="fco-training-tab">
      <div className="fco-training-dashboard">
        <div className="fco-training-dashboard-main">
          <div>
            <div className="fco-training-kicker">Đào tạo OVR · {position}</div>
            <div className="fco-training-helper">Tối đa 5 chỉ số, mỗi chỉ số +2 điểm</div>
          </div>
          <div className="fco-training-ovr-lockup">
            <span className="fco-training-ovr-value" style={{ color: statColor(ovrBefore) }}>{ovrBefore}</span>
            <span className="fco-training-ovr-arrow">→</span>
            <span className="fco-training-ovr-value after" style={{ color: gained > 0 ? 'var(--accent)' : statColor(ovrAfter) }}>
              {ovrAfter.toFixed(2)}
            </span>
          </div>
          <div className="fco-training-dashboard-actions">
            <span className={`fco-training-gain${gained > 0 ? ' on' : ''}`}>{gained > 0 ? `+${gained.toFixed(2)}` : '+0.00'} OVR</span>
            <span className="fco-training-count">{trainedCount}/5 chỉ số</span>
            <button type="button" className="fco-training-reset" onClick={reset} disabled={trainedCount === 0}>
              Đặt lại
            </button>
          </div>
        </div>
        <div className="fco-training-slots" aria-label="Chỉ số đang đào tạo">
          {trainingSlots.map((slot, index) => (
            <div key={slot?.name || `slot-${index}`} className={`fco-training-slot${slot ? ' filled' : ''}`}>
              <span>{slot ? slot.name : `Slot ${index + 1}`}</span>
              <strong>{slot ? `+${slot.points}` : '—'}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="fco-training-list">
        <div className="fco-training-list-head">
          <span>Chỉ số</span>
          <span>Hệ số</span>
          <span>Hiện tại</span>
          <span>Điểm rèn</span>
        </div>
        {stats.map((s) => {
          const base = byKey.get(s.statKey) ?? 0;
          const pts = training[s.name] || 0;
          const canAdd = pts < 2 && (pts > 0 || trainedCount < 5);
          const canSub = pts > 0;
          return (
            <div key={s.name} className={`fco-training-row${pts > 0 ? ' on' : ''}`}>
              <div className="fco-training-stat-name">
                <strong>{s.name}</strong>
              </div>
              <div className="fco-training-coef">{s.coefficient}%</div>
              <div className="fco-training-base" style={{ color: base > 0 ? statColor(base) : 'var(--text-faint)' }}>
                {base > 0 ? base : '—'}
              </div>
              <div className="fco-training-controls">
                <button
                  type="button"
                  className="fco-training-btn"
                  disabled={!canSub}
                  onClick={() => setPoint(s.name, -1)}
                  aria-label={`Giảm điểm ${s.name}`}
                >−</button>
                <span className="fco-training-points">{pts > 0 ? `+${pts}` : '0'}</span>
                <button
                  type="button"
                  className="fco-training-btn"
                  disabled={!canAdd}
                  onClick={() => setPoint(s.name, 1)}
                  aria-label={`Tăng điểm ${s.name}`}
                >+</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
```

- [ ] **Step 2: Run targeted tests**

Run:

```bash
rtk npm --prefix client test -- client/src/fco/views/trainingOvrConfig.test.js client/src/fco/views/DetailView.bonus.test.js
```

Expected: both test files pass. If the command filters differently under Vitest, run the same command without file args:

```bash
rtk npm --prefix client test
```

Expected: all client tests pass.

---

### Task 2: Add restrained dashboard and row styling

**Files:**
- Modify: `client/src/fco/fco.css:1520-1533`

**Interfaces:**
- Consumes: class names produced by Task 1.
- Produces: desktop and mobile styling for the redesigned training dashboard.

- [ ] **Step 1: Replace existing Training OVR CSS block**

In `client/src/fco/fco.css`, replace the current block from `/* ===== Training OVR tab ===== */` through `.fco-training-btn:not(:disabled):hover` with:

```css
/* ===== Training OVR tab ===== */
.fco-training-tab { padding: 8px 0; }
.fco-training-dashboard {
  border: 1px solid var(--border-soft);
  border-top: 2px solid color-mix(in srgb, var(--accent) 70%, transparent);
  border-radius: 14px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--surface-2) 94%, var(--accent) 6%), var(--surface-2));
  padding: 14px;
  margin-bottom: 12px;
}
.fco-training-dashboard-main { display: grid; grid-template-columns: minmax(150px, 1fr) auto minmax(132px, .8fr); gap: 14px; align-items: center; }
.fco-training-kicker { color: var(--text-primary); font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
.fco-training-helper { color: var(--text-faint); font-size: 12px; margin-top: 4px; }
.fco-training-ovr-lockup { display: flex; align-items: baseline; justify-content: center; gap: 10px; white-space: nowrap; }
.fco-training-ovr-value { font-family: var(--mono); font-size: 34px; font-weight: 900; line-height: .9; letter-spacing: -.05em; }
.fco-training-ovr-value.after { font-size: 40px; }
.fco-training-ovr-arrow { color: var(--text-faint); font-size: 18px; }
.fco-training-dashboard-actions { display: flex; align-items: flex-end; flex-direction: column; gap: 6px; }
.fco-training-gain { border: 1px solid var(--border-soft); border-radius: 999px; padding: 4px 9px; color: var(--text-dim); background: var(--surface); font-family: var(--mono); font-size: 12px; font-weight: 800; }
.fco-training-gain.on { border-color: color-mix(in srgb, var(--accent) 48%, var(--border-soft)); color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, var(--surface)); }
.fco-training-count { color: var(--text-faint); font-size: 12px; }
.fco-training-reset { padding: 4px 10px; border: 1px solid var(--border-soft); border-radius: 7px; background: var(--surface); color: var(--text-dim); font-size: 12px; cursor: pointer; }
.fco-training-reset:disabled { opacity: 0.35; cursor: default; }
.fco-training-reset:not(:disabled):hover { background: var(--surface-3); color: var(--text); }
.fco-training-slots { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 7px; margin-top: 12px; }
.fco-training-slot { min-width: 0; border: 1px dashed var(--border-soft); border-radius: 10px; padding: 7px 8px; color: var(--text-faint); background: color-mix(in srgb, var(--surface) 72%, transparent); display: flex; justify-content: space-between; gap: 6px; font-size: 12px; }
.fco-training-slot span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fco-training-slot strong { font-family: var(--mono); color: inherit; }
.fco-training-slot.filled { border-style: solid; border-color: color-mix(in srgb, var(--accent) 38%, var(--border-soft)); color: var(--text-primary); background: color-mix(in srgb, var(--accent) 8%, var(--surface)); }
.fco-training-list { display: flex; flex-direction: column; gap: 6px; }
.fco-training-list-head,
.fco-training-row { display: grid; grid-template-columns: minmax(120px, 1fr) 64px 72px 108px; gap: 10px; align-items: center; }
.fco-training-list-head { color: var(--text-faint); font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; padding: 0 10px 2px; }
.fco-training-row { border: 1px solid var(--border-soft); border-radius: 10px; background: var(--surface); padding: 8px 10px; font-size: 13px; }
.fco-training-row.on { border-color: color-mix(in srgb, var(--accent) 36%, var(--border-soft)); background: color-mix(in srgb, var(--accent) 7%, var(--surface)); }
.fco-training-stat-name { min-width: 0; }
.fco-training-stat-name strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-primary); font-weight: 700; }
.fco-training-coef { color: var(--text-faint); font-family: var(--mono); font-size: 12px; }
.fco-training-base { font-family: var(--mono); font-weight: 800; }
.fco-training-controls { display: flex; align-items: center; justify-content: flex-end; gap: 7px; }
.fco-training-btn { width: 25px; height: 25px; border: 1px solid var(--border-soft); border-radius: 7px; background: var(--surface-2); color: var(--text-primary); font-size: 15px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; }
.fco-training-btn:disabled { opacity: 0.35; cursor: default; }
.fco-training-btn:not(:disabled):hover { background: var(--surface-3); }
.fco-training-points { min-width: 20px; text-align: center; color: var(--text-primary); font-family: var(--mono); font-size: 12px; font-weight: 800; }
@media (max-width: 720px) {
  .fco-training-dashboard-main { grid-template-columns: 1fr; align-items: stretch; }
  .fco-training-ovr-lockup { justify-content: flex-start; }
  .fco-training-dashboard-actions { align-items: flex-start; flex-direction: row; flex-wrap: wrap; }
  .fco-training-slots { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .fco-training-list-head { display: none; }
  .fco-training-row { grid-template-columns: 1fr auto; grid-template-areas: "name controls" "meta controls"; }
  .fco-training-stat-name { grid-area: name; }
  .fco-training-coef { grid-area: meta; }
  .fco-training-base { grid-area: meta; margin-left: 58px; }
  .fco-training-controls { grid-area: controls; }
}
```

- [ ] **Step 2: Run targeted tests again**

Run:

```bash
rtk npm --prefix client test -- client/src/fco/views/trainingOvrConfig.test.js client/src/fco/views/DetailView.bonus.test.js
```

Expected: both test files pass.

---

### Task 3: Manual browser verification

**Files:**
- No code changes unless verification reveals a visual or behavior issue.

**Interfaces:**
- Consumes: completed Task 1 and Task 2 changes.
- Produces: verified UI behavior in the running app.

- [ ] **Step 1: Start the app**

Run:

```bash
rtk npm --prefix client run dev
```

Expected: Vite dev server starts and prints a local URL.

- [ ] **Step 2: Open the app in browser**

Use Playwright to navigate to the local Vite URL, then open a player detail page through the app UI.

Expected: player detail page loads without console errors.

- [ ] **Step 3: Verify golden path**

Manual checks:

- Select a position other than `OVR` in the position rating buttons.
- Open `Đào tạo OVR` tab.
- Confirm the dashboard header is visibly larger than the old summary row.
- Add one point to a stat and confirm OVR after, gain badge, counter, row state, and slot state update.
- Add a second point to the same stat and confirm the points display shows `+2`.
- Train five different stats and confirm untrained stats cannot be added until a point is removed.
- Click `Đặt lại` and confirm dashboard, slots, rows, and OVR return to initial values.
- Change to another position and confirm training state resets.

Expected: all checks pass.

- [ ] **Step 4: Verify responsive layout**

Resize browser to mobile width around 390px.

Expected: dashboard stacks cleanly, five slots wrap to two columns, stat rows remain readable, and plus/minus controls remain usable.

---

## Self-Review Notes

- Spec coverage: dashboard header, restrained visual tone, selected slots, clearer stat rows, limits, reset behavior, unchanged calculation/config/data model, automated tests, and manual browser checks are all covered.
- Placeholder scan: no TBD/TODO/implement-later placeholders.
- Type consistency: no new exported functions or external interfaces; all new data is local to `TrainingOvrTab`.
