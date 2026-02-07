'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, Coins, Lock } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCredits } from '@/hooks/use-credits';
import { CREDIT_COSTS } from '@/config/pricing';

export interface ValueBetData {
  fixtureId: number;
  league: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  bet: string;
  modelProb: number;
  impliedProb: number;
  odds: number;
  edge: number;
  predictedScore: string;
  confidence: number;
}

// Track revealed bets across all cards this session
const revealedBets = new Set<string>();

export function ValueBetCard({ vb }: { vb: ValueBetData }) {
  const betKey = `${vb.fixtureId}-${vb.bet}`;
  const [revealed, setRevealed] = useState(revealedBets.has(betKey));
  const [creditError, setCreditError] = useState<string | null>(null);
  const [deducting, setDeducting] = useState(false);
  const { data: session } = useSession();
  const { deductCredits, hasEnoughCredits } = useCredits();

  const handleReveal = useCallback(async () => {
    setCreditError(null);

    if (!session?.user) {
      setCreditError('Sign in to reveal value bets');
      return;
    }

    if (revealedBets.has(betKey)) {
      setRevealed(true);
      return;
    }

    if (!hasEnoughCredits(CREDIT_COSTS.VIEW_VALUE_BET)) {
      setCreditError('Not enough credits');
      return;
    }

    setDeducting(true);
    const result = await deductCredits(
      CREDIT_COSTS.VIEW_VALUE_BET,
      `View value bet: ${vb.homeTeam} vs ${vb.awayTeam} — ${vb.bet}`
    );
    setDeducting(false);

    if (result.success) {
      revealedBets.add(betKey);
      setRevealed(true);
    } else {
      setCreditError(result.error || 'Failed to deduct credits');
    }
  }, [session, betKey, vb, deductCredits, hasEnoughCredits]);

  return (
    <Card className="overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">{vb.league}</Badge>
          <div className="flex items-center gap-1 text-green-500 font-bold text-sm">
            <ArrowUpRight className="h-3.5 w-3.5" />
            +{(vb.edge * 100).toFixed(1)}% edge
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Always visible: teams + kickoff */}
        <div>
          <p className="font-semibold text-sm">
            {vb.homeTeam} vs {vb.awayTeam}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(vb.kickoff).toLocaleDateString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {revealed ? (
          <>
            {/* Revealed detail */}
            <div className="p-3 bg-gradient-to-br from-green-500/10 to-transparent rounded-xl border border-green-500/20">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Value Bet</p>
              <p className="text-lg font-bold text-green-500">{vb.bet}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Predicted score: {vb.predictedScore}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 bg-muted/50 rounded-lg">
                <p className="font-bold text-sm">{(vb.modelProb * 100).toFixed(0)}%</p>
                <p className="text-muted-foreground">Our Model</p>
              </div>
              <div className="p-2 bg-muted/50 rounded-lg">
                <p className="font-bold text-sm">{(vb.impliedProb * 100).toFixed(0)}%</p>
                <p className="text-muted-foreground">Bookmaker</p>
              </div>
              <div className="p-2 bg-muted/50 rounded-lg">
                <p className="font-bold text-sm">{vb.odds.toFixed(2)}</p>
                <p className="text-muted-foreground">Odds</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <Badge variant="secondary" className="text-xs">
                {(vb.confidence * 100).toFixed(0)}% confident
              </Badge>
            </div>
          </>
        ) : (
          <>
            {/* Blurred / locked detail */}
            <div className="relative p-3 bg-muted/30 rounded-xl border border-border/50">
              <div className="blur-sm select-none pointer-events-none" aria-hidden>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Value Bet</p>
                <p className="text-lg font-bold text-green-500">Home Win</p>
                <p className="text-xs text-muted-foreground mt-1">Predicted score: 2-1</p>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>

            <div className="relative grid grid-cols-3 gap-2 text-center text-xs">
              <div className="blur-sm select-none pointer-events-none" aria-hidden>
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="font-bold text-sm">62%</p>
                  <p className="text-muted-foreground">Our Model</p>
                </div>
              </div>
              <div className="blur-sm select-none pointer-events-none" aria-hidden>
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="font-bold text-sm">48%</p>
                  <p className="text-muted-foreground">Bookmaker</p>
                </div>
              </div>
              <div className="blur-sm select-none pointer-events-none" aria-hidden>
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="font-bold text-sm">2.10</p>
                  <p className="text-muted-foreground">Odds</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              {creditError && (
                <p className="text-xs text-destructive text-center">{creditError}</p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full border-green-500/30 hover:bg-green-500/10 hover:border-green-500/50"
                onClick={handleReveal}
                disabled={deducting}
              >
                {deducting ? 'Revealing...' : (
                  <>
                    Reveal Value Bet
                    <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                      <Coins className="h-3 w-3" />
                      {CREDIT_COSTS.VIEW_VALUE_BET}
                    </span>
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
