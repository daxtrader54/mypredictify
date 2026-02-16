import { promises as fs } from 'fs';
import path from 'path';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Trophy, Check, X, Sparkles } from 'lucide-react';
import type { ProcessedFixture, ProcessedPrediction } from '@/lib/sportmonks/types';
import { getAvailableGameweeks, GW_BASE_DIR } from '@/lib/gameweeks';
import { loadResults } from '@/lib/results';
import { cn } from '@/lib/utils';
import { ResultsPagination } from './results-pagination';

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

interface ResultRow {
  fixture: ProcessedFixture;
  prediction?: ProcessedPrediction;
  accuracy: 'correct-score' | 'correct-result' | 'incorrect' | null;
}

interface GameweekResults {
  gameweek: number;
  rows: ResultRow[];
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

function getPredictionLabel(p: string): string {
  if (p === 'H' || p === 'Home Win') return 'H';
  if (p === 'A' || p === 'Away Win') return 'A';
  return 'D';
}

async function loadGameweekResults(gw: number): Promise<GameweekResults | null> {
  const gwDir = path.join(GW_BASE_DIR, `GW${gw}`);

  let matches: MatchData[];
  try {
    const raw = await fs.readFile(path.join(gwDir, 'matches.json'), 'utf-8');
    matches = JSON.parse(raw);
  } catch {
    return null;
  }

  const fixtureIds = matches.map((m) => m.fixtureId);
  const resultsMap = await loadResults(fixtureIds, gwDir);

  const finishedResults = Array.from(resultsMap.values()).filter((r) => r.status === 'finished');
  if (finishedResults.length === 0) return null;

  let predictionEntries: PredictionFileEntry[] = [];
  try {
    const raw = await fs.readFile(path.join(gwDir, 'predictions.json'), 'utf-8');
    predictionEntries = JSON.parse(raw);
  } catch {
    // No predictions — still show results
  }

  const predictionMap = new Map<number, ProcessedPrediction>();
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

  const rows: ResultRow[] = [];
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

    const prediction = predictionMap.get(match.fixtureId);
    let accuracy: ResultRow['accuracy'] = null;

    if (prediction?.advice) {
      const actualResult = getActualResult(result.homeGoals, result.awayGoals);

      if (prediction.predictedScore) {
        const [predHome, predAway] = prediction.predictedScore.split('-').map((s) => parseInt(s.trim()));
        if (predHome === result.homeGoals && predAway === result.awayGoals) {
          accuracy = 'correct-score';
          correctScore++;
        } else if (actualResult === prediction.advice) {
          accuracy = 'correct-result';
          correctResult++;
        } else {
          accuracy = 'incorrect';
          incorrect++;
        }
      } else if (actualResult === prediction.advice) {
        accuracy = 'correct-result';
        correctResult++;
      } else {
        accuracy = 'incorrect';
        incorrect++;
      }
    }

    rows.push({ fixture, prediction, accuracy });
  }

  rows.sort((a, b) => a.fixture.startTime.getTime() - b.fixture.startTime.getTime());

  return {
    gameweek: gw,
    rows,
    stats: { total: rows.length, correctResult, correctScore, incorrect },
  };
}

const GAMEWEEKS_PER_PAGE = 5;

export async function ResultsList({ page }: { page?: number }) {
  const gameweeks = await getAvailableGameweeks();

  const allResults: GameweekResults[] = [];
  for (const gw of gameweeks) {
    const result = await loadGameweekResults(gw);
    if (result && result.rows.length > 0) {
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

  // Pagination
  const currentPage = Math.max(1, page || 1);
  const totalPages = Math.ceil(allResults.length / GAMEWEEKS_PER_PAGE);
  const startIdx = (currentPage - 1) * GAMEWEEKS_PER_PAGE;
  const pageResults = allResults.slice(startIdx, startIdx + GAMEWEEKS_PER_PAGE);

  // Overall stats (all GWs, not just current page)
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
    <div className="space-y-6">
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

      {/* Per-gameweek tables */}
      {pageResults.map((gw) => {
        const gwPredicted = gw.stats.correctResult + gw.stats.correctScore + gw.stats.incorrect;
        const gwCorrect = gw.stats.correctResult + gw.stats.correctScore;
        const gwPct = gwPredicted > 0 ? ((gwCorrect / gwPredicted) * 100).toFixed(0) : '—';

        return (
          <div key={gw.gameweek} className="space-y-2">
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

            <div className="rounded-lg border border-border/50 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-border bg-muted/40">
                    <th className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">Match</th>
                    <th className="text-center py-2.5 px-2 text-[11px] uppercase tracking-wide font-semibold text-muted-foreground w-[70px]">Score</th>
                    <th className="text-center py-2.5 px-2 text-[11px] uppercase tracking-wide font-semibold text-muted-foreground w-[70px] hidden sm:table-cell">Predicted</th>
                    <th className="text-center py-2.5 px-2 text-[11px] uppercase tracking-wide font-semibold text-muted-foreground w-[50px] hidden md:table-cell">Tip</th>
                    <th className="text-center py-2.5 px-3 text-[11px] uppercase tracking-wide font-semibold text-muted-foreground w-[80px]">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {gw.rows.map((row, idx) => (
                    <tr
                      key={row.fixture.id}
                      className={cn(
                        'border-b border-border/30 last:border-0',
                        idx % 2 === 1 && 'bg-muted/20',
                        row.accuracy === 'correct-score' && 'border-l-4 border-l-amber-500',
                        row.accuracy === 'correct-result' && 'border-l-4 border-l-green-500',
                        row.accuracy === 'incorrect' && 'border-l-4 border-l-red-500',
                      )}
                    >
                      {/* Match */}
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {row.fixture.homeTeam.logo ? (
                              <Image
                                src={row.fixture.homeTeam.logo}
                                alt=""
                                width={18}
                                height={18}
                                className="rounded shrink-0"
                              />
                            ) : (
                              <span className="text-[10px] font-bold text-muted-foreground w-[18px] text-center shrink-0">
                                {row.fixture.homeTeam.shortCode}
                              </span>
                            )}
                            <span className="font-medium truncate">{row.fixture.homeTeam.name}</span>
                          </div>
                          <span className="text-muted-foreground text-xs shrink-0">vs</span>
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {row.fixture.awayTeam.logo ? (
                              <Image
                                src={row.fixture.awayTeam.logo}
                                alt=""
                                width={18}
                                height={18}
                                className="rounded shrink-0"
                              />
                            ) : (
                              <span className="text-[10px] font-bold text-muted-foreground w-[18px] text-center shrink-0">
                                {row.fixture.awayTeam.shortCode}
                              </span>
                            )}
                            <span className="font-medium truncate">{row.fixture.awayTeam.name}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground block mt-0.5">{row.fixture.leagueName}</span>
                      </td>

                      {/* Score */}
                      <td className="text-center py-2 px-2">
                        {row.fixture.score && (
                          <span className="font-bold text-base">
                            {row.fixture.score.home} - {row.fixture.score.away}
                          </span>
                        )}
                      </td>

                      {/* Predicted score */}
                      <td className="text-center py-2 px-2 hidden sm:table-cell">
                        {row.prediction?.predictedScore && (
                          <span className="text-muted-foreground font-mono">
                            {row.prediction.predictedScore}
                          </span>
                        )}
                      </td>

                      {/* Tip */}
                      <td className="text-center py-2 px-2 hidden md:table-cell">
                        {row.prediction?.advice && (
                          <span className={cn(
                            'text-xs font-semibold',
                            getPredictionLabel(row.prediction.advice) === 'H' && 'text-blue-500',
                            getPredictionLabel(row.prediction.advice) === 'A' && 'text-red-500',
                            getPredictionLabel(row.prediction.advice) === 'D' && 'text-muted-foreground',
                          )}>
                            {getPredictionLabel(row.prediction.advice)}
                          </span>
                        )}
                      </td>

                      {/* Result indicator */}
                      <td className="text-center py-2 px-3">
                        {row.accuracy === 'correct-score' ? (
                          <span className="inline-flex items-center gap-1 text-amber-500">
                            <Sparkles className="h-4 w-4" />
                            <span className="hidden sm:inline text-xs font-semibold">Exact</span>
                          </span>
                        ) : row.accuracy === 'correct-result' ? (
                          <span className="inline-flex items-center gap-1 text-green-500">
                            <Check className="h-4 w-4" />
                            <span className="hidden sm:inline text-xs font-semibold">Correct</span>
                          </span>
                        ) : row.accuracy === 'incorrect' ? (
                          <span className="inline-flex items-center gap-1 text-red-400">
                            <X className="h-4 w-4" />
                            <span className="hidden sm:inline text-xs font-semibold">Wrong</span>
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <ResultsPagination currentPage={currentPage} totalPages={totalPages} />
      )}
    </div>
  );
}
