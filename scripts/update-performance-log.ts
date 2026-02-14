#!/usr/bin/env npx tsx
/**
 * Update Performance Log — append GW evaluation summary to cumulative log
 * Usage: npx tsx scripts/update-performance-log.ts --gameweek GW25 --season 2025-26
 *
 * Reads evaluation.json, appends to data/memory/performance-log.json.
 * Recomputes cumulative running averages.
 * Idempotent: skips if GW already logged.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(__dirname, '..');
const PERF_LOG_FILE = resolve(root, 'data', 'memory', 'performance-log.json');

interface Evaluation {
  gameweek: string;
  season: string;
  evaluatedAt: string;
  summary: {
    totalPredictions: number;
    matchedWithResults: number;
    outcomeAccuracy: number;
    scoreAccuracy: number;
    avgLogLoss: number;
    avgBrierScore: number;
    correctOutcomes: number;
    correctScores: number;
  };
  modelComponentAccuracy: {
    elo: number | null;
    poisson: number | null;
    odds: number | null;
  };
  leagueSummaries: Record<string, { accuracy: number; avgLogLoss: number; avgBrier: number; total: number }>;
}

interface GWEntry {
  gameweek: string;
  season: string;
  evaluatedAt: string;
  matchesEvaluated: number;
  outcomeAccuracy: number;
  scoreAccuracy: number;
  avgLogLoss: number;
  avgBrierScore: number;
  modelComponentAccuracy: {
    elo: number | null;
    poisson: number | null;
    odds: number | null;
  };
  leagueAccuracy: Record<string, number>;
}

interface PerformanceLog {
  gameweeks: GWEntry[];
  cumulative: {
    totalPredictions: number;
    correctOutcomes: number;
    correctScores: number;
    avgLogLoss: number | null;
    avgBrierScore: number | null;
    outcomeAccuracy: number | null;
    scoreAccuracy: number | null;
    modelComponentAccuracy: {
      elo: number | null;
      poisson: number | null;
      odds: number | null;
    };
  };
}

function parseArgs(args: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
      parsed[key] = value;
      if (value !== 'true') i++;
    }
  }
  return parsed;
}

// Main
const args = parseArgs(process.argv.slice(2));
const gameweek = args.gameweek || args.gw;
const season = args.season || process.env.SEASON || '2025-26';

if (!gameweek) {
  console.error('Usage: npx tsx scripts/update-performance-log.ts --gameweek GW25 [--season 2025-26]');
  process.exit(1);
}

const evaluationPath = resolve(root, 'data', 'gameweeks', season, gameweek, 'evaluation.json');
if (!existsSync(evaluationPath)) {
  console.error(`evaluation.json not found: ${evaluationPath}. Run evaluate-gameweek.ts first.`);
  process.exit(1);
}

const evaluation: Evaluation = JSON.parse(readFileSync(evaluationPath, 'utf-8'));

// Load existing performance log
const perfLog: PerformanceLog = existsSync(PERF_LOG_FILE)
  ? JSON.parse(readFileSync(PERF_LOG_FILE, 'utf-8'))
  : {
      gameweeks: [],
      cumulative: {
        totalPredictions: 0,
        correctOutcomes: 0,
        correctScores: 0,
        avgLogLoss: null,
        avgBrierScore: null,
        outcomeAccuracy: null,
        scoreAccuracy: null,
        modelComponentAccuracy: { elo: null, poisson: null, odds: null },
      },
    };

// Idempotency check
const alreadyLogged = perfLog.gameweeks.some(
  (gw) => gw.gameweek === gameweek && gw.season === season
);
if (alreadyLogged) {
  console.log(`${gameweek} (${season}) already in performance log. Skipping.`);
  process.exit(0);
}

// Build league accuracy map
const leagueAccuracy: Record<string, number> = {};
for (const [league, stats] of Object.entries(evaluation.leagueSummaries)) {
  leagueAccuracy[league] = stats.accuracy;
}

// Add GW entry
const gwEntry: GWEntry = {
  gameweek,
  season,
  evaluatedAt: evaluation.evaluatedAt,
  matchesEvaluated: evaluation.summary.matchedWithResults,
  outcomeAccuracy: evaluation.summary.outcomeAccuracy,
  scoreAccuracy: evaluation.summary.scoreAccuracy,
  avgLogLoss: evaluation.summary.avgLogLoss,
  avgBrierScore: evaluation.summary.avgBrierScore,
  modelComponentAccuracy: evaluation.modelComponentAccuracy,
  leagueAccuracy,
};

perfLog.gameweeks.push(gwEntry);

// Recompute cumulative averages from all GW entries
let totalPreds = 0;
let totalCorrectOutcomes = 0;
let totalCorrectScores = 0;
let totalLogLoss = 0;
let totalBrier = 0;
let eloSum = 0, eloCount = 0;
let poissonSum = 0, poissonCount = 0;
let oddsSum = 0, oddsCount = 0;

for (const gw of perfLog.gameweeks) {
  totalPreds += gw.matchesEvaluated;
  totalCorrectOutcomes += Math.round(gw.outcomeAccuracy * gw.matchesEvaluated);
  totalCorrectScores += Math.round(gw.scoreAccuracy * gw.matchesEvaluated);
  totalLogLoss += gw.avgLogLoss * gw.matchesEvaluated;
  totalBrier += gw.avgBrierScore * gw.matchesEvaluated;

  if (gw.modelComponentAccuracy.elo !== null) {
    eloSum += gw.modelComponentAccuracy.elo * gw.matchesEvaluated;
    eloCount += gw.matchesEvaluated;
  }
  if (gw.modelComponentAccuracy.poisson !== null) {
    poissonSum += gw.modelComponentAccuracy.poisson * gw.matchesEvaluated;
    poissonCount += gw.matchesEvaluated;
  }
  if (gw.modelComponentAccuracy.odds !== null) {
    oddsSum += gw.modelComponentAccuracy.odds * gw.matchesEvaluated;
    oddsCount += gw.matchesEvaluated;
  }
}

perfLog.cumulative = {
  totalPredictions: totalPreds,
  correctOutcomes: totalCorrectOutcomes,
  correctScores: totalCorrectScores,
  avgLogLoss: totalPreds > 0 ? Math.round((totalLogLoss / totalPreds) * 10000) / 10000 : null,
  avgBrierScore: totalPreds > 0 ? Math.round((totalBrier / totalPreds) * 10000) / 10000 : null,
  outcomeAccuracy: totalPreds > 0 ? Math.round((totalCorrectOutcomes / totalPreds) * 1000) / 1000 : null,
  scoreAccuracy: totalPreds > 0 ? Math.round((totalCorrectScores / totalPreds) * 1000) / 1000 : null,
  modelComponentAccuracy: {
    elo: eloCount > 0 ? Math.round((eloSum / eloCount) * 1000) / 1000 : null,
    poisson: poissonCount > 0 ? Math.round((poissonSum / poissonCount) * 1000) / 1000 : null,
    odds: oddsCount > 0 ? Math.round((oddsSum / oddsCount) * 1000) / 1000 : null,
  },
};

writeFileSync(PERF_LOG_FILE, JSON.stringify(perfLog, null, 2));
console.log(`Performance log updated with ${gameweek} (${season})`);
console.log(`Cumulative: ${perfLog.gameweeks.length} gameweeks, ${totalPreds} predictions`);
console.log(`  Outcome accuracy: ${perfLog.cumulative.outcomeAccuracy !== null ? (perfLog.cumulative.outcomeAccuracy * 100).toFixed(1) + '%' : 'N/A'}`);
console.log(`  Score accuracy: ${perfLog.cumulative.scoreAccuracy !== null ? (perfLog.cumulative.scoreAccuracy * 100).toFixed(1) + '%' : 'N/A'}`);
console.log(`  Avg log-loss: ${perfLog.cumulative.avgLogLoss ?? 'N/A'}`);
console.log(`  Avg Brier: ${perfLog.cumulative.avgBrierScore ?? 'N/A'}`);
