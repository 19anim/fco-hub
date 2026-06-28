# Monetization Admin: Player Filter + Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a player autocomplete filter and owner-only delete button (with confirmation modal) to `/admin/monetization`.

**Architecture:** Backend gets a new `linkedPlayerId` query param that filters on the embedded `linkedEntities.entityId` field. Frontend adds autocomplete player search state + a delete confirmation modal inline in `MonetizationListPage`. No new files needed.

**Tech Stack:** React 18, Tailwind (project token classes), Axios, Express/Mongoose, Lucide-react icons.

## Global Constraints

- Use project CSS tokens (`bg-surface-1`, `text-ink-muted`, `border-hairline`, `btn-primary`, etc.) — no raw Tailwind colors except where existing code already uses them (e.g. `text-red-400`)
- Icons from `lucide-react` only
- No new files — all changes go into existing files listed below
- Admin role check via `useAdminAuth()` context; owner role string is `'owner'`
- `adminMonetizationService.delete(id)` already exists in `client/src/services/adminMonetization.js`
- Backend delete endpoint already exists: `DELETE /admin/monetization/:id` (blocks if status is `'published'`)

---

## Files Modified

| File | What changes |
|------|-------------|
| `server/src/controllers/adminMonetization.controller.js` | Accept + apply `linkedPlayerId` filter in `listItems` |
| `client/src/pages/admin/MonetizationListPage.jsx` | Player autocomplete filter state + UI; delete state + modal + button |

---

### Task 1: Backend — `linkedPlayerId` filter in `listItems`

**Files:**
- Modify: `server/src/controllers/adminMonetization.controller.js:6-34`

**Interfaces:**
- Produces: `GET /admin/monetization?linkedPlayerId=<entityId>` returns only items where `linkedEntities` array contains an entry with `entityId === linkedPlayerId`

- [ ] **Step 1: Add the filter**

In `listItems`, after the existing `if (search)` line (line ~15), add:

```js
if (linkedPlayerId) filter['linkedEntities.entityId'] = linkedPlayerId;
```

Also destructure `linkedPlayerId` from `req.query`:

```js
const { status, type, platform, placementId, linkedPlayerId, search, sort = 'newest', page = 1, limit = 20 } = req.query;
```

Full updated function (only showing changed lines in context):

```js
export const listItems = async (req, res) => {
  try {
    const { status, type, platform, placementId, linkedPlayerId, search, sort = 'newest', page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (platform) filter.platform = platform;
    if (placementId) filter.placementIds = placementId;
    if (linkedPlayerId) filter['linkedEntities.entityId'] = linkedPlayerId;
    if (search) filter.title = { $regex: search, $options: 'i' };

    // ... rest unchanged
```

- [ ] **Step 2: Manual smoke test**

Start the server. Call:
```
GET /admin/monetization?linkedPlayerId=SOME_ENTITY_ID
```
Expected: returns only items whose `linkedEntities` array contains `{ entityId: "SOME_ENTITY_ID" }`. If no match, returns `{ items: [], total: 0 }`.

- [ ] **Step 3: Commit**

```bash
cd D:/ReactJS/fco-hub
rtk git add server/src/controllers/adminMonetization.controller.js
rtk git commit -m "feat: filter monetization list by linked player entityId"
```

---

### Task 2: Frontend — Player autocomplete filter

**Files:**
- Modify: `client/src/pages/admin/MonetizationListPage.jsx`

**Interfaces:**
- Consumes: `GET /admin/search/players?q=<string>&limit=10` → `{ data: { players: [{ spid, name, pid, ... }] } }`
- Consumes: `adminMonetizationService.list({ linkedPlayerId: string, ... })` — passes through to backend as query param

- [ ] **Step 1: Add imports and state**

Add to imports at top of file:
```jsx
import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { DollarSign, Plus, Copy, Archive, Eye, EyeOff, Pencil, X, Trash2 } from 'lucide-react';
import { API_BASE } from '../../config/api';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
```

Add inside `MonetizationListPage` component, after existing state declarations:
```jsx
const { user } = useAdminAuth();

// Player filter state
const [playerQuery, setPlayerQuery] = useState('');
const [playerSuggestions, setPlayerSuggestions] = useState([]);
const [playerFilterLabel, setPlayerFilterLabel] = useState('');
const playerDebounceRef = useRef(null);
```

Also add `linkedPlayerId: ''` to the initial `filters` state:
```jsx
const [filters, setFilters] = useState({ search: '', type: '', status: '', platform: '', sort: 'newest', linkedPlayerId: '' });
```

- [ ] **Step 2: Add debounced player search effect**

After the `useEffect` that calls `fetchItems`, add:

```jsx
useEffect(() => {
  if (!playerQuery || playerFilterLabel) {
    setPlayerSuggestions([]);
    return;
  }
  clearTimeout(playerDebounceRef.current);
  playerDebounceRef.current = setTimeout(async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/search/players`, {
        params: { q: playerQuery, limit: 10 },
        withCredentials: true,
      });
      setPlayerSuggestions(res.data.data.players ?? []);
    } catch {
      setPlayerSuggestions([]);
    }
  }, 300);
  return () => clearTimeout(playerDebounceRef.current);
}, [playerQuery, playerFilterLabel]);
```

- [ ] **Step 3: Add player filter UI to filter bar**

Replace the existing `<div className="flex flex-wrap gap-2">` block's closing tag area. Add this new element inside that div, after the Sort select:

```jsx
{/* Player filter */}
<div className="relative">
  <div className="flex items-center h-9 rounded-lg border border-hairline bg-surface-1 px-3 gap-1.5 min-w-[200px]">
    <input
      type="text"
      placeholder="Filter by player..."
      value={playerFilterLabel || playerQuery}
      onChange={(e) => {
        setPlayerFilterLabel('');
        setFilters((f) => ({ ...f, linkedPlayerId: '' }));
        setPlayerQuery(e.target.value);
      }}
      className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-subtle"
    />
    {(playerFilterLabel || playerQuery) && (
      <button
        onClick={() => {
          setPlayerQuery('');
          setPlayerFilterLabel('');
          setPlayerSuggestions([]);
          setFilters((f) => ({ ...f, linkedPlayerId: '' }));
        }}
        className="text-ink-muted hover:text-ink transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
  {playerSuggestions.length > 0 && (
    <div className="absolute top-full left-0 z-20 mt-1 w-64 rounded-xl border border-hairline bg-surface-1 shadow-lg overflow-hidden">
      {playerSuggestions.map((p) => (
        <button
          key={p.spid ?? p._id}
          onClick={() => {
            const label = p.name || p.spid;
            setPlayerFilterLabel(label);
            setPlayerQuery('');
            setPlayerSuggestions([]);
            setFilters((f) => ({ ...f, linkedPlayerId: String(p.spid ?? p._id) }));
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-surface-2 transition-colors text-left"
        >
          <span className="font-medium truncate">{p.name}</span>
          {p.spid && <span className="text-xs text-ink-muted shrink-0">#{p.spid}</span>}
        </button>
      ))}
    </div>
  )}
</div>
```

- [ ] **Step 4: Verify filter works end-to-end**

Run the dev server. Go to `/admin/monetization`. Type a player name in the new input. Confirm:
- Suggestions dropdown appears
- Selecting a player shows their name in the input and an X button
- The table re-fetches and shows only items linked to that player
- Clicking X resets to full list

- [ ] **Step 5: Commit**

```bash
rtk git add client/src/pages/admin/MonetizationListPage.jsx
rtk git commit -m "feat: add player autocomplete filter to monetization list"
```

---

### Task 3: Frontend — Delete button + confirmation modal

**Files:**
- Modify: `client/src/pages/admin/MonetizationListPage.jsx`

**Interfaces:**
- Consumes: `adminMonetizationService.delete(id): Promise<{ success: boolean, message: string }>`
- Consumes: `user.role` from `useAdminAuth()` — already added in Task 2
- `Trash2` icon already imported in Task 2

- [ ] **Step 1: Add delete state**

Inside `MonetizationListPage`, after the `actionLoading` state, add:

```jsx
const [deleteTarget, setDeleteTarget] = useState(null); // item to delete, null = modal closed
const [deleteError, setDeleteError] = useState('');
const [deleteLoading, setDeleteLoading] = useState(false);
```

- [ ] **Step 2: Add handleDelete function**

After the `handleAction` function, add:

```jsx
const handleDelete = async () => {
  if (!deleteTarget) return;
  setDeleteLoading(true);
  setDeleteError('');
  try {
    await adminMonetizationService.delete(deleteTarget._id);
    setItems((prev) => prev.filter((i) => i._id !== deleteTarget._id));
    setTotal((t) => t - 1);
    setDeleteTarget(null);
  } catch (err) {
    setDeleteError(err.response?.data?.message || 'Xoá thất bại');
  } finally {
    setDeleteLoading(false);
  }
};
```

- [ ] **Step 3: Add Delete button in action row**

Inside the table row's action div, after the Archive button block (after line 216 in original), add:

```jsx
{user?.role === 'owner' && (
  <button
    onClick={() => { setDeleteError(''); setDeleteTarget(item); }}
    disabled={!!actionLoading || item.status === 'published'}
    className="rounded-lg p-1.5 text-ink-muted hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
    title={item.status === 'published' ? 'Unpublish trước khi xoá' : 'Xoá'}
  >
    <Trash2 className="h-3.5 w-3.5" />
  </button>
)}
```

- [ ] **Step 4: Add confirmation modal**

At the very end of the returned JSX, just before the closing outer `</div>`, add:

```jsx
{/* Delete confirmation modal */}
{deleteTarget && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="w-full max-w-sm rounded-2xl border border-hairline bg-surface-1 p-6 shadow-xl mx-4">
      <h2 className="text-base font-semibold text-ink mb-1">Xoá item này?</h2>
      <p className="text-sm text-ink-muted mb-1">
        <span className="font-medium text-ink">{deleteTarget.title}</span>
      </p>
      <p className="text-xs text-ink-subtle mb-4">
        Status: {deleteTarget.status} · Thao tác này không thể hoàn tác.
      </p>
      {deleteError && (
        <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{deleteError}</p>
      )}
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => { setDeleteTarget(null); setDeleteError(''); }}
          disabled={deleteLoading}
          className="rounded-lg border border-hairline bg-surface-2 px-4 py-2 text-sm text-ink hover:bg-surface-3 transition-colors disabled:opacity-50"
        >
          Huỷ
        </button>
        <button
          onClick={handleDelete}
          disabled={deleteLoading}
          className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-wait"
        >
          {deleteLoading ? 'Đang xoá...' : 'Xoá'}
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 5: Test delete flow**

Go to `/admin/monetization` logged in as an `owner` account. Verify:
- Trash icon appears on each row
- Trash icon is dimmed and non-clickable for `published` items
- Clicking Trash opens the modal with item name and status
- Clicking Huỷ closes modal without changes
- Clicking Xoá removes the item from the list and decrements the count
- If you try to delete a `published` item via API directly, confirm backend returns 400 error and modal shows it

Log in as a non-owner admin. Verify Trash icon does not appear at all.

- [ ] **Step 6: Commit**

```bash
rtk git add client/src/pages/admin/MonetizationListPage.jsx
rtk git commit -m "feat: add owner-only delete button with confirmation modal to monetization list"
```
