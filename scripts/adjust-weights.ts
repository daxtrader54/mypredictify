#!/usr/bin/env npx tsx
/**
 * Adjust Model Weights — tune Elo/Poisson/Odds blend weights based on accuracy
 * Usage: npx tsx scripts/adjust-weights.ts [--window 5] [--season 2025-26]
 *
 * Core learning algorithm:
 * - Scans last N evaluation.json files (default window=5)
 * - Calculates rolling average accuracy per model component (elo, poisson, odds)
 * - Adjusts weights: delta = (component_accuracy - overall_avg) * 0.5, clamped ±2%
 * - Normalizes to sum = 1.0
 * - Updates data/memory/signal-weights.json with new modelWeights
 *
 * Requires at least 2 evaluated gameweeks to run.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';

const root = resolve(__dirname, '..');
const WEIGHTS_FILE = resolve(root, 'data', 'memory', 'signal-weights.json');
const CHANGELOG_FILE = resolve(root, 'data', 'memory', 'changelog.json');

interface Evaluation {
  gameweek: string;
  season: string;
  summary: { outcomeAccuracy: number; matchedWithResults: number };
  modelComponentAccuracy: {
    elo: number | null;
    poisson: number | null;
    odds: number | null;
  };
}

interface SignalWeights {
  weights: Record<string, number>;
  modelWeights?: {
    elo: number;
    poisson: number;
    odds: number;
    lastAdjusted: string;
    adjustmentHistory: Array<{
      timestamp: string;
      gameweeksUsed: string[];
      oldWeights: { elo: number; poisson: number; odds: number };
      newWeights: { elo: number; poisson: number; odds: number };
      componentAccuracies: { elo: number | null; poisson: number | null; odds: number | null };
      reason: string;
    }>;
  };
  history: unknown[];
  lastUpdated: string | null;
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
const season = args.season || process.env.SEASON || '2025-26';
const windowSize = parseInt(args.window || '5', 10);

// Scan for evaluation.json files
const gwBaseDir = resolve(root, 'data', 'gameweeks', season);
if (!existsSync(gwBaseDir)) {
  console.error(`Gameweek directory not found: ${gwBaseDir}`);
  process.exit(1);
}

const gwDirs = readdirSync(gwBaseDir)
  .filter((d) => d.startsWith('GW'))
  .sort((a, b) => {
    const numA = parseInt(a.replace('GW', ''), 10);
    const numB = parseInt(b.replace('GW', ''), 10);
    return numA - numB;
  });

// Load evaluations that exist
const evaluations: Evaluation[] = [];
for (const dir of gwDirs) {
  const evalPath = resolve(gwBaseDir, dir, 'evaluation.json');
  if (existsSync(evalPath)) {
    evaluations.push(JSON.parse(readFileSync(evalPath, 'utf-8')));
  }
}

if (evaluations.length < 2) {
  console.log(`Need at least 2 evaluated gameweeks to adjust weights. Found: ${evaluations.length}`);
  console.log('Run evaluate-gameweek.ts on more gameweeks first.');
  process.exit(0);
}

// Use the most recent N evaluations (within window)
const recent = evaluations.slice(-windowSize);
console.log(`Using ${recent.length} gameweeks for weight adjustment: ${recent.map((e) => e.gameweek).join(', ')}`);

// Compute weighted average accuracy per component (weighted by number of matches)
let eloWeightedSum = 0, eloWeightedCount = 0;
let poissonWeightedSum = 0, poissonWeightedCount = 0;
let oddsWeightedSum = 0, oddsWeightedCount = 0;
let overallWeightedSum = 0, overallWeightedCount = 0;

for (const ev of recent) {
  const n = ev.summary.matchedWithResults;
  overallWeightedSum += ev.summary.outcomeAccuracy * n;
  overallWeightedCount += n;

  if (ev.modelComponentAccuracy.elo !== null) {
    eloWeightedSum += ev.modelComponentAccuracy.elo * n;
    eloWeightedCount += n;
  }
  if (ev.modelComponentAccuracy.poisson !== null) {
    poissonWeightedSum += ev.modelComponentAccuracy.poisson * n;
    poissonWeightedCount += n;
  }
  if (ev.modelComponentAccuracy.odds !== null) {
    oddsWeightedSum += ev.modelComponentAccuracy.odds * n;
    oddsWeightedCount += n;
  }
}

const overallAvg = overallWeightedCount > 0 ? overallWeightedSum / overallWeightedCount : 0;
const eloAvg = eloWeightedCount > 0 ? eloWeightedSum / eloWeightedCount : null;
const poissonAvg = poissonWeightedCount > 0 ? poissonWeightedSum / poissonWeightedCount : null;
const oddsAvg = oddsWeightedCount > 0 ? oddsWeightedSum / oddsWeightedCount : null;

console.log(`\nComponent accuracies (rolling ${recent.length}-GW average):`);
console.log(`  Overall: ${(overallAvg * 100).toFixed(1)}%`);
console.log(`  Elo: ${eloAvg !== null ? (eloAvg * 100).toFixed(1) + '%' : 'N/A'}`);
console.log(`  Poisson: ${poissonAvg !== null ? (poissonAvg * 100).toFixed(1) + '%' : 'N/A'}`);
console.log(`  Odds: ${oddsAvg !== null ? (oddsAvg * 100).toFixed(1) + '%' : 'N/A'}`);

// Load current weights
const weightsData: SignalWeights = existsSync(WEIGHTS_FILE)
  ? JSON.parse(readFileSync(WEIGHTS_FILE, 'utf-8'))
  : { weights: {}, history: [], lastUpdated: null };

// Current model weights (defaults: 30/30/40)
const currentWeights = weightsData.modelWeights || {
  elo: 0.3,
  poisson: 0.3,
  odds: 0.4,
  lastAdjusted: null as string | null,
  adjustmentHistory: [] as SignalWeights['modelWeights'] extends { adjustmentHistory: infer T } ? T : never[],
};

const oldWeights = { elo: currentWeights.elo, poisson: currentWeights.poisson, odds: currentWeights.odds };

// Calculate adjustments
const MAX_DELTA = 0.02; // ±2% max per cycle
const reasons: string[] = [];

function computeAdjustment(componentAvg: number | null, componentName: string): number {
  if (componentAvg === null) return 0;
  const delta = (componentAvg - overallAvg) * 0.5;
  const clamped = Math.max(-MAX_DELTA, Math.min(MAX_DELTA, delta));
  if (Math.abs(clamped) > 0.001) {
    const dir = clamped > 0 ? 'above' : 'below';
    reasons.push(
      `${componentName} accuracy ${(componentAvg * 100).toFixed(1)}% is ${dir} average (${(overallAvg * 100).toFixed(1)}%), adjusting by ${(clamped * 100).toFixed(2)}%`
    );
  }
  return clamped;
}

const eloAdj = computeAdjustment(eloAvg, 'Elo');
const poissonAdj = computeAdjustment(poissonAvg, 'Poisson');
const oddsAdj = computeAdjustment(oddsAvg, 'Odds');

// Apply adjustments
let newElo = currentWeights.elo + eloAdj;
let newPoisson = currentWeights.poisson + poissonAdj;
let newOdds = currentWeights.odds + oddsAdj;

// Clamp to reasonable range (each component 5%-70%)
newElo = Math.max(0.05, Math.min(0.70, newElo));
newPoisson = Math.max(0.05, Math.min(0.70, newPoisson));
newOdds = Math.max(0.05, Math.min(0.70, newOdds));

// Normalize to sum = 1.0
const total = newElo + newPoisson + newOdds;
newElo = Math.round((newElo / total) * 1000) / 1000;
newPoisson = Math.round((newPoisson / total) * 1000) / 1000;
newOdds = Math.round((1 - newElo - newPoisson) * 1000) / 1000; // ensure exact sum

const newWeights = { elo: newElo, poisson: newPoisson, odds: newOdds };

console.log(`\nWeight adjustments:`);
console.log(`  Elo: ${(oldWeights.elo * 100).toFixed(1)}% → ${(newWeights.elo * 100).toFixed(1)}%`);
console.log(`  Poisson: ${(oldWeights.poisson * 100).toFixed(1)}% → ${(newWeights.poisson * 100).toFixed(1)}%`);
console.log(`  Odds: ${(oldWeights.odds * 100).toFixed(1)}% → ${(newWeights.odds * 100).toFixed(1)}%`);

const adjustmentEntry = {
  timestamp: new Date().toISOString(),
  gameweeksUsed: recent.map((e) => e.gameweek),
  oldWeights,
  newWeights,
  componentAccuracies: { elo: eloAvg, poisson: poissonAvg, odds: oddsAvg },
  reason: reasons.length > 0 ? reasons.join('; ') : 'No significant accuracy differences detected',
};

// Update weights file
weightsData.modelWeights = {
  ...newWeights,
  lastAdjusted: new Date().toISOString(),
  adjustmentHistory: [
    ...(currentWeights.adjustmentHistory || []),
    adjustmentEntry,
  ],
};
weightsData.lastUpdated = new Date().toISOString();

writeFileSync(WEIGHTS_FILE, JSON.stringify(weightsData, null, 2));

// Append to changelog
const changelog: unknown[] = existsSync(CHANGELOG_FILE)
  ? JSON.parse(readFileSync(CHANGELOG_FILE, 'utf-8'))
  : [];

changelog.push({
  timestamp: new Date().toISOString(),
  type: 'weight-adjustment',
  season,
  details: adjustmentEntry,
});

writeFileSync(CHANGELOG_FILE, JSON.stringify(changelog, null, 2));

console.log(`\nWeights saved to signal-weights.json`);
if (reasons.length > 0) {
  console.log('Reasons:');
  for (const r of reasons) console.log(`  - ${r}`);
} else {
  console.log('No significant changes needed — weights unchanged.');
}
