import { promises as fs } from 'fs';
import path from 'path';
import { CURRENT_SEASON } from '@/config/site';
import { LEAGUES } from '@/config/leagues';

export interface AccaFixture {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  leagueId: number;
  leagueName: string;
  round: number;
  predictions: {
    home: number;
    draw: number;
    away: number;
    btts_yes: number;
    btts_no: number;
  };
  odds: { home: number; draw: number; away: number };
  confidence: number;
  predictedScore: string;
}

interface MatchData {
  fixtureId: number;
  league: { id: number; name: string };
  round: number;
  homeTeam: { name: string };
  awayTeam: { name: string };
  kickoff: string;
  odds?: { home: number; draw: number; away: number; bookmaker: string };
}

interface PredictionEntry {
  fixtureId: number;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  predictedScore: string;
  confidence: number;
  modelComponents?: {
    btts?: { yes: number; no: number };
  };
}

/**
 * Load upcoming fixtures with predictions and odds for the ACCA builder.
 * Scans the 3 most recent gameweeks, merges matches + predictions,
 * and filters to upcoming fixtures only.
 */
export async function loadAccaFixtures(): Promise<AccaFixture[]> {
  const baseDir = path.join(process.cwd(), 'data', 'gameweeks', CURRENT_SEASON);

  let entries: string[];
  try {
    entries = await fs.readdir(baseDir);
  } catch {
    return [];
  }

  const gameweeks = entries
    .filter((e) => e.startsWith('GW'))
    .map((e) => parseInt(e.replace('GW', '')))
    .sort((a, b) => b - a)
    .slice(0, 3); // 3 most recent GWs

  const leagueMap = new Map(LEAGUES.map((l) => [l.id, l.name]));
  const now = new Date();
  const fixtures: AccaFixture[] = [];

  for (const gw of gameweeks) {
    const gwDir = path.join(baseDir, `GW${gw}`);

    let matches: MatchData[] = [];
    let predictions: PredictionEntry[] = [];

    try {
      const matchRaw = await fs.readFile(path.join(gwDir, 'matches.json'), 'utf-8');
      matches = JSON.parse(matchRaw);
    } catch {
      continue; // skip GW if no matches
    }

    try {
      const predRaw = await fs.readFile(path.join(gwDir, 'predictions.json'), 'utf-8');
      predictions = JSON.parse(predRaw);
    } catch {
      continue; // skip GW if no predictions
    }

    const predMap = new Map(predictions.map((p) => [p.fixtureId, p]));

    for (const match of matches) {
      // Skip if already kicked off
      if (new Date(match.kickoff) <= now) continue;
      // Skip if no odds
      if (!match.odds?.home) continue;

      const pred = predMap.get(match.fixtureId);
      if (!pred) continue;

      const bttsYes = pred.modelComponents?.btts?.yes ?? 50;
      const bttsNo = pred.modelComponents?.btts?.no ?? 50;

      fixtures.push({
        fixtureId: match.fixtureId,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        kickoff: match.kickoff,
        leagueId: match.league.id,
        leagueName: leagueMap.get(match.league.id) ?? match.league.name,
        round: match.round,
        predictions: {
          home: Math.round(pred.homeWinProb * 100),
          draw: Math.round(pred.drawProb * 100),
          away: Math.round(pred.awayWinProb * 100),
          btts_yes: bttsYes,
          btts_no: bttsNo,
        },
        odds: {
          home: match.odds.home,
          draw: match.odds.draw,
          away: match.odds.away,
        },
        confidence: Math.round(pred.confidence * 100),
        predictedScore: pred.predictedScore,
      });
    }
  }

  // Sort by kickoff ascending
  fixtures.sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
  return fixtures;
}
