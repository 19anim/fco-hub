# Training OVR UI redesign

## Goal

Make the FCO Training OVR tab feel substantial and impressive without looking over-produced. The new UI should read as a useful coach dashboard: larger, clearer, and more motivating than the current small summary row and plain table.

## Scope

Change only the presentation and local component structure of the Training OVR tab in the player detail view.

In scope:

- Replace the small summary row with a larger training dashboard header.
- Improve the stat training rows so selected stats and training progress are easier to scan.
- Keep the existing training limits: maximum 5 trained stats, maximum +2 per stat.
- Keep reset behavior and reset-on-position-change behavior.
- Verify desktop and mobile layout manually.

Out of scope:

- Changing the OVR calculation formula.
- Changing position coefficient config.
- Changing the tab system or player detail data model.
- Adding dramatic neon/glow effects.

## Visual design

The tab starts with a compact dashboard card using existing surfaces and tokens. It should feel bigger through hierarchy and spacing, not through heavy effects.

Header structure:

- Left: training label, selected position, and helper text: maximum 5 stats, each stat up to +2.
- Center: large OVR before-to-after lockup. The after value is emphasized when training changes the result.
- Right: gained OVR badge and selected-stat counter.
- Reset action sits in the dashboard header so users can find it quickly.

Visual tone:

- Use existing `var(--surface-2)`, `var(--border-soft)`, `var(--accent)`, and text tokens.
- Use a subtle accent border or top line only.
- Avoid strong glow, loud gradients, or effects that make the UI feel AI-generated.

## Interaction design

Below the dashboard, show training rows as a clearer list/table hybrid.

Each stat row includes:

- Stat name.
- Coefficient or impact weight.
- Current stat value.
- Current training points: `0`, `+1`, or `+2`.
- `−` and `+` controls.

Rows with training points should receive a very subtle selected state using background or border color. Disabled controls should remain visibly disabled.

The dashboard includes five training slots. Empty slots show a neutral placeholder. Filled slots show the selected stat name and points. This makes the 5-stat limit visible without requiring users to infer it from disabled buttons.

## Component approach

Keep the work local to `TrainingOvrTab` unless the implementation becomes difficult to read.

Recommended local helpers:

- Build selected training entries from the `training` state.
- Derive selected slot display data from those entries.
- Derive base stat values from the existing `byKey` map.

No new data files are needed. Existing calculation helpers in `trainingOvrConfig.js` remain unchanged.

## Testing

Automated checks:

- Existing training config tests must still pass.
- Any affected detail view tests must still pass.

Manual browser checks:

- Open a player detail page.
- Select a non-OVR position to show the Training OVR tab.
- Add one point to a stat and verify the dashboard updates.
- Add two points to one stat and verify the row and slot state.
- Fill five stats and verify additional stats cannot be added until points are removed.
- Reset and verify all slots and OVR values return to the initial state.
- Change position and verify training state resets.
- Check the layout on desktop and narrow/mobile width.
