import { promises as fs } from 'fs';
import path from 'path';
import Link from 'next/link';
import { CURRENT_SEASON } from '@/config/site';
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

interface PredictionEntry {
  fixtureId: number;
  prediction: string; // "H", "D", "A"
  predictedScore: string;
  confidence: number;
}

async function getUpcomingFixtures(): Promise<(MatchData & { pred?: PredictionEntry })[]> {
  try {
    const baseDir = path.join(process.cwd(), 'data', 'gameweeks', CURRENT_SEASON);
    const entries = await fs.readdir(baseDir);
    const gameweeks = entries
      .filter((e) => e.startsWith('GW'))
      .sort((a, b) => parseInt(b.replace('GW', '')) - parseInt(a.replace('GW', '')));

    if (gameweeks.length === 0) return [];

    const gwDir = path.join(baseDir, gameweeks[0]);
    const raw = await fs.readFile(path.join(gwDir, 'matches.json'), 'utf-8');
    const matches: MatchData[] = JSON.parse(raw);

    // Load predictions if available
    let predMap = new Map<number, PredictionEntry>();
    try {
      const predRaw = await fs.readFile(path.join(gwDir, 'predictions.json'), 'utf-8');
      const preds: PredictionEntry[] = JSON.parse(predRaw);
      predMap = new Map(preds.map((p) => [p.fixtureId, p]));
    } catch {
      // No predictions file
    }

    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Show fixtures within the next 7 days, sorted by kickoff, take first 10
    return matches
      .filter((m) => {
        const d = new Date(m.kickoff);
        return d > now && d <= weekFromNow;
      })
      .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
      .slice(0, 10)
      .map((m) => ({ ...m, pred: predMap.get(m.fixtureId) }));
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

function predLabel(pred: string): string {
  if (pred === 'H') return 'H';
  if (pred === 'A') return 'A';
  return 'D';
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
            No upcoming fixtures this week. New matches will appear after the next pipeline run.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-tour="upcoming-fixtures">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4 text-blue-500" />
          Upcoming Fixtures
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0.5">
        {fixtures.map((m) => (
          <Link
            key={m.fixtureId}
            href={`/predictions?league=${m.league.id}`}
            className="block py-2 px-1 md:px-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer group"
          >
            {/* Row 1: date + league */}
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors">
                {formatKickoff(m.kickoff)}
              </span>
              <Badge variant="outline" className="text-[10px] font-mono px-1 py-0 h-4">
                {leagueShort(m.league.name)}
              </Badge>
              {m.pred && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-auto">
                  {predLabel(m.pred.prediction)}
                </Badge>
              )}
            </div>
            {/* Row 2: teams + score */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 flex-1 min-w-0 justify-end text-right">
                <span className="text-xs md:text-sm font-medium truncate">{m.homeTeam.name}</span>
                {m.homeTeam.logo && (
                  <Image src={m.homeTeam.logo} alt={m.homeTeam.shortCode} width={18} height={18} className="rounded-sm shrink-0" />
                )}
              </div>

              {m.pred ? (
                <div className="shrink-0 w-12 text-center">
                  <span className="text-xs font-bold text-primary">
                    {m.pred.predictedScore}
                  </span>
                  <span className="block text-[8px] uppercase text-muted-foreground tracking-wide">Pred</span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground font-medium shrink-0 w-12 text-center">vs</span>
              )}

              <div className="flex items-center gap-1 flex-1 min-w-0">
                {m.awayTeam.logo && (
                  <Image src={m.awayTeam.logo} alt={m.awayTeam.shortCode} width={18} height={18} className="rounded-sm shrink-0" />
                )}
                <span className="text-xs md:text-sm font-medium truncate">{m.awayTeam.name}</span>
              </div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
