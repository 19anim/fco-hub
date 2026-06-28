# FIFAaddict Upgrade Simulator Controls — Design Spec

**Date:** 2026-06-28

## Goal

Update the existing `/upgrade` simulator so the specific upgrade controls and result flow match the referenced FIFAaddict simulator behavior more closely, while preserving the current fco-hub page shell and the existing real success-rate formula.

The change focuses on the parts requested for parity:

- One numeric OVR material card instead of selecting real fodder players.
- Current card level selected directly on the upgrade screen.
- FIFAaddict-style enhancement effect percentage control.
- FIFAaddict-style player protection toggle.
- Success and failure animation flow, not text-only results.
- Verification against FIFAaddict for every upgrade level.

## Scope

This is an incremental update to `client/src/fco/views/UpgradeView.jsx`, `client/src/fco/upgradeHelpers.js`, `client/src/fco/upgradeConfig.js`, and related CSS/tests as needed. It does not redesign the entire page to be a pixel-perfect FIFAaddict clone. The existing route, player picker for the main player, and fco-hub visual shell remain.

## UI Flow

The user still opens `/upgrade` and selects the main player through the existing player picker. The player picker is only for choosing the target player; enhancement level is no longer selected inside the picker.

After a target player is selected, the upgrade screen shows:

- Target player card and displayed OVR.
- A `Cấp thẻ` selector on the main upgrade screen.
- A single material OVR control, defaulting to `200`.
- Enhancement effect percentage control matching FIFAaddict's behavior.
- Player protection toggle with `BẬT/TẮT` state.
- Upgrade gauge / session percentage.
- Real success percentage.
- `Nâng cấp` action button.

The material card is numeric, not a real player. It starts as `OVR 200` like FIFAaddict, but this does not force full gauge. The gauge and real success rate are still calculated from the formula.

## Formula and Display Semantics

The simulator keeps the existing real success-rate model:

```js
successRate = fullGaugeSuccessRateByLevel[currentLevel] * gaugeRatio
```

Where:

```js
gaugeRatio = totalGauge / 5
```

The UI must distinguish two concepts:

1. **Session upgrade percentage**: the FIFAaddict-style UI percentage derived from material OVR plus enhancement effect, capped at 100%.
2. **Real success percentage**: the actual roll probability derived from the current upgrade level's full-gauge rate multiplied by the session percentage.

Examples:

| Upgrade | Full-gauge rate | Session UI % | Real success % |
| --- | ---: | ---: | ---: |
| +1 → +2 | 100% | 100% | 100% |
| +5 → +6 | 26% | 100% | 26% |
| +12 → +13 | 1% | 100% | 1% |

The enhancement effect `+%` does not add directly to the real success percentage. It affects the session upgrade percentage before the real success-rate formula is applied.

## Material OVR Control

The existing fodder list and quick-add player picker are removed from the upgrade flow. They are replaced by one numeric material control:

- Default value: `200`.
- User can edit the OVR directly.
- Empty or invalid value is treated as no material / zero contribution in the UI path.
- The calculation passes one value to `calculateUpgradeGauge` as `fodderOvrs: [materialOvr]` when valid.

This keeps the simulator fast to use and matches the FIFAaddict interaction pattern for the requested parity.

## Level Control

Current upgrade level is selected directly on the upgrade screen. The valid enhancement range remains `+1` through `+12` for upgrade attempts, with `+13` as the terminal result.

Changing level updates:

- Target displayed OVR.
- `+N → +(N+1)` label.
- Base gauge contribution.
- Full-gauge success rate.
- Real success percentage.

## Protection Behavior

The player protection control mirrors FIFAaddict's visible `Bảo vệ cầu thủ` behavior.

On success:

- Current level increases by one, up to `+13`.

On failure:

- If protection is on, the level stays unchanged.
- If protection is off, the simulator uses the existing hard-mode behavior and drops one level, not below `+1`.

## Animation and Result Flow

The result flow should clone FIFAaddict's success/failure behavior for the requested parts, not simply show static text.

When the user clicks `Nâng cấp`:

1. The upgrade enters a running state.
2. The selected session values stay visible so the user can see the attempted level, material OVR, effect, and rates.
3. The player/material area plays an upgrade-in-progress animation.
4. The simulator rolls against the real success percentage.
5. Success plays a success animation, updates the level, and shows a success result state.
6. Failure plays a failure animation, applies protection/drop behavior, and shows a failure result state.
7. The material OVR remains available for another attempt so the user can retry quickly.

The CSS animation should be implemented in `client/src/fco/fco.css` using the existing class naming style. The goal is close FIFAaddict-style feedback: visible running state, distinct success styling, distinct failure styling, and motion/flash/ring effects rather than text-only results.

## Code Structure

Expected areas of change:

- `client/src/fco/views/UpgradeView.jsx`
  - Replace fodder player state with one material OVR state.
  - Move level selection to the main screen.
  - Add enhancement effect selection.
  - Add/adjust protection toggle.
  - Drive running/success/failure animation states.

- `client/src/fco/upgradeHelpers.js`
  - Keep the existing real success-rate formula.
  - Add or adjust helper semantics only if needed to express session UI percentage separately from real success percentage.

- `client/src/fco/upgradeConfig.js`
  - Add FIFAaddict-style enhancement effect options if not already present.
  - Keep full-gauge success-rate values unchanged unless FIFAaddict comparison proves they are wrong.

- `client/src/fco/fco.css`
  - Add the result and running-state animations.
  - Style the OVR material control, effect control, protection control, and result states.

## Verification

Verification must include both local tests and FIFAaddict comparison.

Local verification:

1. `calculateUpgradeGauge` still returns the expected real success rate for known inputs.
2. Material OVR `200` is calculated through the formula, not forced to full gauge.
3. Enhancement effect changes session UI percentage, then real success percentage follows the existing formula.
4. Protection on keeps level after failure.
5. Protection off drops level after failure.
6. Success increases level by one.
7. The UI disables or safely handles invalid material OVR and terminal `+13` states.
8. Browser verification confirms running, success, and failure animations are visible.

FIFAaddict parity verification:

For each current level `+1` through `+12`, compare fco-hub against FIFAaddict using the same player, same material OVR, and same enhancement effect:

- Session UI percentage.
- Real success percentage.
- Full-gauge success-rate interpretation.
- Protection behavior on failure.
- Success/failure animation flow.

Any mismatch must be fixed before reporting the implementation complete, or explicitly called out with the exact level/input where FIFAaddict differs.

## Out of Scope

- Pixel-perfect cloning of the entire FIFAaddict page outside the requested upgrade controls and animations.
- Multiple material slots.
- Selecting real fodder players.
- Claiming the formula is official Garena/FCO internal logic.
- Changing unrelated player detail, database, or monetization UI.
