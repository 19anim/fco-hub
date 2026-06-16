# Monorepo Deployment Design

## Goal

Publish the current FCO Hub project to GitHub without destructive cleanup, then deploy the React frontend on Netlify and the Express backend on Render.

## Architecture

Keep the project as a single GitHub monorepo with two independently deployable apps:

- `client/`: Vite React frontend deployed by Netlify.
- `server/`: Node/Express backend deployed by Render.

Netlify and Render both support this layout through base/root directory configuration, so splitting into separate repositories is unnecessary.

## Repository Safety

The repository should include source code, package manifests, lockfiles, deployment configuration, and useful documentation. It should exclude generated or machine-local artifacts such as `node_modules/`, build output, environment files, logs, Playwright local cache, and screenshots.

No app files should be deleted. Cleanup should be done through `.gitignore` and selective staging, not destructive filesystem removal.

## Frontend Deployment

Netlify should build from `client/` using:

- Base directory: `client`
- Build command: `npm run build`
- Publish directory: `client/dist` when configured from repo root, or `dist` when configured with `client` as the base.

The frontend should read the backend API URL from a Vite environment variable, expected to be `VITE_API_URL`, if the app code already supports that. If the frontend currently hardcodes local backend URLs, deployment must update the app to use the environment variable while preserving localhost behavior for development.

## Backend Deployment

Render should deploy the backend as a Node web service from `server/` using:

- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`

Render must provide production environment variables, including MongoDB connection details and the eventual frontend URL for CORS via `CLIENT_URL`. The existing server already reads `process.env.PORT`, which is compatible with Render.

## Data Flow

Browser users load the static frontend from Netlify. The frontend calls the Render backend over HTTPS. The backend connects to MongoDB and external data sources, then returns JSON through `/api/*` routes. CORS allows localhost for development and the deployed Netlify URL in production through `CLIENT_URL`.

## Verification

Before pushing, run frontend build and backend install/start checks where practical. After deployment, verify:

- Netlify frontend loads.
- Render backend `/api/health` returns success.
- Frontend API calls use the Render URL.
- Browser console has no CORS errors.

## Rollback

Because no local files are deleted, rollback is handled through Git. If a deployment config causes issues, revert the deployment config commit or update service settings in Netlify/Render.
