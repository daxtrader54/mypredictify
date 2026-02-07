# /evaluate-results

Post-match evaluation: ingest results, calculate metrics, update Elo ratings, adjust signal weights, record heuristics.

## Usage
```
/evaluate-results [--gameweek GW25] [--season 2024-25]
```

Defaults: latest gameweek that has `predictions.json` but no `evaluation.json`.

## Prerequisites
- `predictions.json` must exist
- Matches must be finished (check via SportMonks)

## Steps

### 1. Fetch Results
For each league in the gameweek:
- Run `npx tsx scripts/fetch-sportmonks.ts results --league <id> --round <n> --season <id>`
- Parse response to extract: fixtureId, homeGoals, awayGoals, outcome (H/D/A)

Write `data/gameweeks/{season}/GW{n}/results.json`:
```json
[{
  "fixtureId": 12345,
  "homeTeam": "Arsenal",
  "awayTeam": "Chelsea",
  "homeGoals": 2,
  "awayGoals": 1,
  "outcome": "H",
  "status": "FT"
}]
```

If some matches haven't finished yet:
- Write results for completed matches only
- Log which matches are still pending
- Mark the evaluation as "partial" — can be re-run later

### 2. Calculate Metrics
Run `npx tsx scripts/metrics.ts evaluate --predictions <predictions.json> --results <results.json>`

Write `data/gameweeks/{season}/GW{n}/evaluation.json`:
```json
{
  "summary": {
    "totalPredictions": 50,
    "matchedWithResults": 48,
    "outcomeAccuracy": 0.583,
    "scoreAccuracy": 0.083,
    "avgLogLoss": 0.942,
    "avgBrierScore": 0.412
  },
  "calibration": { ... },
  "matches": [ ... ],
  "evaluatedAt": "2025-02-17T22:00:00Z",
  "status": "complete"
}
```

### 3. Update Elo Ratings
For each completed match:
1. Look up both teams' current Elo from `data/memory/elo-ratings.json`
2. Run `npx tsx scripts/elo.ts update --home-elo <n> --away-elo <n> --home-goals <n> --away-goals <n>`
3. Update `data/memory/elo-ratings.json` with new ratings

### 4. Analyze Signal Performance
For each match, determine which signals helped or hurt:
1. Compare each signal's `homeAdvantage` direction with actual outcome
2. Track per-signal accuracy: did the signal push probability toward or away from the correct outcome?
3. Compute net signal impact:
   - If signal pushed toward correct outcome → "helped"
   - If signal pushed away from correct outcome → "hurt"

### 5. Adjust Signal Weights
Based on signal performance analysis:
- For each signal type, calculate help/hurt ratio
- Adjust weights in `data/memory/signal-weights.json`:
  - Signals that helped more than hurt: increase weight by 2% of current
  - Signals that hurt more than helped: decrease weight by 2% of current
  - Cap at ±50% of initial weight (from pipeline.json)
  - Normalize so all weights still sum to 1.0
- Append adjustment history to signal-weights.json `history` array

### 6. Generate Heuristics
Claude analyzes the results and looks for patterns:

**Automatic pattern detection:**
- Teams consistently over/under-predicted at specific venues
- Draw probability miscalibration for specific leagues
- Time-of-day effects (early kickoffs, evening matches)
- Specific team matchups where model consistently fails
- League-specific biases (e.g., consistently underestimating Bundesliga goals)

**For each discovered pattern:**
Append to `data/memory/heuristics.md`:
```markdown
### {Pattern Name}
- **Pattern**: {description}
- **Adjustment**: {what to do}
- **Confidence**: {high/medium/low} (based on {n} observations)
- **Added**: {date}
- **Source**: GW{n} evaluation
```

Rules for heuristic generation:
- Only add heuristics with 3+ supporting observations
- Remove/update heuristics that are contradicted by new data
- Keep total heuristics under 20 (prune least confident when full)

### 7. Update Performance Log
Append to `data/memory/performance-log.json`:
```json
{
  "gameweek": "GW25",
  "season": "2024-25",
  "date": "2025-02-17",
  "accuracy": 0.583,
  "avgLogLoss": 0.942,
  "brierScore": 0.412,
  "predictions": 48,
  "correct": 28,
  "scoreCorrect": 4,
  "signalAdjustments": { "form": 0.02, "squad": -0.01, ... },
  "heuristicsAdded": 1,
  "heuristicsRemoved": 0
}
```

Update cumulative stats.

### 8. Re-generate Report
Run `/generate-report` to add post-match analysis to the report.

### 9. Error Handling & Self-Healing
- If results fetch fails for some leagues: evaluate only completed leagues, mark as "partial"
- If Elo update fails: log error, skip that team's update, continue with others
- If metrics calculation fails: try calculating manually from raw data
- If signal analysis finds no clear patterns: skip heuristic generation (don't force false patterns)
- Track all errors in `_evaluate-log.json` with suggested fixes
- If evaluation was partial, set a flag so it can be re-run when remaining matches complete

### Output
- `data/gameweeks/{season}/GW{n}/results.json` — actual results
- `data/gameweeks/{season}/GW{n}/evaluation.json` — metrics
- Updated `data/memory/elo-ratings.json`
- Updated `data/memory/signal-weights.json`
- Updated `data/memory/heuristics.md`
- Updated `data/memory/performance-log.json`
- Updated `data/gameweeks/{season}/GW{n}/report.md` (via /generate-report)
- `data/gameweeks/{season}/GW{n}/_evaluate-log.json` — run metadata
