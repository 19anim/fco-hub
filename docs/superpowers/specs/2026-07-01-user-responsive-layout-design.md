# User responsive layout design

## Scope

Improve the user-facing responsive layout first, with priority order:

1. Player list / database
2. Player detail
3. Videos

Admin screens are out of scope for this pass. The goal is balanced support for mobile, tablet, and desktop, using a progressive disclosure model similar to FIFAAddict's mobile behavior: keep the most useful information visible on small screens and hide or defer secondary data until there is enough width.

## Approach

Use a responsive hierarchy pass rather than a CSS-only patch or a full redesign. The implementation should preserve the current dark FCO visual language and existing data flow, while making the layout structure adapt intentionally at each breakpoint.

Target breakpoints:

- Mobile: below 640px
- Tablet: 640px to 1024px
- Desktop: above 1024px

These do not need to be hard-coded everywhere, but the UI should behave consistently around those ranges.

## Player list / database

### Mobile

The player list should stop behaving like a wide table. Each player should render as a compact row/card with:

- Avatar, player name, season, and primary position as the main identity block
- OVR as the strongest numeric value, visually easy to scan
- Price, salary, weak foot, skill moves, and work rate as compact secondary metadata when available
- Watch action and navigation affordance still reachable without crowding the row

The six-stat strip, row header, trust/admin-only data, and other secondary columns should be hidden on mobile. The list must not require horizontal scrolling on mobile.

### Tablet

Tablet can keep the row/list structure while showing more supporting data:

- OVR
- Price and salary
- A shortened stat summary when space allows
- Active chips and pagination without wrapping into cramped controls

### Desktop

Desktop should keep the richer data layout currently available:

- Row header
- Stat strip
- Price and salary
- Watch action
- Full pagination controls

### Filters

On mobile, search and the most common filters should be easiest to reach:

- Search
- Position
- Season
- Active filter chips

Advanced filters should stack cleanly or live behind the existing expanded filter area. Filter controls should wrap without creating tiny touch targets.

## Player detail

### Mobile

The detail hero should become a vertical card:

- Season, player name, OVR, and positions stay at the top
- Player art scales down so it does not push important content too far down
- Watch and compare actions can wrap into a compact action row
- Upgrade controls stack vertically
- Monetization/sidebar content moves below the main content instead of sitting beside it

Main stats remain visible, but detailed attributes should reduce to one readable column. Position rating tabs can scroll horizontally if needed.

### Tablet

Tablet may use a two-column hero when there is enough room, but should stack controls before they become cramped. Stats and related sections should use two-column layouts where readable.

### Desktop

Desktop keeps the current left/right detail grid and richer hero layout, with spacing aligned to the player list scale.

### Related versions

Related player versions should use:

- 1 column on mobile
- 2 columns on tablet
- 4 columns on desktop

## Videos

### Mobile

Videos should use a single-column layout:

- Header and search are full-width
- Video cards take the full container width
- Affiliate/sidebar content becomes a normal section below or after the main video list
- Top and bottom monetization bands must not create overflow

### Tablet

The video grid can use one or two columns depending on available width. Affiliate content should avoid taking a narrow sticky sidebar; a below-content grid is preferable until desktop width is available.

### Desktop

Desktop can keep the content-plus-sidebar layout, but the sidebar should only appear when there is enough space. Otherwise it should fall below the main content.

## Shared responsive rules

- Avoid horizontal scrolling for primary content on mobile.
- Prefer hiding secondary data over shrinking text below readable sizes.
- Keep touch targets comfortable on mobile.
- Use the same spacing scale across Player list, Player detail, and Videos.
- Preserve existing routes, data fetching, and user interactions.
- Do not refactor admin screens as part of this pass.

## Testing and verification

Verify the responsive behavior in a browser at representative widths:

- 390px mobile
- 768px tablet
- 1280px desktop

Minimum manual checks:

- Player list loads, filters remain usable, rows do not overflow horizontally, pagination still works.
- Player detail hero, stats, upgrade controls, related versions, and sidebar content stack correctly.
- Videos search, video grid, affiliate content, and monetization bands do not overflow.

Automated checks should cover existing tests affected by layout/component changes where practical, but visual verification in the browser is required before calling the implementation complete.
