#!/usr/bin/env npx tsx
/**
 * Batch-update Elo ratings for all finished matches in a gameweek
 * Usage: npx tsx scripts/update-elo-batch.ts --gameweek GW25 --season 2025-26
 *
 * Reads matches.json + results.json, applies Elo updates using same math as elo.ts,
 * writes updated ratings back to elo-ratings.json.
 * Idempotent: tracks lastEvaluatedGW to skip already-processed gameweeks.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(__dirname, '..');
const ELO_FILE = resolve(root, 'data', 'memory', 'elo-ratings.json');
const CHANGELOG_FILE = resolve(root, 'data', 'memory', 'changelog.json');

const K_FACTOR = 20;
const HOME_ADVANTAGE = 65;

interface EloEntry {
  rating: number;
  team: string;
  league: string;
  updatedAt: string;
}

interface EloRatings {
  ratings: Record<string, EloEntry>;
  lastUpdated: string;
  lastEvaluatedGW?: string;
}

interface Match {
  fixtureId: number;
  league: { name: string };
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
}

interface Result {
  fixtureId: number;
  homeGoals: number;
  awayGoals: number;
  status: string;
}

interface ChangelogEntry {
  timestamp: string;
  type: string;
  gameweek: string;
  season: string;
  changes: Array<{
    teamId: string;
    team: string;
    oldRating: number;
    newRating: number;
    change: number;
    match: string;
    result: string;
  }>;
}

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function actualScore(goalsA: number, goalsB: number): number {
  if (goalsA > goalsB) return 1;
  if (goalsA < goalsB) return 0;
  return 0.5;
}

function marginMultiplier(goalDiff: number): number {
  if (goalDiff <= 1) return 1;
  return 1 + Math.sqrt(goalDiff - 1) * 0.5;
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
const force = args.force === 'true';

if (!gameweek) {
  console.error('Usage: npx tsx scripts/update-elo-batch.ts --gameweek GW25 [--season 2025-26] [--force]');
  process.exit(1);
}

const gwDir = resolve(root, 'data', 'gameweeks', season, gameweek);
const matchesPath = resolve(gwDir, 'matches.json');
const resultsPath = resolve(gwDir, 'results.json');

if (!existsSync(matchesPath)) {
  console.error(`matches.json not found: ${matchesPath}`);
  process.exit(1);
}
if (!existsSync(resultsPath)) {
  console.error(`results.json not found: ${resultsPath}`);
  process.exit(1);
}

// Load data
const eloData: EloRatings = existsSync(ELO_FILE)
  ? JSON.parse(readFileSync(ELO_FILE, 'utf-8'))
  : { ratings: {}, lastUpdated: new Date().toISOString() };

// Idempotency check
if (!force && eloData.lastEvaluatedGW === `${season}/${gameweek}`) {
  console.log(`Elo ratings already updated for ${season}/${gameweek}. Use --force to re-process.`);
  process.exit(0);
}

const matches: Match[] = JSON.parse(readFileSync(matchesPath, 'utf-8'));
const results: Result[] = JSON.parse(readFileSync(resultsPath, 'utf-8'));

const resultsMap = new Map<number, Result>();
for (const r of results) {
  if (r.status === 'finished') {
    resultsMap.set(r.fixtureId, r);
  }
}

const changes: ChangelogEntry['changes'] = [];
let updated = 0;

for (const match of matches) {
  const result = resultsMap.get(match.fixtureId);
  if (!result) continue;

  const homeId = String(match.homeTeam.id);
  const awayId = String(match.awayTeam.id);
  const homeElo = eloData.ratings[homeId]?.rating || 1500;
  const awayElo = eloData.ratings[awayId]?.rating || 1500;

  const adjustedHomeElo = homeElo + HOME_ADVANTAGE;
  const goalDiff = Math.abs(result.homeGoals - result.awayGoals);
  const multiplier = marginMultiplier(goalDiff);

  const homeExpected = expectedScore(adjustedHomeElo, awayElo);
  const awayExpected = 1 - homeExpected;

  const homeActual = actualScore(result.homeGoals, result.awayGoals);
  const awayActual = 1 - homeActual;

  const kAdj = K_FACTOR * multiplier;

  const newHomeElo = Math.round(homeElo + kAdj * (homeActual - homeExpected));
  const newAwayElo = Math.round(awayElo + kAdj * (awayActual - awayExpected));

  const now = new Date().toISOString();

  // Update home team
  eloData.ratings[homeId] = {
    rating: newHomeElo,
    team: match.homeTeam.name,
    league: match.league.name,
    updatedAt: now,
  };

  // Update away team
  eloData.ratings[awayId] = {
    rating: newAwayElo,
    team: match.awayTeam.name,
    league: match.league.name,
    updatedAt: now,
  };

  const matchLabel = `${match.homeTeam.name} vs ${match.awayTeam.name}`;
  const resultLabel = `${result.homeGoals}-${result.awayGoals}`;

  changes.push({
    teamId: homeId,
    team: match.homeTeam.name,
    oldRating: homeElo,
    newRating: newHomeElo,
    change: newHomeElo - homeElo,
    match: matchLabel,
    result: resultLabel,
  });
  changes.push({
    teamId: awayId,
    team: match.awayTeam.name,
    oldRating: awayElo,
    newRating: newAwayElo,
    change: newAwayElo - awayElo,
    match: matchLabel,
    result: resultLabel,
  });

  updated++;
}

// Save updated Elo ratings
eloData.lastUpdated = new Date().toISOString();
eloData.lastEvaluatedGW = `${season}/${gameweek}`;
writeFileSync(ELO_FILE, JSON.stringify(eloData, null, 2));

// Append to changelog
const changelog: ChangelogEntry[] = existsSync(CHANGELOG_FILE)
  ? JSON.parse(readFileSync(CHANGELOG_FILE, 'utf-8'))
  : [];

changelog.push({
  timestamp: new Date().toISOString(),
  type: 'elo-update',
  gameweek,
  season,
  changes,
});

writeFileSync(CHANGELOG_FILE, JSON.stringify(changelog, null, 2));

console.log(`Updated Elo ratings for ${updated} matches in ${gameweek}`);
console.log(`Changes recorded in changelog.json (${changes.length} team updates)`);

// Show biggest movers
const sorted = [...changes].sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
console.log('\nBiggest Elo changes:');
for (const c of sorted.slice(0, 10)) {
  const dir = c.change > 0 ? '+' : '';
  console.log(`  ${c.team}: ${c.oldRating} → ${c.newRating} (${dir}${c.change}) [${c.match} ${c.result}]`);
}
