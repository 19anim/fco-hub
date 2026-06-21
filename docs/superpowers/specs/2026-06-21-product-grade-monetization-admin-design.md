# Product-Grade Monetization and Admin Dashboard Design

Date: 2026-06-21

## Summary

FCO Hub needs a product-grade monetization and admin system, not a temporary MVP. The system will let public users see relevant YouTube reviews, affiliate links, sponsor banners, ad slots, and future monetization content while allowing non-technical managers to create and manage that content from a protected admin dashboard.

The design uses a real admin authentication system, role and permission checks, audit logging, admin-only APIs, public-only monetization feeds, flexible placements, and entity-linked content. One Owner/Admin account can create Manager accounts with scoped permissions. Managers can administer content without editing code.

## Goals

- Add a protected admin dashboard with login.
- Allow the Owner/Admin to create Manager accounts and assign permissions.
- Move current admin/data-ops functionality out of public settings into protected admin routes.
- Manage YouTube reviews, affiliate links, sponsor banners, ad slots, and future monetization content from UI.
- Support both form-based content editing for non-technical admins and JSON/import tools for advanced users.
- Link monetization items to players and future entity types such as seasons, team colors, events, guides, or custom entities.
- Support per-entity priority and featured overrides.
- Render public monetization content by placement and context without exposing draft/admin-only data.
- Track impressions/clicks for future optimization.
- Keep the architecture ready to split admin into a separate frontend later.

## Non-Goals

- Do not hard-code monetization content into React components.
- Do not keep using manually-entered admin sync tokens in the public settings UI as the primary admin mechanism.
- Do not rely on frontend-only role toggles for security.
- Do not implement uncontrolled random content ordering as the default display strategy.
- Do not expose private admin metadata, drafts, or disabled content through public APIs.

## Recommended Architecture

Use a single repository and initially keep the public app and admin dashboard in the same React application, but enforce product boundaries in code and API design.

```txt
client/src/public or existing public pages
  - Dashboard
  - Database
  - Player Detail
  - Videos
  - Calculator
  - Market
  - calls public APIs only

client/src/admin
  - Login
  - Change Password
  - Admin Layout
  - Monetization Manager
  - Placement Manager
  - User/Manager Accounts
  - Data Ops
  - Analytics
  - Audit Log
  - calls admin APIs only

server/src/routes/public or existing public routes
  - public player/database data
  - sanitized monetization feed
  - public click/impression events

server/src/routes/admin
  - admin auth
  - admin users/managers
  - monetization CRUD
  - placements
  - data ops
  - analytics
  - audit log
```

This approach gives the speed of building inside the existing app while preserving a clean boundary that can later be migrated to a separate `admin-client` if needed.

## Admin Authentication and Permissions

### AdminUser

```txt
AdminUser
- _id
- name
- email
- passwordHash
- role: owner | manager
- permissions: string[]
- status: active | disabled | pending_password_change
- mustChangePassword: boolean
- lastLoginAt
- createdBy
- updatedBy
- createdAt
- updatedAt
```

### Owner/Admin

The Owner/Admin is the top-level account. It can:

- create Manager accounts
- update Manager permissions
- disable Manager accounts
- reset temporary passwords
- publish/archive monetization content
- manage placements
- run data ops
- view analytics and audit logs
- manage system settings

Managers must not be able to delete or modify the Owner account.

### Manager Accounts

The Owner creates Manager accounts using email and a temporary password. The first login forces password change. The system should be designed so this flow can later become email invitations without changing the user model.

Initial creation flow:

1. Owner opens `/admin/users`.
2. Owner creates a Manager with name, email, temporary password, role template, and permissions.
3. Manager logs in with temporary password.
4. Manager is redirected to `/admin/change-password`.
5. After changing password, `mustChangePassword` becomes false.

Future-ready states:

```txt
active
disabled
pending_password_change
invited
invite_expired
```

Only the first three are required initially.

### Permission Examples

```txt
monetization.view
monetization.create
monetization.edit
monetization.publish
monetization.archive

placements.view
placements.edit

users.view
users.create
users.edit
users.disable

dataOps.view
dataOps.run

analytics.view
auditLog.view
settings.view
settings.edit
```

Use both role and permissions. Roles are templates or broad categories; permissions enforce exact access.

### Auth APIs

```txt
POST /api/admin/auth/login
POST /api/admin/auth/logout
GET  /api/admin/auth/me
POST /api/admin/auth/change-password
```

Prefer httpOnly cookie sessions for admin auth. If deployment constraints make cookies difficult, the backend can support bearer-token fallback, but localStorage should not be the default place for admin credentials.

### Admin Middleware

```txt
adminAuth
requirePermission(permission)
```

Every admin API must check authentication and the relevant permission. Frontend menu hiding is only UX; backend permission enforcement is mandatory.

## Admin UI

### Routes

```txt
/admin/login
/admin/change-password
/admin
/admin/monetization
/admin/monetization/new
/admin/monetization/:id/edit
/admin/placements
/admin/users
/admin/analytics
/admin/data-ops
/admin/settings
/admin/audit-log
```

All `/admin/*` routes except login/change-password require auth.

### Admin Layout

Admin uses a separate layout from public pages.

Sidebar:

- Overview
- Monetization
- Placements
- Analytics
- Data Ops
- Users
- Audit Log
- Settings

Topbar:

- current user
- role badge
- logout
- optional global search

Menu visibility follows permissions, but backend authorization remains the source of truth.

### Login Flow

Login fields:

- email
- password

After login:

- if `mustChangePassword` is true, redirect to `/admin/change-password`
- otherwise redirect to `/admin`

Password change validation:

- new password must meet minimum length/complexity rules
- confirmation must match
- new password must not equal the temporary/current password

### Users/Managers Page

Route: `/admin/users`

Owner can:

- list admin users
- create Manager
- assign role template
- assign exact permissions
- disable Manager
- reset temporary password
- view last login
- view recent actions

Managers cannot:

- edit the Owner
- elevate their own permissions
- access user management without permission
- run data ops without permission

## Monetization Data Model

### MonetizationItem

A single model supports all monetization content types.

```txt
MonetizationItem
- _id
- type: youtube_video | affiliate_link | sponsor_banner | ad_slot | custom_cta
- title
- description
- status: draft | scheduled | published | disabled | archived
- platform: youtube | shopee | tiktok_shop | google_ads | custom
- placementIds[]
- linkedEntities[]
- priority
- isFeatured
- displayStrategy: manual | priority | newest | weighted_rotation
- startAt
- endAt
- content
  - youtubeVideoId
  - youtubeUrl
  - channelName
  - thumbnailUrl
  - targetUrl
  - imageUrl
  - ctaLabel
  - providerConfig
- affiliateLinks[]
  - platform
  - label
  - url
  - priority
  - status
- tracking
  - impressionCount
  - clickCount
  - lastClickedAt
- createdBy
- updatedBy
- publishedBy
- publishedAt
- archivedAt
- createdAt
- updatedAt
```

`content` is flexible, but the admin UI and backend validator must enforce required fields by `type`.

Validation examples:

- `youtube_video` requires a valid YouTube URL or `youtubeVideoId`, title, placement, and publishable status.
- `affiliate_link` requires platform, target URL, CTA label, placement, and status.
- `sponsor_banner` requires image URL or configured creative, target URL, placement, and status.
- `ad_slot` requires provider, slot ID, supported size/config, placement, and status.

### Linked Entities

A monetization item can link to multiple entities. Each relationship can override display priority for that entity.

```txt
linkedEntities[]
- entityType: player | season | team_color | event | guide | custom
- entityId
- displayLabel
- relationType: primary | secondary | mentioned | comparison
- priorityOverride
- featuredOverride
- startAtOverride
- endAtOverride
```

Example: a video comparing Ronaldo and Henry can be featured for Ronaldo and secondary for Henry.

```txt
Ronaldo ICON
- relationType: primary
- featuredOverride: true
- priorityOverride: 100

Henry ICON
- relationType: comparison
- featuredOverride: false
- priorityOverride: 85
```

This supports:

- many videos linked to one player
- one video linked to many players
- future links to season, team color, event, guide, or custom contexts

### Placement Model

Placements are managed as explicit entities instead of loose strings.

```txt
MonetizationPlacement
- _id
- key
- label
- page
- supportedTypes[]
- defaultLimit
- enabled
- description
- createdAt
- updatedAt
```

Default placements:

```txt
dashboard_top
dashboard_inline
videos_top
videos_grid
player_detail_featured
player_detail_related
player_detail_sidebar
player_detail_affiliate
database_inline
database_sidebar
market_top
market_inline
calculator_bottom
```

Admin UI should show friendly Vietnamese labels so managers do not need to remember technical keys.

## Monetization Admin UI

### Monetization List

Route: `/admin/monetization`

Features:

- search by title/platform/entity
- filter by type
- filter by platform
- filter by status
- filter by placement
- filter by creator
- sort by priority, newest, or performance
- actions gated by permission

Columns:

```txt
Title
Type
Platform
Placements
Linked Entities
Status
Priority
CTR
Updated At
Actions
```

Actions:

- view
- edit
- duplicate
- publish/unpublish
- archive

### Create/Edit Item

Routes:

```txt
/admin/monetization/new
/admin/monetization/:id/edit
```

Layout:

```txt
Left: form
Right: live preview + validation summary
```

Tabs:

```txt
Form
JSON / Import
Performance
```

Common form fields:

- type
- status
- title
- description
- platform
- placements
- priority
- featured
- schedule start/end

Type-specific fields:

YouTube video:

- YouTube URL
- parsed video ID
- channel name
- thumbnail URL
- attached affiliate CTAs

Affiliate link:

- platform
- CTA label
- affiliate URL
- image URL
- disclosure label

Sponsor banner:

- image URL
- target URL
- CTA label
- sponsor name

Ad slot:

- provider: placeholder | google_ads | custom
- slot ID
- size
- provider config

### Linked Entity Picker

The form includes a linked entity section.

Initial implementation prioritizes player search because existing project data already centers on players. The data model supports other entity types from the start.

For player linking:

- search by name, season, position, and OVR
- show result metadata
- support multi-select
- prevent duplicate selection
- allow per-entity overrides:
  - relation type
  - featured override
  - priority override
  - start/end override

### JSON / Import Tab

This tab is for Owner/dev/advanced admins.

Capabilities:

- edit current item JSON
- validate JSON syntax
- validate schema
- preview diff before saving
- import one or many items

Imported items should default to `draft`, not `published`, unless an authorized user explicitly publishes them after review.

### Preview

The edit screen provides live preview:

- YouTube card/embed
- related video card
- affiliate CTA card
- sponsor banner
- ad placeholder/slot

Preview can be scoped by placement and entity context, for example previewing how a video appears on Ronaldo ICON's player detail page.

## Public Rendering

Public pages use placement slots rather than hard-coded monetization content.

Example API-driven React usage:

```txt
<MonetizationSlot placement="player_detail_featured" entity={{ type: 'player', id: playerId }} limit={1} />
<MonetizationSlot placement="player_detail_related" entity={{ type: 'player', id: playerId }} limit={4} />
<MonetizationSlot placement="player_detail_affiliate" entity={{ type: 'player', id: playerId }} limit={3} />
```

`MonetizationSlot` responsibilities:

1. call public feed API by placement/entity
2. show loading/skeleton only when appropriate
3. render nothing if no item exists
4. map item type to rendering component
5. send impression events with dedupe

Renderer mapping:

```txt
youtube_video   -> YouTubeReviewCard / YouTubeEmbed
affiliate_link  -> AffiliateCtaCard
sponsor_banner  -> SponsorBanner
ad_slot         -> AdSlot / GoogleAdSlot
custom_cta      -> CustomCtaCard
```

### YouTube Rendering

Featured video may embed YouTube directly.

Related video lists should prefer thumbnail cards and only load the iframe after user action, such as opening a modal or expanding the card. This avoids loading many iframes on one page.

### Affiliate Rendering

Affiliate links should include a clear disclosure, such as:

```txt
Có thể chứa link affiliate.
```

Click flow should use a tracking redirect where possible:

```txt
User click CTA
-> GET /api/monetization/click/:targetId
-> server records click
-> server redirects to affiliate URL
```

### Ads Rendering

Supported providers:

```txt
placeholder
custom
google_ads
```

Google Ads integration should load the script once, defer/lazy-load it, and fail gracefully if ads are blocked.

## Public APIs

### Feed API

```txt
GET /api/monetization/feed
```

Query parameters:

```txt
placement
entityType
entityId
type
platform
limit
```

The server returns only sanitized, public-safe items:

- `published` only
- within `startAt/endAt`
- placement enabled
- matching entity context when provided
- no draft/admin metadata
- no provider secrets

### Sorting

When multiple items match, backend sorts by:

1. `featuredOverride` for the requested entity
2. `priorityOverride` for the requested entity
3. item-level `isFeatured`
4. item-level `priority`
5. newest `publishedAt` or `createdAt`

Default display is deterministic and admin-controlled. Do not use uncontrolled random ordering. `weighted_rotation` can be added later as a controlled strategy.

### Events API

```txt
POST /api/monetization/events
GET  /api/monetization/click/:targetId
```

Events capture:

```txt
MonetizationEvent
- _id
- itemId
- placementKey
- eventType: impression | click
- entityType
- entityId
- sessionId
- userAgent
- referrer
- createdAt
```

Use anonymous session-level dedupe for impressions to avoid inflated counts.

## Audit Log

Important admin actions are recorded.

```txt
AuditLog
- _id
- actorUserId
- actorEmail
- action
- resourceType
- resourceId
- before
- after
- ip
- userAgent
- createdAt
```

Examples:

```txt
admin.login
admin.logout
user.create
user.disable
user.permission_update
monetization.create
monetization.update
monetization.publish
monetization.archive
placement.update
dataOps.run
```

## Data Ops Migration

Current admin/data-ops functionality should move from public settings or UI role toggles into `/admin/data-ops`.

Required changes:

- remove admin sync token input from public Settings as the primary flow
- protect sync/crawler endpoints with `adminAuth`
- require `dataOps.view` for viewing status
- require `dataOps.run` for running jobs
- add confirmation for heavy jobs
- audit log data-ops actions

## Analytics

Admin analytics should start with practical metrics:

- total impressions
- total clicks
- CTR
- top items by click
- top placements
- top platforms
- top linked players/entities

Filters:

- date range
- platform
- placement
- type
- entity

This prepares the system for affiliate optimization and ad placement tuning.

## Implementation Phases

### Phase 1: Admin Foundation and Auth

- Add `AdminUser` model.
- Add password hashing.
- Add login/logout/me/change-password APIs.
- Add httpOnly cookie session.
- Add `adminAuth` and `requirePermission` middleware.
- Add Owner bootstrap from env or script.
- Add `/admin/login`, `/admin/change-password`, protected admin layout.
- Verify login, logout, password change, protected APIs, and public app compatibility.

### Phase 2: Manager Account Management

- Add admin user CRUD APIs.
- Add `/admin/users` UI.
- Support temporary password creation and forced password change.
- Enforce Owner/Manager restrictions.
- Audit user management actions.

### Phase 3: Monetization Models and Admin CRUD

- Add `MonetizationItem` and `MonetizationPlacement` models.
- Seed default placements.
- Add admin CRUD, publish/unpublish, archive, duplicate APIs.
- Add validation by type.
- Add `/admin/monetization` list and create/edit screens.
- Add form UI, JSON/import tab, and preview panel.

### Phase 4: Linked Entities and Player Picker

- Add entity linking and override support.
- Add admin player search endpoint for picker.
- Add linked entity picker UI.
- Implement entity-aware sorting.
- Verify many videos per player and one video across many players.

### Phase 5: Public Monetization Rendering

- Add sanitized public feed API.
- Add tracking redirect and event APIs.
- Add `MonetizationSlot` and renderers.
- Integrate with Videos and Player Detail first, then other pages.
- Verify only published matching content appears.

### Phase 6: Data Ops Migration

- Move admin sync/data ops UI into `/admin/data-ops`.
- Protect data-ops endpoints by auth and permissions.
- Remove public admin token flow from Settings.
- Audit data-ops actions.

### Phase 7: Analytics

- Aggregate click/impression events.
- Add `/admin/analytics`.
- Add filters and top-items tables.
- Verify permissions and metric calculations.

### Phase 8: Google Ads and External Providers

- Add provider config validation.
- Add `GoogleAdSlot` renderer.
- Load Google Ads script once and gracefully handle ad blockers.
- Expand provider-specific fields as needed.

## Rollout Strategy

1. Deploy admin auth first.
2. Bootstrap Owner account.
3. Create placements.
4. Create monetization drafts.
5. Preview in admin.
6. Publish one low-risk placement, such as `videos_top`.
7. Monitor errors and events.
8. Expand to player detail and other placements.
9. Move old admin/data-ops screens behind `/admin`.

## Verification Checklist

- Owner can log in.
- Wrong credentials fail.
- Manager must change temporary password on first login.
- Manager permissions are enforced by backend.
- Manager cannot modify Owner or self-elevate.
- Draft/disabled/archived items never appear publicly.
- Published scheduled items respect start/end dates.
- Placement filtering works.
- Entity filtering works.
- Per-entity featured/priority overrides sort correctly.
- Public feed is sanitized.
- Affiliate clicks redirect and track.
- Impression tracking dedupes repeated views.
- Admin actions create audit logs.
- Data ops cannot run without `dataOps.run`.
- Public Settings no longer exposes admin token flow after migration.
- Google Ads failure/ad blockers do not break the page.

## Open Product Decisions

These are deliberate follow-up product decisions, not blockers for the core design:

- Exact password complexity rules.
- Whether to add two-factor authentication after the first secure admin release.
- Whether `weighted_rotation` should be enabled by default later.
- Which email provider to use when temporary passwords evolve into invite/reset links.
- Whether to split admin into a separate `admin-client` deployment after the product foundation is stable.
