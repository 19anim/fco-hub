# Aggressive Safe Cleanup Design

## Goal

Clean the repository so the working folder contains only the current web app and files needed to run, develop, or deploy it. The current web app includes both the Vite React frontend in `client/` and the Express backend in `server/`.

## Keep

- `client/`: the active frontend app, including source, package files, Vite config, public assets, tests, and lockfile.
- `server/`: the active backend API used by the frontend, including source, scripts, package files, env example, and lockfile.
- Root config needed for the app or repo hygiene: `.gitignore`, `.env.example`, `docker-compose.yml`.
- `.claude/`: project workflow/config files used by the current development process.

## Remove

- `client/client/`: duplicate nested Vite package files with no source and no tracked files.
- `9router_data/`: untracked runtime data containing machine/runtime files such as `jwt-secret`; it does not belong in the app repo.
- Root debug and screenshot images generated during UI work, including `after-*.png`, `dropdown-*.png`, `fco-*.png`, `detail-*.png`, badge/card/page/state screenshots, and similar visual test artifacts.
- `docs/superpowers/`: old specs and implementation plans that are not required to run the current web app.
- Root temporary notes such as `DISCOVERY_FIX.md` when they are only historical debugging notes.

## Safety Rules

- Delete by explicit path or narrow glob groups only; do not use broad destructive cleanup commands.
- Preserve `client/` and `server/` completely except for the duplicate `client/client/` directory.
- Do not delete env examples, package lockfiles, app config files, or source files.
- Show `git status` after cleanup so the removal set is visible before any commit.
- Do not create a commit unless the user explicitly asks for one.

## Verification

After cleanup:

1. Run the frontend test suite from `client/` if dependencies are installed.
2. Run the frontend production build from `client/`.
3. Run a lightweight backend verification from `server/`, preferring an available syntax/start check that does not require external services.
4. Report any verification command that cannot run because dependencies, database, or env variables are missing.

## Success Criteria

- The repo root is no longer cluttered with screenshots, debug images, old plans/specs, duplicate package files, or runtime data.
- `client/` and `server/` remain intact as the active web application.
- Frontend build/test and backend verification either pass or produce only clearly explained environment-related blockers.
- The final working tree diff contains only the intended cleanup removals and the cleanup spec file unless the user requests additional changes.
