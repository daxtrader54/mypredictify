import { promises as fs } from 'fs';
import path from 'path';
import { CURRENT_SEASON } from '@/config/site';
import { Card } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { UpcomingFixturesList } from './upcoming-fixtures-list';

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

async function getUpcomingFixtures(): Promise<{
  displayed: (MatchData & { pred?: PredictionEntry })[];
  allFixtureIds: number[];
}> {
  try {
    const baseDir = path.join(process.cwd(), 'data', 'gameweeks', CURRENT_SEASON);
    const entries = await fs.readdir(baseDir);
    const gameweeks = entries
      .filter((e) => e.startsWith('GW'))
      .sort((a, b) => parseInt(b.replace('GW', '')) - parseInt(a.replace('GW', '')));

    if (gameweeks.length === 0) return { displayed: [], allFixtureIds: [] };

    const gwDir = path.join(baseDir, gameweeks[0]);
    const raw = await fs.readFile(path.join(gwDir, 'matches.json'), 'utf-8');
    const matches: MatchData[] = JSON.parse(raw);

    // All fixture IDs across all leagues for this gameweek
    const allFixtureIds = matches.map((m) => m.fixtureId);

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
    const displayed = matches
      .filter((m) => {
        const d = new Date(m.kickoff);
        return d > now && d <= weekFromNow;
      })
      .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
      .slice(0, 10)
      .map((m) => ({ ...m, pred: predMap.get(m.fixtureId) }));

    return { displayed, allFixtureIds };
  } catch {
    return { displayed: [], allFixtureIds: [] };
  }
}

export async function UpcomingFixtures() {
  const { displayed, allFixtureIds } = await getUpcomingFixtures();

  if (displayed.length === 0) {
    return (
      <Card variant="terminal">
        <div className="flex items-center gap-2 text-base font-semibold pb-3 border-b border-border/40">
          <Calendar className="h-4 w-4 text-blue-500" />
          Upcoming Fixtures
        </div>
        <p className="text-sm text-muted-foreground text-center py-8">
          No upcoming fixtures this week. New matches will appear after the next pipeline run.
        </p>
      </Card>
    );
  }

  // Serialize fixture data for the client component
  const fixtureData = displayed.map((m) => ({
    fixtureId: m.fixtureId,
    league: m.league,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    kickoff: m.kickoff,
    pred: m.pred,
  }));

  return (
    <Card variant="terminal" data-tour="upcoming-fixtures">
      <div className="flex items-center gap-2 text-base font-semibold pb-3 border-b border-border/40">
        <Calendar className="h-4 w-4 text-blue-500" />
        Upcoming Fixtures
      </div>
      <div className="pt-3">
        <UpcomingFixturesList fixtures={fixtureData} allGameweekFixtureIds={allFixtureIds} />
      </div>
    </Card>
  );
}
