#!/usr/bin/env npx tsx
/**
 * Poisson Goal Distribution Model
 * Usage: npx tsx scripts/poisson.ts predict [args]
 *
 * Commands:
 *   predict --home-attack <n> --home-defense <n> --away-attack <n> --away-defense <n> [--league-avg <n>]
 *
 * Attack/defense strengths are relative to league average (1.0 = average).
 * Example: home-attack 1.3 means 30% more goals scored than average.
 */

const MAX_GOALS = 5;

function poissonProbability(lambda: number, k: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function predict(
  homeAttack: number,
  homeDefense: number,
  awayAttack: number,
  awayDefense: number,
  leagueAvg: number
) {
  // Expected goals
  const homeExpectedGoals = homeAttack * awayDefense * leagueAvg;
  const awayExpectedGoals = awayAttack * homeDefense * leagueAvg;

  // Score matrix (0-0 through MAX_GOALS-MAX_GOALS)
  const scoreMatrix: number[][] = [];
  for (let h = 0; h <= MAX_GOALS; h++) {
    scoreMatrix[h] = [];
    for (let a = 0; a <= MAX_GOALS; a++) {
      scoreMatrix[h][a] = poissonProbability(homeExpectedGoals, h) * poissonProbability(awayExpectedGoals, a);
    }
  }

  // W/D/L probabilities
  let homeWinProb = 0;
  let drawProb = 0;
  let awayWinProb = 0;

  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      if (h > a) homeWinProb += scoreMatrix[h][a];
      else if (h === a) drawProb += scoreMatrix[h][a];
      else awayWinProb += scoreMatrix[h][a];
    }
  }

  // Normalize
  const total = homeWinProb + drawProb + awayWinProb;
  homeWinProb = Math.round((homeWinProb / total) * 1000) / 1000;
  drawProb = Math.round((drawProb / total) * 1000) / 1000;
  awayWinProb = Math.round((1 - homeWinProb - drawProb) * 1000) / 1000;

  // Most likely score
  let maxProb = 0;
  let mostLikelyScore = { home: 0, away: 0 };
  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      if (scoreMatrix[h][a] > maxProb) {
        maxProb = scoreMatrix[h][a];
        mostLikelyScore = { home: h, away: a };
      }
    }
  }

  // Top 5 most likely scores
  const scoreProbabilities: { score: string; probability: number }[] = [];
  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      scoreProbabilities.push({
        score: `${h}-${a}`,
        probability: Math.round(scoreMatrix[h][a] * 10000) / 10000,
      });
    }
  }
  scoreProbabilities.sort((a, b) => b.probability - a.probability);

  // BTTS probability
  let bttsYes = 0;
  for (let h = 1; h <= MAX_GOALS; h++) {
    for (let a = 1; a <= MAX_GOALS; a++) {
      bttsYes += scoreMatrix[h][a];
    }
  }

  // Over/Under 2.5
  let over25 = 0;
  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      if (h + a >= 3) over25 += scoreMatrix[h][a];
    }
  }

  return {
    homeExpectedGoals: Math.round(homeExpectedGoals * 100) / 100,
    awayExpectedGoals: Math.round(awayExpectedGoals * 100) / 100,
    homeWinProb,
    drawProb,
    awayWinProb,
    mostLikelyScore: `${mostLikelyScore.home}-${mostLikelyScore.away}`,
    mostLikelyScoreProb: Math.round(maxProb * 10000) / 10000,
    topScores: scoreProbabilities.slice(0, 10),
    btts: {
      yes: Math.round(bttsYes * 1000) / 1000,
      no: Math.round((1 - bttsYes) * 1000) / 1000,
    },
    overUnder25: {
      over: Math.round(over25 * 1000) / 1000,
      under: Math.round((1 - over25) * 1000) / 1000,
    },
    inputs: { homeAttack, homeDefense, awayAttack, awayDefense, leagueAvg },
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
const [command, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);

if (command !== 'predict') {
  console.error(`Usage: npx tsx scripts/poisson.ts predict [args]

Arguments:
  --home-attack  <n>   Home team attack strength (1.0 = league average)
  --home-defense <n>   Home team defense weakness (1.0 = league average, higher = concedes more)
  --away-attack  <n>   Away team attack strength
  --away-defense <n>   Away team defense weakness
  --league-avg   <n>   League average goals per home/away (default: 1.35)
`);
  process.exit(1);
}

const homeAttack = Number(args['home-attack']);
const homeDefense = Number(args['home-defense']);
const awayAttack = Number(args['away-attack']);
const awayDefense = Number(args['away-defense']);
const leagueAvg = Number(args['league-avg'] || '1.35');

if ([homeAttack, homeDefense, awayAttack, awayDefense].some(isNaN)) {
  console.error('Error: --home-attack, --home-defense, --away-attack, --away-defense are all required');
  process.exit(1);
}

console.log(JSON.stringify(predict(homeAttack, homeDefense, awayAttack, awayDefense, leagueAvg), null, 2));
