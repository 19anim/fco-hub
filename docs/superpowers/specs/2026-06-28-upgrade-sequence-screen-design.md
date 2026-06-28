# Upgrade Sequence Screen Design

## Goal

Make the upgrade simulator feel closer to FIFAAddict by replacing the simulator form with a temporary upgrade sequence screen after the user clicks **Nâng cấp**.

## User flow

1. The user selects a player, level, fodders, effect, and protection mode in the existing simulator form.
2. When the user clicks **Nâng cấp**, the view immediately switches from the form to a full sequence screen within `UpgradeView`.
3. The sequence screen shows the main player card, the attempted level change (`+N → +N+1`), the current success rate context, and a charging/scanning animation.
4. After 1 second, the existing `rollUpgrade(successRate)` logic resolves the result.
5. On success, the screen shows a success animation and the player level increases by 1.
6. On failure, the screen shows a failure animation. If protection is disabled, the player level decreases by 1 using the current rules.
7. After the result is visible briefly, the view returns to the normal simulator form.

## Architecture

Keep the change inside `client/src/fco/views/UpgradeView.jsx` and the existing FCO stylesheet.

- Reuse the existing `animStatus` state values: `idle`, `running`, `success`, and `fail`.
- Treat `animStatus !== 'idle'` as the signal to render the sequence screen instead of the normal simulator form.
- Keep the current upgrade math and random result behavior in `upgradeHelpers.js` unchanged.
- Do not introduce a new route or page-level navigation.
- Do not split a new component unless the JSX becomes hard to read during implementation.

## Sequence screen layout

The sequence screen replaces the simulator content area and should feel like a dedicated upgrade moment, not a small inline status badge.

It should include:

- Main player visual/name/season/OVR.
- Attempt label: `+current → +next`.
- A central animation zone with state-specific styling.
- Running copy: `Đang nâng cấp...`.
- Success copy: `Thành công`.
- Failure copy: `Thất bại`.
- Optional supporting stats such as current gauge percent or success rate if they fit cleanly.

## Timing

- Running phase: 1 second.
- Result phase: approximately 1.5–2 seconds before returning to the form.
- Inputs remain unavailable while the sequence screen is active because the form is not rendered.

## Error handling and boundaries

The upgrade button keeps the existing `canUpgrade` guard. If the user cannot upgrade, no sequence screen starts.

Timers should be cleared before starting a new sequence so repeated clicks or quick state changes do not leave stale timeouts. The existing `cancelRef` pattern can continue to own this.

## Testing

Manual verification should cover:

- Selecting a player and starting an upgrade replaces the form with the sequence screen.
- The running screen lasts about 1 second.
- Success shows the success state and increments the level.
- Failure shows the failure state.
- Failure with protection disabled decrements the level according to the current rules.
- The simulator form returns after the result phase.

Automated tests are optional for this UI-only timing change unless existing tests fail or implementation touches helper logic.