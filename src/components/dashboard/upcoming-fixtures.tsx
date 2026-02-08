import { promises as fs } from 'fs';
import path from 'path';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';
import Image from 'next/image';

interface MatchData {
  fixtureId: number;
  league: { id: number; name: string };
  homeTeam: { id: number; name: string; shortCode: string; logo: string };
  awayTeam: { id: number; name: string; shortCode: string; logo: string };
  kickoff: string;
  venue: string;
}

async function getUpcomingFixtures(): Promise<MatchData[]> {
  try {
    const baseDir = path.join(process.cwd(), 'data', 'gameweeks', '2025-26');
    const entries = await fs.readdir(baseDir);
    const gameweeks = entries
      .filter((e) => e.startsWith('GW'))
      .sort((a, b) => parseInt(b.replace('GW', '')) - parseInt(a.replace('GW', '')));

    if (gameweeks.length === 0) return [];

    const raw = await fs.readFile(path.join(baseDir, gameweeks[0], 'matches.json'), 'utf-8');
    const matches: MatchData[] = JSON.parse(raw);

    const now = new Date();
    // Filter to future matches, sort by kickoff, take first 8
    return matches
      .filter((m) => new Date(m.kickoff) > now)
      .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
      .slice(0, 8);
  } catch {
    return [];
  }
}

function formatKickoff(kickoff: string): string {
  const d = new Date(kickoff);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function leagueShort(name: string): string {
  const map: Record<string, string> = {
    'Premier League': 'PL',
    'La Liga': 'LL',
    'Bundesliga': 'BL',
    'Serie A': 'SA',
    'Ligue 1': 'L1',
  };
  return map[name] || name.slice(0, 3).toUpperCase();
}

export async function UpcomingFixtures() {
  const fixtures = await getUpcomingFixtures();

  if (fixtures.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-blue-500" />
            Upcoming Fixtures
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No upcoming fixtures. New matches will appear after the next pipeline run.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4 text-blue-500" />
          Upcoming Fixtures
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {fixtures.map((m) => (
          <div
            key={m.fixtureId}
            className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/50 transition-colors"
          >
            <Badge variant="outline" className="text-[10px] font-mono w-7 justify-center shrink-0 px-0">
              {leagueShort(m.league.name)}
            </Badge>

            <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end text-right">
              <span className="text-sm font-medium truncate">{m.homeTeam.name}</span>
              {m.homeTeam.logo && (
                <Image src={m.homeTeam.logo} alt={m.homeTeam.shortCode} width={18} height={18} className="rounded-sm shrink-0" />
              )}
            </div>

            <span className="text-xs text-muted-foreground font-medium shrink-0">vs</span>

            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {m.awayTeam.logo && (
                <Image src={m.awayTeam.logo} alt={m.awayTeam.shortCode} width={18} height={18} className="rounded-sm shrink-0" />
              )}
              <span className="text-sm font-medium truncate">{m.awayTeam.name}</span>
            </div>

            <span className="text-xs text-muted-foreground shrink-0 w-32 text-right">
              {formatKickoff(m.kickoff)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
