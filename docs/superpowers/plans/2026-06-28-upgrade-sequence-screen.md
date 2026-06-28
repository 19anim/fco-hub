# Upgrade Sequence Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inline upgrade status area with a temporary full upgrade sequence screen that runs for 1 second before showing success or failure.

**Architecture:** Keep the feature inside `UpgradeView.jsx` and `fco.css`. Reuse the existing `animStatus` state machine (`idle`, `running`, `success`, `fail`) and existing `rollUpgrade(successRate)` helper; render the normal simulator only while idle and render a dedicated sequence screen while not idle.

**Tech Stack:** React 19, Vite, Vitest, CSS in `client/src/fco/fco.css`.

## Global Constraints

- Running phase must last 1 second.
- Result phase must last approximately 1.5–2 seconds before returning to the form.
- Keep `upgradeHelpers.js` math and random result behavior unchanged.
- Do not add a new route or page-level navigation.
- Keep the change inside `client/src/fco/views/UpgradeView.jsx` and `client/src/fco/fco.css` unless the implementation proves the JSX is too hard to read.
- Inputs remain unavailable while the sequence screen is active because the form is not rendered.
- Do not stage or commit `9router_data/`; it contains local runtime files and secrets.

---

## File Structure

- Modify `client/src/fco/views/UpgradeView.jsx`: add derived display data for the sequence screen, change the render flow so `animStatus !== 'idle'` shows the sequence screen instead of the simulator form, and adjust `doUpgrade()` to use a 1 second running timer.
- Modify `client/src/fco/fco.css`: add full-screen sequence styles and reuse/extend existing `.fco-up-animation-ring` state styling.
- No changes to `client/src/fco/upgradeHelpers.js`: upgrade math and `rollUpgrade()` remain unchanged.
- No new route files: the sequence is a temporary state inside the existing simulator view.

---

### Task 1: Render a dedicated sequence screen during upgrade

**Files:**
- Modify: `client/src/fco/views/UpgradeView.jsx:25-352`
- Modify: `client/src/fco/fco.css:591-676`

**Interfaces:**
- Consumes: existing `animStatus: 'idle' | 'running' | 'success' | 'fail'`, `mainPlayer`, `level`, `nextLevel`, `targetOvr`, `sessionPercent`, `upgradeGauge.successRate`, `doUpgrade()`.
- Produces: `const isSequenceActive = animStatus !== 'idle';` and JSX branch that renders `.fco-up-sequence-screen` while active.

- [ ] **Step 1: Confirm the current simulator tests still pass before editing**

Run from the repository root:

```bash
rtk npm --prefix client test -- upgradeHelpers.test.js
```

Expected: PASS for `client/src/fco/upgradeHelpers.test.js`. If unrelated environment failures appear, note them before editing; do not change helper math for this task.

- [ ] **Step 2: Add sequence labels and 1 second running timing**

In `client/src/fco/views/UpgradeView.jsx`, keep imports unchanged and update the derived state area before `function doUpgrade()` to include these constants:

```jsx
  const canUpgrade = Boolean(animStatus === 'idle' && mainPlayer && materialOvrs.length > 0 && level < MAX_UPGRADE_LEVEL);
  const sessionPercent = Math.min(100, upgradeGauge.gaugeRatio * 100);
  const nextLevel = Math.min(MAX_UPGRADE_LEVEL, level + 1);
  const isSequenceActive = animStatus !== 'idle';
  const sequenceCopy = {
    running: 'Đang nâng cấp...',
    success: 'Thành công',
    fail: 'Thất bại',
  }[animStatus] || 'Sẵn sàng';
```

Then update `doUpgrade()` so the result resolves after 1 second and the result remains visible for 1.7 seconds:

```jsx
  function doUpgrade() {
    if (!canUpgrade) return;
    setAnimStatus('running');

    clearTimeout(cancelRef.current);
    cancelRef.current = setTimeout(() => {
      const success = rollUpgrade(upgradeGauge.successRate);
      if (success) {
        setAnimStatus('success');
        setLevel(prev => Math.min(MAX_UPGRADE_LEVEL, Math.max(MIN_UPGRADE_LEVEL, prev) + 1));
      } else {
        setAnimStatus('fail');
        if (!isSafeMode) setLevel(prev => Math.max(MIN_UPGRADE_LEVEL, prev - 1));
      }

      cancelRef.current = setTimeout(() => setAnimStatus('idle'), 1700);
    }, 1000);
  }
```

- [ ] **Step 3: Add the sequence render branch above the normal simulator body**

In `client/src/fco/views/UpgradeView.jsx`, inside the top-level returned `<div className="fco-up-view fco-up-machine-view">`, keep the existing header unchanged. Immediately after the header and before the current `<div className="fco-up-machine-stage">`, insert this conditional branch:

```jsx
      {mainPlayer && isSequenceActive ? (
        <div className={`fco-up-sequence-screen ${animStatus}`}>
          <div className="fco-up-sequence-backdrop" />
          <div className="fco-up-sequence-card">
            <div className="fco-up-sequence-player">
              <div className={`fco-up-card fco-up-${animStatus}`}>
                <PlayerAvatar player={mainPlayer} size={156} />
                <div className="fco-up-card-info">
                  <div className="fco-up-card-name">{cleanName(mainPlayer.name)}</div>
                  <div className="fco-up-card-sub">
                    <SeasonChip season={mainPlayer.season} />
                    <OvrBox value={targetOvr} />
                    <LevelBadge level={level} />
                  </div>
                </div>
              </div>
            </div>

            <div className="fco-up-sequence-meta">
              <span>Phiên nâng cấp</span>
              <strong>+{level} → +{nextLevel}</strong>
              <small>{sessionPercent.toFixed(2)}% vạch · {(upgradeGauge.successRate * 100).toFixed(2)}% thành công</small>
            </div>

            <div className={`fco-up-sequence-ring ${animStatus}`}>
              <div className="fco-up-sequence-ring-core">
                <span>{sequenceCopy}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
```

Then wrap the existing simulator stage and any simulator-only result/action UI in the `else` branch. The current block beginning with:

```jsx
      <div className="fco-up-machine-stage">
```

must become the first element inside the `else` branch, and the branch must close immediately before the picker modal conditional:

```jsx
      )}

      {pickerMode && (
        <PlayerPicker
```

Do not include the old inline `.fco-up-animation-ring` block in the sequence screen. Leave it in the form branch only if it still makes sense while idle; if the normal form would show only “Sẵn sàng”, remove that inline ring and keep the action row/result messages in place.

- [ ] **Step 4: Add CSS for the sequence screen**

In `client/src/fco/fco.css`, near the existing upgrade machine styles around `.fco-up-machine-stage`, add:

```css
.fco-up-sequence-screen {
  position: relative;
  min-height: 560px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 22px;
  background: radial-gradient(circle at 50% 20%, rgba(0,224,138,.14), transparent 38%), #0a0c10;
}
.fco-up-sequence-screen.success {
  background: radial-gradient(circle at 50% 20%, rgba(0,224,138,.2), transparent 42%), #0a0c10;
}
.fco-up-sequence-screen.fail {
  background: radial-gradient(circle at 50% 20%, rgba(226,86,111,.18), transparent 42%), #0a0c10;
}
.fco-up-sequence-backdrop {
  position: absolute;
  inset: -20%;
  background: conic-gradient(from 0deg, transparent, rgba(0,224,138,.1), transparent 34%);
  animation: fco-up-sequence-spin 2.4s linear infinite;
}
.fco-up-sequence-card {
  position: relative;
  z-index: 1;
  width: min(620px, calc(100% - 32px));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: 34px 28px;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 24px;
  background: rgba(15,18,23,.82);
  box-shadow: 0 28px 90px rgba(0,0,0,.48), inset 0 0 0 1px rgba(255,255,255,.03);
  backdrop-filter: blur(12px);
}
.fco-up-sequence-player .fco-up-card {
  width: min(260px, 100%);
  min-height: 300px;
}
.fco-up-sequence-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
}
.fco-up-sequence-meta span {
  color: var(--text-faint);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .12em;
  text-transform: uppercase;
}
.fco-up-sequence-meta strong {
  color: var(--text);
  font-family: var(--mono);
  font-size: 34px;
  font-weight: 900;
  line-height: 1;
}
.fco-up-sequence-meta small {
  color: var(--text-dim);
  font-size: 12px;
  font-weight: 700;
}
.fco-up-sequence-ring {
  position: relative;
  width: min(360px, 100%);
  height: 82px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid var(--border-soft);
  border-radius: 999px;
  background: rgba(10,12,16,.52);
}
.fco-up-sequence-ring::before {
  content: '';
  position: absolute;
  inset: 8px;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: inherit;
  box-shadow: inset 0 0 24px rgba(0,0,0,.38);
}
.fco-up-sequence-ring.running {
  border-color: color-mix(in srgb, var(--accent) 48%, var(--border));
  box-shadow: 0 0 34px rgba(0,224,138,.16);
}
.fco-up-sequence-ring.running::after {
  content: '';
  position: absolute;
  width: 48%;
  height: 190%;
  background: linear-gradient(90deg, transparent, rgba(0,224,138,.38), transparent);
  animation: fco-up-scan 1s linear infinite;
}
.fco-up-sequence-ring.success {
  border-color: color-mix(in srgb, var(--accent) 70%, var(--border));
  background: color-mix(in srgb, var(--accent) 12%, rgba(10,12,16,.52));
  animation: fco-up-success-burst .7s ease-out both;
}
.fco-up-sequence-ring.fail {
  border-color: rgba(226,86,111,.72);
  background: rgba(226,86,111,.1);
  animation: fco-up-fail-shake .52s ease-in-out both;
}
.fco-up-sequence-ring-core {
  position: relative;
  z-index: 1;
  min-width: 190px;
  padding: 11px 20px;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text-dim);
  text-align: center;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.fco-up-sequence-ring.running .fco-up-sequence-ring-core,
.fco-up-sequence-ring.success .fco-up-sequence-ring-core {
  color: var(--accent);
}
.fco-up-sequence-ring.fail .fco-up-sequence-ring-core {
  color: #ff9aa9;
}
@keyframes fco-up-sequence-spin {
  to { transform: rotate(360deg); }
}
```

Also extend the existing responsive block near `@media (max-width: 560px)` with:

```css
  .fco-up-sequence-screen { min-height: 520px; }
  .fco-up-sequence-card { padding: 24px 16px; }
  .fco-up-sequence-meta strong { font-size: 28px; }
```

- [ ] **Step 5: Run lint/build after the JSX and CSS changes**

Run from the repository root:

```bash
rtk npm --prefix client run lint
rtk npm --prefix client run build
```

Expected: both commands pass. If lint fails because wrapping the existing JSX branch introduced an unclosed tag, fix `UpgradeView.jsx` before continuing.

- [ ] **Step 6: Manually verify the UI in the browser**

Start the app from the repository root:

```bash
rtk npm --prefix client run dev
```

Then open the Vite URL in a browser and verify:

1. Navigate to the FCO upgrade simulator.
2. Select a player and keep at least one material OVR.
3. Click **Nâng cấp**.
4. Confirm the normal simulator form is replaced by the sequence screen immediately.
5. Confirm the running screen lasts about 1 second.
6. Confirm a success or failure result appears before the form returns.
7. Disable **Bảo vệ cầu thủ**, run another attempt if possible, and confirm failure can decrement the level.

Expected: no console errors, the form is not interactive during the sequence, and the form returns after the result phase.

- [ ] **Step 7: Commit the implementation**

Check status:

```bash
rtk git status --short
```

Expected: only `client/src/fco/views/UpgradeView.jsx`, `client/src/fco/fco.css`, and this plan file are modified or untracked for this implementation. Do not add `9router_data/`.

Commit:

```bash
rtk git add client/src/fco/views/UpgradeView.jsx client/src/fco/fco.css docs/superpowers/plans/2026-06-28-upgrade-sequence-screen.md
rtk git commit -m "$(cat <<'EOF'
feat: add upgrade sequence screen

Replace the inline upgrade status with a dedicated timed sequence screen so upgrade attempts feel closer to FIFAAddict.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

Expected: commit succeeds and `rtk git status --short` shows only the intentionally untracked `9router_data/` directory.

---

## Self-Review

- Spec coverage: The plan covers the dedicated sequence screen, 1 second running phase, success/failure result phase, keeping helper math unchanged, no new route, unavailable inputs during sequence, and manual verification.
- Placeholder scan: No TBD/TODO placeholders remain; code snippets and commands are concrete.
- Type consistency: `isSequenceActive`, `sequenceCopy`, `animStatus`, `sessionPercent`, `upgradeGauge.successRate`, and existing component names are used consistently across tasks.
