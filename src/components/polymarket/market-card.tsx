'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, DollarSign } from 'lucide-react';

interface MarketCardProps {
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  leagueName: string;
  polymarket: {
    homeWinProb: number;
    drawProb: number;
    awayWinProb: number;
    volume: number;
    liquidity: number;
  };
  bookmaker?: {
    homeWinProb: number;
    drawProb: number;
    awayWinProb: number;
  } | null;
  model?: {
    homeWinProb: number;
    drawProb: number;
    awayWinProb: number;
    prediction: string;
    confidence: number;
  } | null;
}

function ProbBar({ label, prob, comparison, className }: {
  label: string;
  prob: number;
  comparison?: number;
  className?: string;
}) {
  const pct = (prob * 100).toFixed(1);
  const diff = comparison ? (prob - comparison) * 100 : 0;
  const hasDiff = comparison !== undefined && Math.abs(diff) > 1;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1">
          <span className="font-mono font-semibold">{pct}%</span>
          {hasDiff && (
            <span className={cn(
              "text-[10px] font-mono",
              diff > 0 ? "text-green-500" : "text-red-500"
            )}>
              {diff > 0 ? '+' : ''}{diff.toFixed(1)}
            </span>
          )}
        </div>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary/60 rounded-full transition-all"
          style={{ width: `${Math.min(prob * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}

function ValueIndicator({ modelProb, marketProb }: { modelProb: number; marketProb: number }) {
  const diff = (modelProb - marketProb) * 100;
  if (Math.abs(diff) < 3) return null;

  const isValue = diff > 0;
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] px-1.5",
        isValue
          ? "border-green-500/30 text-green-500 bg-green-500/10"
          : "border-red-500/30 text-red-500 bg-red-500/10"
      )}
    >
      {isValue ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
      {isValue ? 'Value' : 'Overpriced'}
    </Badge>
  );
}

export function MarketCard({ homeTeam, awayTeam, kickoff, leagueName, polymarket, bookmaker, model }: MarketCardProps) {
  const kickoffDate = new Date(kickoff);
  const timeStr = kickoffDate.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }) + ' ' + kickoffDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const formatVolume = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  };

  return (
    <div className="border border-border/40 rounded-lg p-4 space-y-3 hover:border-border/80 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-sm">
            {homeTeam} <span className="text-muted-foreground">vs</span> {awayTeam}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {leagueName} &middot; {timeStr}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] px-1.5 gap-1">
            <DollarSign className="h-3 w-3" />
            {formatVolume(polymarket.volume)}
          </Badge>
        </div>
      </div>

      {/* 3-column comparison */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Polymarket</div>
          <div className="space-y-1 text-xs">
            <div className="font-mono">{(polymarket.homeWinProb * 100).toFixed(0)}%</div>
            <div className="font-mono text-muted-foreground">{(polymarket.drawProb * 100).toFixed(0)}%</div>
            <div className="font-mono">{(polymarket.awayWinProb * 100).toFixed(0)}%</div>
          </div>
        </div>
        {bookmaker && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Bookmaker</div>
            <div className="space-y-1 text-xs">
              <div className="font-mono">{(bookmaker.homeWinProb * 100).toFixed(0)}%</div>
              <div className="font-mono text-muted-foreground">{(bookmaker.drawProb * 100).toFixed(0)}%</div>
              <div className="font-mono">{(bookmaker.awayWinProb * 100).toFixed(0)}%</div>
            </div>
          </div>
        )}
        {model && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Our Model</div>
            <div className="space-y-1 text-xs">
              <div className="font-mono">{(model.homeWinProb * 100).toFixed(0)}%</div>
              <div className="font-mono text-muted-foreground">{(model.drawProb * 100).toFixed(0)}%</div>
              <div className="font-mono">{(model.awayWinProb * 100).toFixed(0)}%</div>
            </div>
          </div>
        )}
        {!bookmaker && !model && (
          <>
            <div className="flex items-center justify-center">
              <span className="text-xs text-muted-foreground">
                <Minus className="h-3 w-3" />
              </span>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-xs text-muted-foreground">
                <Minus className="h-3 w-3" />
              </span>
            </div>
          </>
        )}
      </div>

      {/* Labels */}
      <div className="grid grid-cols-3 gap-3 text-center text-[10px] text-muted-foreground -mt-1">
        <span>H / D / A</span>
        <span>H / D / A</span>
        <span>H / D / A</span>
      </div>

      {/* Probability bars */}
      <div className="space-y-2 pt-1 border-t border-border/30">
        <ProbBar label={homeTeam} prob={polymarket.homeWinProb} comparison={model?.homeWinProb} />
        <ProbBar label="Draw" prob={polymarket.drawProb} comparison={model?.drawProb} />
        <ProbBar label={awayTeam} prob={polymarket.awayWinProb} comparison={model?.awayWinProb} />
      </div>

      {/* Value indicators */}
      {model && (
        <div className="flex items-center gap-2 pt-1">
          <ValueIndicator modelProb={model.homeWinProb} marketProb={polymarket.homeWinProb} />
          <ValueIndicator modelProb={model.drawProb} marketProb={polymarket.drawProb} />
          <ValueIndicator modelProb={model.awayWinProb} marketProb={polymarket.awayWinProb} />
        </div>
      )}
    </div>
  );
}
