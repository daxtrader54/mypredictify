# SportMonks Football API v3 - Comprehensive Reference

> Scraped and compiled from https://docs.sportmonks.com/football/ on 2026-02-07

---

## Table of Contents

1. [General API Information](#1-general-api-information)
2. [Request Options](#2-request-options)
3. [Fixtures (12 endpoints)](#3-fixtures)
4. [Livescores (3 endpoints)](#4-livescores)
5. [Standings (5 endpoints)](#5-standings)
6. [Predictions (5 endpoints)](#6-predictions)
7. [Odds - Pre-Match (5 endpoints)](#7-odds---pre-match-standard)
8. [Odds - Inplay (5 endpoints)](#8-odds---inplay-standard)
9. [Odds - Premium (7 endpoints)](#9-odds---premium-pre-match)
10. [Leagues (7 endpoints)](#10-leagues)
11. [Seasons (4 endpoints)](#11-seasons)
12. [Rounds (4 endpoints)](#12-rounds)
13. [Teams (5 endpoints)](#13-teams)
14. [Statistics (3 endpoints)](#14-statistics)
15. [Schedules (3 endpoints)](#15-schedules)
16. [Other Endpoints](#16-other-endpoints)
17. [Entity Schemas](#17-entity-schemas)
18. [Fixture States Reference](#18-fixture-states-reference)
19. [Statistic Types Reference](#19-statistic-types-reference)
20. [Common Market IDs](#20-common-market-ids)
21. [Best Practices](#21-best-practices)

---

## 1. General API Information

### Base URL
```
https://api.sportmonks.com/v3/football
```

### Authentication

Two methods (both count towards the same rate limit):

**Query Parameter:**
```
?api_token=YOUR_TOKEN
```

**Header:**
```
Authorization: YOUR_TOKEN
```

### Rate Limits

- **3,000 API calls per entity per hour**
- Rate limit is per-entity, not global (e.g., hitting the fixtures limit does not affect standings calls)
- Resets 1 hour after your first call to that entity
- Each paginated page counts as a separate call
- 429 response returned when exceeded

**Rate Limit Response Object (included in every response):**

| Field | Description |
|-------|-------------|
| `resets_in_seconds` | Seconds remaining before rate limit resets for this entity |
| `remaining` | Requests remaining in the current window |
| `requested_entity` | The entity this rate limit applies to |

### Response Format

```json
{
  "data": [ ... ],
  "pagination": {
    "count": 25,
    "per_page": 25,
    "current_page": 1,
    "next_page": "https://api.sportmonks.com/v3/football/fixtures?page=2",
    "has_more": true
  },
  "subscription": [ ... ],
  "rate_limit": {
    "resets_in_seconds": 3421,
    "remaining": 2987,
    "requested_entity": "Fixture"
  },
  "timezone": "UTC"
}
```

---

## 2. Request Options

### 2.1 Includes

Enrich responses with related/nested data.

**Syntax:**
```
# Single include
&include=participants

# Multiple includes (semicolon-separated)
&include=participants;scores;events

# Nested includes (dot notation)
&include=lineups.player
&include=participants.coaches
&include=lineups.details.type

# Field selection on includes (colon-separated)
&include=events:player_name,minute
```

**Maximum nesting depth:** Varies by endpoint (1-4 levels, documented per endpoint below).

**Performance warning:** Deep/many includes significantly increase response size and slow response time. Cache heavy requests.

### 2.2 Filtering

Two types: **Static** (predefined, no parameters) and **Dynamic** (entity-based, customizable).

**Dynamic Filter Syntax:**
```
# Single filter
&filters=eventTypes:18

# Multiple values (comma-separated)
&filters=eventTypes:18,14

# Multiple filters (semicolon-separated)
&filters=eventTypes:18,14;fixtureStatisticTypes:45
```

**Filter naming convention:**
- Base entity: singular, lowercase (e.g., `fixture`)
- Target entity: plural, uppercase (e.g., `Types`, `States`)
- Example: `fixtureStatisticTypes:45`

### 2.3 Field Selection

```
# Select specific fields from base entity
&select=name,starting_at,result_info

# Select specific fields from an include
&include=events:player_name,related_player_name,minute
```

### 2.4 Pagination

| Parameter | Default | Max | Notes |
|-----------|---------|-----|-------|
| `page` | 1 | - | Each page = 1 API call against rate limiter |
| `per_page` | 25 | 50 | Only affects base entity, not includes |
| `order` | `asc` | - | Sort by ID (`asc` / `desc`) |

**Populate filter** for bulk loading:
```
&filters=populate
```
- Enables up to **1,000 results per page**
- **Disables all includes** when active
- Use for initial database population

**Pagination metadata:** `count`, `per_page`, `current_page`, `next_page`, `has_more`

### 2.5 Sorting

```
&sortBy=starting_at
&order=desc
```

### 2.6 Locale

```
&locale=nl  # Translate name fields to Dutch
```

---

## 3. Fixtures

**Base URL:** `https://api.sportmonks.com/v3/football/fixtures`

### Endpoints

| # | Method | Path | Description |
|---|--------|------|-------------|
| 1 | GET | `/fixtures` | All fixtures in subscription |
| 2 | GET | `/fixtures/{id}` | Single fixture by ID |
| 3 | GET | `/fixtures/multi/{id1,id2,...}` | Multiple fixtures by comma-separated IDs |
| 4 | GET | `/fixtures/date/{YYYY-MM-DD}` | All fixtures on a date |
| 5 | GET | `/fixtures/between/{start}/{end}` | Fixtures in date range (YYYY-MM-DD) |
| 6 | GET | `/fixtures/between/{start}/{end}/team/{teamId}` | Team fixtures in date range |
| 7 | GET | `/fixtures/head-to-head/{teamId1}/{teamId2}` | Historical H2H between two teams |
| 8 | GET | `/fixtures/search/{name}` | Search fixtures by participant name |
| 9 | GET | `/fixtures/upcoming/markets/{marketId}` | Upcoming fixtures with data for a market |
| 10 | GET | `/fixtures/upcoming/tv-station/{tvStationId}` | Upcoming by TV station |
| 11 | GET | `/fixtures/past/tv-station/{tvStationId}` | Past by TV station |
| 12 | GET | `/fixtures/latest` | Fixtures updated within last 10 seconds |

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `api_token` | YES | Authentication |
| `include` | NO | Related data (see below) |
| `select` | NO | Specific fields |
| `sortBy` | NO | Sort field |
| `filters` | NO | Static/dynamic filters |
| `locale` | NO | Translation language |
| `per_page` | NO | Results per page (max 50, default 25) |
| `page` | NO | Page number |
| `order` | NO | `asc` / `desc` (default `asc`) |

### Available Includes (max 3 nested levels)

`sport`, `round`, `stage`, `group`, `aggregate`, `league`, `season`, `coaches`, `tvStations`, `venue`, `state`, `weatherReport`, `lineups`, `events`, `timeline`, `comments`, `trends`, `statistics`, `periods`, `currentPeriod`, `participants`, `odds`, `premiumOdds`, `inplayOdds`, `prematchNews`, `postmatchNews`, `metadata`, `sidelined`, `predictions`, `referees`, `formations`, `ballCoordinates`, `scores`, `xGFixture`, `pressure`, `expectedLineups`

### Static Filters

| Filter | Description |
|--------|-------------|
| `participantSearch` | Match specific teams |
| `todayDate` | Today's fixtures only |
| `venues` | By venue IDs |
| `Deleted` | Show deleted fixtures |
| `IdAfter` | Fixtures from a specific ID forward |
| `markets` | Odds by market IDs |
| `bookmakers` | Odds by bookmaker IDs |
| `WinningOdds` | Winning odds only |

### Dynamic Filters

| Filter | Description |
|--------|-------------|
| `types` | Statistics, events, lineups by type IDs |
| `states` | Fixture states by state IDs |
| `leagues` | By league IDs |
| `groups` | By group IDs |
| `countries` | By country IDs |
| `seasons` | By season IDs |

### Fixture Entity Response Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | integer | No | Unique fixture ID |
| `sport_id` | integer | No | Sport ID |
| `league_id` | integer | No | League ID |
| `season_id` | integer | No | Season ID |
| `stage_id` | integer | No | Stage ID |
| `group_id` | integer | Yes | Group ID (cups) |
| `aggregate_id` | integer | Yes | Aggregate ID (two-legged ties) |
| `round_id` | integer | Yes | Round ID |
| `state_id` | integer | No | Fixture state (see States reference) |
| `venue_id` | integer | Yes | Venue ID |
| `name` | string | Yes | "Home vs Away" display name |
| `starting_at` | date | Yes | Match start datetime |
| `result_info` | string | Yes | Final result description |
| `leg` | string | No | Leg info (e.g., "1/1") |
| `details` | string | Yes | Additional details |
| `length` | integer | Yes | Duration in minutes |
| `placeholder` | boolean | No | Placeholder indicator |
| `has_odds` | boolean | No | Whether odds are available |
| `has_premium_odds` | boolean | No | Premium odds available |
| `starting_at_timestamp` | integer | No | Unix timestamp |

### Key Usage Patterns

```
# Upcoming Premier League fixtures this week
/fixtures/between/2026-02-07/2026-02-14?include=participants;scores;league;state&filters=leagues:8

# Full fixture detail with everything
/fixtures/18535517?include=participants;scores;events;statistics.type;lineups.player;odds;predictions

# Head-to-head history
/fixtures/head-to-head/62/53?include=scores;participants
```

---

## 4. Livescores

**Base URL:** `https://api.sportmonks.com/v3/football`

| # | Path | Description |
|---|------|-------------|
| 1 | `/livescores/inplay` | Currently in-play fixtures |
| 2 | `/livescores` | Fixtures 15 min before kickoff through 15 min after FT |
| 3 | `/livescores/latest` | Livescores updated within last 10 seconds |

**Note:** Use livescores endpoints for in-play data, not the fixtures endpoints.

**Available includes:** Same as Fixtures (40+ includes available).

---

## 5. Standings

**Base URL:** `https://api.sportmonks.com/v3/football/standings`

### Endpoints

| # | Path | Description |
|---|------|-------------|
| 1 | `/standings` | All standings in subscription |
| 2 | `/standings/seasons/{seasonId}` | Full league table for a season |
| 3 | `/standings/rounds/{roundId}` | Standings as of a specific round |
| 4 | `/standings/corrections/seasons/{seasonId}` | Standing corrections for a season |
| 5 | `/standings/live/leagues/{leagueId}` | Live standings (no pagination, max 2 includes) |

### Available Includes (max 2 nested levels)

`participant`, `season`, `league`, `stage`, `group`, `round`, `rule`, `details`, `form`, `sport`

### Key Include: `details.type`

The `details` include provides the actual standing statistics. Each detail has a `type_id` referencing what the value represents (wins, losses, draws, goals for/against, etc.).

### Key Include: `form`

Returns recent match form with `form` field values: `W` (win), `D` (draw), `L` (loss).

### Static Filters

| Filter | Description |
|--------|-------------|
| `IdAfter` | Standings from a specific ID forward |

### Dynamic Filters

| Filter | Description |
|--------|-------------|
| `types` | Standing detail/rule types |
| `leagues` | By league IDs |
| `groups` | By group IDs |
| `seasons` | By season IDs |
| `stages` | By stage IDs |

### Standing Entity Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique standing ID |
| `participant_id` | integer | Team ID |
| `sport_id` | integer | Sport ID |
| `league_id` | integer | League ID |
| `season_id` | integer | Season ID |
| `stage_id` | integer | Stage ID |
| `group_id` | integer/null | Group ID |
| `round_id` | integer/null | Round ID |
| `standing_rule_id` | integer | Standing rule ID |
| `position` | integer | Table position |
| `result` | string | Position movement (up/down/equal) |
| `points` | integer | Total points |

### StandingDetail Entity

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Detail ID |
| `standing_type` | string | "live" or "normal" |
| `standing_id` | integer | Parent standing ID |
| `type_id` | integer | What this value represents |
| `value` | integer | The actual value |

### StandingForm Entity

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Form ID |
| `standing_id` | integer | Parent standing ID |
| `fixture_id` | integer | Related fixture |
| `form` | string | W, D, or L |
| `sort_order` | integer | Old to newest |

### Usage Pattern

```
# Full Premier League table with team names and stats
/standings/seasons/23614?include=participant;details.type;form

# Live standings during matchday
/standings/live/leagues/8?include=participant;details.type
```

---

## 6. Predictions

**Base URL:** `https://api.sportmonks.com/v3/football/predictions`

### Endpoints

| # | Path | Description |
|---|------|-------------|
| 1 | `/predictions/probabilities` | All probabilities in subscription |
| 2 | `/predictions/probabilities/fixtures/{fixtureId}` | Probabilities for a fixture |
| 3 | `/predictions/probabilities/predictability/leagues/{leagueId}` | Model performance/predictability for a league |
| 4 | `/predictions/value-bets` | All value bets in subscription |
| 5 | `/predictions/value-bets/fixtures/{fixtureId}` | Value bets for a fixture |

### Probabilities

**Available 21 days before match starts.**

**Available Includes (max 1 nested level):** `type`, `fixture`

**Dynamic Filter:** `predictionTypes:{typeIds}` (e.g., `&filters=predictionTypes:236`)

**Probability Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Prediction state ID |
| `fixture_id` | integer | Associated fixture |
| `predictions` | object | `{ "yes": number, "no": number }` or `{ "home": number, "draw": number, "away": number }` |
| `type_id` | integer | Prediction type (e.g., FULLTIME_RESULT, BTTS, OVER_UNDER) |

### Value Bets

**Algorithm runs every 10 minutes** from when opening odds are available until kickoff. Not every match has value bets.

**Available Includes (max 1 nested level):** `type`, `fixture`

**No filters available.**

**Value Bet Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | State ID |
| `fixture_id` | integer | Associated fixture |
| `type_id` | integer | Prediction type ID |
| `predictions` | object | See below |

**Predictions Object:**

| Field | Type | Description |
|-------|------|-------------|
| `bet` | string | `"1"` (home), `"X"` (draw), `"2"` (away) |
| `bookmaker` | string | Best value bookmaker name |
| `odd` | number | Bookmaker's odds |
| `is_value` | boolean | Whether the opportunity is still available |
| `stake` | number | Recommended stake (risk management metric) |
| `fair_odd` | number | Algorithm's calculated fair odds |

**Value formula:** If bookmaker odds > fair_odd, there is value.

### Predictability (League Model Performance)

Returns predictability metrics across 13+ markets for a league:

| Market | Description |
|--------|-------------|
| `fulltime_result` | 1X2 match outcome |
| `over_under_25` | Over/Under 2.5 goals |
| `over_under_35` | Over/Under 3.5 goals |
| `btts` | Both Teams To Score |
| `correct_score` | Exact final score |
| (and more...) | |

### Usage Patterns

```
# Probabilities for a fixture
/predictions/probabilities/fixtures/18535517?include=type

# All current value bets with fixture details
/predictions/value-bets?include=type;fixture.participants;fixture.league

# League predictability
/predictions/probabilities/predictability/leagues/8
```

---

## 7. Odds - Pre-Match (Standard)

**Base URL:** `https://api.sportmonks.com/v3/football/odds/pre-match`

### Endpoints

| # | Path | Description |
|---|------|-------------|
| 1 | `/odds/pre-match` | All pre-match odds |
| 2 | `/odds/pre-match/fixtures/{fixtureId}` | Odds for a fixture |
| 3 | `/odds/pre-match/fixtures/{fixtureId}/bookmakers/{bookmakerId}` | Odds by fixture + bookmaker |
| 4 | `/odds/pre-match/fixtures/{fixtureId}/markets/{marketId}` | Odds by fixture + market |
| 5 | `/odds/pre-match/latest` | Odds updated within last 10 seconds |

### Available Includes (max 1 nested level)

`market`, `bookmaker`, `fixture`

### Static Filters

| Filter | Description |
|--------|-------------|
| `IdAfter` | From specific odd ID |
| `deleted` | Deleted fixtures only |
| `markets` | Comma-separated market IDs |
| `bookmakers` | Comma-separated bookmaker IDs |
| `WinningOdds` | Winning odds only |

### Odd Entity Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique odd ID |
| `fixture_id` | integer | Fixture reference |
| `market_id` | integer | Market reference |
| `bookmaker_id` | integer | Bookmaker reference |
| `label` | string | Display label (e.g., "1", "X", "2", "Over", "Under") |
| `value` | string | Decimal odds value |
| `name` | string | Odd name |
| `market_description` | string | Market name (e.g., "Match Winner") |
| `probability` | string | Implied probability percentage |
| `dp3` | string | 3-decimal odds |
| `fractional` | string | Fractional odds (e.g., "5/4") |
| `american` | string | American odds (e.g., "+125") |
| `winning` | boolean | Whether this odd won (post-match) |
| `stopped` | boolean | Suspended indicator |
| `total` | string/null | Over/under line value |
| `handicap` | string/null | Handicap value |
| `participants` | string/null | Participant info |
| `created_at` | timestamp | When created |
| `updated_at` | timestamp | Last modified |
| `original_label` | string/null | Previous label |
| `latest_bookmaker_update` | string/null | Last confirmed up-to-date (UTC) |

### Usage Patterns

```
# Fulltime Result odds for a fixture
/odds/pre-match/fixtures/18535517/markets/1?api_token=TOKEN

# BTTS odds from all bookmakers
/odds/pre-match/fixtures/18535517/markets/14?api_token=TOKEN

# Over/Under 2.5 goals
/odds/pre-match/fixtures/18535517/markets/80?api_token=TOKEN
```

---

## 8. Odds - Inplay (Standard)

**Base URL:** `https://api.sportmonks.com/v3/football/odds/inplay`

| # | Path | Description |
|---|------|-------------|
| 1 | `/odds/inplay` | All inplay odds |
| 2 | `/odds/inplay/fixtures/{fixtureId}` | Inplay odds for a fixture |
| 3 | `/odds/inplay/fixtures/{fixtureId}/bookmakers/{bookmakerId}` | By fixture + bookmaker |
| 4 | `/odds/inplay/fixtures/{fixtureId}/markets/{marketId}` | By fixture + market |
| 5 | `/odds/inplay/latest` | Updated within 10 seconds |

### InplayOdd Additional Fields

| Field | Type | Description |
|-------|------|-------------|
| `external_id` | integer | Third-party reference |
| `suspended` | boolean | In-game suspension (replaces `winning`) |

---

## 9. Odds - Premium Pre-Match

**Base URL:** `https://api.sportmonks.com/v3/football/odds/premium`

| # | Path | Description |
|---|------|-------------|
| 1 | `/odds/premium` | All premium pre-match odds |
| 2 | `/odds/premium/fixtures/{fixtureId}` | Premium odds for a fixture |
| 3 | `/odds/premium/fixtures/{fixtureId}/bookmakers/{bookmakerId}` | By fixture + bookmaker |
| 4 | `/odds/premium/fixtures/{fixtureId}/markets/{marketId}` | By fixture + market |
| 5 | `/odds/premium/updated/between/{startTime}/{endTime}` | Updated in time range (max 5 min) |
| 6 | `/odds/premium/historical/updated/between/{startTime}/{endTime}` | Historical updated in range |
| 7 | `/odds/premium/historical` | All historical premium odds |

---

## 10. Leagues

**Base URL:** `https://api.sportmonks.com/v3/football/leagues`

### Endpoints

| # | Path | Description |
|---|------|-------------|
| 1 | `/leagues` | All leagues in subscription |
| 2 | `/leagues/{id}` | Single league by ID |
| 3 | `/leagues/live` | Leagues with active fixtures right now |
| 4 | `/leagues/fixture-date/{YYYY-MM-DD}` | Leagues with matches on a date |
| 5 | `/leagues/countries/{countryId}` | Leagues in a country |
| 6 | `/leagues/search/{name}` | Search leagues by name |
| 7 | `/leagues/teams/{teamId}` | All leagues a team plays/played in |

### Available Includes (max 2 nested levels)

`sport`, `country`, `stages`, `currentSeason`, `seasons`, `latest`, `upcoming`, `inplay`, `today`

### League Entity Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique league ID |
| `sport_id` | integer | Sport reference |
| `country_id` | integer | Country reference |
| `name` | string | League name |
| `active` | boolean | Active status |
| `short_code` | string/null | Abbreviation |
| `image_path` | string | Logo URL |
| `type` | string | "league" |
| `sub_type` | string | domestic, domestic_cup, international, cup_international, play-offs, friendly |
| `last_played_at` | string | Last fixture date |
| `category` | integer | 1 (major) to 4 (obscure) |
| `has_jerseys` | boolean | Jersey data available |

### Key League IDs for This Project

| League | ID | Tier |
|--------|-----|------|
| Premier League | 8 | Free |
| La Liga | 564 | Pro |
| Bundesliga | 82 | Pro |
| Serie A | 384 | Pro |
| Ligue 1 | 301 | Pro |

### Usage Pattern

```
# Get a league with its current season and stages
/leagues/8?include=currentSeason.stages
```

---

## 11. Seasons

**Base URL:** `https://api.sportmonks.com/v3/football/seasons`

### Endpoints

| # | Path | Description |
|---|------|-------------|
| 1 | `/seasons` | All seasons in subscription |
| 2 | `/seasons/{id}` | Single season by ID |
| 3 | `/seasons/teams/{teamId}` | Seasons for a team |
| 4 | `/seasons/search/{name}` | Search seasons by name |

### Available Includes (max 3 nested levels)

`sport`, `league`, `teams`, `stages`, `currentStage`, `fixtures`, `groups`, `statistics`, `topscorers`

### Static Filters

| Filter | Description |
|--------|-------------|
| `IdAfter` | Seasons from a specific ID |

### Dynamic Filters

| Filter | Description |
|--------|-------------|
| `seasonstatisticTypes` | Statistics by type IDs |
| `seasonLeagues` | By league IDs |
| `stageStages` | By stage IDs |
| `roundRounds` | By round IDs |
| `seasonTopscorerTypes` | Topscorers by type IDs |

### Season Entity Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Season ID |
| `sport_id` | integer | Sport reference |
| `league_id` | integer | League reference |
| `tie_breaker_rule_id` | integer | Tiebreaker rule |
| `name` | string | Season name (e.g., "2025/2026") |
| `finished` | boolean | Completed |
| `pending` | boolean | Pending |
| `is_current` | boolean | Current active season |
| `starting_at` | string | Start date |
| `ending_at` | string | End date |
| `standings_recalculated_at` | string | Last standings recalculation |
| `games_in_current_week` | boolean | Matches this week |

---

## 12. Rounds

**Base URL:** `https://api.sportmonks.com/v3/football/rounds`

### Endpoints

| # | Path | Description |
|---|------|-------------|
| 1 | `/rounds` | All rounds in subscription |
| 2 | `/rounds/{id}` | Single round by ID |
| 3 | `/rounds/seasons/{seasonId}` | All rounds in a season |
| 4 | `/rounds/search/{name}` | Search rounds by name |

### Available Includes (max 4 nested levels)

`sport`, `league`, `season`, `stage`, `fixtures`, `statistics`

### Dynamic Filters

| Filter | Description |
|--------|-------------|
| `roundLeagues` | By league IDs |
| `roundSeasons` | By season IDs |
| `roundStages` | By stage IDs |

### Round Entity Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Round ID |
| `sport_id` | integer | Sport reference |
| `league_id` | integer | League reference |
| `season_id` | integer | Season reference |
| `stage_id` | integer | Stage reference |
| `name` | string | Round name (e.g., "1", "2", ...) |
| `finished` | boolean | Completed |
| `pending` | boolean | Pending |
| `is_current` | boolean | Current round |
| `starting_at` | string | Start date |
| `ending_at` | string | End date |
| `games_in_current_week` | boolean | Matches this week |

### Usage Pattern

```
# All rounds for current PL season with fixtures
/rounds/seasons/23614?include=fixtures.participants;fixtures.scores
```

---

## 13. Teams

**Base URL:** `https://api.sportmonks.com/v3/football/teams`

### Endpoints

| # | Path | Description |
|---|------|-------------|
| 1 | `/teams` | All teams in subscription |
| 2 | `/teams/{id}` | Single team by ID |
| 3 | `/teams/countries/{countryId}` | Teams in a country |
| 4 | `/teams/seasons/{seasonId}` | Teams in a season |
| 5 | `/teams/search/{name}` | Search teams by name |

### Available Includes (max 3 nested levels)

`sport`, `country`, `venue`, `coaches`, `rivals`, `players`, `latest`, `upcoming`, `seasons`, `activeSeasons`, `sidelined`, `sidelinedHistory`, `statistics`, `trophies`, `socials`, `rankings`

### Static Filters

| Filter | Description |
|--------|-------------|
| `IdAfter` | Teams from a specific ID |

### Dynamic Filters

| Filter | Description |
|--------|-------------|
| `teamstatisticdetailTypes` | Statistics by type IDs |
| `teamCountries` | By country IDs |
| `teamstatisticSeasons` | Statistics by season IDs |

### Team Entity Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Team ID |
| `sport_id` | integer | Sport reference |
| `country_id` | integer | Country reference |
| `venue_id` | integer | Home venue ID |
| `gender` | string | "male" / "female" |
| `name` | string | Team name |
| `short_code` | string | Abbreviation (e.g., "ARS") |
| `image_path` | string | Logo URL |
| `founded` | integer/null | Year founded |
| `type` | string | "domestic" etc. |
| `placeholder` | boolean | Placeholder indicator |
| `last_played_at` | string | Last match date |

**When included in fixture as participant, also has `meta`:**

| Field | Type | Description |
|-------|------|-------------|
| `meta.location` | string | "home" / "away" |
| `meta.winner` | boolean/null | Whether team won |
| `meta.position` | integer/null | Position |

---

## 14. Statistics

**Base URL:** `https://api.sportmonks.com/v3/football/statistics`

### Endpoints

| # | Path | Description |
|---|------|-------------|
| 1 | `/statistics/seasons/{participant}/{participantId}` | Season stats for a participant (players/teams/coaches/referees) |
| 2 | `/statistics/stages/{stageId}` | Statistics by stage |
| 3 | `/statistics/rounds/{roundId}` | Statistics by round |

### Season Statistics Includes

`player`, `season`, `coach`, `team`, `referee`, `position`

### Filters

| Filter | Description |
|--------|-------------|
| `teamstatisticdetailTypes` | Team stat types |
| `seasonLeagues` | By league IDs |
| `stageStages` | By stage IDs |
| `seasonTopscorerTypes` | Topscorer types |

### Statistics Entity Hierarchy

**FixtureStatistic** (from fixture include `statistics`):

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Stat ID |
| `fixture_id` | integer | Fixture reference |
| `type_id` | integer | Statistic type (see reference) |
| `participant_id` | integer | Team ID |
| `data.value` | number/string | The value |
| `location` | string | "home" / "away" |

**TeamStatistic:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Stat ID |
| `team_id` | integer | Team reference |
| `season_id` | integer | Season reference |
| `has_values` | boolean | Data availability |
| `details` | array | TeamStatisticDetail items |

**PlayerStatistic:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Stat ID |
| `player_id` | integer | Player reference |
| `team_id` | integer | Team reference |
| `jersey_number` | integer | Shirt number |
| `position_id` | integer | Position reference |
| `season_id` | integer | Season reference |
| `details` | array | PlayerStatisticDetail items |

**Trend** (from fixture include `trends`):

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Trend ID |
| `fixture_id` | integer | Fixture reference |
| `participant_id` | integer | Team ID |
| `type_id` | integer | Trend type |
| `period_id` | integer | Match period |
| `value` | integer | Value |
| `minute` | integer | Match minute |

---

## 15. Schedules

**Base URL:** `https://api.sportmonks.com/v3/football/schedules`

| # | Path | Description |
|---|------|-------------|
| 1 | `/schedules/seasons/{seasonId}` | Complete season schedule |
| 2 | `/schedules/teams/{teamId}` | Team schedule (active seasons) |
| 3 | `/schedules/seasons/{seasonId}/teams/{teamId}` | Team schedule in a season |

**Note:** Schedules are better than fixtures for retrieving all league fixtures in a current season. Returns data organized by Stage > Round > Fixtures.

---

## 16. Other Endpoints

### Topscorers (2)
- `GET /topscorers/seasons/{seasonId}` - Season topscorers
- `GET /topscorers/stages/{stageId}` - Stage topscorers

### Team Rankings (3)
- `GET /team-rankings` - All rankings
- `GET /team-rankings/teams/{teamId}` - Team ranking
- `GET /team-rankings/date/{date}` - Rankings on a date

### Coaches (5)
- `GET /coaches`, `/coaches/{id}`, `/coaches/countries/{countryId}`, `/coaches/search/{name}`, `/coaches/latest`

### Referees (5)
- `GET /referees`, `/referees/{id}`, `/referees/countries/{countryId}`, `/referees/seasons/{seasonId}`, `/referees/search/{name}`

### Transfers (6)
- `GET /transfers`, `/transfers/{id}`, `/transfers/latest`, `/transfers/between/{start}/{end}`, `/transfers/teams/{teamId}`, `/transfers/players/{playerId}`

### Venues (4)
- `GET /venues`, `/venues/{id}`, `/venues/seasons/{seasonId}`, `/venues/search/{name}`

### Expected (xG) (2)
- `GET /expected/teams/{teamId}` - xG by team
- `GET /expected/players/{playerId}` - xG by player

### Markets (4)
- `GET /markets` - All markets
- `GET /markets/premium` - Premium markets
- `GET /markets/{id}` - Market by ID
- `GET /markets/search/{name}` - Search markets

### Bookmakers (6)
- `GET /bookmakers`, `/bookmakers/premium`, `/bookmakers/{id}`, `/bookmakers/search/{name}`, `/bookmakers/fixtures/{fixtureId}`, `/bookmakers/fixtures/{fixtureId}/mappings`

### Rivals (2)
- `GET /rivals` - All rivalries
- `GET /rivals/teams/{teamId}` - Team rivalries

### Commentaries (2)
- `GET /commentaries` - All commentaries
- `GET /commentaries/fixtures/{fixtureId}` - Fixture commentaries

### News (5)
- `GET /news/pre-match`, `/news/pre-match/seasons/{seasonId}`, `/news/pre-match/upcoming`
- `GET /news/post-match`, `/news/post-match/seasons/{seasonId}`

### States (2)
- `GET /states` - All states
- `GET /states/{id}` - State by ID

### Types (3)
- `GET /types` - All types
- `GET /types/{id}` - Type by ID
- `GET /types/entity/{entity}` - Types for an entity

**Total across all categories: ~162 endpoints**

---

## 17. Entity Schemas

### Score (included via `scores` on fixture)

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Score ID |
| `fixture_id` | integer | Fixture reference |
| `type_id` | integer | Score type |
| `participant_id` | integer | Team ID |
| `score.goals` | integer | Number of goals |
| `score.participant` | string | "home" / "away" |
| `description` | string | "CURRENT", "1ST_HALF", "2ND_HALF", etc. |

### Stage

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Stage ID |
| `sport_id` | integer | Sport reference |
| `league_id` | integer | League reference |
| `season_id` | integer | Season reference |
| `type_id` | integer | 223=Group Stage, 224=Knock Out, 225=Qualifying |
| `name` | string | Stage name |
| `sort_order` | integer | Display order |
| `finished` | boolean | Completed |
| `is_current` | boolean | Current stage |
| `starting_at` | string | Start date |
| `ending_at` | string | End date |
| `tie_breaker_rule_id` | integer | Tiebreaker rule |

### Group

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Group ID |
| `sport_id` | integer | Sport reference |
| `league_id` | integer | League reference |
| `season_id` | integer | Season reference |
| `stage_id` | integer | Stage reference |
| `name` | string | Group name (e.g., "Group A") |
| `starting_at` | string | Start date |
| `ending_at` | string | End date |

### Venue

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Venue ID |
| `country_id` | integer | Country reference |
| `city_id` | integer | City reference |
| `name` | string | Stadium name |
| `address` | string/null | Street address |
| `capacity` | integer/null | Seating capacity |
| `image_path` | string/null | Image URL |
| `city_name` | string/null | City name |
| `surface` | string/null | Playing surface |

### StandingRule

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Rule ID |
| `model_type` | string | Entity type |
| `model_id` | integer | Entity ID |
| `type_id` | integer | Rule type |
| `position` | integer | Rule position |

### Topscorer

| Field | Type | Description |
|-------|------|-------------|
| `league_id` | integer | League reference |
| `season_id` | integer | Season reference |
| `stage_id` | integer | Stage reference |
| `player_id` | integer | Player reference |
| `participant_id` | integer | Team reference |
| `type_id` | integer | Type (goals, assists, cards) |
| `position` | integer | Ranking position |
| `total` | integer | Total count |

### PremiumOddHistory

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | History ID |
| `odd_id` | integer | Parent odd |
| `value` | string | Historical odds value |
| `probability` | string | Historical probability |
| `dp3` | string | 3-decimal format |
| `fractional` | string | Fractional format |
| `american` | string | American format |
| `bookmaker_update` | datetime | When bookmaker updated |

---

## 18. Fixture States Reference

| ID | Code | Name | Description |
|----|------|------|-------------|
| 1 | NS | Not Started | Initial fixture state |
| 2 | INPLAY_1ST_HALF | 1st Half | First half in progress |
| 3 | HT | Half Time | Half-time break |
| 4 | BREAK | Regular Time Finished | Awaiting extra time |
| 5 | FT | Full Time | Ended after 90 minutes |
| 6 | INPLAY_ET | Extra Time | Extra time in progress |
| 7 | AET | After Extra Time | Ended after 120 minutes |
| 8 | FT_PEN | After Penalties | Ended after penalty shootout |
| 9 | INPLAY_PENALTIES | Penalty Shootout | Penalties in progress |
| 10 | POSTPONED | Postponed | Moved to another date |
| 11 | SUSPENDED | Suspended | Will continue later |
| 12 | CANCELLED | Cancelled | Permanently cancelled |
| 13 | TBA | To Be Announced | No confirmed date/time |
| 14 | WO | Walk Over | Win by default |
| 15 | ABANDONED | Abandoned | Will resume later |
| 16 | DELAYED | Delayed | Kick-off delayed |
| 17 | AWARDED | Awarded | Administrative decision |
| 18 | INTERRUPTED | Interrupted | Temporarily stopped |
| 19 | AU | Awaiting Updates | Data delay |
| 20 | DELETED | Deleted | No longer active |
| 21 | EXTRA_TIME_BREAK | ET Break | Between ET periods |
| 22 | INPLAY_2ND_HALF | 2nd Half | Second half in progress |
| 25 | PEN_BREAK | Penalties Break | Waiting for penalties |
| 26 | PENDING | Pending | Awaiting verification |

**Status groupings for app logic:**
- **Upcoming:** NS (1), TBA (13), PENDING (26)
- **Live:** INPLAY_1ST_HALF (2), HT (3), INPLAY_2ND_HALF (22), BREAK (4), INPLAY_ET (6), EXTRA_TIME_BREAK (21), INPLAY_PENALTIES (9), PEN_BREAK (25), DELAYED (16), INTERRUPTED (18)
- **Finished:** FT (5), AET (7), FT_PEN (8), WO (14), AWARDED (17)
- **Postponed/Cancelled:** POSTPONED (10), SUSPENDED (11), CANCELLED (12), ABANDONED (15)
- **Other:** AU (19), DELETED (20)

---

## 19. Statistic Types Reference

### Match Statistics (fixture-level)

| ID | Code | Description |
|----|------|-------------|
| 34 | CORNERS | Number of corners |
| 41 | SHOTS_OFF_TARGET | Shots not on goal |
| 42 | SHOTS_TOTAL | All shots |
| 43 | ATTACKS | Number of attacks |
| 44 | DANGEROUS_ATTACKS | Dangerous attacks |
| 45 | BALL_POSSESSION | Possession percentage |
| 47 | PENALTIES | Penalties taken |
| 49 | SHOTS_INSIDEBOX | Shots inside the box |
| 50 | SHOTS_OUTSIDEBOX | Shots outside the box |
| 51 | OFFSIDES | Number of offsides |
| 52 | GOALS | Goals scored |
| 53 | GOAL_KICKS | Goal kicks |
| 54 | GOAL_ATTEMPTS | Goal attempts |
| 55 | FREE_KICKS | Free kicks |
| 56 | FOULS | Fouls committed |
| 57 | SAVES | Goalkeeper saves |
| 58 | SHOTS_BLOCKED | Blocked shots |
| 59 | SUBSTITUTIONS | Substitutions |
| 60 | THROWINS | Throw-ins |
| 64 | HIT_WOODWORK | Hit the post/crossbar |
| 83 | REDCARDS | Red cards |
| 84 | YELLOWCARDS | Yellow cards |
| 85 | YELLOWRED_CARDS | Second yellow = red |
| 86 | SHOTS_ON_TARGET | Shots on target |
| 314 | VAR_MOMENTS | VAR usage |
| 1527 | COUNTER_ATTACKS | Counter attacks |

### Player Statistics

| ID | Code | Description |
|----|------|-------------|
| 40 | CAPTAIN | Team captain |
| 52 | GOALS | Goals scored |
| 79 | ASSISTS | Assists |
| 80 | PASSES | Passes attempted |
| 81 | SUCCESSFUL_PASSES | Successful passes |
| 82 | SUCCESSFUL_PASSES_PERCENTAGE | Pass completion % |
| 86 | SHOTS_ON_TARGET | Shots on target |
| 88 | GOALS_CONCEDED | Goals conceded |
| 98 | TOTAL_CROSSES | Total crosses |
| 99 | ACCURATE_CROSSES | Accurate crosses |
| 100 | INTERCEPTIONS | Interceptions |
| 101 | CLEARANCES | Clearances |
| 105 | TOTAL_DUELS | Duels contested |
| 106 | DUELS_WON | Duels won |
| 107 | AERIALS_WON | Aerial duels won |
| 108 | DRIBBLE_ATTEMPTS | Dribble attempts |
| 109 | SUCCESSFUL_DRIBBLES | Successful dribbles |
| 111 | PENALTIES_SCORED | Penalties scored |
| 112 | PENALTIES_MISSES | Penalties missed |
| 113 | PENALTIES_SAVED | Penalties saved (GK) |
| 116 | ACCURATE_PASSES | Accurate passes |
| 117 | KEY_PASSES | Key passes |
| 118 | RATING | Player match rating |
| 119 | MINUTES_PLAYED | Minutes played |
| 120 | TOUCHES | Ball touches |
| 321 | APPEARANCES | Games played |
| 322 | LINEUPS | Times in starting XI |
| 323 | BENCH | Times on bench |
| 324 | OWN_GOALS | Own goals |

### Season/Team Aggregate Statistics

| ID | Code | Description |
|----|------|-------------|
| 188 | MATCHES | Total matches in season |
| 190 | MATCHES_ENDED_IN_DRAW | Draw likelihood |
| 191 | NUMBER_OF_GOALS | Goal scoring likelihood |
| 192 | BTTS | Both teams scoring likelihood |
| 193 | CARDS | Total cards |
| 194 | CLEANSHEET | Clean sheets |
| 196 | SCORING_MINUTES | Minutes goals scored |
| 197 | GOAL_LINE | Over/under X goals |
| 201 | WIN_PERCENTAGE | Win % |
| 202 | DEFEAT_PERCENTAGE | Loss % |
| 203 | DRAW_PERCENTAGE | Draw % |
| 214 | WIN | Games won |
| 215 | DRAW | Games drawn |
| 216 | LOST | Games lost |
| 9676 | AVERAGE_POINTS_PER_GAME | Average points/game |
| 9680 | PENALTY_CONVERSION_RATE | Penalty success % |
| 9681 | SHOT_CONVERSION_RATE | Goals from shots % |
| 9682 | SHOT_ON_TARGET_PERCENTAGE | Shots on target % |
| 9684 | EXPECTED_GOALS_DIFFERENCE | xG differential |
| 9685 | SHOOTING_PERFORMANCE | xGOT vs xG |
| 9686 | EXPECTED_GOALS_PREVENTED | GK xG prevented |
| 9687 | EXPECTED_GOALS_AGAINST | xG Against |
| 27248 | SCORING_FREQUENCY | Minutes per goal |
| 27250 | MOST_SCORED_HALF | Best scoring half |
| 27256 | HALF_RESULTS | Half results breakdown |
| 27261 | GOAL_RESULTS | GF/GA over/under X |
| 27263 | GAMES_PLAYED | Total games |

---

## 20. Common Market IDs

| ID | Market Name | Labels |
|----|-------------|--------|
| 1 | Fulltime Result (1X2) | "1", "X", "2" |
| 2 | Double Chance | "1X", "12", "X2" |
| 14 | Both Teams To Score | "Yes", "No" |
| 80 | Over/Under (goals) | "Over", "Under" (with `total` field for line) |

To discover all markets: `GET /markets?api_token=TOKEN`

---

## 21. Best Practices

### Initial Database Population
1. Use `&filters=populate` to get up to 1,000 results per page (includes disabled)
2. Use `&filters=IdAfter:{lastId}` for incremental syncing
3. Cache reference data locally: States, Types, Countries, Leagues

### Caching Strategy
- **Rarely change (cache 24h+):** States, Types, Countries, Leagues, Seasons, Teams
- **Semi-frequent (cache 1h):** Standings, Team Statistics
- **Frequent (cache 5-30 min):** Fixtures, Odds, Predictions
- **Live (cache 10-60s):** Livescores, Live Standings, Inplay Odds

### Rate Limit Management
- Monitor `rate_limit.remaining` in every response
- Implement client-side throttling (token bucket / sliding window)
- Handle 429 with exponential backoff + jitter
- Each paginated page = 1 API call

### Security
- Never expose API token in frontend/browser code
- Use a backend middleware/proxy for all API calls
- Configure CORS properly (no wildcard with credentials)

### Query Optimization
- Use `&select=` to reduce payload size
- Apply server-side filters instead of client-side filtering
- Resolve IDs locally from cached reference data instead of using includes
- Use `&include=` judiciously (increases response size significantly)

---

## Quick Reference: Prediction Pipeline Endpoints

For building a football prediction system, these are the core endpoints needed:

| Purpose | Endpoint | Includes | Cache |
|---------|----------|----------|-------|
| **Upcoming fixtures** | `/fixtures/between/{start}/{end}` | `participants;scores;league;state;venue` | 5 min |
| **Fixture detail** | `/fixtures/{id}` | `participants;scores;events;statistics.type;lineups` | 5 min |
| **Head-to-head** | `/fixtures/head-to-head/{t1}/{t2}` | `scores;participants` | 1 hour |
| **Standings** | `/standings/seasons/{seasonId}` | `participant;details.type;form` | 1 hour |
| **Live standings** | `/standings/live/leagues/{leagueId}` | `participant;details.type` | 1 min |
| **Probabilities** | `/predictions/probabilities/fixtures/{id}` | `type` | 30 min |
| **Value bets** | `/predictions/value-bets` | `type;fixture.participants;fixture.league` | 30 min |
| **Pre-match odds** | `/odds/pre-match/fixtures/{id}/markets/{mId}` | `bookmaker` | 5 min |
| **Season stats** | `/statistics/seasons/{participant}/{id}` | `team;season;details` | 1 hour |
| **Current season** | `/leagues/{id}?include=currentSeason` | `currentSeason.stages` | 24 hours |
| **Rounds** | `/rounds/seasons/{seasonId}` | `fixtures` | 1 hour |
| **Teams in season** | `/teams/seasons/{seasonId}` | `venue;statistics` | 24 hours |
