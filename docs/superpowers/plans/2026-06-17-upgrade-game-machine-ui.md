# Upgrade Game Machine UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand `/upgrade` into a game-like FCO upgrade machine with top-10 picker defaults, selectable card levels, quick-add gauge targets, level visuals, and happy/sad mascot states.

**Architecture:** Keep the formula constants and display-OVR logic in `upgradeConfig.js` and `upgradeHelpers.js`. Extend `PlayerPicker.jsx` with opt-in upgrade behaviors so existing compare/database flows are not affected. Let `UpgradeView.jsx` orchestrate selected levels, quick-add, and the game-machine layout while `fco.css` owns visual polish.

**Tech Stack:** React 19, Vite 8, JavaScript ES modules, existing FCO API helpers, CSS in `client/src/fco/fco.css`.

## Global Constraints

- The feature is a simulator only and must not claim to be Garena/FCO's official tool or internal formula.
- Keep the existing route `/upgrade` and the existing `UpgradeView.jsx` component entry point.
- Fodder count remains capped at `5`.
- Material gauge and total gauge remain capped at `5` bars.
- `successRate` remains a number from `0` to `1`.
- Formula return values remain rounded to `4` decimal places.
- When picker search is empty in upgrade mode, show the top 10 highest-OVR players.
- Each upgrade-selected player can carry `upgradeLevel`, defaulting to `1`.
- Quick-add gauge targets are exactly `1`, `2`, `3`, `4`, and `5` bars.
- Show `upgrade-sad.png` when `totalGauge < 5`; show `upgrade-happy.png` when `totalGauge >= 5`.
- Existing non-upgrade uses of `PlayerPicker` must continue to work without level selectors.

---

## File Structure

- Modify `client/src/fco/upgradeConfig.js`
  - Add the upgrade outcome table, quick-add target constants, and asset path constants.
- Modify `client/src/fco/upgradeHelpers.js`
  - Derive cumulative displayed OVR from the outcome table.
  - Add helpers for normalizing player levels and selecting quick-add fodders.
- Modify `client/src/fco/components/PlayerPicker.jsx`
  - Add optional top-10 default results and per-row level selectors.
- Modify `client/src/fco/views/UpgradeView.jsx`
  - Use per-card levels, quick-add target buttons, simplified summary, mascot state, and game-machine layout.
- Modify `client/src/fco/fco.css`
  - Add picker level controls, game-machine layout, quick-add controls, mascot, and badge styles.
- Copy assets into `client/public/`
  - `upgrade-sad.png`
  - `upgrade-happy.png`

---

### Task 1: Extend upgrade config and helpers

**Files:**
- Modify: `client/src/fco/upgradeConfig.js`
- Modify: `client/src/fco/upgradeHelpers.js`

**Interfaces:**
- Consumes:
  - Existing `calculateUpgradeGauge({ targetOvr, currentLevel, fodderOvrs, eventGaugeBonus })`
  - Existing `rollUpgrade(successRate)`
- Produces:
  - `UPGRADE_OUTCOMES_BY_LEVEL: Record<number, { ovrGain: number, fullGaugeSuccessRate: number }>`
  - `QUICK_ADD_GAUGE_TARGETS: number[]`
  - `UPGRADE_MASCOT_IMAGES: { sad: string, happy: string }`
  - `normalizeUpgradeLevel(level: unknown): number`
  - `getOvrIncreaseForLevel(level: unknown): number`
  - `getOvrForLevel(baseOvr: unknown, level: unknown): number`
  - `getDisplayedOvrForPlayer(player: object | null | undefined, fallbackLevel?: number): number`
  - `withUpgradeLevel(player: object, level: unknown): object`
  - `pickQuickAddFodders(params): object[]`

- [ ] **Step 1: Replace `upgradeConfig.js` with outcome-aware config**

Replace `client/src/fco/upgradeConfig.js` with:

```js
export const MAX_FODDERS = 5;
export const MAX_GAUGE = 5;
export const MIN_UPGRADE_LEVEL = 1;
export const MAX_UPGRADE_LEVEL = 13;

export const QUICK_ADD_GAUGE_TARGETS = Object.freeze([1, 2, 3, 4, 5]);

export const UPGRADE_MASCOT_IMAGES = Object.freeze({
  sad: '/upgrade-sad.png',
  happy: '/upgrade-happy.png',
});

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

export const UPGRADE_OUTCOMES_BY_LEVEL = Object.freeze({
  1: Object.freeze({ ovrGain: 1, fullGaugeSuccessRate: 1 }),
  2: Object.freeze({ ovrGain: 1, fullGaugeSuccessRate: 0.81 }),
  3: Object.freeze({ ovrGain: 2, fullGaugeSuccessRate: 0.64 }),
  4: Object.freeze({ ovrGain: 2, fullGaugeSuccessRate: 0.5 }),
  5: Object.freeze({ ovrGain: 2, fullGaugeSuccessRate: 0.26 }),
  6: Object.freeze({ ovrGain: 3, fullGaugeSuccessRate: 0.15 }),
  7: Object.freeze({ ovrGain: 4, fullGaugeSuccessRate: 0.07 }),
  8: Object.freeze({ ovrGain: 2, fullGaugeSuccessRate: 0.05 }),
  9: Object.freeze({ ovrGain: 2, fullGaugeSuccessRate: 0.04 }),
  10: Object.freeze({ ovrGain: 2, fullGaugeSuccessRate: 0.03 }),
  11: Object.freeze({ ovrGain: 3, fullGaugeSuccessRate: 0.02 }),
  12: Object.freeze({ ovrGain: 3, fullGaugeSuccessRate: 0.01 }),
});

export const FULL_GAUGE_SUCCESS_RATE_BY_LEVEL = Object.freeze(
  Object.fromEntries(
    Object.entries(UPGRADE_OUTCOMES_BY_LEVEL).map(([level, outcome]) => [
      level,
      outcome.fullGaugeSuccessRate,
    ]),
  ),
);
```

- [ ] **Step 2: Replace `upgradeHelpers.js` with level-aware helpers**

Replace `client/src/fco/upgradeHelpers.js` with:

```js
import {
  BASE_GAUGE_BY_LEVEL,
  FULL_GAUGE_SUCCESS_RATE_BY_LEVEL,
  MAX_FODDERS,
  MAX_GAUGE,
  MAX_UPGRADE_LEVEL,
  MIN_UPGRADE_LEVEL,
  UPGRADE_OUTCOMES_BY_LEVEL,
} from './upgradeConfig.js';

function round4(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10000) / 10000;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeUpgradeLevel(level) {
  return clamp(Math.trunc(Number(level) || MIN_UPGRADE_LEVEL), MIN_UPGRADE_LEVEL, MAX_UPGRADE_LEVEL);
}

export function getOvrIncreaseForLevel(level) {
  const safeLevel = normalizeUpgradeLevel(level);
  let increase = 0;

  for (let step = MIN_UPGRADE_LEVEL; step < safeLevel; step += 1) {
    increase += UPGRADE_OUTCOMES_BY_LEVEL[step]?.ovrGain || 0;
  }

  return increase;
}

export function getOvrForLevel(baseOvr, level) {
  const safeBaseOvr = Number(baseOvr) || 0;
  return safeBaseOvr + getOvrIncreaseForLevel(level);
}

export function getDisplayedOvrForPlayer(player, fallbackLevel = MIN_UPGRADE_LEVEL) {
  if (!player) return 0;
  return getOvrForLevel(player.ovr, player.upgradeLevel ?? fallbackLevel);
}

export function withUpgradeLevel(player, level = MIN_UPGRADE_LEVEL) {
  return {
    ...player,
    upgradeLevel: normalizeUpgradeLevel(level),
  };
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

export function pickQuickAddFodders({
  candidates = [],
  existingFodders = [],
  mainPlayerId,
  targetOvr,
  currentLevel,
  targetGauge,
}) {
  const picked = existingFodders.slice(0, MAX_FODDERS).map((player) => withUpgradeLevel(player, player.upgradeLevel));
  const usedIds = new Set(picked.map((player) => player.id));
  if (mainPlayerId) usedIds.add(mainPlayerId);

  for (const candidate of candidates) {
    if (picked.length >= MAX_FODDERS) break;
    if (!candidate || usedIds.has(candidate.id)) continue;

    picked.push(withUpgradeLevel(candidate, MIN_UPGRADE_LEVEL));
    usedIds.add(candidate.id);

    const gauge = calculateUpgradeGauge({
      targetOvr,
      currentLevel,
      fodderOvrs: picked.map((player) => getDisplayedOvrForPlayer(player)),
    });

    if (gauge.totalGauge >= targetGauge) break;
  }

  return picked;
}

export function rollUpgrade(successRate) {
  return Math.random() < clamp(Number(successRate) || 0, 0, 1);
}
```

- [ ] **Step 3: Run helper spot checks**

Run from the worktree root:

```powershell
node --input-type=module -e "import { getOvrForLevel, normalizeUpgradeLevel, calculateUpgradeGauge, pickQuickAddFodders } from './client/src/fco/upgradeHelpers.js'; if (normalizeUpgradeLevel(99) !== 13 || normalizeUpgradeLevel(0) !== 1) process.exit(1); if (getOvrForLevel(100, 13) !== 128) { console.error(getOvrForLevel(100, 13)); process.exit(1); } const same = calculateUpgradeGauge({ targetOvr: 100, currentLevel: 1, fodderOvrs: [100] }); if (JSON.stringify(same) !== JSON.stringify({ fodderGauges: [2.5], materialGauge: 2.5, totalGauge: 2.5, gaugeRatio: 0.5, fullGaugeSuccessRate: 1, successRate: 0.5 })) { console.error(same); process.exit(1); } const picked = pickQuickAddFodders({ candidates: [{ id: 1, ovr: 100 }, { id: 2, ovr: 100 }], existingFodders: [], mainPlayerId: 99, targetOvr: 100, currentLevel: 1, targetGauge: 5 }); if (picked.length !== 2 || picked[0].upgradeLevel !== 1) { console.error(picked); process.exit(1); } console.log('upgrade helper checks passed');"
```

Expected output includes:

```txt
upgrade helper checks passed
```

- [ ] **Step 4: Commit Task 1**

```powershell
git add "client/src/fco/upgradeConfig.js" "client/src/fco/upgradeHelpers.js"
git commit -m "feat: extend upgrade level helpers"
```

---

### Task 2: Add top-10 and level selection to PlayerPicker

**Files:**
- Modify: `client/src/fco/components/PlayerPicker.jsx`
- Modify: `client/src/fco/fco.css`

**Interfaces:**
- Consumes:
  - `fetchPlayers({ search, sort, pageSize })` from `client/src/fco/api.js`
  - `normalizeUpgradeLevel(level)` from `client/src/fco/upgradeHelpers.js`
- Produces:
  - `PlayerPicker({ showTopPlayers?: boolean, allowLevelSelect?: boolean, defaultLevel?: number, existing?: number[], onAdd(playerWithLevel), onClose, title })`

- [ ] **Step 1: Replace `PlayerPicker.jsx`**

Replace `client/src/fco/components/PlayerPicker.jsx` with:

```jsx
import { useState, useEffect, useRef } from 'react';
import { fetchPlayers } from '../api.js';
import { cleanName, statColor } from '../helpers.js';
import { normalizeUpgradeLevel } from '../upgradeHelpers.js';
import { PlayerAvatar, SeasonChip, PosPill } from '../ui.jsx';
import * as I from '../Icons.jsx';

const LEVELS = Array.from({ length: 13 }, (_, index) => index + 1);

export default function PlayerPicker({
  existing = [],
  onAdd,
  onClose,
  title = 'Chọn cầu thủ',
  showTopPlayers = false,
  allowLevelSelect = false,
  defaultLevel = 1,
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [levelById, setLevelById] = useState({});
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const search = q.trim();

      if (!search && !showTopPlayers) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const res = await fetchPlayers({
          search,
          sort: 'ovr_desc',
          pageSize: search ? 20 : 10,
        });
        setResults(res.players);
      } finally {
        setLoading(false);
      }
    }, q.trim() ? 300 : 0);

    return () => clearTimeout(timer.current);
  }, [q, showTopPlayers]);

  function getLevel(playerId) {
    return normalizeUpgradeLevel(levelById[playerId] ?? defaultLevel);
  }

  function choosePlayer(player) {
    onAdd({
      ...player,
      upgradeLevel: getLevel(player.id),
    });
  }

  return (
    <div className="fco-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fco-modal">
        <div className="fco-modal-head">
          <div>
            <div className="fco-modal-title">{title}</div>
            {showTopPlayers && !q.trim() && (
              <div className="fco-modal-subtitle">Top 10 OVR cao nhất</div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer' }}>
            <I.X size={18} />
          </button>
        </div>
        <div className="fco-modal-search">
          <I.Search size={15} style={{ color: 'var(--text-faint)' }} />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm cầu thủ…" />
        </div>
        <div className="fco-modal-list">
          {loading && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-faint)' }}><I.Spinner size={20} className="fco-spin" /></div>}
          {!loading && results.map(p => {
            const disabled = existing.includes(p.id);
            const selectedLevel = getLevel(p.id);

            return (
              <button key={p.id} className="fco-modal-item" disabled={disabled} onClick={() => choosePlayer(p)}>
                <PlayerAvatar player={p} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="fco-modal-itemname">{cleanName(p.name)}</div>
                  <div className="fco-modal-itemsub">
                    <SeasonChip code={p.season} img={p.seasonImg} />
                    {' '}<PosPill pos={p.primaryPos} />
                    <span style={{ marginLeft: 6, fontFamily: 'var(--mono)', fontSize: 12, color: statColor(p.ovr) }}>{p.ovr}</span>
                  </div>
                </div>
                {allowLevelSelect && !disabled && (
                  <select
                    className="fco-up-picker-level"
                    value={selectedLevel}
                    onClick={e => e.stopPropagation()}
                    onChange={e => setLevelById(prev => ({ ...prev, [p.id]: normalizeUpgradeLevel(e.target.value) }))}
                    aria-label={`Cấp thẻ của ${cleanName(p.name)}`}
                  >
                    {LEVELS.map(level => (
                      <option key={level} value={level}>+{level}</option>
                    ))}
                  </select>
                )}
                {disabled && <I.Check size={14} style={{ color: 'var(--accent)', flex: '0 0 14px' }} />}
              </button>
            );
          })}
          {!loading && q && results.length === 0 && (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>Không tìm thấy cầu thủ</div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add picker CSS**

In `client/src/fco/fco.css`, after `.fco-modal-title`, add:

```css
.fco-modal-subtitle { margin-top: 3px; color: var(--text-faint); font-size: 11.5px; font-weight: 600; }
.fco-up-picker-level { flex: 0 0 auto; height: 30px; min-width: 58px; border-radius: 8px; border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border)); background: #0b1016; color: var(--accent); font-family: var(--mono); font-size: 12px; font-weight: 800; padding: 0 7px; outline: none; cursor: pointer; }
.fco-up-picker-level:focus { box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent); }
```

- [ ] **Step 3: Build to verify existing picker callers still compile**

Run:

```powershell
npm --prefix client run build
```

Expected output includes:

```txt
✓ built in
```

- [ ] **Step 4: Commit Task 2**

```powershell
git add "client/src/fco/components/PlayerPicker.jsx" "client/src/fco/fco.css"
git commit -m "feat: add upgrade level player picker"
```

---

### Task 3: Copy mascot assets and wire game-machine UpgradeView

**Files:**
- Create: `client/public/upgrade-sad.png`
- Create: `client/public/upgrade-happy.png`
- Modify: `client/src/fco/views/UpgradeView.jsx`

**Interfaces:**
- Consumes:
  - `MAX_FODDERS`, `MAX_GAUGE`, `QUICK_ADD_GAUGE_TARGETS`, `UPGRADE_MASCOT_IMAGES` from `../upgradeConfig.js`
  - `calculateUpgradeGauge`, `getDisplayedOvrForPlayer`, `normalizeUpgradeLevel`, `pickQuickAddFodders`, `rollUpgrade`, `withUpgradeLevel` from `../upgradeHelpers.js`
  - `fetchPlayers` from `../api.js`
- Produces:
  - `/upgrade` UI with per-card levels, quick-add target controls, simplified gauge summary, and mascot state.

- [ ] **Step 1: Copy mascot images into public assets**

Run from any directory:

```powershell
Copy-Item "C:\Users\Admin\Downloads\ChatGPT Image 22_31_01 17 thg 6, 2026.png" "D:\ReactJS\fco-hub\.claude\worktrees\upgrade-gauge-formula\client\public\upgrade-sad.png" -Force
Copy-Item "C:\Users\Admin\Downloads\ChatGPT Image 22_31_01 17 thg 6, 2026 (1).png" "D:\ReactJS\fco-hub\.claude\worktrees\upgrade-gauge-formula\client\public\upgrade-happy.png" -Force
```

Expected: both files exist in `client/public`.

- [ ] **Step 2: Replace `UpgradeView.jsx`**

Replace `client/src/fco/views/UpgradeView.jsx` with:

```jsx
import { useState, useMemo, useRef } from 'react';
import PlayerPicker from '../components/PlayerPicker';
import { fetchPlayers } from '../api.js';
import {
  MAX_FODDERS,
  MAX_GAUGE,
  QUICK_ADD_GAUGE_TARGETS,
  UPGRADE_MASCOT_IMAGES,
} from '../upgradeConfig.js';
import {
  calculateUpgradeGauge,
  getDisplayedOvrForPlayer,
  normalizeUpgradeLevel,
  pickQuickAddFodders,
  rollUpgrade,
  withUpgradeLevel,
} from '../upgradeHelpers.js';
import { Button, PlayerAvatar, SeasonChip, OvrBox } from '../ui.jsx';
import { cleanName } from '../helpers.js';
import * as I from '../Icons.jsx';

export default function UpgradeView({ onSelect }) {
  const [mainPlayer, setMainPlayer] = useState(null);
  const [level, setLevel] = useState(0);
  const [fuel, setFuel] = useState([]);
  const [pickerMode, setPickerOpen] = useState(null);
  const [isSafeMode, setSafeMode] = useState(true);
  const [animStatus, setAnimStatus] = useState('idle');
  const [quickAdding, setQuickAdding] = useState(null);
  const cancelRef = useRef(null);

  const targetOvr = useMemo(() => {
    if (!mainPlayer) return 0;
    return getDisplayedOvrForPlayer({ ...mainPlayer, upgradeLevel: level });
  }, [mainPlayer, level]);

  const upgradeGauge = useMemo(() => {
    if (!mainPlayer) {
      return calculateUpgradeGauge({ targetOvr: 0, currentLevel: 0, fodderOvrs: [] });
    }

    return calculateUpgradeGauge({
      targetOvr,
      currentLevel: level,
      fodderOvrs: fuel.map(player => getDisplayedOvrForPlayer(player)),
    });
  }, [mainPlayer, targetOvr, level, fuel]);

  const mascotSrc = upgradeGauge.totalGauge >= MAX_GAUGE
    ? UPGRADE_MASCOT_IMAGES.happy
    : UPGRADE_MASCOT_IMAGES.sad;

  const nextLevel = level >= 13 ? 13 : level + 1;

  function handleAddPlayer(player) {
    const selected = withUpgradeLevel(player, player.upgradeLevel);

    if (pickerMode === 'main') {
      setMainPlayer(selected);
      setLevel(normalizeUpgradeLevel(selected.upgradeLevel));
      setFuel([]);
    } else if (pickerMode === 'fuel') {
      if (fuel.length < MAX_FODDERS) setFuel([...fuel, selected]);
    }

    setPickerOpen(null);
  }

  async function quickAddToGauge(targetGauge) {
    if (!mainPlayer || animStatus !== 'idle') return;

    setQuickAdding(targetGauge);
    try {
      const res = await fetchPlayers({ sort: 'ovr_desc', pageSize: 40 });
      const picked = pickQuickAddFodders({
        candidates: res.players,
        existingFodders: fuel,
        mainPlayerId: mainPlayer.id,
        targetOvr,
        currentLevel: level,
        targetGauge,
      });
      setFuel(picked);
    } finally {
      setQuickAdding(null);
    }
  }

  function doUpgrade() {
    if (animStatus === 'running' || !mainPlayer || level >= 13 || !fuel.length) return;
    setAnimStatus('running');

    clearTimeout(cancelRef.current);
    cancelRef.current = setTimeout(() => {
      const success = rollUpgrade(upgradeGauge.successRate);
      if (success) {
        setAnimStatus('success');
        setLevel(prev => Math.min(13, Math.max(1, prev) + 1));
      } else {
        setAnimStatus('fail');
        if (!isSafeMode) setLevel(prev => Math.max(1, prev - 1));
      }
      setFuel([]);

      cancelRef.current = setTimeout(() => setAnimStatus('idle'), 2000);
    }, 1500);
  }

  return (
    <div className="fco-up-view fco-up-machine-view">
      <div className="fco-up-machine-head">
        <div>
          <h2 className="fco-h2">Giả lập nâng cấp</h2>
          <p className="fco-sub">Máy ép thẻ mô phỏng thanh nguyên liệu 5 vạch và tỷ lệ nâng cấp theo cấp thẻ FCO.</p>
        </div>
        {mainPlayer && (
          <Button variant="ghost" size="sm" icon={I.Refresh} onClick={() => { setMainPlayer(null); setLevel(0); setFuel([]); }}>
            Đổi cầu thủ
          </Button>
        )}
      </div>

      <div className="fco-up-machine-stage">
        <div className="fco-up-machine-orbit" />

        <div className="fco-up-machine-core">
          <div className="fco-up-main">
            {mainPlayer ? (
              <div className={`fco-up-card fco-up-${animStatus}`} onClick={() => animStatus === 'idle' && setPickerOpen('main')}>
                <div className="fco-up-level-badge">+{level}</div>
                <PlayerAvatar player={mainPlayer} size={104} />
                <div style={{ marginTop: 12, fontWeight: 700, fontSize: 16 }}>{cleanName(mainPlayer.name)}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                  <SeasonChip code={mainPlayer.season} img={mainPlayer.seasonImg} />
                </div>
                <div style={{ marginTop: 12 }}>
                  <OvrBox value={targetOvr} size="md" />
                </div>
              </div>
            ) : (
              <div className="fco-up-card empty" onClick={() => setPickerOpen('main')}>
                <div style={{ background: 'var(--surface-3)', width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <I.Plus size={32} style={{ margin: 'auto' }} />
                </div>
                <span style={{ fontWeight: 600 }}>Chọn cầu thủ</span>
              </div>
            )}
            <div className="fco-up-led" />
          </div>
        </div>

        {mainPlayer && (
          <div className="fco-up-machine-console">
            <div className="fco-up-mascot-card">
              <img src={mascotSrc} alt={upgradeGauge.totalGauge >= MAX_GAUGE ? 'Đủ 5 vạch' : 'Chưa đủ 5 vạch'} />
              <span>{upgradeGauge.totalGauge >= MAX_GAUGE ? 'Đã full 5 vạch!' : 'Chưa full vạch'}</span>
            </div>

            <div className="fco-up-gauge-panel">
              <div className="fco-up-level-row">
                <span>Nâng cấp: <b>+{level} → +{nextLevel}</b></span>
                <span>Phôi: <b>{fuel.length}/{MAX_FODDERS}</b></span>
              </div>

              <div className="fco-up-progress-wrap fco-up-progress-machine">
                <div className="fco-up-progress-bar" style={{ width: `${Math.min(100, upgradeGauge.gaugeRatio * 100)}%` }} />
                <div className="fco-up-progress-ticks">
                  {[20, 40, 60, 80].map(t => (
                    <div key={t} className="fco-up-tick" style={{ left: `${t}%` }} />
                  ))}
                </div>
              </div>

              <div className="fco-up-summary-grid compact">
                <div>
                  <span>Tổng vạch</span>
                  <b>{upgradeGauge.totalGauge.toFixed(4)} / {MAX_GAUGE}</b>
                </div>
                <div>
                  <span>Tỷ lệ full vạch</span>
                  <b>{(upgradeGauge.fullGaugeSuccessRate * 100).toFixed(2)}%</b>
                </div>
                <div className="wide hot">
                  <span>Tỷ lệ thành công cuối</span>
                  <b>{(upgradeGauge.successRate * 100).toFixed(2)}%</b>
                </div>
              </div>
            </div>

            <div className="fco-up-quick-panel">
              <div className="fco-up-quick-title">Thêm nhanh đến mốc vạch</div>
              <div className="fco-up-quick-buttons">
                {QUICK_ADD_GAUGE_TARGETS.map(target => (
                  <button
                    key={target}
                    type="button"
                    className="fco-up-quick-btn"
                    disabled={quickAdding !== null || animStatus !== 'idle'}
                    onClick={() => quickAddToGauge(target)}
                  >
                    {quickAdding === target ? <I.Spinner size={13} className="fco-spin" /> : `${target} vạch`}
                  </button>
                ))}
              </div>
            </div>

            <div className="fco-up-fuels machine">
              {Array.from({ length: MAX_FODDERS }).map((_, i) => (
                <div key={i} className="fco-up-fuel-slot" onClick={() => animStatus === 'idle' && setPickerOpen('fuel')}>
                  {fuel[i] ? (
                    <div className="fco-up-fuel-filled">
                      <div className="fco-up-mini-level">+{fuel[i].upgradeLevel || 1}</div>
                      <PlayerAvatar player={fuel[i]} size={42} />
                      <div className="fco-up-fuel-gauge">{(upgradeGauge.fodderGauges[i] || 0).toFixed(4)}</div>
                      <button
                        style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: '50%', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={(e) => { e.stopPropagation(); setFuel(prev => prev.filter((_, idx) => idx !== i)); }}>
                        <I.X size={10} />
                      </button>
                    </div>
                  ) : <I.Plus size={18} style={{ opacity: 0.2 }} />}
                </div>
              ))}
            </div>

            {fuel.length > 0 && (
              <div className="fco-up-fuel-note">
                Số dưới mỗi phôi là số vạch đóng góp, tính bằng OVR hiện tại của phôi so với OVR hiện tại của cầu thủ đang nâng.
              </div>
            )}

            <div className="fco-up-action-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                <div className={`fco-checkbox ${isSafeMode ? 'on' : ''}`}>
                  {isSafeMode && <I.Check size={12} />}
                </div>
                <input type="checkbox" style={{ display: 'none' }} checked={isSafeMode} onChange={e => setSafeMode(e.target.checked)} />
                <span style={{ fontSize: 13.5, fontWeight: 550 }}>Chế độ an toàn</span>
              </label>
              <Button variant="primary" size="lg" disabled={animStatus !== 'idle' || !fuel.length || level >= 13} onClick={doUpgrade} style={{ minWidth: 140 }}>
                {level >= 13 ? 'Đã đạt +13' : 'Nâng cấp'}
              </Button>
            </div>

            {animStatus === 'success' && (
              <div className="fco-up-result success">Thành công! Cầu thủ đã lên cấp mới.</div>
            )}
            {animStatus === 'fail' && (
              <div className="fco-up-result fail">Thất bại. Cấp thẻ được xử lý theo chế độ đang chọn.</div>
            )}
          </div>
        )}
      </div>

      <div className="fco-up-disclaimer">
        Đây là công cụ giả lập phục vụ tham khảo, không phải công cụ chính thức của Garena/FCO và không khẳng định là công thức nội bộ chính thức của game.
      </div>

      {pickerMode && (
        <PlayerPicker
          title={pickerMode === 'main' ? 'Chọn cầu thủ nâng cấp' : 'Chọn thẻ phôi'}
          showTopPlayers
          allowLevelSelect
          defaultLevel={pickerMode === 'main' ? Math.max(1, level || 1) : 1}
          existing={[
            ...(mainPlayer ? [mainPlayer.id] : []),
            ...fuel.map(player => player.id),
          ]}
          onAdd={handleAddPlayer}
          onClose={() => setPickerOpen(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run build**

Run:

```powershell
npm --prefix client run build
```

Expected output includes:

```txt
✓ built in
```

- [ ] **Step 4: Commit Task 3**

```powershell
git add "client/public/upgrade-sad.png" "client/public/upgrade-happy.png" "client/src/fco/views/UpgradeView.jsx"
git commit -m "feat: wire upgrade game machine view"
```

---

### Task 4: Add game-machine visual polish

**Files:**
- Modify: `client/src/fco/fco.css`

**Interfaces:**
- Consumes class names produced by Task 3:
  - `.fco-up-machine-view`
  - `.fco-up-machine-head`
  - `.fco-up-machine-stage`
  - `.fco-up-machine-orbit`
  - `.fco-up-machine-core`
  - `.fco-up-machine-console`
  - `.fco-up-mascot-card`
  - `.fco-up-quick-panel`
  - `.fco-up-quick-buttons`
  - `.fco-up-quick-btn`
  - `.fco-up-level-badge`
  - `.fco-up-mini-level`
  - `.fco-up-action-row`
- Produces visually polished game-machine layout.

- [ ] **Step 1: Add game-machine CSS**

In `client/src/fco/fco.css`, after the existing upgrade simulator CSS block and before `/* ===== Compare ===== */`, add:

```css
.fco-up-machine-view { gap: 16px; }
.fco-up-machine-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 4px; }
.fco-up-machine-stage { position: relative; display: grid; grid-template-columns: minmax(260px, .9fr) minmax(320px, 1.2fr); align-items: center; gap: 26px; padding: 30px; min-height: 610px; background: radial-gradient(circle at 27% 34%, rgba(0,224,138,.18), transparent 25%), radial-gradient(circle at 80% 12%, rgba(55,160,255,.12), transparent 28%), linear-gradient(145deg, rgba(255,255,255,.035), rgba(255,255,255,0)), var(--surface); border: 1px solid var(--border); border-radius: 22px; overflow: hidden; }
.fco-up-machine-orbit { position: absolute; width: 360px; height: 360px; left: 5%; top: 80px; border: 1px solid rgba(0,224,138,.16); border-radius: 50%; box-shadow: inset 0 0 42px rgba(0,224,138,.06), 0 0 60px rgba(0,224,138,.05); pointer-events: none; }
.fco-up-machine-orbit::before, .fco-up-machine-orbit::after { content: ""; position: absolute; inset: 42px; border: 1px dashed rgba(255,255,255,.08); border-radius: 50%; }
.fco-up-machine-orbit::after { inset: 84px; border-style: solid; border-color: rgba(55,160,255,.12); }
.fco-up-machine-core { position: relative; z-index: 1; display: flex; justify-content: center; }
.fco-up-machine-console { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 15px; padding: 18px; border: 1px solid rgba(255,255,255,.06); border-radius: 18px; background: rgba(7,10,14,.48); box-shadow: inset 0 1px 0 rgba(255,255,255,.04), 0 22px 60px rgba(0,0,0,.26); backdrop-filter: blur(8px); }
.fco-up-level-badge { position: absolute; top: 12px; right: 12px; min-width: 42px; height: 34px; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; color: #251000; background: linear-gradient(135deg, #fff1a8, #f4b44d 45%, #c96b23); border: 1px solid rgba(255,225,137,.72); font-family: var(--mono); font-weight: 900; font-size: 15px; box-shadow: 0 8px 18px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.55); }
.fco-up-mini-level { position: absolute; left: -7px; top: -7px; z-index: 2; min-width: 26px; height: 20px; display: inline-flex; align-items: center; justify-content: center; border-radius: 7px; background: linear-gradient(135deg, #ffe58b, #d47a24); color: #1b0b00; border: 1px solid rgba(255,230,150,.65); font-family: var(--mono); font-weight: 900; font-size: 10px; }
.fco-up-mascot-card { width: min(240px, 100%); display: flex; align-items: center; justify-content: center; gap: 10px; padding: 10px 12px; border: 1px solid color-mix(in srgb, var(--accent) 22%, var(--border)); border-radius: 16px; background: linear-gradient(135deg, rgba(0,224,138,.08), rgba(55,160,255,.05)); }
.fco-up-mascot-card img { width: 72px; height: 72px; object-fit: cover; border-radius: 16px; border: 1px solid rgba(255,255,255,.08); box-shadow: 0 10px 28px rgba(0,0,0,.28); }
.fco-up-mascot-card span { color: var(--text); font-weight: 800; font-size: 13px; }
.fco-up-progress-machine { height: 16px; box-shadow: inset 0 0 18px rgba(0,0,0,.45), 0 0 24px rgba(0,224,138,.08); }
.fco-up-summary-grid.compact { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.fco-up-summary-grid.compact > div.wide { grid-column: span 2; }
.fco-up-summary-grid > div.hot b { color: var(--accent); font-size: 22px; text-shadow: 0 0 12px rgba(0,224,138,.22); }
.fco-up-quick-panel { width: min(560px, 100%); display: flex; flex-direction: column; gap: 9px; padding: 12px; border: 1px solid var(--border-soft); border-radius: 14px; background: rgba(10,12,16,.34); }
.fco-up-quick-title { text-align: center; color: var(--text-dim); font-size: 12px; font-weight: 700; }
.fco-up-quick-buttons { display: grid; grid-template-columns: repeat(5, 1fr); gap: 7px; }
.fco-up-quick-btn { min-height: 34px; display: inline-flex; align-items: center; justify-content: center; gap: 5px; border: 1px solid color-mix(in srgb, var(--accent) 24%, var(--border)); border-radius: 10px; background: color-mix(in srgb, var(--accent) 7%, var(--surface-2)); color: var(--text); font-size: 12px; font-weight: 800; cursor: pointer; transition: transform .14s ease, border-color .14s ease, background .14s ease; }
.fco-up-quick-btn:hover:not(:disabled) { transform: translateY(-1px); border-color: color-mix(in srgb, var(--accent) 56%, var(--border)); background: color-mix(in srgb, var(--accent) 13%, var(--surface-2)); }
.fco-up-quick-btn:disabled { opacity: .58; cursor: wait; }
.fco-up-fuels.machine { padding: 8px 0 14px; }
.fco-up-action-row { display: flex; align-items: center; justify-content: center; gap: 24px; margin-top: 4px; flex-wrap: wrap; }

@media (max-width: 960px) {
  .fco-up-machine-stage { grid-template-columns: 1fr; padding: 22px; }
  .fco-up-machine-orbit { left: 50%; top: 38px; transform: translateX(-50%); }
}

@media (max-width: 560px) {
  .fco-up-quick-buttons { grid-template-columns: repeat(2, 1fr); }
  .fco-up-summary-grid.compact { grid-template-columns: 1fr; }
  .fco-up-summary-grid.compact > div.wide { grid-column: span 1; }
  .fco-up-mascot-card { flex-direction: column; text-align: center; }
}
```

- [ ] **Step 2: Build client**

Run:

```powershell
npm --prefix client run build
```

Expected output includes:

```txt
✓ built in
```

- [ ] **Step 3: Commit Task 4**

```powershell
git add "client/src/fco/fco.css"
git commit -m "style: polish upgrade game machine"
```

---

### Task 5: Browser verification

**Files:**
- No source files expected unless verification finds a bug.

**Interfaces:**
- Consumes completed Tasks 1-4.
- Produces verified `/upgrade` behavior.

- [ ] **Step 1: Start dev server**

Run:

```powershell
npm --prefix client run dev
```

Expected output includes a local URL like:

```txt
Local:   http://localhost:5173/
```

- [ ] **Step 2: Open `/upgrade`**

Navigate to:

```txt
http://localhost:5173/#/upgrade
```

- [ ] **Step 3: Verify picker top 10 and level selector**

Expected:

- Clicking the main card opens the picker.
- With empty search, the picker title area says `Top 10 OVR cao nhất`.
- Rows show a `+1..+13` selector.
- Searching still filters players.

- [ ] **Step 4: Verify main and fodder levels**

Expected:

- Selecting a main player at `+5` shows level badge `+5` and displayed OVR equal to base OVR plus cumulative gains through `+5`.
- Selecting a fodder at `+3` shows mini badge `+3` in the fodder slot.
- Changing fodder level affects the gauge contribution after selecting that fodder.

- [ ] **Step 5: Verify quick-add targets**

Expected:

- Quick-add buttons are visible: `1 vạch`, `2 vạch`, `3 vạch`, `4 vạch`, `5 vạch`.
- Clicking a target fills fodders up to that gauge target or up to 5 fodders.
- `Tổng vạch` never exceeds `5 / 5`.

- [ ] **Step 6: Verify mascot and result states**

Expected:

- Sad mascot appears when `Tổng vạch` is below `5 / 5`.
- Happy mascot appears when `Tổng vạch` is exactly or effectively `5 / 5`.
- Clicking upgrade consumes fodders and shows success/failure result copy.

- [ ] **Step 7: Stop dev server and check status**

Run:

```powershell
git status --short
```

Expected: no uncommitted source changes except any intentionally uncommitted verification fixes.

---

## Self-Review

- Spec coverage: Task 1 covers the new level/outcome data and helper interfaces. Task 2 covers top-10 picker defaults and level selectors while preserving existing callers. Task 3 covers mascot assets, quick-add target behavior, simplified metrics, per-card levels, and `/upgrade` orchestration. Task 4 covers the approved Game machine visual direction. Task 5 covers browser verification.
- Placeholder scan: no TBD/TODO placeholders remain; each code-changing step includes concrete code or exact commands.
- Type consistency: `upgradeLevel`, `normalizeUpgradeLevel`, `getDisplayedOvrForPlayer`, `pickQuickAddFodders`, `QUICK_ADD_GAUGE_TARGETS`, and `UPGRADE_MASCOT_IMAGES` are consistently named across tasks.
