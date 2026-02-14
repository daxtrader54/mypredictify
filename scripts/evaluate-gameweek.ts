#!/usr/bin/env npx tsx
/**
 * Evaluate Gameweek — compare predictions vs results
 * Usage: npx tsx scripts/evaluate-gameweek.ts --gameweek GW25 --season 2025-26
 *
 * Produces evaluation.json with per-match metrics and summary statistics.
 * Pure analysis — does NOT mutate any memory files.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(__dirname, '..');

interface Prediction {
  fixtureId: number;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  predictedScore: string;
  prediction: string; // "H", "D", "A"
  confidence: number;
  modelComponents?: {
    elo?: { H: number; D: number; A: number };
    poisson?: { H: number; D: number; A: number };
    odds?: { H: number; D: number; A: number } | null;
  };
}

interface Result {
  fixtureId: number;
  homeGoals: number;
  awayGoals: number;
  status: string;
}

interface MatchEvaluation {
  fixtureId: number;
  league: string;
  homeTeam: string;
  awayTeam: string;
  predicted: string;
  actual: string;
  correct: boolean;
  predictedScore: string;
  actualScore: string;
  scoreCorrect: boolean;
  logLoss: number;
  brierScore: number;
  confidence: number;
  probs: { H: number; D: number; A: number };
  modelComponentAccuracy: {
    elo: boolean;
    poisson: boolean;
    odds: boolean | null;
  };
}

function deriveOutcome(homeGoals: number, awayGoals: number): string {
  if (homeGoals > awayGoals) return 'H';
  if (awayGoals > homeGoals) return 'A';
  return 'D';
}

function logLoss(prob: number): number {
  const clamped = Math.max(Math.min(prob, 0.999), 0.001);
  return -Math.log(clamped);
}

function brierScore(probs: { H: number; D: number; A: number }, actual: string): number {
  const outcomes = { H: 0, D: 0, A: 0 };
  outcomes[actual as keyof typeof outcomes] = 1;
  return (
    Math.pow(probs.H - outcomes.H, 2) +
    Math.pow(probs.D - outcomes.D, 2) +
    Math.pow(probs.A - outcomes.A, 2)
  );
}

function componentPrediction(probs: { H: number; D: number; A: number }): string {
  if (probs.H >= probs.D && probs.H >= probs.A) return 'H';
  if (probs.A >= probs.H && probs.A >= probs.D) return 'A';
  return 'D';
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
  console.error('Usage: npx tsx scripts/evaluate-gameweek.ts --gameweek GW25 [--season 2025-26]');
  process.exit(1);
}

const gwDir = resolve(root, 'data', 'gameweeks', season, gameweek);
const predictionsPath = resolve(gwDir, 'predictions.json');
const resultsPath = resolve(gwDir, 'results.json');
const evaluationPath = resolve(gwDir, 'evaluation.json');

if (!existsSync(predictionsPath)) {
  console.error(`predictions.json not found: ${predictionsPath}`);
  process.exit(1);
}
if (!existsSync(resultsPath)) {
  console.error(`results.json not found: ${resultsPath}`);
  process.exit(1);
}

const predictions: Prediction[] = JSON.parse(readFileSync(predictionsPath, 'utf-8'));
const results: Result[] = JSON.parse(readFileSync(resultsPath, 'utf-8'));

const resultsMap = new Map<number, Result>();
for (const r of results) {
  if (r.status === 'finished') {
    resultsMap.set(r.fixtureId, r);
  }
}

const matchEvaluations: MatchEvaluation[] = [];
let totalLogLoss = 0;
let totalBrier = 0;
let correctOutcomes = 0;
let correctScores = 0;
let matched = 0;

// Per-component tracking
let eloCorrect = 0, eloTotal = 0;
let poissonCorrect = 0, poissonTotal = 0;
let oddsCorrect = 0, oddsTotal = 0;

// Per-league tracking
const leagueStats: Record<string, { correct: number; total: number; logLoss: number; brier: number }> = {};

// Calibration bins
const calibrationBins: Record<string, { predicted: number; actual: number; count: number }> = {
  '0.0-0.2': { predicted: 0, actual: 0, count: 0 },
  '0.2-0.4': { predicted: 0, actual: 0, count: 0 },
  '0.4-0.6': { predicted: 0, actual: 0, count: 0 },
  '0.6-0.8': { predicted: 0, actual: 0, count: 0 },
  '0.8-1.0': { predicted: 0, actual: 0, count: 0 },
};

for (const pred of predictions) {
  const result = resultsMap.get(pred.fixtureId);
  if (!result) continue;

  matched++;
  const actual = deriveOutcome(result.homeGoals, result.awayGoals);
  const actualScore = `${result.homeGoals}-${result.awayGoals}`;
  const probs = { H: pred.homeWinProb, D: pred.drawProb, A: pred.awayWinProb };

  const isCorrect = pred.prediction === actual;
  const isScoreCorrect = pred.predictedScore === actualScore;

  const matchLogLoss = logLoss(probs[actual as keyof typeof probs]);
  const matchBrier = brierScore(probs, actual);

  if (isCorrect) correctOutcomes++;
  if (isScoreCorrect) correctScores++;
  totalLogLoss += matchLogLoss;
  totalBrier += matchBrier;

  // Model component accuracy
  let eloIsCorrect = false;
  let poissonIsCorrect = false;
  let oddsIsCorrectResult: boolean | null = null;

  if (pred.modelComponents?.elo) {
    const eloPred = componentPrediction(pred.modelComponents.elo);
    eloIsCorrect = eloPred === actual;
    eloCorrect += eloIsCorrect ? 1 : 0;
    eloTotal++;
  }
  if (pred.modelComponents?.poisson) {
    const poissonPred = componentPrediction(pred.modelComponents.poisson);
    poissonIsCorrect = poissonPred === actual;
    poissonCorrect += poissonIsCorrect ? 1 : 0;
    poissonTotal++;
  }
  if (pred.modelComponents?.odds) {
    const oddsPred = componentPrediction(pred.modelComponents.odds);
    oddsIsCorrectResult = oddsPred === actual;
    oddsCorrect += oddsIsCorrectResult ? 1 : 0;
    oddsTotal++;
  }

  // Per-league
  if (!leagueStats[pred.league]) {
    leagueStats[pred.league] = { correct: 0, total: 0, logLoss: 0, brier: 0 };
  }
  leagueStats[pred.league].total++;
  if (isCorrect) leagueStats[pred.league].correct++;
  leagueStats[pred.league].logLoss += matchLogLoss;
  leagueStats[pred.league].brier += matchBrier;

  // Calibration
  const conf = pred.confidence;
  let bin: string;
  if (conf < 0.2) bin = '0.0-0.2';
  else if (conf < 0.4) bin = '0.2-0.4';
  else if (conf < 0.6) bin = '0.4-0.6';
  else if (conf < 0.8) bin = '0.6-0.8';
  else bin = '0.8-1.0';

  calibrationBins[bin].predicted += conf;
  calibrationBins[bin].actual += isCorrect ? 1 : 0;
  calibrationBins[bin].count++;

  matchEvaluations.push({
    fixtureId: pred.fixtureId,
    league: pred.league,
    homeTeam: pred.homeTeam,
    awayTeam: pred.awayTeam,
    predicted: pred.prediction,
    actual,
    correct: isCorrect,
    predictedScore: pred.predictedScore,
    actualScore,
    scoreCorrect: isScoreCorrect,
    logLoss: Math.round(matchLogLoss * 10000) / 10000,
    brierScore: Math.round(matchBrier * 10000) / 10000,
    confidence: pred.confidence,
    probs,
    modelComponentAccuracy: {
      elo: eloIsCorrect,
      poisson: poissonIsCorrect,
      odds: oddsIsCorrectResult,
    },
  });
}

// Calibration averages
const calibration: Record<string, { avgPredicted: number; avgActual: number; count: number }> = {};
for (const [bin, data] of Object.entries(calibrationBins)) {
  calibration[bin] = {
    avgPredicted: data.count > 0 ? Math.round((data.predicted / data.count) * 1000) / 1000 : 0,
    avgActual: data.count > 0 ? Math.round((data.actual / data.count) * 1000) / 1000 : 0,
    count: data.count,
  };
}

// Per-league summaries
const leagueSummaries: Record<string, { accuracy: number; avgLogLoss: number; avgBrier: number; total: number }> = {};
for (const [league, stats] of Object.entries(leagueStats)) {
  leagueSummaries[league] = {
    accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 1000) / 1000 : 0,
    avgLogLoss: stats.total > 0 ? Math.round((stats.logLoss / stats.total) * 10000) / 10000 : 0,
    avgBrier: stats.total > 0 ? Math.round((stats.brier / stats.total) * 10000) / 10000 : 0,
    total: stats.total,
  };
}

const evaluation = {
  gameweek,
  season,
  evaluatedAt: new Date().toISOString(),
  summary: {
    totalPredictions: predictions.length,
    matchedWithResults: matched,
    outcomeAccuracy: matched > 0 ? Math.round((correctOutcomes / matched) * 1000) / 1000 : 0,
    scoreAccuracy: matched > 0 ? Math.round((correctScores / matched) * 1000) / 1000 : 0,
    avgLogLoss: matched > 0 ? Math.round((totalLogLoss / matched) * 10000) / 10000 : 0,
    avgBrierScore: matched > 0 ? Math.round((totalBrier / matched) * 10000) / 10000 : 0,
    correctOutcomes,
    correctScores,
  },
  modelComponentAccuracy: {
    elo: eloTotal > 0 ? Math.round((eloCorrect / eloTotal) * 1000) / 1000 : null,
    poisson: poissonTotal > 0 ? Math.round((poissonCorrect / poissonTotal) * 1000) / 1000 : null,
    odds: oddsTotal > 0 ? Math.round((oddsCorrect / oddsTotal) * 1000) / 1000 : null,
  },
  leagueSummaries,
  calibration,
  matches: matchEvaluations,
};

writeFileSync(evaluationPath, JSON.stringify(evaluation, null, 2));
console.log(`Evaluation written to ${evaluationPath}`);
console.log(`\nSummary for ${gameweek}:`);
console.log(`  Matched: ${matched}/${predictions.length} predictions`);
console.log(`  Outcome accuracy: ${(evaluation.summary.outcomeAccuracy * 100).toFixed(1)}% (${correctOutcomes}/${matched})`);
console.log(`  Score accuracy: ${(evaluation.summary.scoreAccuracy * 100).toFixed(1)}% (${correctScores}/${matched})`);
console.log(`  Avg log-loss: ${evaluation.summary.avgLogLoss}`);
console.log(`  Avg Brier score: ${evaluation.summary.avgBrierScore}`);
console.log(`\nModel component accuracy:`);
console.log(`  Elo: ${evaluation.modelComponentAccuracy.elo !== null ? (evaluation.modelComponentAccuracy.elo * 100).toFixed(1) + '%' : 'N/A'}`);
console.log(`  Poisson: ${evaluation.modelComponentAccuracy.poisson !== null ? (evaluation.modelComponentAccuracy.poisson * 100).toFixed(1) + '%' : 'N/A'}`);
console.log(`  Odds: ${evaluation.modelComponentAccuracy.odds !== null ? (evaluation.modelComponentAccuracy.odds * 100).toFixed(1) + '%' : 'N/A'}`);
console.log(`\nPer-league accuracy:`);
for (const [league, stats] of Object.entries(leagueSummaries)) {
  console.log(`  ${league}: ${(stats.accuracy * 100).toFixed(1)}% (${stats.total} matches)`);
}
