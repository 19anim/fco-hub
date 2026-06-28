# Clean Public Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the public FCO app's hash URLs with clean path URLs while keeping admin routes unchanged.

**Architecture:** `App.jsx` continues to own top-level React Router routes, including `/admin/*`. `FcoApp.jsx` keeps its existing internal view state, but reads and writes `window.location.pathname` instead of `window.location.hash`, with one-time migration from legacy hash URLs.

**Tech Stack:** React 19, React Router DOM 7, Vite, browser History API.

## Global Constraints

- Keep `/admin`, `/admin/login`, `/admin/change-password`, and all `/admin/*` routes unchanged.
- Use `/players` for the public player database/list route instead of `/db`.
- Use `/players/:id` for player detail routes.
- Keep list filters in `window.location.search`, e.g. `/players?search=messi&pos=FWD`.
- Migrate legacy hash URLs such as `/#/db` and `/#/detail/abc123` to clean path URLs on first load.
- Do not add dependencies.

---

### Task 1: Replace FCO hash parsing with path parsing

**Files:**
- Modify: `client/src/fco/FcoApp.jsx:24-62`

**Interfaces:**
- Produces: `parsePath(pathname?: string, hash?: string): { view: string, param: string | null, legacyPath: string | null }`
- Produces: `routeUrl(view: string, param?: string | null, options?: { keepSearch?: boolean }): string`
- Produces: `setPath(view: string, param?: string | null): void`
- Produces: `replacePath(view: string, param?: string | null): void`

- [ ] **Step 1: Replace the hash router helper block**

Replace `client/src/fco/FcoApp.jsx:24-62` with:

```jsx
const VIEW_PATHS = {
  db: '/players',
  events: '/events',
  upgrade: '/upgrade',
  compare: '/compare',
  watchlist: '/watchlist',
  dataops: '/dataops',
};

const LEGACY_VIEW_MAP = {
  db: 'db',
  detail: 'detail',
  events: 'events',
  upgrade: 'upgrade',
  compare: 'compare',
  watchlist: 'watchlist',
  dataops: 'dataops',
};

function parseLegacyHash(hash = window.location.hash) {
  const path = hash.replace(/^#\/?/, '').split('?')[0];
  const parts = path.split('/').filter(Boolean);
  const legacyView = parts[0];
  const view = LEGACY_VIEW_MAP[legacyView];

  if (!view) return null;

  if (view === 'detail') {
    return { view: 'detail', param: parts.slice(1).join('/') || null };
  }

  return { view, param: null };
}

function parsePath(pathname = window.location.pathname, hash = window.location.hash) {
  const legacyRoute = parseLegacyHash(hash);
  if (legacyRoute) {
    return { ...legacyRoute, legacyPath: routeUrl(legacyRoute.view, legacyRoute.param, { keepSearch: legacyRoute.view === 'db' }) };
  }

  const parts = pathname.split('/').filter(Boolean);
  const first = parts[0];

  if (!first) return { view: 'db', param: null, legacyPath: '/players' };
  if (first === 'players') return { view: parts[1] ? 'detail' : 'db', param: parts.slice(1).join('/') || null, legacyPath: null };
  if (VIEW_PATHS[first]) return { view: first, param: null, legacyPath: null };

  return { view: 'db', param: null, legacyPath: '/players' };
}

function routeUrl(view, param = null, { keepSearch = false } = {}) {
  const search = keepSearch ? window.location.search : '';

  if (view === 'detail' && param) {
    return `/players/${encodeURIComponent(param)}${search}`;
  }

  return `${VIEW_PATHS[view] || '/players'}${search}`;
}

function setPath(view, param = null) {
  const keepSearch = view === 'db';
  const next = routeUrl(view, param, { keepSearch });
  const current = `${window.location.pathname}${window.location.search}`;
  if (current !== next || window.location.hash) {
    window.history.pushState(null, '', next);
  }
}

function replacePath(view, param = null) {
  window.history.replaceState(null, '', routeUrl(view, param, { keepSearch: view === 'db' }));
}
```

- [ ] **Step 2: Review helper behavior manually**

Check these mappings in the code before moving on:

```text
/                  -> { view: 'db', legacyPath: '/players' }
/players           -> { view: 'db', legacyPath: null }
/players/abc123    -> { view: 'detail', param: 'abc123', legacyPath: null }
/events            -> { view: 'events', legacyPath: null }
/#/db              -> legacyPath '/players'
/#/detail/abc123   -> legacyPath '/players/abc123'
```

---

### Task 2: Wire FcoApp state to clean path helpers

**Files:**
- Modify: `client/src/fco/FcoApp.jsx:76-105`

**Interfaces:**
- Consumes: `parsePath`, `setPath`, `replacePath` from Task 1.
- Produces: `navigate(view: string, param?: string | null): void` backed by path URLs.

- [ ] **Step 1: Replace initial route state and popstate effect**

Replace the route state initialization and browser navigation effect with:

```jsx
  const [route,      setRoute]      = useState(() => parsePath());
```

```jsx
  useEffect(() => {
    function onPop() { setRoute(parsePath()); }
    window.addEventListener('popstate', onPop);

    const currentRoute = parsePath();
    if (currentRoute.legacyPath) {
      replacePath(currentRoute.view, currentRoute.param);
      setRoute(parsePath());
    }

    return () => window.removeEventListener('popstate', onPop);
  }, []);
```

- [ ] **Step 2: Replace navigation implementation**

Replace the existing `navigate` function with:

```jsx
  function navigate(view, param = null) {
    setPath(view, param);
    setRoute(parsePath());
  }
```

- [ ] **Step 3: Preserve detail selection behavior**

Confirm `selectPlayer(id)` still calls:

```jsx
  function selectPlayer(id) { navigate('detail', id); }
```

This should now navigate to `/players/:id` instead of `/#/detail/:id`.

---

### Task 3: Validate in the running app

**Files:**
- Verify: `client/src/fco/FcoApp.jsx`
- Verify: `client/src/App.jsx`

**Interfaces:**
- Consumes: clean public routes from Tasks 1-2.
- Produces: verified frontend behavior in Vite.

- [ ] **Step 1: Start backend if API-backed screens need data**

Run:

```bash
rtk npm run dev --prefix "D:/ReactJS/fco-hub/server"
```

Expected: server listens on port 5000 and `/api/health` responds.

- [ ] **Step 2: Start frontend**

Run:

```bash
rtk npm run dev --prefix "D:/ReactJS/fco-hub/client"
```

Expected: Vite serves the app on `http://localhost:5173`.

- [ ] **Step 3: Browser-check public routes**

Open these URLs and confirm the expected views render:

```text
http://localhost:5173/players       -> player database/list
http://localhost:5173/events        -> events view
http://localhost:5173/upgrade       -> upgrade view
http://localhost:5173/compare       -> compare view
http://localhost:5173/watchlist     -> watchlist view
http://localhost:5173/#/db          -> URL changes to /players and database/list renders
```

- [ ] **Step 4: Browser-check detail route**

From `/players`, click any player row.

Expected:

```text
URL becomes /players/<player-id>
Detail view renders
Browser Back returns to /players with prior filters if present
```

- [ ] **Step 5: Browser-check admin routes**

Open:

```text
http://localhost:5173/admin
http://localhost:5173/admin/login
```

Expected: admin routing remains unchanged and does not redirect to `/players`.

---

## Self-Review

- Spec coverage: `/players`, `/players/:id`, `/events`, `/upgrade`, `/compare`, `/watchlist`, optional `/dataops`, `/` redirect, query preservation, legacy hash migration, and unchanged `/admin/*` are covered.
- Placeholder scan: no placeholder steps remain.
- Type consistency: helper names and consumed interfaces are consistent across tasks.
