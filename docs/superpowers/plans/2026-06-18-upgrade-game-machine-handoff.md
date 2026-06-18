# Upgrade Game Machine UI — Handoff

**Date:** 2026-06-18
**Worktree:** `D:/ReactJS/fco-hub/.claude/worktrees/upgrade-gauge-formula`
**Branch:** `worktree-upgrade-gauge-formula`

## Current Goal

Continue implementing and polishing the `/upgrade` Game machine UI after the gauge formula work.

The user wants:

- `/upgrade` picker opens with top 10 highest-OVR players.
- Picker can select enhancement level `+1..+13` for main card and fodder.
- Main card and fodder OVR use displayed OVR based on selected level.
- Quick-add buttons add fodder until target gauge: `1`, `2`, `3`, `4`, or `5` bars.
- Happy mascot when gauge is full; sad mascot when gauge is not full.
- Card enhancement level badges use the user-provided `upgrade.png` sprite.
- Badge crop must be exact and must not use `<img>` or canvas.
- Use React + JavaScript + regular CSS; do not add new libraries.

## Stack Confirmed

From `client/package.json`:

- React 19
- Vite 8
- JavaScript ES modules
- CSS is regular `client/src/fco/fco.css`
- No TypeScript in current FCO client files
- No CSS Modules/styled-components for this area

## Important Assets

Present in worktree:

```txt
client/public/upgrade.png
client/public/upgrade-sad.png
client/public/upgrade-happy.png
client/public/fc_online_badges_css_sprite.png
```

The latest intended level badge asset is:

```txt
client/public/upgrade.png
```

Do **not** use `fc_online_badges_css_sprite.png` for the current badge implementation unless the user explicitly asks to revert.

## Badge Sprite Requirements

`upgrade.png` sprite details provided by user:

- File: `client/public/upgrade.png`
- Original image size: `724px × 2172px`
- Vertical sprite sheet
- Use CSS `background-image`, `background-position`, `width`, `height`
- Do not use `<img>` for level badges
- Do not use canvas

Crop metadata:

```js
const LEVEL_SPRITE_CONFIG = Object.freeze({
  1: Object.freeze({ x: 251, y: 49, width: 223, height: 125 }),
  2: Object.freeze({ x: 252, y: 193, width: 220, height: 127 }),
  3: Object.freeze({ x: 252, y: 339, width: 220, height: 127 }),
  4: Object.freeze({ x: 252, y: 484, width: 220, height: 127 }),
  5: Object.freeze({ x: 252, y: 646, width: 220, height: 111 }),
  6: Object.freeze({ x: 252, y: 792, width: 220, height: 111 }),
  7: Object.freeze({ x: 252, y: 938, width: 220, height: 111 }),
  8: Object.freeze({ x: 252, y: 1069, width: 220, height: 127 }),
  9: Object.freeze({ x: 252, y: 1216, width: 220, height: 127 }),
  10: Object.freeze({ x: 252, y: 1362, width: 220, height: 127 }),
  11: Object.freeze({ x: 252, y: 1550, width: 219, height: 113 }),
  12: Object.freeze({ x: 252, y: 1722, width: 219, height: 121 }),
  13: Object.freeze({ x: 252, y: 1901, width: 219, height: 126 }),
});
```

## Files Already Created/Modified

### Created

```txt
client/src/fco/components/LevelBadge.jsx
```

This component currently contains:

- `LEVEL_SPRITE_CONFIG`
- `SPRITE_WIDTH = 724`
- `SPRITE_HEIGHT = 2172`
- `LevelBadge({ level, scale = 1, className = '', title })`

It renders a `<span>` with inline style:

```jsx
backgroundImage: "url('/upgrade.png')"
backgroundSize: `${SPRITE_WIDTH * scale}px ${SPRITE_HEIGHT * scale}px`
backgroundPosition: `-${config.x * scale}px -${config.y * scale}px`
width: config.width * scale
height: config.height * scale
```

### Modified

```txt
client/src/fco/upgradeConfig.js
client/src/fco/upgradeHelpers.js
client/src/fco/components/PlayerPicker.jsx
client/src/fco/views/UpgradeView.jsx
client/src/fco/fco.css
```

## Current Implementation Summary

### `upgradeConfig.js`

Now includes:

- `MAX_FODDERS`
- `MAX_GAUGE`
- `MIN_UPGRADE_LEVEL`
- `MAX_UPGRADE_LEVEL`
- `QUICK_ADD_GAUGE_TARGETS`
- `UPGRADE_MASCOT_IMAGES`
- `BASE_GAUGE_BY_LEVEL`
- `UPGRADE_OUTCOMES_BY_LEVEL`
- `FULL_GAUGE_SUCCESS_RATE_BY_LEVEL` derived from outcomes

### `upgradeHelpers.js`

Now includes:

- `normalizeUpgradeLevel(level)`
- `getOvrIncreaseForLevel(level)`
- `getOvrForLevel(baseOvr, level)`
- `getDisplayedOvrForPlayer(player, fallbackLevel = 1)`
- `withUpgradeLevel(player, level = 1)`
- `calculateUpgradeGauge(params)`
- `pickQuickAddFodders(params)`
- `rollUpgrade(successRate)`

### `PlayerPicker.jsx`

Now supports optional props:

```jsx
showTopPlayers = false
allowLevelSelect = false
defaultLevel = 1
```

When upgrade mode is enabled:

- empty search fetches top 10 via `fetchPlayers({ search, sort: 'ovr_desc', pageSize: 10 })`
- each row shows a compact level selector
- selected player is returned with `upgradeLevel`

Important recent change:

- Sprite preview was removed from picker rows because it broke CSS/layout.
- Keep picker rows clean with text selector only unless redesigning carefully.

### `UpgradeView.jsx`

Current intended behavior:

- Imports `LevelBadge` from `../components/LevelBadge.jsx`
- Uses `<LevelBadge level={level} scale={0.36} className="main" />` for main card
- Uses `<LevelBadge level={fuel[i].upgradeLevel || 1} scale={0.18} className="mini" />` for fodder
- Uses per-card `upgradeLevel`
- Uses `pickQuickAddFodders` for quick-add target buttons
- Uses mascot images:
  - `/upgrade-sad.png` if `totalGauge < 5`
  - `/upgrade-happy.png` if `totalGauge >= 5`

### `fco.css`

Current relevant classes:

```css
.fco-level-badge
.fco-level-badge.main
.fco-level-badge.mini
```

The old classes should no longer be used:

```css
.fco-level-sprite
.fco-level-cap1 ... .fco-level-cap13
```

If any old class remains in CSS, remove it.

## Known Recent User Feedback

The user disliked:

- level badge CSS being wrong in picker rows,
- fake/styled badge instead of sprite,
- white background from sprite,
- blend mode making badges dark,
- CSS crop taking too much surrounding background,
- machine background being too visually noisy,
- mascot position being awkward.

Recent fixes already attempted:

- Removed sprite preview from `PlayerPicker` rows.
- Replaced old `background-position` equal-frame crop with `LevelBadge` metadata crop.
- Simplified machine stage background.
- Removed console/mascot card backgrounds.
- Removed card hover jump.

## What To Do Next

1. Run a build:

```bash
npm --prefix "/d/ReactJS/fco-hub/.claude/worktrees/upgrade-gauge-formula/client" run build
```

or from PowerShell:

```powershell
npm --prefix "D:/ReactJS/fco-hub/.claude/worktrees/upgrade-gauge-formula/client" run build
```

2. If build fails, fix compile errors first.

3. Open `/upgrade`:

```txt
http://localhost:5173/#/upgrade
```

4. Verify visually:

- Picker rows are no longer broken.
- Main card level badge crop is exact and no longer dark.
- Fodder mini badge crop is exact and readable.
- No white background remains around badges.
- Machine background is calmer.
- Mascot placement is acceptable.

5. If crop still has surrounding white background:

- Keep using `LevelBadge.jsx`.
- Adjust the metadata crop values or the scale/position in CSS, **not** blend modes.
- Do not reintroduce `mix-blend-mode` unless user explicitly approves.

6. If badge is too big/small:

Adjust only the scale values in `UpgradeView.jsx`:

```jsx
<LevelBadge level={level} scale={0.36} className="main" />
<LevelBadge level={fuel[i].upgradeLevel || 1} scale={0.18} className="mini" />
```

7. After visual polish is acceptable, run final build again.

## Useful Verification Commands

Check assets:

```bash
ls -l "/d/ReactJS/fco-hub/.claude/worktrees/upgrade-gauge-formula/client/public/upgrade.png"
ls -l "/d/ReactJS/fco-hub/.claude/worktrees/upgrade-gauge-formula/client/public/upgrade-"*.png
```

Build:

```bash
npm --prefix "/d/ReactJS/fco-hub/.claude/worktrees/upgrade-gauge-formula/client" run build
```

Dev server:

```bash
npm --prefix "/d/ReactJS/fco-hub/.claude/worktrees/upgrade-gauge-formula/client" run dev
```

Git status:

```bash
git -C "/d/ReactJS/fco-hub/.claude/worktrees/upgrade-gauge-formula" status --short
```

## Caution

Do not commit yet unless the user asks. The worktree currently contains multiple source and asset changes from formula + UI work.

The main checkout also has untracked original plan/spec files, but this handoff is saved inside the worktree.
