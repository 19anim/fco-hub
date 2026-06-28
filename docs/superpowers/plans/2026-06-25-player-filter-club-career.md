# Player Filter: Club Career History + Dropdown Inputs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix player search so club/league filters also match historical career clubs (so Ronaldo appears in "Manchester United" search), and replace error-prone free-text nation/club inputs with dropdowns loaded from the database.

**Architecture:** The search pipeline queries only `PlayerEnrichment`. Currently `club` filter matches only `enrichment.club` (current club). We extend the query with `$or` to also match `teamColor[]` and `clubCareer[].team` (both are historical club arrays already scraped and stored). For dropdowns, `/api/players/meta` is extended to return distinct nations and top clubs, which `DatabaseView` passes as props to `PlayerSearchForm`.

**Tech Stack:** Express/Mongoose backend, React frontend (no extra libraries needed — native `<select>` for nation, `<input>` + `<datalist>` for club combobox)

## Global Constraints

- No new npm packages — use existing mongoose, axios, React
- Preserve all existing filter behavior — only extend, do not break
- The `/meta` endpoint is already called once on mount in `DatabaseView` — piggyback on it
- `PlayerEnrichment` is the ONLY data source for search (no Player/Alias joins)
- Do NOT add league historical search in this plan (requires club→league mapping table, out of scope)

---

## File Map

| File | Role |
|------|------|
| `server/src/controllers/player.controller.js` | `buildEnrichmentSearchQuery` (Task 1) + `getPlayerMeta` (Task 2) |
| `client/src/fco/components/PlayerSearchForm.jsx` | Replace nation `<input>` with `<select>`, club `<input>` with combobox (Task 3 + 4) |
| `client/src/fco/views/DatabaseView.jsx` | Extract nation/club lists from meta, pass as props (Task 3 + 4) |

---

### Task 1: Extend Club Filter to Match Historical Clubs

**Files:**
- Modify: `server/src/controllers/player.controller.js` — function `buildEnrichmentSearchQuery`

**Context:** `teamColor` is an array of strings (club names the player has worn a jersey for), `clubCareer` is `[{team, teamId, season}]`. Both are already stored in `PlayerEnrichment`. Currently the club filter only checks `enrichment.club` (current club). Ronaldo's current `club` is "Al Nassr" — his `teamColor`/`clubCareer` contain "Manchester United".

**Interfaces:**
- Consumes: `filters.club` (string from query param)
- Produces: extended MongoDB query with `$or` clause matching club in three fields

- [ ] **Step 1: Locate the current club filter block**

In `server/src/controllers/player.controller.js`, find this line (around line 98):
```js
if (filters.club) query.club = { $regex: filters.club, $options: 'i' };
```

- [ ] **Step 2: Replace with $or that includes historical clubs**

```js
if (filters.club) {
  const clubRegex = { $regex: filters.club, $options: 'i' };
  const clubConditions = [
    { club: clubRegex },
    { teamColor: clubRegex },
    { 'clubCareer.team': clubRegex },
  ];
  if (query.$and) {
    query.$and.push({ $or: clubConditions });
  } else {
    query.$and = [{ $or: clubConditions }];
  }
}
```

- [ ] **Step 3: Verify no conflict with existing $and usage**

Check that the existing `$and` pushes (search text, position filter) are also using the same `query.$and = query.$and || []` pattern. Confirm the block around line 63 looks like:
```js
query.$and = query.$and || [];
query.$and.push({ $or: [...] });
```
If yes, the new code is consistent.

- [ ] **Step 4: Manual smoke test (curl)**

Start the server (`npm run dev` in `/server`), then:
```bash
# Should return Ronaldo even without ?club=manchester (Al Nassr is current)
curl "http://localhost:3000/api/players?search=cristiano+ronaldo&limit=5" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');const j=JSON.parse(d);console.log(j.data.map(p=>p.enrichment?.club||p.name).slice(0,3))"

# Should return Ronaldo because he played for Manchester United (in teamColor/clubCareer)
curl "http://localhost:3000/api/players?club=manchester+united&limit=5" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');const j=JSON.parse(d);console.log(j.data.map(p=>p.enrichment?.club+' / '+p.name).slice(0,5))"
```

Expected: Ronaldo appears in the second query even though his current club isn't Manchester United.

- [ ] **Step 5: Commit**

```bash
rtk git add server/src/controllers/player.controller.js
rtk git commit -m "feat: extend club filter to include teamColor and clubCareer history"
```

---

### Task 2: Extend /meta to Return Nation and Club Lists

**Files:**
- Modify: `server/src/controllers/player.controller.js` — function `getPlayerMeta`

**Context:** `getPlayerMeta` already runs aggregations on `PlayerEnrichment`. We add two fast distinct queries: one for all non-empty nations (sorted alphabetically), one for top-100 clubs by frequency.

**Interfaces:**
- Produces: `res.json({ ..., nations: string[], topClubs: string[] })`

- [ ] **Step 1: Add nation and club queries to the Promise.all in getPlayerMeta**

Find the existing `const [dbSeasons, dbPositions, count, nexonMeta, fifaAddictSeasons] = await Promise.all([` block (around line 303). Extend to 7 items:

```js
const [dbSeasons, dbPositions, count, nexonMeta, fifaAddictSeasons, dbNations, dbTopClubs] = await Promise.all([
  // ...existing 5 items unchanged...
  PlayerEnrichment.distinct('nation', { ...enrichmentMatch, nation: { $nin: ['', null] } }),
  PlayerEnrichment.aggregate([
    { $match: { ...enrichmentMatch, club: { $nin: ['', null] } } },
    { $group: { _id: '$club', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 150 },
    { $project: { _id: 0, club: '$_id' } },
  ]),
]);
```

- [ ] **Step 2: Add nations and topClubs to the response**

Inside the `res.json({...})` call, add after `availablePositions`:
```js
nations: (dbNations || []).filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi')),
topClubs: (dbTopClubs || []).map(r => r.club).filter(Boolean),
```

- [ ] **Step 3: Test the meta endpoint**

```bash
curl "http://localhost:3000/api/players/meta" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');const j=JSON.parse(d);console.log('nations:',j.nations?.length,'topClubs:',j.topClubs?.length)"
```

Expected: `nations: <N> topClubs: 150` (or however many exist)

- [ ] **Step 4: Commit**

```bash
rtk git add server/src/controllers/player.controller.js
rtk git commit -m "feat: add nations and topClubs to /meta endpoint"
```

---

### Task 3: Nation Filter — Replace Text Input with Select Dropdown

**Files:**
- Modify: `client/src/fco/components/PlayerSearchForm.jsx` — nation filter group
- Modify: `client/src/fco/views/DatabaseView.jsx` — pass nationOptions prop

**Context:** `PlayerSearchForm` currently has a `<input type="text" placeholder="england, spain...">` for nation. We replace it with a `<select>` that lists all nations from meta. `DatabaseView` already stores `allSeasons` from the meta call — we add `allNations`.

**Interfaces:**
- Consumes: `nationOptions: string[]` prop in PlayerSearchForm (optional, defaults to `[]`)
- Produces: `<select>` element bound to `nation` / `setNation`

- [ ] **Step 1: Add nationOptions prop to PlayerSearchForm signature**

In `client/src/fco/components/PlayerSearchForm.jsx`, update the destructured props (after `clubSearch` or near the nation prop):
```js
export default function PlayerSearchForm({
  // ...existing props...
  nation = '', setNation,
  nationOptions = [],
  clubSearch = '', setClubSearch,
  clubOptions = [],
  // ...rest of props...
```

- [ ] **Step 2: Replace nation input with select in the expanded filter panel**

Find the nation filter group (around line 102–111):
```jsx
<div className="fa-filter-group">
  <label className="fa-filter-label">Quốc gia</label>
  <input
    type="text"
    className="fa-text-input"
    placeholder="england, spain..."
    value={nation}
    onChange={e => setNation(e.target.value)}
  />
</div>
```

Replace with:
```jsx
<div className="fa-filter-group">
  <label className="fa-filter-label">Quốc gia</label>
  <select
    className="fa-select"
    value={nation}
    onChange={e => setNation(e.target.value)}
  >
    <option value="">▾ Quốc gia</option>
    {nationOptions.map(n => (
      <option key={n} value={n}>{n}</option>
    ))}
  </select>
</div>
```

- [ ] **Step 3: Add allNations state and fetch in DatabaseView**

In `client/src/fco/views/DatabaseView.jsx`, next to `const [allSeasons, setAllSeasons] = useState([])`:
```js
const [allNations, setAllNations] = useState([]);
const [allTopClubs, setAllTopClubs] = useState([]);
```

In the `fetchMeta().then(...)` block (around line 188–190), extend it:
```js
useEffect(() => {
  fetchMeta().then(res => {
    if (res.success && res.seasons) setAllSeasons(res.seasons);
    if (res.nations) setAllNations(res.nations);
    if (res.topClubs) setAllTopClubs(res.topClubs);
  });
}, []);
```

- [ ] **Step 4: Pass nationOptions to PlayerSearchForm**

In the `<PlayerSearchForm ...>` JSX in `DatabaseView.jsx`, add:
```jsx
nationOptions={allNations}
clubOptions={allTopClubs}
```

- [ ] **Step 5: Verify in browser**

Navigate to the database page, expand MORE filters. The nation field should now be a dropdown with all nations. Selecting "Brazil" should filter to Brazilian players.

- [ ] **Step 6: Commit**

```bash
rtk git add client/src/fco/components/PlayerSearchForm.jsx client/src/fco/views/DatabaseView.jsx
rtk git commit -m "feat: replace nation free-text with dropdown loaded from meta"
```

---

### Task 4: Club Filter — Replace Text Input with Combobox (datalist)

**Files:**
- Modify: `client/src/fco/components/PlayerSearchForm.jsx` — club filter group

**Context:** There are too many distinct clubs for a plain `<select>`. A `<input list="...">` + `<datalist>` gives autocomplete suggestions while still allowing free text (covering edge cases not in top 150). The `clubOptions` prop (array of strings) from Task 3 Step 3 is already wired up.

**Interfaces:**
- Consumes: `clubOptions: string[]` prop (already added in Task 3 Step 1)
- Produces: `<input list="club-options">` + `<datalist id="club-options">`

- [ ] **Step 1: Replace club input with combobox**

Find the club filter group in `PlayerSearchForm.jsx` (around line 112–121):
```jsx
<div className="fa-filter-group">
  <label className="fa-filter-label">Câu lạc bộ</label>
  <input
    type="text"
    className="fa-text-input"
    placeholder="manchester, real..."
    value={clubSearch}
    onChange={e => setClubSearch(e.target.value)}
  />
</div>
```

Replace with:
```jsx
<div className="fa-filter-group">
  <label className="fa-filter-label">Câu lạc bộ</label>
  <input
    type="text"
    list="fa-club-options"
    className="fa-text-input"
    placeholder="Manchester United, Real Madrid..."
    value={clubSearch}
    onChange={e => setClubSearch(e.target.value)}
  />
  <datalist id="fa-club-options">
    {clubOptions.map(c => <option key={c} value={c} />)}
  </datalist>
</div>
```

- [ ] **Step 2: Verify in browser**

Open MORE filters → Club field. Typing "Man" should show autocomplete suggestions including "Manchester United", "Manchester City". Selecting one should filter correctly. Custom text still works (the search does regex, so partial match is fine).

- [ ] **Step 3: Commit**

```bash
rtk git add client/src/fco/components/PlayerSearchForm.jsx
rtk git commit -m "feat: replace club free-text with combobox datalist for autocomplete"
```

---

### Task 5: Verify Detail View Shows Club Career

**Files:**
- Read: `client/src/fco/views/DetailView.jsx` (already has display code)
- Read: `server/src/controllers/player.controller.js` (getPlayerDetail)

**Context:** The detail view code (lines 311–326) already renders `p.clubCareer`. The backend `getPlayerDetail` returns the full `enrichment` object which includes `clubCareer`. If a player doesn't show club career, it's because the enrichment detail hasn't been fetched yet (the `ensureEnrichmentDetail` auto-fetch should handle it). This task verifies the actual display is working, and fixes the URL routing if needed.

**Interfaces:**
- No code changes expected — this is a verification task
- If broken: determine if the issue is data (missing clubCareer in DB) vs code (wrong mapping)

- [ ] **Step 1: Open the specific player detail page in browser**

Navigate to `http://localhost:5173/players/6a316eaa5e6c2103bf42298b` (the URL the user reported).

- [ ] **Step 2: Check browser network tab**

Open DevTools → Network → find the `/api/players/6a316eaa5e6c2103bf42298b/detail` request. Inspect the response JSON:
- Does `data.enrichment.clubCareer` exist and have entries?
- Does `data.enrichment.teamColor` exist?

- [ ] **Step 3a: If clubCareer is empty in API response**

The enrichment detail hasn't been scraped. Trigger the detail fetch by checking if `ensureEnrichmentDetail` is running. Look in server logs for the enrichment fetch attempt. If the player URL is a FIFAAddict player, it should auto-fetch. If it fails, the detail sync needs to be run via admin.

- [ ] **Step 3b: If clubCareer exists in API response but not in UI**

Check that `normalizePlayer` maps it correctly (line ~128 in `helpers.js`):
```js
clubCareer: e.clubCareer || [],
```
And that `DetailView.jsx` line 312 renders it:
```jsx
{p.clubCareer?.length > 0 && (
```
If both exist but the panel is invisible, check CSS — maybe it's hidden by a media query.

- [ ] **Step 4: Commit (only if code change was needed)**

```bash
rtk git add <changed files>
rtk git commit -m "fix: ensure club career history displays in player detail view"
```

---

## Known Limitation

**Historical league filter** (e.g. "show Ronaldo when searching Premier League") is NOT implemented in this plan. Fixing it requires a club→league mapping table (either static JSON or a separate DB collection). The current fix for **club** (Task 1) does handle "Manchester United" → finds Ronaldo. For league-based historical search, that is a separate initiative.

---

## Self-Review

**Spec coverage:**
- ✅ "lịch sử sự nghiệp câu lạc bộ" → Task 1 extends club query to match career history
- ✅ "Cristiano Ronaldo nên hiển thị vì đã từng thi đấu ở ngoại hạng anh" → partially: club filter covers this (search "Manchester United"), league filter still current-only (known limitation noted)
- ✅ "khi tìm đội bóng Manchester united cũng vậy" → Task 1 fixes this
- ✅ "filter để người dùng tự input quá nhiều có thể dẫn đến sai" → Task 3+4 replace inputs with select/datalist
- ✅ "nếu làm dropdown sẽ tốt hơn" → Task 3 (nation = full dropdown), Task 4 (club = combobox)

**Placeholder scan:** None found — all steps contain actual code.

**Type consistency:** All prop names are consistent across tasks (`nationOptions`, `clubOptions` added in Task 3 Step 1, used in Task 4).
