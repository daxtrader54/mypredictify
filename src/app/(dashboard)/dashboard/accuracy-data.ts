import { promises as fs } from 'fs';
import path from 'path';
import { CURRENT_SEASON } from '@/config/site';

export interface LeagueAccuracy {
  name: string;
  predictions: number;
  correctOutcomes: number;
  correctScores: number;
  outcomeAccuracy: number;
  scoreAccuracy: number;
}

export interface GameweekAccuracy {
  name: string;
  date: string;
  totalPredictions: number;
  correctOutcomes: number;
  correctScores: number;
  outcomeAccuracy: number;
  scoreAccuracy: number;
  leagues: LeagueAccuracy[];
}

export interface AccuracyData {
  cumulative: {
    totalPredictions: number;
    correctOutcomes: number;
    correctScores: number;
    outcomeAccuracy: number;
    scoreAccuracy: number;
  };
  gameweeks: GameweekAccuracy[];
  leagueTotals: LeagueAccuracy[];
}

interface EvaluationMatch {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  correct: boolean;
  scoreCorrect: boolean;
}

interface EvaluationFile {
  summary: {
    totalPredictions: number;
    matchedWithResults: number;
    correctOutcomes: number;
    correctScores: number;
    outcomeAccuracy: number;
    scoreAccuracy: number;
  };
  matches: EvaluationMatch[];
  evaluatedAt: string;
}

interface PredictionEntry {
  fixtureId: number;
  league: string;
}

const EMPTY_DATA: AccuracyData = {
  cumulative: {
    totalPredictions: 0,
    correctOutcomes: 0,
    correctScores: 0,
    outcomeAccuracy: 0,
    scoreAccuracy: 0,
  },
  gameweeks: [],
  leagueTotals: [],
};

export async function getAccuracyData(): Promise<AccuracyData> {
  const baseDir = path.join(process.cwd(), 'data', 'gameweeks', CURRENT_SEASON);

  // Find all GW directories
  let gwDirs: string[];
  try {
    const entries = await fs.readdir(baseDir);
    gwDirs = entries
      .filter((e) => e.startsWith('GW'))
      .sort((a, b) => parseInt(a.replace('GW', '')) - parseInt(b.replace('GW', '')));
  } catch {
    return EMPTY_DATA;
  }

  const gameweeks: GameweekAccuracy[] = [];
  const leagueMap = new Map<string, { predictions: number; correctOutcomes: number; correctScores: number }>();

  for (const gw of gwDirs) {
    const gwPath = path.join(baseDir, gw);
    const evalPath = path.join(gwPath, 'evaluation.json');
    const predPath = path.join(gwPath, 'predictions.json');

    // Only process GWs that have evaluation results
    let evalData: EvaluationFile;
    try {
      const raw = await fs.readFile(evalPath, 'utf-8');
      evalData = JSON.parse(raw);
    } catch {
      continue; // No evaluation yet for this GW
    }

    // Read predictions to get league info per fixture
    let predictions: PredictionEntry[] = [];
    try {
      const raw = await fs.readFile(predPath, 'utf-8');
      predictions = JSON.parse(raw);
    } catch {
      // Continue without league breakdown
    }

    // Build fixtureId → league lookup
    const leagueLookup = new Map<number, string>();
    for (const p of predictions) {
      leagueLookup.set(p.fixtureId, p.league);
    }

    // Group evaluation matches by league
    const gwLeagueMap = new Map<string, { predictions: number; correctOutcomes: number; correctScores: number }>();

    for (const match of evalData.matches) {
      const league = leagueLookup.get(match.fixtureId) || 'Unknown';

      const entry = gwLeagueMap.get(league) || { predictions: 0, correctOutcomes: 0, correctScores: 0 };
      entry.predictions++;
      if (match.correct) entry.correctOutcomes++;
      if (match.scoreCorrect) entry.correctScores++;
      gwLeagueMap.set(league, entry);

      // Also accumulate into global league totals
      const globalEntry = leagueMap.get(league) || { predictions: 0, correctOutcomes: 0, correctScores: 0 };
      globalEntry.predictions++;
      if (match.correct) globalEntry.correctOutcomes++;
      if (match.scoreCorrect) globalEntry.correctScores++;
      leagueMap.set(league, globalEntry);
    }

    const gwLeagues: LeagueAccuracy[] = Array.from(gwLeagueMap.entries())
      .map(([name, stats]) => ({
        name,
        predictions: stats.predictions,
        correctOutcomes: stats.correctOutcomes,
        correctScores: stats.correctScores,
        outcomeAccuracy: stats.predictions > 0 ? stats.correctOutcomes / stats.predictions : 0,
        scoreAccuracy: stats.predictions > 0 ? stats.correctScores / stats.predictions : 0,
      }))
      .sort((a, b) => b.predictions - a.predictions);

    const { summary } = evalData;

    gameweeks.push({
      name: gw,
      date: evalData.evaluatedAt ? new Date(evalData.evaluatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
      totalPredictions: summary.matchedWithResults,
      correctOutcomes: summary.correctOutcomes,
      correctScores: summary.correctScores,
      outcomeAccuracy: summary.outcomeAccuracy,
      scoreAccuracy: summary.scoreAccuracy,
      leagues: gwLeagues,
    });
  }

  // Build cumulative totals
  let totalPredictions = 0;
  let correctOutcomes = 0;
  let correctScores = 0;
  for (const gw of gameweeks) {
    totalPredictions += gw.totalPredictions;
    correctOutcomes += gw.correctOutcomes;
    correctScores += gw.correctScores;
  }

  // Build league totals
  const leagueTotals: LeagueAccuracy[] = Array.from(leagueMap.entries())
    .map(([name, stats]) => ({
      name,
      predictions: stats.predictions,
      correctOutcomes: stats.correctOutcomes,
      correctScores: stats.correctScores,
      outcomeAccuracy: stats.predictions > 0 ? stats.correctOutcomes / stats.predictions : 0,
      scoreAccuracy: stats.predictions > 0 ? stats.correctScores / stats.predictions : 0,
    }))
    .sort((a, b) => b.predictions - a.predictions);

  return {
    cumulative: {
      totalPredictions,
      correctOutcomes,
      correctScores,
      outcomeAccuracy: totalPredictions > 0 ? correctOutcomes / totalPredictions : 0,
      scoreAccuracy: totalPredictions > 0 ? correctScores / totalPredictions : 0,
    },
    gameweeks: gameweeks.reverse(), // Most recent first
    leagueTotals,
  };
}
