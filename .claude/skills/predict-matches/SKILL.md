# /predict-matches

Generate constrained W/D/L predictions for each match by combining statistical models with research signals.

## Usage
```
/predict-matches [--gameweek GW25] [--season 2024-25]
```

Defaults: latest gameweek that has both `matches.json` and `research.json`.

## Prerequisites
- `matches.json` must exist (from `/ingest-gameweek`)
- `research.json` must exist (from `/research-matches`)
- `data/memory/elo-ratings.json` — current Elo ratings
- `data/memory/signal-weights.json` — learned signal weights
- `data/memory/heuristics.md` — learned patterns
- `data/memory/prompt-fragments/synthesis.md` — synthesis instructions (if exists)

## Steps

### 1. Load All Data
- Read `data/gameweeks/{season}/GW{n}/matches.json`
- Read `data/gameweeks/{season}/GW{n}/research.json`
- Read `data/memory/elo-ratings.json`
- Read `data/memory/signal-weights.json`
- Read `data/memory/heuristics.md`
- Read `data/config/pipeline.json`
- Read `data/memory/prompt-fragments/synthesis.md` (if exists)

### 2. For Each Match, Generate Prediction

#### Step A: Statistical Baseline
1. **Elo Model**: Run `npx tsx scripts/elo.ts predict --home-elo <n> --away-elo <n>`
   - If team not in Elo ratings, use 1500 (default)
   - Captures: homeWinProb, drawProb, awayWinProb

2. **Poisson Model**: Run `npx tsx scripts/poisson.ts predict --home-attack <n> --home-defense <n> --away-attack <n> --away-defense <n>`
   - Calculate attack/defense strengths from standings data:
     - `attack = team_goals_scored / league_avg_goals_scored`
     - `defense = team_goals_conceded / league_avg_goals_conceded`
   - If standings data insufficient, use 1.0 (league average) for all
   - Captures: homeWinProb, drawProb, awayWinProb, mostLikelyScore

3. **Baseline**: Weighted average of Elo (40%) and Poisson (60%)
   - Poisson weighted higher because it accounts for scoring patterns

#### Step B: Signal Adjustments
For each of the 5 signals from research.json:
1. Read the signal's `homeAdvantage` value (-1 to +1)
2. Read the signal's `confidence` (0 to 1)
3. Read the signal weight from `signal-weights.json`
4. Calculate adjustment: `homeAdvantage * confidence * signalWeight`
5. Apply adjustment to baseline probabilities

**Constraints** (from synthesis.md or defaults):
- homeWinProb + drawProb + awayWinProb MUST equal 1.000
- No probability below 0.03 (3%) for any outcome
- Maximum adjustment from baseline: ±0.15 per signal
- Predicted goals must be non-negative integers

#### Step C: Apply Heuristics
Read `data/memory/heuristics.md` for any applicable patterns.
For each heuristic:
- Check if the current match conditions match the pattern
- If so, apply the suggested adjustment
- Log which heuristics were applied

#### Step D: Synthesize Final Prediction
Claude combines all components and produces:
- Final W/D/L probabilities (normalized to sum = 1.000)
- Predicted score (from Poisson, adjusted if signals strongly disagree)
- Prediction: "H", "D", or "A" (highest probability outcome)
- Confidence: weighted average of model agreement and signal confidence
- Explanation: 2-3 sentence summary of key factors driving the prediction

### 3. Write Predictions
Write `data/gameweeks/{season}/GW{n}/predictions.json`:
```json
[{
  "fixtureId": 12345,
  "homeTeam": "Arsenal",
  "awayTeam": "Chelsea",
  "league": "Premier League",
  "kickoff": "2025-02-15T15:00:00Z",
  "homeWinProb": 0.52,
  "drawProb": 0.24,
  "awayWinProb": 0.24,
  "predictedScore": "2-1",
  "prediction": "H",
  "confidence": 0.68,
  "explanation": "Arsenal's 8-match home unbeaten run and Chelsea's defensive injury crisis give Arsenal the edge. Market agrees at 55% implied. Poisson model predicts 2-1 as most likely score.",
  "modelComponents": {
    "elo": { "H": 0.48, "D": 0.26, "A": 0.26 },
    "poisson": { "H": 0.50, "D": 0.23, "A": 0.27, "score": "2-1" },
    "baseline": { "H": 0.492, "D": 0.242, "A": 0.266 },
    "signals": {
      "form": { "adjustment": 0.038, "confidence": 0.75, "weight": 0.25 },
      "squad": { "adjustment": 0.020, "confidence": 0.65, "weight": 0.15 },
      "tactical": { "adjustment": 0.008, "confidence": 0.60, "weight": 0.15 },
      "market": { "adjustment": -0.005, "confidence": 0.80, "weight": 0.30 },
      "narrative": { "adjustment": 0.012, "confidence": 0.50, "weight": 0.15 }
    },
    "heuristicsApplied": []
  }
}]
```

### 4. Validation
After generating all predictions, validate:
- Every match has a prediction
- All probabilities sum to 1.000 (±0.001 tolerance)
- No probability below 0.03
- Confidence is between 0 and 1
- predictedScore is valid format (e.g., "2-1")
- prediction matches highest probability outcome

If validation fails for a match, re-generate with tighter constraints.
Log validation results in `_predict-log.json`.

### 5. Error Handling & Self-Healing
- If Elo script fails: use equal probabilities (0.4, 0.25, 0.35) as home-favored baseline
- If Poisson script fails: use Elo-only baseline
- If a signal is missing from research.json: skip that signal (reduce total weight)
- If probability normalization produces values < 0.03: clamp and renormalize
- Track and log all fallbacks used in `_predict-log.json`
- Never write predictions.json with invalid data — validate or fail

### Output
- `data/gameweeks/{season}/GW{n}/predictions.json` — final predictions
- `data/gameweeks/{season}/GW{n}/_predict-log.json` — validation, fallbacks, timing
