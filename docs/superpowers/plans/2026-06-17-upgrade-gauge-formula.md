# Upgrade Gauge Formula Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the FCO upgrade material-gauge formula and integrate it into the existing `/upgrade` simulator.

**Architecture:** Put tunable constants in a dedicated config module, keep all formula math in pure helper functions, and make `UpgradeView.jsx` consume the computed result for the progress bar, per-fodder gauge display, and success roll. The picker top-10 and per-picker-level UX remains out of scope for this plan.

**Tech Stack:** React 19, Vite 8, JavaScript ES modules, existing FCO UI components/CSS.

## Global Constraints

- The feature is a simulator only and must not claim to be Garena/FCO's official internal formula.
- `currentLevel` for the formula is `1` through `12`.
- Fodder count is capped at `5`.
- Material gauge and total gauge are capped at `5` bars.
- `successRate` is a number from `0` to `1`.
- Formula return values are rounded to `4` decimal places.
- `baseGauge` and `fullGaugeSuccessRate` live in a separate config file.
- Use the currently displayed OVR for the target card and each fodder card.
- Do not implement picker top-10 or picker enhancement-level selection in this plan.

---

## File Structure

- Create `client/src/fco/upgradeConfig.js`
  - Owns updateable constants: max fodders, max gauge, base gauge per level, full-gauge success rate per level.
- Modify `client/src/fco/upgradeHelpers.js`
  - Keeps `getOvrForLevel(baseOvr, level)`.
  - Replaces old generic fuel/probability helpers with `calculateUpgradeGauge(params)`.
  - Keeps `rollUpgrade(successRate)`.
- Modify `client/src/fco/views/UpgradeView.jsx`
  - Uses the new helper result for the progress bar, final chance, and roll.
  - Shows per-fodder gauge contributions and summary metrics.
  - Disables upgrade at `+13`.
  - Adds simulator disclaimer copy.
- Modify `client/src/fco/fco.css`
  - Adds small utility classes for the gauge details, summary grid, result banner, and disclaimer.

---

### Task 1: Add configurable formula helpers

**Files:**
- Create: `client/src/fco/upgradeConfig.js`
- Modify: `client/src/fco/upgradeHelpers.js`

**Interfaces:**
- Consumes: no project-specific interface beyond ES module imports.
- Produces:
  - `MAX_FODDERS: number`
  - `MAX_GAUGE: number`
  - `BASE_GAUGE_BY_LEVEL: Record<number, number>`
  - `FULL_GAUGE_SUCCESS_RATE_BY_LEVEL: Record<number, number>`
  - `getOvrForLevel(baseOvr: number, level: number): number`
  - `calculateUpgradeGauge(params: { targetOvr: number, currentLevel: number, fodderOvrs: number[], eventGaugeBonus?: number }): { fodderGauges: number[], materialGauge: number, totalGauge: number, gaugeRatio: number, fullGaugeSuccessRate: number, successRate: number }`
  - `rollUpgrade(successRate: number): boolean`

- [ ] **Step 1: Create the config module**

Create `client/src/fco/upgradeConfig.js` with exactly:

```js
export const MAX_FODDERS = 5;
export const MAX_GAUGE = 5;

export const BASE_GAUGE_BY_LEVEL = Object.freeze({
  1: 2.5,
  2: 1.66,
  3: 1.25,
  4: 1,
  5: 0.99,
  6: 0.99,
  7: 0.99,
  8: 0.99,
  9: 0.99,
  10: 0.99,
  11: 0.99,
  12: 0.99,
});

export const FULL_GAUGE_SUCCESS_RATE_BY_LEVEL = Object.freeze({
  1: 1,
  2: 0.81,
  3: 0.64,
  4: 0.5,
  5: 0.26,
  6: 0.15,
  7: 0.07,
  8: 0.05,
  9: 0.04,
  10: 0.03,
  11: 0.02,
  12: 0.01,
});
```

- [ ] **Step 2: Replace helper implementation**

Replace `client/src/fco/upgradeHelpers.js` with exactly:

```js
import {
  BASE_GAUGE_BY_LEVEL,
  FULL_GAUGE_SUCCESS_RATE_BY_LEVEL,
  MAX_FODDERS,
  MAX_GAUGE,
} from './upgradeConfig.js';

// Map level boost to cumulative OVR increase.
// +1 is the base card state in the simulator.
const OVR_INCREASE_MAP = [
  0, // +0, retained for defensive fallback
  0, // +1
  1, // +2
  2, // +3
  4, // +4
  6, // +5
  8, // +6
  11, // +7
  15, // +8
  17, // +9
  19, // +10
  21, // +11
  24, // +12
  27, // +13
];

function round4(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10000) / 10000;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getOvrForLevel(baseOvr, level) {
  const safeBaseOvr = Number(baseOvr) || 0;
  const safeLevel = clamp(Math.trunc(Number(level) || 1), 1, 13);
  return safeBaseOvr + (OVR_INCREASE_MAP[safeLevel] || 0);
}

export function calculateUpgradeGauge({ targetOvr, currentLevel, fodderOvrs = [], eventGaugeBonus = 0 }) {
  const level = Math.trunc(Number(currentLevel));
  const target = Number(targetOvr);
  const baseGauge = BASE_GAUGE_BY_LEVEL[level];
  const fullGaugeSuccessRate = FULL_GAUGE_SUCCESS_RATE_BY_LEVEL[level] || 0;

  if (!Number.isFinite(target) || !baseGauge || !fullGaugeSuccessRate) {
    return {
      fodderGauges: [],
      materialGauge: 0,
      totalGauge: 0,
      gaugeRatio: 0,
      fullGaugeSuccessRate: 0,
      successRate: 0,
    };
  }

  const fodderGauges = fodderOvrs.slice(0, MAX_FODDERS).map((ovr) => {
    const fodderOvr = Number(ovr);
    if (!Number.isFinite(fodderOvr)) return 0;
    const delta = fodderOvr - target;
    return round4(Math.min(MAX_GAUGE, baseGauge * (4 / 3) ** delta));
  });

  const materialGaugeRaw = fodderGauges.reduce((sum, gauge) => sum + gauge, 0);
  const bonus = Math.max(0, Number(eventGaugeBonus) || 0);
  const totalGaugeRaw = Math.min(MAX_GAUGE, materialGaugeRaw + bonus);
  const gaugeRatioRaw = totalGaugeRaw / MAX_GAUGE;
  const successRateRaw = clamp(fullGaugeSuccessRate * gaugeRatioRaw, 0, 1);

  return {
    fodderGauges,
    materialGauge: round4(materialGaugeRaw),
    totalGauge: round4(totalGaugeRaw),
    gaugeRatio: round4(gaugeRatioRaw),
    fullGaugeSuccessRate: round4(fullGaugeSuccessRate),
    successRate: round4(successRateRaw),
  };
}

export function rollUpgrade(successRate) {
  return Math.random() < clamp(Number(successRate) || 0, 0, 1);
}
```

- [ ] **Step 3: Run formula spot checks**

Run from repo root:

```powershell
node --input-type=module -e "import { calculateUpgradeGauge } from './client/src/fco/upgradeHelpers.js'; const same = calculateUpgradeGauge({ targetOvr: 100, currentLevel: 1, fodderOvrs: [100], eventGaugeBonus: 0 }); if (JSON.stringify(same) !== JSON.stringify({ fodderGauges: [2.5], materialGauge: 2.5, totalGauge: 2.5, gaugeRatio: 0.5, fullGaugeSuccessRate: 1, successRate: 0.5 })) { console.error(same); process.exit(1); } const capped = calculateUpgradeGauge({ targetOvr: 100, currentLevel: 2, fodderOvrs: [105, 105, 105, 105, 105, 105], eventGaugeBonus: 2 }); if (capped.fodderGauges.length !== 5 || capped.totalGauge !== 5 || capped.successRate > 1) { console.error(capped); process.exit(1); } console.log('formula checks passed');"
```

Expected output includes:

```txt
formula checks passed
```

- [ ] **Step 4: Commit Task 1**

```powershell
git add "client/src/fco/upgradeConfig.js" "client/src/fco/upgradeHelpers.js"
git commit -m "feat: add upgrade gauge formula"
```

---

### Task 2: Integrate formula into the upgrade simulator UI

**Files:**
- Modify: `client/src/fco/views/UpgradeView.jsx`
- Modify: `client/src/fco/fco.css`

**Interfaces:**
- Consumes from Task 1:
  - `MAX_FODDERS`
  - `MAX_GAUGE`
  - `calculateUpgradeGauge({ targetOvr, currentLevel, fodderOvrs, eventGaugeBonus })`
  - `getOvrForLevel(baseOvr, level)`
  - `rollUpgrade(successRate)`
- Produces: `/upgrade` UI that displays gauge contributions, total gauge, gauge percent, full-gauge rate, final success rate, current/next level, and disclaimer.

- [ ] **Step 1: Update imports and computed state**

In `client/src/fco/views/UpgradeView.jsx`, replace the first import block with:

```js
import { useState, useMemo, useRef } from 'react';
import PlayerPicker from '../components/PlayerPicker';
import { MAX_FODDERS, MAX_GAUGE } from '../upgradeConfig.js';
import { getOvrForLevel, calculateUpgradeGauge, rollUpgrade } from '../upgradeHelpers.js';
import { Button, PlayerAvatar, SeasonChip, OvrBox } from '../ui.jsx';
import { cleanName } from '../helpers.js';
import * as I from '../Icons.jsx';
```

Then replace the existing `totalPercent` and `prob` memo blocks with:

```js
  const targetOvr = useMemo(() => {
    if (!mainPlayer) return 0;
    return getOvrForLevel(mainPlayer.ovr, level);
  }, [mainPlayer, level]);

  const upgradeGauge = useMemo(() => {
    if (!mainPlayer) {
      return calculateUpgradeGauge({ targetOvr: 0, currentLevel: 0, fodderOvrs: [] });
    }

    return calculateUpgradeGauge({
      targetOvr,
      currentLevel: level,
      fodderOvrs: fuel.map(f => getOvrForLevel(f.ovr, 1)),
    });
  }, [mainPlayer, targetOvr, level, fuel]);

  const gaugePercent = upgradeGauge.gaugeRatio * 100;
```

- [ ] **Step 2: Update add and roll behavior**

In `handleAddPlayer`, change the fuel branch from:

```js
      if (fuel.length < 5) setFuel([...fuel, p]);
```

to:

```js
      if (fuel.length < MAX_FODDERS) setFuel([...fuel, p]);
```

In `doUpgrade`, replace:

```js
      const success = rollUpgrade(prob);
```

with:

```js
      const success = rollUpgrade(upgradeGauge.successRate);
```

Also replace the success level increment:

```js
        setLevel(prev => Math.min(13, prev + 1));
```

with:

```js
        setLevel(prev => Math.min(13, Math.max(1, prev) + 1));
```

When setting the main player, replace:

```js
      setLevel(0);
```

with:

```js
      setLevel(1);
```

When clearing/resetting the main player, keep `setLevel(0)` because no card is selected.

- [ ] **Step 3: Update header text and selected card OVR**

Replace the subtitle line:

```jsx
          <p className="fco-sub">Chọn cầu thủ và thẻ nhiên liệu để nâng cấp OVR (Max +13).</p>
```

with:

```jsx
          <p className="fco-sub">Giả lập thanh nguyên liệu 5 vạch và tỷ lệ nâng cấp theo cấp thẻ FCO.</p>
```

Replace the selected card OVR expression:

```jsx
<OvrBox value={getOvrForLevel(mainPlayer.ovr, level)} size="md" />
```

with:

```jsx
<OvrBox value={targetOvr} size="md" />
```

- [ ] **Step 4: Replace progress summary UI**

Replace the block that currently renders the progress bar and old success probability:

```jsx
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%' }}>
              <div className="fco-up-progress-wrap">
                <div className="fco-up-progress-bar" style={{ width: `${Math.min(100, totalPercent)}%` }} />
                <div className="fco-up-progress-ticks">
                  {[20, 40, 60, 80].map(t => (
                    <div key={t} className="fco-up-tick" style={{ left: `${t}%` }} />
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)' }}>
                Tỉ lệ thành công: <span style={{ color: totalPercent >= 100 ? 'var(--accent)' : 'var(--text)', fontSize: 15 }}>{(prob * 100).toFixed(0)}%</span>
              </div>
            </div>
```

with:

```jsx
            <div className="fco-up-gauge-panel">
              <div className="fco-up-level-row">
                <span>Cấp hiện tại: <b>+{level}</b></span>
                <span>Cấp sau nâng: <b>{level >= 13 ? '+13' : `+${level + 1}`}</b></span>
              </div>

              <div className="fco-up-progress-wrap">
                <div className="fco-up-progress-bar" style={{ width: `${Math.min(100, gaugePercent)}%` }} />
                <div className="fco-up-progress-ticks">
                  {[20, 40, 60, 80].map(t => (
                    <div key={t} className="fco-up-tick" style={{ left: `${t}%` }} />
                  ))}
                </div>
              </div>

              <div className="fco-up-summary-grid">
                <div>
                  <span>Vạch từ phôi</span>
                  <b>{upgradeGauge.materialGauge.toFixed(4)}</b>
                </div>
                <div>
                  <span>Tổng vạch</span>
                  <b>{upgradeGauge.totalGauge.toFixed(4)} / {MAX_GAUGE}</b>
                </div>
                <div>
                  <span>% thanh</span>
                  <b>{gaugePercent.toFixed(2)}%</b>
                </div>
                <div>
                  <span>Tỷ lệ full vạch</span>
                  <b>{(upgradeGauge.fullGaugeSuccessRate * 100).toFixed(2)}%</b>
                </div>
                <div className="wide">
                  <span>Tỷ lệ thành công cuối</span>
                  <b>{(upgradeGauge.successRate * 100).toFixed(2)}%</b>
                </div>
              </div>
            </div>
```

- [ ] **Step 5: Show per-fodder contributions**

Inside the fuel slot filled state, after `<PlayerAvatar player={fuel[i]} size={42} />`, insert:

```jsx
                       <div className="fco-up-fuel-gauge">{(upgradeGauge.fodderGauges[i] || 0).toFixed(4)}</div>
```

Then after the closing `</div>` for `.fco-up-fuels`, insert:

```jsx
            {fuel.length > 0 && (
              <div className="fco-up-fuel-note">
                Mỗi số dưới thẻ phôi là số vạch đóng góp, tính theo OVR hiện tại của phôi so với OVR hiện tại của cầu thủ đang nâng.
              </div>
            )}
```

- [ ] **Step 6: Update the upgrade button disabled condition and result text**

Replace the upgrade button JSX:

```jsx
               <Button variant="primary" size="lg" disabled={animStatus !== 'idle' || !fuel.length} onClick={doUpgrade} style={{ minWidth: 140 }}>
                  Nâng cấp
               </Button>
```

with:

```jsx
               <Button variant="primary" size="lg" disabled={animStatus !== 'idle' || !fuel.length || level >= 13} onClick={doUpgrade} style={{ minWidth: 140 }}>
                  {level >= 13 ? 'Đã đạt +13' : 'Nâng cấp'}
               </Button>
```

After the action row closing `</div>` that contains the checkbox and button, insert:

```jsx
            {animStatus === 'success' && (
              <div className="fco-up-result success">Thành công! Cầu thủ đã lên cấp mới.</div>
            )}
            {animStatus === 'fail' && (
              <div className="fco-up-result fail">Thất bại. Cấp thẻ được xử lý theo chế độ đang chọn.</div>
            )}
```

- [ ] **Step 7: Add disclaimer**

Before the closing `</div>` of the root `.fco-up-view`, but before `{pickerMode && (...)}`, insert:

```jsx
      <div className="fco-up-disclaimer">
        Đây là công cụ giả lập phục vụ tham khảo, không phải công cụ chính thức của Garena/FCO và không khẳng định là công thức nội bộ chính thức của game.
      </div>
```

- [ ] **Step 8: Add CSS for the new UI**

In `client/src/fco/fco.css`, after the existing `.fco-up-fuel-filled` rule, add:

```css
.fco-up-gauge-panel { width: min(680px, 100%); display: flex; flex-direction: column; align-items: center; gap: 12px; }
.fco-up-level-row { display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap; color: var(--text-dim); font-size: 13px; font-weight: 600; }
.fco-up-level-row b { color: var(--accent); font-family: var(--mono); font-size: 15px; }
.fco-up-summary-grid { width: min(680px, 100%); display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.fco-up-summary-grid > div { display: flex; flex-direction: column; gap: 4px; padding: 10px 12px; background: rgba(10,12,16,.38); border: 1px solid var(--border-soft); border-radius: 10px; }
.fco-up-summary-grid > div.wide { grid-column: span 4; align-items: center; background: color-mix(in srgb, var(--accent) 8%, rgba(10,12,16,.38)); border-color: color-mix(in srgb, var(--accent) 28%, var(--border-soft)); }
.fco-up-summary-grid span { color: var(--text-faint); font-size: 11.5px; }
.fco-up-summary-grid b { color: var(--text); font-family: var(--mono); font-size: 14px; }
.fco-up-fuel-filled { flex-direction: column; gap: 3px; }
.fco-up-fuel-gauge { position: absolute; top: calc(100% + 4px); left: 50%; transform: translateX(-50%); min-width: 58px; text-align: center; font-family: var(--mono); font-size: 10.5px; font-weight: 800; color: var(--accent); }
.fco-up-fuel-note { max-width: 620px; margin-top: 4px; text-align: center; color: var(--text-faint); font-size: 12px; line-height: 1.5; }
.fco-up-result { padding: 10px 14px; border-radius: 10px; font-size: 13px; font-weight: 700; }
.fco-up-result.success { color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--border)); }
.fco-up-result.fail { color: #ff9aa9; background: rgba(226,86,111,.08); border: 1px solid rgba(226,86,111,.28); }
.fco-up-disclaimer { margin-top: 12px; padding: 12px 14px; border: 1px dashed var(--border); border-radius: 12px; color: var(--text-faint); background: rgba(10,12,16,.3); font-size: 12.5px; line-height: 1.55; }

@media (max-width: 760px) {
  .fco-up-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .fco-up-summary-grid > div.wide { grid-column: span 2; }
}
```

- [ ] **Step 9: Build client**

Run:

```powershell
npm --prefix client run build
```

Expected output includes Vite build success, such as:

```txt
✓ built in
```

- [ ] **Step 10: Commit Task 2**

```powershell
git add "client/src/fco/views/UpgradeView.jsx" "client/src/fco/fco.css"
git commit -m "feat: integrate upgrade gauge simulator"
```

---

### Task 3: Verify behavior in the browser

**Files:**
- No source files expected unless verification finds a bug.

**Interfaces:**
- Consumes: completed Task 1 and Task 2.
- Produces: verified `/upgrade` behavior.

- [ ] **Step 1: Start the client app**

Run:

```powershell
npm --prefix client run dev
```

Expected output includes a local Vite URL, usually:

```txt
Local:   http://localhost:5173/
```

- [ ] **Step 2: Open the upgrade page**

Navigate to:

```txt
http://localhost:5173/#/upgrade
```

- [ ] **Step 3: Manually verify empty state**

Expected:

- Header subtitle says the simulator uses the 5-bar material gauge and FCO card level rates.
- The main slot says `Chọn cầu thủ`.
- Disclaimer is visible below the simulator card.

- [ ] **Step 4: Manually verify gauge calculations with selected players**

Select a target player and at least one fodder.

Expected:

- Progress bar width matches `% thanh`.
- Each filled fodder slot shows a 4-decimal gauge contribution.
- `Tổng vạch` never exceeds `5 / 5`.
- `Tỷ lệ thành công cuối` equals `Tỷ lệ full vạch × % thanh`.

- [ ] **Step 5: Manually verify upgrade result flow**

Click `Nâng cấp`.

Expected:

- Button is disabled while animation is running.
- On success, the result message says `Thành công! Cầu thủ đã lên cấp mới.` and level increments.
- On failure, the result message says `Thất bại. Cấp thẻ được xử lý theo chế độ đang chọn.`
- Fodder cards are consumed after the roll.

- [ ] **Step 6: Stop the dev server**

Use `Ctrl+C` in the terminal running Vite.

- [ ] **Step 7: Final status check**

Run:

```powershell
git status --short
```

Expected: no uncommitted source changes after commits, unless verification produced intentional follow-up edits.

---

## Self-Review

- Spec coverage: Task 1 implements the formula, config split, caps, rounding, and returned data. Task 2 integrates the formula into `/upgrade`, displays per-fodder and summary values, disables `+13`, and adds the simulator disclaimer. Task 3 covers manual verification.
- Placeholder scan: no TBD/TODO placeholders remain; each code-changing step includes exact code.
- Type consistency: `calculateUpgradeGauge`, `getOvrForLevel`, `rollUpgrade`, `MAX_FODDERS`, and `MAX_GAUGE` names are consistent across tasks.
