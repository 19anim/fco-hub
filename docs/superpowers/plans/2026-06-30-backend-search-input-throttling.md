# Backend Search Input Throttling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop backend-backed free-text search inputs from issuing expensive search requests on every keystroke, especially `/players` over 23,656 player records.

**Architecture:** Add small shared normalization/debounce utilities, apply them to every React text input that can trigger backend search, and repeat the same guard on server endpoints. Client code keeps raw input responsive while API params use debounced normalized text; server code trims, caps, escapes regex, and ignores one-character searches.

**Tech Stack:** React 19, Vite/Vitest client, axios, Express 4, Mongoose, node:test.

## Global Constraints

- Debounce delay for backend-backed free-text search is 400ms.
- Maximum backend search text length is 50 characters.
- Empty query preserves existing unfiltered-list behavior.
- One-character query must not trigger backend text search.
- Autocomplete components show empty suggestions for one-character queries.
- `/api/players`, `/api/admin/search/players`, and `/api/admin/monetization` must normalize and guard search server-side.
- Regex metacharacters must be escaped before building `$regex` filters.
- Select, range, sort, pagination, and page-size controls must continue to fetch immediately.
- Use `rtk` prefix for every shell command.

---

## File Structure

- Create `client/src/hooks/useDebouncedValue.js`
  - Owns generic React debounce behavior.
  - Exports `useDebouncedValue(value, delay = 400)`.

- Create `client/src/utils/backendSearch.js`
  - Owns client search constants and normalization helpers.
  - Exports `BACKEND_SEARCH_DEBOUNCE_MS`, `BACKEND_SEARCH_MAX_LENGTH`, `normalizeBackendSearch(value)`, and `canRunBackendSearch(value)`.

- Modify `client/src/fco/views/DatabaseView.jsx`
  - Uses debounced normalized search for `/api/players`.
  - Skips fetch while raw search is exactly one normalized character.
  - Keeps URL and input state immediate.

- Modify `client/src/fco/components/PlayerSearchForm.jsx`
  - Ensures search input uses numeric `maxLength={BACKEND_SEARCH_MAX_LENGTH}`.

- Modify `client/src/fco/components/PlayerPicker.jsx`
  - Replaces local 300ms timer with shared debounce policy.
  - Caps input at 50 characters and suppresses one-character API calls.

- Modify `client/src/pages/admin/MonetizationListPage.jsx`
  - Splits raw title search from applied debounced search.
  - Uses shared debounce policy for title search and player autocomplete.
  - Adds `maxLength` to backend-backed text inputs.

- Modify `client/src/components/admin/monetization/LinkedEntityPicker.jsx`
  - Uses shared debounce policy and suppresses one-character autocomplete calls.
  - Adds `maxLength`.

- Modify `client/src/pages/DatabasePage.jsx` and `client/src/components/PlayerTable.jsx`
  - Replaces `useDeferredValue` backend-search behavior with shared debounce policy in legacy code.
  - Ensures one-character searches do not hit `/api/players` if this legacy route is re-enabled.

- Create `server/src/services/searchText.js`
  - Owns backend search constants and regex-safe normalization.
  - Exports `SEARCH_TEXT_MAX_LENGTH`, `normalizeSearchText(value)`, `escapeRegex(value)`, `toSearchRegex(value)`, and `hasSearchText(value)`.

- Modify `server/src/controllers/player.controller.js`
  - Uses server helper for `/api/players` search and other free-text regex filters touched by player search.

- Modify `server/src/services/adminPlayerSearch.js`
  - Uses server helper for admin player autocomplete query builder.

- Modify `server/src/controllers/adminMonetization.controller.js`
  - Uses server helper for admin monetization title search.

- Test files:
  - Create `client/src/utils/backendSearch.test.js`.
  - Create `client/src/hooks/useDebouncedValue.test.jsx`.
  - Modify `server/src/controllers/player.controller.test.js`.
  - Modify `server/src/services/adminPlayerSearch.test.js`.
  - Create `server/src/services/searchText.test.js`.

---

### Task 1: Add shared client search policy and debounce hook

**Files:**
- Create: `client/src/utils/backendSearch.js`
- Create: `client/src/utils/backendSearch.test.js`
- Create: `client/src/hooks/useDebouncedValue.js`
- Create: `client/src/hooks/useDebouncedValue.test.jsx`

**Interfaces:**
- Produces: `BACKEND_SEARCH_DEBOUNCE_MS: 400`
- Produces: `BACKEND_SEARCH_MAX_LENGTH: 50`
- Produces: `normalizeBackendSearch(value: unknown): string`
- Produces: `canRunBackendSearch(value: unknown): boolean`
- Produces: `useDebouncedValue(value: any, delay?: number): any`

- [ ] **Step 1: Write failing tests for client search normalization**

Create `client/src/utils/backendSearch.test.js`:

```js
import { describe, expect, it } from 'vitest';
import {
  BACKEND_SEARCH_DEBOUNCE_MS,
  BACKEND_SEARCH_MAX_LENGTH,
  canRunBackendSearch,
  normalizeBackendSearch,
} from './backendSearch';

describe('backend search policy', () => {
  it('uses the approved debounce and length constants', () => {
    expect(BACKEND_SEARCH_DEBOUNCE_MS).toBe(400);
    expect(BACKEND_SEARCH_MAX_LENGTH).toBe(50);
  });

  it('trims whitespace and caps search text to 50 characters', () => {
    expect(normalizeBackendSearch(`  ${'a'.repeat(60)}  `)).toBe('a'.repeat(50));
  });

  it('allows empty and two-character searches but blocks one-character searches', () => {
    expect(canRunBackendSearch('')).toBe(true);
    expect(canRunBackendSearch(' a ')).toBe(false);
    expect(canRunBackendSearch(' ab ')).toBe(true);
  });
});
```

Create `client/src/hooks/useDebouncedValue.test.jsx`:

```jsx
import { describe, expect, it, vi } from 'vitest';
import { act, createRoot } from 'react-dom/client';
import { useState } from 'react';
import { useDebouncedValue } from './useDebouncedValue';

function Harness({ onRender }) {
  const [value, setValue] = useState('');
  const debounced = useDebouncedValue(value, 400);
  onRender({ debounced, setValue });
  return null;
}

describe('useDebouncedValue', () => {
  it('updates only after the debounce delay', () => {
    vi.useFakeTimers();
    const host = document.createElement('div');
    const root = createRoot(host);
    const renders = [];

    act(() => {
      root.render(<Harness onRender={(state) => renders.push(state)} />);
    });

    act(() => {
      renders.at(-1).setValue('m');
      renders.at(-1).setValue('me');
    });

    expect(renders.at(-1).debounced).toBe('');

    act(() => {
      vi.advanceTimersByTime(399);
    });

    expect(renders.at(-1).debounced).toBe('');

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(renders.at(-1).debounced).toBe('me');

    act(() => root.unmount());
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `client`:

```bash
rtk npm test -- src/utils/backendSearch.test.js src/hooks/useDebouncedValue.test.jsx
```

Expected: FAIL because `backendSearch.js` and `useDebouncedValue.js` do not exist.

- [ ] **Step 3: Implement shared client utilities**

Create `client/src/utils/backendSearch.js`:

```js
export const BACKEND_SEARCH_DEBOUNCE_MS = 400;
export const BACKEND_SEARCH_MAX_LENGTH = 50;

export function normalizeBackendSearch(value = '') {
  return String(value).trim().slice(0, BACKEND_SEARCH_MAX_LENGTH);
}

export function canRunBackendSearch(value = '') {
  return normalizeBackendSearch(value).length !== 1;
}
```

Create `client/src/hooks/useDebouncedValue.js`:

```js
import { useEffect, useState } from 'react';

export function useDebouncedValue(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timeoutId);
  }, [value, delay]);

  return debouncedValue;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run from `client`:

```bash
rtk npm test -- src/utils/backendSearch.test.js src/hooks/useDebouncedValue.test.jsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add client/src/utils/backendSearch.js client/src/utils/backendSearch.test.js client/src/hooks/useDebouncedValue.js client/src/hooks/useDebouncedValue.test.jsx && rtk git commit -m "feat: add backend search debounce policy"
```

---

### Task 2: Add shared server search text normalization

**Files:**
- Create: `server/src/services/searchText.js`
- Create: `server/src/services/searchText.test.js`

**Interfaces:**
- Produces: `SEARCH_TEXT_MAX_LENGTH: 50`
- Produces: `normalizeSearchText(value: unknown): string`
- Produces: `hasSearchText(value: unknown): boolean`
- Produces: `escapeRegex(value: string): string`
- Produces: `toSearchRegex(value: unknown): string`

- [ ] **Step 1: Write failing tests for server search helpers**

Create `server/src/services/searchText.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SEARCH_TEXT_MAX_LENGTH,
  escapeRegex,
  hasSearchText,
  normalizeSearchText,
  toSearchRegex,
} from './searchText.js';

test('normalizes search text by trimming and capping at 50 characters', () => {
  assert.equal(SEARCH_TEXT_MAX_LENGTH, 50);
  assert.equal(normalizeSearchText(`  ${'a'.repeat(60)}  `), 'a'.repeat(50));
});

test('treats empty and one-character search text as not searchable', () => {
  assert.equal(hasSearchText(''), false);
  assert.equal(hasSearchText(' a '), false);
  assert.equal(hasSearchText(' ab '), true);
});

test('escapes regex metacharacters before building regex search text', () => {
  assert.equal(escapeRegex('Ronaldo.*(ST)?'), 'Ronaldo\\.\\*\\(ST\\)\\?');
  assert.equal(toSearchRegex(' Ronaldo.*(ST)? '), 'Ronaldo\\.\\*\\(ST\\)\\?');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `server`:

```bash
rtk node --test src/services/searchText.test.js
```

Expected: FAIL because `searchText.js` does not exist.

- [ ] **Step 3: Implement server helper**

Create `server/src/services/searchText.js`:

```js
export const SEARCH_TEXT_MAX_LENGTH = 50;

export function normalizeSearchText(value = '') {
  return String(value).trim().slice(0, SEARCH_TEXT_MAX_LENGTH);
}

export function hasSearchText(value = '') {
  return normalizeSearchText(value).length >= 2;
}

export function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function toSearchRegex(value = '') {
  return escapeRegex(normalizeSearchText(value));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run from `server`:

```bash
rtk node --test src/services/searchText.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add server/src/services/searchText.js server/src/services/searchText.test.js && rtk git commit -m "feat: add server search text guards"
```

---

### Task 3: Guard `/api/players` search on the server

**Files:**
- Modify: `server/src/controllers/player.controller.js`
- Modify: `server/src/controllers/player.controller.test.js`

**Interfaces:**
- Consumes: `hasSearchText(value)`, `toSearchRegex(value)` from `server/src/services/searchText.js`.
- Produces: `buildEnrichmentSearchQuery(search, seasonId, filters)` applies escaped regex only when normalized search length is at least 2.

- [ ] **Step 1: Extend failing controller tests**

Modify `server/src/controllers/player.controller.test.js` to include these tests after the existing tests:

```js
test('ignores one-character player search text', () => {
  assert.deepEqual(
    buildEnrichmentSearchQuery(' m ', '', {}),
    { source: 'fifaaddict-vn' }
  );
});

test('escapes player search regex metacharacters', () => {
  assert.deepEqual(
    buildEnrichmentSearchQuery('Ronaldo.*', '', {}),
    {
      source: 'fifaaddict-vn',
      $and: [{
        $or: [
          { displayNameVi: { $regex: 'Ronaldo\\.\\*', $options: 'i' } },
          { displayNameEn: { $regex: 'Ronaldo\\.\\*', $options: 'i' } },
          { fullNameVi: { $regex: 'Ronaldo\\.\\*', $options: 'i' } },
          { seasonName: { $regex: 'Ronaldo\\.\\*', $options: 'i' } },
          { 'positions.position': { $regex: 'Ronaldo\\.\\*', $options: 'i' } },
          { club: { $regex: 'Ronaldo\\.\\*', $options: 'i' } },
          { league: { $regex: 'Ronaldo\\.\\*', $options: 'i' } },
          { nation: { $regex: 'Ronaldo\\.\\*', $options: 'i' } },
          { hiddenTraits: { $regex: 'Ronaldo\\.\\*', $options: 'i' } },
        ],
      }],
    }
  );
});
```

- [ ] **Step 2: Run controller tests to verify they fail**

Run from `server`:

```bash
rtk node --test src/controllers/player.controller.test.js
```

Expected: FAIL because one-character search is still applied and regex text is not escaped.

- [ ] **Step 3: Update player query builder**

Modify `server/src/controllers/player.controller.js`:

Add import near the existing imports:

```js
import { hasSearchText, toSearchRegex } from '../services/searchText.js';
```

Replace the `if (search) { ... }` block inside `buildEnrichmentSearchQuery` with:

```js
  if (hasSearchText(search)) {
    const searchRegex = toSearchRegex(search);
    query.$and = query.$and || [];
    query.$and.push({ $or: [
      { displayNameVi: { $regex: searchRegex, $options: 'i' } },
      { displayNameEn: { $regex: searchRegex, $options: 'i' } },
      { fullNameVi: { $regex: searchRegex, $options: 'i' } },
      { seasonName: { $regex: searchRegex, $options: 'i' } },
      { 'positions.position': { $regex: searchRegex, $options: 'i' } },
      { club: { $regex: searchRegex, $options: 'i' } },
      { league: { $regex: searchRegex, $options: 'i' } },
      { nation: { $regex: searchRegex, $options: 'i' } },
      { hiddenTraits: { $regex: searchRegex, $options: 'i' } },
    ] });
  }
```

Do not change select/range/pagination/sort filters.

- [ ] **Step 4: Run server tests**

Run from `server`:

```bash
rtk node --test src/services/searchText.test.js src/controllers/player.controller.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add server/src/controllers/player.controller.js server/src/controllers/player.controller.test.js && rtk git commit -m "fix: guard player search regex queries"
```

---

### Task 4: Guard admin player autocomplete search on the server

**Files:**
- Modify: `server/src/services/adminPlayerSearch.js`
- Modify: `server/src/services/adminPlayerSearch.test.js`

**Interfaces:**
- Consumes: `hasSearchText(value)`, `toSearchRegex(value)` from `server/src/services/searchText.js`.
- Produces: `buildAdminPlayerSearchQuery({ q, season, position })` returns `{ source, overall, _id: null }` for one-character `q`, so autocomplete returns no results instead of broad results.

- [ ] **Step 1: Extend failing admin player search tests**

Modify `server/src/services/adminPlayerSearch.test.js` by adding imports and tests:

```js
import { buildAdminPlayerSearchQuery, toLinkedPlayerResult } from './adminPlayerSearch.js';
```

Replace the current import line with the line above, then add these tests after the existing test:

```js
test('admin player search returns an impossible query for one-character q', () => {
  assert.deepEqual(buildAdminPlayerSearchQuery({ q: ' r ' }), {
    source: 'fifaaddict-vn',
    overall: { $gt: 0 },
    _id: null,
  });
});

test('admin player search escapes regex metacharacters', () => {
  assert.deepEqual(buildAdminPlayerSearchQuery({ q: 'Ronaldo.*' }), {
    source: 'fifaaddict-vn',
    overall: { $gt: 0 },
    $or: [
      { displayNameVi: { $regex: 'Ronaldo\\.\\*', $options: 'i' } },
      { displayNameEn: { $regex: 'Ronaldo\\.\\*', $options: 'i' } },
      { fullNameVi: { $regex: 'Ronaldo\\.\\*', $options: 'i' } },
      { seasonName: { $regex: 'Ronaldo\\.\\*', $options: 'i' } },
    ],
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `server`:

```bash
rtk node --test src/services/adminPlayerSearch.test.js
```

Expected: FAIL because one-character `q` currently broad-searches and regex text is not escaped.

- [ ] **Step 3: Update admin player search query builder**

Modify `server/src/services/adminPlayerSearch.js`:

Add import at the top:

```js
import { hasSearchText, normalizeSearchText, toSearchRegex } from './searchText.js';
```

Replace the current `if (q) { ... }` block with:

```js
  const normalizedQ = normalizeSearchText(q);
  if (normalizedQ.length === 1) {
    filter._id = null;
  } else if (hasSearchText(normalizedQ)) {
    const searchRegex = toSearchRegex(normalizedQ);
    filter.$or = [
      { displayNameVi: { $regex: searchRegex, $options: 'i' } },
      { displayNameEn: { $regex: searchRegex, $options: 'i' } },
      { fullNameVi: { $regex: searchRegex, $options: 'i' } },
      { seasonName: { $regex: searchRegex, $options: 'i' } },
    ];
  }
```

Keep existing `season` and `position` behavior unchanged.

- [ ] **Step 4: Run tests**

Run from `server`:

```bash
rtk node --test src/services/searchText.test.js src/services/adminPlayerSearch.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add server/src/services/adminPlayerSearch.js server/src/services/adminPlayerSearch.test.js && rtk git commit -m "fix: guard admin player autocomplete search"
```

---

### Task 5: Guard admin monetization title search on the server

**Files:**
- Modify: `server/src/controllers/adminMonetization.controller.js`
- Create: `server/src/controllers/adminMonetization.controller.test.js`

**Interfaces:**
- Consumes: `hasSearchText(value)`, `toSearchRegex(value)` from `server/src/services/searchText.js`.
- Produces: `buildMonetizationListFilter(query)` returns the Mongo filter used by `listItems`.

- [ ] **Step 1: Write failing tests for monetization list filter**

Create `server/src/controllers/adminMonetization.controller.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMonetizationListFilter } from './adminMonetization.controller.js';

test('monetization list ignores one-character title search', () => {
  assert.deepEqual(buildMonetizationListFilter({ search: ' a ', status: 'published' }), {
    status: 'published',
  });
});

test('monetization list escapes title search regex metacharacters', () => {
  assert.deepEqual(buildMonetizationListFilter({ search: 'sale.*', type: 'youtube_video' }), {
    type: 'youtube_video',
    title: { $regex: 'sale\\.\\*', $options: 'i' },
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `server`:

```bash
rtk node --test src/controllers/adminMonetization.controller.test.js
```

Expected: FAIL because `buildMonetizationListFilter` is not exported yet.

- [ ] **Step 3: Extract and use monetization filter builder**

Modify `server/src/controllers/adminMonetization.controller.js`.

Add import near the top:

```js
import { hasSearchText, toSearchRegex } from '../services/searchText.js';
```

Add this exported helper above `listItems`:

```js
export function buildMonetizationListFilter({ status, type, platform, placementId, linkedPlayerId, search } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (platform) filter.platform = platform;
  if (placementId) filter.placementIds = placementId;
  if (linkedPlayerId) filter['linkedEntities.entityId'] = linkedPlayerId;
  if (hasSearchText(search)) filter.title = { $regex: toSearchRegex(search), $options: 'i' };
  return filter;
}
```

Inside `listItems`, replace the inline filter construction with:

```js
    const filter = buildMonetizationListFilter({ status, type, platform, placementId, linkedPlayerId, search });
```

- [ ] **Step 4: Run tests**

Run from `server`:

```bash
rtk node --test src/services/searchText.test.js src/controllers/adminMonetization.controller.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add server/src/controllers/adminMonetization.controller.js server/src/controllers/adminMonetization.controller.test.js && rtk git commit -m "fix: guard monetization title search"
```

---

### Task 6: Debounce active `/players` search in `DatabaseView`

**Files:**
- Modify: `client/src/fco/views/DatabaseView.jsx`
- Modify: `client/src/fco/components/PlayerSearchForm.jsx`

**Interfaces:**
- Consumes: `useDebouncedValue(value, delay)` from `client/src/hooks/useDebouncedValue.js`.
- Consumes: `BACKEND_SEARCH_DEBOUNCE_MS`, `BACKEND_SEARCH_MAX_LENGTH`, `canRunBackendSearch`, `normalizeBackendSearch` from `client/src/utils/backendSearch.js`.
- Produces: `/players` calls `fetchPlayers` only with normalized debounced search when text length is 0 or at least 2.

- [ ] **Step 1: Add a regression test checklist to `DatabaseView.filters.test.js`**

Modify `client/src/fco/views/DatabaseView.filters.test.js` to import and assert shared policy instead of rendering the full view:

```js
import { canRunBackendSearch, normalizeBackendSearch } from '../../utils/backendSearch.js';
```

Add tests:

```js
test('database backend search policy blocks one-character queries', () => {
  assert.equal(canRunBackendSearch('m'), false);
  assert.equal(canRunBackendSearch('me'), true);
  assert.equal(canRunBackendSearch(''), true);
});

test('database backend search policy caps query text to 50 characters', () => {
  assert.equal(normalizeBackendSearch('x'.repeat(60)), 'x'.repeat(50));
});
```

- [ ] **Step 2: Run tests before code changes**

Run from `client`:

```bash
rtk npm test -- src/fco/views/DatabaseView.filters.test.js src/utils/backendSearch.test.js
```

Expected: PASS if Task 1 is complete. These tests pin the policy before wiring it into the component.

- [ ] **Step 3: Wire debounce into `DatabaseView.jsx`**

Modify imports in `client/src/fco/views/DatabaseView.jsx`:

```js
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { BACKEND_SEARCH_DEBOUNCE_MS, canRunBackendSearch, normalizeBackendSearch } from '../../utils/backendSearch.js';
```

After search state initialization, add:

```js
  const debouncedSearch = useDebouncedValue(search, BACKEND_SEARCH_DEBOUNCE_MS);
  const normalizedSearch = normalizeBackendSearch(debouncedSearch);
  const canLoadSearch = canRunBackendSearch(debouncedSearch);
```

In `filtersToQS`, keep writing the raw `search` state so the URL reflects what the user typed.

In `load`, add an early return before `setLoading(true)`:

```js
    if (!canLoadSearch) return;
```

In the `fetchPlayers` params, replace `search` with:

```js
        search: normalizedSearch,
```

In the `load` dependency array, replace `search` with `normalizedSearch` and add `canLoadSearch`.

In `hasFilters`, keep using raw `search` so the reset button still appears while one character is typed.

Keep `onSearch={load}`. The early return prevents the button and Enter key from bypassing the one-character guard.

- [ ] **Step 4: Update `PlayerSearchForm.jsx` maxLength import**

Modify `client/src/fco/components/PlayerSearchForm.jsx`:

Add import:

```js
import { BACKEND_SEARCH_MAX_LENGTH } from '../../utils/backendSearch.js';
```

Replace `maxLength="50"` with:

```jsx
            maxLength={BACKEND_SEARCH_MAX_LENGTH}
```

- [ ] **Step 5: Run client tests**

Run from `client`:

```bash
rtk npm test -- src/utils/backendSearch.test.js src/hooks/useDebouncedValue.test.jsx src/fco/views/DatabaseView.filters.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add client/src/fco/views/DatabaseView.jsx client/src/fco/components/PlayerSearchForm.jsx client/src/fco/views/DatabaseView.filters.test.js && rtk git commit -m "fix: debounce player database search"
```

---

### Task 7: Apply shared debounce policy to player autocomplete components

**Files:**
- Modify: `client/src/fco/components/PlayerPicker.jsx`
- Modify: `client/src/components/admin/monetization/LinkedEntityPicker.jsx`
- Modify: `client/src/pages/admin/MonetizationListPage.jsx`

**Interfaces:**
- Consumes: client helpers from Task 1.
- Produces: autocomplete components call backend only for empty top-player loads or normalized queries with length at least 2.

- [ ] **Step 1: Update `PlayerPicker.jsx`**

Modify imports:

```js
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { BACKEND_SEARCH_DEBOUNCE_MS, BACKEND_SEARCH_MAX_LENGTH, canRunBackendSearch, normalizeBackendSearch } from '../../utils/backendSearch.js';
```

Remove `const timer = useRef(null);` because the shared hook owns the timer.

After state declarations, add:

```js
  const debouncedQ = useDebouncedValue(q, q.trim() ? BACKEND_SEARCH_DEBOUNCE_MS : 0);
```

Replace the existing `useEffect` that uses `timer.current` with:

```js
  useEffect(() => {
    const search = normalizeBackendSearch(debouncedQ);

    if (!canRunBackendSearch(debouncedQ)) {
      setResults([]);
      setLoading(false);
      return;
    }

    if (!search && !showTopPlayers) {
      setResults([]);
      return;
    }

    let ignore = false;
    setLoading(true);
    fetchPlayers({
      search,
      sort: 'ovr_desc',
      pageSize: search ? 20 : 10,
    })
      .then((res) => {
        if (!ignore) setResults(res.players);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [debouncedQ, showTopPlayers]);
```

Update input:

```jsx
          <input autoFocus maxLength={BACKEND_SEARCH_MAX_LENGTH} value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm cầu thủ…" />
```

- [ ] **Step 2: Update `LinkedEntityPicker.jsx`**

Modify imports:

```js
import { useState, useEffect } from 'react';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue.js';
import { BACKEND_SEARCH_DEBOUNCE_MS, BACKEND_SEARCH_MAX_LENGTH, canRunBackendSearch, normalizeBackendSearch } from '../../../utils/backendSearch.js';
```

Remove `useRef` import and `const debounceRef = useRef(null);`.

After state declarations, add:

```js
  const debouncedQuery = useDebouncedValue(query, BACKEND_SEARCH_DEBOUNCE_MS);
```

Replace the current query `useEffect` with:

```js
  useEffect(() => {
    const normalizedQuery = normalizeBackendSearch(debouncedQuery);
    if (!normalizedQuery || !canRunBackendSearch(debouncedQuery)) {
      setResults([]);
      setSearching(false);
      return;
    }

    let ignore = false;
    setSearching(true);
    searchPlayers(normalizedQuery)
      .then((players) => {
        if (!ignore) setResults(players);
      })
      .catch(() => {
        if (!ignore) setResults([]);
      })
      .finally(() => {
        if (!ignore) setSearching(false);
      });

    return () => {
      ignore = true;
    };
  }, [debouncedQuery]);
```

Update input:

```jsx
          maxLength={BACKEND_SEARCH_MAX_LENGTH}
```

- [ ] **Step 3: Update admin player autocomplete in `MonetizationListPage.jsx`**

Modify imports:

```js
import { useEffect, useState, useCallback } from 'react';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { BACKEND_SEARCH_DEBOUNCE_MS, BACKEND_SEARCH_MAX_LENGTH, canRunBackendSearch, normalizeBackendSearch } from '../utils/backendSearch.js';
```

Remove `useRef` import and `const playerDebounceRef = useRef(null);`.

After player state declarations, add:

```js
  const debouncedPlayerQuery = useDebouncedValue(playerQuery, BACKEND_SEARCH_DEBOUNCE_MS);
```

Replace the player suggestion `useEffect` with:

```js
  useEffect(() => {
    const normalizedQuery = normalizeBackendSearch(debouncedPlayerQuery);
    if (!normalizedQuery || playerFilterLabel || !canRunBackendSearch(debouncedPlayerQuery)) {
      setPlayerSuggestions([]);
      return;
    }

    let ignore = false;
    const params = { q: normalizedQuery, limit: 20 };
    if (playerSeasonFilter) params.season = playerSeasonFilter;

    axios.get(`${API_BASE}/admin/search/players`, {
      params,
      withCredentials: true,
    })
      .then((res) => {
        if (!ignore) setPlayerSuggestions(res.data.data.players ?? []);
      })
      .catch(() => {
        if (!ignore) setPlayerSuggestions([]);
      });

    return () => {
      ignore = true;
    };
  }, [debouncedPlayerQuery, playerFilterLabel, playerSeasonFilter]);
```

Add `maxLength={BACKEND_SEARCH_MAX_LENGTH}` to the player filter input.

- [ ] **Step 4: Run client tests**

Run from `client`:

```bash
rtk npm test -- src/utils/backendSearch.test.js src/hooks/useDebouncedValue.test.jsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add client/src/fco/components/PlayerPicker.jsx client/src/components/admin/monetization/LinkedEntityPicker.jsx client/src/pages/admin/MonetizationListPage.jsx && rtk git commit -m "fix: debounce player autocomplete searches"
```

---

### Task 8: Debounce admin monetization title search

**Files:**
- Modify: `client/src/pages/admin/MonetizationListPage.jsx`

**Interfaces:**
- Consumes: client helpers from Task 1.
- Produces: admin monetization list uses raw `titleSearch` for the input and debounced normalized search in `filters.search` for API calls.

- [ ] **Step 1: Split raw title search from API filters**

In `client/src/pages/admin/MonetizationListPage.jsx`, add state after `filters`:

```js
  const [titleSearch, setTitleSearch] = useState(filters.search);
  const debouncedTitleSearch = useDebouncedValue(titleSearch, BACKEND_SEARCH_DEBOUNCE_MS);
  const normalizedTitleSearch = normalizeBackendSearch(debouncedTitleSearch);
```

Add effect after `setFilter` definition:

```js
  useEffect(() => {
    if (!canRunBackendSearch(debouncedTitleSearch)) return;
    setFilters((current) => {
      if (current.search === normalizedTitleSearch) return current;
      return { ...current, search: normalizedTitleSearch };
    });
  }, [debouncedTitleSearch, normalizedTitleSearch]);
```

- [ ] **Step 2: Update title input**

Replace the title search input props:

```jsx
          value={titleSearch}
          maxLength={BACKEND_SEARCH_MAX_LENGTH}
          onChange={(e) => setTitleSearch(e.target.value)}
```

Do not debounce select/status/platform/sort filters.

- [ ] **Step 3: Run client tests**

Run from `client`:

```bash
rtk npm test -- src/utils/backendSearch.test.js src/hooks/useDebouncedValue.test.jsx
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
rtk git add client/src/pages/admin/MonetizationListPage.jsx && rtk git commit -m "fix: debounce monetization title search"
```

---

### Task 9: Apply policy to legacy database search code

**Files:**
- Modify: `client/src/pages/DatabasePage.jsx`
- Modify: `client/src/components/PlayerTable.jsx`

**Interfaces:**
- Consumes: client helpers from Task 1.
- Produces: legacy `PlayerTable` receives a normalized debounced `searchQuery` and skips API fetches for one-character query if route is re-enabled.

- [ ] **Step 1: Update `DatabasePage.jsx` imports**

Replace React import:

```js
import { useEffect, useMemo, useState } from 'react';
```

Add imports:

```js
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { BACKEND_SEARCH_DEBOUNCE_MS, BACKEND_SEARCH_MAX_LENGTH, normalizeBackendSearch } from '../utils/backendSearch';
```

Replace:

```js
  const deferredSearch = useDeferredValue(searchQuery);
```

with:

```js
  const debouncedSearch = useDebouncedValue(searchQuery, BACKEND_SEARCH_DEBOUNCE_MS);
  const backendSearch = normalizeBackendSearch(debouncedSearch);
```

Add `maxLength={BACKEND_SEARCH_MAX_LENGTH}` to the main player search input. Do not add it to `seasonSearch` because season filtering is client-side only.

Pass `backendSearch` into `PlayerTable`:

```jsx
          searchQuery={backendSearch}
```

- [ ] **Step 2: Update `PlayerTable.jsx` to skip one-character search fetches**

Add import:

```js
import { canRunBackendSearch } from '../utils/backendSearch';
```

At the start of `fetchPlayers()` before `setLoading(true)`, add:

```js
        if (!canRunBackendSearch(searchQuery)) return;
```

This protects the table even if it is called directly with a one-character `searchQuery`.

- [ ] **Step 3: Run client tests**

Run from `client`:

```bash
rtk npm test -- src/utils/backendSearch.test.js src/fco/views/DatabaseView.filters.test.js
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
rtk git add client/src/pages/DatabasePage.jsx client/src/components/PlayerTable.jsx && rtk git commit -m "fix: guard legacy database search"
```

---

### Task 10: Verify full behavior and app UX

**Files:**
- No source file changes expected unless verification finds a bug.

**Interfaces:**
- Consumes: all previous task outputs.
- Produces: verified backend-backed text search behavior across active and admin flows.

- [ ] **Step 1: Run focused server tests**

Run from `server`:

```bash
rtk node --test src/services/searchText.test.js src/controllers/player.controller.test.js src/services/adminPlayerSearch.test.js src/controllers/adminMonetization.controller.test.js
```

Expected: PASS.

- [ ] **Step 2: Run focused client tests**

Run from `client`:

```bash
rtk npm test -- src/utils/backendSearch.test.js src/hooks/useDebouncedValue.test.jsx src/fco/views/DatabaseView.filters.test.js
```

Expected: PASS.

- [ ] **Step 3: Run lint/build checks**

Run from `client`:

```bash
rtk npm run lint && rtk npm run build
```

Expected: PASS.

- [ ] **Step 4: Start local app for manual verification**

Run server and client in separate terminals:

```bash
rtk npm run dev
```

Use this command from `server` for the backend and from `client` for Vite.

- [ ] **Step 5: Manually verify `/players` in the browser**

Open `http://localhost:5173/players`.

Verify:

- Initial unfiltered load still works.
- Typing `m` into the player search box does not issue `/api/players?search=m`.
- Typing `me` and waiting 400ms issues one `/api/players` request with `search=me`.
- Typing quickly from `m` to `messi` does not issue one request per keypress.
- Changing select/range filters still fetches immediately.
- Clearing search loads the unfiltered list.

- [ ] **Step 6: Manually verify autocomplete and admin flows**

Verify:

- Compare player picker: one-character query shows no suggestions and makes no search request; two-character query searches after 400ms.
- Upgrade player picker: empty query still loads top players when `showTopPlayers` is true; one-character query does not search.
- Admin monetization title search: typing quickly produces one delayed list request rather than one request per keypress.
- Admin player filter and linked entity picker: one-character queries show no suggestions; two-character queries search after 400ms.

- [ ] **Step 7: Inspect git diff**

Run from repo root:

```bash
rtk git diff
```

Expected: diff contains only debounce/search guard implementation and tests.

- [ ] **Step 8: Final commit if verification required fixes**

If Step 7 shows any verification fixes after the prior task commits, commit them:

```bash
rtk git add client/src server/src && rtk git commit -m "fix: verify backend search throttling"
```

If there are no additional changes, skip this step.

---

## Self-Review

- Spec coverage: client debounce, max length, one-character suppression, autocomplete empty suggestions, server trim/cap/min-length/regex escaping, active `/players`, admin monetization, admin player picker, linked picker, player picker, and legacy database code are all covered.
- Placeholder scan: no placeholder steps remain; each code-changing step includes exact code or exact replacement instructions.
- Type consistency: client helpers are imported by all client tasks with the same names; server helpers are imported by all server tasks with the same names.
