# FIFAaddict Upgrade Simulator Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update `/upgrade` so the material OVR input, level selector, effect percentage, protection toggle, and result animations match the approved FIFAaddict-inspired design while preserving the existing real success-rate formula.

**Architecture:** Keep the current `UpgradeView.jsx` shell and player picker for the target player only. Replace the fodder-player flow with one numeric material OVR input and an effect-percentage selector that feeds `calculateUpgradeGauge()` through `eventGaugeBonus`; render separate session UI percentage and real success percentage. CSS in `fco.css` owns the running/success/failure feedback with ring, flash, and shake/pulse effects.

**Tech Stack:** React 19, Vite, Vitest, plain CSS, existing fco-hub UI components and upgrade helper modules.

## Global Constraints

- Preserve the current real success formula: `successRate = fullGaugeSuccessRateByLevel[currentLevel] * gaugeRatio`.
- `OVR 200` is only the default material value; it must be calculated through the formula and must not force full gauge.
- The FIFAaddict `+%` effect adds to the session/UI upgrade percentage before real success is calculated; it does not add directly to real success percentage.
- Valid upgrade attempts are `+1` through `+12`; `+13` is terminal.
- Protection on keeps the level unchanged on failure; protection off drops one level but not below `+1`.
- Keep the existing route, page shell, and target-player picker.
- Remove real-player fodder selection from the `/upgrade` flow.
- Do not commit unless the user explicitly asks for a commit.
- Prefix shell commands with `rtk`.

---

## File Structure

- Modify: `client/src/fco/upgradeConfig.js`
  - Add `UPGRADE_EFFECT_OPTIONS` with FIFAaddict-style percentage choices.
  - Keep gauge and full-gauge success-rate constants unchanged.

- Modify: `client/src/fco/upgradeHelpers.js`
  - Keep `calculateUpgradeGauge()` formula intact.
  - Add `calculateEffectGaugeBonus(effectPercent)` to convert UI `+%` into gauge bars.
  - Add `normalizeMaterialOvr(value)` so invalid/empty material OVR becomes no contribution.

- Create: `client/src/fco/upgradeHelpers.test.js`
  - Verify formula preservation, `OVR 200` calculation, effect semantics, and invalid material handling.

- Modify: `client/src/fco/views/UpgradeView.jsx`
  - Remove `fuel`, quick-add, and fodder picker state/handlers.
  - Add `materialOvrInput`, `effectPercent`, and main-screen level controls.
  - Pass `[materialOvr]` into `calculateUpgradeGauge()` only when valid.
  - Keep target `PlayerPicker`, but disable `allowLevelSelect` there.
  - Drive running/success/failure animation states and protection behavior.

- Modify: `client/src/fco/fco.css`
  - Replace/extend fodder-slot styling with one material-card control.
  - Style level/effect/protection controls.
  - Add running/success/failure animations with visible motion and result effects.

---

### Task 1: Add upgrade helper semantics and tests

**Files:**
- Modify: `client/src/fco/upgradeConfig.js`
- Modify: `client/src/fco/upgradeHelpers.js`
- Create: `client/src/fco/upgradeHelpers.test.js`

**Interfaces:**
- Consumes: existing `MAX_GAUGE`, `calculateUpgradeGauge({ targetOvr, currentLevel, fodderOvrs, eventGaugeBonus })`.
- Produces:
  - `UPGRADE_EFFECT_OPTIONS: readonly number[]`
  - `normalizeMaterialOvr(value: unknown): number | null`
  - `calculateEffectGaugeBonus(effectPercent: unknown): number`

- [ ] **Step 1: Add failing tests for the helper behavior**

Create `client/src/fco/upgradeHelpers.test.js` with:

```js
import { describe, expect, it } from 'vitest';
import {
  calculateEffectGaugeBonus,
  calculateUpgradeGauge,
  normalizeMaterialOvr,
} from './upgradeHelpers.js';

describe('upgrade helper formula semantics', () => {
  it('keeps full gauge real success rate level-based', () => {
    const result = calculateUpgradeGauge({
      targetOvr: 100,
      currentLevel: 12,
      fodderOvrs: [200],
    });

    expect(result.gaugeRatio).toBe(1);
    expect(result.fullGaugeSuccessRate).toBe(0.01);
    expect(result.successRate).toBe(0.01);
  });

  it('calculates default OVR 200 through the formula instead of forcing full gauge', () => {
    const result = calculateUpgradeGauge({
      targetOvr: 205,
      currentLevel: 5,
      fodderOvrs: [200],
    });

    expect(result.totalGauge).toBeGreaterThan(0);
    expect(result.totalGauge).toBeLessThan(5);
    expect(result.gaugeRatio).toBeLessThan(1);
  });

  it('adds effect percent to session gauge before applying real success rate', () => {
    const withoutEffect = calculateUpgradeGauge({
      targetOvr: 205,
      currentLevel: 12,
      fodderOvrs: [200],
    });
    const withEffect = calculateUpgradeGauge({
      targetOvr: 205,
      currentLevel: 12,
      fodderOvrs: [200],
      eventGaugeBonus: calculateEffectGaugeBonus(20),
    });

    expect(withEffect.gaugeRatio).toBeGreaterThan(withoutEffect.gaugeRatio);
    expect(withEffect.successRate).toBe(withEffect.fullGaugeSuccessRate * withEffect.gaugeRatio);
    expect(withEffect.successRate).toBeLessThanOrEqual(0.01);
  });

  it('normalizes invalid material OVR as no material', () => {
    expect(normalizeMaterialOvr('')).toBeNull();
    expect(normalizeMaterialOvr('abc')).toBeNull();
    expect(normalizeMaterialOvr(0)).toBeNull();
    expect(normalizeMaterialOvr('200')).toBe(200);
  });
});
```

- [ ] **Step 2: Run the failing helper tests**

Run:

```bash
rtk npm --prefix client test -- upgradeHelpers.test.js
```

Expected: FAIL because `calculateEffectGaugeBonus` and `normalizeMaterialOvr` are not exported yet.

- [ ] **Step 3: Add effect options to config**

In `client/src/fco/upgradeConfig.js`, add after `QUICK_ADD_GAUGE_TARGETS`:

```js
export const UPGRADE_EFFECT_OPTIONS = Object.freeze([0, 5, 10, 15, 20, 25, 30]);
```

- [ ] **Step 4: Add minimal helper implementation**

In `client/src/fco/upgradeHelpers.js`, add after `calculateUpgradeGauge()`:

```js
export function normalizeMaterialOvr(value) {
  if (value === '') return null;
  const materialOvr = Math.trunc(Number(value));
  if (!Number.isFinite(materialOvr) || materialOvr <= 0) return null;
  return materialOvr;
}

export function calculateEffectGaugeBonus(effectPercent) {
  const percent = Math.max(0, Number(effectPercent) || 0);
  return round4(MAX_GAUGE * (percent / 100));
}
```

- [ ] **Step 5: Run helper tests**

Run:

```bash
rtk npm --prefix client test -- upgradeHelpers.test.js
```

Expected: PASS.

- [ ] **Step 6: Review checkpoint**

Run:

```bash
rtk git diff -- client/src/fco/upgradeConfig.js client/src/fco/upgradeHelpers.js client/src/fco/upgradeHelpers.test.js
```

Expected: diff only includes helper/config/test changes for this task. Do not commit unless the user explicitly asks.

---

### Task 2: Replace fodder flow with FIFAaddict-style controls in `UpgradeView`

**Files:**
- Modify: `client/src/fco/views/UpgradeView.jsx`

**Interfaces:**
- Consumes: `UPGRADE_EFFECT_OPTIONS`, `calculateEffectGaugeBonus(effectPercent)`, `normalizeMaterialOvr(value)` from Task 1.
- Produces: `/upgrade` UI with target picker only, main-screen level selector, material OVR control, effect selector, protection toggle, session UI percentage, and real success percentage.

- [ ] **Step 1: Update imports**

Replace the config/helper imports at the top of `UpgradeView.jsx` with:

```js
import {
  MAX_GAUGE,
  MAX_UPGRADE_LEVEL,
  MIN_UPGRADE_LEVEL,
  UPGRADE_EFFECT_OPTIONS,
  UPGRADE_MASCOT_IMAGES,
} from '../upgradeConfig.js';
import {
  calculateEffectGaugeBonus,
  calculateUpgradeGauge,
  getDisplayedOvrForPlayer,
  normalizeMaterialOvr,
  normalizeUpgradeLevel,
  rollUpgrade,
  withUpgradeLevel,
} from '../upgradeHelpers.js';
```

Remove unused imports:

```js
import { fetchPlayers } from '../api.js';
```

and remove these helper/config names if still present:

```js
MAX_FODDERS,
QUICK_ADD_GAUGE_TARGETS,
pickQuickAddFodders,
```

- [ ] **Step 2: Replace fodder state with material/effect state**

Replace these state declarations:

```js
const [level, setLevel] = useState(0);
const [fuel, setFuel] = useState([]);
const [pickerMode, setPickerOpen] = useState(null);
const [isSafeMode, setSafeMode] = useState(true);
const [animStatus, setAnimStatus] = useState('idle');
const [quickAdding, setQuickAdding] = useState(null);
```

with:

```js
const [level, setLevel] = useState(MIN_UPGRADE_LEVEL);
const [materialOvrInput, setMaterialOvrInput] = useState('200');
const [effectPercent, setEffectPercent] = useState(0);
const [pickerMode, setPickerOpen] = useState(null);
const [isSafeMode, setSafeMode] = useState(true);
const [animStatus, setAnimStatus] = useState('idle');
```

- [ ] **Step 3: Compute material and gauge values**

Add after `targetOvr`:

```js
const materialOvr = useMemo(() => normalizeMaterialOvr(materialOvrInput), [materialOvrInput]);
const effectGaugeBonus = useMemo(() => calculateEffectGaugeBonus(effectPercent), [effectPercent]);
```

Replace the `upgradeGauge` memo with:

```js
const upgradeGauge = useMemo(() => {
  if (!mainPlayer) {
    return calculateUpgradeGauge({ targetOvr: 0, currentLevel: 0, fodderOvrs: [] });
  }

  return calculateUpgradeGauge({
    targetOvr,
    currentLevel: level,
    fodderOvrs: materialOvr == null ? [] : [materialOvr],
    eventGaugeBonus: effectGaugeBonus,
  });
}, [mainPlayer, targetOvr, level, materialOvr, effectGaugeBonus]);
```

Add below `nextLevel`:

```js
const sessionPercent = Math.min(100, upgradeGauge.gaugeRatio * 100);
const realSuccessPercent = upgradeGauge.successRate * 100;
const canUpgrade = animStatus === 'idle' && mainPlayer && materialOvr != null && level < MAX_UPGRADE_LEVEL;
```

- [ ] **Step 4: Simplify player selection**

Replace `handleAddPlayer(player)` with:

```js
function handleAddPlayer(player) {
  const selected = withUpgradeLevel(player, level || MIN_UPGRADE_LEVEL);
  setMainPlayer(selected);
  setLevel(prev => normalizeUpgradeLevel(prev || selected.upgradeLevel));
  setPickerOpen(null);
}
```

Delete the entire `quickAddToGauge()` function.

- [ ] **Step 5: Update upgrade roll behavior**

Replace `doUpgrade()` with:

```js
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

    cancelRef.current = setTimeout(() => setAnimStatus('idle'), 2200);
  }, 1500);
}
```

- [ ] **Step 6: Update reset button**

Replace the reset button handler in the header with:

```jsx
<Button
  variant="ghost"
  size="sm"
  icon={I.Refresh}
  onClick={() => {
    setMainPlayer(null);
    setLevel(MIN_UPGRADE_LEVEL);
    setMaterialOvrInput('200');
    setEffectPercent(0);
  }}
>
  Đổi cầu thủ
</Button>
```

- [ ] **Step 7: Replace the console JSX**

Inside `{mainPlayer && (<div className="fco-up-machine-console"> ... </div>)}`, replace the current gauge/quick/fuels/action/result contents with:

```jsx
<div className="fco-up-gauge-panel">
  <div className="fco-up-level-row">
    <span>Nâng cấp: <b>+{level} → +{nextLevel}</b></span>
    <span>Phôi: <b>{materialOvr == null ? '—' : `OVR ${materialOvr}`}</b></span>
  </div>

  <div className="fco-up-progress-wrap fco-up-progress-machine">
    <div className="fco-up-progress-bar" style={{ width: `${sessionPercent}%` }} />
    <div className="fco-up-progress-ticks">
      {[20, 40, 60, 80].map(t => (
        <div key={t} className="fco-up-tick" style={{ left: `${t}%` }} />
      ))}
    </div>
  </div>

  <div className="fco-up-result-strip">
    <div className="fco-up-summary-grid compact">
      <div>
        <span>Phiên nâng cấp</span>
        <b>{sessionPercent.toFixed(2)}%</b>
      </div>
      <div>
        <span>Tỷ lệ full vạch</span>
        <b>{(upgradeGauge.fullGaugeSuccessRate * 100).toFixed(2)}%</b>
      </div>
      <div>
        <span>Tổng vạch</span>
        <b>{upgradeGauge.totalGauge.toFixed(4)} / {MAX_GAUGE}</b>
      </div>
      <div>
        <span>Hiệu ứng</span>
        <b>+{effectPercent}%</b>
      </div>
      <div className="wide hot">
        <span>Tỷ lệ thành công thực</span>
        <b>{realSuccessPercent.toFixed(2)}%</b>
      </div>
    </div>
  </div>
</div>

<div className="fco-up-control-panel">
  <label className="fco-up-field">
    <span>Cấp thẻ</span>
    <select
      value={level}
      disabled={animStatus !== 'idle'}
      onChange={event => setLevel(normalizeUpgradeLevel(event.target.value))}
    >
      {Array.from({ length: MAX_UPGRADE_LEVEL - MIN_UPGRADE_LEVEL }, (_, index) => MIN_UPGRADE_LEVEL + index).map(option => (
        <option key={option} value={option}>+{option} → +{option + 1}</option>
      ))}
    </select>
  </label>

  <label className="fco-up-field fco-up-material-field">
    <span>Thẻ thành phần</span>
    <div className="fco-up-material-card">
      <b>OVR</b>
      <input
        type="number"
        min="1"
        inputMode="numeric"
        value={materialOvrInput}
        disabled={animStatus !== 'idle'}
        onChange={event => setMaterialOvrInput(event.target.value)}
      />
    </div>
  </label>

  <label className="fco-up-field">
    <span>Hiệu ứng</span>
    <select
      value={effectPercent}
      disabled={animStatus !== 'idle'}
      onChange={event => setEffectPercent(Number(event.target.value))}
    >
      {UPGRADE_EFFECT_OPTIONS.map(option => (
        <option key={option} value={option}>+{option}%</option>
      ))}
    </select>
  </label>
</div>

<div className={`fco-up-animation-ring ${animStatus}`}>
  <div className="fco-up-animation-core">
    {animStatus === 'running' && <span>Đang nâng cấp...</span>}
    {animStatus === 'success' && <span>Thành công</span>}
    {animStatus === 'fail' && <span>Thất bại</span>}
    {animStatus === 'idle' && <span>Sẵn sàng</span>}
  </div>
</div>

<div className="fco-up-action-row">
  <label className="fco-up-protect-toggle">
    <input type="checkbox" checked={isSafeMode} onChange={event => setSafeMode(event.target.checked)} />
    <span className={`fco-checkbox ${isSafeMode ? 'on' : ''}`}>
      {isSafeMode && <I.Check size={12} />}
    </span>
    <span>Bảo vệ cầu thủ</span>
    <b>{isSafeMode ? 'BẬT' : 'TẮT'}</b>
  </label>
  <Button variant="primary" size="lg" disabled={!canUpgrade} onClick={doUpgrade} style={{ minWidth: 140 }}>
    {level >= MAX_UPGRADE_LEVEL ? 'Đã đạt +13' : 'Nâng cấp'}
  </Button>
</div>

{materialOvr == null && (
  <div className="fco-up-result fail">Nhập OVR thẻ thành phần để mô phỏng phiên nâng cấp.</div>
)}
{animStatus === 'success' && (
  <div className="fco-up-result success">Thành công! Cầu thủ đã lên cấp mới.</div>
)}
{animStatus === 'fail' && (
  <div className="fco-up-result fail">
    {isSafeMode ? 'Thất bại. Bảo vệ đang bật nên cấp thẻ được giữ nguyên.' : 'Thất bại. Cấp thẻ giảm 1 cấp.'}
  </div>
)}
```

- [ ] **Step 8: Update PlayerPicker usage**

Replace the picker block with:

```jsx
{pickerMode && (
  <PlayerPicker
    title="Chọn cầu thủ nâng cấp"
    showTopPlayers
    allowLevelSelect={false}
    defaultLevel={Math.max(MIN_UPGRADE_LEVEL, level || MIN_UPGRADE_LEVEL)}
    existing={[]}
    onAdd={handleAddPlayer}
    onClose={() => setPickerOpen(null)}
  />
)}
```

- [ ] **Step 9: Run lint/build check for JSX issues**

Run:

```bash
rtk npm --prefix client run build
```

Expected: PASS. If it fails with unused imports or JSX syntax errors, fix only the reported `UpgradeView.jsx` issues.

- [ ] **Step 10: Review checkpoint**

Run:

```bash
rtk git diff -- client/src/fco/views/UpgradeView.jsx
```

Expected: `UpgradeView.jsx` no longer imports `fetchPlayers`, no longer has `fuel`/quick-add/fodder slots, and uses the new material/effect/protection controls. Do not commit unless the user explicitly asks.

---

### Task 3: Add FIFAaddict-style control and animation styling

**Files:**
- Modify: `client/src/fco/fco.css`

**Interfaces:**
- Consumes class names from Task 2: `fco-up-control-panel`, `fco-up-field`, `fco-up-material-card`, `fco-up-animation-ring`, `fco-up-animation-core`, `fco-up-protect-toggle`.
- Produces visible running/success/failure animation states for the upgrade area.

- [ ] **Step 1: Add control panel and material styles**

Append near the existing `.fco-up-quick-panel` / `.fco-up-action-row` section in `client/src/fco/fco.css`:

```css
.fco-up-control-panel { width: min(560px, 100%); display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.fco-up-field { display: flex; flex-direction: column; gap: 7px; padding: 12px; border: 1px solid var(--border-soft); border-radius: 14px; background: rgba(10,12,16,.34); color: var(--text-dim); font-size: 12px; font-weight: 800; }
.fco-up-field select, .fco-up-material-card input { width: 100%; min-height: 38px; border: 1px solid color-mix(in srgb, var(--accent) 24%, var(--border)); border-radius: 10px; background: var(--surface-2); color: var(--text); font: 800 14px var(--mono); outline: none; }
.fco-up-field select { padding: 0 10px; }
.fco-up-material-card { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 8px; padding: 8px; border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--border)); border-radius: 12px; background: radial-gradient(circle at 50% 0%, rgba(0,224,138,.16), transparent 64%), var(--surface-2); box-shadow: inset 0 0 18px rgba(0,0,0,.28); }
.fco-up-material-card b { min-width: 44px; min-height: 34px; display: inline-flex; align-items: center; justify-content: center; border-radius: 9px; background: linear-gradient(135deg, #37a0ff, var(--accent)); color: #06100d; font: 950 13px var(--mono); letter-spacing: .04em; }
.fco-up-material-card input { padding: 0 10px; text-align: center; }
```

- [ ] **Step 2: Add result animation styles**

Append below the styles from Step 1:

```css
.fco-up-animation-ring { position: relative; width: min(320px, 100%); height: 76px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-soft); border-radius: 999px; background: rgba(10,12,16,.34); overflow: hidden; }
.fco-up-animation-ring::before { content: ''; position: absolute; inset: 8px; border-radius: inherit; border: 1px solid rgba(255,255,255,.08); box-shadow: inset 0 0 24px rgba(0,0,0,.38); }
.fco-up-animation-core { position: relative; z-index: 1; min-width: 170px; padding: 10px 18px; border-radius: 999px; background: var(--surface-2); color: var(--text-dim); text-align: center; font-size: 13px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
.fco-up-animation-ring.running { border-color: color-mix(in srgb, var(--accent) 42%, var(--border)); box-shadow: 0 0 28px rgba(0,224,138,.12); }
.fco-up-animation-ring.running::after { content: ''; position: absolute; width: 46%; height: 180%; background: linear-gradient(90deg, transparent, rgba(0,224,138,.34), transparent); animation: fco-up-scan 1.05s linear infinite; }
.fco-up-animation-ring.running .fco-up-animation-core { color: var(--accent); animation: fco-up-core-pulse .42s ease-in-out infinite alternate; }
.fco-up-animation-ring.success { border-color: color-mix(in srgb, var(--accent) 64%, var(--border)); background: color-mix(in srgb, var(--accent) 10%, rgba(10,12,16,.34)); animation: fco-up-success-burst .7s ease-out both; }
.fco-up-animation-ring.success .fco-up-animation-core { color: var(--accent); box-shadow: 0 0 22px rgba(0,224,138,.2); }
.fco-up-animation-ring.fail { border-color: rgba(226,86,111,.72); background: rgba(226,86,111,.08); animation: fco-up-fail-shake .52s ease-in-out both; }
.fco-up-animation-ring.fail .fco-up-animation-core { color: #ff9aa9; box-shadow: 0 0 22px rgba(226,86,111,.16); }
@keyframes fco-up-scan { from { transform: translateX(-190%) rotate(16deg); } to { transform: translateX(190%) rotate(16deg); } }
@keyframes fco-up-core-pulse { to { transform: scale(1.035); } }
@keyframes fco-up-success-burst { 0% { transform: scale(.96); box-shadow: 0 0 0 rgba(0,224,138,0); } 45% { transform: scale(1.035); box-shadow: 0 0 46px rgba(0,224,138,.28); } 100% { transform: scale(1); box-shadow: 0 0 26px rgba(0,224,138,.14); } }
@keyframes fco-up-fail-shake { 0%, 100% { transform: translateX(0); } 18% { transform: translateX(-8px); } 36% { transform: translateX(7px); } 54% { transform: translateX(-5px); } 72% { transform: translateX(3px); } }
```

- [ ] **Step 3: Add protection toggle and responsive styles**

Append below Step 2 styles:

```css
.fco-up-protect-toggle { display: inline-flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--border-soft); border-radius: 999px; background: rgba(10,12,16,.34); cursor: pointer; user-select: none; }
.fco-up-protect-toggle input { display: none; }
.fco-up-protect-toggle span:last-of-type { color: var(--text); font-size: 13.5px; font-weight: 750; }
.fco-up-protect-toggle b { padding: 3px 8px; border-radius: 999px; background: color-mix(in srgb, var(--accent) 12%, var(--surface-2)); color: var(--accent); font: 900 11px var(--mono); }
@media (max-width: 720px) {
  .fco-up-control-panel { grid-template-columns: 1fr; }
}
```

- [ ] **Step 4: Run build check**

Run:

```bash
rtk npm --prefix client run build
```

Expected: PASS.

- [ ] **Step 5: Review checkpoint**

Run:

```bash
rtk git diff -- client/src/fco/fco.css
```

Expected: CSS only adds/updates upgrade control and animation classes. Do not commit unless the user explicitly asks.

---

### Task 4: Verify behavior locally and against FIFAaddict parity requirements

**Files:**
- Modify only if verification finds a mismatch: `client/src/fco/views/UpgradeView.jsx`, `client/src/fco/upgradeHelpers.js`, `client/src/fco/fco.css`

**Interfaces:**
- Consumes the implemented `/upgrade` UI.
- Produces verified behavior and a short final report listing any FIFAaddict mismatches that could not be fixed.

- [ ] **Step 1: Run focused helper tests**

Run:

```bash
rtk npm --prefix client test -- upgradeHelpers.test.js
```

Expected: PASS.

- [ ] **Step 2: Run full client tests**

Run:

```bash
rtk npm --prefix client test
```

Expected: PASS. If unrelated pre-existing tests fail, capture the exact failing test names and do not change unrelated code.

- [ ] **Step 3: Run production build**

Run:

```bash
rtk npm --prefix client run build
```

Expected: PASS.

- [ ] **Step 4: Start dev server for browser verification**

Run:

```bash
rtk npm --prefix client run dev -- --host 127.0.0.1
```

Expected: Vite prints a local URL. Open `/upgrade` in the browser tool.

- [ ] **Step 5: Browser-check golden path**

In `/upgrade`:

1. Select a target player.
2. Confirm the picker does not ask for card level.
3. Confirm the main screen has `Cấp thẻ`, `Thẻ thành phần OVR`, `Hiệu ứng`, and `Bảo vệ cầu thủ` controls.
4. Confirm default material displays `OVR 200`.
5. Set level to `+12 → +13`, material OVR to a value that makes session `100%`, and effect to `+0%`; confirm real success displays `1.00%`.
6. Click `Nâng cấp`; confirm running animation appears before success/failure.
7. Confirm success state visibly differs from failure state.
8. Confirm material OVR remains available after the attempt.

- [ ] **Step 6: Browser-check invalid and terminal states**

In `/upgrade`:

1. Clear material OVR; confirm upgrade button disables and invalid-material message appears.
2. Restore material OVR to `200`.
3. Upgrade or set level until `+13`; confirm button shows `Đã đạt +13` and is disabled.
4. Toggle protection off and confirm the label changes to `TẮT`.

- [ ] **Step 7: FIFAaddict per-level comparison checklist**

Compare the same player/material/effect values against FIFAaddict for each level. Use this table while checking:

| Level | fco-hub session UI % | fco-hub real % | FIFAaddict observed session UI % | FIFAaddict observed real % | Status |
| --- | ---: | ---: | ---: | ---: | --- |
| +1 → +2 |  |  |  |  |  |
| +2 → +3 |  |  |  |  |  |
| +3 → +4 |  |  |  |  |  |
| +4 → +5 |  |  |  |  |  |
| +5 → +6 |  |  |  |  |  |
| +6 → +7 |  |  |  |  |  |
| +7 → +8 |  |  |  |  |  |
| +8 → +9 |  |  |  |  |  |
| +9 → +10 |  |  |  |  |  |
| +10 → +11 |  |  |  |  |  |
| +11 → +12 |  |  |  |  |  |
| +12 → +13 |  |  |  |  |  |

Expected: At session UI `100%`, real success matches the level full-gauge rates already configured in `UPGRADE_OUTCOMES_BY_LEVEL`, including `+12 → +13 = 1.00%`.

- [ ] **Step 8: Final review checkpoint**

Run:

```bash
rtk git diff -- client/src/fco/upgradeConfig.js client/src/fco/upgradeHelpers.js client/src/fco/upgradeHelpers.test.js client/src/fco/views/UpgradeView.jsx client/src/fco/fco.css
```

Expected: diff is limited to the approved upgrade simulator design. Do not commit unless the user explicitly asks.

---

## Self-Review Notes

- Spec coverage: material OVR, level-on-screen, effect percent semantics, protection behavior, animations, local verification, and FIFAaddict per-level comparison are each covered by a task.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation steps remain.
- Type consistency: Task 1 exports `normalizeMaterialOvr()` and `calculateEffectGaugeBonus()`; Task 2 imports and uses those exact names.
- Conflict resolution: the planning skill recommends frequent commits, but the active developer instruction says not to commit unless explicitly requested, so this plan uses review checkpoints instead of commit steps.
