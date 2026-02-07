#!/usr/bin/env npx tsx
/**
 * Elo Rating Engine
 * Usage: npx tsx scripts/elo.ts <command> [args]
 *
 * Commands:
 *   predict --home-elo <n> --away-elo <n>
 *   update  --home-elo <n> --away-elo <n> --home-goals <n> --away-goals <n>
 *   init    --standings <path>   (initialize Elo from standings JSON)
 *   get     --team <name>        (get current Elo for a team)
 *   list                         (list all Elo ratings)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ELO_FILE = resolve(__dirname, '..', 'data', 'memory', 'elo-ratings.json');
const K_FACTOR = 20;
const HOME_ADVANTAGE = 65;

interface EloRatings {
  ratings: Record<string, { rating: number; team: string; league: string; updatedAt: string }>;
  lastUpdated: string;
}

function loadRatings(): EloRatings {
  if (existsSync(ELO_FILE)) {
    return JSON.parse(readFileSync(ELO_FILE, 'utf-8'));
  }
  return { ratings: {}, lastUpdated: new Date().toISOString() };
}

function saveRatings(data: EloRatings): void {
  data.lastUpdated = new Date().toISOString();
  writeFileSync(ELO_FILE, JSON.stringify(data, null, 2));
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
  // Adjust K-factor based on goal difference
  if (goalDiff <= 1) return 1;
  return 1 + Math.sqrt(goalDiff - 1) * 0.5;
}

function predict(homeElo: number, awayElo: number) {
  // Apply home advantage
  const adjustedHomeElo = homeElo + HOME_ADVANTAGE;

  // Expected score (probability of winning)
  const homeExpected = expectedScore(adjustedHomeElo, awayElo);
  const awayExpected = 1 - homeExpected;

  // Convert to W/D/L probabilities
  // Draw probability increases when teams are close in rating
  const ratingDiff = Math.abs(adjustedHomeElo - awayElo);
  const drawBase = 0.28; // Base draw probability
  const drawDecay = 0.003; // How quickly draw prob decreases with rating diff
  const drawProb = Math.max(0.08, drawBase - ratingDiff * drawDecay);

  // Distribute remaining probability based on expected scores
  const remaining = 1 - drawProb;
  const homeWinProb = remaining * homeExpected;
  const awayWinProb = remaining * awayExpected;

  // Normalize to ensure sum = 1.0
  const total = homeWinProb + drawProb + awayWinProb;
  const result = {
    homeWinProb: Math.round((homeWinProb / total) * 1000) / 1000,
    drawProb: Math.round((drawProb / total) * 1000) / 1000,
    awayWinProb: Math.round((awayWinProb / total) * 1000) / 1000,
    homeElo,
    awayElo,
    adjustedHomeElo,
    homeAdvantage: HOME_ADVANTAGE,
    ratingDiff: adjustedHomeElo - awayElo,
  };

  // Fix rounding to ensure exact 1.000
  const sum = result.homeWinProb + result.drawProb + result.awayWinProb;
  if (sum !== 1) {
    result.homeWinProb = Math.round((result.homeWinProb + (1 - sum)) * 1000) / 1000;
  }

  return result;
}

function update(homeElo: number, awayElo: number, homeGoals: number, awayGoals: number) {
  const adjustedHomeElo = homeElo + HOME_ADVANTAGE;
  const goalDiff = Math.abs(homeGoals - awayGoals);
  const multiplier = marginMultiplier(goalDiff);

  const homeExpected = expectedScore(adjustedHomeElo, awayElo);
  const awayExpected = 1 - homeExpected;

  const homeActual = actualScore(homeGoals, awayGoals);
  const awayActual = 1 - homeActual;

  const kAdj = K_FACTOR * multiplier;

  const newHomeElo = Math.round(homeElo + kAdj * (homeActual - homeExpected));
  const newAwayElo = Math.round(awayElo + kAdj * (awayActual - awayExpected));

  return {
    homeElo: newHomeElo,
    awayElo: newAwayElo,
    homeChange: newHomeElo - homeElo,
    awayChange: newAwayElo - awayElo,
    kFactor: K_FACTOR,
    marginMultiplier: multiplier,
    effectiveK: kAdj,
  };
}

function initFromStandings(standingsPath: string) {
  const data = JSON.parse(readFileSync(standingsPath, 'utf-8'));
  const ratings = loadRatings();

  // Support both direct array and {data: [...]} format
  const standings = Array.isArray(data) ? data : (data.data || []);

  for (const standing of standings) {
    const teamName = standing.participant?.name || standing.team || `Team_${standing.participant_id}`;
    const teamId = String(standing.participant_id || standing.teamId);
    const position = standing.position || 0;
    const points = standing.points || 0;

    // Seed Elo based on league position: 1st gets ~1700, last gets ~1300
    const totalTeams = standings.length || 20;
    const positionFactor = (totalTeams - position) / (totalTeams - 1); // 1.0 for 1st, 0.0 for last
    const initialElo = Math.round(1300 + positionFactor * 400);

    ratings.ratings[teamId] = {
      rating: initialElo,
      team: teamName,
      league: standing.league_id ? `league_${standing.league_id}` : 'unknown',
      updatedAt: new Date().toISOString(),
    };
  }

  saveRatings(ratings);
  console.log(JSON.stringify({ initialized: Object.keys(ratings.ratings).length, ratings: ratings.ratings }, null, 2));
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

switch (command) {
  case 'predict': {
    const homeElo = Number(args['home-elo']);
    const awayElo = Number(args['away-elo']);
    if (isNaN(homeElo) || isNaN(awayElo)) {
      console.error('Error: --home-elo and --away-elo are required');
      process.exit(1);
    }
    console.log(JSON.stringify(predict(homeElo, awayElo), null, 2));
    break;
  }

  case 'update': {
    const homeElo = Number(args['home-elo']);
    const awayElo = Number(args['away-elo']);
    const homeGoals = Number(args['home-goals']);
    const awayGoals = Number(args['away-goals']);
    if ([homeElo, awayElo, homeGoals, awayGoals].some(isNaN)) {
      console.error('Error: --home-elo, --away-elo, --home-goals, --away-goals are all required');
      process.exit(1);
    }
    console.log(JSON.stringify(update(homeElo, awayElo, homeGoals, awayGoals), null, 2));
    break;
  }

  case 'init': {
    const standingsPath = args.standings;
    if (!standingsPath) {
      console.error('Error: --standings <path> is required');
      process.exit(1);
    }
    initFromStandings(resolve(standingsPath));
    break;
  }

  case 'get': {
    const teamName = args.team;
    if (!teamName) {
      console.error('Error: --team <name> is required');
      process.exit(1);
    }
    const ratings = loadRatings();
    const found = Object.entries(ratings.ratings).find(
      ([, v]) => v.team.toLowerCase().includes(teamName.toLowerCase())
    );
    if (found) {
      console.log(JSON.stringify({ id: found[0], ...found[1] }, null, 2));
    } else {
      console.error(`Team "${teamName}" not found in Elo ratings`);
      process.exit(1);
    }
    break;
  }

  case 'list': {
    const ratings = loadRatings();
    const sorted = Object.entries(ratings.ratings)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.rating - a.rating);
    console.log(JSON.stringify(sorted, null, 2));
    break;
  }

  default:
    console.error(`Usage: npx tsx scripts/elo.ts <command> [args]

Commands:
  predict   --home-elo <n> --away-elo <n>
  update    --home-elo <n> --away-elo <n> --home-goals <n> --away-goals <n>
  init      --standings <path>
  get       --team <name>
  list
`);
    process.exit(1);
}
