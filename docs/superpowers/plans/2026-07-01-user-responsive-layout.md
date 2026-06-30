# User Responsive Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the user-facing Player list, Player detail, and Videos responsive layouts across mobile, tablet, and desktop.

**Architecture:** Keep the existing FCO React components and data flow, then add a responsive hierarchy pass in `fco.css` plus targeted JSX structure changes where CSS alone cannot express the mobile information hierarchy. Player list becomes compact and non-table-like on mobile; Detail stacks hero/sidebar content; Videos collapses sidebar content below the main feed until desktop width.

**Tech Stack:** React 19, Vite, Vitest/node:test, CSS media queries, Playwright MCP for browser verification.

## Global Constraints

- User-facing screens only: Player list / database, Player detail, and Videos.
- Admin screens are out of scope for this pass.
- Priority order is Player list / database, Player detail, then Videos.
- Mobile target is below 640px.
- Tablet target is 640px to 1024px.
- Desktop target is above 1024px.
- Avoid horizontal scrolling for primary content on mobile.
- Prefer hiding secondary data over shrinking text below readable sizes.
- Preserve existing routes, data fetching, and user interactions.
- Verify responsive behavior in browser at 390px, 768px, and 1280px.
- Use `rtk` prefix for every shell command.
- Do not commit during execution unless the user explicitly authorizes commits for this work.

---

## File Structure

- Modify `client/src/fco/fco.css`
  - Owns all responsive layout rules for the FCO user-facing app.
  - Add mobile/tablet/desktop rules for database rows, detail hero/grid, videos layout, shared spacing, and no-overflow safeguards.

- Modify `client/src/fco/views/DatabaseView.jsx`
  - Owns active Player list rendering.
  - Adjust `PlayerRow` markup so mobile can show a compact identity block, OVR block, and secondary metadata without relying on hidden table-style columns.

- Modify `client/src/fco/views/DetailView.jsx`
  - Owns Player detail layout.
  - Add class names around the top actions and monetization/sidebar blocks so CSS can stack them predictably.

- Modify `client/src/fco/views/VideosView.jsx`
  - Owns Videos page layout.
  - Keep data fetching unchanged; add class names only if needed to make affiliate content collapse below the main video grid.

- Test/verification files:
  - No new automated test file is required for CSS-only behavior.
  - Existing affected tests should remain passing: `client/src/fco/views/DatabaseView.filters.test.js`, `client/src/utils/backendSearch.test.js`, and `client/src/hooks/useDebouncedValue.test.jsx` if present in the working tree.

---

### Task 1: Add shared responsive guardrails in FCO CSS

**Files:**
- Modify: `client/src/fco/fco.css`

**Interfaces:**
- Produces: consistent mobile/tablet spacing and no-overflow defaults used by later tasks.
- Consumes: existing CSS variables in `:root` and existing `.fco-main`, `.fco-nav`, `.fco-panel`, `.fa-search-row`, `.fa-form-panel` classes.

- [ ] **Step 1: Inspect current responsive CSS anchors**

Run from repo root:

```bash
rtk grep "@media (max-width" client/src/fco/fco.css
```

Expected: output includes existing responsive blocks around `1120px`, `760px`, `600px`, and `560px`.

- [ ] **Step 2: Add shared mobile/tablet guardrails**

Append this block near the existing `/* ===== Responsive ===== */` section in `client/src/fco/fco.css`, before the current `@media (max-width: 1120px)` block so later rules can still override it when needed:

```css
@media (max-width: 1024px) {
  .fco-main {
    max-width: 100%;
  }

  .fco-panel,
  .fa-form-panel,
  .fco-season-ext-list,
  .fco-pos-container {
    border-radius: 12px;
  }
}

@media (max-width: 640px) {
  html,
  body,
  #root {
    overflow-x: hidden;
  }

  .fco-main {
    padding: 14px 10px 64px;
  }

  .fco-nav {
    height: 54px;
    padding: 0 10px;
  }

  .fco-navitems {
    flex: 1;
  }

  .fco-panel-head {
    min-height: 42px;
    padding: 0 12px;
  }

  .fco-panel-body {
    padding: 12px;
  }

  .fa-form-panel,
  .fco-season-ext-list,
  .fco-pos-container {
    padding: 12px;
  }

  .fa-search-row,
  .fco-toolbar,
  .fco-resultbar,
  .fco-pager {
    align-items: stretch;
  }

  .fa-search-row {
    flex-direction: column;
  }

  .fa-search-row .fa-btn,
  .fco-pager .fco-iconbtn {
    min-height: 40px;
  }

  .fco-resultbar {
    gap: 8px;
  }

  .fco-resultcount {
    white-space: normal;
  }
}
```

- [ ] **Step 3: Run focused tests before page-specific work**

Run from `client`:

```bash
rtk npm test -- src/fco/views/DatabaseView.filters.test.js
```

Expected: PASS. CSS changes should not affect this logic test.

- [ ] **Step 4: Browser smoke check shared shell**

Start the app if it is not already running.

Run from `client`:

```bash
rtk npm run dev
```

Open the app at the local Vite URL and resize to 390px width.

Expected:

- The nav remains usable.
- The page does not create document-level horizontal scrolling.
- Main page padding is tighter but not flush against the viewport.

- [ ] **Step 5: Commit gate**

If the user has authorized commits, commit only this task:

```bash
rtk git add client/src/fco/fco.css && rtk git commit -m "style: add user responsive layout guardrails"
```

If commits are not authorized, skip this step and keep the changes unstaged.

---

### Task 2: Make Player list mobile-first without horizontal scrolling

**Files:**
- Modify: `client/src/fco/views/DatabaseView.jsx`
- Modify: `client/src/fco/fco.css`

**Interfaces:**
- Consumes: existing `PlayerRow({ player, isAdmin, watched, onToggleWatch, onClick })` props.
- Produces: `.fco-row-core`, `.fco-row-mainline`, `.fco-row-ovr-mobile`, and `.fco-row-secondary` structure used by CSS.

- [ ] **Step 1: Update `PlayerRow` markup**

In `client/src/fco/views/DatabaseView.jsx`, replace the contents of `<a className="fco-row-link" ...>` in `PlayerRow` with this structure. Keep `href`, `onClick`, and surrounding `button.fco-star` unchanged:

```jsx
        <div className="fco-row-core">
          <PlayerAvatar player={p} size={40} />

          <div className="fco-row-player">
            <div className="fco-row-mainline">
              <div className="fco-row-name">
                {cleanName(p.name)}
                {isAdmin && p.koreanRaw && <span className="fco-kr-flag">KR</span>}
              </div>
              <div className="fco-row-ovr-mobile">
                <OvrBox value={p.ovr} pos={p.primaryPos} size="sm" />
              </div>
            </div>
            <div className="fco-row-sub">
              <SeasonChip code={p.season} name={p.seasonName} img={p.seasonImg} />
              <PosPill pos={p.primaryPos} />
              {p.positions?.slice(1, 3).map(pos => (
                <PosPill key={pos} pos={pos} faded />
              ))}
              {p.club && <span className="fco-row-club">{p.club}</span>}
            </div>
            <div className="fco-row-meta-inline">
              <span className="fco-mini-badge wf">
                {p.foot === 'left' ? '5' : p._raw?.enrichment?.weakFoot || '?'}/{p.foot === 'right' ? '5' : p._raw?.enrichment?.weakFoot || '?'}
              </span>
              <span className="fco-mini-badge sm">
                {p.skillMoves}★
              </span>
              <span className="fco-mini-badge wr">
                {p.workRateAttack}/{p.workRateDefense}
              </span>
            </div>
            <div className="fco-row-secondary">
              <span>{p.price ? formatCoins(p.price) : '—'}</span>
              <span>{p.salary ? `Lương ${p.salary}` : 'Lương —'}</span>
            </div>
          </div>
        </div>

        <div className="fco-hide-sm" style={{ width: 56 }}>
          <OvrBox value={p.ovr} pos={p.primaryPos} size="sm" />
        </div>

        {isAdmin && (
          <div className="fco-hide-md" style={{ width: 96 }}>
            <TrustBadge id={p.trust} variant="soft" size="sm" />
          </div>
        )}

        <div className="fco-hide-md fco-statstrip" style={{ width: 220 }}>
          {MAIN_STATS.map(s => {
            const v = p[s.key];
            const c = v != null && v > 0 ? statColor(v) : 'var(--text-faint)';
            return (
              <div key={s.key} className="fco-statcell">
                <div className="fco-statcell-lab">{s.label}</div>
                <div className="fco-statcell-val" style={{ color: c }}>
                  {v != null && v > 0 ? v : '—'}
                </div>
                <div className="fco-minibar">
                  {v != null && v > 0 &&
                    <div style={{ width: `${Math.min(100, v)}%`, height: '100%', background: c, borderRadius: 99 }} />}
                </div>
              </div>
            );
          })}
        </div>

        <div className="fco-hide-sm fco-num" style={{ width: 80, textAlign: 'right', color: p.price ? 'var(--text)' : 'var(--text-faint)' }}>
          {p.price ? formatCoins(p.price) : '—'}
        </div>
        <div className="fco-hide-sm fco-num" style={{ width: 80, textAlign: 'right', color: p.salary ? 'var(--text)' : 'var(--text-faint)' }}>
          {p.salary ? `${p.salary}` : '—'}
        </div>

        <I.ChevronRight size={16} className="fco-row-chevron" />
```

Expected: behavior remains identical, but mobile-specific blocks now exist for CSS.

- [ ] **Step 2: Add Player list responsive CSS**

In `client/src/fco/fco.css`, add these rules near the existing Player Row Details section:

```css
.fco-row-core {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 0;
}

.fco-row-mainline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}

.fco-row-ovr-mobile,
.fco-row-secondary {
  display: none;
}

.fco-row-chevron {
  color: var(--text-faint);
  flex: 0 0 16px;
}

@media (max-width: 1024px) {
  .fco-rowhead {
    gap: 10px;
  }

  .fco-row,
  .fco-row-link {
    gap: 10px;
  }
}

@media (max-width: 640px) {
  .fco-rowhead {
    display: none;
  }

  .fco-rows {
    gap: 8px;
  }

  .fco-row {
    position: relative;
    align-items: stretch;
    gap: 8px;
    padding: 10px;
    border: 1px solid var(--border-soft);
    border-radius: 12px;
    background: var(--surface);
  }

  .fco-row:hover,
  .fco-row:focus-within {
    background: var(--surface-2);
  }

  .fco-row-link {
    align-items: stretch;
    gap: 8px;
  }

  .fco-row-core {
    align-items: flex-start;
    gap: 10px;
    min-width: 0;
  }

  .fco-row-player {
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    min-width: 0;
  }

  .fco-row-name {
    font-size: 13.5px;
    line-height: 1.25;
  }

  .fco-row-sub {
    display: flex;
    align-items: center;
    gap: 5px;
    flex-wrap: wrap;
    white-space: normal;
    overflow: visible;
  }

  .fco-row-meta-inline {
    gap: 5px;
    flex-wrap: wrap;
    margin-top: 1px;
  }

  .fco-row-ovr-mobile {
    display: block;
    flex: 0 0 auto;
  }

  .fco-row-secondary {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    color: var(--text-dim);
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 750;
  }

  .fco-row-secondary span {
    display: inline-flex;
    align-items: center;
    min-height: 20px;
    padding: 2px 6px;
    border: 1px solid var(--border-soft);
    border-radius: 6px;
    background: rgba(10,12,16,.3);
  }

  .fco-star {
    width: 34px;
    height: 34px;
    flex-basis: 34px;
  }

  .fco-row-chevron {
    align-self: center;
  }
}
```

- [ ] **Step 3: Run focused tests**

Run from `client`:

```bash
rtk npm test -- src/fco/views/DatabaseView.filters.test.js
```

Expected: PASS.

- [ ] **Step 4: Browser verify Player list at 390px**

Open the Database/Player list route in the browser at 390px width.

Expected:

- No horizontal page scroll.
- Row header is hidden.
- Each player appears as a compact card/row.
- Avatar, name, season, position, OVR, price/salary, weak foot, skill, and work rate are readable.
- Stat strip and desktop-only price/salary columns are hidden.
- Watch star remains clickable.
- Clicking a row still opens Player detail.

- [ ] **Step 5: Browser verify Player list at 768px and 1280px**

Resize to 768px.

Expected:

- Row layout remains compact but less crowded.
- Price/salary and OVR are visible without overlap.
- Filters wrap cleanly.

Resize to 1280px.

Expected:

- Desktop row header and stat strip are visible.
- Existing pagination still works.

- [ ] **Step 6: Commit gate**

If the user has authorized commits, commit only this task:

```bash
rtk git add client/src/fco/views/DatabaseView.jsx client/src/fco/fco.css && rtk git commit -m "style: make player list responsive"
```

If commits are not authorized, skip this step and keep the changes unstaged.

---

### Task 3: Make Player list filters and pagination easier on mobile

**Files:**
- Modify: `client/src/fco/fco.css`

**Interfaces:**
- Consumes: existing `PlayerSearchForm`, `.fa-form-panel`, `.fco-filterbar`, `.fco-season-ext-list`, `.fco-seasons-grid`, `.fco-chips`, `.fco-pager` markup.
- Produces: stacked, touch-friendly mobile filter and pagination layout.

- [ ] **Step 1: Add mobile filter CSS**

In `client/src/fco/fco.css`, add this block near the existing filter CSS:

```css
@media (max-width: 640px) {
  .fco-filterbar {
    gap: 8px !important;
    padding-bottom: 10px;
  }

  .fco-filter-divider {
    display: none;
  }

  .fco-filterbtn,
  .fco-clearall,
  .fco-chip {
    min-height: 34px;
  }

  .fco-season-ext-list {
    gap: 8px;
  }

  .fco-seasons-grid {
    grid-template-columns: repeat(auto-fill, minmax(38px, 1fr));
    gap: 5px;
  }

  .fco-season-opt-img {
    max-width: 36px;
    height: 20px;
  }

  .fco-chips {
    width: 100%;
    gap: 6px;
  }

  .fco-pager {
    padding-top: 12px;
  }

  .fco-pager-info {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .fco-pagesize {
    margin-right: 0;
  }
}
```

- [ ] **Step 2: Run focused tests**

Run from `client`:

```bash
rtk npm test -- src/fco/views/DatabaseView.filters.test.js
```

Expected: PASS.

- [ ] **Step 3: Browser verify filters at 390px**

At the Database/Player list route, resize to 390px.

Expected:

- Search row stacks without overflow.
- Season grid buttons remain tappable.
- Filter buttons wrap, not squeeze.
- Active chips wrap below result count.
- Pagination controls do not overlap or overflow.

- [ ] **Step 4: Commit gate**

If the user has authorized commits, commit only this task:

```bash
rtk git add client/src/fco/fco.css && rtk git commit -m "style: improve mobile player filters"
```

If commits are not authorized, skip this step and keep the changes unstaged.

---

### Task 4: Make Player detail hero and actions stack cleanly

**Files:**
- Modify: `client/src/fco/views/DetailView.jsx`
- Modify: `client/src/fco/fco.css`

**Interfaces:**
- Consumes: existing DetailView state and actions: `onBack`, `onToggleWatch`, `onCompare`.
- Produces: `.fco-detail-actions` class for responsive top actions.

- [ ] **Step 1: Add semantic class to detail top actions**

In `client/src/fco/views/DetailView.jsx`, replace the inline action wrapper:

```jsx
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
```

with:

```jsx
        <div className="fco-detail-actions">
```

Keep the two `Button` children unchanged.

- [ ] **Step 2: Add detail hero responsive CSS**

In `client/src/fco/fco.css`, add these rules near the detail CSS section:

```css
.fco-detail-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

@media (max-width: 760px) {
  .fco-detail-top {
    align-items: flex-start;
    gap: 10px;
    flex-wrap: wrap;
  }

  .fco-detail-actions {
    width: 100%;
    margin-left: 0;
  }

  .fco-detail-actions .fco-btn {
    flex: 1 1 140px;
    justify-content: center;
  }

  .fa-detail-sheet {
    min-height: 0;
  }

  .fa-detail-hero {
    gap: 8px;
  }

  .fa-name-block {
    align-items: center;
    gap: 8px;
  }

  .fa-hero-ovr {
    font-size: 40px;
  }

  .fa-player-name {
    line-height: 1.05;
  }

  .fa-player-art {
    min-height: 132px;
    margin: -4px 0 -10px;
    justify-content: center;
  }

  .fa-player-art > * {
    max-width: 156px;
    max-height: 156px;
  }

  .fa-bio-grid {
    gap: 6px 8px;
  }

  .fa-economy-row span {
    flex: 1 1 auto;
    justify-content: center;
  }
}

@media (max-width: 560px) {
  .fco-detail-actions .fco-btn {
    flex-basis: 100%;
  }

  .fa-hero-ovr {
    font-size: 36px;
  }

  .fa-player-art > * {
    max-width: 136px;
    max-height: 136px;
  }
}
```

- [ ] **Step 3: Run focused tests**

Run from `client`:

```bash
rtk npm test -- src/fco/views/DatabaseView.filters.test.js
```

Expected: PASS.

- [ ] **Step 4: Browser verify Player detail hero**

Open a player detail route from the Player list.

At 390px width, expected:

- Back/breadcrumb/actions wrap without overlap.
- Hero reads top-down: season/name/OVR/positions, then scaled player art.
- Watch and Compare remain reachable.
- Upgrade summary remains within viewport width.

At 768px width, expected:

- Hero may use more horizontal space but does not crowd controls.

At 1280px width, expected:

- Desktop hero remains visually close to the previous layout.

- [ ] **Step 5: Commit gate**

If the user has authorized commits, commit only this task:

```bash
rtk git add client/src/fco/views/DetailView.jsx client/src/fco/fco.css && rtk git commit -m "style: improve responsive player detail hero"
```

If commits are not authorized, skip this step and keep the changes unstaged.

---

### Task 5: Make Player detail stats, related versions, and sidebar content responsive

**Files:**
- Modify: `client/src/fco/fco.css`

**Interfaces:**
- Consumes: existing `.fco-detail-grid`, `.fco-detail-left`, `.fco-detail-right`, `.fa-position-row`, `.fa-attribute-grid`, `.fco-relgrid`, `.fa-upgrade-controls` classes.
- Produces: one-column readable stats on mobile, sidebar content below main content, and related versions at 1/2/4 columns.

- [ ] **Step 1: Add detail content responsive CSS**

In `client/src/fco/fco.css`, add this block near the detail responsive rules:

```css
@media (max-width: 1024px) {
  .fco-detail-grid {
    grid-template-columns: 1fr;
  }

  .fco-detail-right {
    order: 2;
  }
}

@media (max-width: 760px) {
  .fa-upgrade-controls {
    grid-template-columns: 1fr;
  }

  .fa-perform-list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .fa-perform-list li {
    height: 48px;
  }

  .fa-position-row {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .fa-position-rating {
    flex: 0 0 58px;
  }

  .fa-detail-attrwrap {
    padding: 8px;
  }

  .fco-relgrid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 761px) and (max-width: 1120px) {
  .fco-relgrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
```

Keep the existing `.fa-attribute-grid { column-count: 1; }` behavior at `max-width: 560px`; do not remove it.

- [ ] **Step 2: Run focused tests**

Run from `client`:

```bash
rtk npm test -- src/fco/views/DatabaseView.filters.test.js
```

Expected: PASS.

- [ ] **Step 3: Browser verify Player detail content**

At 390px width, expected:

- Main stats are visible in a readable grid.
- Position tabs scroll horizontally only within the tabs strip, not the whole page.
- Detailed attributes are one readable column.
- Monetization/sidebar content appears below main detail content.
- Related versions render as one column.

At 768px width, expected:

- Related versions render as two columns.
- Detail sections do not overflow.

At 1280px width, expected:

- Detail left/right grid is restored.
- Related versions can render four columns.

- [ ] **Step 4: Commit gate**

If the user has authorized commits, commit only this task:

```bash
rtk git add client/src/fco/fco.css && rtk git commit -m "style: improve responsive player detail content"
```

If commits are not authorized, skip this step and keep the changes unstaged.

---

### Task 6: Make Videos layout collapse gracefully from desktop sidebar to mobile feed

**Files:**
- Modify: `client/src/fco/views/VideosView.jsx`
- Modify: `client/src/fco/fco.css`

**Interfaces:**
- Consumes: existing `videoItems`, `affItems`, `MonetizationSlot`, `YouTubeCard`, and `AffiliateCtaCard` behavior.
- Produces: `.fco-videos-aff-grid` wrapper for affiliate cards so CSS can display them as below-feed content on non-desktop widths.

- [ ] **Step 1: Add affiliate grid wrapper**

In `client/src/fco/views/VideosView.jsx`, replace this part inside the affiliate sidebar:

```jsx
            {affItems.map((item) => (
              <AffiliateCtaCard key={item._id} item={item} placement="videos_aff" />
            ))}
```

with:

```jsx
            <div className="fco-videos-aff-grid">
              {affItems.map((item) => (
                <AffiliateCtaCard key={item._id} item={item} placement="videos_aff" />
              ))}
            </div>
```

Do not change the data fetching or `placement` values.

- [ ] **Step 2: Add Videos responsive CSS**

In `client/src/fco/fco.css`, replace the current Videos breakpoint rules:

```css
@media (max-width: 1024px) {
  .fco-videos-layout { grid-template-columns: 1fr 240px; gap: 18px; }
}
@media (max-width: 800px) {
  .fco-videos-layout { grid-template-columns: 1fr; }
  .fco-videos-sidebar { position: static; }
  .fco-video-grid.fco-video-grid--2col { grid-template-columns: 1fr; }
}
```

with:

```css
.fco-videos-aff-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

@media (max-width: 1120px) {
  .fco-videos-layout {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .fco-videos-sidebar {
    position: static;
  }

  .fco-videos-aff-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }
}

@media (max-width: 760px) {
  .fco-videos-search {
    max-width: none;
    width: 100%;
  }

  .fco-video-grid,
  .fco-video-grid.fco-video-grid--2col {
    grid-template-columns: 1fr;
  }

  .fco-video-card {
    padding: 12px;
  }

  .fco-video-card-head {
    gap: 10px;
  }

  .fco-video-play {
    width: 40px;
    height: 40px;
    flex-basis: 40px;
  }

  .fco-videos-aff-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Run focused tests**

Run from `client`:

```bash
rtk npm test -- src/fco/views/DatabaseView.filters.test.js
```

Expected: PASS.

- [ ] **Step 4: Browser verify Videos**

Open the Videos route.

At 390px width, expected:

- Header/search is full width.
- Video cards are one column.
- Affiliate content appears below the main video area, not as a sticky narrow sidebar.
- Top and bottom monetization bands do not overflow.

At 768px width, expected:

- Main content is readable in one column.
- Affiliate cards can form a below-content grid if multiple exist.

At 1280px width, expected:

- Content-plus-sidebar desktop layout is restored.

- [ ] **Step 5: Commit gate**

If the user has authorized commits, commit only this task:

```bash
rtk git add client/src/fco/views/VideosView.jsx client/src/fco/fco.css && rtk git commit -m "style: make videos layout responsive"
```

If commits are not authorized, skip this step and keep the changes unstaged.

---

### Task 7: Final responsive verification and cleanup

**Files:**
- Modify only files from earlier tasks if verification finds a responsive bug.

**Interfaces:**
- Consumes: all previous task outputs.
- Produces: verified user-facing responsive behavior for Player list, Player detail, and Videos.

- [ ] **Step 1: Run focused client tests**

Run from `client`:

```bash
rtk npm test -- src/fco/views/DatabaseView.filters.test.js src/utils/backendSearch.test.js src/hooks/useDebouncedValue.test.jsx
```

Expected: PASS. If `src/utils/backendSearch.test.js` or `src/hooks/useDebouncedValue.test.jsx` do not exist in the final working tree, run only:

```bash
rtk npm test -- src/fco/views/DatabaseView.filters.test.js
```

Expected: PASS.

- [ ] **Step 2: Run lint and build**

Run from `client`:

```bash
rtk npm run lint && rtk npm run build
```

Expected: PASS.

- [ ] **Step 3: Start the app for browser verification**

Run from `client`:

```bash
rtk npm run dev
```

Expected: Vite starts and prints a local URL.

- [ ] **Step 4: Verify Player list at required widths**

Use browser viewport widths 390px, 768px, and 1280px.

Expected at 390px:

- No horizontal page scroll.
- Player rows are compact cards.
- Search, common filters, chips, and pagination are usable.
- Row click and watch star still work.

Expected at 768px:

- Rows and filters use available width without cramped controls.
- No primary content overflow.

Expected at 1280px:

- Desktop row header, stat strip, price/salary, and pagination remain available.

- [ ] **Step 5: Verify Player detail at required widths**

Use browser viewport widths 390px, 768px, and 1280px.

Expected at 390px:

- Hero stacks vertically.
- Player art is scaled down.
- Watch/Compare actions wrap and remain clickable.
- Upgrade controls stack.
- Sidebar/monetization content appears below main content.
- Related versions are one column.

Expected at 768px:

- Content remains readable without whole-page horizontal scroll.
- Related versions are two columns when there is room.

Expected at 1280px:

- Desktop left/right detail grid remains available.

- [ ] **Step 6: Verify Videos at required widths**

Use browser viewport widths 390px, 768px, and 1280px.

Expected at 390px:

- Search is full width.
- Video cards are one column.
- Affiliate content is below the main feed.
- Monetization bands do not overflow.

Expected at 768px:

- Content remains one readable column or a non-cramped below-content affiliate grid.

Expected at 1280px:

- Sidebar layout returns only when enough width is available.

- [ ] **Step 7: Inspect final diff**

Run from repo root:

```bash
rtk git diff -- client/src/fco/views/DatabaseView.jsx client/src/fco/views/DetailView.jsx client/src/fco/views/VideosView.jsx client/src/fco/fco.css docs/superpowers/specs/2026-07-01-user-responsive-layout-design.md docs/superpowers/plans/2026-07-01-user-responsive-layout.md
```

Expected:

- Diff contains only user-facing responsive layout changes and the approved spec/plan docs.
- No admin JSX/CSS changes are included.
- No data fetching behavior changed.

- [ ] **Step 8: Commit gate**

If the user has authorized commits, commit final verification fixes and docs:

```bash
rtk git add client/src/fco/views/DatabaseView.jsx client/src/fco/views/DetailView.jsx client/src/fco/views/VideosView.jsx client/src/fco/fco.css docs/superpowers/specs/2026-07-01-user-responsive-layout-design.md docs/superpowers/plans/2026-07-01-user-responsive-layout.md && rtk git commit -m "style: improve user responsive layouts"
```

If commits are not authorized, skip this step and report the changed files.

---

## Self-Review

- Spec coverage: Player list/database, Player detail, Videos, mobile/tablet/desktop breakpoints, no mobile horizontal scrolling, hidden secondary mobile data, touch-friendly filters, preserved routes/data fetching, and browser verification at 390px/768px/1280px are covered.
- Placeholder scan: no `TBD`, `TODO`, or vague implementation placeholders remain. Each code-changing step contains exact CSS or JSX replacements.
- Type consistency: new class names introduced by JSX tasks match the CSS selectors in later steps: `.fco-row-core`, `.fco-row-mainline`, `.fco-row-ovr-mobile`, `.fco-row-secondary`, `.fco-detail-actions`, and `.fco-videos-aff-grid`.
- Scope check: admin screens are explicitly excluded; `isAdmin` display condition inside `PlayerRow` is preserved only because the shared user/admin component already contains it.
