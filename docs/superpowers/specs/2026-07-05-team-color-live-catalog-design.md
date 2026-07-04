# Team Color live catalog and strip design

## Goal

Replace the current `fco-squad-panels` placeholder team color UI with a FIFAAddict-style `teamColorStrip`, backed by live evaluation through FIFAAddict's squadmaker API. Each live response is also learned into our own DB so the team color catalog improves over time.

## Architecture

The client builds a FIFAAddict-compatible team color payload from the current squad and sends it to our server:

```txt
SquadView action -> build team color payload -> POST /api/team-colors/evaluate
```

The server is the only layer that talks to FIFAAddict. It hashes the payload for cache/dedupe, calls `https://fifaaddict.com/fco-squadmaker/api_team_color.php`, returns the live result to the client, then upserts catalog and observation records. The client renders from the live result; the DB is a progressive catalog cache, not the source of truth for the first version.

## Client behavior

`SquadView` refreshes team color after any action that can affect team color while at least one player remains on the pitch:

- add or replace player
- remove player
- clear squad
- move/swap a player if the slot role changes
- change one player's grade
- bulk grade changes

The refresh is event-driven with a short debounce and a payload-hash guard so duplicate state updates do not trigger duplicate requests. Empty squads clear team color state without calling the API.

The current side panels for `Team color đội` and `Team color nâng cấp` are replaced with a `teamColorStrip` area matching FIFAAddict's three-button pattern:

- Club/group button
- Grade button
- Relation button

Each item shows the local strip icon, the active/candidate count, and active styling when data exists. Clicking an item opens a detail modal that lists the relevant active/candidate team colors with localized name, level/count, rewards, icon, and matched players when available.

## Server behavior

Add a public squad evaluation endpoint:

```txt
POST /api/team-colors/evaluate
```

The endpoint accepts the FIFAAddict-compatible payload, validates basic shape, calls the FIFAAddict API with the required squadmaker token/header flow, and returns the response unchanged enough for the client to render. The service also enriches/upserts local metadata such as `localIconPath` when an icon is downloaded.

The server stores raw observations for audit and future inference. Catalog upserts are idempotent by `tcid`.

## Data model

### TeamColorCatalog

A catalog document represents one discovered team color keyed by `tcid`.

Important fields:

- `tcid`
- `category`: `club`, `grade`, or `relation` from the response group
- `refType`: `team`, `nation`, `class`, `grade`, `pid`, etc.
- `refId`
- `type`
- localized `names`
- `image`
- `iconSourceUrl`
- `localIconPath`
- `levels[]`, merged by `level + required + rewards`
- `observedPlayers[]` for non-grade groups, keyed primarily by `uic`
- observation counters and timestamps

`matched_slots` and `qualified_slots` identify which submitted pitch slots are matched or qualified for a returned team color and should receive that team color's rewards. We map those slots back to payload players before storing observations. We never store pitch slots as player identity, and we do not infer more than the response proves.

Grade team colors do not store player membership or player names. They store only grade-band/level conditions because grade depends on reinforce level and player count, not player identity. Multiple grade levels are preserved, e.g. 5 gold players and 8 gold players can have different rewards.

For non-grade player membership, use base identity (`uic`) as the primary key because a player belonging to a team color should generally apply across all seasons/cards. Store observed card refs (`uid`, `year`) under that base identity.

### TeamColorObservation

Observation documents preserve raw evidence:

- `payloadHash`
- `tcid`
- `category`
- raw response item
- payload players
- mapped matched players
- mapped qualified players
- timestamp

These allow future recalculation if membership inference rules change.

## Icons

The first implementation localizes both strip and modal icons.

Strip icons are stored as fixed assets:

```txt
client/public/teamcolor-icons/strip/club.png
client/public/teamcolor-icons/strip/grade.png
client/public/teamcolor-icons/strip/relation.png
```

Modal/detail icons are downloaded progressively when a team color is observed:

- If response item has `image`, download from `https://s1.fifaaddict.com/fo4/teamcolor/<image>` to `/teamcolor-icons/items/<image>`.
- If `image` is empty and `ref_type === "team"`, download crest from `https://s1.fifaaddict.com/fo4/crests/light/l<ref_id>.png` to `/teamcolor-icons/crests/l<ref_id>.png`.

The UI uses `localIconPath` first and falls back to the remote URL if download fails.

## Error handling

Team color evaluation must not block squad editing. If the remote API fails, the UI keeps the last successful result for the current payload when safe, or shows a small unavailable state. The server returns clear errors and avoids throwing away cached/catalog data.

Repeated identical payloads are cached by hash. Remote calls are rate-limited conservatively to avoid unnecessary load.

## Testing

Server tests cover:

- payload validation and hash creation
- FIFAAddict response normalization
- catalog upsert: grade merges levels and stores no players
- catalog upsert: relation/non-grade maps slots to `uic` player identities
- icon source/local path resolution
- controller behavior with mocked FIFAAddict responses

Client tests cover:

- squad-to-team-color payload builder
- event-driven refresh conditions
- `teamColorStrip` renders three items and counts
- detail modal renders localized names, rewards, local icons, and matched players

Manual verification:

- Build the Manchester United squad with grade +8.
- Confirm club, grade, and relation strip items activate.
- Confirm detail modal contents match FIFAAddict for Manchester United, Gold Wave, and Bức tường thành Quỷ Đỏ.
- Confirm downloaded icon files are used locally after observation.
