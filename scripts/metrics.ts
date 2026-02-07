#!/usr/bin/env npx tsx
/**
 * Evaluation Metrics Calculator
 * Usage: npx tsx scripts/metrics.ts evaluate --predictions <path> --results <path>
 *
 * Calculates: log-loss, Brier score, outcome accuracy, score accuracy, calibration
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

interface Prediction {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  predictedScore: string;
  prediction: string; // "H", "D", "A"
  confidence: number;
}

interface Result {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  outcome: string; // "H", "D", "A"
}

interface MatchMetrics {
  fixtureId: number;
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
}

function logLoss(prob: number): number {
  // Clamp to avoid log(0)
  const clampedProb = Math.max(Math.min(prob, 0.999), 0.001);
  return -Math.log(clampedProb);
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

function evaluate(predictionsPath: string, resultsPath: string) {
  const predictions: Prediction[] = JSON.parse(readFileSync(resolve(predictionsPath), 'utf-8'));
  const results: Result[] = JSON.parse(readFileSync(resolve(resultsPath), 'utf-8'));

  const resultsMap = new Map<number, Result>();
  for (const r of results) {
    resultsMap.set(r.fixtureId, r);
  }

  const matchMetrics: MatchMetrics[] = [];
  let totalLogLoss = 0;
  let totalBrier = 0;
  let correctOutcomes = 0;
  let correctScores = 0;
  let matched = 0;

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

    const probs = { H: pred.homeWinProb, D: pred.drawProb, A: pred.awayWinProb };
    const actual = result.outcome;
    const predicted = pred.prediction;

    const isCorrect = predicted === actual;
    const actualScore = `${result.homeGoals}-${result.awayGoals}`;
    const isScoreCorrect = pred.predictedScore === actualScore;

    const matchLogLoss = logLoss(probs[actual as keyof typeof probs]);
    const matchBrier = brierScore(probs, actual);

    if (isCorrect) correctOutcomes++;
    if (isScoreCorrect) correctScores++;
    totalLogLoss += matchLogLoss;
    totalBrier += matchBrier;

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

    matchMetrics.push({
      fixtureId: pred.fixtureId,
      homeTeam: pred.homeTeam,
      awayTeam: pred.awayTeam,
      predicted,
      actual,
      correct: isCorrect,
      predictedScore: pred.predictedScore,
      actualScore,
      scoreCorrect: isScoreCorrect,
      logLoss: Math.round(matchLogLoss * 10000) / 10000,
      brierScore: Math.round(matchBrier * 10000) / 10000,
      confidence: pred.confidence,
      probs,
    });
  }

  // Compute calibration averages
  const calibration: Record<string, { avgPredicted: number; avgActual: number; count: number }> = {};
  for (const [bin, data] of Object.entries(calibrationBins)) {
    calibration[bin] = {
      avgPredicted: data.count > 0 ? Math.round((data.predicted / data.count) * 1000) / 1000 : 0,
      avgActual: data.count > 0 ? Math.round((data.actual / data.count) * 1000) / 1000 : 0,
      count: data.count,
    };
  }

  const output = {
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
    calibration,
    matches: matchMetrics,
  };

  console.log(JSON.stringify(output, null, 2));
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
const [command, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);

if (command !== 'evaluate') {
  console.error(`Usage: npx tsx scripts/metrics.ts evaluate --predictions <path> --results <path>`);
  process.exit(1);
}

const predictionsPath = args.predictions;
const resultsPath = args.results;

if (!predictionsPath || !resultsPath) {
  console.error('Error: --predictions <path> and --results <path> are required');
  process.exit(1);
}

evaluate(predictionsPath, resultsPath);
