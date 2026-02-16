import { promises as fs } from 'fs';
import path from 'path';
import { PredictionCard } from '@/components/predictions/prediction-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Calendar } from 'lucide-react';
import type { ProcessedFixture, ProcessedPrediction } from '@/lib/sportmonks/types';
import { getAvailableGameweeks, GW_BASE_DIR } from '@/lib/gameweeks';
import { loadResults } from '@/lib/results';

interface PredictionsListProps {
  leagueId: number;
  gameweek?: number;
  hideCompleted?: boolean;
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
  if (gwNumber) {
    // Return the path for the requested GW directly — even if no data exists yet
    return path.join(GW_BASE_DIR, `GW${gwNumber}`);
  }
  try {
    const available = await getAvailableGameweeks();
    if (available.length === 0) return null;
    return path.join(GW_BASE_DIR, `GW${available[0]}`);
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
    // No data for this gameweek yet — show empty state (not an error)
    return { fixtures: [], predictions: new Map() };
  }

  const leagueMatches = matches.filter((m) => m.league.id === leagueId);

  // Load results from DB + file fallback
  const fixtureIds = leagueMatches.map((m) => m.fixtureId);
  const resultsMap = await loadResults(fixtureIds, gwDir);

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

export async function PredictionsList({ leagueId, gameweek, hideCompleted }: PredictionsListProps) {
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
        <AlertTitle>No predictions yet for this gameweek</AlertTitle>
        <AlertDescription>
          Predictions for this gameweek haven&apos;t been generated yet. Check back soon or try a
          different gameweek.
        </AlertDescription>
      </Alert>
    );
  }

  const upcoming = fixtures
    .filter((f) => f.status === 'upcoming')
    .sort((a, b) => {
      const confA = predictions.get(a.id)?.confidence ?? 0;
      const confB = predictions.get(b.id)?.confidence ?? 0;
      if (confB !== confA) return confB - confA;
      return a.startTime.getTime() - b.startTime.getTime();
    });
  const completed = fixtures.filter((f) => f.status !== 'upcoming');

  // When hideCompleted is on and there are no upcoming fixtures
  if (hideCompleted && upcoming.length === 0) {
    return (
      <Alert>
        <Calendar className="h-4 w-4" />
        <AlertTitle>All matches completed</AlertTitle>
        <AlertDescription>
          All {completed.length} match{completed.length !== 1 ? 'es' : ''} in this gameweek have
          been completed. Turn off &quot;Hide Completed&quot; to see results, or navigate to the
          next gameweek.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Upcoming ({upcoming.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((fixture) => (
              <PredictionCard
                key={fixture.id}
                fixture={fixture}
                prediction={predictions.get(fixture.id)}
                gameweek={gameweek}
              />
            ))}
          </div>
        </div>
      )}

      {!hideCompleted && completed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Completed ({completed.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {completed.map((fixture) => (
              <PredictionCard
                key={fixture.id}
                fixture={fixture}
                prediction={predictions.get(fixture.id)}
                gameweek={gameweek}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
