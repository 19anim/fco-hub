# Move fco-detail-right Above fa-detail-sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the `fco-detail-right` column (player profile, trust, related) out of `fco-detail-grid` and place it between the action bar and `fa-detail-sheet`, matching the "foflex top" layout pattern on vn.fifaaddict.com.

**Architecture:** The `fco-detail-right` panel currently lives as the right column of a 2-column `fco-detail-grid`. We extract it from that grid, insert it as a new sibling element above `fa-detail-sheet`, and restyle it for horizontal/full-width display. `fco-detail-grid` becomes single-column (left only).

**Tech Stack:** React JSX, CSS custom properties, no dependencies.

## Global Constraints

- Dark theme only (`--surface`, `--border`, `--text-*` CSS vars)
- Mobile-first: layout collapses correctly at ≤760px
- No new npm packages
- No TypeScript changes (project uses plain JS)

---

### Task 1: Restructure JSX — extract fco-detail-right above fa-detail-sheet

**Files:**
- Modify: `client/src/fco/views/DetailView.jsx` (lines ~356–478 and ~477–600)

**Interfaces:**
- Produces: `fco-detail-right` rendered as a standalone `<div>` between the `fco-detail-top` row and `fa-detail-sheet`. `fco-detail-grid` no longer wraps it.

**What changes:**

Current structure (simplified):
```jsx
<div className="fco-detail-top">...</div>
<div className="fa-detail-sheet">...</div>
{/* banner */}
<div className="fco-detail-grid">
  <div className="fco-detail-left">...</div>
  <div className="fco-detail-right">...</div>   {/* ← move this */}
</div>
```

Target structure:
```jsx
<div className="fco-detail-top">...</div>
<div className="fco-detail-right">...</div>      {/* ← moved here */}
<div className="fa-detail-sheet">...</div>
{/* banner */}
<div className="fco-detail-grid">
  <div className="fco-detail-left">...</div>
</div>
```

- [ ] **Step 1: Locate the fco-detail-right opening and closing tags**

In `DetailView.jsx`, find line ~477: `<div className="fco-detail-right">` and its closing `</div>` near line ~600 (just before the closing `</div>` of `fco-detail-grid`).

- [ ] **Step 2: Cut the entire fco-detail-right block out of fco-detail-grid**

Remove `<div className="fco-detail-right">...</div>` from inside `fco-detail-grid`. After removal `fco-detail-grid` should contain only `fco-detail-left`:

```jsx
{/* Main grid */}
<div className="fco-detail-grid">
  <div className="fco-detail-left">
    {/* ... stats, traits, club career panels unchanged ... */}
  </div>
</div>
```

- [ ] **Step 3: Paste fco-detail-right above fa-detail-sheet**

Insert the block right after the `fco-detail-top` row closing tag (`</div>`) and before `<div className="fa-detail-sheet" ...>`:

```jsx
      </div>  {/* closes fco-detail-top */}

      <div className="fco-detail-right">
        {/* ... all original content unchanged ... */}
      </div>

      <div className="fa-detail-sheet" style={{ "--season-ring": s.ring }}>
```

- [ ] **Step 4: Verify JSX compiles — start dev server**

```bash
cd client && npm run dev
```

Expected: no compile errors in terminal. Browser loads the detail page.

- [ ] **Step 5: Commit**

```bash
rtk git add client/src/fco/views/DetailView.jsx && rtk git commit -m "refactor: move fco-detail-right above fa-detail-sheet"
```

---

### Task 2: CSS — restyle fco-detail-right for horizontal top placement

**Files:**
- Modify: `client/src/fco/fco.css` (lines ~345–346 for `.fco-detail-right`, ~975 for responsive)

**Interfaces:**
- Consumes: JSX structure from Task 1 where `fco-detail-right` is a full-width sibling above `fa-detail-sheet`
- Produces: `fco-detail-right` displays as a horizontal flex row of panels instead of a vertical column

**What changes:**

Current (line ~346):
```css
.fco-detail-left, .fco-detail-right { display: flex; flex-direction: column; gap: 16px; }
```

`fco-detail-grid` (line ~345):
```css
.fco-detail-grid { display: grid; grid-template-columns: 1.55fr 1fr; gap: 16px; align-items: start; }
```

- [ ] **Step 1: Change fco-detail-right to horizontal row layout**

In `fco.css`, split the combined rule so `fco-detail-right` gets its own declaration with `flex-direction: row` and `flex-wrap: wrap`:

```css
/* Before: */
.fco-detail-left, .fco-detail-right { display: flex; flex-direction: column; gap: 16px; }

/* After: */
.fco-detail-left { display: flex; flex-direction: column; gap: 16px; }
.fco-detail-right { display: flex; flex-direction: row; flex-wrap: wrap; gap: 16px; align-items: start; }
.fco-detail-right > .fco-panel { flex: 1 1 280px; min-width: 0; }
```

This mirrors the "foflex top" pattern: each panel in the row shrinks/grows but has a minimum width so it wraps gracefully.

- [ ] **Step 2: Make fco-detail-grid single-column**

```css
/* Before: */
.fco-detail-grid { display: grid; grid-template-columns: 1.55fr 1fr; gap: 16px; align-items: start; }

/* After: */
.fco-detail-grid { display: grid; grid-template-columns: 1fr; gap: 16px; align-items: start; }
```

- [ ] **Step 3: Update responsive overrides**

Find the `@media (max-width: 1120px)` block (~line 975). It currently contains `.fco-detail-grid { grid-template-columns: 1fr; }` — this can be removed since the default is now `1fr`.

For `@media (max-width: 760px)`, add:
```css
.fco-detail-right { flex-direction: column; }
```

So on mobile each panel stacks vertically again.

- [ ] **Step 4: Visual check in browser**

Open a detail page. Verify:
- Profile, trust, and related panels appear as a row of cards above the dark hero sheet
- On mobile (resize to ≤760px) they stack vertically
- `fco-detail-left` (stats, traits) appears below as a single full-width column

- [ ] **Step 5: Commit**

```bash
rtk git add client/src/fco/fco.css && rtk git commit -m "style: display fco-detail-right as horizontal row above fa-detail-sheet"
```

---

## Self-Review

**Spec coverage:**
- ✅ `fco-detail-right` moved above `fa-detail-sheet` — Task 1
- ✅ Layout matches "foflex top" horizontal panel row — Task 2
- ✅ Mobile still collapses correctly — Task 2 Step 3
- ✅ `fco-detail-grid` single-column after removal of right col — Task 2 Step 2

**Placeholder scan:** None found.

**Type consistency:** No types involved (plain JSX/CSS).
