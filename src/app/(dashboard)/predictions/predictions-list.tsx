import { promises as fs } from 'fs';
import path from 'path';
import { PredictionCard } from '@/components/predictions/prediction-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Calendar } from 'lucide-react';
import type { ProcessedFixture, ProcessedPrediction } from '@/lib/sportmonks/types';
import { getAvailableGameweeks, GW_BASE_DIR } from '@/lib/gameweeks';

interface PredictionsListProps {
  leagueId: number;
  gameweek?: number;
}

interface MatchData {
  fixtureId: number;
  league: { id: number; name: string };
  round: number;
  homeTeam: { id: number; name: string; shortCode: string; logo: string };
  awayTeam: { id: number; name: string; shortCode: string; logo: string };
  kickoff: string;
  venue: string;
  odds?: { home: number; draw: number; away: number; bookmaker: string };
}

interface PredictionFileEntry {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  predictedScore: string;
  prediction: string;
  confidence: number;
  explanation: string;
  modelComponents?: {
    elo?: { H: number; D: number; A: number };
    poisson?: { H: number; D: number; A: number };
    odds?: { H: number; D: number; A: number } | null;
    btts?: { yes: number; no: number };
  };
}

export { getAvailableGameweeks } from '@/lib/gameweeks';

async function getGameweekDir(gwNumber?: number): Promise<string | null> {
  try {
    const available = await getAvailableGameweeks();
    if (available.length === 0) return null;
    const target = gwNumber && available.includes(gwNumber) ? gwNumber : available[0];
    return path.join(GW_BASE_DIR, `GW${target}`);
  } catch {
    return null;
  }
}

function oddsToProb(odds: { home: number; draw: number; away: number }): {
  homeWin: number;
  draw: number;
  awayWin: number;
} {
  const rawH = 1 / odds.home;
  const rawD = 1 / odds.draw;
  const rawA = 1 / odds.away;
  const total = rawH + rawD + rawA;
  return {
    homeWin: Math.round((rawH / total) * 100),
    draw: Math.round((rawD / total) * 100),
    awayWin: Math.round((rawA / total) * 100),
  };
}

interface ResultData {
  fixtureId: number;
  homeGoals: number;
  awayGoals: number;
  status: 'finished' | 'live' | 'postponed';
}

function deriveAdvice(homeWin: number, draw: number, awayWin: number): string {
  if (homeWin >= awayWin && homeWin >= draw) return 'Home Win';
  if (awayWin >= homeWin && awayWin >= draw) return 'Away Win';
  return 'Draw';
}

async function getFixturesWithPredictions(leagueId: number, gwNumber?: number): Promise<{
  fixtures: ProcessedFixture[];
  predictions: Map<number, ProcessedPrediction>;
  error?: string;
}> {
  const gwDir = await getGameweekDir(gwNumber);
  if (!gwDir) {
    return { fixtures: [], predictions: new Map(), error: 'No gameweek data found' };
  }

  let matches: MatchData[] = [];
  try {
    const raw = await fs.readFile(path.join(gwDir, 'matches.json'), 'utf-8');
    matches = JSON.parse(raw);
  } catch {
    return { fixtures: [], predictions: new Map(), error: 'Failed to load match data' };
  }

  const leagueMatches = matches.filter((m) => m.league.id === leagueId);

  // Load results if available
  let resultsMap = new Map<number, ResultData>();
  try {
    const resultsRaw = await fs.readFile(path.join(gwDir, 'results.json'), 'utf-8');
    const results: ResultData[] = JSON.parse(resultsRaw);
    resultsMap = new Map(results.map((r) => [r.fixtureId, r]));
  } catch {
    // No results file yet
  }

  const now = new Date();

  const fixtures: ProcessedFixture[] = leagueMatches.map((m) => {
    const result = resultsMap.get(m.fixtureId);
    const kickoff = new Date(m.kickoff);
    let status: ProcessedFixture['status'] = 'upcoming';
    let score: ProcessedFixture['score'] = undefined;

    if (result) {
      status = result.status;
      if (result.status === 'finished' || result.status === 'live') {
        score = { home: result.homeGoals, away: result.awayGoals };
      }
    } else if (kickoff < now) {
      // Kickoff has passed but no result yet — mark as finished (pending result sync)
      status = 'finished';
    }

    return {
      id: m.fixtureId,
      leagueId: m.league.id,
      leagueName: m.league.name,
      homeTeam: {
        id: m.homeTeam.id,
        name: m.homeTeam.name,
        shortCode: m.homeTeam.shortCode,
        logo: m.homeTeam.logo,
      },
      awayTeam: {
        id: m.awayTeam.id,
        name: m.awayTeam.name,
        shortCode: m.awayTeam.shortCode,
        logo: m.awayTeam.logo,
      },
      startTime: kickoff,
      status,
      score,
      venue: m.venue,
    };
  });

  fixtures.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const predictions = new Map<number, ProcessedPrediction>();

  // Try to read pipeline-generated predictions first
  try {
    const raw = await fs.readFile(path.join(gwDir, 'predictions.json'), 'utf-8');
    const preds: PredictionFileEntry[] = JSON.parse(raw);
    preds.forEach((p) => {
      if (matches.find((m) => m.fixtureId === p.fixtureId && m.league.id === leagueId)) {
        const advice =
          p.prediction === 'H' ? 'Home Win' : p.prediction === 'A' ? 'Away Win' : 'Draw';
        predictions.set(p.fixtureId, {
          homeWin: p.homeWinProb * 100,
          draw: p.drawProb * 100,
          awayWin: p.awayWinProb * 100,
          predictedScore: p.predictedScore,
          advice,
          confidence: p.confidence * 100,
          explanation: p.explanation,
          btts: p.modelComponents?.btts
            ? { yes: p.modelComponents.btts.yes, no: p.modelComponents.btts.no }
            : undefined,
          modelComponents: p.modelComponents
            ? {
                elo: p.modelComponents.elo,
                poisson: p.modelComponents.poisson,
                odds: p.modelComponents.odds,
              }
            : undefined,
        });
      }
    });
  } catch {
    // No predictions.json — fall back to odds-derived predictions
    leagueMatches.forEach((m) => {
      if (m.odds && m.odds.home > 0) {
        const probs = oddsToProb(m.odds);
        predictions.set(m.fixtureId, {
          homeWin: probs.homeWin,
          draw: probs.draw,
          awayWin: probs.awayWin,
          advice: deriveAdvice(probs.homeWin, probs.draw, probs.awayWin),
          confidence: Math.max(probs.homeWin, probs.draw, probs.awayWin),
        });
      }
    });
  }

  return { fixtures, predictions };
}

export async function PredictionsList({ leagueId, gameweek }: PredictionsListProps) {
  const { fixtures, predictions, error } = await getFixturesWithPredictions(leagueId, gameweek);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading predictions</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (fixtures.length === 0) {
    return (
      <Alert>
        <Calendar className="h-4 w-4" />
        <AlertTitle>No fixtures for this gameweek</AlertTitle>
        <AlertDescription>
          There are no fixtures for this league in this gameweek. Try a different league or
          gameweek.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {fixtures.map((fixture) => (
        <PredictionCard
          key={fixture.id}
          fixture={fixture}
          prediction={predictions.get(fixture.id)}
        />
      ))}
    </div>
  );
}
