'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MarketCard } from '@/components/polymarket/market-card';
import { BarChart3 } from 'lucide-react';

interface MarketEntry {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  leagueId: number;
  leagueName: string;
  polymarket: {
    homeWinProb: number;
    drawProb: number;
    awayWinProb: number;
    volume: number;
    liquidity: number;
  };
  model: {
    homeWinProb: number;
    drawProb: number;
    awayWinProb: number;
    prediction: string;
    confidence: number;
  } | null;
}

interface League {
  id: number;
  name: string;
  shortName: string;
  flag: string;
}

export function PolymarketContent({ markets, leagues }: { markets: MarketEntry[]; leagues: League[] }) {
  const [activeLeague, setActiveLeague] = useState<number | null>(null);

  const filtered = activeLeague
    ? markets.filter((m) => m.leagueId === activeLeague)
    : markets;

  // Get leagues that have market data
  const leaguesWithData = new Set(markets.map((m) => m.leagueId));

  return (
    <div className="space-y-4">
      {/* League filter */}
      <div className="flex gap-1 flex-wrap">
        <Button
          variant={activeLeague === null ? 'default' : 'ghost'}
          size="sm"
          className="h-7 px-2.5 text-xs"
          onClick={() => setActiveLeague(null)}
        >
          All Leagues
        </Button>
        {leagues
          .filter((l) => leaguesWithData.has(l.id))
          .map((league) => (
            <Button
              key={league.id}
              variant={activeLeague === league.id ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setActiveLeague(league.id)}
            >
              {league.flag} {league.shortName}
            </Button>
          ))}
      </div>

      {/* Markets grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <BarChart3 className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            {markets.length === 0
              ? 'No Polymarket data available. Markets will appear after the next sync.'
              : 'No markets found for this league filter.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((market) => (
            <MarketCard
              key={market.fixtureId}
              homeTeam={market.homeTeam}
              awayTeam={market.awayTeam}
              kickoff={market.kickoff}
              leagueName={market.leagueName}
              polymarket={market.polymarket}
              model={market.model}
            />
          ))}
        </div>
      )}
    </div>
  );
}
