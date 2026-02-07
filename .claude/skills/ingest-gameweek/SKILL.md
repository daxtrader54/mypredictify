# /ingest-gameweek

Fetch fixtures and supporting data from SportMonks API for the upcoming gameweek.

## Usage
```
/ingest-gameweek [--league <id>] [--round <n>] [--season <id>]
```

Defaults: all 5 configured leagues, current/upcoming round.

## Steps

### 1. Resolve Season IDs
For each league in `data/config/leagues.json`:
- Run `npx tsx scripts/fetch-sportmonks.ts seasons --league <id>`
- Find the current season (is_current: true)
- Cache the seasonId for subsequent calls
- If league config has null seasonId, update `data/config/leagues.json`

### 2. Fetch Fixtures
For each league:
- Run `npx tsx scripts/fetch-sportmonks.ts fixtures --league <id> [--season <id>]`
- If --round is provided, add `--round <n>`
- Parse the response to identify the current round number

### 3. Fetch Supporting Data
For each league:
- **Standings**: `npx tsx scripts/fetch-sportmonks.ts standings --season <id>`
- For each match:
  - **H2H**: `npx tsx scripts/fetch-sportmonks.ts h2h --team1 <homeId> --team2 <awayId>`
  - **Odds**: `npx tsx scripts/fetch-sportmonks.ts odds --fixture <id>`

### 4. Write Match Data
Determine the gameweek directory:
- Season format: e.g., `2024-25` (from season name or start/end years)
- Gameweek format: e.g., `GW25` (from round number)
- Path: `data/gameweeks/{season}/GW{n}/`

Write `matches.json` with structure:
```json
[{
  "fixtureId": 12345,
  "league": { "id": 8, "name": "Premier League" },
  "round": 25,
  "seasonId": 23614,
  "homeTeam": { "id": 1, "name": "Arsenal", "shortCode": "ARS", "logo": "..." },
  "awayTeam": { "id": 14, "name": "Chelsea", "shortCode": "CHE", "logo": "..." },
  "kickoff": "2025-02-15T15:00:00Z",
  "venue": "Emirates Stadium",
  "homeForm": [],
  "awayForm": [],
  "standings": { "home": {}, "away": {} },
  "h2h": [],
  "odds": { "home": 0, "draw": 0, "away": 0, "bookmaker": "" }
}]
```

### 5. Error Handling
- If a SportMonks API call fails, log the error and retry up to 3 times with 2s delay
- If a specific match's H2H or odds fail, skip that data and continue (mark as `"dataGaps": ["h2h"]`)
- Write a `_ingest-log.json` alongside matches.json with timing, errors, and data coverage stats
- If ALL fixtures fail for a league, log error and skip that league (don't fail the whole pipeline)

### Output
- `data/gameweeks/{season}/GW{n}/matches.json` — structured match data
- `data/gameweeks/{season}/GW{n}/_ingest-log.json` — run metadata and errors
- Updated `data/config/leagues.json` with resolved seasonIds
