# VPS Upgrade Plan: Smart Sync, Content, Polymarket, UI Overhaul

## Context
Now on VPS (Coolify), we can remove Vercel constraints. The cron jobs are running but use blind polling. Match data has exact kickoff times — we should use them for precise, zero-waste syncing. Additionally: expand the content pipeline, add a Polymarket page, modernize the UI to a terminal aesthetic, and expose public sections in navigation.

---

## Phase 1: Smart Event-Driven Sync

**Approach**: Keep Coolify crons at fixed intervals but make endpoints **match-time-aware** — they short-circuit with 0 API calls when no matches are finishing.

### New: `src/lib/sync/match-windows.ts`
Shared utility that reads all `matches.json` files across gameweeks and computes sync windows:
- Groups fixtures by unique kickoff time (rounded to 15-min buckets)
- Each window: `syncAfter` (kickoff + 3h), `backupSync` (kickoff + 4h), `expiry` (kickoff + 8h)
- `computeSyncPlan()` cross-references DB for already-finished fixtures
- Returns: active windows, pending fixture IDs, next window time, whether it's a matchday

### Modify: `src/app/api/cron/sync-results/route.ts`
- Replace flat fixture loop with window-based logic
- If no active windows → return immediately (`{ status: 'no-match-window', apiCalls: 0, nextWindowAt }`)
- If active windows → fetch only fixtures in those windows
- Response includes: `windowsActive`, `fixturesChecked`, `synced`, `apiCalls`, `nextWindowAt`

### Modify: `src/app/api/cron/sync-standings/route.ts`
- Keep daily 04:00 cron but filter to only leagues that had matches in the last 24h
- On non-matchdays: 0 API calls instead of 5

### Modify: `src/app/api/cron/sync-polymarket/route.ts`
- Add 48h upper bound — only fetch for fixtures with kickoff in next 48h
- Outside that window: return immediately

### New: `src/app/api/cron/sync-status/route.ts`
- Admin-only diagnostic endpoint showing current sync plan, active windows, next sync times
- No external API calls — reads match data and DB state only

### Coolify cron updates
| Job | Current | New | Rationale |
|-----|---------|-----|-----------|
| sync-results | `0,30 * * * *` | `*/15 * * * *` | More responsive, but endpoint self-throttles |
| sync-standings | `0 4 * * *` | `0 4 * * *` | Keep daily, add league filter |
| sync-polymarket | `*/30 * * * *` | `*/30 * * * *` | Keep, add 48h window |

---

## Phase 2: Auto-Evaluation + Model Learning

**Approach**: After sync-results detects a gameweek is 100% complete, trigger evaluation automatically.

### New: `src/lib/sync/evaluation-trigger.ts`
- `checkGameweekCompleteness()` — compares total matches in `matches.json` vs finished results in DB
- Returns which gameweeks need evaluation (complete + has predictions + no evaluation yet)

### Modify: `src/app/api/cron/sync-results/route.ts` (additional)
- After syncing, check completeness
- When a GW is newly complete, write `_needs-evaluation.json` marker file

### Modify: `scripts/pipeline-cron.ts`
- Check for `_needs-evaluation.json` as high-priority trigger
- Run full evaluation chain: evaluate → Elo update → weight adjustment → Poisson recalc → performance log
- Remove marker after successful evaluation

### New DB table: `predictify.sync_events`
- Track every sync execution (endpoint, status, api_calls, duration, metadata)
- Enables API usage monitoring and debugging

### Coolify cron addition
| Job | Frequency | Command |
|-----|-----------|---------|
| pipeline-cron | `0 */2 * * *` | `wget -qO- http://127.0.0.1:3000/api/cron/pipeline-check` or run script directly |

---

## Phase 3: Blog/Content System

**Current state**: Blog infrastructure exists (`/blog`, `/blog/[slug]`, `src/lib/blog.ts`, `data/blog/`). Header already shows Blog link for unauthenticated users. But content generation is manual and limited.

### New scripts for content types
- `scripts/generate-blog-preview.ts` — match previews per league (rename existing `generate-blog-post.ts`)
- `scripts/generate-blog-review.ts` — post-match results analysis (auto-triggered after evaluation)
- `scripts/generate-blog-weekly-roundup.ts` — cross-league weekly summary

### New DB table: `predictify.blog_posts`
- Index table for filtering/querying (slug, title, type, league, gameweek, status, published_at)
- Content still lives in JSON files (works with Docker volumes)
- Post types: `preview`, `review`, `weekly-roundup`, `analysis`

### Modify: `src/lib/blog.ts`
- Add DB-backed index with filtering by type, league, gameweek
- Pagination support
- Fallback to filesystem if DB empty

### Modify: `src/app/(marketing)/blog/page.tsx`
- Add type filter tabs (All, Previews, Reviews, Analysis)
- League filter dropdown
- Pagination

### New: `src/app/(marketing)/blog/sitemap.ts`
- Dynamic sitemap for SEO

### Integration with pipeline-cron
- After predict phase → generate preview posts
- After evaluate phase → generate review posts
- After all leagues complete for a GW → generate weekly roundup

---

## Phase 4: Dedicated Polymarket Page

### New: `src/app/(dashboard)/polymarket/page.tsx`
Shows live prediction market data for upcoming matches:
- 3-column comparison table per match: Polymarket vs Bookmaker vs Our Model
- Volume/liquidity badges
- Value indicators where model disagrees with market
- League filter

### New: `src/app/api/polymarket/prices/route.ts`
- Serves latest Polymarket prices joined with fixture data
- Query params: `?league=8&upcoming=true`

### New: `src/components/polymarket/market-card.tsx`
- Reusable card showing probability comparison, volume, value flags

### Schema change: `prediction_market_prices`
- Change to composite key `(fixture_id, source, fetched_at)` for price history
- Enables sparkline charts showing price movement over time

### Sidebar addition
- Add "Markets" nav item with TrendingUp icon (orange theme)

---

## Phase 5: UI Overhaul — Terminal Aesthetic

**Goal**: Remove padded card wrappers, eliminate rounded corners on main content sections, create a flat/terminal feel.

### Modify: `src/components/ui/card.tsx`
- Create a variant system: `variant="default"` vs `variant="terminal"` (no rounding, no padding, no shadow)
- Terminal variant: `rounded-none border-0 shadow-none p-0` (or similar)
- Keep default for places where cards still make sense (marketing pages, modals)

### Modify dashboard components to use terminal variant
Files to update:
- `src/components/dashboard/upcoming-fixtures.tsx` — remove Card wrapper padding/rounding
- `src/components/dashboard/league-standings.tsx` — remove Card wrapper padding/rounding
- `src/app/(dashboard)/dashboard/page.tsx` — adjust grid layout for edge-to-edge content
- Prediction cards, value bet cards, ACCA cards — audit and flatten

### Modify: section headers
- Instead of cards with headers inside, use flat section dividers with subtle borders
- Headings sit directly on the background, content flows below with thin separator lines

---

## Phase 6: Navigation Updates

### Modify: `src/components/layout/header.tsx`
Add to **both** authenticated and unauthenticated nav:
- Blog (already in unauth, add to auth)
- Markets/Polymarket (new)
- Pricing (already in unauth, consider for auth sidebar)

### Modify: `src/components/layout/sidebar.tsx`
Add new nav items:
- Blog (Newspaper icon, amber theme) — links to `/blog`
- Markets (TrendingUp icon, orange theme) — links to `/polymarket`

---

## Implementation Order

1. **Phase 1**: Smart sync (match-windows.ts + modify 3 cron routes) — immediate
2. **Phase 5**: UI terminal overhaul — can do in parallel, independent
3. **Phase 6**: Navigation updates — quick, do alongside Phase 5
4. **Phase 2**: Auto-evaluation trigger — after Phase 1 (depends on sync-results changes)
5. **Phase 4**: Polymarket page — after Phase 2 (schema changes)
6. **Phase 3**: Blog expansion — after Phase 4 (content pipeline integration)

## Verification

- **Phase 1**: Run `wget -qO- http://127.0.0.1:3000/api/cron/sync-results` when no matches are on — should return `apiCalls: 0`. Run during a match window — should fetch only relevant fixtures.
- **Phase 2**: Complete a gameweek's results manually, verify evaluation triggers automatically.
- **Phase 3**: Check `/blog` page shows filtered posts with type tabs.
- **Phase 4**: Check `/polymarket` page shows live prices for upcoming matches.
- **Phase 5**: Visual check — dashboard sections should be flat, edge-to-edge, no rounded card wrappers.
- **Phase 6**: Check sidebar and header show Blog + Markets links.
