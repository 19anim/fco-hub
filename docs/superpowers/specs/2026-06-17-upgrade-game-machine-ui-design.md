# Upgrade Game Machine UI — Design Spec

**Date:** 2026-06-17
**Scope:** Expand the `/upgrade` simulator UI after the gauge formula work. This remains a simulator only and must not claim to be Garena/FCO's official tool or internal formula.

## Goal

Turn `/upgrade` from a basic calculator-style simulator into a game-like upgrade machine that supports:

- picker default results showing the top 10 highest-OVR players,
- selecting an enhancement level for the target card and each fodder card,
- displayed OVR based on the selected card level,
- quick-add fodder to a target material-gauge amount,
- card-level visual badges/assets,
- happy/sad mascot image based on whether the 5-bar gauge is full,
- a cleaner summary that avoids duplicated `% thanh` and `Tổng vạch` metrics.

## Approved Direction

Use the **Game machine** approach:

- Center the main upgrade card as the core slot.
- Present the gauge as an energy/furnace bar.
- Place up to 5 fodder cards as a dock below the core.
- Use richer visual state, mascot art, and stronger emphasis on the final success rate.
- Keep the existing route and React component structure rather than building a separate wizard.

## Enhancement Level Data

The full-gauge success-rate table is also the upgrade outcome table:

| Upgrade | OVR gain for next level | Full-gauge rate |
| --- | ---: | ---: |
| +1 → +2 | +1 | 100% |
| +2 → +3 | +1 | 81% |
| +3 → +4 | +2 | 64% |
| +4 → +5 | +2 | 50% |
| +5 → +6 | +2 | 26% |
| +6 → +7 | +3 | 15% |
| +7 → +8 | +4 | 7% |
| +8 → +9 | +2 | 5% |
| +9 → +10 | +2 | 4% |
| +10 → +11 | +2 | 3% |
| +11 → +12 | +3 | 2% |
| +12 → +13 | +3 | 1% |

Displayed OVR for a card at level `L` is:

```txt
base OVR + sum of OVR gains from +1 up to +L
```

For example:

- Level `+1`: base OVR + 0.
- Level `+2`: base OVR + 1.
- Level `+3`: base OVR + 2.
- Level `+4`: base OVR + 4.
- Level `+13`: base OVR + 28.

The formula helper should derive the cumulative display map from the upgrade outcome table to avoid the OVR map drifting from the displayed table.

## Picker Changes

Update `PlayerPicker` to support upgrade usage without breaking existing callers.

New optional props:

```js
{
  showTopPlayers?: boolean,
  allowLevelSelect?: boolean,
  defaultLevel?: number,
  onAdd(playerWithLevel)
}
```

Behavior:

- Existing generic picker use cases continue to work with no level selector.
- When `showTopPlayers` is true and the search query is empty, fetch `pageSize: 10` sorted by highest OVR and show those results.
- When the user types a query, search behavior remains debounced and returns search results.
- When `allowLevelSelect` is true, each result row includes a compact `+1..+13` selector.
- The selected level is attached to the returned player object as `upgradeLevel`.
- Existing duplicate disable logic still works by player id.

## Upgrade View State

`UpgradeView.jsx` should store per-card enhancement levels:

- `mainPlayer` includes or is paired with current level.
- Each fodder item includes `upgradeLevel`.
- The target displayed OVR uses the main player's current level.
- Each fodder displayed OVR uses that fodder's selected level.

When selecting a main player:

- Use the picker-selected level, defaulting to `+1`.
- Clear existing fodder.

When selecting a fodder:

- Use the picker-selected level, defaulting to `+1`.
- Keep the 5-fodder cap.

When a successful upgrade happens:

- Increment the main card level by one, capped at `+13`.
- Fodder cards are consumed.

## Quick Add Gauge Targets

Add quick-add controls with target gauge amounts:

```txt
1 vạch | 2 vạch | 3 vạch | 4 vạch | 5 vạch
```

Behavior:

- Quick add is only enabled when a main player is selected and the animation is idle.
- It fetches top OVR players, enough to fill up to 5 fodder slots.
- It adds fodder candidates until `totalGauge` reaches or exceeds the selected target, or until 5 fodders are used.
- Existing selected fodders count toward the gauge and are not discarded.
- Fetched candidates already used as the main player or existing fodder should be skipped.
- New quick-added fodders default to level `+1` unless later UI adds a separate quick-add level option.
- If the target cannot be reached within 5 fodders, the UI simply shows the best achievable result; no blocking error is needed.

## Gauge Summary Simplification

Avoid duplicate gauge information.

Keep:

- `Tổng vạch: x / 5`
- `Tỷ lệ full vạch`
- `Tỷ lệ thành công cuối`
- `+current → +next`

Remove or de-emphasize:

- separate `% thanh` tile when `Tổng vạch x / 5` is already visible.

The final success rate should be the most prominent number.

## Mascot Images

Use the user's local images as public assets:

```txt
C:\Users\Admin\Downloads\ChatGPT Image 22_31_01 17 thg 6, 2026.png
C:\Users\Admin\Downloads\ChatGPT Image 22_31_01 17 thg 6, 2026 (1).png
```

Copy them into the client public folder as:

```txt
client/public/upgrade-sad.png
client/public/upgrade-happy.png
```

Display rule:

- `upgrade-sad.png` when `totalGauge < 5`.
- `upgrade-happy.png` when `totalGauge >= 5`.

The mascot should visually sit near the gauge/result panel, not inside the picker.

## Card-Level Visual Asset

Use the user's provided reference image for FCO card enhancement visuals:

```txt
https://gamek.mediacdn.vn/133514250583805952/2025/10/28/fconline-6-1761649055099-1761649055469327701837.png
```

Implementation preference:

1. If the asset is practical as a sprite, add a level badge component that uses it with CSS background positioning.
2. If exact sprite cropping is unreliable, create a styled level badge (`+1..+13`) inspired by the asset's gold/red enhancement-card look.

Do not block the feature on perfect sprite extraction. The UI must remain usable even if the external image cannot be fetched.

## Component Boundaries

Recommended small units:

- `upgradeConfig.js`
  - formula constants,
  - outcome table,
  - max values,
  - asset paths.
- `upgradeHelpers.js`
  - displayed OVR calculation,
  - gauge calculation,
  - quick-add selection helper if simple enough.
- `PlayerPicker.jsx`
  - optional top-10 results,
  - optional per-row level selector.
- `UpgradeView.jsx`
  - game-machine layout and state orchestration.
- `fco.css`
  - layout, picker level controls, quick-add controls, mascot, level badges.

## Verification

Implementation should be verified by:

1. Build succeeds.
2. Opening `/upgrade` with no search in picker shows top 10 players.
3. Selecting a main player with level `+n` updates the displayed OVR.
4. Selecting fodders with levels changes their gauge contribution.
5. Quick-add target buttons add fodders up to the selected target or the 5-fodder cap.
6. `Tổng vạch` never exceeds `5 / 5`.
7. The happy mascot appears at full 5 bars; the sad mascot appears below 5 bars.
8. The final success rate remains consistent with `fullGaugeSuccessRate × totalGauge / 5`.
9. Existing non-upgrade uses of `PlayerPicker` still work.
