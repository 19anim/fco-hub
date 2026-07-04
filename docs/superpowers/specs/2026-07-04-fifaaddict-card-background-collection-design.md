# FIFAAddict card background collection design

## Goal

Clone local player-card background PNGs for every season exposed by the FIFAAddict squadmaker UI, then map app seasons to those local assets through the `LOCAL_CARD_THEMES` registry in `client/src/fco/cardThemes.js`.

This work is only about card background assets. It must not affect the admin `/admin/data-ops` "Scrape Seasons" UI/API flow.

## Scope

In scope:

- Use `https://fifaaddict.com/vn/fco-squadmaker/` season filter options as the source of truth for FIFAAddict seasons to crawl.
- Drive FIFAAddict squadmaker to select one representative player per FIFAAddict season.
- Read the rendered `card-theme-*` class and `img.card-bg-img.fc-bg[src]` from FIFAAddict's card DOM.
- Download each unique background PNG into `client/public/fco/card-themes/`.
- Update `client/src/fco/cardThemes.js` so `LOCAL_CARD_THEMES` maps each resolved app season to the correct local cloned asset.
- Produce a coverage report comparing FIFAAddict crawled seasons with app seasons.

Out of scope:

- Changing the admin data-ops "Scrape Seasons" button, UI, or API.
- Changing existing season-scraping endpoints or database update behavior.
- Guessing FIFAAddict asset URLs.
- Changing the card renderer layout or squad card behavior.
- Refactoring `/upgrade` or player detail screens.

## Data sources

The background collector starts from the FIFAAddict squadmaker UI, not the app's season scrape flow. It opens the squadmaker page and reads all season options from the search/filter UI, capturing the displayed label, season value, and season class when available.

The rendered FIFAAddict card is the source of truth for the actual background:

- `player-card has-player fc-card card-theme-*` gives the concrete theme id.
- `img.card-bg-img.fc-bg[src]` gives the concrete background PNG URL.

App season data is only used after collection to build a coverage report and determine which app season keys should be added to `LOCAL_CARD_THEMES`.

## Workflow

1. Open FIFAAddict squadmaker.
2. Read every season option available in the squadmaker season filter.
3. For each FIFAAddict season option, select the season and add a representative player to a squad card.
4. Inspect the rendered card and capture the `card-theme-*` class plus `img.card-bg-img.fc-bg[src]`.
5. Normalize the theme id, for example `card-theme-865` -> `865`.
6. Download the PNG to `client/public/fco/card-themes/card-theme-<themeId>.png` if it has not already been downloaded.
7. Reconcile the crawled FIFAAddict seasons with app seasons.
8. Generate a `LOCAL_CARD_THEMES` snippet for app season keys that can be matched to local assets.
9. Record unresolved or unmatched seasons explicitly in the coverage report.

## `LOCAL_CARD_THEMES` registry behavior

The registry is the JavaScript object in `client/src/fco/cardThemes.js` that maps an app season to a local background asset. The existing `865` mapping is the current example:

```js
const LOCAL_CARD_THEMES = {
  865: {
    themeId: '865',
    className: 'card-theme-865',
    backgroundImage: '/fco/card-themes/card-theme-865.png',
  },
};
```

After collection, additional app season keys should be added to this object. Multiple app seasons may point to the same PNG when FIFAAddict renders them with the same `card-theme-*`.

Local cloned assets remain preferred over any external season visual fallback. Unresolved seasons continue rendering through the existing fallback path and appear in the coverage report.

## Coverage report

The report should include:

- Total FIFAAddict squadmaker seasons discovered.
- FIFAAddict seasons whose background PNG was downloaded successfully.
- Unique downloaded theme PNGs.
- Shared theme mappings where multiple seasons use the same PNG.
- App seasons mapped to local assets through `LOCAL_CARD_THEMES`.
- App seasons that were not found or could not be queried from FIFAAddict.
- FIFAAddict seasons that have background assets but do not match an app season key.
- Crawl failures with concrete reasons.

## Error handling

- If the collector cannot read season options from FIFAAddict, fail the run with a clear error.
- If FIFAAddict search has no representative player for a season, mark that season unresolved with `no representative player`.
- If a player can be selected but no `card-theme-*` class appears, mark it unresolved with `missing rendered theme class`.
- If the card has a theme class but no background image URL, mark it unresolved with `missing card background image`.
- If a download fails, do not add a registry entry for that season; record the HTTP or filesystem failure.

## Verification

Run automated checks for the registry helpers and card theme resolver, then run the app and verify a filled `/doi-hinh` card loads its background from `/fco/card-themes/`.

Also verify that no `/admin/data-ops` "Scrape Seasons" UI/API behavior changed as part of this work.
