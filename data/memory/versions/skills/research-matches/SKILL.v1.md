# /research-matches

Analyze each match in a gameweek using 5 signal types to produce structured research data.

## Usage
```
/research-matches [--gameweek GW25] [--season 2024-25]
```

Defaults: latest ingested gameweek (most recent directory in `data/gameweeks/`).

## Prerequisites
- `matches.json` must exist for the target gameweek (run `/ingest-gameweek` first)
- Read `data/memory/heuristics.md` for any learned patterns to inform analysis

## Steps

### 1. Load Match Data
- Read `data/gameweeks/{season}/GW{n}/matches.json`
- Read `data/config/pipeline.json` for signal weights

### 2. For Each Match, Generate 5 Signals

#### Signal 1: Form Analysis
- Read last 5 match results from the match snapshot (homeForm/awayForm)
- Assess: form trajectory, scoring patterns, home/away splits, quality of opposition
- Output `formSignal`:
```json
{
  "type": "form",
  "homeRating": 72,
  "awayRating": 58,
  "homeAdvantage": 0.15,
  "goalExpectation": { "home": 1.8, "away": 1.1 },
  "keyFactors": ["Arsenal 4W1D in last 5 home", "Chelsea 1W2D2L away"],
  "riskFlags": [],
  "confidence": 0.75,
  "reasoning": "..."
}
```

#### Signal 2: Squad Analysis
- Use WebSearch for "{team} injury news {date}" and "{team} squad news"
- Identify key absences, returning players, suspensions
- Output `squadSignal`:
```json
{
  "type": "squad",
  "homeStrength": 0.85,
  "awayStrength": 0.70,
  "homeAdvantage": 0.08,
  "goalExpectation": { "home": 0, "away": -0.2 },
  "keyFactors": ["Chelsea missing Reece James (knee)", "Arsenal full strength"],
  "riskFlags": ["Chelsea defensive crisis - 3 CBs out"],
  "confidence": 0.65,
  "reasoning": "..."
}
```

#### Signal 3: Tactical Analysis
- Read team stats from match snapshot (possession, shots, passing)
- Assess style matchup, formation trends, pressing intensity
- Use H2H patterns for tactical context
- Output `tacticalSignal`:
```json
{
  "type": "tactical",
  "mismatch": "Arsenal high press vs Chelsea's buildup vulnerabilities",
  "homeAdvantage": 0.05,
  "goalExpectation": { "home": 0.1, "away": -0.1 },
  "keyFactors": ["Arsenal press won ball in final third 8x last match"],
  "riskFlags": [],
  "confidence": 0.60,
  "reasoning": "..."
}
```

#### Signal 4: Market Analysis
- Convert odds from match snapshot to implied probabilities
- Compare with form-based expectations
- Flag any significant discrepancies as potential value
- Output `marketSignal`:
```json
{
  "type": "market",
  "impliedProbs": { "home": 0.55, "draw": 0.25, "away": 0.20 },
  "homeAdvantage": 0,
  "goalExpectation": { "home": 0, "away": 0 },
  "keyFactors": ["Market prices Arsenal at 55%, in line with form"],
  "riskFlags": [],
  "valueFlags": [],
  "confidence": 0.80,
  "reasoning": "..."
}
```

#### Signal 5: Narrative Analysis
- WebSearch for match previews, managerial pressure, motivation factors
- Search: "{homeTeam} vs {awayTeam} preview {date}"
- Assess: derby significance, cup hangover, relegation battle, title race implications
- Output `narrativeSignal`:
```json
{
  "type": "narrative",
  "homeMotivation": 0.85,
  "awayMotivation": 0.60,
  "homeAdvantage": 0.05,
  "goalExpectation": { "home": 0, "away": 0 },
  "keyFactors": ["London derby", "Arsenal pushing for title"],
  "riskFlags": ["Chelsea manager under pressure - unpredictable"],
  "confidence": 0.50,
  "reasoning": "..."
}
```

### 3. Write Research Data
Write `data/gameweeks/{season}/GW{n}/research.json`:
```json
[{
  "fixtureId": 12345,
  "homeTeam": "Arsenal",
  "awayTeam": "Chelsea",
  "signals": {
    "form": { ... },
    "squad": { ... },
    "tactical": { ... },
    "market": { ... },
    "narrative": { ... }
  },
  "researchedAt": "2025-02-13T10:30:00Z"
}]
```

### 4. Error Handling & Self-Healing
- If WebSearch fails for squad/narrative signals, fall back to data-only analysis
  - Set confidence lower (0.3) and add riskFlag: "limited data - web search failed"
- If a signal generation fails entirely, write a minimal signal with confidence: 0.1
  - Add to `_research-log.json`: which signals failed and why
- Track timing per signal type for performance monitoring
- If >50% of matches fail research, halt and report error (don't write partial research.json)

### Output
- `data/gameweeks/{season}/GW{n}/research.json` — 5 signals per match
- `data/gameweeks/{season}/GW{n}/_research-log.json` — timing, errors, coverage
