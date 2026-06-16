# FCO Event Opener Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Sự kiện" view to the running FcoApp that lists currently-valid FCO events with bulk-open buttons (Mở tất cả / Chỉ sự kiện / Chỉ tin tức), fixing the "stale event" bug client-side.

**Architecture:** Frontend-only. A new pure helper module (`eventHelpers.js`) does date-based validity filtering + grouping + sequential popup opening (no React, easy to reason about). A new `EventsView.jsx` consumes it and renders grouped cards. `api.js` gains `fetchEvents()`. `FcoApp.jsx` wires a nav item + route. No `server/` changes.

**Tech Stack:** React 19, Vite 8, axios, existing `fco.css` design tokens, existing `Icons.jsx` (Calendar/Refresh/External/Alert/Clock/Spinner already exist), existing `ui.jsx` (Button, EmptyState, SkeletonRow).

**Note on testing:** This project has **no test runner** (only `eslint` + `vite build`). Verification per task = `npm run lint` (no new errors) + `npm run build` (succeeds) + the manual browser check described. Pure logic is isolated in `eventHelpers.js` so behavior is inspectable.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `client/src/fco/eventHelpers.js` | **New.** Pure functions: `filterValidEvents`, `groupEvents`, `daysUntil`, `openSequentially`. No React. |
| `client/src/fco/api.js` | **Modify.** Add `fetchEvents()`. |
| `client/src/fco/views/EventsView.jsx` | **New.** The view: fetch, group, render cards + bulk-open bar + popup-blocked banner. |
| `client/src/fco/FcoApp.jsx` | **Modify.** Add nav item `events` + render branch passing `showToast`. |
| `client/src/fco/fco.css` | **Modify.** Add a few `.fco-ev-*` classes for cards/bar/banner. |

All work runs from `client/`. Commands assume CWD = `d:\ReactJS\fco-hub\client`.

---

## Task 1: Pure event helpers

**Files:**
- Create: `client/src/fco/eventHelpers.js`

- [ ] **Step 1: Create the helper module**

Create `client/src/fco/eventHelpers.js`:

```js
// Pure helpers for the Events view. No React, no DOM side effects except openSequentially.

const DAY_MS = 24 * 60 * 60 * 1000;

// Midnight today, local time.
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Whole days from today until the given date (can be negative). null if no date.
export function daysUntil(endDate) {
  if (!endDate) return null;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return null;
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - startOfToday().getTime()) / DAY_MS);
}

// Keep events that are still valid TODAY, regardless of the stale `status` column.
// Valid = has a future/today endDate, OR is Unknown (no public end date).
export function filterValidEvents(events) {
  const today = startOfToday().getTime();
  return (events || []).filter((e) => {
    if (e.endDate) {
      const end = new Date(e.endDate);
      if (Number.isNaN(end.getTime())) return e.status === 'Unknown';
      end.setHours(0, 0, 0, 0);
      return end.getTime() >= today;
    }
    return e.status === 'Unknown';
  });
}

// Split valid events into three ordered buckets for display.
// expiring: endDate within 3 days. ongoing: later endDate. unknown: no endDate.
export function groupEvents(events) {
  const expiring = [];
  const ongoing = [];
  const unknown = [];
  for (const e of events) {
    const d = daysUntil(e.endDate);
    if (d === null) unknown.push(e);
    else if (d <= 3) expiring.push(e);
    else ongoing.push(e);
  }
  const byEnd = (a, b) => new Date(a.endDate) - new Date(b.endDate);
  expiring.sort(byEnd);
  ongoing.sort(byEnd);
  return { expiring, ongoing, unknown };
}

// Open a list of URLs in new tabs, one every `gapMs`, to reduce popup blocking.
// Calls onBlocked() if the first window.open returns null (browser blocked it).
// Returns a cancel function.
export function openSequentially(urls, { gapMs = 300, onBlocked, onDone } = {}) {
  let i = 0;
  let cancelled = false;
  function next() {
    if (cancelled || i >= urls.length) { if (!cancelled) onDone?.(); return; }
    const win = window.open(urls[i], '_blank', 'noopener');
    if (i === 0 && !win) { onBlocked?.(); return; }
    i += 1;
    setTimeout(next, gapMs);
  }
  next();
  return () => { cancelled = true; };
}
```

- [ ] **Step 2: Lint the new file**

Run: `npm run lint`
Expected: PASS (no errors referencing `eventHelpers.js`).

- [ ] **Step 3: Sanity-check the logic in the browser console (manual)**

Start dev server if not running: `npm run dev`. In the browser console on the app, paste:

```js
import('/src/fco/eventHelpers.js').then(m => {
  const today = new Date(); const future = new Date(Date.now()+5*864e5); const past = new Date(Date.now()-864e5);
  const sample = [
    { title:'future', endDate: future, status:'Active' },
    { title:'past',   endDate: past,   status:'Active' },
    { title:'unknown',endDate: null,   status:'Unknown' },
  ];
  const valid = m.filterValidEvents(sample);
  console.log('valid titles:', valid.map(e=>e.title)); // expect ['future','unknown']
  console.log('groups:', m.groupEvents(valid));
});
```

Expected: `valid titles: ['future','unknown']` — the past event is dropped.

- [ ] **Step 4: Commit**

(Not a git repo — skip commit. Confirm file saved.)

---

## Task 2: Add `fetchEvents()` to api.js

**Files:**
- Modify: `client/src/fco/api.js`

- [ ] **Step 1: Append the fetch function**

Add to the end of `client/src/fco/api.js` (after `fetchMeta`):

```js
export async function fetchEvents() {
  const res = await axios.get(`${BASE}/events`);
  return res.data?.data || [];
}
```

(`BASE` is already defined at the top as `http://localhost:5000/api`. `axios` is already imported.)

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Verify the endpoint returns data (manual)**

With BE running, in browser console:

```js
import('/src/fco/api.js').then(m => m.fetchEvents().then(d => console.log('events:', d.length, d[0])));
```

Expected: logs a count and the first event object with `title`, `launchUrl`, `isSubdomain`, `isNewsPage`, `endDate`, `status`.

- [ ] **Step 4: Commit** — skip (not a git repo).

---

## Task 3: Add CSS for the Events view

**Files:**
- Modify: `client/src/fco/fco.css`

- [ ] **Step 1: Append styles**

Append to the end of `client/src/fco/fco.css`:

```css
/* ── Events view ─────────────────────────────────────────── */
.fco-ev-bar { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 20px; }
.fco-ev-group { margin-bottom: 26px; }
.fco-ev-group-title { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; margin-bottom: 10px; color: var(--text-muted); }
.fco-ev-group-title.warn { color: #ff8a3d; }
.fco-ev-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
.fco-ev-card { display: flex; flex-direction: column; gap: 8px; padding: 14px; border: 1px solid var(--border, #2a313c); border-radius: 12px; background: var(--surface-1, #161a20); }
.fco-ev-card.warn { border-color: #ff8a3d55; }
.fco-ev-card-title { font-size: 14px; font-weight: 700; line-height: 1.35; }
.fco-ev-card-meta { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-faint, #8a93a0); }
.fco-ev-countdown { font-size: 12px; font-weight: 700; }
.fco-ev-countdown.warn { color: #ff8a3d; }
.fco-ev-tag { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; padding: 2px 7px; border-radius: 999px; background: var(--surface-2, #1f242c); color: var(--text-muted); width: fit-content; }
.fco-ev-card-foot { margin-top: auto; }
.fco-ev-banner { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border: 1px solid #ff8a3d55; background: #ff8a3d14; border-radius: 10px; margin-bottom: 16px; font-size: 13px; }
```

(Uses existing design-token variables with fallbacks so it works even if a token name differs.)

- [ ] **Step 2: Lint + build**

Run: `npm run build`
Expected: build succeeds (CSS is valid).

- [ ] **Step 3: Commit** — skip (not a git repo).

---

## Task 4: Build EventsView.jsx

**Files:**
- Create: `client/src/fco/views/EventsView.jsx`

- [ ] **Step 1: Create the view**

Create `client/src/fco/views/EventsView.jsx`:

```jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { fetchEvents } from '../api.js';
import { filterValidEvents, groupEvents, daysUntil, openSequentially } from '../eventHelpers.js';
import { Button, EmptyState, SkeletonRow } from '../ui.jsx';
import * as I from '../Icons.jsx';

function Countdown({ endDate }) {
  const d = daysUntil(endDate);
  if (d === null) return <span className="fco-ev-tag">Chưa rõ hạn</span>;
  const warn = d <= 3;
  const label = d <= 0 ? 'Hết hạn hôm nay' : `Còn ${d} ngày`;
  return <span className={`fco-ev-countdown${warn ? ' warn' : ''}`}>⏳ {label}</span>;
}

function EventCard({ ev, warn }) {
  const kind = ev.isSubdomain ? 'Sự kiện' : ev.isNewsPage ? 'Tin tức' : '—';
  return (
    <div className={`fco-ev-card${warn ? ' warn' : ''}`}>
      <span className="fco-ev-tag">{kind}</span>
      <div className="fco-ev-card-title">{ev.title}</div>
      <div className="fco-ev-card-meta"><I.Calendar size={13} /> {ev.dateLabel}</div>
      <Countdown endDate={ev.endDate} />
      <div className="fco-ev-card-foot">
        <Button variant="default" size="sm" iconRight={I.External}
          onClick={() => window.open(ev.launchUrl, '_blank', 'noopener')}>
          Mở
        </Button>
      </div>
    </div>
  );
}

function Group({ title, warn, events }) {
  if (!events.length) return null;
  return (
    <div className="fco-ev-group">
      <div className={`fco-ev-group-title${warn ? ' warn' : ''}`}>
        {warn ? <I.Alert size={14} /> : <I.Clock size={14} />} {title} ({events.length})
      </div>
      <div className="fco-ev-grid">
        {events.map((ev) => <EventCard key={ev.launchUrl} ev={ev} warn={warn} />)}
      </div>
    </div>
  );
}

export default function EventsView({ showToast }) {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [blocked, setBlocked] = useState(false);
  const cancelRef = useRef(null);

  function load() {
    setLoading(true); setError(false);
    fetchEvents()
      .then((raw) => setEvents(filterValidEvents(raw)))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); return () => cancelRef.current?.(); }, []);

  const groups = useMemo(() => groupEvents(events), [events]);
  const counts = useMemo(() => ({
    events: events.filter((e) => e.isSubdomain).length,
    news:   events.filter((e) => e.isNewsPage).length,
  }), [events]);

  function openMany(list, label) {
    if (!list.length) { showToast?.('Không có mục nào để mở'); return; }
    setBlocked(false);
    showToast?.(`Đang mở ${list.length} ${label}...`, 'success');
    cancelRef.current = openSequentially(
      list.map((e) => e.launchUrl),
      { onBlocked: () => { setBlocked(true); showToast?.('Popup bị chặn'); } }
    );
  }

  if (loading) {
    return (
      <div className="fco-db">
        <h2 className="fco-h2">Sự kiện</h2>
        <div className="fco-ev-grid" style={{ marginTop: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState icon={I.Alert} title="Không tải được sự kiện"
        body="Kiểm tra kết nối tới máy chủ rồi thử lại."
        action={<Button icon={I.Refresh} onClick={load}>Thử lại</Button>}
      />
    );
  }

  if (!events.length) {
    return (
      <EmptyState icon={I.Calendar} title="Hiện không có sự kiện nào còn hiệu lực"
        action={<Button icon={I.Refresh} onClick={load}>Tải lại</Button>}
      />
    );
  }

  return (
    <div className="fco-db">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 className="fco-h2" style={{ marginBottom: 4 }}>Sự kiện FCO còn hiệu lực</h2>
          <p className="fco-sub" style={{ margin: 0 }}>
            <b>{counts.events}</b> sự kiện · <b>{counts.news}</b> tin tức
          </p>
        </div>
        <Button variant="ghost" size="sm" icon={I.Refresh} onClick={load}>Tải lại</Button>
      </div>

      <div className="fco-ev-bar">
        <Button icon={I.External} onClick={() => openMany(events, 'trang')}>
          Mở tất cả ({events.length})
        </Button>
        <Button variant="ghost" onClick={() => openMany(events.filter((e) => e.isSubdomain), 'sự kiện')}>
          Chỉ sự kiện ({counts.events})
        </Button>
        <Button variant="ghost" onClick={() => openMany(events.filter((e) => e.isNewsPage), 'tin tức')}>
          Chỉ tin tức ({counts.news})
        </Button>
      </div>

      {blocked && (
        <div className="fco-ev-banner">
          <I.Alert size={16} style={{ color: '#ff8a3d', flex: '0 0 16px' }} />
          <span>Trình duyệt đã chặn popup. Hãy cho phép popup cho trang này rồi bấm mở lại.</span>
        </div>
      )}

      <Group title="Sắp hết hạn" warn events={groups.expiring} />
      <Group title="Đang diễn ra" events={groups.ongoing} />
      <Group title="Chưa rõ hạn" events={groups.unknown} />
    </div>
  );
}
```

- [ ] **Step 2: Verify `Button` supports the props used**

Confirm `ui.jsx` `Button` accepts `variant`, `size`, `icon`, `iconRight` — it does (signature: `Button({ variant, size, icon: Ico, iconRight: IcoR, ... })`). Confirm `EmptyState` accepts `action` — it does.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit** — skip (not a git repo).

---

## Task 5: Wire EventsView into FcoApp

**Files:**
- Modify: `client/src/fco/FcoApp.jsx`

- [ ] **Step 1: Import the view**

In `client/src/fco/FcoApp.jsx`, after the other view imports (around line 8), add:

```jsx
import EventsView from './views/EventsView.jsx';
```

- [ ] **Step 2: Add the nav item**

Change the `NAV_ITEMS` array (lines 11-15) to include Events as the second item:

```jsx
const NAV_ITEMS = [
  { id: 'db',        label: 'Database',   icon: I.Database  },
  { id: 'events',    label: 'Sự kiện',    icon: I.Calendar  },
  { id: 'compare',   label: 'So sánh',    icon: I.Compare   },
  { id: 'watchlist', label: 'Theo dõi',   icon: I.Star      },
];
```

- [ ] **Step 3: Add the render branch**

In the `<main className="fco-main">` block, after the `activeView === 'db'` branch (around line 166), add:

```jsx
        {activeView === 'events' && (
          <EventsView showToast={showToast} />
        )}
```

- [ ] **Step 4: Lint + build**

Run: `npm run lint && npm run build`
Expected: both PASS.

- [ ] **Step 5: Manual end-to-end check**

`npm run dev`, open the app, click the **Sự kiện** nav item (or go to `#/events`). Verify:
- Events load and grouped headers show (Sắp hết hạn / Đang diễn ra / Chưa rõ hạn as applicable).
- No expired event appears (cross-check an event whose `endDate` is in the past — it should be absent).
- **Mở tất cả** opens the first tab; if the browser blocks the rest, the orange banner appears.
- **Chỉ sự kiện** opens only `isSubdomain` links; **Chỉ tin tức** opens only `isNewsPage` links.
- **Tải lại** re-fetches.

- [ ] **Step 6: Commit** — skip (not a git repo).

---

## Self-Review Notes

- **Spec coverage:** §3 file changes → Tasks 1-5. §4 valid filtering → Task 1 `filterValidEvents` + Task 4 `load()`. §5.2 card → Task 4 `EventCard`. §5.3 grouping → Task 1 `groupEvents` + Task 4 `Group`. §5.4 bulk-open + popup detection → Task 1 `openSequentially` + Task 4 `openMany`/`blocked` banner. §5.5 loading/empty/error → Task 4. §6 FcoApp integration → Task 5.
- **No server changes** (spec §7 final criterion): only `client/` files touched. ✓
- **Type consistency:** helper names (`filterValidEvents`, `groupEvents`, `daysUntil`, `openSequentially`) identical across Task 1 definition and Task 4 usage. Group bucket names (`expiring`, `ongoing`, `unknown`) consistent. ✓
- **Icons:** `Calendar`, `Refresh`, `External`, `Alert`, `Clock` all confirmed present in `Icons.jsx`. ✓
- **Testing adaptation:** no test runner exists; each task verifies via `npm run lint` / `npm run build` / scripted browser-console checks instead of unit tests. Documented at top.
