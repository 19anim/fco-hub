# Backend Search Input Throttling Design

## Goal

Reduce unnecessary backend load from free-text search inputs, especially `/players`, where the player database currently has 23,656 records and search can trigger broad regex queries on every keystroke.

## Scope

Apply one shared policy to text inputs that can trigger backend search calls:

- Active `/players` database search in `DatabaseView`.
- Player picker search used by compare and upgrade flows.
- Admin monetization title search.
- Admin player autocomplete in the monetization list.
- Linked entity player picker in monetization forms.
- Legacy database/player table search code if it remains in the project.

Do not apply debounce to deliberate non-text controls such as select boxes, range filters, sort, pagination, and page size. Those controls should continue to fetch immediately after the user changes them.

## Client Design

Add a small reusable hook for debouncing values, with a default delay of 400ms.

For every free-text input that can trigger backend search:

- Keep local input state updating immediately so typing remains responsive.
- Add `maxLength={50}` to the input.
- Use the debounced, trimmed value for API params.
- Empty query means no text filter and should preserve the existing unfiltered-list behavior.
- A one-character query must not trigger a backend search request.
- On list pages such as `/players`, keep the current result set while the user has typed exactly one character rather than replacing it with an unfiltered fetch.
- On autocomplete components, show an empty suggestion list for one-character queries.

## Server Design

Add backend safety guards so the endpoints are protected even if a client bypasses the UI.

For `/api/players`, `/api/admin/search/players`, and `/api/admin/monetization`:

- Trim search input.
- Cap search input to 50 characters.
- Only apply regex search when the normalized query length is at least 2.
- Escape regex metacharacters before building `$regex` queries.

Endpoint-specific behavior:

- `/api/players`: a one-character `search` should be ignored as a text search filter.
- `/api/admin/search/players`: a one-character `q` should return no autocomplete results.
- `/api/admin/monetization`: a one-character `search` should be ignored as a title search filter.

## Data Flow

1. User types into a backend-backed text search input.
2. The raw input state updates immediately.
3. The debounced value updates after 400ms of inactivity.
4. The component normalizes the debounced value.
5. If normalized length is 0, existing unfiltered behavior applies.
6. If normalized length is 1, no backend text search is sent.
7. If normalized length is 2 or more, the component sends the normalized query.
8. The server repeats normalization and guard checks before constructing database filters.

## Testing

Automated checks should cover the highest-risk behavior where practical:

- Debounced search does not call the relevant API on every keystroke.
- Two-character queries trigger search after the debounce delay.
- One-character queries do not trigger backend search.
- Inputs cap user-entered text at 50 characters.
- Server-side handlers ignore or reject one-character text search according to endpoint behavior.
- Regex metacharacters are treated as literal search text.

Manual verification should cover:

- `/players`: fast typing produces a single delayed `/api/players` search call, not one request per keypress.
- `/players`: one-character search does not run a regex search over the player collection.
- Compare and upgrade player pickers: suggestions appear only after at least two characters and the debounce delay.
- Admin monetization title search and player pickers follow the same policy.

## Out of Scope

- Replacing regex search with full-text indexes.
- Changing select/range filter fetch timing.
- Adding caching or SWR request deduplication.
- Reworking player database pagination or sorting behavior.
