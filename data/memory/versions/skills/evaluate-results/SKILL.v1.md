# /evaluate-results

Post-match evaluation: ingest results, calculate metrics, update Elo ratings, adjust model weights, calibrate Poisson, record heuristics, track skill performance.

## Usage
```
/evaluate-results [--gameweek GW25] [--season 2025-26]
```

Defaults: latest gameweek that has `predictions.json` but no `evaluation.json`.

## Prerequisites
- `predictions.json` must exist
- Matches must be finished (check via SportMonks)

## Steps

### Step 1: Sync Results
```bash
npm run sync-results
```
Fetches latest match results from SportMonks → writes `results.json` per GW.
The Vercel cron (`/api/cron/sync-results`) also syncs to DB every 30 min.

If some matches haven't finished yet:
- Only finished results are written
- Log which matches are still pending
- Mark the evaluation as "partial" — can be re-run later

### Step 2: Evaluate Predictions
```bash
npx tsx scripts/evaluate-gameweek.ts --gameweek GW{n} --season {season}
```
Compares predictions vs results. Produces `evaluation.json` with:
- Per-match: log-loss, Brier score, outcome correctness, score correctness
- Per-model-component accuracy (elo, poisson, odds)
- Per-league accuracy breakdown
- Calibration bins
- Summary statistics

**Pure analysis — does NOT mutate any memory files.**

### Step 3: Update Elo Ratings
```bash
npx tsx scripts/update-elo-batch.ts --gameweek GW{n} --season {season}
```
Batch-updates Elo ratings for all finished matches using K=20, home advantage +65.
Writes updated `elo-ratings.json` and appends change records to `changelog.json`.
Idempotent: tracks `lastEvaluatedGW` to skip already-processed gameweeks.

### Step 4: Adjust Model Weights
```bash
npx tsx scripts/adjust-weights.ts --season {season}
```
Tunes Elo/Poisson/Odds blend weights based on rolling accuracy (default 5-GW window).
- Requires 2+ evaluated gameweeks to run
- Max ±2% adjustment per cycle per component
- Normalizes to sum = 1.0
- Updates `modelWeights` in `signal-weights.json`
- Appends adjustment history with reasoning

If fewer than 2 GWs are evaluated, this step is skipped (logged, not an error).

### Step 5: Update Poisson Calibration
```bash
npx tsx scripts/update-poisson-calibration.ts --season {season}
```
Tracks per-league goal prediction bias (predicted xG vs actual goals).
Writes `poisson-calibration.json` — consumed by `generate-predictions.mjs` to correct systematic over/under-prediction.

### Step 6: Update Performance Log
```bash
npx tsx scripts/update-performance-log.ts --gameweek GW{n} --season {season}
```
Appends GW summary to cumulative `performance-log.json`.
Tracks per-GW: accuracy, log-loss, Brier, model component accuracies.
Recomputes cumulative running averages.
Idempotent (skips if GW already logged).

### Step 7: Track Skill Performance
```bash
npx tsx scripts/track-skill-performance.ts --gameweek GW{n} --season {season}
```
Links current skill/fragment versions to accuracy data from evaluation.
Writes to `skill-performance.json` — reveals which version changes helped or hurt.

### Step 8: Generate/Prune Heuristics (Claude judgment)
Claude analyzes evaluation data + performance log for patterns:

**Automatic pattern detection:**
- Teams consistently over/under-predicted
- Draw probability miscalibration for specific leagues
- Specific team matchups where model consistently fails
- League-specific biases (e.g., underestimating Bundesliga goals)

**For each discovered pattern (3+ supporting observations):**
Append to `data/memory/heuristics.md`:
```markdown
### {Pattern Name}
- **Pattern**: {description}
- **Adjustment**: {what to do}
- **Confidence**: {high/medium/low} (based on {n} observations)
- **Added**: {date}
- **Source**: GW{n} evaluation
```

Rules:
- Only add heuristics with 3+ supporting observations
- Remove/update heuristics contradicted by new data
- Keep total heuristics under 20 (prune least confident when full)

### Step 9: Propose Skill/Fragment Improvements (Claude judgment)
If accuracy declined vs prior 3 GWs or systematic errors are found:
1. Snapshot current skill via `npx tsx scripts/version-skill.ts --skill {name} --reason "..."`
2. Edit the SKILL.md or prompt fragment to address the issue
3. Document the change in `changelog.json`

Every version is preserved and rollbackable.
If accuracy is stable or improving, skip this step.

### Step 10: Re-generate Report
Run `/generate-report` to add post-match analysis to the report.

## Error Handling
- If results fetch fails for some leagues: evaluate only completed leagues, mark as "partial"
- If Elo update fails: log error, skip that team's update, continue with others
- If weight adjustment has too few GWs: skip gracefully (not an error)
- If any script step fails: log the error, continue with remaining steps
- Track all errors in `_evaluate-log.json` with suggested fixes
- If evaluation was partial, set a flag so it can be re-run later

## Output
- `data/gameweeks/{season}/GW{n}/results.json` — actual results
- `data/gameweeks/{season}/GW{n}/evaluation.json` — metrics
- Updated `data/memory/elo-ratings.json`
- Updated `data/memory/signal-weights.json` (modelWeights)
- Updated `data/memory/poisson-calibration.json`
- Updated `data/memory/performance-log.json`
- Updated `data/memory/skill-performance.json`
- Updated `data/memory/changelog.json`
- Updated `data/memory/heuristics.md` (if patterns found)
- Updated `data/gameweeks/{season}/GW{n}/report.md` (via /generate-report)
