'use client';

import { useState, useCallback } from 'react';
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
import { Calendar, MapPin, Lock, TrendingUp, ArrowRight, Sparkles, Coins } from 'lucide-react';
import { format } from 'date-fns';
import type { ProcessedFixture, ProcessedPrediction } from '@/lib/sportmonks/types';
import { cn } from '@/lib/utils';
import { useCredits } from '@/hooks/use-credits';
import { CREDIT_COSTS } from '@/config/pricing';

interface PredictionCardProps {
  fixture: ProcessedFixture;
  prediction?: ProcessedPrediction;
  isLocked?: boolean;
}

// Track which predictions have been unlocked this session (shared across all cards)
const unlockedPredictions = new Set<number>();

export function PredictionCard({ fixture, prediction, isLocked = false }: PredictionCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [creditError, setCreditError] = useState<string | null>(null);
  const [deducting, setDeducting] = useState(false);
  const { data: session } = useSession();
  const { deductCredits, hasEnoughCredits } = useCredits();

  const handleViewDetails = useCallback(async () => {
    setCreditError(null);

    if (!session?.user) {
      setCreditError('Sign in to view prediction details');
      return;
    }

    // Already unlocked this session — open for free
    if (unlockedPredictions.has(fixture.id)) {
      setShowDetails(true);
      return;
    }

    if (!hasEnoughCredits(CREDIT_COSTS.VIEW_PREDICTION)) {
      setCreditError('Not enough credits');
      return;
    }

    setDeducting(true);
    const result = await deductCredits(
      CREDIT_COSTS.VIEW_PREDICTION,
      `View prediction: ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`
    );
    setDeducting(false);

    if (result.success) {
      unlockedPredictions.add(fixture.id);
      setShowDetails(true);
    } else {
      setCreditError(result.error || 'Failed to deduct credits');
    }
  }, [session, fixture, deductCredits, hasEnoughCredits]);

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

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-card to-card/50 border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
              <Calendar className="h-3 w-3" />
            </div>
            <span>{format(fixture.startTime, 'EEE, MMM d · HH:mm')}</span>
          </div>
          <Badge variant="outline" className="text-xs font-medium border-border/50">
            {fixture.leagueName}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Teams */}
        <div className="flex items-center justify-between py-2 overflow-hidden">
          {/* Home team */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {fixture.homeTeam.logo ? (
              <Image
                src={fixture.homeTeam.logo}
                alt={fixture.homeTeam.name}
                width={36}
                height={36}
                className="rounded-lg shrink-0"
              />
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

          {/* VS / Score / Predicted Score */}
          <div className="px-2 text-center shrink-0">
            {fixture.score ? (
              <div className="text-2xl font-bold">
                {fixture.score.home} - {fixture.score.away}
              </div>
            ) : prediction?.predictedScore ? (
              <div>
                <div className="text-lg font-bold text-primary">{prediction.predictedScore}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Predicted</div>
              </div>
            ) : (
              <div className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">VS</div>
            )}
          </div>

          {/* Away team */}
          <div className="flex items-center gap-2 flex-1 justify-end text-right min-w-0">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{fixture.awayTeam.name}</p>
              <p className="text-xs text-muted-foreground">Away</p>
            </div>
            {fixture.awayTeam.logo ? (
              <Image
                src={fixture.awayTeam.logo}
                alt={fixture.awayTeam.name}
                width={36}
                height={36}
                className="rounded-lg shrink-0"
              />
            ) : (
              <div className="w-9 h-9 shrink-0 bg-gradient-to-br from-red-500/20 to-red-500/5 rounded-lg flex items-center justify-center text-xs font-bold text-red-500 border border-red-500/20">
                {fixture.awayTeam.shortCode}
              </div>
            )}
          </div>
        </div>

        {/* Prediction probabilities */}
        {prediction && !isLocked ? (
          <div className="space-y-3">
            {/* Probability bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-blue-500">{prediction.homeWin.toFixed(0)}%</span>
                <span className="text-muted-foreground">{prediction.draw.toFixed(0)}%</span>
                <span className="text-red-500">{prediction.awayWin.toFixed(0)}%</span>
              </div>
              <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
                <div
                  className="bg-gradient-to-r from-blue-600 to-blue-500 transition-all"
                  style={{ width: `${prediction.homeWin}%` }}
                />
                <div
                  className="bg-gradient-to-r from-gray-500 to-gray-400 transition-all"
                  style={{ width: `${prediction.draw}%` }}
                />
                <div
                  className="bg-gradient-to-r from-red-500 to-red-600 transition-all"
                  style={{ width: `${prediction.awayWin}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Home</span>
                <span>Draw</span>
                <span>Away</span>
              </div>
            </div>

            {/* Advice and confidence */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <Badge variant={getAdviceBadgeVariant(prediction.advice)} className="gap-1">
                <TrendingUp className="h-3 w-3" />
                {prediction.advice}
              </Badge>
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
                getConfidenceBg(prediction.confidence),
                getConfidenceColor(prediction.confidence)
              )}>
                <Sparkles className="h-3 w-3" />
                {prediction.confidence.toFixed(0)}% confident
              </div>
            </div>
          </div>
        ) : isLocked ? (
          <div className="flex items-center justify-center py-6 rounded-lg bg-muted/50 border border-border/50">
            <Lock className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Upgrade to view predictions</span>
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

        {/* Venue */}
        {fixture.venue && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{fixture.venue}</span>
          </div>
        )}

        {/* View details button */}
        {prediction && !isLocked && (
          <Dialog open={showDetails} onOpenChange={setShowDetails}>
            <div className="space-y-1.5">
              {creditError && (
                <p className="text-xs text-destructive text-center">{creditError}</p>
              )}
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full group/btn border-border/50 hover:border-primary/50 hover:bg-primary/5"
                  onClick={handleViewDetails}
                  disabled={deducting}
                >
                  {deducting ? 'Unlocking...' : (
                    <>
                      View Details
                      {!unlockedPredictions.has(fixture.id) && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Coins className="h-3 w-3" />
                          {CREDIT_COSTS.VIEW_PREDICTION}
                        </span>
                      )}
                      <ArrowRight className="h-3 w-3 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </DialogTrigger>
            </div>
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
                {/* Predicted Score */}
                {prediction.predictedScore && (
                  <div className="p-4 bg-gradient-to-br from-primary/10 to-transparent rounded-xl border border-primary/20 text-center">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Predicted Score</p>
                    <p className="text-4xl font-bold text-primary">{prediction.predictedScore}</p>
                  </div>
                )}

                {/* Detailed prediction content */}
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
                          <span className="text-muted-foreground">Bookmaker Odds (40%)</span>
                          <div className="flex gap-3 font-mono text-xs">
                            <span className="text-blue-500">H {(prediction.modelComponents.odds.H * 100).toFixed(0)}%</span>
                            <span className="text-gray-400">D {(prediction.modelComponents.odds.D * 100).toFixed(0)}%</span>
                            <span className="text-red-500">A {(prediction.modelComponents.odds.A * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
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
