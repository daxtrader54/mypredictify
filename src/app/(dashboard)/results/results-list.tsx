import { promises as fs } from 'fs';
import path from 'path';
import { PredictionCard } from '@/components/predictions/prediction-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Trophy, Check } from 'lucide-react';
import type { ProcessedFixture, ProcessedPrediction } from '@/lib/sportmonks/types';
import { getAvailableGameweeks, GW_BASE_DIR } from '@/lib/gameweeks';
import { loadResults } from '@/lib/results';

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

interface GameweekResults {
  gameweek: number;
  fixtures: ProcessedFixture[];
  predictions: Map<number, ProcessedPrediction>;
  stats: {
    total: number;
    correctResult: number;
    correctScore: number;
    incorrect: number;
  };
}

function getActualResult(home: number, away: number): string {
  if (home > away) return 'Home Win';
  if (away > home) return 'Away Win';
  return 'Draw';
}

async function loadGameweekResults(gw: number): Promise<GameweekResults | null> {
  const gwDir = path.join(GW_BASE_DIR, `GW${gw}`);

  // Load matches
  let matches: MatchData[];
  try {
    const raw = await fs.readFile(path.join(gwDir, 'matches.json'), 'utf-8');
    matches = JSON.parse(raw);
  } catch {
    return null;
  }

  // Load results from DB + file fallback
  const fixtureIds = matches.map((m) => m.fixtureId);
  const resultsMap = await loadResults(fixtureIds, gwDir);

  // Only include if there are finished matches
  const finishedResults = Array.from(resultsMap.values()).filter((r) => r.status === 'finished');
  if (finishedResults.length === 0) return null;

  // Load predictions
  let predictionEntries: PredictionFileEntry[] = [];
  try {
    const raw = await fs.readFile(path.join(gwDir, 'predictions.json'), 'utf-8');
    predictionEntries = JSON.parse(raw);
  } catch {
    // No predictions — still show results
  }

  const predictionMap = new Map<number, ProcessedPrediction>();

  // Build predictions map
  for (const p of predictionEntries) {
    const advice =
      p.prediction === 'H' ? 'Home Win' : p.prediction === 'A' ? 'Away Win' : 'Draw';
    predictionMap.set(p.fixtureId, {
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

  // Build fixtures for finished matches only
  const fixtures: ProcessedFixture[] = [];
  let correctResult = 0;
  let correctScore = 0;
  let incorrect = 0;

  for (const match of matches) {
    const result = resultsMap.get(match.fixtureId);
    if (!result || result.status !== 'finished') continue;

    const fixture: ProcessedFixture = {
      id: match.fixtureId,
      leagueId: match.league.id,
      leagueName: match.league.name,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      startTime: new Date(match.kickoff),
      status: 'finished',
      score: { home: result.homeGoals, away: result.awayGoals },
      venue: match.venue,
    };

    fixtures.push(fixture);

    // Compute accuracy
    const prediction = predictionMap.get(match.fixtureId);
    if (prediction?.advice) {
      const actualResult = getActualResult(result.homeGoals, result.awayGoals);

      // Check exact score
      if (prediction.predictedScore) {
        const [predHome, predAway] = prediction.predictedScore.split('-').map((s) => parseInt(s.trim()));
        if (predHome === result.homeGoals && predAway === result.awayGoals) {
          correctScore++;
          continue;
        }
      }

      if (actualResult === prediction.advice) {
        correctResult++;
      } else {
        incorrect++;
      }
    }
  }

  fixtures.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  return {
    gameweek: gw,
    fixtures,
    predictions: predictionMap,
    stats: {
      total: fixtures.length,
      correctResult,
      correctScore,
      incorrect,
    },
  };
}

export async function ResultsList() {
  const gameweeks = await getAvailableGameweeks(); // already sorted newest first

  const allResults: GameweekResults[] = [];
  for (const gw of gameweeks) {
    const result = await loadGameweekResults(gw);
    if (result && result.fixtures.length > 0) {
      allResults.push(result);
    }
  }

  if (allResults.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No results yet</AlertTitle>
        <AlertDescription>
          Match results will appear here once gameweeks have been completed and results synced.
        </AlertDescription>
      </Alert>
    );
  }

  // Overall stats
  const totals = allResults.reduce(
    (acc, gw) => ({
      total: acc.total + gw.stats.total,
      correctResult: acc.correctResult + gw.stats.correctResult,
      correctScore: acc.correctScore + gw.stats.correctScore,
      incorrect: acc.incorrect + gw.stats.incorrect,
    }),
    { total: 0, correctResult: 0, correctScore: 0, incorrect: 0 }
  );
  const predicted = totals.correctResult + totals.correctScore + totals.incorrect;
  const correct = totals.correctResult + totals.correctScore;
  const accuracyPct = predicted > 0 ? ((correct / predicted) * 100).toFixed(1) : '—';

  return (
    <div className="space-y-8">
      {/* Overall summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-muted/50 border border-border/50 p-4 text-center">
          <p className="text-2xl font-bold">{totals.total}</p>
          <p className="text-xs text-muted-foreground mt-1">Matches Played</p>
        </div>
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-500">{accuracyPct}%</p>
          <p className="text-xs text-muted-foreground mt-1">Result Accuracy</p>
        </div>
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{totals.correctScore}</p>
          <p className="text-xs text-muted-foreground mt-1">Exact Scores</p>
        </div>
        <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-center">
          <p className="text-2xl font-bold text-green-500">{correct}</p>
          <p className="text-xs text-muted-foreground mt-1">Correct Results</p>
        </div>
      </div>

      {/* Per-gameweek results */}
      {allResults.map((gw) => {
        const gwPredicted = gw.stats.correctResult + gw.stats.correctScore + gw.stats.incorrect;
        const gwCorrect = gw.stats.correctResult + gw.stats.correctScore;
        const gwPct = gwPredicted > 0 ? ((gwCorrect / gwPredicted) * 100).toFixed(0) : '—';

        return (
          <div key={gw.gameweek} className="space-y-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold">Gameweek {gw.gameweek}</h2>
              <Badge
                variant="outline"
                className={
                  parseFloat(gwPct) >= 60
                    ? 'border-emerald-500/50 text-emerald-500'
                    : parseFloat(gwPct) >= 40
                      ? 'border-yellow-500/50 text-yellow-500'
                      : 'border-red-500/50 text-red-500'
                }
              >
                {gwPct !== '—' ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    {gwCorrect}/{gwPredicted} ({gwPct}%)
                  </>
                ) : (
                  `${gw.stats.total} matches`
                )}
              </Badge>
              {gw.stats.correctScore > 0 && (
                <Badge variant="outline" className="border-amber-500/50 text-amber-500">
                  <Trophy className="h-3 w-3 mr-1" />
                  {gw.stats.correctScore} exact
                </Badge>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {gw.fixtures.map((fixture) => (
                <PredictionCard
                  key={fixture.id}
                  fixture={fixture}
                  prediction={gw.predictions.get(fixture.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
