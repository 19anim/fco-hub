# Task 2 Report: Define the Asset aggregate and validation contract

## Files changed
- `D:/ReactJS/fco-hub/server/src/models/Asset.js` — added versioned Asset aggregate schema, embedded version schema, validation invariants, and indexes.
- `D:/ReactJS/fco-hub/server/src/models/Asset.test.js` — added schema/index/category/version validation tests using `Asset.validate()` without MongoDB.
- `D:/ReactJS/fco-hub/server/src/services/assetService.js` — added `ASSET_CATEGORIES` and `normalizeAssetIdentity(category, key)`.
- `D:/ReactJS/fco-hub/server/src/services/assetService.test.js` — expanded asset category and normalization tests.

## TDD failing-test evidence
- Red command attempted from the server package equivalent: `rtk node --test "src/**/*asset*.test.js" "scripts/assetMigration/*.test.js"`.
- Initial red result failed as expected because `server/src/models/Asset.js` and `server/src/services/assetService.js` did not exist yet:
  - `ERR_MODULE_NOT_FOUND`: `D:/ReactJS/fco-hub/server/src/models/Asset.js`
  - `ERR_MODULE_NOT_FOUND`: `D:/ReactJS/fco-hub/server/src/services/assetService.js`
- Note: `rtk npm run test:assets` and `cd server && rtk npm run test:assets` both failed in this environment before test execution with `program not found`, so the equivalent Node test command from the package script was used with the required `rtk` prefix.

## Implementation summary
- Defined the exact `ASSET_CATEGORIES` contract from the Task 2 brief, including folders, regex rules, and fixed key lists.
- Implemented `normalizeAssetIdentity(category, key)` to trim category, trim/lowercase key, enforce category/key rules, and throw `Error('Invalid asset category or key')` with `statusCode = 400` on invalid input.
- Added the Asset Mongoose schema with timestamps, nullable `sourcePath`, allowed statuses, embedded versions without `_id`, required version metadata, version source enum `migration|admin`, and required indexes.
- Added pre-validation invariants for unique positive version numbers, active assets requiring versions, and `activeVersion` referencing an existing version.
- Tests assert exact `error.errors` field keys for invalid schema cases.

## Verification command/output summary
- Command: `cd D:/ReactJS/fco-hub/server && rtk node --test "src/**/*asset*.test.js" "scripts/assetMigration/*.test.js"`
- Result: passed.
- Summary: 14 tests, 14 pass, 0 fail.

## Commit hash
- Pending at report-write time; see final response for committed hash.

## Self-review notes
- Scope was limited to Task 2 files plus this requested report file.
- Task 3+ Cloudinary config/service files were not touched.
- Tests use `Asset.validate()` and do not require MongoDB.
- Existing untracked `docs/superpowers/plans/2026-07-07-cloudinary-assets-implementation-plan.md` was left untouched and will not be staged.
