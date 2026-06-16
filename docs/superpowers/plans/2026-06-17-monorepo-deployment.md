# Monorepo Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Safely publish the existing FCO Hub monorepo to GitHub and prepare separate Netlify frontend and Render backend deployments without deleting app files.

**Architecture:** Keep one GitHub repository with `client/` as the Vite React app and `server/` as the Express API. Add root-level deployment and ignore configuration so GitHub receives source/config only, while Netlify and Render build from their respective subdirectories.

**Tech Stack:** Git, GitHub, Vite React, Netlify, Node/Express, Render, MongoDB via Mongoose.

---

## File Structure

- Create: `.gitignore` — root ignore rules for local/generated files across the monorepo.
- Create: `netlify.toml` — Netlify monorepo build configuration for `client/`.
- Create: `render.yaml` — Render Blueprint for the `server/` web service.
- Create: `.env.example` — root documentation of public deployment variables.
- Create: `server/.env.example` — backend environment variable template that is safe to commit.
- Modify: `server/.gitignore` — stop ignoring `package-lock.json` so backend installs are reproducible.
- Inspect/possibly modify: frontend API configuration files if local URLs are hardcoded.
- Commit/push: selectively stage source, lockfiles, config, and docs; exclude logs/screenshots/local caches.

### Task 1: Add safe root ignore rules

**Files:**
- Create: `.gitignore`

- [ ] **Step 1: Create root `.gitignore`**

Write this exact file at repository root:

```gitignore
# Dependencies
node_modules/
client/node_modules/
server/node_modules/

# Builds
client/dist/
server/dist/
dist/

# Environment and secrets
.env
.env.*
!.env.example
client/.env
client/.env.*
!client/.env.example
server/.env
server/.env.*
!server/.env.example

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
server-pid-crawler*.log
server-pid-crawler*.err.log
playwright-scraper.log

# Local tooling/cache
.claude/
.playwright-mcp/
.cache/
coverage/

# OS/editor
.DS_Store
Thumbs.db
.vscode/*
!.vscode/extensions.json
.idea/

# Local screenshots and generated captures
*.png
*.jpg
*.jpeg
*.webp
```

- [ ] **Step 2: Check ignored status**

Run:

```bash
git status --short --ignored
```

Expected: `client/node_modules/`, `server/node_modules/`, `server/.env`, logs, screenshots, and `.playwright-mcp/` show as ignored (`!!`) or remain unstaged.

### Task 2: Preserve backend lockfile

**Files:**
- Modify: `server/.gitignore`

- [ ] **Step 1: Remove `package-lock.json` from backend ignore**

Change `server/.gitignore` from:

```gitignore
# Dependencies
node_modules/
package-lock.json
```

to:

```gitignore
# Dependencies
node_modules/
```

Keep the remaining environment, log, editor, and OS ignore rules unchanged.

- [ ] **Step 2: Confirm backend lockfile can be staged**

Run:

```bash
git status --short server/package-lock.json
```

Expected: `?? server/package-lock.json` or no output if already tracked later.

### Task 3: Add Netlify frontend deployment config

**Files:**
- Create: `netlify.toml`

- [ ] **Step 1: Create Netlify config**

Write this exact file at repository root:

```toml
[build]
  base = "client"
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

- [ ] **Step 2: Build frontend locally**

Run:

```bash
cd client && npm run build
```

Expected: Vite build completes and writes `client/dist/`. `client/dist/` remains ignored by Git.

### Task 4: Add Render backend deployment config

**Files:**
- Create: `render.yaml`

- [ ] **Step 1: Create Render Blueprint**

Write this exact file at repository root:

```yaml
services:
  - type: web
    name: fco-hub-api
    runtime: node
    rootDir: server
    plan: free
    buildCommand: npm install
    startCommand: npm start
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: ENABLE_BACKGROUND_SYNC
        value: "false"
      - key: CLIENT_URL
        sync: false
      - key: MONGODB_URI
        sync: false
```

- [ ] **Step 2: Validate backend package scripts**

Run:

```bash
cd server && npm run
```

Expected: output lists `start`, `dev`, and `test`; `start` runs `node src/server.js`.

### Task 5: Add environment templates

**Files:**
- Create: `.env.example`
- Create: `server/.env.example`

- [ ] **Step 1: Create root frontend env template**

Write this exact file at repository root:

```dotenv
# Netlify frontend variable. Set this to the Render backend base URL.
VITE_API_URL=https://your-render-service.onrender.com
```

- [ ] **Step 2: Create backend env template**

Write this exact file at `server/.env.example`:

```dotenv
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/fco-hub
CLIENT_URL=http://localhost:5173
ENABLE_BACKGROUND_SYNC=false
NEXON_METADATA_SYNC_CRON=0 4 * * *
FIFAADDICT_SYNC_CRON=*/30 * * * *
```

- [ ] **Step 3: Confirm secrets are not staged**

Run:

```bash
git status --short server/.env .env client/.env
```

Expected: no tracked/staged secret files appear.

### Task 6: Verify frontend API URL behavior

**Files:**
- Inspect: `client/src/**`
- Modify only if needed: frontend API helper files that hardcode localhost/backend URLs.

- [ ] **Step 1: Search for backend URL usage**

Run:

```bash
rg "localhost:5000|127\.0\.0\.1:5000|/api/|VITE_API_URL" client/src
```

Expected: identify API call locations.

- [ ] **Step 2: If API base URL is hardcoded, update to Vite env fallback**

For each API helper that builds backend URLs, use this pattern:

```js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
```

Then call backend routes with:

```js
`${API_BASE_URL}/api/health`
```

or equivalent route paths. Do not change UI behavior beyond replacing hardcoded backend origins.

- [ ] **Step 3: Rebuild frontend**

Run:

```bash
cd client && npm run build
```

Expected: build passes.

### Task 7: Commit source and deployment config safely

**Files:**
- Stage source/config/docs only.

- [ ] **Step 1: Review untracked files**

Run:

```bash
git status --short
```

Expected: source directories and deployment config appear; ignored artifacts do not need staging.

- [ ] **Step 2: Stage safe files explicitly**

Run:

```bash
git add .gitignore netlify.toml render.yaml .env.example client server docs/superpowers/specs/2026-06-17-monorepo-deployment-design.md docs/superpowers/plans/2026-06-17-monorepo-deployment.md
```

Expected: no `node_modules`, `.env`, logs, screenshots, or `client/dist` are staged.

- [ ] **Step 3: Inspect staged file list**

Run:

```bash
git diff --cached --name-only
```

Expected: staged files include app source, package manifests, lockfiles, deployment config, and docs. Staged files must not include `server/.env`, `node_modules`, `client/dist`, `.playwright-mcp`, log files, or screenshots.

- [ ] **Step 4: Commit**

Run:

```bash
git commit -m "chore: prepare monorepo deployment"
```

Expected: commit succeeds.

### Task 8: Push to GitHub

**Files:**
- Git remote: `origin` at `https://github.com/19anim/fco-hub.git`

- [ ] **Step 1: Push current branch**

Run:

```bash
git push -u origin master
```

Expected: GitHub receives the commit. If remote rejects because the default branch is `main`, push with:

```bash
git push -u origin master:main
```

only after confirming the repository's intended default branch.

### Task 9: Deploy on Netlify and Render

**Files:**
- Uses committed GitHub repository and platform dashboards/CLIs.

- [ ] **Step 1: Netlify deployment settings**

In Netlify, create/import a site from `https://github.com/19anim/fco-hub` with these settings:

```text
Base directory: client
Build command: npm run build
Publish directory: dist
Environment variable:
  VITE_API_URL=https://<render-service-name>.onrender.com
```

Expected: Netlify deploy succeeds and returns a public frontend URL.

- [ ] **Step 2: Render deployment settings**

In Render, create a web service or Blueprint from `https://github.com/19anim/fco-hub` with these settings:

```text
Root directory: server
Runtime: Node
Build command: npm install
Start command: npm start
Health check path: /api/health
Environment variables:
  NODE_ENV=production
  MONGODB_URI=<production MongoDB URI>
  CLIENT_URL=https://<netlify-site>.netlify.app
  ENABLE_BACKGROUND_SYNC=false
```

Expected: Render deploy succeeds and `/api/health` returns JSON with `success: true`.

- [ ] **Step 3: Final deployed verification**

Open:

```text
https://<render-service-name>.onrender.com/api/health
https://<netlify-site>.netlify.app
```

Expected: backend health endpoint succeeds, frontend loads, and browser console shows no CORS errors.

---

## Self-Review

- Spec coverage: The plan covers safe ignore rules, monorepo deployment, Netlify frontend settings, Render backend settings, environment variables, verification, commit, push, and deploy.
- Placeholder scan: No `TBD`, `TODO`, or unspecified implementation placeholders remain. Platform-specific URLs use explicit `<...>` values because they are created by Netlify/Render during deployment.
- Type consistency: Deployment variable names match the code/spec: `CLIENT_URL`, `MONGODB_URI`, `PORT`, `ENABLE_BACKGROUND_SYNC`, and `VITE_API_URL`.
