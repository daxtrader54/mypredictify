# /run-pipeline

Full weekly prediction pipeline orchestration. Chains all skills in sequence with error recovery.

## Usage
```
/run-pipeline [--mode predict|evaluate|full] [--league <id>] [--gameweek GW25]
```

Modes:
- `predict` (default): Ingest → Research → Predict → Report
- `evaluate`: Fetch results → Evaluate → Update memory → Re-generate report
- `full`: Both predict + evaluate (for catch-up runs)

## Pipeline Flow

### Predict Mode (Tuesday/Wednesday)
```
Step 1: /ingest-gameweek
  ↓ (commit data/gameweeks/{season}/GW{n}/matches.json)
Step 2: /research-matches
  ↓ (commit data/gameweeks/{season}/GW{n}/research.json)
Step 3: /predict-matches
  ↓ (commit data/gameweeks/{season}/GW{n}/predictions.json)
Step 4: /generate-report
  ↓ (commit data/gameweeks/{season}/GW{n}/report.md)
Step 5: Git push
```

### Evaluate Mode (Sunday/Monday)
```
Step 0: npm run sync-results (fetch match scores from SportMonks)
Step 1: /evaluate-results
  ↓ (commit results.json, evaluation.json, updated memory/)
Step 2: /generate-report (re-run with results)
  ↓ (commit updated report.md)
Step 3: Git push
```

## Error Recovery & Self-Healing

### Retry Logic
Each step has built-in retry logic:
- Max retries: 3 (from pipeline.json config)
- Retry delay: 2 seconds, doubling each retry
- Log each retry attempt

### Step-Level Recovery
If a step fails after all retries:

| Step | Recovery Action |
|------|----------------|
| Ingest | Skip failed leagues, continue with successful ones. If ALL leagues fail, abort pipeline. |
| Research | Skip failed matches, continue with researched ones. If <50% researched, abort. |
| Predict | Fall back to statistical-only predictions (no signals). Never skip — predictions are required. |
| Report | Generate minimal report with available data. Never abort for report failure. |
| Evaluate | Mark as partial, can be re-run. Never abort for evaluate failure. |

### Pipeline State Tracking
After each step, write `data/gameweeks/{season}/GW{n}/_pipeline-state.json`:
```json
{
  "gameweek": "GW25",
  "season": "2024-25",
  "mode": "predict",
  "steps": [
    { "name": "ingest", "status": "completed", "startedAt": "...", "completedAt": "...", "retries": 0 },
    { "name": "research", "status": "completed", "startedAt": "...", "completedAt": "...", "retries": 1 },
    { "name": "predict", "status": "running", "startedAt": "...", "retries": 0 },
    { "name": "report", "status": "pending" }
  ],
  "errors": [
    { "step": "research", "attempt": 1, "error": "WebSearch rate limited", "recoveredBy": "retry" }
  ],
  "startedAt": "...",
  "completedAt": null
}
```

### Resume Capability
If the pipeline is interrupted:
1. Read `_pipeline-state.json` to find last completed step
2. Resume from the next pending step
3. Don't re-run completed steps unless `--force` is used

### Health Check (before starting)
Before running the pipeline, verify:
- [ ] `SPORTMONKS_API_TOKEN` is set and valid (test with a simple API call)
- [ ] `data/config/leagues.json` exists and has leagues
- [ ] `data/memory/` directory exists with required files
- [ ] Previous gameweek pipeline is complete (no stuck "running" state older than 24h)
- [ ] For evaluate mode: `npm run sync-results` runs successfully before evaluation
- [ ] Optionally: `npm run sync-standings` to refresh league table data in DB

If health check fails:
- Log the specific failure
- Attempt auto-fix if possible (e.g., create missing directories/files)
- Abort if critical (missing API token, no leagues)

## Git Commit Strategy
After each major step:
```bash
git add data/gameweeks/{season}/GW{n}/
git add data/memory/
git add data/config/
git commit -m "Pipeline: {step} complete for GW{n} ({season})"
```

After full pipeline:
```bash
git push
```

## Output
- All gameweek data files
- Updated memory files
- `_pipeline-state.json` — pipeline execution state
- Git commits for each step
