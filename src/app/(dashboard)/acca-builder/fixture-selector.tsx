'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, CalendarOff } from 'lucide-react';
import { useAccaStore, type AccaSelection } from '@/stores/acca-store';
import { LEAGUES } from '@/config/leagues';
import { useCredits } from '@/hooks/use-credits';
import type { AccaFixture } from '@/lib/acca';

const MARKETS: { key: AccaMarket; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'draw', label: 'Draw' },
  { key: 'away', label: 'Away' },
  { key: 'btts_yes', label: 'BTTS Yes' },
  { key: 'btts_no', label: 'BTTS No' },
];

type AccaMarket = 'home' | 'draw' | 'away' | 'btts_yes' | 'btts_no';

function getOddsForMarket(fixture: AccaFixture, market: AccaMarket): number {
  if (market === 'home') return fixture.odds.home;
  if (market === 'draw') return fixture.odds.draw;
  if (market === 'away') return fixture.odds.away;
  // BTTS: derive fair odds from model probability (no bookmaker odds available)
  const prob = fixture.predictions[market];
  return prob > 0 ? Math.round((100 / prob) * 100) / 100 : 2.0;
}

function getProbForMarket(fixture: AccaFixture, market: AccaMarket): number {
  return fixture.predictions[market];
}

interface FixtureSelectorProps {
  fixtures: AccaFixture[];
}

export function FixtureSelector({ fixtures }: FixtureSelectorProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<number | null>(null);
  const { addSelection, removeSelection, getSelectionForFixture } = useAccaStore();
  const { tier } = useCredits();

  // Build unique date options from actual fixture kickoffs
  const dateOptions = useMemo(() => {
    const dateSet = new Map<string, string>();
    for (const f of fixtures) {
      const d = new Date(f.kickoff);
      const key = format(d, 'yyyy-MM-dd');
      if (!dateSet.has(key)) {
        const now = new Date();
        const today = format(now, 'yyyy-MM-dd');
        const tomorrow = format(new Date(now.getTime() + 86400000), 'yyyy-MM-dd');
        let label: string;
        if (key === today) label = 'Today';
        else if (key === tomorrow) label = 'Tomorrow';
        else label = format(d, 'EEE d MMM');
        dateSet.set(key, label);
      }
    }
    return Array.from(dateSet.entries()).map(([key, label]) => ({ key, label }));
  }, [fixtures]);

  // Leagues present in the real data
  const availableLeagues = useMemo(() => {
    const leagueIds = new Set(fixtures.map((f) => f.leagueId));
    return LEAGUES.filter(
      (league) =>
        leagueIds.has(league.id) && (tier !== 'free' || league.tier === 'free')
    );
  }, [fixtures, tier]);

  // Filter fixtures by selected date and league
  const filteredFixtures = useMemo(() => {
    return fixtures.filter((f) => {
      if (selectedDate && format(new Date(f.kickoff), 'yyyy-MM-dd') !== selectedDate) return false;
      if (selectedLeague && f.leagueId !== selectedLeague) return false;
      return true;
    });
  }, [fixtures, selectedDate, selectedLeague]);

  const handleSelectMarket = (fixture: AccaFixture, market: AccaMarket) => {
    const existingSelection = getSelectionForFixture(fixture.fixtureId);

    if (existingSelection?.market === market) {
      removeSelection(fixture.fixtureId, market);
    } else {
      const selection: AccaSelection = {
        fixtureId: fixture.fixtureId,
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        kickoff: fixture.kickoff,
        market,
        selection: getSelectionLabel(fixture, market),
        odds: getOddsForMarket(fixture, market),
        probability: getProbForMarket(fixture, market),
      };
      addSelection(selection);
    }
  };

  const getSelectionLabel = (fixture: AccaFixture, market: AccaMarket): string => {
    switch (market) {
      case 'home':
        return fixture.homeTeam + ' to win';
      case 'draw':
        return 'Draw';
      case 'away':
        return fixture.awayTeam + ' to win';
      case 'btts_yes':
        return 'Both teams to score';
      case 'btts_no':
        return 'Both teams NOT to score';
      default:
        return market;
    }
  };

  if (fixtures.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <CalendarOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Upcoming Fixtures</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              All current fixtures have kicked off. Check back when the next gameweek predictions are available.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date filters */}
      {dateOptions.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedDate === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedDate(null)}
          >
            All Dates
          </Button>
          {dateOptions.map((option) => (
            <Button
              key={option.key}
              variant={selectedDate === option.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedDate(option.key)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      )}

      {/* League filters */}
      <Tabs
        value={selectedLeague?.toString() || 'all'}
        onValueChange={(v) => setSelectedLeague(v === 'all' ? null : parseInt(v))}
      >
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">All Leagues</TabsTrigger>
          {availableLeagues.map((league) => (
            <TabsTrigger key={league.id} value={league.id.toString()}>
              {league.shortName}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filteredFixtures.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No fixtures match the selected filters
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredFixtures.map((fixture) => {
            const existingSelection = getSelectionForFixture(fixture.fixtureId);

            return (
              <Card key={fixture.fixtureId}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {fixture.homeTeam} vs {fixture.awayTeam}
                    </CardTitle>
                    <Badge variant="outline">{fixture.leagueName}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(fixture.kickoff), 'EEE, d MMM yyyy HH:mm')}
                    {fixture.predictedScore && (
                      <span className="ml-2 text-primary">
                        Predicted: {fixture.predictedScore}
                      </span>
                    )}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {MARKETS.map((market) => {
                      const isSelected = existingSelection?.market === market.key;
                      const probability = getProbForMarket(fixture, market.key);
                      const odds = getOddsForMarket(fixture, market.key);

                      return (
                        <Button
                          key={market.key}
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          className="flex flex-col h-auto py-2 relative"
                          onClick={() => handleSelectMarket(fixture, market.key)}
                        >
                          {isSelected && (
                            <Check className="absolute top-1 right-1 h-3 w-3" />
                          )}
                          <span className="text-xs font-normal">{market.label}</span>
                          <span className="font-bold">{odds.toFixed(2)}</span>
                          <span className="text-xs text-muted-foreground">
                            {probability}%
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
