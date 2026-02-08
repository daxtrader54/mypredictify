import { promises as fs } from 'fs';
import path from 'path';
import { PredictionCard } from '@/components/predictions/prediction-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Calendar } from 'lucide-react';
import type { ProcessedFixture, ProcessedPrediction } from '@/lib/sportmonks/types';
import { getAvailableGameweeks, GW_BASE_DIR } from '@/lib/gameweeks';
import { LEAGUE_BY_ID } from '@/config/leagues';

interface MatchData {
  fixtureId: number;
  league: { id: number; name: string };
  round: number;
  homeTeam: { id: number; name: string; shortCode: string; logo: string };
  awayTeam: { id: number; name: string; shortCode: string; logo: string };
  kickoff: string;
  venue: string;
  odds?: { home: number; draw: number; away: number; bookmaker: string };
}

interface PredictionFileEntry {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  predictedScore: string;
  prediction: string;
  confidence: number;
  explanation: string;
  modelComponents?: {
    elo?: { H: number; D: number; A: number };
    poisson?: { H: number; D: number; A: number };
    odds?: { H: number; D: number; A: number } | null;
    btts?: { yes: number; no: number };
  };
}

interface ResultData {
  fixtureId: number;
  homeGoals: number;
  awayGoals: number;
  status: 'finished' | 'live' | 'postponed';
}

function isSameDay(dateStr: string, today: string): boolean {
  // dateStr format: "2026-02-06 20:00:00" — extract date part
  return dateStr.startsWith(today);
}

interface TodayFixture {
  fixture: ProcessedFixture;
  prediction?: ProcessedPrediction;
}

interface LeagueGroup {
  leagueId: number;
  leagueName: string;
  flag: string;
  fixtures: TodayFixture[];
}

async function getTodaysFixtures(): Promise<LeagueGroup[]> {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const gameweeks = await getAvailableGameweeks();

  const allFixtures: TodayFixture[] = [];

  for (const gw of gameweeks) {
    const gwDir = path.join(GW_BASE_DIR, `GW${gw}`);

    // Load matches
    let matches: MatchData[] = [];
    try {
      const raw = await fs.readFile(path.join(gwDir, 'matches.json'), 'utf-8');
      matches = JSON.parse(raw);
    } catch {
      continue;
    }

    // Filter to today's matches
    const todayMatches = matches.filter((m) => isSameDay(m.kickoff, today));
    if (todayMatches.length === 0) continue;

    // Load results
    const resultsMap = new Map<number, ResultData>();
    try {
      const resultsRaw = await fs.readFile(path.join(gwDir, 'results.json'), 'utf-8');
      const results: ResultData[] = JSON.parse(resultsRaw);
      results.forEach((r) => resultsMap.set(r.fixtureId, r));
    } catch {
      // No results yet
    }

    // Load predictions
    const predictionsMap = new Map<number, PredictionFileEntry>();
    try {
      const predsRaw = await fs.readFile(path.join(gwDir, 'predictions.json'), 'utf-8');
      const preds: PredictionFileEntry[] = JSON.parse(predsRaw);
      preds.forEach((p) => predictionsMap.set(p.fixtureId, p));
    } catch {
      // No predictions yet
    }

    const now = new Date();

    for (const m of todayMatches) {
      const result = resultsMap.get(m.fixtureId);
      const kickoff = new Date(m.kickoff);
      let status: ProcessedFixture['status'] = 'upcoming';
      let score: ProcessedFixture['score'] = undefined;

      if (result) {
        status = result.status;
        if (result.status === 'finished' || result.status === 'live') {
          score = { home: result.homeGoals, away: result.awayGoals };
        }
      } else if (kickoff < now) {
        status = 'finished';
      }

      const fixture: ProcessedFixture = {
        id: m.fixtureId,
        leagueId: m.league.id,
        leagueName: m.league.name,
        homeTeam: {
          id: m.homeTeam.id,
          name: m.homeTeam.name,
          shortCode: m.homeTeam.shortCode,
          logo: m.homeTeam.logo,
        },
        awayTeam: {
          id: m.awayTeam.id,
          name: m.awayTeam.name,
          shortCode: m.awayTeam.shortCode,
          logo: m.awayTeam.logo,
        },
        startTime: kickoff,
        status,
        score,
        venue: m.venue,
      };

      const predEntry = predictionsMap.get(m.fixtureId);
      let prediction: ProcessedPrediction | undefined;

      if (predEntry) {
        const advice =
          predEntry.prediction === 'H'
            ? 'Home Win'
            : predEntry.prediction === 'A'
              ? 'Away Win'
              : 'Draw';
        prediction = {
          homeWin: predEntry.homeWinProb * 100,
          draw: predEntry.drawProb * 100,
          awayWin: predEntry.awayWinProb * 100,
          predictedScore: predEntry.predictedScore,
          advice,
          confidence: predEntry.confidence * 100,
          explanation: predEntry.explanation,
          btts: predEntry.modelComponents?.btts
            ? { yes: predEntry.modelComponents.btts.yes, no: predEntry.modelComponents.btts.no }
            : undefined,
          modelComponents: predEntry.modelComponents
            ? {
                elo: predEntry.modelComponents.elo,
                poisson: predEntry.modelComponents.poisson,
                odds: predEntry.modelComponents.odds,
              }
            : undefined,
        };
      } else if (m.odds && m.odds.home > 0) {
        // Fallback to odds-derived prediction
        const rawH = 1 / m.odds.home;
        const rawD = 1 / m.odds.draw;
        const rawA = 1 / m.odds.away;
        const total = rawH + rawD + rawA;
        const homeWin = Math.round((rawH / total) * 100);
        const draw = Math.round((rawD / total) * 100);
        const awayWin = Math.round((rawA / total) * 100);
        const max = Math.max(homeWin, draw, awayWin);
        prediction = {
          homeWin,
          draw,
          awayWin,
          advice: homeWin >= awayWin && homeWin >= draw ? 'Home Win' : awayWin >= homeWin && awayWin >= draw ? 'Away Win' : 'Draw',
          confidence: max,
        };
      }

      allFixtures.push({ fixture, prediction });
    }
  }

  // Sort by kickoff time
  allFixtures.sort((a, b) => a.fixture.startTime.getTime() - b.fixture.startTime.getTime());

  // Group by league
  const leagueMap = new Map<number, TodayFixture[]>();
  for (const item of allFixtures) {
    const lid = item.fixture.leagueId;
    if (!leagueMap.has(lid)) leagueMap.set(lid, []);
    leagueMap.get(lid)!.push(item);
  }

  const groups: LeagueGroup[] = [];
  for (const [leagueId, fixtures] of leagueMap) {
    const league = LEAGUE_BY_ID[leagueId];
    groups.push({
      leagueId,
      leagueName: fixtures[0].fixture.leagueName,
      flag: league?.flag || '',
      fixtures,
    });
  }

  return groups;
}

export async function TodaysFixtures() {
  const groups = await getTodaysFixtures();

  if (groups.length === 0) {
    return (
      <Alert>
        <Calendar className="h-4 w-4" />
        <AlertTitle>No games today</AlertTitle>
        <AlertDescription>
          There are no fixtures scheduled for today. Check the{' '}
          <a href="/predictions" className="text-primary underline underline-offset-4 hover:text-primary/80">
            Predictions
          </a>{' '}
          page for upcoming gameweek fixtures.
        </AlertDescription>
      </Alert>
    );
  }

  const totalGames = groups.reduce((sum, g) => sum + g.fixtures.length, 0);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {totalGames} {totalGames === 1 ? 'game' : 'games'} across {groups.length}{' '}
        {groups.length === 1 ? 'league' : 'leagues'}
      </p>

      {groups.map((group) => (
        <div key={group.leagueId} className="space-y-3">
          <div className="flex items-center gap-2">
            {group.flag && <span className="text-lg">{group.flag}</span>}
            <h2 className="text-lg font-semibold">{group.leagueName}</h2>
            <span className="text-xs text-muted-foreground">
              {group.fixtures.length} {group.fixtures.length === 1 ? 'match' : 'matches'}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {group.fixtures.map(({ fixture, prediction }) => (
              <PredictionCard key={fixture.id} fixture={fixture} prediction={prediction} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
