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
- `leagueStandings` table synced via `npm run sync-standings` (fetches from SportMonks → DB)
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
│   │   ├── (dashboard)/       # Protected pages
│   │   │   ├── admin/         # Admin panel (user management, credits)
│   │   │   ├── dashboard/     # Main dashboard
│   │   │   ├── predictions/   # Predictions list (with GW navigation)
│   │   │   ├── acca-builder/  # ACCA accumulator
│   │   │   ├── pipeline/      # Pipeline status dashboard
│   │   │   └── reports/       # Weekly reports (+ [...gameweek] detail)
│   │   ├── (marketing)/       # Public pages (landing, pricing)
│   │   └── api/               # API routes
│   │       ├── admin/users/   # Admin user management API
│   │       ├── pipeline/sync/ # Data file → Postgres sync
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
│   │   └── auth/              # NextAuth configuration
│   ├── hooks/                 # Custom React hooks
│   └── config/                # App configuration
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
- `(dashboard)` - Requires authentication, has sidebar layout
- `(marketing)` - Public pages with header/footer

**Database Tables** (all in `predictify` schema):
- users, creditTransactions, accaHistory, predictionViews (app)
- leagueStandings (synced from SportMonks via `npm run sync-standings`)
- gameweeks, matchPredictions, weeklyMetrics, pipelineRuns (pipeline)

**Tier Access Control**:
- Gold: unlimited access to all value bets, predictions, fixtures. No credit spend.
- Pro: free PL value bets/predictions. Other leagues require credits.
- Free: everything costs credits.
- `isFreeForTier(tier, leagueId)` in `src/config/pricing.ts` is the central check.

**Credits System**:
- `CreditsProvider` in `src/components/providers/credits-provider.tsx` wraps dashboard layout
- `useCredits()` hook reads from shared context (not per-component API calls)
- Credit unlock state persisted in localStorage (`mypredictify:unlocked`)

**Predictions Page** (`/predictions`):
- URL params: `?league={id}&gw={number}` — league filter + gameweek navigation
- Gameweek data loaded from `data/gameweeks/2025-26/GW{n}/` (matches.json, predictions.json, results.json)
- `getAvailableGameweeks()` scans GW directories, exported from `predictions-list.tsx`
- Prediction cards show both final score AND predicted score for finished matches
- Result-aware card shading: gold = exact score correct, green = correct result, red = incorrect
- Prev/next GW navigation in `predictions-filter.tsx`

**Admin Panel** (`/admin`):
- Protected by `isAdmin()` check — only listed admin emails can access
- User list with search, tier display, credit balances
- Credit adjustment (add/remove) via `/api/admin/users/[id]/credits`
- Tier update via `/api/admin/users/[id]`

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
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (optional, for payments)
- `PIPELINE_SYNC_KEY` (optional, for sync API auth)

## Supported Leagues

| League | ID | Country | Tier |
|--------|-----|---------|------|
| Premier League | 8 | England | Free (Pro+: no credits) |
| La Liga | 564 | Spain | Gold |
| Bundesliga | 82 | Germany | Gold |
| Serie A | 384 | Italy | Gold |
| Ligue 1 | 301 | France | Gold |
