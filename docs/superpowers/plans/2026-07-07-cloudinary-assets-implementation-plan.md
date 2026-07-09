# Cloudinary Asset Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every runtime FCO image to Cloudinary, keep the authoritative category/key/version mapping in MongoDB, and provide secure migration plus admin create/replace/rollback/archive workflows without any local runtime-image fallback.

**Architecture:** The server owns Cloudinary credentials and all uploads. A versioned `Asset` aggregate and a small domain service make MongoDB updates atomic; public consumers receive only a cached category/key-to-HTTPS-URL map, while protected admin endpoints expose searchable metadata and history. The FCO client fetches the map once through a provider and turns all image decisions into category/key lookups; migration discovers and classifies local assets, reports dry runs, and uploads resumably.

**Tech Stack:** Node.js ESM, Express 4, Mongoose 8, Cloudinary Node SDK, Multer memory storage, Node test runner, React 19, React Router 7, Axios, Tailwind CSS 4, Vitest.

---

## Fixed decisions and acceptance boundaries

- MongoDB is the source of truth; Cloudinary is the production delivery source.
- Logical identity is exactly normalized `category + key`; version numbers are monotonic integers per logical asset.
- Supported categories and Cloudinary folders are: `cardTheme/card-themes`, `upgradeBadge/upgrade-badges`, `upgradeMascot/upgrade-mascots`, `upgradeBase/upgrade-bases`, `upgradeEffect/upgrade-effects`, `seasonSprite/season-sprites`, `badgeSprite/badge-sprites`, `siteAsset/site-assets`, `teamColorIcon/team-color-icons`, and `general/general`.
- `teamColorIcon` is included because current runtime code references `/fco/teamcolor-icons/strip/{club,grade,relation}.png`; excluding it would violate “all currently used runtime assets”.
- Migration includes upgrade badge key `0` because it exists and is referenced in `fco.css`, even though the design table only illustrates levels 1 and 13.
- `sourcePath` contains only the former public URL (for example `/upgrade.png`), never an absolute filesystem path.
- Admin multipart limit is `ASSET_UPLOAD_MAX_BYTES`, defaulting to 10 MiB. Accepted MIME types/extensions are PNG, JPEG, WebP, GIF, SVG, and AVIF; validate both MIME type and filename extension. SVG uploads remain server-mediated and are delivered as images, never injected into DOM markup.
- Failed Cloudinary-upload/DB-write sequences leave the existing DB document and `activeVersion` unchanged. The orphaned Cloudinary resource is reported by public ID for manual cleanup; deletion is out of scope.
- Archive is idempotent and does not delete Cloudinary resources. There is no unarchive endpoint in this implementation.
- Public `updatedAt` is deterministic: the maximum `updatedAt` among included active records, or `null` for an empty map. ETag is a SHA-256 hash of the canonical JSON `{data,updatedAt}`; honor `If-None-Match` with `304`.
- Public client failures and missing keys render existing non-image/neutral UI; they never synthesize `/fco/...`, `/upgrade...`, or another `client/public` URL.
- Keep local files in the repository. Do not change FIFAAddict collection or unrelated admin data-ops flows.

## File map

### Server files

- Create `server/src/config/cloudinary.js`: validate either supported environment shape and configure secure delivery.
- Create `server/src/models/Asset.js`: embedded version schema, asset constraints, indexes.
- Create `server/src/services/cloudinaryAssets.js`: public-ID generation and path/buffer uploads with normalized results.
- Create `server/src/services/assetService.js`: category/key validation, create/replace, rollback, archive, list/detail, and public-map projection.
- Create `server/src/controllers/assets.controller.js`: HTTP translation, pagination parsing, cache/ETag behavior.
- Create `server/src/routes/publicAssets.routes.js`: public-map route.
- Create `server/src/routes/adminAssets.routes.js`: protected multipart admin routes and permission checks.
- Create `server/src/middleware/assetUpload.js`: Multer memory storage and server-side file limits.
- Modify `server/src/server.js`: mount public/admin routes and route Multer errors through the error handler.
- Modify `server/src/models/AdminUser.js` only if the product maintains an explicit permission allowlist; permissions are currently free-form, so no schema change is required.
- Modify `server/.env.example` and root `.env.example`: document Cloudinary variables and upload limit without secrets.
- Modify `server/package.json` and lockfile: add `cloudinary`, `multer`, test scripts, and migration command.
- Create focused Node tests beside model/service/controller/script modules.

### Migration files

- Create `server/scripts/assetMigration/catalog.js`: include/exclude discovery rules and known root mappings.
- Create `server/scripts/assetMigration/classifier.js`: pure sourcePath-to-category/key/label classifier.
- Create `server/scripts/assetMigration/report.js`: deterministic console/JSON report with credential redaction.
- Create `server/scripts/migrateCloudinaryAssets.js`: CLI parsing, dry-run/upload orchestration, DB lifecycle, continue-on-file-error behavior.
- Create tests for catalog, classifier, report, and orchestration using injected filesystem/DB/uploader dependencies.
- Create runtime report output under ignored `server/reports/assets/`; modify `.gitignore` accordingly.

### Client public runtime files

- Create `client/src/fco/assets/assetApi.js`: fetch public map.
- Create `client/src/fco/assets/assetMap.js`: pure lookup and dev-only missing-asset diagnostics.
- Create `client/src/fco/assets/AssetProvider.jsx`: one mount-level fetch and context hook.
- Create unit tests for API, lookup, provider fetch-once semantics, and missing behavior.
- Modify `client/src/fco/FcoApp.jsx`: mount provider once around all internal views.
- Modify `client/src/fco/cardThemeRegistry.json`, `cardThemes.js`, and their tests: registry retains theme IDs/classes only; URL comes from `cardTheme` lookup.
- Modify `client/src/fco/upgradeConfig.js`, `upgradeHelpers.js`, `components/LevelBadge.jsx`, `views/UpgradeView.jsx`, and tests: use category/key references and resolved URLs.
- Modify `client/src/fco/seasonSprites.js`, `ui.jsx`, `components/PlayerPickerFiltered.jsx`, `views/DatabaseView.jsx`, and tests: resolve sprite sheet without local fallback.
- Modify `client/src/fco/components/TeamColorStrip.jsx`: resolve three `teamColorIcon` keys.
- Modify `client/src/fco/fco.css`: replace runtime `url(...)` declarations with CSS custom properties and `none` defaults.
- Modify `client/index.html` only after confirming the favicon must be runtime-managed; use a small React-side favicon updater because static HTML cannot consume the fetched map.

### Client admin files

- Create `client/src/services/adminAssets.js`: list/detail/upload/rollback/archive methods.
- Create `client/src/pages/admin/AssetsPage.jsx`: library, filters, pagination, upload/replace panel, detail/history actions.
- Create focused components under `client/src/components/admin/assets/`: `AssetFilters.jsx`, `AssetLibrary.jsx`, `AssetUploadPanel.jsx`, `AssetDetailPanel.jsx`, `AssetPreview.jsx`.
- Create `client/src/pages/admin/AssetsPage.test.jsx` and pure helper tests.
- Modify `client/src/App.jsx` and `client/src/components/admin/AdminSidebar.jsx`: protected `/admin/assets` route and permission-gated nav item.

---

### Task 1: Establish test commands and dependencies

**Files:**
- Modify: `server/package.json`
- Modify: `server/package-lock.json`
- Modify: `server/.env.example`
- Modify: `.env.example`

- [ ] **Step 1: Add a failing smoke test command**

Create `server/src/services/assetService.test.js` with a single import assertion for a not-yet-created `ASSET_CATEGORIES` export:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { ASSET_CATEGORIES } from './assetService.js';

test('asset categories include every current runtime family', () => {
  assert.deepEqual(Object.keys(ASSET_CATEGORIES).sort(), [
    'badgeSprite', 'cardTheme', 'general', 'seasonSprite', 'siteAsset',
    'teamColorIcon', 'upgradeBadge', 'upgradeBase', 'upgradeEffect', 'upgradeMascot',
  ]);
});
```

- [ ] **Step 2: Add scripts and install server dependencies**

Set scripts to include:

```json
{
  "test": "node --test \"src/**/*.test.js\" \"scripts/**/*.test.js\"",
  "test:assets": "node --test \"src/**/*asset*.test.js\" \"scripts/assetMigration/*.test.js\"",
  "assets:migrate-cloudinary": "node scripts/migrateCloudinaryAssets.js"
}
```

Run: `cd server && npm install cloudinary multer && npm test`

Expected: dependency installation succeeds; test fails with `ERR_MODULE_NOT_FOUND` for `assetService.js`.

- [ ] **Step 3: Document non-secret configuration**

Append the two mutually exclusive Cloudinary shapes plus:

```env
# Admin asset uploads default to 10 MiB when omitted.
ASSET_UPLOAD_MAX_BYTES=10485760
```

Do not add real cloud name, key, secret, MongoDB URI, or signed payload.

- [ ] **Step 4: Commit**

```bash
git add server/package.json server/package-lock.json server/.env.example .env.example server/src/services/assetService.test.js
git commit -m "chore: prepare cloudinary asset dependencies"
```

### Task 2: Define the Asset aggregate and validation contract

**Files:**
- Create: `server/src/models/Asset.js`
- Create: `server/src/models/Asset.test.js`
- Create: `server/src/services/assetService.js`
- Modify: `server/src/services/assetService.test.js`

- [ ] **Step 1: Write failing schema and validator tests**

Cover: compound unique index; allowed statuses; required non-empty versions for `active`; nullable `sourcePath`; required version metadata; unique positive version numbers; `activeVersion` must exist; category allowlist; per-category key validation (`cardTheme` slug/theme ID, badge 0–13, mascot happy/sad, fixed keys for base/effect/sprites/site/team icons, general slug); trimming and lower-case general slug.

Use `Asset.validate()` so tests do not require MongoDB. Expected invalid cases reject with the exact field in `error.errors`.

- [ ] **Step 2: Implement constants and pure normalization**

```js
export const ASSET_CATEGORIES = Object.freeze({
  cardTheme: { folder: 'card-themes', key: /^(?:ng|[a-z0-9-]+)$/ },
  upgradeBadge: { folder: 'upgrade-badges', key: /^(?:[0-9]|1[0-3])$/ },
  upgradeMascot: { folder: 'upgrade-mascots', keys: ['happy', 'sad'] },
  upgradeBase: { folder: 'upgrade-bases', keys: ['default'] },
  upgradeEffect: { folder: 'upgrade-effects', keys: ['shatter'] },
  seasonSprite: { folder: 'season-sprites', keys: ['fifaaddict'] },
  badgeSprite: { folder: 'badge-sprites', keys: ['fc-online'] },
  siteAsset: { folder: 'site-assets', keys: ['icons', 'favicon'] },
  teamColorIcon: { folder: 'team-color-icons', keys: ['club', 'grade', 'relation'] },
  general: { folder: 'general', key: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
});

export function normalizeAssetIdentity(category, key) {
  const normalizedCategory = String(category ?? '').trim();
  const normalizedKey = String(key ?? '').trim().toLowerCase();
  const rule = ASSET_CATEGORIES[normalizedCategory];
  if (!rule || !(rule.keys?.includes(normalizedKey) || rule.key?.test(normalizedKey))) {
    const error = new Error('Invalid asset category or key');
    error.statusCode = 400;
    throw error;
  }
  return { category: normalizedCategory, key: normalizedKey };
}
```

- [ ] **Step 3: Implement the schema**

The embedded version fields are `version`, `cloudinaryPublicId`, `secureUrl`, `width`, `height`, `format`, `bytes`, `uploadedBy`, `uploadedAt`, and enum `source: migration|admin`. Disable embedded `_id`. Add timestamps to the asset, index `{category:1,key:1}` unique and list/search support indexes `{status:1,category:1,updatedAt:-1}` plus a text index over `key`, `label`, `sourcePath`, and `versions.cloudinaryPublicId`. Add a pre-validation invariant that active assets have at least one version and their `activeVersion` exists.

- [ ] **Step 4: Run focused tests**

Run: `cd server && npm run test:assets`

Expected: schema and category tests pass; later service tests are not present yet.

- [ ] **Step 5: Commit**

```bash
git add server/src/models/Asset.js server/src/models/Asset.test.js server/src/services/assetService.js server/src/services/assetService.test.js
git commit -m "feat: define versioned asset aggregate"
```

### Task 3: Wrap Cloudinary without leaking credentials

**Files:**
- Create: `server/src/config/cloudinary.js`
- Create: `server/src/config/cloudinary.test.js`
- Create: `server/src/services/cloudinaryAssets.js`
- Create: `server/src/services/cloudinaryAssets.test.js`

- [ ] **Step 1: Write failing tests with an injected SDK**

Assert: `CLOUDINARY_URL` is accepted; split variables are accepted; partial/missing config throws `Cloudinary configuration is missing`; config always sets `secure:true`; `buildAssetPublicId('upgradeMascot','happy',2)` returns `fco/upgrade-mascots/happy-v2`; path upload passes `public_id`, `overwrite:false`, `resource_type:'image'`; stream upload resolves normalized metadata; SDK errors reject without serializing env values.

- [ ] **Step 2: Implement config parsing and normalization**

Export `getCloudinaryConfig(env = process.env)`, `configureCloudinary(sdk, env)`, `buildAssetPublicId(category,key,version)`, `uploadAssetPath(...)`, and `uploadAssetBuffer(...)`. Stream upload must wrap `upload_stream` in a Promise and call `.end(buffer)`. Normalize only:

```js
{
  publicId: result.public_id,
  secureUrl: result.secure_url,
  width: result.width,
  height: result.height,
  format: result.format,
  bytes: result.bytes,
}
```

Reject results without an HTTPS `secure_url`.

- [ ] **Step 3: Verify**

Run: `cd server && node --test src/config/cloudinary.test.js src/services/cloudinaryAssets.test.js`

Expected: all tests pass and captured logs/output contain none of the fixture secrets.

- [ ] **Step 4: Commit**

```bash
git add server/src/config/cloudinary.js server/src/config/cloudinary.test.js server/src/services/cloudinaryAssets.js server/src/services/cloudinaryAssets.test.js
git commit -m "feat: add secure cloudinary asset service"
```

### Task 4: Implement atomic version lifecycle and public map projection

**Files:**
- Modify: `server/src/services/assetService.js`
- Modify: `server/src/services/assetService.test.js`

- [ ] **Step 1: Write failing service tests with injected repository/uploader**

Cover new upload creates version 1; replacement computes `max(versions.version)+1` rather than `activeVersion+1`; Cloudinary runs before DB mutation; successful write activates the new version; failed DB write leaves the prior in-memory/document state unchanged; rollback accepts an existing version and changes only `activeVersion`; absent version returns 400; archive changes only status; list filters/paginates/searches all required fields; detail returns history; public map excludes archived/missing-active-version records and groups only secure URLs.

- [ ] **Step 2: Implement create/replace using a compare-and-swap update**

After upload, update an existing record with a filter including `_id` and the prior `updatedAt` (or prior maximum version) and `$push` the new version plus `$set` of `activeVersion`, `status:'active'`, label when supplied, and sourcePath only for migration. If the compare-and-swap matches zero records, report a 409 conflict and the orphan public ID; never overwrite another concurrent version. New assets use `Asset.create`; translate duplicate-key races to 409.

- [ ] **Step 3: Implement rollback/archive/list/detail/public-map methods**

List defaults: page 1, limit 24, maximum 100, sort `updatedAt:-1,_id:1`. Escape regex search before matching `key`, `label`, `sourcePath`, and `versions.cloudinaryPublicId`. Summary includes `_id`, identity, label, sourcePath, status, activeVersion, active secure URL/metadata, versionCount, and timestamps. Public projection sorts category/key before object insertion and returns `{data,updatedAt}`.

- [ ] **Step 4: Verify and commit**

Run: `cd server && node --test src/services/assetService.test.js`

Expected: all lifecycle, concurrency, search, and projection tests pass.

```bash
git add server/src/services/assetService.js server/src/services/assetService.test.js
git commit -m "feat: implement asset version lifecycle"
```

### Task 5: Expose public and permission-protected admin APIs

**Files:**
- Create: `server/src/middleware/assetUpload.js`
- Create: `server/src/controllers/assets.controller.js`
- Create: `server/src/controllers/assets.controller.test.js`
- Create: `server/src/routes/publicAssets.routes.js`
- Create: `server/src/routes/adminAssets.routes.js`
- Modify: `server/src/server.js`

- [ ] **Step 1: Write failing controller/route tests**

Test exact routes, verbs, permissions (`assets.view/create/edit/archive`), multipart field name `file`, 10 MiB default limit, accepted formats, rejected non-images/mismatched extensions, 400 missing file/category/key, 404 unknown ID, 409 conflict, 413 Multer limit, list query parsing, public response shape, `Cache-Control: public, max-age=60, must-revalidate`, quoted ETag, and `304` for matching `If-None-Match`.

- [ ] **Step 2: Implement upload boundary**

Use Multer memory storage with one file and `limits.fileSize`. Never accept a URL field as upload input. Controller passes `req.file.buffer`, original name/MIME, `req.session.adminUserId`, and source `admin`; it never logs buffer, credentials, or signed request data.

- [ ] **Step 3: Implement endpoints and mount them**

Mount:

```js
app.use('/api/assets', publicAssetsRoutes);
app.use('/api/admin/assets', adminAssetsRoutes);
```

Admin routes must be ordered with `/upload` before `/:id`. Return `{success:true,data:...}` consistently; validation errors return `{success:false,message,errors?}`. Public endpoint returns exactly `{success:true,data,updatedAt}` and no source paths, IDs, versions, public IDs, upload users, or credentials.

- [ ] **Step 4: Verify and commit**

Run: `cd server && node --test src/controllers/assets.controller.test.js && npm test`

Expected: route/controller tests and the complete server suite pass.

```bash
git add server/src/middleware/assetUpload.js server/src/controllers/assets.controller.js server/src/controllers/assets.controller.test.js server/src/routes/publicAssets.routes.js server/src/routes/adminAssets.routes.js server/src/server.js
git commit -m "feat: expose asset public and admin APIs"
```

### Task 6: Build deterministic discovery and classification

**Files:**
- Create: `server/scripts/assetMigration/catalog.js`
- Create: `server/scripts/assetMigration/catalog.test.js`
- Create: `server/scripts/assetMigration/classifier.js`
- Create: `server/scripts/assetMigration/classifier.test.js`

- [ ] **Step 1: Write failing discovery tests against a temporary tree**

Include supported extensions case-insensitively under card-themes, upgrade-badges, upgrade-effects, and current runtime team-color icon folder. Include known root assets. Exclude `dist`, `build`, `node_modules`, caches, `.claude/worktrees`, `.playwright-mcp`, screenshots, and unreferenced demo/source assets. Normalize separators to `/`, sort source paths, and never traverse outside `client/public`.

- [ ] **Step 2: Write the complete classifier table and tests**

Expected mappings include:

```js
['/fco/card-themes/card-theme-865.png', 'cardTheme', '865'],
['/fco/card-themes/card-theme-ng.svg', 'cardTheme', 'ng'],
['/upgrade-badges/grade_0.png', 'upgradeBadge', '0'],
['/upgrade-badges/grade_13.png', 'upgradeBadge', '13'],
['/upgrade-happy.png', 'upgradeMascot', 'happy'],
['/upgrade-sad.png', 'upgradeMascot', 'sad'],
['/upgrade.png', 'upgradeBase', 'default'],
['/upgrade-effects/shatter_sprite.webp', 'upgradeEffect', 'shatter'],
['/fifaaddict-season-sprite.png', 'seasonSprite', 'fifaaddict'],
['/fc_online_badges_css_sprite.png', 'badgeSprite', 'fc-online'],
['/icons.svg', 'siteAsset', 'icons'],
['/favicon.svg', 'siteAsset', 'favicon'],
['/fco/teamcolor-icons/strip/club.png', 'teamColorIcon', 'club'],
['/fco/teamcolor-icons/strip/grade.png', 'teamColorIcon', 'grade'],
['/fco/teamcolor-icons/strip/relation.png', 'teamColorIcon', 'relation'],
```

Unknown files return `{status:'unresolved',reason:'No classification rule matched'}` rather than throwing. Classified records include absolutePath, sourcePath, category, key, and a human label.

- [ ] **Step 3: Implement pure discovery/classification and verify**

Run: `cd server && node --test scripts/assetMigration/catalog.test.js scripts/assetMigration/classifier.test.js`

Expected: all include, exclude, mapping, normalization, and unresolved tests pass.

- [ ] **Step 4: Commit**

```bash
git add server/scripts/assetMigration/catalog.js server/scripts/assetMigration/catalog.test.js server/scripts/assetMigration/classifier.js server/scripts/assetMigration/classifier.test.js
git commit -m "feat: discover and classify runtime assets"
```

### Task 7: Implement dry-run, upload/replace, and safe reports

**Files:**
- Create: `server/scripts/assetMigration/report.js`
- Create: `server/scripts/assetMigration/report.test.js`
- Create: `server/scripts/migrateCloudinaryAssets.js`
- Create: `server/scripts/migrateCloudinaryAssets.test.js`
- Modify: `.gitignore`

- [ ] **Step 1: Write failing CLI/orchestration tests**

Accepted modes are exactly `--dry-run`, `--upload`, and `--upload --replace`; reject no mode, both primary modes, unknown flags, or `--replace` without `--upload`. Dry-run works without Cloudinary config, reads DB matches, calls neither uploader nor mutating repository methods, and optionally writes `--report <path>`. Upload validates Cloudinary and MongoDB before files, skips existing records unless replace, continues after per-file errors, and closes DB in `finally`.

- [ ] **Step 2: Implement report shape**

The JSON report contains mode, startedAt/finishedAt, discovered/classified counts, `byCategory`, unresolved `{sourcePath,reason}`, planned uploads/skips/replacements, uploaded/skipped/replaced/failed counts, mappings `{sourcePath,category,key,secureUrl}`, and changed DB record IDs/active versions. Redact recursively any key matching `/secret|api[_-]?key|authorization|signature|cloudinary_url/i`; console failures contain sourcePath and safe message only.

- [ ] **Step 3: Implement orchestrator with dependency injection**

Dry-run connects to MongoDB only when `MONGODB_URI` exists; otherwise marks existing-match status `not-checked` and still performs classification without writes. Upload requires MongoDB. For each item call the same asset service used by admin, with `source:'migration'`, `uploadedBy:null`, and preserved public `sourcePath`. Categorize per-file results precisely as uploaded, replaced, skipped, or failed.

- [ ] **Step 4: Run real dry-run without credentials**

Run: `cd server && npm run assets:migrate-cloudinary -- --dry-run --report reports/assets/dry-run.json`

Expected: exit 0; report lists all actual card themes, badges 0–13, root assets, effect, and team-color icons; unresolved items include reasons; no Cloudinary request and no DB mutation occurs.

- [ ] **Step 5: Commit**

```bash
git add .gitignore server/scripts/assetMigration server/scripts/migrateCloudinaryAssets.js server/scripts/migrateCloudinaryAssets.test.js
git commit -m "feat: add cloudinary asset migration CLI"
```

### Task 8: Add the public asset-map provider and lookup contract

**Files:**
- Create: `client/src/fco/assets/assetApi.js`
- Create: `client/src/fco/assets/assetApi.test.js`
- Create: `client/src/fco/assets/assetMap.js`
- Create: `client/src/fco/assets/assetMap.test.js`
- Create: `client/src/fco/assets/AssetProvider.jsx`
- Create: `client/src/fco/assets/AssetProvider.test.jsx`
- Modify: `client/src/fco/FcoApp.jsx`

- [ ] **Step 1: Write failing lookup/provider tests**

Assert `getAssetUrl(map,'cardTheme','865')` returns HTTPS URL; missing category/key returns `null`; invalid/non-HTTPS values return `null`; no result starts with `/`; development diagnostics warn once per category/key; production is silent. Provider calls GET `/api/assets/public-map` once per FcoApp mount, remains mounted across internal route state changes, exposes loading/error/map/updatedAt, and failure resolves lookups to null.

- [ ] **Step 2: Implement loader and provider**

Use the same Axios base-URL convention as `client/src/fco/api.js`. Put `AssetProvider` inside `FcoApp`, outside the route/view switch, so client navigation does not remount it. Do not add localStorage persistence because a page refresh is the specified update boundary and HTTP cache/ETag handles freshness.

- [ ] **Step 3: Add explicit fallback state contract**

Provider renders the app while loading/failed; decorative images simply omit themselves. Add one restrained in-app status only if an existing fallback UI location supports it; do not block data views solely because the asset map failed.

- [ ] **Step 4: Verify and commit**

Run: `cd client && npm test -- src/fco/assets`

Expected: all asset lookup, fetch-once, HTTP error, and diagnostics tests pass.

```bash
git add client/src/fco/assets client/src/fco/FcoApp.jsx
git commit -m "feat: load public asset map once per FCO app"
```

### Task 9: Convert card themes and sprites to Cloudinary-only resolution

**Files:**
- Modify: `client/src/fco/cardThemeRegistry.json`
- Modify: `client/src/fco/cardThemeRegistryTools.js`
- Modify: `client/src/fco/cardThemeRegistryTools.test.js`
- Modify: `client/src/fco/cardThemes.js`
- Modify: `client/src/fco/cardThemes.test.js`
- Modify: `client/src/fco/seasonSprites.js`
- Modify: `client/src/fco/ui.jsx`
- Modify: `client/src/fco/components/PlayerPickerFiltered.jsx`
- Modify: `client/src/fco/views/DatabaseView.jsx`
- Modify: `client/src/fco/components/FcoPlayerCard.jsx`
- Modify: `client/src/fco/fco.css`

- [ ] **Step 1: Rewrite tests to prohibit local paths**

Theme resolution receives a lookup/map and returns `{themeId,className,backgroundImage}` with Cloudinary URL or `backgroundImage:null`; unknown themes use existing `card-theme-fallback` visual treatment. Registry tools produce theme IDs/classes without generating `/fco/card-themes/...`. Season sprite normalization maps known remote FIFAAddict sprite identity to `{category:'seasonSprite',key:'fifaaddict'}` and resolves through the map; missing sprite uses `null`.

- [ ] **Step 2: Remove path data from the registry**

Mechanically delete every `backgroundImage` local path from `cardThemeRegistry.json`; retain season-to-theme ID and class relationships. Update collectors/reporting helpers to treat `localPath` only as collector output/traceability, never runtime registry output.

- [ ] **Step 3: Thread resolved URLs through renderers**

Use `useAssets()` only at React boundaries and pass `getAssetUrl` results/pure resolver arguments downward. Set `--fco-card-theme-bg` and `--season-sprite-url` only when URL exists. Change CSS fallbacks to `none`; remove `url('/fifaaddict-season-sprite.png')`. Ensure Squad, Detail, Database, player picker, and reusable card all share the same theme resolver.

- [ ] **Step 4: Verify and scan**

Run: `cd client && npm test -- src/fco/cardThemes.test.js src/fco/cardThemeRegistryTools.test.js && rg -n "(/fco/card-themes|fifaaddict-season-sprite\.png)" src`

Expected: tests pass; `rg` returns only migration/collector/test fixtures explicitly documenting old source paths, not runtime code or CSS.

- [ ] **Step 5: Commit**

```bash
git add client/src/fco/cardThemeRegistry.json client/src/fco/cardThemeRegistryTools.js client/src/fco/cardThemeRegistryTools.test.js client/src/fco/cardThemes.js client/src/fco/cardThemes.test.js client/src/fco/seasonSprites.js client/src/fco/ui.jsx client/src/fco/components/PlayerPickerFiltered.jsx client/src/fco/views/DatabaseView.jsx client/src/fco/components/FcoPlayerCard.jsx client/src/fco/fco.css
git commit -m "feat: resolve card themes and sprites from asset map"
```

### Task 10: Convert upgrade, team-color, badge sprite, and site assets

**Files:**
- Modify: `client/src/fco/upgradeConfig.js`
- Modify: `client/src/fco/upgradeHelpers.js`
- Modify: `client/src/fco/upgradeHelpers.test.js`
- Modify: `client/src/fco/components/LevelBadge.jsx`
- Modify: `client/src/fco/views/UpgradeView.jsx`
- Modify: `client/src/fco/components/TeamColorStrip.jsx`
- Modify: `client/src/fco/fco.css`
- Create: `client/src/fco/assets/FaviconAsset.jsx`
- Modify: `client/src/fco/FcoApp.jsx`

- [ ] **Step 1: Write failing tests for every current key**

Test badges 0–13 use `upgradeBadge/<level>`; mascot chooses `happy` at full gauge and `sad` otherwise; base uses `upgradeBase/default`; shatter uses `upgradeEffect/shatter`; team icons use `teamColorIcon/{club,grade,relation}`; missing values omit `<img>` or apply neutral placeholder; favicon updater changes/creates `link[rel~='icon']` only for valid Cloudinary URL.

- [ ] **Step 2: Replace config paths with identities**

```js
export const UPGRADE_ASSETS = Object.freeze({
  base: ['upgradeBase', 'default'],
  mascot: { happy: ['upgradeMascot', 'happy'], sad: ['upgradeMascot', 'sad'] },
  shatter: ['upgradeEffect', 'shatter'],
});
```

`LevelBadge` resolves URL and returns a neutral text/gradient badge when missing. `UpgradeView` passes CSS vars for base/effect and omits mascot image when null. Delete all 14 hard-coded grade URL rules and the hard-coded shatter URL from CSS; CSS defaults are `none`.

- [ ] **Step 3: Cover badge/site sprites deliberately**

Search runtime usage of `fc_online_badges_css_sprite.png` and `icons.svg`. Where used, resolve `badgeSprite/fc-online` and `siteAsset/icons`; if no runtime reference remains, keep them migrated for traceability but document “not currently consumed” in the migration report. Mount `FaviconAsset` inside the provider to apply `siteAsset/favicon` after map load.

- [ ] **Step 4: Run tests and hard-coded-path audit**

Run: `cd client && npm test && rg -n "(/upgrade|fc_online_badges_css_sprite|/icons\.svg|/favicon\.svg|/fco/teamcolor-icons)" src index.html`

Expected: all client tests pass; no product runtime code synthesizes a migrated local URL. Static pre-load favicon may remain only if explicitly accepted as non-runtime boot chrome; otherwise remove it after the updater test passes.

- [ ] **Step 5: Commit**

```bash
git add client/src/fco/upgradeConfig.js client/src/fco/upgradeHelpers.js client/src/fco/upgradeHelpers.test.js client/src/fco/components/LevelBadge.jsx client/src/fco/views/UpgradeView.jsx client/src/fco/components/TeamColorStrip.jsx client/src/fco/fco.css client/src/fco/assets/FaviconAsset.jsx client/src/fco/FcoApp.jsx client/index.html
git commit -m "feat: make FCO runtime images cloudinary-only"
```

### Task 11: Build the admin asset library and create/replace preview workflow

**Files:**
- Create: `client/src/services/adminAssets.js`
- Create: `client/src/components/admin/assets/AssetPreview.jsx`
- Create: `client/src/components/admin/assets/AssetFilters.jsx`
- Create: `client/src/components/admin/assets/AssetLibrary.jsx`
- Create: `client/src/components/admin/assets/AssetUploadPanel.jsx`
- Create: `client/src/components/admin/assets/AssetDetailPanel.jsx`
- Create: `client/src/pages/admin/AssetsPage.jsx`
- Create: `client/src/pages/admin/AssetsPage.test.jsx`
- Modify: `client/src/App.jsx`
- Modify: `client/src/components/admin/AdminSidebar.jsx`

- [ ] **Step 1: Write API and page tests**

Cover permission-gated nav; initial paginated list; category/status/search filters; loading/empty/error states; thumbnails, active version, version count; category-specific key controls; general slug generated from label but editable; category/key lookup of existing asset; active preview/metadata/history summary; selected local file preview with `URL.createObjectURL` cleanup; submit labels `Create asset` and `Replace with new version`; multipart fields; successful refresh/detail selection; clear server validation messages.

- [ ] **Step 2: Implement the service wrapper**

Methods map exactly to GET list/detail, POST upload with `FormData`, PATCH active-version, and PATCH archive. Use credentials/base URL conventions already used by admin services. Do not manually set multipart `Content-Type`; Axios/browser supplies the boundary.

- [ ] **Step 3: Implement restrained current-admin-style UI**

Use existing Tailwind tokens (`surface-*`, `ink*`, `brand-blue`, `hairline`), responsive table/grid, accessible labels, focus states, and confirmation for archive/rollback. The upload panel shows current and new preview side by side only for replacement. Display dimensions, format, bytes, uploader, upload time, source, active version, and concise history summary.

- [ ] **Step 4: Implement category key UX**

`cardTheme`: text/select compatible with numeric theme IDs and `ng`; `upgradeBadge`: select 0–13; `upgradeMascot`: happy/sad; fixed categories expose their fixed keys; `general`: slug input/generated label. Changing identity cancels stale detail requests or ignores out-of-order responses.

- [ ] **Step 5: Verify and commit**

Run: `cd client && npm test -- src/pages/admin/AssetsPage.test.jsx && npm run lint`

Expected: all admin asset tests pass and lint has no new errors.

```bash
git add client/src/services/adminAssets.js client/src/components/admin/assets client/src/pages/admin/AssetsPage.jsx client/src/pages/admin/AssetsPage.test.jsx client/src/App.jsx client/src/components/admin/AdminSidebar.jsx
git commit -m "feat: add admin asset library and upload workflow"
```

### Task 12: Complete rollback, archive, concurrency, and error UX

**Files:**
- Modify: `client/src/components/admin/assets/AssetDetailPanel.jsx`
- Modify: `client/src/pages/admin/AssetsPage.jsx`
- Modify: `client/src/pages/admin/AssetsPage.test.jsx`
- Modify: `server/src/controllers/assets.controller.test.js`

- [ ] **Step 1: Test inactive-version rollback and archive behavior**

Rollback buttons appear only on inactive versions; confirmation names target version; success updates active preview without deleting later history; archive confirmation removes item from default active filter and public map; 401/403/404/409/413 responses remain actionable; double-submit is disabled; failed mutations retain current preview/state.

- [ ] **Step 2: Implement mutation state and refresh behavior**

Track mutation per action, show a single inline status/toast consistent with current admin pages, refetch detail and list after success, and preserve current filters/page where valid. Never optimistically change active version before the API succeeds.

- [ ] **Step 3: Verify and commit**

Run: `cd client && npm test -- src/pages/admin/AssetsPage.test.jsx`; run `cd server && npm run test:assets`.

Expected: rollback/archive/error tests pass on both sides.

```bash
git add client/src/components/admin/assets/AssetDetailPanel.jsx client/src/pages/admin/AssetsPage.jsx client/src/pages/admin/AssetsPage.test.jsx server/src/controllers/assets.controller.test.js
git commit -m "feat: finish asset rollback and archive workflows"
```

### Task 13: Execute migration with rollout gates

**Files:**
- Runtime output: `server/reports/assets/dry-run.json`
- Runtime output: `server/reports/assets/upload.json`
- No local runtime asset deletion.

- [ ] **Step 1: Run dry-run and resolve every unresolved runtime reference**

Run:

```bash
cd server
npm run assets:migrate-cloudinary -- --dry-run --report reports/assets/dry-run.json
```

Expected: all referenced public images classify; unresolved entries are proven unreferenced source/demo files or receive an explicit classifier rule before proceeding. Counts by category reconcile with filesystem counts, including badges 0–13 and all card-theme files.

- [ ] **Step 2: Verify DB/Cloudinary configuration without printing values**

Check only presence/validity and run a non-secret health probe. Expected: upload mode passes preflight; API secret never appears in terminal, logs, or reports.

- [ ] **Step 3: Upload initial versions**

Run:

```bash
cd server
npm run assets:migrate-cloudinary -- --upload --report reports/assets/upload.json
```

Expected: missing logical assets upload as v1; existing records skip; failures do not abort remaining files; report mapping count plus unresolved/skipped/failed counts reconcile with total discovered.

- [ ] **Step 4: Re-run idempotently**

Run the same upload command again. Expected: uploaded 0, replaced 0, failed 0, all classified existing assets skipped. Do not use `--replace` unless deliberately creating new versions.

- [ ] **Step 5: Query and audit the public map**

Run `curl -i http://localhost:5000/api/assets/public-map` twice, sending the first ETag as `If-None-Match` on the second request.

Expected: first response 200 with every expected category/key and only HTTPS URLs; second response 304; response contains no `cloudinaryPublicId`, `sourcePath`, version history, uploaded user, API key, or secret.

### Task 14: End-to-end verification and release checklist

**Files:**
- Modify only if verification finds a defect; add a regression test before the fix.

- [ ] **Step 1: Run automated suites**

Run:

```bash
cd server && npm test
cd ../client && npm test && npm run lint && npm run build
```

Expected: all commands exit 0; build emits no unresolved asset imports.

- [ ] **Step 2: Run repository-wide local-path audit**

Run:

```bash
rg -n "(/fco/card-themes|/upgrade(?:-|/|\.png)|fifaaddict-season-sprite|fc_online_badges_css_sprite|/fco/teamcolor-icons|/icons\.svg|/favicon\.svg)" client/src client/index.html
```

Expected: no runtime fallback/building logic. Allowed matches are tests asserting rejection, migration traceability fixtures, or collector code outside public runtime; inspect every match manually.

- [ ] **Step 3: Verify public app manually**

Open Database, Detail, Squad, Upgrade, player picker, and any badge/team-color views. Verify card themes, badges, happy/sad mascots, base/effect, season sprite, badge sprite where consumed, and team icons render from `https://res.cloudinary.com`. Missing assets show neutral/no-image UI and no broken image icon. Navigate across all FCO routes and confirm `/api/assets/public-map` is fetched once per FcoApp mount.

- [ ] **Step 4: Verify browser network boundary**

Clear network log, hard refresh, exercise all views, and filter Img/Fetch. Expected: no request for migrated runtime images originates from the app host or `client/public`; Cloudinary delivery is HTTPS; public map refreshes on page refresh and respects caching.

- [ ] **Step 5: Verify admin replacement and rollback**

With an account carrying each relevant permission: search a migrated asset; see active metadata/history; select a valid replacement and compare old/new preview; submit and observe next monotonic version active; refresh public app and see new URL; roll back and confirm old URL returns after refresh; archive a disposable/general asset and confirm it disappears from the public map while Cloudinary resources remain.

- [ ] **Step 6: Verify authorization and validation**

Expected: unauthenticated requests get 401; manager missing each permission gets 403; invalid category/key/non-image/oversize/missing file get clear 4xx errors; arbitrary remote URLs are rejected/ignored; owner retains access through existing role bypass.

- [ ] **Step 7: Verify failure behavior**

In a non-production test environment, simulate DB read failure (public API gives normal error and client neutral fallback), per-file Cloudinary failure (migration continues/reports), and DB failure after upload (previous active URL unchanged and orphan public ID reported without credentials).

- [ ] **Step 8: Keep rollback safety and commit final regression fixes**

Do not delete local files. Do not alter FIFAAddict collector behavior or unrelated data-ops. If verification required fixes, rerun the relevant focused test plus both full suites, then commit only those tested fixes.

---

## Spec-to-plan coverage audit

| Spec area | Covered by |
|---|---|
| Cloudinary config shapes, HTTPS, server-only secrets | Tasks 1, 3, 5, 7, 14 |
| Asset model, uniqueness, active/archive, metadata, sourcePath | Tasks 2, 4 |
| Monotonic replacement, active version, rollback without deletion | Tasks 4, 12, 14 |
| Category/key mapping, all current runtime files | Fixed decisions; Tasks 6, 9, 10, 13 |
| Public map shape, filtering, deterministic revision, caching | Tasks 4, 5, 13 |
| Fetch once at FcoApp mount, reuse across routes, refresh update | Tasks 8, 14 |
| Admin list/detail/upload/rollback/archive APIs and permissions | Tasks 5, 12 |
| Pagination, filters, multi-field search, summary/detail metadata | Tasks 4, 5, 11 |
| Multipart validation, size/type/key/category errors | Tasks 5, 14 |
| Cloudinary path/buffer service and versioned IDs | Task 3 |
| Discovery includes/excludes and unresolved classification | Task 6 |
| Dry-run no writes, upload skip/replace, continue-on-error, reports | Task 7 |
| Traceability and credential-free reports | Tasks 2, 7, 13 |
| Card, upgrade, sprite, icon runtime conversion; no local fallback | Tasks 9, 10, 14 |
| Missing-asset neutral UI and dev-only diagnostics | Tasks 8–10 |
| Admin library, previews, category-specific keys, history | Tasks 11, 12 |
| Cloudinary success/DB failure leaves previous active state | Tasks 4, 7, 14 |
| Security: auth, permissions, no remote URLs/logged secrets | Tasks 3, 5, 7, 14 |
| Automated server/client tests and manual verification | Every task; Task 14 |
| Rollout order and keeping local files | Tasks 13–14 |
| Out-of-scope collector/data-ops/deletion/direct upload/DAM UI | Fixed decisions; Task 14 |

## Completion definition

The work is complete only when all Task 14 checks pass, migration reports reconcile every discovered runtime file, the public map covers every required category/key, admin replace/rollback works end to end, and a repository plus browser-network audit demonstrates that product runtime code makes zero local requests for migrated images. Local files remain in git strictly as rollback/development safety and are not consulted by product code.
