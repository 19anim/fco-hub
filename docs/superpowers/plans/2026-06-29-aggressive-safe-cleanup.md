# Aggressive Safe Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean the repository so it keeps the active `client/` frontend and `server/` backend while removing duplicate package files, runtime data, debug screenshots, and old planning artifacts.

**Architecture:** This is a filesystem cleanup, not a code architecture change. The cleanup is split into inventory, deletion, verification, and final review so every removal is visible and reversible through git where possible. Because the approved cleanup spec and this plan live under `docs/superpowers/`, keep `docs/superpowers/specs/2026-06-29-aggressive-safe-cleanup-design.md` and `docs/superpowers/plans/2026-06-29-aggressive-safe-cleanup.md` while removing older docs.

**Tech Stack:** Vite React app in `client/`, Express API in `server/`, npm scripts, git, RTK-prefixed shell commands.

## Global Constraints

- Preserve `client/` as the active frontend app, except remove the duplicate nested `client/client/` directory.
- Preserve `server/` as the active backend API.
- Preserve root `.gitignore`, `.env.example`, and `docker-compose.yml`.
- Preserve `.claude/` project workflow/config files.
- Delete only by explicit path or narrow glob groups.
- Do not delete env examples, package lockfiles, app config files, or source files in active `client/` and `server/`.
- Do not create a commit unless the user explicitly asks for one.
- Prefix shell commands with `rtk`.

---

## File Structure

**Remove:**
- `client/client/package.json`
- `client/client/package-lock.json`
- `client/client/`
- `9router_data/`
- `DISCOVERY_FIX.md`
- Root visual artifacts matching narrow groups: `*.png`, `*.jpg`, `*.jpeg` at repository root only.
- Older docs under `docs/superpowers/plans/` and `docs/superpowers/specs/`, except this plan and the approved cleanup spec.

**Keep:**
- `client/package.json`, `client/package-lock.json`, `client/src/`, `client/public/`, `client/vite.config.js`, and the rest of active `client/`.
- `server/package.json`, `server/package-lock.json`, `server/src/`, `server/scripts/`, `server/.env.example`, and the rest of active `server/`.
- `.env.example`, `.gitignore`, `docker-compose.yml`, `.claude/`.
- `docs/superpowers/specs/2026-06-29-aggressive-safe-cleanup-design.md`.
- `docs/superpowers/plans/2026-06-29-aggressive-safe-cleanup.md`.

---

### Task 1: Inventory Cleanup Targets

**Files:**
- Inspect: repository root
- Inspect: `client/client/`
- Inspect: `9router_data/`
- Inspect: `docs/superpowers/plans/`
- Inspect: `docs/superpowers/specs/`

**Interfaces:**
- Consumes: Approved cleanup spec at `docs/superpowers/specs/2026-06-29-aggressive-safe-cleanup-design.md`.
- Produces: A visible command output listing the exact cleanup candidates before deletion.

- [ ] **Step 1: List duplicate nested client files**

Run:

```bash
rtk ls client/client
```

Expected: output shows only `package.json` and `package-lock.json`, or the directory is already absent.

- [ ] **Step 2: List untracked runtime data directory**

Run:

```bash
rtk ls 9router_data
```

Expected: output shows runtime-style folders/files such as `bin/`, `db/`, `logs/`, `mitm/`, `jwt-secret`, and `machine-id`, or the directory is already absent.

- [ ] **Step 3: List tracked docs planned for removal**

Run:

```bash
rtk git ls-files docs/superpowers
```

Expected: output includes old plans/specs and includes the current cleanup spec/plan. The current cleanup files must not be included in deletion commands.

- [ ] **Step 4: List root visual artifacts planned for removal**

Run:

```bash
rtk find "*.png" . && rtk find "*.jpg" . && rtk find "*.jpeg" .
```

Expected: output includes root screenshots/debug images. Active app images under `client/` and package images under `server/` must not be deleted by the later root-only deletion command.

- [ ] **Step 5: Check initial git status**

Run:

```bash
rtk git status --short
```

Expected: output includes the new cleanup spec and plan plus existing untracked `9router_data/`; no unexpected source modifications should block cleanup.

---

### Task 2: Remove Duplicate Package Folder and Runtime Data

**Files:**
- Delete: `client/client/package.json`
- Delete: `client/client/package-lock.json`
- Delete: `client/client/`
- Delete: `9router_data/`

**Interfaces:**
- Consumes: Inventory from Task 1.
- Produces: Removed duplicate nested client package and removed untracked runtime data.

- [ ] **Step 1: Remove duplicate nested client directory**

Run:

```bash
rm -rf client/client
```

Expected: no output. This removes only `client/client/`, not the active `client/` app.

- [ ] **Step 2: Remove untracked runtime data directory**

Run:

```bash
rm -rf 9router_data
```

Expected: no output. This removes only the root `9router_data/` runtime directory.

- [ ] **Step 3: Verify active client and server still exist**

Run:

```bash
rtk ls client && rtk ls server
```

Expected: `client/` still contains `src/`, `public/`, `package.json`, `package-lock.json`, and Vite config; `server/` still contains `src/`, `scripts/`, `package.json`, and `package-lock.json`.

---

### Task 3: Remove Root Debug Images and Temporary Root Notes

**Files:**
- Delete: root `*.png`
- Delete: root `*.jpg`
- Delete: root `*.jpeg`
- Delete: `DISCOVERY_FIX.md`

**Interfaces:**
- Consumes: Root-only artifact categories from the approved cleanup spec.
- Produces: A cleaner root directory without visual debug artifacts or temporary markdown notes.

- [ ] **Step 1: Delete root image artifacts only**

Run:

```bash
rm -f ./*.png ./*.jpg ./*.jpeg
```

Expected: no output. This root-only pattern must not remove `client/src/assets/hero.png`, `client/public/` assets, or any image nested under `client/` or `server/`.

- [ ] **Step 2: Delete root temporary discovery note**

Run:

```bash
rm -f DISCOVERY_FIX.md
```

Expected: no output.

- [ ] **Step 3: Verify root is no longer cluttered by root image files**

Run:

```bash
rtk find "*.png" . && rtk find "*.jpg" . && rtk find "*.jpeg" .
```

Expected: root-level debug images are absent. Nested app/runtime dependency images may still appear and should remain untouched.

---

### Task 4: Remove Old Superpowers Docs While Keeping Current Cleanup Docs

**Files:**
- Keep: `docs/superpowers/specs/2026-06-29-aggressive-safe-cleanup-design.md`
- Keep: `docs/superpowers/plans/2026-06-29-aggressive-safe-cleanup.md`
- Delete: older files in `docs/superpowers/specs/`
- Delete: older files in `docs/superpowers/plans/`

**Interfaces:**
- Consumes: The current cleanup spec and this plan as the only docs to preserve.
- Produces: `docs/superpowers/` containing only the approved cleanup spec and implementation plan.

- [ ] **Step 1: Remove older plan documents**

Run:

```bash
for f in docs/superpowers/plans/*.md; do [ "$f" = "docs/superpowers/plans/2026-06-29-aggressive-safe-cleanup.md" ] || rm -f "$f"; done
```

Expected: no output. The current cleanup plan remains.

- [ ] **Step 2: Remove older spec documents**

Run:

```bash
for f in docs/superpowers/specs/*.md; do [ "$f" = "docs/superpowers/specs/2026-06-29-aggressive-safe-cleanup-design.md" ] || rm -f "$f"; done
```

Expected: no output. The approved cleanup spec remains.

- [ ] **Step 3: Verify only current cleanup docs remain under docs/superpowers**

Run:

```bash
rtk git ls-files docs/superpowers && rtk ls docs/superpowers/plans && rtk ls docs/superpowers/specs
```

Expected: working tree marks older tracked docs as deleted; directory listing shows only `2026-06-29-aggressive-safe-cleanup.md` and `2026-06-29-aggressive-safe-cleanup-design.md`.

---

### Task 5: Verify Frontend and Backend Still Work

**Files:**
- Verify: `client/package.json`
- Verify: `server/package.json`

**Interfaces:**
- Consumes: Cleaned filesystem from Tasks 2-4.
- Produces: Verification results for test/build/backend sanity checks.

- [ ] **Step 1: Run frontend tests**

Run:

```bash
rtk npm --prefix client test
```

Expected: tests pass. If dependencies are missing or an existing test fails for an unrelated reason, capture the exact failure summary.

- [ ] **Step 2: Run frontend production build**

Run:

```bash
rtk npm --prefix client run build
```

Expected: Vite build succeeds and writes `client/dist/`. If the build fails, capture the exact error summary.

- [ ] **Step 3: Run backend syntax import check**

Run:

```bash
rtk node --check server/src/server.js
```

Expected: no syntax errors. This does not start the server or require database connectivity.

- [ ] **Step 4: Check final git status**

Run:

```bash
rtk git status --short
```

Expected: status shows intended deletions, the cleanup spec, and this cleanup plan. It must not show source file changes under active `client/src/` or `server/src/`.

---

### Task 6: Final Review With User

**Files:**
- Review: git status output
- Review: verification command results

**Interfaces:**
- Consumes: Final git status and verification results from Task 5.
- Produces: A concise user-facing cleanup report and no commit.

- [ ] **Step 1: Summarize removed categories**

Report these categories to the user:

```text
Removed duplicate nested client package folder: client/client/
Removed runtime data: 9router_data/
Removed root visual debug artifacts: root *.png, *.jpg, *.jpeg
Removed temporary root note: DISCOVERY_FIX.md
Removed old docs/superpowers plans/specs while keeping the current cleanup spec and plan
```

- [ ] **Step 2: Summarize verification results**

Report each command and result:

```text
rtk npm --prefix client test: PASS or exact failure summary
rtk npm --prefix client run build: PASS or exact failure summary
rtk node --check server/src/server.js: PASS or exact failure summary
rtk git status --short: intended cleanup diff only, or list unexpected entries
```

- [ ] **Step 3: Stop before commit**

Do not run `git add` or `git commit`. Ask the user whether they want a commit only after they have reviewed the cleanup diff.

---

## Self-Review

- Spec coverage: The plan preserves `client/`, `server/`, root config, and `.claude/`; removes duplicate `client/client/`, `9router_data/`, root images, old docs, and root temporary notes; verifies frontend tests/build, backend syntax, and final git status.
- Placeholder scan: No placeholders, TBDs, or vague implementation steps remain.
- Consistency check: Paths for the current cleanup spec and plan are consistent across file structure and Task 4.
