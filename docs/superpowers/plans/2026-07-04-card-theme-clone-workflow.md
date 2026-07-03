# Card theme clone workflow

Use this workflow whenever a season/theme is missing from `client/src/fco/cardThemes.js`.

1. Open FIFAAddict squadmaker.
2. Add one representative player for the missing season/theme.
3. Inspect the rendered card.
4. Record the card class containing `card-theme-*`, for example `card-theme-865`.
5. Read the background URL from `img.card-bg-img.fc-bg[src]`.
6. Download that image into `client/public/fco/card-themes/`.
7. Name it by theme id, for example `card-theme-865.png`.
8. Add a registry entry in `client/src/fco/cardThemes.js` mapping the app season code to the theme id and local asset.
9. Re-run `cd client && npm run test -- src/fco/cardThemes.test.js && npm run build`.
10. During browser verification, confirm DevTools Network loads the background from `/fco/card-themes/...`, not from FIFAAddict.

Do not guess FIFAAddict asset URLs. The source of truth is the rendered `card-bg-img fc-bg` element.
