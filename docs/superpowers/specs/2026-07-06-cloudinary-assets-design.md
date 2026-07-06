# Cloudinary asset management design

## Goal

Move runtime image assets from local public files to Cloudinary, store asset mappings in MongoDB, and add an admin asset manager that supports upload, replacement, version history, and rollback.

The public client should become Cloudinary-only for runtime images after migration. Local files may remain in the repository temporarily for rollback/development safety, but product code should not use local image paths as runtime fallbacks.

## Decisions

- Cloudinary is the production image source.
- MongoDB is the source of truth for asset mappings.
- Assets are identified by `category + key`.
- Replacing an existing asset creates a new version and makes it active.
- Previous versions remain available for rollback.
- The public app loads an asset map once when the FCO app mounts and reuses it across routes.
- Admin upload forms preview the active image when replacing an existing `category + key`.
- Cloudinary credentials live only on the server.

## Scope

In scope:

- Upload all currently used runtime assets from `client/public` to Cloudinary.
- Create MongoDB records for migrated assets.
- Add a public asset map API for active Cloudinary URLs.
- Update client runtime image usage to resolve from the public asset map.
- Add admin asset library and upload/replace/rollback workflows.
- Add a migration script with dry-run, upload, skip/replace, and report modes.
- Preserve traceability from migrated DB records back to old local paths.

Out of scope for the first implementation:

- Deleting local runtime asset files from the repository.
- Uploading directly from the browser to Cloudinary with unsigned presets.
- Full digital asset management features such as folders, bulk editing, approval flows, or image transformations UI.
- Automatically changing FIFAAddict background collection behavior beyond making its output compatible with the new asset workflow.
- Reworking unrelated admin data-ops scraping flows.

## Cloudinary configuration

The server configures the Cloudinary Node SDK with one of these environment shapes:

```env
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
```

or:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

The server always requests secure HTTPS delivery URLs. API secret values never appear in client code, public API responses, logs, migration reports, or admin UI.

## Asset model

Add a MongoDB model, tentatively `Asset`, with one document per logical asset.

```js
{
  category: 'cardTheme',
  key: '865',
  label: 'Card theme 865',
  sourcePath: '/fco/card-themes/card-theme-865.png',
  status: 'active',
  activeVersion: 2,
  versions: [
    {
      version: 1,
      cloudinaryPublicId: 'fco/card-themes/865-v1',
      secureUrl: 'https://res.cloudinary.com/...',
      width: 300,
      height: 420,
      format: 'png',
      bytes: 12345,
      uploadedBy: null,
      uploadedAt: '2026-07-06T00:00:00.000Z',
      source: 'migration'
    },
    {
      version: 2,
      cloudinaryPublicId: 'fco/card-themes/865-v2',
      secureUrl: 'https://res.cloudinary.com/...',
      width: 300,
      height: 420,
      format: 'png',
      bytes: 12500,
      uploadedBy: '<adminId>',
      uploadedAt: '2026-07-06T00:00:00.000Z',
      source: 'admin'
    }
  ],
  createdAt: '2026-07-06T00:00:00.000Z',
  updatedAt: '2026-07-06T00:00:00.000Z'
}
```

Constraints:

- Unique index on `{ category: 1, key: 1 }`.
- `category`, `key`, `activeVersion`, and at least one version are required for active assets.
- `sourcePath` is nullable and only used for migrated local assets.
- New admin-uploaded assets use `sourcePath: null`.
- `status` supports at least `active` and `archived`.
- Archived assets are excluded from the public asset map.

Version rules:

- Version numbers are monotonic per asset.
- Uploading a file to an existing `category + key` creates `max(version) + 1`.
- New versions become active immediately after a successful Cloudinary upload and DB write.
- Rollback only changes `activeVersion`; it does not delete newer versions.
- Cloudinary public IDs include the version to avoid stale CDN/browser cache.

## Categories and keys

| Current source | Category | Key | Notes |
|---|---|---|---|
| `/fco/card-themes/card-theme-865.png` | `cardTheme` | `865` | Card background themes used by squad/detail/player cards. |
| `/fco/card-themes/card-theme-ng.svg` | `cardTheme` | `ng` | NG fallback card theme asset. |
| `/upgrade-badges/grade_1.png` | `upgradeBadge` | `1` | Upgrade level badge. |
| `/upgrade-badges/grade_13.png` | `upgradeBadge` | `13` | Upgrade level badge. |
| `/upgrade-happy.png` | `upgradeMascot` | `happy` | Upgrade success mascot. |
| `/upgrade-sad.png` | `upgradeMascot` | `sad` | Upgrade failure mascot. |
| `/upgrade.png` | `upgradeBase` | `default` | Base upgrade image. |
| `/upgrade-effects/shatter_sprite.webp` | `upgradeEffect` | `shatter` | Upgrade animation/effect sprite. |
| `/fifaaddict-season-sprite.png` | `seasonSprite` | `fifaaddict` | FIFAAddict season sprite sheet. |
| `/fc_online_badges_css_sprite.png` | `badgeSprite` | `fc-online` | FC Online badge sprite sheet. |
| `/icons.svg` | `siteAsset` | `icons` | App/site icon sprite. |
| `/favicon.svg` | `siteAsset` | `favicon` | Site favicon. |
| Admin upload not tied to a product feature | `general` | Admin-entered or generated slug | Reusable library asset. |

Migration stores both `category/key` and the old `sourcePath`. Runtime client code uses only `category/key` lookup and Cloudinary URLs.

## Public asset map API

Add a public route:

```txt
GET /api/assets/public-map
```

Response shape:

```js
{
  success: true,
  data: {
    cardTheme: {
      '865': 'https://res.cloudinary.com/.../fco/card-themes/865-v1.png'
    },
    upgradeBadge: {
      '1': 'https://res.cloudinary.com/.../upgrade-badges/1-v1.png'
    },
    upgradeMascot: {
      happy: 'https://res.cloudinary.com/.../upgrade-mascots/happy-v1.png'
    }
  },
  updatedAt: '2026-07-06T00:00:00.000Z'
}
```

Behavior:

- Return only non-archived assets with a valid active version.
- Group by category, then key.
- Include only active `secureUrl` values in the public map.
- Do not expose Cloudinary API credentials or internal admin metadata.
- Return a deterministic `updatedAt` or map revision based on the latest active asset update.
- Set short cache headers or `ETag` support so browser/server caching avoids repeated route-level fetches.

Client behavior:

- Fetch once when `FcoApp` mounts.
- Store the result in context or a module-level cache.
- Reuse across internal FCO routes instead of refetching on every route change.
- If fetching fails, show product fallback UI states; do not resolve local runtime image paths.
- A page refresh is enough to pick up new active versions after admin replacement.

## Admin APIs

Add admin routes under `/api/admin/assets` protected by existing admin auth and permissions.

```txt
GET    /api/admin/assets
GET    /api/admin/assets/:id
POST   /api/admin/assets/upload
PATCH  /api/admin/assets/:id/active-version
PATCH  /api/admin/assets/:id/archive
```

Permissions should follow the existing admin permission style, for example:

- `assets.view`
- `assets.create`
- `assets.edit`
- `assets.archive`

`GET /api/admin/assets`:

- Supports pagination.
- Supports filters for category, status, and search text.
- Search matches key, label, source path, and Cloudinary public ID.
- Returns active version preview URL and version count.

`GET /api/admin/assets/:id`:

- Returns full metadata and version history.
- Used by the replacement form to preview the active image and rollback candidates.

`POST /api/admin/assets/upload`:

- Accepts multipart image upload.
- Accepts `category`, `key`, and optional `label`.
- Validates file type and size at the server boundary.
- If `category + key` does not exist, creates the asset and version `1`.
- If `category + key` exists, creates the next version and makes it active.
- Uploads to Cloudinary with a versioned public ID.
- Returns the updated asset document summary.

`PATCH /api/admin/assets/:id/active-version`:

- Accepts a version number that exists on the asset.
- Sets `activeVersion` to that version.
- Does not delete Cloudinary resources.

`PATCH /api/admin/assets/:id/archive`:

- Archives the asset in DB.
- Excludes it from the public map.
- Does not delete Cloudinary resources in the first implementation.

## Cloudinary service

Add a server service that wraps the Cloudinary SDK.

Responsibilities:

- Configure Cloudinary from environment variables.
- Upload a local file path for migration.
- Upload an in-memory/admin multipart file via stream.
- Return normalized metadata: `publicId`, `secureUrl`, `width`, `height`, `format`, `bytes`.
- Generate public IDs from category, key, and version.
- Fail clearly when credentials are missing.

Public ID examples:

```txt
fco/card-themes/865-v1
fco/card-themes/ng-v1
fco/upgrade-badges/1-v1
fco/upgrade-mascots/happy-v2
fco/season-sprites/fifaaddict-v1
fco/general/summer-banner-2026-v1
```

The service should not guess remote URLs. It uploads from known local files during migration or from admin-provided files during upload.

## Local to Cloudinary migration

Add a server-side migration script, tentatively:

```txt
npm run assets:migrate-cloudinary
```

Supported modes:

```txt
npm run assets:migrate-cloudinary -- --dry-run
npm run assets:migrate-cloudinary -- --upload
npm run assets:migrate-cloudinary -- --upload --replace
```

### Step 1: discover local runtime assets

The script scans `client/public` for image files.

Include:

- `client/public/fco/card-themes/*.{png,svg,webp,jpg,jpeg,avif,gif}`
- `client/public/upgrade-badges/*.{png,svg,webp,jpg,jpeg,avif,gif}`
- `client/public/upgrade-effects/*.{png,svg,webp,jpg,jpeg,avif,gif}`
- known root-level runtime assets such as `upgrade.png`, `upgrade-happy.png`, `upgrade-sad.png`, `fifaaddict-season-sprite.png`, `fc_online_badges_css_sprite.png`, `icons.svg`, and `favicon.svg`

Exclude:

- `client/dist`
- `node_modules`
- `.claude/worktrees`
- Playwright screenshots
- build outputs and cache directories
- source-only demo assets that are not used at runtime, unless the codebase still references them

### Step 2: classify assets

Each discovered asset is parsed into:

```js
{
  sourcePath: '/fco/card-themes/card-theme-865.png',
  absolutePath: 'D:/ReactJS/fco-hub/client/public/fco/card-themes/card-theme-865.png',
  category: 'cardTheme',
  key: '865',
  label: 'Card theme 865'
}
```

If a file cannot be classified, the dry-run report marks it as unresolved and the upload mode skips it unless a future explicit mapping file is provided.

### Step 3: dry-run report

Dry-run prints and optionally writes a report containing:

- Total discovered files.
- Classified files grouped by category.
- Unresolved files with reason.
- Existing DB matches by `category + key`.
- Assets that would be uploaded.
- Assets that would be skipped.
- Assets that would create a new version if `--replace` were used.

Dry-run never uploads to Cloudinary and never writes DB records.

### Step 4: upload

Upload mode requires Cloudinary credentials and a MongoDB connection.

For each classified file:

1. Look up `category + key` in DB.
2. If missing, upload as version `1` and create the asset.
3. If present and `--replace` is absent, skip it.
4. If present and `--replace` is present, upload a new version and make it active.
5. Store Cloudinary metadata and `sourcePath`.
6. Continue after per-file failures and include failures in the final report.

### Step 5: migration report

The final report includes:

- Uploaded count.
- Skipped count.
- Replaced count.
- Failed count.
- Unresolved classifications.
- `sourcePath -> category/key -> Cloudinary URL` mappings.
- Any DB records that were changed.

The report must not include credentials.

### Step 6: switch client

After migration produces complete DB coverage, the implementation switches client runtime image resolution to the public asset map.

Client switch requirements:

- Card backgrounds resolve `cardTheme` by theme key.
- Upgrade badges resolve `upgradeBadge` by level.
- Upgrade mascots resolve `upgradeMascot` by state.
- Sprite sheets resolve by their category/key.
- No runtime image helper returns `/fco/...`, `/upgrade...`, or other local public paths as a fallback.

### Step 7: verify migration

Verification checks:

- Public asset map contains all expected migrated categories and keys.
- Squad/player card backgrounds load from Cloudinary.
- Detail and database card views load card themes from Cloudinary.
- Upgrade UI loads badges, mascots, base image, and effects from Cloudinary.
- Season/badge sprites load from Cloudinary where used.
- Browser network panel shows no local runtime image requests for migrated assets.
- Admin asset page can replace an existing migrated asset and show old/new preview.
- Rollback restores the previous active URL.

## Admin UI

Add an admin route, for example `/admin/assets`, inside the existing protected admin layout.

Library view:

- Grid or table of assets.
- Preview thumbnail.
- Category filter.
- Search by key, label, source path, and public ID.
- Status filter.
- Active version and version count.

Upload panel:

- Category selector.
- Key input or category-specific key selector.
- Label input.
- File picker.
- Existing asset lookup by category/key.
- If the selected `category + key` exists, show:
  - Active image preview.
  - Active version number.
  - Uploaded metadata.
  - Version history summary.
  - New selected file preview side by side.
  - Submit text: `Replace with new version`.
- If it does not exist, show submit text: `Create asset`.

Detail panel:

- Active image preview.
- Full version history.
- Rollback action per inactive version.
- Archive action.

Category-specific UX:

- `cardTheme`: key is a theme id such as `865` or `ng`.
- `upgradeBadge`: key is a level such as `1` through `13`.
- `upgradeMascot`: key is a state such as `happy` or `sad`.
- `general`: key can be manually entered or generated from the label.

The UI should be restrained and consistent with the current admin product style.

## Client integration

Add an asset map loader around the FCO app.

Suggested shape:

```js
getAssetUrl('cardTheme', '865')
getAssetUrl('upgradeBadge', '1')
getAssetUrl('upgradeMascot', 'happy')
```

Integration points:

- `client/src/fco/cardThemes.js` should stop returning local card background paths as primary runtime image URLs.
- `client/src/fco/cardThemeRegistry.json` can remain a season-to-theme-key registry if needed, but not as a local path registry.
- `client/src/fco/upgradeConfig.js` should represent mascot and other image references as category/key or use asset lookup helpers.
- Components that build `/upgrade-badges/grade_*.png` paths should switch to `upgradeBadge` lookup.
- Sprite helpers should resolve sprite sheet URLs through the asset map.

Missing asset handling:

- Missing card theme URL falls back to non-image visual treatment already available in the card system.
- Missing upgrade images show a neutral placeholder or omit the decorative image.
- Missing sprites should avoid broken image icons.
- Missing assets should be observable in console/admin diagnostics during development, but not spam production logs.

## Error handling

Migration:

- Missing Cloudinary config fails upload mode before processing files.
- Dry-run works without Cloudinary credentials.
- Per-file upload failures are recorded and do not stop the whole migration unless a fatal config/database error occurs.
- Unclassified files are skipped and reported.

Admin upload:

- Reject non-image files.
- Reject files above the configured size limit.
- Reject invalid categories and invalid keys.
- Return clear validation errors.
- If Cloudinary upload succeeds but DB write fails, report the failure and leave the previous active asset unchanged. Cleanup can be manual or implemented as best-effort deletion later.
- If DB write succeeds, the returned asset must include the new active version URL.

Public API:

- If the asset map cannot load from DB, return a normal API error.
- Client shows fallback UI rather than trying local image paths.

## Security

- Cloudinary API secret is server-only.
- Admin upload endpoints require admin auth and asset permissions.
- File type and size validation happen server-side.
- Do not accept arbitrary remote image URLs for server-side upload in the first implementation.
- Do not expose local filesystem paths beyond the old public `sourcePath` value used for migration traceability.
- Avoid logging credentials or raw signed upload payloads.

## Testing

Server tests:

- Asset creation creates version `1` and makes it active.
- Uploading the same `category + key` creates the next version.
- Rollback changes only `activeVersion`.
- Archived assets are excluded from public map.
- Public map returns only active secure URLs grouped by category/key.
- Migration classifier parses all known local asset patterns.
- Migration dry-run does not upload or write DB records.

Client tests:

- Asset lookup returns URL for category/key.
- Asset lookup handles missing categories/keys without returning local paths.
- Card theme resolution uses theme key plus asset map URL.
- Upgrade mascot/badge lookup uses asset map URL.

Manual verification:

- Run migration dry-run and inspect unresolved files.
- Run migration upload with credentials.
- Open public FCO app and verify card themes, upgrade badges, mascots, and sprites load from Cloudinary.
- Navigate between FCO routes and verify the public asset map is not refetched on every route change.
- Replace an existing asset in admin and confirm current/new previews are shown.
- Confirm the new version becomes active.
- Roll back to the prior version and confirm public map changes after refresh.
- Confirm browser network panel no longer requests migrated runtime images from local public paths.

## Rollout plan

1. Add the asset DB model, Cloudinary service, and admin/public API routes.
2. Add admin asset library, upload, replace preview, version history, and rollback UI.
3. Add migration classifier and dry-run mode.
4. Run dry-run and resolve unclassified runtime assets.
5. Run upload migration to create initial DB asset records.
6. Add client asset map provider/cache while keeping existing local behavior temporarily during development.
7. Switch runtime image lookups to Cloudinary-only asset map.
8. Verify public app and admin workflows.
9. Keep local files in the repo until a later cleanup decision.

## Open implementation notes

- The first implementation should prefer simple server-mediated uploads over direct browser-to-Cloudinary signed uploads.
- The first implementation should archive assets instead of deleting Cloudinary resources.
- The FIFAAddict card background collector can keep writing local files initially; a later follow-up can have it call the same asset service or migration classifier after collection.
- If public asset map size becomes large later, it can be split by category, but the first design uses one map because current assets are configuration-like and shared across FCO routes.
