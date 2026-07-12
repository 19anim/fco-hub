# Squad Workbench Redesign Design

## Goal

Redesign the Squad page around a FIFAAddict-native squadmaker workbench instead of a generic modern dashboard. The page should feel like a dense FCOnline utility: pitch-first, asset-driven, compact, and built for repeated squad editing.

## Non-goals

- Do not redesign every FCO page uniformly.
- Do not create a SaaS-style hero/card dashboard.
- Do not add decorative glow, loud gradients, or invented visual effects.
- Do not replace the current pitch/card asset system.

## Visual direction

The Squad page should use a functional game-utility language:

- compact control density
- dark mechanical panels
- thinner separators
- smaller labels
- lower-radius panel geometry
- no marketing-style page header
- no generic metric cards
- accents tied to function: team color type, salary warning, selected slot, upgrade grade

Authentic game/community assets should carry the page identity: pitch image, player cards, season badges, club/team-color icons, and upgrade badges.

## Layout

Replace the current vertical stack with a workbench layout:

1. Compact command bar
   - formation selector
   - salary cap display/edit
   - team grade selector
   - no new save/share/reset actions in the first pass; only relocate controls that already exist

2. Pitch-connected team-color strip
   - `PitchTeamColorList` stays visually fused to the pitch.
   - The strip should read like a utility overlay, not a separate card section.

3. Main workbench grid
   - Primary column: pitch and squad slots/cards.
   - Right rail: roster/editor information.

4. Right rail contents
   - starters table
   - position labels
   - OVR or line contribution
   - salary
   - upgrade level
   - empty slot affordances
   - selected slot or team-color detail when relevant

## Current component impact

The first implementation should focus on `SquadView` and existing Squad components:

- Move the current page heading out of the main visual hierarchy.
- Move salary cap and team grade into the command/workbench control area.
- Keep OVR line averages but render them as compact HUD indicators rather than large summary cards.
- Keep the pitch/card system intact.
- Keep the existing right rail pattern in `SquadPitchEditor`, but make it feel like a first-class editor panel instead of an ad/secondary rail.
- Reuse existing data helpers and live team-color evaluation.

## Interaction rules

- Preserve current drag/drop squad editing behavior.
- Preserve salary cap editing.
- Preserve team grade selection.
- Preserve team-color focus interactions.
- Keep touch targets usable; compact does not mean tiny.
- Do not rely on hover-only controls for critical actions.

## Responsive behavior

Desktop should prioritize a pitch + rail workbench.

On narrower screens:

- stack the rail below the pitch if needed
- keep the command bar horizontally compact and wrapping
- keep the pitch visible before dense roster details
- avoid horizontal page scroll

## Testing and verification

After implementation:

- run the app
- open the Squad page in browser
- verify the pitch is visible quickly and remains usable
- edit salary cap
- change team grade
- add or interact with a squad slot
- verify team-color strip/focus still works
- check desktop and a narrow viewport
