# Design: Monetization Admin — Player Filter + Delete Button

**Date:** 2026-06-28  
**Route:** `/admin/monetization`

## Goal

Two additions to the monetization list page:
1. Filter items by linked player (autocomplete search)
2. Delete button visible only to `owner`-role admins, with confirmation modal

---

## 1. Backend — Filter by Linked Player

**File:** `server/src/controllers/adminMonetization.controller.js` — `listItems`

- Accept new query param `linkedPlayerId`
- When present, add to filter: `{ 'linkedEntities.entityId': linkedPlayerId }`
- MongoDB query on embedded array field — no new index or migration needed

---

## 2. Frontend — Player Autocomplete Filter

**File:** `client/src/pages/admin/MonetizationListPage.jsx`

State additions:
- `filters.linkedPlayerId` — the selected player's entityId (string)
- `playerFilterLabel` — display name shown in the input
- `playerSuggestions` — list of search results
- `playerSearch` — raw input text (debounced)

Behavior:
- Debounce 300ms, call `GET /admin/search/players?q=...&limit=10`
- Dropdown shows player name + pid
- On select: set `linkedPlayerId` in filters, show name in input with X to clear
- On clear: reset both `linkedPlayerId` and display label, re-fetch list
- Passes `linkedPlayerId` to `adminMonetizationService.list(params)` which forwards it to backend

Reuses same axios call pattern as `LinkedEntityPicker.jsx` — no new hook.

---

## 3. Frontend — Delete Button + Confirmation Modal

**File:** `client/src/pages/admin/MonetizationListPage.jsx`

### Delete Button

- Import `useAdminAuth` — only render `<Trash2>` icon button when `user.role === 'owner'`
- Placed at end of action row in table, after Archive button
- Styled red on hover: `hover:text-red-400`
- Disabled (with tooltip) when `item.status === 'published'` — matches backend guard

### Confirmation Modal

Inline component inside `MonetizationListPage` — no separate file.

State: `deleteTarget` — the item to delete (null = modal closed)

Modal content:
- Title: "Xoá item này?"
- Body: item title, current status, warning "Thao tác này không thể hoàn tác"
- Footer: Cancel button + Delete button (red, `btn-danger` style or red bg)

On confirm:
- Call `adminMonetizationService.delete(deleteTarget._id)`
- On success: `setItems(prev => prev.filter(i => i._id !== deleteTarget._id))` + close modal
- On error: show error message inside modal (do not close)

---

## Scope

- No new files
- No new API routes (delete endpoint already exists)
- No schema changes
- No permission model changes — purely frontend role check on `user.role === 'owner'`
