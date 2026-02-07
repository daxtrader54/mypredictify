'use client';

import { useState, useMemo } from 'react';
import { format, addDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check } from 'lucide-react';
import { useAccaStore, type BetMarket, type AccaSelection } from '@/stores/acca-store';
import { LEAGUES } from '@/config/leagues';
import { useCredits } from '@/hooks/use-credits';

interface Fixture {
  id: number;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  leagueId: number;
  predictions: {
    home: number;
    draw: number;
    away: number;
    btts_yes: number;
    btts_no: number;
    over_2_5: number;
    under_2_5: number;
  };
  odds: {
    home: number;
    draw: number;
    away: number;
    btts_yes: number;
    btts_no: number;
    over_2_5: number;
    under_2_5: number;
  };
}

const MARKETS: { key: BetMarket; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'draw', label: 'Draw' },
  { key: 'away', label: 'Away' },
  { key: 'btts_yes', label: 'BTTS Yes' },
  { key: 'btts_no', label: 'BTTS No' },
  { key: 'over_2_5', label: 'Over 2.5' },
  { key: 'under_2_5', label: 'Under 2.5' },
];

// Mock fixtures data - move outside component to avoid re-creation
const MOCK_FIXTURES: Fixture[] = [
  {
    id: 1,
    homeTeam: 'Arsenal',
    awayTeam: 'Chelsea',
    kickoff: new Date(Date.now() + 86400000).toISOString(),
    leagueId: 8,
    predictions: { home: 52, draw: 26, away: 22, btts_yes: 62, btts_no: 38, over_2_5: 58, under_2_5: 42 },
    odds: { home: 1.75, draw: 3.60, away: 4.50, btts_yes: 1.72, btts_no: 2.05, over_2_5: 1.80, under_2_5: 2.00 },
  },
  {
    id: 2,
    homeTeam: 'Manchester City',
    awayTeam: 'Liverpool',
    kickoff: new Date(Date.now() + 86400000).toISOString(),
    leagueId: 8,
    predictions: { home: 45, draw: 28, away: 27, btts_yes: 68, btts_no: 32, over_2_5: 72, under_2_5: 28 },
    odds: { home: 2.10, draw: 3.40, away: 3.20, btts_yes: 1.55, btts_no: 2.35, over_2_5: 1.50, under_2_5: 2.50 },
  },
  {
    id: 3,
    homeTeam: 'Manchester United',
    awayTeam: 'Tottenham',
    kickoff: new Date(Date.now() + 172800000).toISOString(),
    leagueId: 8,
    predictions: { home: 38, draw: 32, away: 30, btts_yes: 58, btts_no: 42, over_2_5: 55, under_2_5: 45 },
    odds: { home: 2.40, draw: 3.30, away: 2.90, btts_yes: 1.80, btts_no: 1.95, over_2_5: 1.85, under_2_5: 1.95 },
  },
  {
    id: 10,
    homeTeam: 'Real Madrid',
    awayTeam: 'Barcelona',
    kickoff: new Date(Date.now() + 86400000).toISOString(),
    leagueId: 564,
    predictions: { home: 40, draw: 30, away: 30, btts_yes: 65, btts_no: 35, over_2_5: 60, under_2_5: 40 },
    odds: { home: 2.30, draw: 3.40, away: 2.80, btts_yes: 1.65, btts_no: 2.15, over_2_5: 1.75, under_2_5: 2.05 },
  },
  {
    id: 20,
    homeTeam: 'Bayern Munich',
    awayTeam: 'Dortmund',
    kickoff: new Date(Date.now() + 172800000).toISOString(),
    leagueId: 82,
    predictions: { home: 58, draw: 24, away: 18, btts_yes: 70, btts_no: 30, over_2_5: 75, under_2_5: 25 },
    odds: { home: 1.55, draw: 4.20, away: 5.50, btts_yes: 1.50, btts_no: 2.45, over_2_5: 1.40, under_2_5: 2.80 },
  },
  {
    id: 30,
    homeTeam: 'Juventus',
    awayTeam: 'AC Milan',
    kickoff: new Date(Date.now() + 259200000).toISOString(),
    leagueId: 384,
    predictions: { home: 44, draw: 30, away: 26, btts_yes: 55, btts_no: 45, over_2_5: 52, under_2_5: 48 },
    odds: { home: 2.15, draw: 3.25, away: 3.40, btts_yes: 1.85, btts_no: 1.90, over_2_5: 1.90, under_2_5: 1.90 },
  },
  {
    id: 40,
    homeTeam: 'PSG',
    awayTeam: 'Marseille',
    kickoff: new Date(Date.now() + 345600000).toISOString(),
    leagueId: 301,
    predictions: { home: 62, draw: 22, away: 16, btts_yes: 58, btts_no: 42, over_2_5: 65, under_2_5: 35 },
    odds: { home: 1.45, draw: 4.50, away: 6.50, btts_yes: 1.78, btts_no: 2.00, over_2_5: 1.60, under_2_5: 2.30 },
  },
];

export function FixtureSelector() {
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedLeague, setSelectedLeague] = useState<number | null>(null);
  const { addSelection, removeSelection, getSelectionForFixture } = useAccaStore();
  const { tier } = useCredits();

  const dateOptions = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const date = addDays(new Date(), i);
    return {
      value: i,
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : format(date, 'EEE d'),
      date: format(date, 'yyyy-MM-dd'),
    };
  }), []);

  const availableLeagues = LEAGUES.filter(
    (league) => tier !== 'free' || league.tier === 'free'
  );

  // Filter fixtures based on selected league (using useMemo to avoid useEffect)
  const fixtures = useMemo(() => {
    return selectedLeague
      ? MOCK_FIXTURES.filter((f) => f.leagueId === selectedLeague)
      : MOCK_FIXTURES;
  }, [selectedLeague]);

  const handleSelectMarket = (fixture: Fixture, market: BetMarket) => {
    const existingSelection = getSelectionForFixture(fixture.id);

    if (existingSelection?.market === market) {
      removeSelection(fixture.id, market);
    } else {
      const selection: AccaSelection = {
        fixtureId: fixture.id,
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        kickoff: fixture.kickoff,
        market,
        selection: getSelectionLabel(fixture, market),
        odds: fixture.odds[market],
        probability: fixture.predictions[market],
      };
      addSelection(selection);
    }
  };

  const getSelectionLabel = (fixture: Fixture, market: BetMarket): string => {
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
      case 'over_2_5':
        return 'Over 2.5 goals';
      case 'under_2_5':
        return 'Under 2.5 goals';
      default:
        return market;
    }
  };

  const getLeagueName = (leagueId: number): string => {
    return LEAGUES.find((l) => l.id === leagueId)?.shortName || 'Unknown';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {dateOptions.map((option) => (
          <Button
            key={option.value}
            variant={selectedDate === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedDate(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

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

      {fixtures.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No fixtures available for this date
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {fixtures.map((fixture) => {
            const existingSelection = getSelectionForFixture(fixture.id);

            return (
              <Card key={fixture.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {fixture.homeTeam} vs {fixture.awayTeam}
                    </CardTitle>
                    <Badge variant="outline">{getLeagueName(fixture.leagueId)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(fixture.kickoff), 'EEE, d MMM yyyy HH:mm')}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
                    {MARKETS.map((market) => {
                      const isSelected = existingSelection?.market === market.key;
                      const probability = fixture.predictions[market.key];
                      const odds = fixture.odds[market.key];

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
