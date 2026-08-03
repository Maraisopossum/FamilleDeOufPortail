# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Les Jeux de la Famille" — a family game portal: a single-page PWA bundling
several mini-games (Quiz, Bataille Navale, Puissance 4, Jeu des Paires, Qui
est-ce). Pure vanilla HTML/CSS/JS, **no build step, no bundler, no npm
dependencies, no framework**. It is served as-is by GitHub Pages
(`Maraisopossum/FamilleDeOufPortail`), so whatever is committed to `main` is
what's live — there is no CI/build pipeline.

## Commands

There is no package.json, no linter, no test runner. Development loop:

```bash
# Serve the site locally (from the repo root)
python -m http.server 8800
# or, to test from a phone on the same Wi-Fi:
python -m http.server 8800 --bind 0.0.0.0

# Syntax-check a JS file (no bundler, so this is the fastest correctness check)
node --check games/naval.js
```

There is no automated test suite. Verification is done with ad-hoc Playwright
scripts (chromium, mobile device emulation via `devices['Pixel 7']` /
`devices['iPhone 13']`) run with plain `node script.js` against the local
http.server. For multiplayer features, spin up **two** browser contexts
(host + guest) in the same script. Playwright itself isn't a repo dependency;
install it ad hoc in a scratch directory (`npm install playwright && npx
playwright install chromium`) rather than adding it to this repo.

**Before testing locally**, disable the service worker in `index.html`
(swap the `register("./sw.js")` block for one that calls
`getRegistrations()...unregister()` and clears `caches`) — otherwise
stale-while-revalidate will serve an old cached build and changes won't
appear until a second reload. Re-enable registration before committing.

**Supabase is a real, shared, production database** used by the actual
family — it is not a test fixture. Any room/session rows or `game_history`
entries created while testing must be cleaned up afterward via direct
REST `DELETE` calls (see any game's Supabase table for the URL/anon key,
duplicated in `shared/supabase-client.js`). Note `game_history` does not
allow `DELETE` for the anon role (RLS) — test rows written there can't be
removed, so prefer testing scoring/history writes sparingly. Before
deleting rows from a `*_rooms` table, check `host_name`/`guest_name` — real
family members reuse the same profile names as ad-hoc test profiles, so
verify you're not deleting a genuine in-progress game.

## Architecture

### Routing and app shell (`index.html`)

`index.html` is the single entry point: it wires up `shared/router.js` (a
minimal hash router — `#/`, `#/quiz`, `#/naval`, `#/connect4`, `#/paires`,
`#/guesswho`, `#/historique`), renders the shared topbar/profile badge, and
lazy-loads each game module only when its route is visited
(`await import("./games/xxx.js")`). Each game route first checks
`getActiveProfile()` and shows the shared profile picker if none is set.
Global concerns (sound mute toggle, confetti canvas) live directly in
`index.html` and are exposed as `window.soundMuted` / `window.burstConfetti`
for game modules to use.

`admin.html` is a separate, unlinked question-management tool for the Quiz
(not part of the router, not linked from the family-facing UI).

### Shared modules (`shared/`)

- `supabase-client.js` — one Supabase project/anon key shared by *every*
  game (not per-game). The Supabase JS SDK is loaded globally via a UMD
  `<script>` tag in `index.html` (`window.supabase`), not npm-imported.
- `profile.js` — the single active-profile concept used across all games:
  `localStorage` key `fdo_active_profile` holds `{name, avatar, isGuest}`,
  shared `profiles` Supabase table backs the profile picker. Once picked,
  the profile stays active across every game until explicitly changed.
- `history.js` — cross-game history/leaderboard screen, reads the shared
  `game_history` table and filters by the `GAMES` list (must be kept in
  sync with each game's `GAME_NAME` export).
- `router.js` — the hash router itself.
- `ui.css` — the whole design system: CSS custom properties for the palette
  (`--bg`, `--panel`, `--coral`, `--gold`, `--teal`, `--blue`, ...), and
  every reusable component class (`.card`, `.btn`, `.role-card`,
  `.profile-grid`, etc.) used by every screen in every game. A global
  `button{appearance:none; ...}` reset lives here — see gotchas below.

### Game modules (`games/*.js`)

Every game is a single self-contained file following the same template
(easiest to copy from `games/connect4.js` or `games/paires.js`, the two
cleanest examples):

- Exports `GAME_NAME` (must match an entry in `shared/history.js`'s
  `GAMES` array) and a `mountXxx(container)` entry point that `index.html`
  calls after lazy-importing the module. `mountXxx` returns an optional
  cleanup function, invoked by the router on navigating away.
- Injects its own `<style>` tag into `document.head` on first import,
  guarded by `if (!document.getElementById("xxx-styles"))`. All classes are
  prefixed with a per-game root class (e.g. `.naval-screen .c`) — **but
  this is only a CSS selector prefix, not real style scoping**: every
  injected stylesheet is global, so an unprefixed/generic class name (e.g.
  `.ship`) can collide across games or across parts of the same game (see
  gotchas).
- Has its own tiny scoped `$`/`$$` DOM helpers bound to the mounted
  `container` (`root`), its own module-level state object (conventionally
  named `S`), and its own internal screen model: multiple
  `<section class="screen" data-screen="...">` blocks all present in the
  DOM at once, toggled via a local `show(name, backTarget)` function that
  flips the `.on` class — this is independent of the hash router (games
  don't change the URL as you move between their own sub-screens).

### Multiplayer pattern (Bataille Navale, Puissance 4, Jeu des Paires, Qui est-ce)

Every duel-capable game has its own Supabase table `<game>_rooms`
(`naval_rooms`, `connect4_rooms`, `paires_rooms`, `guesswho_rooms`) with a
short random room `code` as primary key, `host_name`/`guest_name`, a `turn`
field, `status` (`waiting`/`playing`/`finished`/`cancelled`), `winner`, and
whatever game-specific state needs to be shared (e.g. `board` for
Puissance 4, `host_target`/`guest_target` for Qui est-ce). RLS policy is
permissive (`for all to anon, authenticated using true`) since there's no
auth system — profile names are the only identity.

All four games share the same hardened pattern, copy this rather than
reinventing it:
- **Realtime is not reliably enabled** on a fresh table — you must run
  `alter publication supabase_realtime add table public.xxx_rooms;`
  manually in the Supabase SQL editor after creating a room table, or
  realtime events silently never fire. Because of this, every game also
  runs a **4-second fallback poll** (`setInterval` re-`roomLoad`) as a
  safety net regardless of whether realtime is enabled — don't skip it.
- **Cancelling a room** must never silently `DELETE` a row once an
  opponent has joined (they'd get no notification and hang forever).
  Pattern: if `guest_name`/`host_name` is present on the other side, PATCH
  `status:"cancelled"` instead, so the opponent's poll/subscription picks
  it up and can show them a message before returning to the menu. Only
  `DELETE` when no opponent has joined yet.
- **Hosting reuses an existing open room** instead of always creating a
  new one (check for an existing `waiting`/`playing` room owned by the
  profile first) — otherwise repeated navigation clutters the lobby with
  duplicate abandoned rooms.
- **Stale rooms are purged** both automatically (rooms older than 24h,
  deleted opportunistically whenever the lobby list refreshes) and via a
  manual "🧹 Vider les salons inactifs" button (deletes other players'
  `waiting` rooms, but never the current profile's own open room).
- A REST helper function `sb(path, opts)` wraps `fetch` directly against
  `${SUPABASE_URL}/rest/v1/...` (not the JS SDK) for room CRUD — **never
  add a manual cache-busting query param** like `?v=timestamp`: PostgREST
  treats unknown query params as column filters and rejects a bare value
  with no operator, breaking every request. `cache: "no-store"` in the
  `fetch()` options is already sufficient.
- Rooms a resuming client's mount function should read `pending_question`/
  board/eliminated-state etc. from the freshly-loaded row rather than
  assuming fresh defaults — this is what makes "reprise de salon" (closing
  the app and reopening a game in progress) work.

### Service worker (`sw.js`)

Single cache-first-with-network-fallback shell cache (stale-while-revalidate
on the `fetch` handler). Static shell files (HTML/CSS/JS/logos) are listed
in the `SHELL` array and precached on install; large per-item assets (e.g.
the 24 `guesswho-images/*.png` portraits) are intentionally **not**
precached — they're cached opportunistically after first view instead, to
avoid a slow/heavy first PWA install. **Bump the `CACHE` version constant
whenever any shell file changes**, or already-visited devices keep serving
the old cached version indefinitely (this is the #1 source of "I fixed it
but it's not showing up" confusion during development — see the
disable-while-testing note above).

### Assets

- `logos/` — one illustrated banner logo per game plus the portal
  (`logo.png`, `quiz-logo.png`, `naval-logo.png`, `puissance4-logo.png`,
  `paire-logo.png`, `guesswho-logo.png`), shown on each game's landing
  screen. Referenced as `./logos/xxx.png`.
- `guesswho-images/` — the 24 character portraits for Qui est-ce
  (`01-leo.png` ... `24-sarah.png`, numbering matches the `CHARACTERS`
  roster order in `games/guesswho.js`). Each `<img>` has an `onerror`
  handler that falls back to displaying the character's first initial, so
  the game works even before all 24 images exist.
- `icon-192.png` / `icon-512.png` at the repo root — PWA install icons,
  referenced from `manifest.json`; kept separate from `logos/` since they
  follow a different (OS icon) convention.

## Known gotchas (already fixed once, don't reintroduce)

- **CSS class collisions across "scoped" stylesheets**: reusing a
  generic-sounding class name for game state (e.g. a cell class called
  `.ship`) can collide with an unrelated pre-existing rule of equal
  specificity elsewhere in the same injected stylesheet, and the one later
  in source order silently wins — this once made `display:flex` override
  an intended `display:grid` and broke an entire grid's layout in a very
  confusing way. Prefix state classes distinctively (e.g. `.has-ship`, not
  `.ship`) when a similarly-named class might exist elsewhere in the file.
- **Native `<button>` styling**: without `appearance:none` (set globally on
  `button` in `shared/ui.css`), some mobile browsers apply native
  rounded/pill button chrome that can visually overflow a small custom
  grid cell. Prefer `<div>`/`<span>` with a click handler for custom
  interactive tiles (already the pattern for `.role-card`, `.c4-cell`,
  `.pr-card`, `.qw-card`).
- **`onRoomUpdate` handlers must react to every field that changed**, not
  just the one you expect — gating a repaint on "did X change" while a
  different field (e.g. `turn`) also changed but X didn't will silently
  drop that update on the receiving client until the *next* unrelated
  change happens to trigger a repaint.
