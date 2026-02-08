'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy } from 'lucide-react';
import { LEAGUES } from '@/config/leagues';
import Image from 'next/image';

interface StandingRow {
  id: string;
  leagueId: number;
  seasonId: number;
  position: number;
  teamId: number;
  teamName: string;
  teamLogo: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export function LeagueStandings() {
  const [activeLeague, setActiveLeague] = useState(LEAGUES[0].id);
  const [cache, setCache] = useState<Record<number, StandingRow[]>>({});
  const [loading, setLoading] = useState(false);

  const fetchStandings = useCallback(async (leagueId: number) => {
    if (cache[leagueId]) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/standings?leagueId=${leagueId}`);
      if (res.ok) {
        const data: StandingRow[] = await res.json();
        setCache((prev) => ({ ...prev, [leagueId]: data }));
      }
    } catch {
      // Silently fail — empty state handled in render
    } finally {
      setLoading(false);
    }
  }, [cache]);

  useEffect(() => {
    fetchStandings(activeLeague);
  }, [activeLeague, fetchStandings]);

  const rows = cache[activeLeague] || [];

  // Determine relegation cutoff based on league
  const relegationStart = activeLeague === 82 ? 17 : 18; // Bundesliga has 18 teams

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-4 w-4 text-yellow-500" />
          League Standings
        </CardTitle>
        <div className="flex gap-1 flex-wrap mt-2">
          {LEAGUES.map((league) => (
            <Button
              key={league.id}
              variant={activeLeague === league.id ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setActiveLeague(league.id)}
            >
              {league.shortName}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {loading && rows.length === 0 ? (
          <div className="space-y-2 px-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No standings data available. Run <code>npm run sync-standings</code> to populate.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">#</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-center w-10">P</TableHead>
                  <TableHead className="text-center w-10">W</TableHead>
                  <TableHead className="text-center w-10">D</TableHead>
                  <TableHead className="text-center w-10">L</TableHead>
                  <TableHead className="text-center w-12">GD</TableHead>
                  <TableHead className="text-center w-12 font-bold">Pts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.teamId}
                    className={
                      row.position <= 4
                        ? 'border-l-2 border-l-blue-500'
                        : row.position >= relegationStart
                          ? 'border-l-2 border-l-red-500'
                          : ''
                    }
                  >
                    <TableCell className="text-center text-xs font-medium text-muted-foreground">
                      {row.position}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {row.teamLogo && (
                          <Image
                            src={row.teamLogo}
                            alt={row.teamName}
                            width={20}
                            height={20}
                            className="rounded-sm"
                          />
                        )}
                        <span className="text-sm font-medium truncate">{row.teamName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm">{row.played}</TableCell>
                    <TableCell className="text-center text-sm">{row.won}</TableCell>
                    <TableCell className="text-center text-sm">{row.drawn}</TableCell>
                    <TableCell className="text-center text-sm">{row.lost}</TableCell>
                    <TableCell className="text-center text-sm font-medium">
                      <span
                        className={
                          row.goalDifference > 0
                            ? 'text-green-500'
                            : row.goalDifference < 0
                              ? 'text-red-500'
                              : ''
                        }
                      >
                        {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-sm font-bold">{row.points}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
