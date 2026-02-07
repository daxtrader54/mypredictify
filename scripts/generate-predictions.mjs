/**
 * Generate predictions for all matches using Elo + Poisson + Odds
 * Usage: node scripts/generate-predictions.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Load data
const matches = JSON.parse(readFileSync(join(root, 'data/gameweeks/2025-26/GW25/matches.json'), 'utf-8'));
const eloData = JSON.parse(readFileSync(join(root, 'data/memory/elo-ratings.json'), 'utf-8'));

const HOME_ADVANTAGE = 65; // Elo home bonus

function getElo(teamId) {
  const entry = eloData.ratings?.[teamId];
  return entry?.rating || 1500;
}

// Elo-based win probabilities
function eloPrediction(homeElo, awayElo) {
  const adjHome = homeElo + HOME_ADVANTAGE;
  const expectedHome = 1 / (1 + Math.pow(10, (awayElo - adjHome) / 400));
  const expectedAway = 1 - expectedHome;
  // Split into W/D/L (draws ~25% base, adjusted by how close teams are)
  const eloDiff = Math.abs(adjHome - awayElo);
  const drawBase = Math.max(0.15, 0.30 - eloDiff / 2000);
  const homeWin = expectedHome * (1 - drawBase);
  const awayWin = expectedAway * (1 - drawBase);
  return { homeWin, draw: drawBase, awayWin };
}

// Poisson model
function poissonProb(lambda, k) {
  let result = 1;
  for (let i = 0; i < k; i++) result *= lambda;
  result *= Math.exp(-lambda);
  let factorial = 1;
  for (let i = 2; i <= k; i++) factorial *= i;
  return result / factorial;
}

function poissonPrediction(homeXG, awayXG) {
  const maxGoals = 5;
  let homeWin = 0, draw = 0, awayWin = 0;
  const scoreMatrix = [];

  for (let h = 0; h <= maxGoals; h++) {
    scoreMatrix[h] = [];
    for (let a = 0; a <= maxGoals; a++) {
      const p = poissonProb(homeXG, h) * poissonProb(awayXG, a);
      scoreMatrix[h][a] = p;
      if (h > a) homeWin += p;
      else if (h === a) draw += p;
      else awayWin += p;
    }
  }

  const total = homeWin + draw + awayWin;

  // BTTS
  let bttsYes = 0;
  for (let h = 1; h <= maxGoals; h++) {
    for (let a = 1; a <= maxGoals; a++) bttsYes += scoreMatrix[h][a];
  }

  return {
    homeWin: homeWin / total,
    draw: draw / total,
    awayWin: awayWin / total,
    scoreMatrix,
    btts: { yes: bttsYes, no: 1 - bttsYes },
  };
}

// Pick the most likely score consistent with the predicted outcome (H/D/A)
function bestScoreForOutcome(scoreMatrix, prediction) {
  const maxGoals = 5;
  let maxP = 0, bestScore = '1-0';
  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const matches = prediction === 'H' ? h > a : prediction === 'A' ? a > h : h === a;
      if (matches && scoreMatrix[h][a] > maxP) {
        maxP = scoreMatrix[h][a];
        bestScore = `${h}-${a}`;
      }
    }
  }
  return bestScore;
}

// Odds to implied probabilities
function oddsToProbs(odds) {
  if (!odds || !odds.home) return null;
  const rH = 1 / odds.home, rD = 1 / odds.draw, rA = 1 / odds.away;
  const t = rH + rD + rA;
  return { homeWin: rH / t, draw: rD / t, awayWin: rA / t };
}

// Extract a standing detail value by type code
function getStandingValue(details, code) {
  if (!details) return null;
  const entry = details.find(d => d.type?.code === code);
  return entry ? entry.value : null;
}

// Compute league-average goals per game from all matches in the dataset
function computeLeagueAverages(allMatches) {
  const leagueStats = {};
  for (const m of allMatches) {
    const league = m.league.name;
    if (!leagueStats[league]) leagueStats[league] = { totalHomeScored: 0, totalAwayScored: 0, totalMatches: 0, teams: 0 };

    // Sum up home goals scored and away goals scored from standings
    for (const side of ['home', 'away']) {
      const standings = m.standings?.[side];
      if (!standings?.details) continue;
      const played = getStandingValue(standings.details, side === 'home' ? 'home-matches-played' : 'away-matches-played');
      const scored = getStandingValue(standings.details, side === 'home' ? 'home-scored' : 'away-scored');
      if (played && scored && played > 0) {
        if (side === 'home') {
          leagueStats[league].totalHomeScored += scored;
          leagueStats[league].totalMatches += played;
        } else {
          leagueStats[league].totalAwayScored += scored;
        }
      }
    }
  }

  const averages = {};
  for (const [league, stats] of Object.entries(leagueStats)) {
    const avgHome = stats.totalMatches > 0 ? stats.totalHomeScored / stats.totalMatches : 1.4;
    const avgAway = stats.totalMatches > 0 ? stats.totalAwayScored / stats.totalMatches : 1.1;
    averages[league] = { avgHome, avgAway };
  }
  return averages;
}

// xG estimation using Dixon-Coles approach with real standings data
function estimateXG(match, homeElo, awayElo, oddsProbs, leagueAvg) {
  const homeStandings = match.standings?.home?.details;
  const awayStandings = match.standings?.away?.details;

  const avgHome = leagueAvg?.avgHome || 1.4; // league avg home goals per game
  const avgAway = leagueAvg?.avgAway || 1.1; // league avg away goals per game

  let homeXG = avgHome;
  let awayXG = avgAway;

  // If we have standings data, use Dixon-Coles style calculation
  const homeGamesPlayed = getStandingValue(homeStandings, 'home-matches-played');
  const homeGoalsScored = getStandingValue(homeStandings, 'home-scored');
  const homeGoalsConceded = getStandingValue(homeStandings, 'home-conceded');
  const awayGamesPlayed = getStandingValue(awayStandings, 'away-matches-played');
  const awayGoalsScored = getStandingValue(awayStandings, 'away-scored');
  const awayGoalsConceded = getStandingValue(awayStandings, 'away-conceded');

  if (homeGamesPlayed > 0 && awayGamesPlayed > 0 &&
      homeGoalsScored != null && homeGoalsConceded != null &&
      awayGoalsScored != null && awayGoalsConceded != null) {

    // Home team attack strength = (home goals scored per game) / league avg home goals
    const homeAttack = (homeGoalsScored / homeGamesPlayed) / avgHome;
    // Home team defense strength = (home goals conceded per game) / league avg away goals
    const homeDefense = (homeGoalsConceded / homeGamesPlayed) / avgAway;

    // Away team attack strength = (away goals scored per game) / league avg away goals
    const awayAttack = (awayGoalsScored / awayGamesPlayed) / avgAway;
    // Away team defense strength = (away goals conceded per game) / league avg home goals
    const awayDefense = (awayGoalsConceded / awayGamesPlayed) / avgHome;

    // xG = attack strength * opposing defense strength * league average
    homeXG = homeAttack * awayDefense * avgHome;
    awayXG = awayAttack * homeDefense * avgAway;
  } else {
    // Fallback: Elo-based estimate
    const eloDiff = (homeElo + HOME_ADVANTAGE - awayElo) / 400;
    homeXG *= (1 + eloDiff * 0.15);
    awayXG *= (1 - eloDiff * 0.15);
  }

  // Blend with odds signal if available (20% weight to odds, 80% standings-based)
  if (oddsProbs) {
    const oddsHomeStrength = oddsProbs.homeWin / (oddsProbs.homeWin + oddsProbs.awayWin);
    const oddsHomeXG = (avgHome + avgAway) * oddsHomeStrength;
    const oddsAwayXG = (avgHome + avgAway) * (1 - oddsHomeStrength);
    homeXG = homeXG * 0.8 + oddsHomeXG * 0.2;
    awayXG = awayXG * 0.8 + oddsAwayXG * 0.2;
  }

  // Clamp to reasonable range
  homeXG = Math.max(0.4, Math.min(3.5, homeXG));
  awayXG = Math.max(0.3, Math.min(3.0, awayXG));

  return { homeXG, awayXG };
}

// Compute league averages from all matches
const leagueAverages = computeLeagueAverages(matches);
console.log('League averages (home/away goals per game):');
for (const [league, avg] of Object.entries(leagueAverages)) {
  console.log(`  ${league}: ${avg.avgHome.toFixed(2)} home, ${avg.avgAway.toFixed(2)} away`);
}

// Generate predictions
const predictions = [];

for (const match of matches) {
  const homeElo = getElo(match.homeTeam.id);
  const awayElo = getElo(match.awayTeam.id);
  const oddsProbs = oddsToProbs(match.odds);
  const leagueAvg = leagueAverages[match.league.name];

  // Get Elo prediction
  const elo = eloPrediction(homeElo, awayElo);

  // Get expected goals from real standings data and Poisson prediction
  const { homeXG, awayXG } = estimateXG(match, homeElo, awayElo, oddsProbs, leagueAvg);
  const poisson = poissonPrediction(homeXG, awayXG);

  // Blend: 30% Elo + 30% Poisson + 40% Odds (if available)
  let finalH, finalD, finalA;
  if (oddsProbs) {
    finalH = elo.homeWin * 0.3 + poisson.homeWin * 0.3 + oddsProbs.homeWin * 0.4;
    finalD = elo.draw * 0.3 + poisson.draw * 0.3 + oddsProbs.draw * 0.4;
    finalA = elo.awayWin * 0.3 + poisson.awayWin * 0.3 + oddsProbs.awayWin * 0.4;
  } else {
    finalH = elo.homeWin * 0.5 + poisson.homeWin * 0.5;
    finalD = elo.draw * 0.5 + poisson.draw * 0.5;
    finalA = elo.awayWin * 0.5 + poisson.awayWin * 0.5;
  }

  // Normalize to sum to 1.0
  const sum = finalH + finalD + finalA;
  finalH /= sum;
  finalD /= sum;
  finalA /= sum;

  // Clamp minimums (no prob below 3%)
  const clampMin = 0.03;
  if (finalH < clampMin) { const diff = clampMin - finalH; finalH = clampMin; finalD -= diff/2; finalA -= diff/2; }
  if (finalD < clampMin) { const diff = clampMin - finalD; finalD = clampMin; finalH -= diff/2; finalA -= diff/2; }
  if (finalA < clampMin) { const diff = clampMin - finalA; finalA = clampMin; finalH -= diff/2; finalD -= diff/2; }

  // Determine prediction
  let prediction = 'D';
  if (finalH > finalD && finalH > finalA) prediction = 'H';
  else if (finalA > finalH && finalA > finalD) prediction = 'A';

  // Confidence (how far the top prob is from uniform 33%)
  const maxProb = Math.max(finalH, finalD, finalA);
  const confidence = Math.min(0.95, maxProb);

  predictions.push({
    fixtureId: match.fixtureId,
    league: match.league.name,
    homeTeam: match.homeTeam.name,
    awayTeam: match.awayTeam.name,
    homeWinProb: Math.round(finalH * 1000) / 1000,
    drawProb: Math.round(finalD * 1000) / 1000,
    awayWinProb: Math.round(finalA * 1000) / 1000,
    predictedScore: bestScoreForOutcome(poisson.scoreMatrix, prediction),
    prediction,
    confidence: Math.round(confidence * 1000) / 1000,
    explanation: `${prediction === 'H' ? match.homeTeam.name : prediction === 'A' ? match.awayTeam.name : 'Draw'} predicted based on Elo ratings (${homeElo} vs ${awayElo}), Poisson model (xG: ${homeXG.toFixed(2)} - ${awayXG.toFixed(2)}), and market odds.`,
    modelComponents: {
      elo: { H: Math.round(elo.homeWin * 1000) / 1000, D: Math.round(elo.draw * 1000) / 1000, A: Math.round(elo.awayWin * 1000) / 1000 },
      poisson: { H: Math.round(poisson.homeWin * 1000) / 1000, D: Math.round(poisson.draw * 1000) / 1000, A: Math.round(poisson.awayWin * 1000) / 1000 },
      odds: oddsProbs ? { H: Math.round(oddsProbs.homeWin * 1000) / 1000, D: Math.round(oddsProbs.draw * 1000) / 1000, A: Math.round(oddsProbs.awayWin * 1000) / 1000 } : null,
      btts: { yes: Math.round(poisson.btts.yes * 100), no: Math.round(poisson.btts.no * 100) },
    },
  });
}

// Write predictions
const outPath = join(root, 'data/gameweeks/2025-26/GW25/predictions.json');
writeFileSync(outPath, JSON.stringify(predictions, null, 2));
console.log(`Generated ${predictions.length} predictions → ${outPath}`);

// Summary
const leagues = {};
for (const p of predictions) {
  if (!leagues[p.league]) leagues[p.league] = [];
  leagues[p.league].push(p);
}

for (const [league, preds] of Object.entries(leagues)) {
  console.log(`\n${league} (${preds.length} matches):`);
  for (const p of preds) {
    const tip = p.prediction === 'H' ? p.homeTeam : p.prediction === 'A' ? p.awayTeam : 'Draw';
    console.log(`  ${p.homeTeam} vs ${p.awayTeam} → ${p.predictedScore} (${tip}, ${(p.confidence * 100).toFixed(0)}%)`);
  }
}
