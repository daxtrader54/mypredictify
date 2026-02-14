#!/usr/bin/env npx tsx
/**
 * Update Poisson Calibration — track per-league goal prediction bias
 * Usage: npx tsx scripts/update-poisson-calibration.ts --gameweek GW25 --season 2025-26
 *
 * Compares predicted xG (from matches.json standings data) vs actual goals (from results.json).
 * Writes per-league home/away goal bias to data/memory/poisson-calibration.json.
 * Consumed by generate-predictions.mjs to correct systematic over/under-prediction.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';

const root = resolve(__dirname, '..');
const CALIBRATION_FILE = resolve(root, 'data', 'memory', 'poisson-calibration.json');

interface Match {
  fixtureId: number;
  league: { name: string };
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  standings?: {
    home?: { details?: Array<{ type?: { code: string }; value: number }> };
    away?: { details?: Array<{ type?: { code: string }; value: number }> };
  };
}

interface Result {
  fixtureId: number;
  homeGoals: number;
  awayGoals: number;
  status: string;
}

interface PoissonCalibration {
  lastUpdated: string;
  lastGameweek: string;
  leagues: Record<string, {
    homeBias: number; // predicted - actual (positive = over-predicting)
    awayBias: number;
    homeAvgPredicted: number;
    homeAvgActual: number;
    awayAvgPredicted: number;
    awayAvgActual: number;
    matchesAnalyzed: number;
  }>;
  history: Array<{
    timestamp: string;
    gameweek: string;
    season: string;
    biases: Record<string, { homeBias: number; awayBias: number }>;
  }>;
}

function getStandingValue(details: Array<{ type?: { code: string }; value: number }> | undefined, code: string): number | null {
  if (!details) return null;
  const entry = details.find((d) => d.type?.code === code);
  return entry ? entry.value : null;
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

// Scan all GWs with both matches and results
const gwBaseDir = resolve(root, 'data', 'gameweeks', season);
if (!existsSync(gwBaseDir)) {
  console.error(`Gameweek directory not found: ${gwBaseDir}`);
  process.exit(1);
}

const gwDirs = readdirSync(gwBaseDir)
  .filter((d) => d.startsWith('GW'))
  .sort((a, b) => parseInt(a.replace('GW', ''), 10) - parseInt(b.replace('GW', ''), 10));

// Per-league accumulators
const leagueData: Record<string, {
  homePredicted: number;
  homeActual: number;
  awayPredicted: number;
  awayActual: number;
  count: number;
}> = {};

let latestGW = '';

for (const dir of gwDirs) {
  const matchesPath = resolve(gwBaseDir, dir, 'matches.json');
  const resultsPath = resolve(gwBaseDir, dir, 'results.json');
  if (!existsSync(matchesPath) || !existsSync(resultsPath)) continue;

  const matches: Match[] = JSON.parse(readFileSync(matchesPath, 'utf-8'));
  const results: Result[] = JSON.parse(readFileSync(resultsPath, 'utf-8'));

  const resultsMap = new Map<number, Result>();
  for (const r of results) {
    if (r.status === 'finished') resultsMap.set(r.fixtureId, r);
  }

  latestGW = dir;

  for (const match of matches) {
    const result = resultsMap.get(match.fixtureId);
    if (!result) continue;

    const league = match.league.name;
    if (!leagueData[league]) {
      leagueData[league] = { homePredicted: 0, homeActual: 0, awayPredicted: 0, awayActual: 0, count: 0 };
    }

    // Compute league averages from standings data (same approach as generate-predictions.mjs)
    const homeStandings = match.standings?.home?.details;
    const awayStandings = match.standings?.away?.details;

    const homeGamesPlayed = getStandingValue(homeStandings, 'home-matches-played');
    const homeGoalsScored = getStandingValue(homeStandings, 'home-scored');
    const awayGamesPlayed = getStandingValue(awayStandings, 'away-matches-played');
    const awayGoalsScored = getStandingValue(awayStandings, 'away-scored');

    // If we have standings data, use per-game averages as predicted xG proxy
    if (homeGamesPlayed && homeGamesPlayed > 0 && homeGoalsScored !== null &&
        awayGamesPlayed && awayGamesPlayed > 0 && awayGoalsScored !== null) {
      const predictedHome = homeGoalsScored / homeGamesPlayed;
      const predictedAway = awayGoalsScored / awayGamesPlayed;

      leagueData[league].homePredicted += predictedHome;
      leagueData[league].homeActual += result.homeGoals;
      leagueData[league].awayPredicted += predictedAway;
      leagueData[league].awayActual += result.awayGoals;
      leagueData[league].count++;
    }
  }
}

if (Object.keys(leagueData).length === 0) {
  console.log('No matches with standings data found. Cannot compute Poisson calibration.');
  process.exit(0);
}

// Compute biases
const leagues: PoissonCalibration['leagues'] = {};
const biases: Record<string, { homeBias: number; awayBias: number }> = {};

for (const [league, data] of Object.entries(leagueData)) {
  if (data.count === 0) continue;

  const homeAvgPredicted = data.homePredicted / data.count;
  const homeAvgActual = data.homeActual / data.count;
  const awayAvgPredicted = data.awayPredicted / data.count;
  const awayAvgActual = data.awayActual / data.count;

  const homeBias = Math.round((homeAvgPredicted - homeAvgActual) * 1000) / 1000;
  const awayBias = Math.round((awayAvgPredicted - awayAvgActual) * 1000) / 1000;

  leagues[league] = {
    homeBias,
    awayBias,
    homeAvgPredicted: Math.round(homeAvgPredicted * 1000) / 1000,
    homeAvgActual: Math.round(homeAvgActual * 1000) / 1000,
    awayAvgPredicted: Math.round(awayAvgPredicted * 1000) / 1000,
    awayAvgActual: Math.round(awayAvgActual * 1000) / 1000,
    matchesAnalyzed: data.count,
  };

  biases[league] = { homeBias, awayBias };
}

// Load existing calibration for history
const existing: PoissonCalibration = existsSync(CALIBRATION_FILE)
  ? JSON.parse(readFileSync(CALIBRATION_FILE, 'utf-8'))
  : { lastUpdated: '', lastGameweek: '', leagues: {}, history: [] };

existing.history.push({
  timestamp: new Date().toISOString(),
  gameweek: latestGW,
  season,
  biases,
});

const calibration: PoissonCalibration = {
  lastUpdated: new Date().toISOString(),
  lastGameweek: latestGW,
  leagues,
  history: existing.history,
};

writeFileSync(CALIBRATION_FILE, JSON.stringify(calibration, null, 2));

console.log(`Poisson calibration updated through ${latestGW} (${season})`);
console.log('\nPer-league goal prediction bias (positive = over-predicting):');
for (const [league, data] of Object.entries(leagues)) {
  const homeDir = data.homeBias > 0 ? '+' : '';
  const awayDir = data.awayBias > 0 ? '+' : '';
  console.log(`  ${league}: home ${homeDir}${data.homeBias.toFixed(3)}, away ${awayDir}${data.awayBias.toFixed(3)} (${data.matchesAnalyzed} matches)`);
  console.log(`    Home: predicted ${data.homeAvgPredicted.toFixed(2)} vs actual ${data.homeAvgActual.toFixed(2)}`);
  console.log(`    Away: predicted ${data.awayAvgPredicted.toFixed(2)} vs actual ${data.awayAvgActual.toFixed(2)}`);
}
