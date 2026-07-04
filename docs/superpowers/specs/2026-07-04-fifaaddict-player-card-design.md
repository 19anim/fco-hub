# FIFAAddict-style shared player card design

## Goal

Implement a reusable FIFAAddict-style FCO player card system. The first consumer is the squadmaker pitch card, but the card background assets and renderer must be reusable by `/upgrade` and future player detail screens.

The squadmaker card should render the FIFAAddict-compatible structure after a player is added, including classes and elements such as `player-card has-player fc-card card-theme-*`, `card-bg-img fc-bg`, `card-ovr fc-ovr`, `card-pos-label fc-pos`, `fc-salary`, `card-player-media fc-player-media`, `fc-grade enchant_*`, `card-player-name fc-name-area`, `fc-name`, and `card-flags fc-flags`.

## Scope

In scope:

- Create a shared card-theme asset registry.
- Clone local card background assets for seasons/themes currently needed by the app.
- Add a reusable player card renderer with FIFAAddict-compatible classes.
- Use the new renderer in squadmaker pitch cards.
- Show hover actions on squad cards: edit and remove.
- Remove the old squad card move button and mini level control.
- Verify UI behavior in the running app.
- Report card-theme clone coverage after testing: cloned, fallback, and failed/missing themes compared with seasons present in the app.

Out of scope for this pass:

- Refactoring `/upgrade` or player detail to use the new card immediately.
- Cloning every possible FIFAAddict card theme globally.
- Building a new full player edit modal from scratch. If an edit modal already exists, `card-edit-btn` should open it; otherwise the button should be wired to a clearly named handler so the modal can be added in the next pass without changing card markup.
- Reworking team-color formulas or search modal behavior.

## Architecture

### Shared card theme registry

Add a shared registry, for example `client/src/fco/cardThemes.js`, that maps a season/theme key to the visual data needed by all card surfaces:

- `themeId`, used to build `card-theme-*`.
- `className`, for example `card-theme-865`.
- `backgroundImage`, pointing to a local cloned asset.
- Optional color metadata for text, ring, or fallback styling.
- Fallback metadata for themes that are not cloned yet.

The registry must not live inside `SquadView`. It is shared infrastructure for squadmaker, `/upgrade`, and player detail.

The lookup should prefer local assets. If no local asset exists, the card should fall back cleanly to the existing CSS/gradient style or a clearly marked temporary source. A missing clone must not break card rendering.

### Background clone process

Use FIFAAddict's rendered DOM as the source of truth for card backgrounds:

1. Choose one representative player for each season/theme that exists in the app data and needs a card background.
2. Add that player to FIFAAddict squadmaker.
3. Read the rendered card class, for example `player-card has-player fc-card card-theme-865`.
4. Read the background URL from `img.card-bg-img.fc-bg[src]`.
5. Download that image into a shared local asset folder, named by theme id, for example `card-theme-865.png`.
6. Add the theme entry to the shared registry.

This avoids guessing asset URLs or reverse-engineering the whole site. Clone only themes needed by current app data first. Future missing themes can be added by repeating the same representative-player process.

### Shared player card renderer

Add a reusable visual component, for example `FcoPlayerCard`, that renders FIFAAddict-compatible card markup but stays independent from `SquadView`.

It should accept prepared props such as:

- `player`
- `theme`
- `ovr`
- `pos`
- `salary`
- `grade` / `upgradeLevel`
- `flags`
- `variant`, for future sizes such as `squad`, `upgrade`, or `detail`

The component should render the known class structure:

```html
<div class="player-card has-player fc-card card-theme-865">
  <img class="card-bg-img fc-bg" />
  <span class="card-ovr fc-ovr">130</span>
  <span class="card-pos-label fc-pos">ST</span>
  <span class="fc-salary">27</span>
  <span class="card-player-media fc-player-media">...</span>
  <span class="fc-grade enchant_1">+1</span>
  <span class="card-player-name fc-name-area">
    <span class="fc-name">Ronaldo</span>
    <span class="card-flags fc-flags">...</span>
  </span>
</div>
```

Render only real data. If flags or icons are unavailable, keep the layout stable but do not invent fake flags.

### Squadmaker integration

`SquadView` should keep owning squad-specific state and calculations:

- slot position
- position-specific OVR
- upgrade/team-color bonus
- remove action
- edit action
- drag/drop behavior

The squad card wrapper should pass prepared values into the shared renderer. The shared renderer should not know how squad bonuses are computed.

Inside `.fco-squad-card`, hover/focus should reveal:

- `card-edit-btn`, which opens the player/card edit flow when wired.
- a small remove button beside it.

Remove from the squad card UI:

- the old `Đổi vị trí` button.
- the old `.fco-squad-cardlevel` mini `+/-` level control under the card.

The edit and remove controls should not be nested inside a clickable `<button>` card. Use valid HTML: either the visual card is not a button, or the action buttons live in the squad wrapper outside the card click target.

## Data flow

- Theme comes from the shared theme registry.
- OVR is calculated by the caller and displayed by the card.
- Position comes from the active slot and displays in `card-pos-label fc-pos`.
- Salary comes from `player.salary` and displays in `fc-salary` when available.
- Grade uses the current squad `upgradeLevel`, displayed as `fc-grade enchant_<level>` with text `+<level>`.
- Player media reuses the current player avatar/media source.
- Flags render only from available nation/club/season data.

## Error handling and fallback

- Missing local background: use fallback visual styling and include the theme in the post-test missing/fallback report.
- Missing salary: keep the `fc-salary` element for DOM consistency, but render it empty/visually hidden rather than inventing a `0` value.
- Missing flags: render no flag items.
- Missing theme id: use a neutral fallback class and background, and include it in the coverage report.

## Verification

Run the app and verify in the browser, not only through tests.

Checklist:

- Add a player to `/doi-hinh`.
- Confirm the card has `player-card has-player fc-card card-theme-*`.
- Confirm `img.card-bg-img.fc-bg[src]` points to a local asset for cloned themes.
- Confirm the card contains `card-ovr fc-ovr`, `card-pos-label fc-pos`, `fc-salary`, `card-player-media fc-player-media`, `fc-grade enchant_*`, `card-player-name fc-name-area`, `fc-name`, and `card-flags fc-flags`.
- Hover `.fco-squad-card` and confirm `card-edit-btn` plus the small remove button appear.
- Confirm the old move button is gone.
- Confirm `.fco-squad-cardlevel` is gone.
- Drag/change formation and confirm the card still shows correct position/OVR.
- Check network/devtools and confirm cloned backgrounds load locally.
- Produce a theme coverage summary after testing:
  - themes cloned successfully
  - seasons/themes using fallback
  - seasons/themes that could not be cloned, with the reason when known

## Implementation notes

Prefer small, reusable files over expanding `SquadView`. Existing card visuals in `PlayerCardMini` can be migrated into or wrapped around the new shared renderer, but the final direction should be a shared card primitive rather than a squad-only component.
