# Upgrade Gauge Formula — Design Spec

**Date:** 2026-06-17
**Scope:** Build the FCO upgrade material gauge and success-rate formula, then integrate it into the existing `/upgrade` simulator UI. This is a simulator only and does not claim to be Garena/FCO's official internal formula.

## Goal

Replace the current generic upgrade chance calculation with a configurable formula based on:

- The target player's currently displayed OVR.
- The target card's current enhancement level, from `+1` to `+12`.
- Up to 5 fodder cards, using each fodder card's currently displayed OVR.
- Optional event gauge bonus, defaulting to `0` gauge bars.

The UI should show how each fodder contributes to the 5-bar material gauge and the final success rate used for the upgrade roll.

## Formula

Inputs:

```js
{
  targetOvr: number,
  currentLevel: number, // 1..12
  fodderOvrs: number[], // max 5
  eventGaugeBonus?: number // default 0
}
```

For each fodder:

```js
delta = fodderOvr - targetOvr
fodderGauge = min(5, baseGaugeByLevel[currentLevel] * (4 / 3) ** delta)
```

Base gauge config:

| Current level | Base gauge |
| --- | ---: |
| +1 | 2.50 |
| +2 | 1.66 |
| +3 | 1.25 |
| +4 | 1.00 |
| +5 to +12 | 0.99 |

Totals:

```js
materialGauge = sum(fodderGauge)
totalGauge = min(5, materialGauge + eventGaugeBonus)
gaugeRatio = totalGauge / 5
successRate = fullGaugeSuccessRateByLevel[currentLevel] * gaugeRatio
```

Full-gauge success-rate config:

| Upgrade | Full-gauge rate |
| --- | ---: |
| +1 → +2 | 1.00 |
| +2 → +3 | 0.81 |
| +3 → +4 | 0.64 |
| +4 → +5 | 0.50 |
| +5 → +6 | 0.26 |
| +6 → +7 | 0.15 |
| +7 → +8 | 0.07 |
| +8 → +9 | 0.05 |
| +9 → +10 | 0.04 |
| +10 → +11 | 0.03 |
| +11 → +12 | 0.02 |
| +12 → +13 | 0.01 |

All returned numeric results are rounded to 4 decimal places. `successRate` is returned as a number from `0` to `1`.

## Returned Data

The pure calculation helper returns:

```js
{
  fodderGauges: number[],
  materialGauge: number,
  totalGauge: number,
  gaugeRatio: number,
  fullGaugeSuccessRate: number,
  successRate: number
}
```

Invalid inputs should fail safely in the UI path: no target player or invalid level produces a 0-gauge/0-rate state rather than crashing the page. Fodders are capped at 5.

## Code Structure

Add a dedicated config file:

```txt
client/src/fco/upgradeConfig.js
```

It will export:

- `BASE_GAUGE_BY_LEVEL`
- `FULL_GAUGE_SUCCESS_RATE_BY_LEVEL`
- `MAX_FODDERS`
- `MAX_GAUGE`

Update the existing helper file:

```txt
client/src/fco/upgradeHelpers.js
```

It will export:

- `getOvrForLevel(baseOvr, level)` for displayed card OVR.
- `calculateUpgradeGauge(params)` for the new formula.
- `rollUpgrade(successRate)` for the random success check.

The existing old generic functions should be replaced or retained only if still used elsewhere.

## UI Integration

Update:

```txt
client/src/fco/views/UpgradeView.jsx
```

The view should:

- Use `calculateUpgradeGauge()` instead of the old `calculateFuelValue()` and `getSuccessProbability()` flow.
- Treat the target card's displayed OVR as `targetOvr`.
- Treat each fodder card's displayed OVR as `fodderOvr`.
- Keep the 5-fodder limit.
- Cap the gauge at 5 bars.
- Show:
  - each fodder's gauge contribution,
  - `materialGauge`,
  - `totalGauge`,
  - gauge percentage,
  - final success rate,
  - current level and next level,
  - success/failure result after rolling.
- Disable upgrade when there is no target, no fodder, the animation is running, or the current level is already `+13`.
- Include a visible note: this is a simulation tool and not an official Garena/FCO tool or internal formula.

## Out of Scope for This Spec

The earlier picker UX improvements are intentionally deferred to a follow-up change:

- Opening the picker with top 10 highest-OVR players.
- Selecting enhancement level directly in the picker.
- Applying separate enhancement levels to fodders from the picker.

This spec focuses on the formula and current simulator integration first, to keep the change verifiable and avoid mixing data-formula work with picker UX work.

## Verification

Implementation should be verified by:

1. Unit-style spot checks of `calculateUpgradeGauge()` with simple inputs.
2. Confirming 6 fodders cannot be added.
3. Confirming gauge and success rate never exceed their caps.
4. Manually running the upgrade page and checking that UI values match the formula.
5. Confirming the disclaimer is visible on `/upgrade`.
