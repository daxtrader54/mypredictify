'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ShareButton } from '@/components/predictions/share-button';
import { Calendar, MapPin, Lock, TrendingUp, ArrowRight, Sparkles, Coins, Check, X, Target, Trophy, Globe } from 'lucide-react';
import { format } from 'date-fns';
import type { ProcessedFixture, ProcessedPrediction } from '@/lib/sportmonks/types';
import { cn } from '@/lib/utils';
import { useCredits } from '@/hooks/use-credits';
import { CREDIT_COSTS, isFreeForTier } from '@/config/pricing';

type ResultAccuracy = 'correct-score' | 'correct-result' | 'incorrect' | null;

function getActualResult(score: { home: number; away: number }): string {
  if (score.home > score.away) return 'Home Win';
  if (score.away > score.home) return 'Away Win';
  return 'Draw';
}

function getResultAccuracy(
  fixture: ProcessedFixture,
  prediction?: ProcessedPrediction
): ResultAccuracy {
  if (!fixture.score || !prediction?.advice) return null;
  if (fixture.status !== 'finished') return null;

  const actualResult = getActualResult(fixture.score);
  const predictedResult = prediction.advice;

  if (prediction.predictedScore) {
    const [predHome, predAway] = prediction.predictedScore.split('-').map((s) => parseInt(s.trim()));
    if (predHome === fixture.score.home && predAway === fixture.score.away) {
      return 'correct-score';
    }
  }

  if (actualResult === predictedResult) return 'correct-result';
  return 'incorrect';
}

const UNLOCKED_STORAGE_KEY = 'mypredictify:unlocked';

function getUnlockedSet(): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(UNLOCKED_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function persistUnlockedBatch(ids: number[]) {
  try {
    const set = getUnlockedSet();
    ids.forEach((id) => set.add(id));
    localStorage.setItem(UNLOCKED_STORAGE_KEY, JSON.stringify([...set]));
  } catch { /* quota exceeded — non-critical */ }
}

// Custom event for cross-card bulk unlock
const BULK_UNLOCK_EVENT = 'mypredictify:bulk-unlock';

function dispatchBulkUnlock() {
  window.dispatchEvent(new Event(BULK_UNLOCK_EVENT));
}

interface PredictionCardProps {
  fixture: ProcessedFixture;
  prediction?: ProcessedPrediction;
  gameweek?: number;
  /** All fixture IDs on this page (same league), for league bulk unlock */
  siblingFixtureIds?: number[];
  /** All fixture IDs across ALL leagues for this gameweek, for "all leagues" unlock */
  allGameweekFixtureIds?: number[];
}

export function PredictionCard({ fixture, prediction, gameweek, siblingFixtureIds, allGameweekFixtureIds }: PredictionCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [creditError, setCreditError] = useState<string | null>(null);
  const [deducting, setDeducting] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const { data: session } = useSession();
  const { tier, deductCredits, hasEnoughCredits } = useCredits();

  const isFree = isFreeForTier(tier, fixture.leagueId);

  useEffect(() => {
    if (isFree || getUnlockedSet().has(fixture.id)) {
      setUnlocked(true);
    }
  }, [isFree, fixture.id]);

  // Listen for bulk unlock events from sibling cards
  useEffect(() => {
    const handler = () => {
      if (getUnlockedSet().has(fixture.id)) {
        setUnlocked(true);
      }
    };
    window.addEventListener(BULK_UNLOCK_EVENT, handler);
    return () => window.removeEventListener(BULK_UNLOCK_EVENT, handler);
  }, [fixture.id]);

  const handleUnlockOne = useCallback(async () => {
    setCreditError(null);
    if (!session?.user) { setCreditError('Sign in to view predictions'); return; }
    if (isFree || unlocked) { setUnlocked(true); setUnlockModalOpen(false); return; }
    if (!hasEnoughCredits(CREDIT_COSTS.VIEW_PREDICTION)) { setCreditError('Not enough credits'); return; }

    setDeducting('one');
    const result = await deductCredits(
      CREDIT_COSTS.VIEW_PREDICTION,
      `View prediction: ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`
    );
    setDeducting(null);

    if (result.success) {
      persistUnlockedBatch([fixture.id]);
      setUnlocked(true);
      setUnlockModalOpen(false);
    } else {
      setCreditError(result.error || 'Failed to deduct credits');
    }
  }, [session, fixture, isFree, unlocked, deductCredits, hasEnoughCredits]);

  const handleUnlockLeague = useCallback(async () => {
    setCreditError(null);
    const ids = siblingFixtureIds || [fixture.id];
    if (!hasEnoughCredits(CREDIT_COSTS.REVEAL_LEAGUE_DASHBOARD)) { setCreditError('Not enough credits'); return; }

    setDeducting('league');
    const result = await deductCredits(
      CREDIT_COSTS.REVEAL_LEAGUE_DASHBOARD,
      `Reveal all ${fixture.leagueName} predictions`
    );
    setDeducting(null);

    if (result.success) {
      persistUnlockedBatch(ids);
      setUnlocked(true);
      setUnlockModalOpen(false);
      dispatchBulkUnlock();
    } else {
      setCreditError(result.error || 'Failed to deduct credits');
    }
  }, [fixture, siblingFixtureIds, deductCredits, hasEnoughCredits]);

  const handleUnlockAll = useCallback(async () => {
    setCreditError(null);
    // Use allGameweekFixtureIds (all leagues) if available, otherwise fall back to siblingFixtureIds
    const ids = allGameweekFixtureIds || siblingFixtureIds || [fixture.id];
    if (!hasEnoughCredits(CREDIT_COSTS.REVEAL_ALL_DASHBOARD)) { setCreditError('Not enough credits'); return; }

    setDeducting('all');
    const result = await deductCredits(
      CREDIT_COSTS.REVEAL_ALL_DASHBOARD,
      `Reveal all predictions`
    );
    setDeducting(null);

    if (result.success) {
      persistUnlockedBatch(ids);
      setUnlocked(true);
      setUnlockModalOpen(false);
      dispatchBulkUnlock();
    } else {
      setCreditError(result.error || 'Failed to deduct credits');
    }
  }, [fixture, allGameweekFixtureIds, siblingFixtureIds, deductCredits, hasEnoughCredits]);

  const handleViewDetails = useCallback(() => {
    setShowDetails(true);
  }, []);

  const getAdviceBadgeVariant = (advice?: string) => {
    if (!advice) return 'secondary';
    if (advice.includes('Home')) return 'default';
    if (advice.includes('Away')) return 'destructive';
    return 'secondary';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 60) return 'text-green-500';
    if (confidence >= 45) return 'text-yellow-500';
    return 'text-orange-500';
  };

  const getConfidenceBg = (confidence: number) => {
    if (confidence >= 60) return 'bg-green-500/10';
    if (confidence >= 45) return 'bg-yellow-500/10';
    return 'bg-orange-500/10';
  };

  const showPrediction = prediction && unlocked;
  const resultAccuracy = getResultAccuracy(fixture, prediction);

  const cardClasses = cn(
    "overflow-hidden transition-all group",
    resultAccuracy === 'correct-score'
      ? "bg-gradient-to-br from-amber-500/30 via-amber-500/15 to-amber-900/10 border-2 border-amber-500 shadow-lg shadow-amber-500/25 ring-1 ring-amber-500/30"
      : resultAccuracy === 'correct-result'
        ? "bg-gradient-to-br from-green-500/25 via-green-500/10 to-green-900/10 border-2 border-green-500 shadow-lg shadow-green-500/25 ring-1 ring-green-500/30"
        : resultAccuracy === 'incorrect'
          ? "bg-gradient-to-br from-red-500/20 via-red-500/10 to-red-900/10 border-2 border-red-500/60 shadow-md shadow-red-500/15"
          : "bg-gradient-to-br from-card to-card/50 border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
  );

  const lockedSiblingCount = siblingFixtureIds
    ? siblingFixtureIds.filter((id) => !getUnlockedSet().has(id) && !isFreeForTier(tier, fixture.leagueId)).length
    : 0;

  return (
    <Card className={cardClasses}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
              <Calendar className="h-3 w-3" />
            </div>
            <span>{format(fixture.startTime, 'EEE, MMM d · HH:mm')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-xs font-medium border-border/50">
              {fixture.leagueName}
            </Badge>
            {gameweek && (
              <ShareButton
                fixtureId={fixture.id}
                gameweek={gameweek}
                leagueId={fixture.leagueId}
                homeTeam={fixture.homeTeam.name}
                awayTeam={fixture.awayTeam.name}
              />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Teams */}
        <div className="flex items-center justify-between py-2 overflow-hidden">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {fixture.homeTeam.logo ? (
              <Image src={fixture.homeTeam.logo} alt={fixture.homeTeam.name} width={36} height={36} className="rounded-lg shrink-0" />
            ) : (
              <div className="w-9 h-9 shrink-0 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-lg flex items-center justify-center text-xs font-bold text-blue-500 border border-blue-500/20">
                {fixture.homeTeam.shortCode}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{fixture.homeTeam.name}</p>
              <p className="text-xs text-muted-foreground">Home</p>
            </div>
          </div>

          <div className="px-2 text-center shrink-0">
            {fixture.score ? (
              <div>
                <div className="text-2xl font-bold">{fixture.score.home} - {fixture.score.away}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">FT</div>
                {showPrediction && prediction?.predictedScore && (
                  <div className="mt-1">
                    <div className={cn(
                      "text-xs font-semibold",
                      resultAccuracy === 'correct-score' ? "text-amber-500" :
                      resultAccuracy === 'correct-result' ? "text-green-500" : "text-red-400"
                    )}>
                      {prediction.predictedScore}
                    </div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Predicted</div>
                  </div>
                )}
              </div>
            ) : showPrediction && prediction?.predictedScore ? (
              <div>
                <div className="text-lg font-bold text-primary">{prediction.predictedScore}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Predicted</div>
              </div>
            ) : (
              <div className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">VS</div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-1 justify-end text-right min-w-0">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{fixture.awayTeam.name}</p>
              <p className="text-xs text-muted-foreground">Away</p>
            </div>
            {fixture.awayTeam.logo ? (
              <Image src={fixture.awayTeam.logo} alt={fixture.awayTeam.name} width={36} height={36} className="rounded-lg shrink-0" />
            ) : (
              <div className="w-9 h-9 shrink-0 bg-gradient-to-br from-red-500/20 to-red-500/5 rounded-lg flex items-center justify-center text-xs font-bold text-red-500 border border-red-500/20">
                {fixture.awayTeam.shortCode}
              </div>
            )}
          </div>
        </div>

        {/* Prediction data — unlocked */}
        {showPrediction ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-blue-500">{prediction.homeWin.toFixed(0)}%</span>
                <span className="text-muted-foreground">{prediction.draw.toFixed(0)}%</span>
                <span className="text-red-500">{prediction.awayWin.toFixed(0)}%</span>
              </div>
              <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 transition-all" style={{ width: `${prediction.homeWin}%` }} />
                <div className="bg-gradient-to-r from-gray-500 to-gray-400 transition-all" style={{ width: `${prediction.draw}%` }} />
                <div className="bg-gradient-to-r from-red-500 to-red-600 transition-all" style={{ width: `${prediction.awayWin}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Home</span>
                <span>Draw</span>
                <span>Away</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <Badge variant={getAdviceBadgeVariant(prediction.advice)} className="gap-1">
                <TrendingUp className="h-3 w-3" />
                {prediction.advice}
              </Badge>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium cursor-help",
                    getConfidenceBg(prediction.confidence),
                    getConfidenceColor(prediction.confidence)
                  )}>
                    <Sparkles className="h-3 w-3" />
                    {prediction.confidence.toFixed(0)}% confident
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px]">
                  Based on the probability spread between outcomes. Higher confidence means one result is much more likely than others.
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        ) : prediction && !unlocked ? (
          <div className="relative">
            <div className="blur-sm select-none pointer-events-none" aria-hidden>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-blue-500">45%</span>
                  <span className="text-muted-foreground">28%</span>
                  <span className="text-red-500">27%</span>
                </div>
                <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
                  <div className="bg-blue-500 w-[45%]" />
                  <div className="bg-gray-500 w-[28%]" />
                  <div className="bg-red-500 w-[27%]" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 mt-2">
                <span className="text-sm font-medium">Home Win</span>
                <span className="text-xs">52% confident</span>
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Skeleton className="h-2.5 w-full rounded-full" />
            <div className="flex justify-between">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        )}

        {/* Result accuracy indicator */}
        {resultAccuracy && showPrediction && (
          <div className={cn(
            "flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold",
            resultAccuracy === 'correct-score'
              ? "bg-amber-500/25 text-amber-400 border border-amber-500/40"
              : resultAccuracy === 'correct-result'
                ? "bg-green-500/25 text-green-400 border border-green-500/40"
                : "bg-red-500/20 text-red-400 border border-red-500/30"
          )}>
            {resultAccuracy === 'correct-score' ? (
              <><Sparkles className="h-4 w-4" /> Exact Score!</>
            ) : resultAccuracy === 'correct-result' ? (
              <><Check className="h-4 w-4" /> Correct Result</>
            ) : (
              <><X className="h-4 w-4" /> Incorrect</>
            )}
          </div>
        )}

        {/* Venue */}
        {fixture.venue && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{fixture.venue}</span>
          </div>
        )}

        {/* Action button */}
        {prediction && (
          <>
            {unlocked ? (
              <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full group/btn border-border/50 hover:border-primary/50 hover:bg-primary/5"
                    onClick={handleViewDetails}
                  >
                    View Details
                    <ArrowRight className="h-3 w-3 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="text-xl">
                      {fixture.homeTeam.name} vs {fixture.awayTeam.name}
                    </DialogTitle>
                    <DialogDescription>
                      {format(fixture.startTime, 'EEEE, MMMM d, yyyy · HH:mm')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {prediction.predictedScore && (
                      <div className="p-4 bg-gradient-to-br from-primary/10 to-transparent rounded-xl border border-primary/20 text-center">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Predicted Score</p>
                        <p className="text-4xl font-bold text-primary">{prediction.predictedScore}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-4 bg-gradient-to-br from-blue-500/10 to-transparent rounded-xl border border-blue-500/20 text-center">
                        <p className="text-3xl font-bold text-blue-500">{prediction.homeWin.toFixed(1)}%</p>
                        <p className="text-sm text-muted-foreground mt-1">Home Win</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-gray-500/10 to-transparent rounded-xl border border-gray-500/20 text-center">
                        <p className="text-3xl font-bold text-gray-400">{prediction.draw.toFixed(1)}%</p>
                        <p className="text-sm text-muted-foreground mt-1">Draw</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-red-500/10 to-transparent rounded-xl border border-red-500/20 text-center">
                        <p className="text-3xl font-bold text-red-500">{prediction.awayWin.toFixed(1)}%</p>
                        <p className="text-sm text-muted-foreground mt-1">Away Win</p>
                      </div>
                    </div>
                    {prediction.btts && (
                      <div className="p-4 bg-muted/50 rounded-xl">
                        <h4 className="font-semibold mb-3">Both Teams to Score</h4>
                        <div className="flex gap-4">
                          <div className="flex-1 p-3 bg-green-500/10 rounded-lg text-center">
                            <span className="text-xl font-bold text-green-500">{prediction.btts.yes.toFixed(1)}%</span>
                            <p className="text-xs text-muted-foreground mt-1">Yes</p>
                          </div>
                          <div className="flex-1 p-3 bg-red-500/10 rounded-lg text-center">
                            <span className="text-xl font-bold text-red-500">{prediction.btts.no.toFixed(1)}%</span>
                            <p className="text-xs text-muted-foreground mt-1">No</p>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="p-4 bg-gradient-to-br from-primary/10 to-transparent rounded-xl border border-primary/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <h4 className="font-semibold">AI Recommendation</h4>
                      </div>
                      <Badge variant={getAdviceBadgeVariant(prediction.advice)} className="text-sm mb-3">
                        {prediction.advice}
                      </Badge>
                      <Progress value={prediction.confidence} className="h-2" />
                      <p className="text-sm text-muted-foreground mt-2">
                        {prediction.confidence.toFixed(0)}% confidence level
                      </p>
                      {prediction.explanation && (
                        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                          {prediction.explanation}
                        </p>
                      )}
                    </div>
                    {prediction.modelComponents && (
                      <div className="p-4 bg-muted/50 rounded-xl">
                        <h4 className="font-semibold mb-3">Model Breakdown</h4>
                        <div className="space-y-2">
                          {prediction.modelComponents.elo && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Elo Ratings (30%)</span>
                              <div className="flex gap-3 font-mono text-xs">
                                <span className="text-blue-500">H {(prediction.modelComponents.elo.H * 100).toFixed(0)}%</span>
                                <span className="text-gray-400">D {(prediction.modelComponents.elo.D * 100).toFixed(0)}%</span>
                                <span className="text-red-500">A {(prediction.modelComponents.elo.A * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          )}
                          {prediction.modelComponents.poisson && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Poisson Model (30%)</span>
                              <div className="flex gap-3 font-mono text-xs">
                                <span className="text-blue-500">H {(prediction.modelComponents.poisson.H * 100).toFixed(0)}%</span>
                                <span className="text-gray-400">D {(prediction.modelComponents.poisson.D * 100).toFixed(0)}%</span>
                                <span className="text-red-500">A {(prediction.modelComponents.poisson.A * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          )}
                          {prediction.modelComponents.odds && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Bookmaker Odds{prediction.modelComponents.polymarket ? '' : ' (40%)'}</span>
                              <div className="flex gap-3 font-mono text-xs">
                                <span className="text-blue-500">H {(prediction.modelComponents.odds.H * 100).toFixed(0)}%</span>
                                <span className="text-gray-400">D {(prediction.modelComponents.odds.D * 100).toFixed(0)}%</span>
                                <span className="text-red-500">A {(prediction.modelComponents.odds.A * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          )}
                          {prediction.modelComponents.polymarket && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Polymarket</span>
                              <div className="flex gap-3 font-mono text-xs">
                                <span className="text-blue-500">H {(prediction.modelComponents.polymarket.H * 100).toFixed(0)}%</span>
                                <span className="text-gray-400">D {(prediction.modelComponents.polymarket.D * 100).toFixed(0)}%</span>
                                <span className="text-red-500">A {(prediction.modelComponents.polymarket.A * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          )}
                          {prediction.modelComponents.blendedMarket && (
                            <div className="flex items-center justify-between text-sm border-t border-border/30 pt-2">
                              <span className="text-muted-foreground font-medium">Blended Market (40%)</span>
                              <div className="flex gap-3 font-mono text-xs">
                                <span className="text-blue-500">H {(prediction.modelComponents.blendedMarket.H * 100).toFixed(0)}%</span>
                                <span className="text-gray-400">D {(prediction.modelComponents.blendedMarket.D * 100).toFixed(0)}%</span>
                                <span className="text-red-500">A {(prediction.modelComponents.blendedMarket.A * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              /* Unlock button — opens tiered modal */
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-primary/30 hover:bg-primary/10 hover:border-primary/50"
                  onClick={() => setUnlockModalOpen(true)}
                >
                  <Lock className="h-3 w-3 mr-1.5" />
                  Unlock Prediction
                  {!isFree && (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                      <Coins className="h-3 w-3" />
                      {CREDIT_COSTS.VIEW_PREDICTION}
                    </span>
                  )}
                </Button>
                <Dialog open={unlockModalOpen} onOpenChange={setUnlockModalOpen}>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle className="text-base">Unlock Predictions</DialogTitle>
                      <DialogDescription>
                        {fixture.homeTeam.name} vs {fixture.awayTeam.name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-between h-auto py-3 px-4"
                        onClick={handleUnlockOne}
                        disabled={deducting !== null}
                      >
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-blue-500 shrink-0" />
                          <span className="text-sm font-medium">This match</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Coins className="h-3 w-3" />
                          <span className="font-semibold">{CREDIT_COSTS.VIEW_PREDICTION}</span>
                          {deducting === 'one' && <span className="ml-1 animate-pulse">...</span>}
                        </div>
                      </Button>

                      {lockedSiblingCount > 1 && (
                        <Button
                          variant="outline"
                          className="w-full justify-between h-auto py-3 px-4"
                          onClick={handleUnlockLeague}
                          disabled={deducting !== null}
                        >
                          <div className="flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
                            <div className="text-left">
                              <span className="text-sm font-medium block">All {fixture.leagueName}</span>
                              <span className="text-[11px] text-muted-foreground">{lockedSiblingCount} matches</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Coins className="h-3 w-3" />
                            <span className="font-semibold">{CREDIT_COSTS.REVEAL_LEAGUE_DASHBOARD}</span>
                            {deducting === 'league' && <span className="ml-1 animate-pulse">...</span>}
                          </div>
                        </Button>
                      )}

                      {lockedSiblingCount > 1 && (
                        <Button
                          variant="outline"
                          className="w-full justify-between h-auto py-3 px-4"
                          onClick={handleUnlockAll}
                          disabled={deducting !== null}
                        >
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-green-500 shrink-0" />
                            <div className="text-left">
                              <span className="text-sm font-medium block">All leagues</span>
                              <span className="text-[11px] text-muted-foreground">All upcoming matches</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Coins className="h-3 w-3" />
                            <span className="font-semibold">{CREDIT_COSTS.REVEAL_ALL_DASHBOARD}</span>
                            {deducting === 'all' && <span className="ml-1 animate-pulse">...</span>}
                          </div>
                        </Button>
                      )}

                      {creditError && (
                        <p className="text-xs text-destructive text-center pt-1">{creditError}</p>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function PredictionCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-20" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-6 w-8" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
        <Skeleton className="h-2 w-full" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}
