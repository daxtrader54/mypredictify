# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MyPredictify is a Football Prediction SaaS application — live at **https://mypredictify.com**.

## Deployment

- **Hosting**: Vercel (auto-deploys on push to `main`)
- **Repo**: `github.com/daxtrader54/mypredictify`
- **Domain**: mypredictify.com
- **Database**: Neon PostgreSQL (Vercel integration, `my-predictify-database`)
- **DB Schema**: All tables live in the `predictify` Postgres schema (not `public`)
- **Auth**: Google OAuth (project: "My Predictify" in Google Cloud Console)
- DB connection: code checks both `DATABASE_URL` and `POSTGRES_URL` (Vercel sets both via Neon integration)
- Schema migrations: `npx drizzle-kit push` (but note: custom pg schema requires `CREATE SCHEMA predictify` first — drizzle-kit won't auto-create it)
- Sign-in callback is non-blocking on DB errors — user record created on first dashboard visit via `getOrCreateUser`
- `leagueStandings` synced via Vercel cron (`/api/cron/sync-standings`) daily at 04:00 UTC
- `matchResults` synced via Vercel cron (`/api/cron/sync-results`) every 30 min — auto-fetches finished fixtures from SportMonks
- Cron endpoints auto-create tables on first run via `ensureTable()` — no manual migration needed on production
- **Local DB ≠ Production DB** — `.env.local` DATABASE_URL points to a different Neon database than Vercel's. `drizzle-kit push` locally does NOT affect production.
- Admin emails: configured in `src/config/site.ts` via `ADMIN_EMAILS` array + `isAdmin()` helper

## Tech Stack

- **Framework**: Next.js 16.1.1 with App Router
- **Language**: TypeScript
- **UI**: shadcn/ui + Tailwind CSS v4
- **Database**: Neon PostgreSQL (Drizzle ORM)
- **Auth**: NextAuth.js with Google OAuth
- **Payments**: Stripe (GBP pricing, live keys configured)
  - Tiers: Free (100 credits, +10 daily) → Pro £19/mo (unlimited PL, 100 credits +10 daily for others) → Gold £49/mo (unlimited all leagues, no credit limits)
  - Annual: Pro £159/yr, Gold £410/yr
  - `isFreeForTier(tier, leagueId)` in `src/config/pricing.ts` is the central tier-check function
  - Stripe price IDs hardcoded in `src/config/pricing.ts`
  - Webhook: `/api/stripe/webhook` handles checkout, subscription updates/cancellation
  - Requires `STRIPE_WEBHOOK_SECRET` env var
- **AI**: OpenAI GPT-4o-mini
- **Data**: SportMonks Football API v3
- **Pipeline**: Claude CLI skills + TypeScript scripts

## Development Commands

```bash
npm run dev      # Start development server (Turbopack)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
npm run fetch    # Run SportMonks CLI tool
npm run elo      # Run Elo rating engine
npm run poisson  # Run Poisson goal model
npm run metrics  # Run evaluation metrics
npm run sync-standings  # Sync league standings from SportMonks to DB
npm run sync-results    # Fetch match results for past fixtures
```

## Key Directories

```
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth pages (login)
│   │   ├── (dashboard)/       # Protected pages (layout-level auth)
│   │   │   ├── admin/         # Admin panel (user management, credits)
│   │   │   ├── dashboard/     # Main dashboard
│   │   │   ├── predictions/   # Predictions list (with GW navigation)
│   │   │   ├── today/         # Today's fixtures with predictions
│   │   │   ├── value-bets/    # Value bet finder
│   │   │   ├── acca-builder/  # ACCA accumulator
│   │   │   ├── results/       # Match results vs predictions (accuracy tracking)
│   │   │   ├── pipeline/      # Pipeline status dashboard
│   │   │   ├── reports/       # Weekly reports (+ [...gameweek] detail)
│   │   │   └── error.tsx      # Error boundary for all dashboard routes
│   │   ├── (marketing)/       # Public pages (landing, pricing; redirects auth users to /dashboard)
│   │   └── api/               # API routes
│   │       ├── admin/users/   # Admin user management API
│   │       ├── cron/          # Vercel cron endpoints (unauthenticated)
│   │       │   ├── sync-standings/  # Daily standings sync from SportMonks → DB
│   │       │   └── sync-results/    # Every 30min results sync from SportMonks → DB
│   │       ├── pipeline/sync/ # Data file → Postgres sync (batch upsert)
│   │       ├── sportmonks/    # Debug/admin proxy (requires auth)
│   │       └── standings/     # League standings from DB
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── layout/            # Header, Sidebar, Footer
│   │   ├── dashboard/         # Dashboard widgets (standings, fixtures)
│   │   ├── predictions/       # Prediction card (result shading)
│   │   ├── pipeline/          # Pipeline status display
│   │   ├── reports/           # Report renderer + prediction rows
│   │   └── providers/         # CreditsProvider context
│   ├── lib/
│   │   ├── sportmonks/        # SportMonks API client + types
│   │   ├── db/                # Drizzle schema + Neon PostgreSQL
│   │   ├── auth/              # NextAuth configuration
│   │   ├── gameweeks.ts       # Shared GW scanning utility
│   │   └── results.ts         # Shared results loader (DB first, file fallback)
│   ├── hooks/                 # Custom React hooks
│   └── config/                # App config (site.ts has CURRENT_SEASON)
├── scripts/                   # CLI tools invoked by Claude
│   ├── fetch-sportmonks.ts    # SportMonks API wrapper
│   ├── elo.ts                 # Elo rating engine
│   ├── poisson.ts             # Poisson goal distribution
│   ├── metrics.ts             # Log-loss, Brier score, calibration
│   ├── sync-standings.ts      # Sync league standings from SportMonks → DB
│   └── sync-results.ts        # Fetch match results → data/gameweeks/GW{n}/results.json
├── data/
│   ├── gameweeks/             # Versioned per-week prediction data
│   │   └── {season}/GW{n}/   # matches, research, predictions, results, report
│   ├── memory/                # Learned state (Elo, weights, heuristics)
│   │   ├── elo-ratings.json
│   │   ├── signal-weights.json
│   │   ├── heuristics.md
│   │   ├── performance-log.json
│   │   └── prompt-fragments/  # Reusable analysis prompts
│   └── config/                # Pipeline configuration
│       ├── leagues.json
│       └── pipeline.json
├── vercel.json                # Vercel cron configuration (standings daily, results every 30min)
├── drizzle/                   # Generated migration SQL
├── .claude/skills/            # Claude CLI skill definitions
│   ├── ingest-gameweek/       # Fetch fixtures + data from APIs
│   ├── research-matches/      # 5-signal match analysis
│   ├── predict-matches/       # Constrained prediction generation
│   ├── generate-report/       # Weekly markdown report
│   ├── evaluate-results/      # Post-match metrics + learning
│   └── run-pipeline/          # Full weekly orchestration
└── .github/workflows/
    └── weekly-pipeline.yml    # Cron: Tue predict, Sun evaluate
```

### Path Alias
- `@/*` maps to `./src/*`

## Architecture

**Prediction Pipeline** (Claude CLI orchestrated):
```
/ingest-gameweek → /research-matches → /predict-matches → /generate-report
                                                              ↓
                              /evaluate-results ← (post-match results)
```

**5 Research Signals** (per match):
1. Form (25%) - Last 5-10 match results, trajectory
2. Squad (15%) - Injuries, suspensions, key absences
3. Tactical (15%) - Style matchup, possession, pressing
4. Market (30%) - Odds-implied probabilities, value flags
5. Narrative (15%) - Motivation, derby significance, pressure

**Statistical Models**:
- Elo ratings (K=20, home advantage +65)
- Poisson goal distribution (attack/defense strengths)
- Baseline: Elo 40% + Poisson 60%

**Error Handling**:
- Step-level retry (3x with exponential backoff)
- Graceful degradation (skip failed leagues/signals, continue pipeline)
- Pipeline state tracking for crash recovery
- _pipeline-state.json tracks each step's status
- pipelineRuns table for persistent error logging

**Route Groups:**
- `(auth)` - Unauthenticated pages
- `(dashboard)` - Requires authentication (layout-level `getSession()` redirect), has sidebar layout
- `(marketing)` - Public pages with header/footer

**Authentication:**
- Auth enforced in `(dashboard)/layout.tsx` via `getSession()` → redirect to `/login`
- No middleware.ts — Next.js 16 Edge Runtime breaks `getToken()` on Vercel
- Auth uses JWT strategy — `getSession()` never hits DB after sign-in. DB can be broken and auth still works.
- API routes use `getSession()` individually; pipeline sync uses Bearer token
- SportMonks proxy routes (`/api/sportmonks/*`) also require session auth
- Cron endpoints (`/api/cron/*`) are unauthenticated — required for Vercel cron to call them
- Homepage (`/`) redirects authenticated users to `/dashboard`
- Header nav is conditional: auth users see Dashboard link, unauth users see Pricing

**Database Tables** (all in `predictify` schema):
- users, creditTransactions, accaHistory, predictionViews (app)
- leagueStandings (synced via Vercel cron `/api/cron/sync-standings` daily)
- matchResults (synced via Vercel cron `/api/cron/sync-results` every 30min)
- gameweeks, matchPredictions, weeklyMetrics, pipelineRuns (pipeline)

**Content Freshness (DB-first architecture):**
- Standings and results are synced from SportMonks → DB via Vercel cron jobs
- Pages serve from DB only — never call SportMonks directly in user-facing routes (not scalable)
- `loadResults()` in `src/lib/results.ts` is the shared loader: DB first, results.json file fallback
- Cron endpoints auto-create their tables on first run via `ensureTable()` (raw SQL DDL)
- Time-sensitive pages (`/today`, `/predictions`, `/results`) use `force-dynamic` (not ISR)
- `vercel.json` defines cron schedules: standings at 04:00 UTC daily, results every 30 minutes

**Tier Access Control**:
- Gold: unlimited access to all value bets, predictions, fixtures. No credit spend.
- Pro: free PL value bets/predictions. Other leagues require credits.
- Free: everything costs credits.
- `isFreeForTier(tier, leagueId)` in `src/config/pricing.ts` is the central check.

**Credits System**:
- `CreditsProvider` in `src/components/providers/credits-provider.tsx` wraps dashboard layout
- `useCredits()` hook reads from shared context (not per-component API calls)
- Credit unlock state persisted in localStorage (`mypredictify:unlocked`)
- All credit operations (deduct, add, daily redeem) use atomic SQL — no race conditions
- Gold tier: unlimited credits, no daily redemption needed

**Season Config**:
- `CURRENT_SEASON` in `src/config/site.ts` is the single source of truth (e.g., `'2025-26'`)
- All code importing season strings must use this constant — never hardcode
- Scripts use `process.env.SEASON` fallback (can't use `@/` alias)

**Predictions Page** (`/predictions`):
- URL params: `?league={id}&gw={number}` — league filter + gameweek navigation
- Gameweek data loaded from `data/gameweeks/{CURRENT_SEASON}/GW{n}/` (matches.json, predictions.json)
- Results loaded via `loadResults()` — DB first, file fallback
- `getAvailableGameweeks()` in `src/lib/gameweeks.ts` — shared utility for GW directory scanning
- Split into "Upcoming" and "Completed" sections within each gameweek
- Prediction cards show both final score AND predicted score for finished matches
- Result-aware card shading: gold = exact score correct, green = correct result, red = incorrect
- Prev/next GW navigation in `predictions-filter.tsx`
- Uses `force-dynamic` rendering

**Results Page** (`/results`):
- Shows all completed matches grouped by gameweek (newest first)
- Per-GW accuracy badges: correct/total with color coding (green ≥60%, yellow ≥40%, red <40%)
- Overall stats: matches played, result accuracy %, exact scores, correct results
- Uses `loadResults()` shared loader for DB-backed results
- 4-column grid on desktop (`md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`)
- Uses `force-dynamic` rendering

**Today's Games** (`/today`):
- Shows fixtures for today's date across all leagues and gameweeks
- Scans all GW directories, filters by kickoff date matching today
- Groups by league, sorted by kickoff time; reuses `PredictionCard`
- Uses `force-dynamic` rendering (was ISR 300s, changed for real-time accuracy)
- Uses `loadResults()` for live/finished score display

**Admin Panel** (`/admin`):
- Protected by `isAdmin()` check — only listed admin emails can access
- User list with search, tier display, credit balances
- Credit adjustment (add/remove) via `/api/admin/users/[id]/credits`
- Tier update via `/api/admin/users/[id]`

**Homepage** (`/` — marketing):
- Hero section with product screenshot (`public/mypredictify.jpg`) showing predictions dashboard
- Stats bar: 5 leagues, 98 teams, 68% accuracy, 24/7 updates
- Feature cards, "How It Works" steps, credits explanation, pricing section (PricingCards component)
- Authenticated users redirected to `/dashboard`

## Pipeline Progress

- **Current Season**: 2025-26
- **Latest Gameweek**: GW25 (Feb 7-8, 2026)
  - matches.json, predictions.json, report.md, results.json all present
- **Pipeline Status**: Operational — ingest → research → predict → report → evaluate

## TODO / Planned Features

- **ACCA Builder bookmaker integrations** — Add ability to place bets directly with bookmakers (Bet365, William Hill, etc.) from the ACCA builder

## SportMonks Integration

**API Client**: `src/lib/sportmonks/client.ts` (singleton, cached)
**CLI Tool**: `scripts/fetch-sportmonks.ts` (for pipeline use)
- Commands: fixtures, standings, odds, h2h, team-stats, results, seasons, fixture, rounds, teams
- Paginated: auto-follows pages (max 10) via fetchAllPages()
- Rate limit: 3,000 calls/entity/hour

**SportMonks plan**: Standard European (active, verified Feb 2026)
- Endpoints verified: fixtures, fixtures/between, standings, odds/pre-match, h2h, teams, seasons, rounds
- Odds endpoint: `/odds/pre-match/fixtures/{id}/markets/{marketId}` (NOT `/odds/fixtures/`)
- Seasons endpoint: `/seasons?filters=seasonLeagues:{id}` (NOT `/leagues/{id}/seasons`)
- NOT available (needs add-ons): /predictions/probabilities, /predictions/value-bets
- IMPORTANT: `fixtureRounds` filter is silently ignored — use `/fixtures/between/{start}/{end}` with round dates instead
- Market ID 1 = Fulltime Result (1X2)
- Season IDs (2025/26): PL=25583, La Liga=25659, Bundesliga=25646, Serie A=25533, Ligue 1=25651
- Ingest script: `scripts/parse-fixtures.mjs` — fetches fixtures, standings, H2H, odds for all leagues

## Environment Variables

Required:
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (`https://mypredictify.com` in production)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `DATABASE_URL` or `POSTGRES_URL` (Neon PostgreSQL — Vercel sets both)
- `SPORTMONKS_API_TOKEN`
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- `PIPELINE_SYNC_KEY` (required — pipeline sync fails closed without it)

## Supported Leagues

| League | ID | Country | Tier |
|--------|-----|---------|------|
| Premier League | 8 | England | Free (Pro+: no credits) |
| La Liga | 564 | Spain | Gold |
| Bundesliga | 82 | Germany | Gold |
| Serie A | 384 | Italy | Gold |
| Ligue 1 | 301 | France | Gold |
