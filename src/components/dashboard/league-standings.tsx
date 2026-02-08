'use client';

import { useState, useEffect } from 'react';
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
import { Trophy, RefreshCw } from 'lucide-react';
import { LEAGUES, LEAGUE_BY_ID } from '@/config/leagues';
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cache[activeLeague]) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const league = LEAGUE_BY_ID[activeLeague];
    const seasonParam = league ? `&seasonId=${league.seasonId}` : '';
    fetch(`/api/standings?leagueId=${activeLeague}${seasonParam}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setError('Failed to load standings');
          return;
        }
        const data: StandingRow[] = await res.json();
        setCache((prev) => ({ ...prev, [activeLeague]: data }));
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load standings');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [activeLeague, cache]);

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
              <span className="md:hidden">{league.flag} {league.shortName}</span>
              <span className="hidden md:inline">{league.name}</span>
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
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCache((prev) => {
                  const next = { ...prev };
                  delete next[activeLeague];
                  return next;
                });
              }}
            >
              <RefreshCw className="h-3 w-3 mr-1.5" />
              Retry
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No standings data available.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 text-center px-1">#</TableHead>
                  <TableHead className="px-1">Team</TableHead>
                  <TableHead className="text-center w-8 px-1">P</TableHead>
                  <TableHead className="text-center w-8 px-1 hidden sm:table-cell">W</TableHead>
                  <TableHead className="text-center w-8 px-1 hidden sm:table-cell">D</TableHead>
                  <TableHead className="text-center w-8 px-1 hidden sm:table-cell">L</TableHead>
                  <TableHead className="text-center w-10 px-1">GD</TableHead>
                  <TableHead className="text-center w-10 px-1 font-bold">Pts</TableHead>
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
                    <TableCell className="text-center text-xs font-medium text-muted-foreground px-1">
                      {row.position}
                    </TableCell>
                    <TableCell className="px-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {row.teamLogo && (
                          <Image
                            src={row.teamLogo}
                            alt={row.teamName}
                            width={18}
                            height={18}
                            className="rounded-sm shrink-0"
                          />
                        )}
                        <span className="text-xs sm:text-sm font-medium truncate">{row.teamName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-xs sm:text-sm px-1">{row.played}</TableCell>
                    <TableCell className="text-center text-xs sm:text-sm px-1 hidden sm:table-cell">{row.won}</TableCell>
                    <TableCell className="text-center text-xs sm:text-sm px-1 hidden sm:table-cell">{row.drawn}</TableCell>
                    <TableCell className="text-center text-xs sm:text-sm px-1 hidden sm:table-cell">{row.lost}</TableCell>
                    <TableCell className="text-center text-xs sm:text-sm font-medium px-1">
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
                    <TableCell className="text-center text-xs sm:text-sm font-bold px-1">{row.points}</TableCell>
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
