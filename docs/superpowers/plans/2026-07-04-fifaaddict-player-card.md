# FIFAAddict-style Shared Player Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable FIFAAddict-style FCO player card system with local card background assets, then use it in the squadmaker pitch card.

**Architecture:** Add a shared card theme registry that resolves season/theme metadata and local cloned backgrounds outside `SquadView`. Add a shared `FcoPlayerCard` renderer with FIFAAddict-compatible DOM/classes, then make the squadmaker wrapper pass precomputed OVR/position/bonus data into it. Keep squad-specific state, drag/drop, edit/remove actions, and bonus calculations in `SquadView`.

**Tech Stack:** React 19, Vite 8, Vitest 4, plain JavaScript modules, CSS in `client/src/fco/fco.css`, existing `seasonSprites.js`, `helpers.js`, `upgradeHelpers.js`, and `SquadView.jsx`.

## Global Constraints

- Use `rtk` prefix for all shell commands.
- Do not refactor `/upgrade` or player detail to use the new card in this pass.
- Do not clone every possible FIFAAddict theme globally; clone only themes needed by current app data or verified examples.
- Do not rework team-color formulas or search modal behavior.
- `card-edit-btn` appears on `.fco-squad-card` hover/focus next to a small remove button.
- Remove the old squad card `Đổi vị trí` button.
- Remove the old `.fco-squad-cardlevel` mini `+/-` level control.
- Keep valid HTML: do not nest edit/remove buttons inside a clickable `<button>` card.
- Missing local backgrounds must render a stable fallback and be included in the final theme coverage report.
- After UI changes, verify in the running browser app and report cloned/fallback/failed themes compared with seasons present in the app.

---

## File Structure

- Create `client/src/fco/cardThemes.js` — shared card theme lookup and helpers. Owns theme id/class/background fallback decisions.
- Create `client/src/fco/cardThemes.test.js` — Vitest coverage for registry lookup, class generation, fallback, and coverage report helpers.
- Create `client/src/fco/components/FcoPlayerCard.jsx` — reusable FIFAAddict-compatible visual card renderer. It has no squad state.
- Create `client/src/fco/components/FcoPlayerCard.test.jsx` only if the project already supports React component tests; otherwise cover markup through helper-level tests and manual browser verification.
- Modify `client/src/fco/ui.jsx` — replace `PlayerCardMini` internals with a wrapper around `FcoPlayerCard`, preserving existing public props used by `SquadView`.
- Modify `client/src/fco/views/SquadView.jsx` — remove old move/level controls, add hover edit/remove actions, and pass salary/theme data into the shared card.
- Modify `client/src/fco/fco.css` — add FIFAAddict-compatible card styles and adjust squad hover actions.
- Add local background assets under `client/src/fco/assets/card-themes/` when cloned assets are available. Keep placeholder/fallback behavior for themes not cloned yet.
- Create `docs/superpowers/plans/2026-07-04-card-theme-coverage.md` during verification — records cloned/fallback/failed theme coverage.

---

## Task 1: Add shared card theme registry

**Files:**
- Create: `client/src/fco/cardThemes.js`
- Create: `client/src/fco/cardThemes.test.js`

**Interfaces:**
- Consumes: `getSeasonVisual(code)` from `client/src/fco/seasonSprites.js`.
- Produces: `getCardThemeForPlayer(playerOrSeason)` returning `{ seasonCode: string, themeId: string, className: string, backgroundImage: string, hasLocalAsset: boolean, source: 'local' | 'season-visual' | 'fallback' }`.
- Produces: `getCardThemeCoverage(players)` returning `{ cloned: Array, fallback: Array, seasonVisual: Array }` grouped by season/theme.
- Produces: `CARD_THEME_FALLBACK_ID = 'fallback'`.

- [ ] **Step 1: Write failing tests for theme lookup and coverage**

Create `client/src/fco/cardThemes.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { CARD_THEME_FALLBACK_ID, getCardThemeCoverage, getCardThemeForPlayer } from './cardThemes.js';

describe('getCardThemeForPlayer', () => {
  it('returns a stable fallback theme for an unknown season', () => {
    expect(getCardThemeForPlayer({ season: 'UNKNOWN_SEASON' })).toEqual({
      seasonCode: 'UNKNOWN_SEASON',
      themeId: CARD_THEME_FALLBACK_ID,
      className: 'card-theme-fallback',
      backgroundImage: '',
      hasLocalAsset: false,
      source: 'fallback',
    });
  });

  it('uses an explicit local registry entry when available', () => {
    expect(getCardThemeForPlayer({ season: 'NG' })).toMatchObject({
      seasonCode: 'NG',
      themeId: 'ng',
      className: 'card-theme-ng',
      hasLocalAsset: true,
      source: 'local',
    });
  });

  it('accepts a raw season string', () => {
    expect(getCardThemeForPlayer('NG')).toMatchObject({
      seasonCode: 'NG',
      themeId: 'ng',
      className: 'card-theme-ng',
    });
  });
});

describe('getCardThemeCoverage', () => {
  it('deduplicates seasons and groups cloned and fallback themes', () => {
    const coverage = getCardThemeCoverage([
      { season: 'NG', name: 'A' },
      { season: 'NG', name: 'B' },
      { season: 'UNKNOWN_SEASON', name: 'C' },
    ]);

    expect(coverage.cloned).toEqual([
      expect.objectContaining({ seasonCode: 'NG', themeId: 'ng', count: 2 }),
    ]);
    expect(coverage.fallback).toEqual([
      expect.objectContaining({ seasonCode: 'UNKNOWN_SEASON', themeId: CARD_THEME_FALLBACK_ID, count: 1 }),
    ]);
    expect(coverage.seasonVisual).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
cd client && rtk npm test -- src/fco/cardThemes.test.js
```

Expected: FAIL because `src/fco/cardThemes.js` does not exist.

- [ ] **Step 3: Implement the registry**

Create `client/src/fco/cardThemes.js`:

```js
import { getSeasonVisual } from './seasonSprites.js';

export const CARD_THEME_FALLBACK_ID = 'fallback';

const LOCAL_CARD_THEMES = {
  NG: {
    themeId: 'ng',
    className: 'card-theme-ng',
    backgroundImage: '/fco/card-themes/card-theme-ng.svg',
  },
};

function normalizeSeasonCode(value) {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value || '').trim().toUpperCase();
  }
  return String(value?.season || value?.seasonCode || '').trim().toUpperCase();
}

function normalizeThemeId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || CARD_THEME_FALLBACK_ID;
}

function getFallbackTheme(seasonCode) {
  return {
    seasonCode,
    themeId: CARD_THEME_FALLBACK_ID,
    className: 'card-theme-fallback',
    backgroundImage: '',
    hasLocalAsset: false,
    source: 'fallback',
  };
}

export function getCardThemeForPlayer(playerOrSeason) {
  const seasonCode = normalizeSeasonCode(playerOrSeason);
  if (!seasonCode) return getFallbackTheme('');

  const localTheme = LOCAL_CARD_THEMES[seasonCode];
  if (localTheme) {
    const themeId = normalizeThemeId(localTheme.themeId || seasonCode);
    return {
      seasonCode,
      themeId,
      className: localTheme.className || `card-theme-${themeId}`,
      backgroundImage: localTheme.backgroundImage || '',
      hasLocalAsset: Boolean(localTheme.backgroundImage),
      source: 'local',
    };
  }

  const seasonVisual = getSeasonVisual(seasonCode);
  if (seasonVisual.cardImage) {
    const themeId = normalizeThemeId(seasonCode);
    return {
      seasonCode,
      themeId,
      className: `card-theme-${themeId}`,
      backgroundImage: seasonVisual.cardImage,
      hasLocalAsset: false,
      source: 'season-visual',
    };
  }

  return getFallbackTheme(seasonCode);
}

export function getCardThemeCoverage(players = []) {
  const bySeason = new Map();

  for (const player of players) {
    const theme = getCardThemeForPlayer(player);
    const key = `${theme.source}:${theme.seasonCode}:${theme.themeId}`;
    const existing = bySeason.get(key) || { ...theme, count: 0 };
    existing.count += 1;
    bySeason.set(key, existing);
  }

  const coverage = { cloned: [], fallback: [], seasonVisual: [] };
  for (const theme of bySeason.values()) {
    if (theme.source === 'local') coverage.cloned.push(theme);
    else if (theme.source === 'season-visual') coverage.seasonVisual.push(theme);
    else coverage.fallback.push(theme);
  }

  for (const group of Object.values(coverage)) {
    group.sort((a, b) => String(a.seasonCode).localeCompare(String(b.seasonCode)));
  }

  return coverage;
}
```

- [ ] **Step 4: Add the first local fallback asset**

Create `client/public/fco/card-themes/card-theme-ng.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="220" height="300" viewBox="0 0 220 300" role="img" aria-label="Fallback FCO card background">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#384252"/>
      <stop offset="0.55" stop-color="#1f2631"/>
      <stop offset="1" stop-color="#111827"/>
    </linearGradient>
    <radialGradient id="shine" cx="50%" cy="18%" r="58%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <path d="M18 16h184l-9 240-83 35-83-35z" fill="url(#bg)"/>
  <path d="M18 16h184l-9 240-83 35-83-35z" fill="url(#shine)"/>
  <path d="M30 30h160l-8 215-72 30-72-30z" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="3"/>
  <path d="M18 16h44v250l-35-10z" fill="#45d6b5" fill-opacity="0.22"/>
</svg>
```

- [ ] **Step 5: Run tests and build**

```bash
cd client && rtk npm test -- src/fco/cardThemes.test.js && rtk npm run build
```

Expected: tests PASS and Vite build PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add client/src/fco/cardThemes.js client/src/fco/cardThemes.test.js client/public/fco/card-themes/card-theme-ng.svg
rtk git commit -m "feat(squad): add shared card theme registry"
```

---

## Task 2: Add reusable FIFAAddict-style player card renderer

**Files:**
- Create: `client/src/fco/components/FcoPlayerCard.jsx`
- Modify: `client/src/fco/ui.jsx`
- Modify: `client/src/fco/fco.css`
- Modify: `client/src/fco/cardThemes.test.js`

**Interfaces:**
- Consumes: `getCardThemeForPlayer(playerOrSeason)` from `client/src/fco/cardThemes.js`.
- Consumes: `PlayerAvatar`, `SeasonChip` support already in `ui.jsx`; to avoid circular imports, `FcoPlayerCard` should import `PlayerAvatar` only if it is moved out of `ui.jsx`. Preferred: keep `PlayerAvatar` in `ui.jsx` and pass rendered media via prop only if circular import appears. If no circular import occurs, import helpers from `../helpers.js` and render `<img>` directly from `player.imageUrl`.
- Produces: `FcoPlayerCard({ player, theme, ovr, pos, salary, grade, flags, variant, className, onClick, title })`.
- Preserves: existing `PlayerCardMini` exported from `client/src/fco/ui.jsx` with the same props used by `SquadView`.

- [ ] **Step 1: Add helper tests for class expectations**

Append to `client/src/fco/cardThemes.test.js`:

```js
describe('FIFAAddict-compatible class names', () => {
  it('returns card-theme classes without spaces', () => {
    const theme = getCardThemeForPlayer({ season: 'NG' });
    expect(theme.className).toBe('card-theme-ng');
    expect(theme.className).not.toMatch(/\s/);
  });
});
```

- [ ] **Step 2: Run tests before component work**

```bash
cd client && rtk npm test -- src/fco/cardThemes.test.js
```

Expected: PASS.

- [ ] **Step 3: Create `FcoPlayerCard`**

Create `client/src/fco/components/FcoPlayerCard.jsx`:

```jsx
import { cleanName, statColor } from '../helpers.js';
import { getCardThemeForPlayer } from '../cardThemes.js';
import { normalizeUpgradeLevel } from '../upgradeHelpers.js';

function getPlayerImage(player) {
  return player?.imageUrl || player?.avatar || '';
}

function getFlagItems(player, flags) {
  if (Array.isArray(flags)) return flags.filter(Boolean);
  return [
    player?.nation ? { key: 'nation', label: player.nation } : null,
    player?.club ? { key: 'club', label: player.club } : null,
  ].filter(Boolean);
}

export function FcoPlayerCard({
  player,
  theme: themeProp,
  ovr,
  pos,
  salary,
  grade,
  flags,
  variant = 'squad',
  className = '',
  onClick,
  title,
}) {
  const theme = themeProp || getCardThemeForPlayer(player);
  const safeGrade = normalizeUpgradeLevel(grade ?? player?.upgradeLevel);
  const displayedOvr = ovr ?? player?.ovr ?? 0;
  const displayedPos = pos || player?.primaryPos || '';
  const displayedSalary = salary ?? player?.salary;
  const playerName = cleanName(player?.name);
  const playerImage = getPlayerImage(player);
  const flagItems = getFlagItems(player, flags);
  const Root = onClick ? 'button' : 'div';

  return (
    <Root
      type={onClick ? 'button' : undefined}
      className={[
        'player-card',
        player ? 'has-player' : '',
        'fc-card',
        theme.className,
        `fc-card--${variant}`,
        className,
      ].filter(Boolean).join(' ')}
      style={{
        '--fco-card-theme-bg': theme.backgroundImage ? `url(${theme.backgroundImage})` : undefined,
        '--fco-card-ovr-color': statColor(displayedOvr),
      }}
      onClick={onClick}
      title={title || playerName}
    >
      {theme.backgroundImage ? (
        <img className="card-bg-img fc-bg" src={theme.backgroundImage} alt="" draggable="false" />
      ) : (
        <span className="card-bg-img fc-bg" aria-hidden="true" />
      )}

      <span className="card-ovr fc-ovr">{displayedOvr}</span>
      <span className="card-pos-label fc-pos">{displayedPos}</span>
      <span className={`fc-salary${displayedSalary ? '' : ' is-empty'}`}>{displayedSalary || ''}</span>

      <span className="card-player-media fc-player-media">
        {playerImage ? <img src={playerImage} alt="" draggable="false" /> : <span className="fc-player-media-placeholder" aria-hidden="true" />}
      </span>

      <span className={`fc-grade enchant_${safeGrade}`}>+{safeGrade}</span>

      <span className="card-player-name fc-name-area">
        <span className="fc-name">{playerName}</span>
        <span className="card-flags fc-flags">
          {flagItems.map((flag) => (
            <span className="fc-flag" key={flag.key || flag.label} title={flag.label}>
              {flag.img ? <img src={flag.img} alt="" /> : <span>{String(flag.label || '').slice(0, 2).toUpperCase()}</span>}
            </span>
          ))}
        </span>
      </span>
    </Root>
  );
}
```

- [ ] **Step 4: Replace `PlayerCardMini` internals with the shared renderer**

In `client/src/fco/ui.jsx`, add imports near the existing imports:

```js
import { FcoPlayerCard } from './components/FcoPlayerCard.jsx';
import { getCardThemeForPlayer } from './cardThemes.js';
```

Replace the body of `PlayerCardMini` with:

```jsx
export function PlayerCardMini({ player, slotPos, ovr, ovrIsFallback = false, bonus, level, className = '', onClick, title }) {
  const totalBonus = bonus?.totalBonus || 0;
  const theme = getCardThemeForPlayer(player);

  return (
    <span className="fco-player-card-mini-wrap">
      <FcoPlayerCard
        player={player}
        theme={theme}
        ovr={ovr ?? player?.ovr}
        pos={slotPos || player?.primaryPos}
        salary={player?.salary}
        grade={level ?? player?.upgradeLevel}
        variant="squad"
        className={className}
        onClick={onClick}
        title={title || cleanName(player?.name)}
      />
      {ovrIsFallback && (
        <span className="fco-player-card-mini-ovr-warning" title="Không có OVR riêng cho vị trí này" aria-label="Không có OVR riêng cho vị trí này">
          <I.Alert size={9} />
        </span>
      )}
      {totalBonus > 0 && <span className="fco-player-card-mini-bonus">TC +{totalBonus}</span>}
    </span>
  );
}
```

Do not remove `SeasonChip` or `PlayerAvatar`; other files still use them.

- [ ] **Step 5: Add CSS for the shared card**

In `client/src/fco/fco.css`, replace the old `.fco-player-card-mini` block from `.fco-player-card-mini {` through `.fco-player-card-mini-bonus { color: var(--accent); }` with:

```css
.fco-player-card-mini-wrap {
  position: relative;
  display: inline-block;
  width: 99px;
  height: 104px;
  filter: drop-shadow(0 10px 16px rgba(0,0,0,.32));
}

.player-card.fc-card {
  position: relative;
  display: block;
  width: 99px;
  height: 104px;
  border: 0;
  padding: 0;
  border-radius: 16px 16px 13px 13px;
  background: transparent;
  color: var(--fco-card-text, var(--text));
  cursor: pointer;
  overflow: hidden;
  isolation: isolate;
}

button.player-card.fc-card { font: inherit; }

.card-bg-img.fc-bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
  background:
    var(--fco-card-theme-bg, none) center / cover no-repeat,
    radial-gradient(circle at 50% 22%, color-mix(in srgb, var(--fco-card-ring, var(--accent)) 34%, transparent), transparent 40%),
    linear-gradient(155deg, color-mix(in srgb, var(--fco-card-base, #29313b) 72%, #fff 8%), color-mix(in srgb, var(--fco-card-base, #111827) 72%, #000 28%));
  border: 1px solid color-mix(in srgb, var(--fco-card-ring, var(--accent)) 46%, rgba(255,255,255,.22));
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.08), inset 0 -26px 32px rgba(0,0,0,.32);
}

span.card-bg-img.fc-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, color-mix(in srgb, var(--fco-card-side, var(--accent)) 48%, transparent) 0 17%, transparent 17% 100%);
  opacity: .38;
}

.card-ovr.fc-ovr {
  position: absolute;
  left: 7px;
  top: 8px;
  z-index: 2;
  font-family: var(--mono);
  font-size: 19px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -.04em;
  color: var(--fco-card-ovr-color, #fff);
  text-shadow: 0 1px 2px rgba(0,0,0,.65);
}

.card-pos-label.fc-pos {
  position: absolute;
  left: 8px;
  top: 29px;
  z-index: 2;
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 900;
  line-height: 1;
  color: var(--fco-card-name, #fff);
  text-shadow: 0 1px 2px rgba(0,0,0,.65);
}

.fc-salary {
  position: absolute;
  right: 7px;
  top: 7px;
  z-index: 3;
  min-width: 18px;
  border-radius: 999px;
  padding: 2px 5px;
  background: rgba(0,0,0,.48);
  border: 1px solid rgba(255,255,255,.16);
  color: #fff;
  font-family: var(--mono);
  font-size: 9px;
  font-weight: 900;
  line-height: 1;
  text-align: center;
}

.fc-salary.is-empty { opacity: 0; }

.card-player-media.fc-player-media {
  position: absolute;
  left: 50%;
  bottom: 28px;
  z-index: 1;
  transform: translateX(-45%);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 74px;
  height: 74px;
}

.card-player-media.fc-player-media img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 5px 6px rgba(0,0,0,.42));
}

.fc-player-media-placeholder {
  width: 54px;
  height: 62px;
  border-radius: 18px 18px 10px 10px;
  background: rgba(255,255,255,.12);
}

.fc-grade {
  position: absolute;
  left: 50%;
  bottom: 5px;
  z-index: 4;
  transform: translateX(-50%);
  border-radius: 999px;
  padding: 2px 5px;
  font-family: var(--mono);
  font-size: 9px;
  font-weight: 900;
  line-height: 1;
  background: rgba(0,0,0,.48);
  border: 1px solid rgba(255,255,255,.16);
  color: #fff;
}

.fc-grade.enchant_5,
.fc-grade.enchant_6,
.fc-grade.enchant_7,
.fc-grade.enchant_8 { color: #72e8ff; }
.fc-grade.enchant_9,
.fc-grade.enchant_10,
.fc-grade.enchant_11,
.fc-grade.enchant_12,
.fc-grade.enchant_13 { color: #ffd66e; }

.card-player-name.fc-name-area {
  position: absolute;
  left: 7px;
  right: 7px;
  bottom: 18px;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  color: var(--fco-card-name, #fff);
  text-shadow: 0 1px 2px rgba(0,0,0,.75);
}

.fc-name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
  font-size: 10px;
  font-weight: 850;
}

.card-flags.fc-flags {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 10px;
}

.fc-flag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 14px;
  height: 10px;
  border-radius: 2px;
  background: rgba(0,0,0,.42);
  color: rgba(255,255,255,.9);
  font-size: 6px;
  font-weight: 800;
  line-height: 1;
}

.fc-flag img { max-width: 14px; max-height: 10px; object-fit: cover; }

.fco-player-card-mini-ovr-warning {
  position: absolute;
  left: 30px;
  top: 6px;
  z-index: 5;
  width: 13px;
  height: 13px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #f5c84b;
  background: rgba(0,0,0,.54);
  border: 1px solid rgba(245,200,75,.48);
  box-shadow: 0 1px 4px rgba(0,0,0,.34);
  text-shadow: none;
}

.fco-player-card-mini-bonus {
  position: absolute;
  right: 6px;
  bottom: 5px;
  z-index: 5;
  border-radius: 999px;
  padding: 2px 5px;
  font-family: var(--mono);
  font-size: 9px;
  font-weight: 900;
  line-height: 1;
  background: rgba(0,0,0,.48);
  border: 1px solid rgba(255,255,255,.16);
  color: var(--accent);
}
```

Update the mobile media query that currently targets `.fco-player-card-mini` to target both wrapper and card:

```css
@media (max-width: 760px) {
  .fco-player-card-mini-wrap,
  .player-card.fc-card { width: 84px; height: 92px; }
  .card-player-media.fc-player-media { width: 62px; height: 62px; bottom: 26px; }
  .card-ovr.fc-ovr { font-size: 16px; }
  .fc-name { font-size: 9px; }
  .card-player-name.fc-name-area { bottom: 16px; }
}
```

- [ ] **Step 6: Run tests and build**

```bash
cd client && rtk npm test -- src/fco/cardThemes.test.js && rtk npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
rtk git add client/src/fco/components/FcoPlayerCard.jsx client/src/fco/ui.jsx client/src/fco/fco.css client/src/fco/cardThemes.test.js
rtk git commit -m "feat(squad): render fifaaddict-style player cards"
```

---

## Task 3: Update squad card hover actions and remove old controls

**Files:**
- Modify: `client/src/fco/views/SquadView.jsx`
- Modify: `client/src/fco/fco.css`

**Interfaces:**
- Consumes: `PlayerCardMini` props from Task 2.
- Produces: squad card hover actions with `card-edit-btn` and `card-remove-btn`.
- Removes: old `IconButton` with `I.ArrowUpDown` label `Đổi vị trí` inside `.fco-squad-card`.
- Removes: `.fco-squad-cardlevel` render block.

- [ ] **Step 1: Remove the old move button and mini level block**

In `client/src/fco/views/SquadView.jsx`, find the filled card branch inside `visibleSlots.map`. Replace this block:

```jsx
<div className="fco-squad-card-actions">
  <IconButton
    icon={I.ArrowUpDown}
    label="Đổi vị trí"
    size={12}
    active={isMovingSource}
    onClick={() => setMovingSlotId(isMovingSource ? null : slot.id)}
  />
  <IconButton
    icon={I.X}
    label="Xoá cầu thủ"
    size={12}
    onClick={() => removeFromSlot(slot.id)}
  />
</div>
```

with:

```jsx
<div className="fco-squad-card-actions">
  <IconButton
    icon={I.Pencil}
    label="Chỉnh thẻ"
    size={12}
    className="card-edit-btn"
    onClick={() => setPickerSlotId(slot.id)}
  />
  <IconButton
    icon={I.X}
    label="Xoá cầu thủ"
    size={12}
    className="card-remove-btn"
    onClick={() => removeFromSlot(slot.id)}
  />
</div>
```

If `IconButton` does not accept `className`, change the two buttons to plain buttons:

```jsx
<div className="fco-squad-card-actions">
  <button type="button" className="card-edit-btn fco-iconbtn" onClick={() => setPickerSlotId(slot.id)} aria-label="Chỉnh thẻ">
    <I.Pencil size={12} />
  </button>
  <button type="button" className="card-remove-btn fco-iconbtn" onClick={() => removeFromSlot(slot.id)} aria-label="Xoá cầu thủ">
    <I.X size={12} />
  </button>
</div>
```

Remove the entire `.fco-squad-cardlevel` JSX block:

```jsx
<div className="fco-squad-cardlevel">
  <IconButton icon={I.Minus} label="Giảm cấp" size={11} onClick={() => stepLevel(slot.id, -1)} />
  <LevelSelect
    value={normalizeUpgradeLevel(player.upgradeLevel)}
    onChange={(lv) => changeLevel(slot.id, lv)}
    scale={0.16}
  />
  <IconButton icon={I.Plus} label="Tăng cấp" size={11} onClick={() => stepLevel(slot.id, 1)} />
</div>
```

- [ ] **Step 2: Remove unused imports and variables**

In `client/src/fco/views/SquadView.jsx`, remove imports that become unused because the cardlevel UI is gone. At minimum check for `LevelSelect`. Keep `normalizeUpgradeLevel`, `stepLevel`, or `changeLevel` only if used elsewhere in `SquadView` such as toolbar/bulk controls.

Run ESLint later in this task to catch unused imports.

- [ ] **Step 3: Update hover action CSS**

In `client/src/fco/fco.css`, replace the existing `.fco-squad-card-actions` and `.fco-squad-cardlevel` rules around lines 1760-1777 with:

```css
.fco-squad-card-actions {
  position: absolute;
  left: 50%;
  top: -25px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 4px;
  border-radius: 10px;
  background: rgba(3,10,8,.86);
  border: 1px solid rgba(255,255,255,.1);
  backdrop-filter: blur(8px);
  opacity: 0;
  transform: translate(-50%, 3px);
  pointer-events: none;
  transition: opacity .12s ease, transform .12s ease;
}

.fco-squad-card:hover .fco-squad-card-actions,
.fco-squad-card:focus-within .fco-squad-card-actions,
.fco-squad-card.moving .fco-squad-card-actions {
  opacity: 1;
  transform: translate(-50%, 0);
  pointer-events: auto;
}

.fco-squad-card-actions .fco-iconbtn,
.fco-squad-card-actions .card-edit-btn,
.fco-squad-card-actions .card-remove-btn {
  width: 22px;
  height: 22px;
  border-radius: 7px;
}
```

Delete the old `.fco-squad-cardlevel` CSS rules completely.

- [ ] **Step 4: Run lint and build**

```bash
cd client && rtk npm run lint && rtk npm run build
```

Expected: PASS. If lint reports unused variables from removed controls, remove only those unused imports/variables.

- [ ] **Step 5: Commit**

```bash
rtk git add client/src/fco/views/SquadView.jsx client/src/fco/fco.css
rtk git commit -m "feat(squad): simplify card hover actions"
```

---

## Task 4: Add theme clone workflow docs and coverage report helper usage

**Files:**
- Create: `docs/superpowers/plans/2026-07-04-card-theme-clone-workflow.md`
- Modify: `client/src/fco/cardThemes.js`
- Modify: `client/src/fco/cardThemes.test.js`

**Interfaces:**
- Consumes: `getCardThemeCoverage(players)` from Task 1.
- Produces: documented clone workflow based on FIFAAddict DOM `img.card-bg-img.fc-bg[src]`.
- Produces: `formatCardThemeCoverage(coverage)` returning markdown text for verification notes.

- [ ] **Step 1: Add failing test for markdown coverage formatting**

Append to `client/src/fco/cardThemes.test.js`:

```js
import { formatCardThemeCoverage } from './cardThemes.js';

describe('formatCardThemeCoverage', () => {
  it('formats cloned and fallback themes as markdown', () => {
    const markdown = formatCardThemeCoverage({
      cloned: [{ seasonCode: 'NG', themeId: 'ng', count: 2, backgroundImage: '/fco/card-themes/card-theme-ng.svg' }],
      seasonVisual: [],
      fallback: [{ seasonCode: 'UNKNOWN', themeId: 'fallback', count: 1 }],
    });

    expect(markdown).toContain('## Card theme coverage');
    expect(markdown).toContain('- NG / ng — 2 player(s) — `/fco/card-themes/card-theme-ng.svg`');
    expect(markdown).toContain('- UNKNOWN / fallback — 1 player(s) — fallback');
  });
});
```

Move the new import into the existing import list at the top so the file has one import from `./cardThemes.js`:

```js
import { CARD_THEME_FALLBACK_ID, formatCardThemeCoverage, getCardThemeCoverage, getCardThemeForPlayer } from './cardThemes.js';
```

- [ ] **Step 2: Run test to verify failure**

```bash
cd client && rtk npm test -- src/fco/cardThemes.test.js
```

Expected: FAIL because `formatCardThemeCoverage` is not exported.

- [ ] **Step 3: Implement `formatCardThemeCoverage`**

Append to `client/src/fco/cardThemes.js`:

```js
function formatThemeLine(theme, status) {
  const asset = theme.backgroundImage ? `\`${theme.backgroundImage}\`` : status;
  return `- ${theme.seasonCode || '(unknown)'} / ${theme.themeId} — ${theme.count} player(s) — ${asset}`;
}

export function formatCardThemeCoverage(coverage) {
  const cloned = coverage?.cloned || [];
  const seasonVisual = coverage?.seasonVisual || [];
  const fallback = coverage?.fallback || [];

  return [
    '## Card theme coverage',
    '',
    '### Cloned local assets',
    cloned.length ? cloned.map((theme) => formatThemeLine(theme, 'local')).join('\n') : '- None',
    '',
    '### External/season visual fallback',
    seasonVisual.length ? seasonVisual.map((theme) => formatThemeLine(theme, 'season visual')).join('\n') : '- None',
    '',
    '### Missing or CSS fallback',
    fallback.length ? fallback.map((theme) => formatThemeLine(theme, 'fallback')).join('\n') : '- None',
    '',
  ].join('\n');
}
```

- [ ] **Step 4: Write the clone workflow document**

Create `docs/superpowers/plans/2026-07-04-card-theme-clone-workflow.md`:

```markdown
# Card theme clone workflow

Use this workflow whenever a season/theme is missing from `client/src/fco/cardThemes.js`.

1. Open FIFAAddict squadmaker.
2. Add one representative player for the missing season/theme.
3. Inspect the rendered card.
4. Record the card class containing `card-theme-*`, for example `card-theme-865`.
5. Read the background URL from `img.card-bg-img.fc-bg[src]`.
6. Download that image into `client/public/fco/card-themes/`.
7. Name it by theme id, for example `card-theme-865.png`.
8. Add a registry entry in `client/src/fco/cardThemes.js` mapping the app season code to the theme id and local asset.
9. Re-run `cd client && rtk npm test -- src/fco/cardThemes.test.js && rtk npm run build`.
10. During browser verification, confirm DevTools Network loads the background from `/fco/card-themes/...`, not from FIFAAddict.

Do not guess FIFAAddict asset URLs. The source of truth is the rendered `card-bg-img fc-bg` element.
```

- [ ] **Step 5: Run tests and build**

```bash
cd client && rtk npm test -- src/fco/cardThemes.test.js && rtk npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add client/src/fco/cardThemes.js client/src/fco/cardThemes.test.js docs/superpowers/plans/2026-07-04-card-theme-clone-workflow.md
rtk git commit -m "docs(squad): document card theme clone workflow"
```

---

## Task 5: Browser verification and theme coverage report

**Files:**
- Create: `docs/superpowers/plans/2026-07-04-card-theme-coverage.md`
- Modify only if verification exposes bugs: `client/src/fco/*`

**Interfaces:**
- Consumes: `getCardThemeCoverage(players)` and `formatCardThemeCoverage(coverage)`.
- Produces: manual verification report listing cloned, fallback, and failed/missing card themes compared with seasons observed in the app.

- [ ] **Step 1: Run automated checks before browser work**

```bash
cd client && rtk npm test -- src/fco/cardThemes.test.js src/fco/positionOvr.test.js && rtk npm run lint && rtk npm run build
```

Expected: all PASS.

- [ ] **Step 2: Start the dev server**

```bash
cd client && rtk npm run dev
```

Expected: Vite starts and prints a local URL. Keep it running.

- [ ] **Step 3: Verify squadmaker card in browser**

Open `/doi-hinh` in the app. Add one player to a squad slot.

In DevTools Elements, verify the filled card has:

```text
player-card has-player fc-card card-theme-*
card-bg-img fc-bg
card-ovr fc-ovr
card-pos-label fc-pos
fc-salary
card-player-media fc-player-media
fc-grade enchant_*
card-player-name fc-name-area
fc-name
card-flags fc-flags
```

Expected: all are present. If `fc-salary` is empty because the player lacks salary, the element still exists.

- [ ] **Step 4: Verify hover actions**

Hover the filled `.fco-squad-card`.

Expected:

```text
card-edit-btn is visible
card-remove-btn or small remove button is visible
Đổi vị trí button is not present
.fco-squad-cardlevel is not present
```

Click remove and confirm the slot becomes empty. Add a player again after this check.

- [ ] **Step 5: Verify drag/formation behavior did not regress**

Drag a filled non-GK slot and release it in a valid area. Change formation from the formation selector.

Expected: card still renders with correct OVR/position labels, no broken image icon, and no console error.

- [ ] **Step 6: Verify local background loading**

In DevTools Network, filter by `card-theme` or inspect `img.card-bg-img.fc-bg[src]`.

Expected for cloned themes: URL begins with the app origin and path `/fco/card-themes/`. Any theme not loading locally must be recorded as fallback/missing in the coverage report.

- [ ] **Step 7: Generate coverage notes manually**

Create `docs/superpowers/plans/2026-07-04-card-theme-coverage.md` with this structure:

```markdown
# Card theme coverage after verification

## Verified route

- `/doi-hinh`

## Cloned local assets

- NG / ng — `/fco/card-themes/card-theme-ng.svg` — verified local load

## External/season visual fallback

- None observed during this verification pass

## Missing or CSS fallback

- List every season/theme observed in the app that did not have a cloned local asset.

## Notes

- `card-bg-img fc-bg` exists on filled squad cards.
- `card-edit-btn` and remove button appear on hover.
- `Đổi vị trí` and `.fco-squad-cardlevel` are absent.
```

If real data exposes specific seasons, replace the placeholder bullets with the actual season/theme ids and reasons.

- [ ] **Step 8: Fix any verification bugs and rerun checks**

If browser verification finds a bug, fix the smallest relevant file and rerun:

```bash
cd client && rtk npm test -- src/fco/cardThemes.test.js src/fco/positionOvr.test.js && rtk npm run lint && rtk npm run build
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
rtk git add docs/superpowers/plans/2026-07-04-card-theme-coverage.md client/src/fco/cardThemes.js client/src/fco/components/FcoPlayerCard.jsx client/src/fco/ui.jsx client/src/fco/views/SquadView.jsx client/src/fco/fco.css
rtk git commit -m "test(squad): verify fifaaddict player card rendering"
```

Only stage source files that actually changed during verification. Do not stage unrelated untracked files such as `.superpowers-task1-brief.md` or `teamcolor-snapshot.md`.

---

## Self-review notes

- Spec coverage: shared registry is Task 1; clone workflow is Task 4; shared renderer is Task 2; squad hover/removal changes are Task 3; browser verification and theme coverage report are Task 5.
- Placeholder scan: the implementation plan includes exact file paths, commands, and expected outputs. The coverage report requires replacing observed runtime theme data because those values are only knowable during browser verification.
- Type consistency: `getCardThemeForPlayer`, `getCardThemeCoverage`, `formatCardThemeCoverage`, and `FcoPlayerCard` signatures are defined before later tasks consume them.
