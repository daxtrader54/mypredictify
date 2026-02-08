import { promises as fs } from 'fs';
import path from 'path';
import { CURRENT_SEASON } from '@/config/site';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { ValueBetCard, type ValueBetData } from './value-bet-card';

interface MatchData {
  fixtureId: number;
  league: { id: number; name: string };
  homeTeam: { name: string; shortCode: string };
  awayTeam: { name: string; shortCode: string };
  kickoff: string;
  odds?: { home: number; draw: number; away: number; bookmaker: string };
}

interface PredictionEntry {
  fixtureId: number;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  predictedScore: string;
  prediction: string;
  confidence: number;
}

async function getLatestGameweekDir(): Promise<string | null> {
  const baseDir = path.join(process.cwd(), 'data', 'gameweeks', CURRENT_SEASON);
  try {
    const entries = await fs.readdir(baseDir);
    const gameweeks = entries
      .filter((e) => e.startsWith('GW'))
      .sort((a, b) => parseInt(b.replace('GW', '')) - parseInt(a.replace('GW', '')));
    return gameweeks[0] ? path.join(baseDir, gameweeks[0]) : null;
  } catch {
    return null;
  }
}

async function getValueBets(): Promise<ValueBetData[]> {
  const gwDir = await getLatestGameweekDir();
  if (!gwDir) return [];

  let matches: MatchData[] = [];
  let predictions: PredictionEntry[] = [];

  try {
    const matchRaw = await fs.readFile(path.join(gwDir, 'matches.json'), 'utf-8');
    matches = JSON.parse(matchRaw);
    const predRaw = await fs.readFile(path.join(gwDir, 'predictions.json'), 'utf-8');
    predictions = JSON.parse(predRaw);
  } catch {
    return [];
  }

  const matchMap = new Map(matches.map((m) => [m.fixtureId, m]));
  const valueBets: ValueBetData[] = [];
  const MIN_EDGE = 0.05; // 5% edge threshold

  const now = new Date();

  for (const pred of predictions) {
    const match = matchMap.get(pred.fixtureId);
    if (!match?.odds || !match.odds.home) continue;

    // Skip games that have already kicked off
    if (new Date(match.kickoff) <= now) continue;

    const odds = match.odds;
    const rawH = 1 / odds.home;
    const rawD = 1 / odds.draw;
    const rawA = 1 / odds.away;
    const total = rawH + rawD + rawA;
    const impliedH = rawH / total;
    const impliedD = rawD / total;
    const impliedA = rawA / total;

    // Check each outcome for value
    const outcomes = [
      { bet: 'Home Win', modelProb: pred.homeWinProb, impliedProb: impliedH, odds: odds.home },
      { bet: 'Draw', modelProb: pred.drawProb, impliedProb: impliedD, odds: odds.draw },
      { bet: 'Away Win', modelProb: pred.awayWinProb, impliedProb: impliedA, odds: odds.away },
    ];

    for (const o of outcomes) {
      const edge = o.modelProb - o.impliedProb;
      if (edge >= MIN_EDGE) {
        valueBets.push({
          fixtureId: pred.fixtureId,
          league: pred.league,
          leagueId: match.league.id,
          homeTeam: pred.homeTeam,
          awayTeam: pred.awayTeam,
          kickoff: match.kickoff,
          bet: o.bet,
          modelProb: o.modelProb,
          impliedProb: o.impliedProb,
          odds: o.odds,
          edge,
          predictedScore: pred.predictedScore,
          confidence: pred.confidence,
        });
      }
    }
  }

  // Sort by edge descending
  valueBets.sort((a, b) => b.edge - a.edge);
  return valueBets;
}

export async function ValueBetsList() {
  const valueBets = await getValueBets();

  if (valueBets.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No value bets found</AlertTitle>
        <AlertDescription>
          No matches currently show a significant edge over bookmaker odds. Check back when new
          predictions are generated.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <TrendingUp className="h-4 w-4" />
        <span>{valueBets.length} value bets found across all leagues</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {valueBets.map((vb) => (
          <ValueBetCard key={`${vb.fixtureId}-${vb.bet}`} vb={vb} />
        ))}
      </div>
    </div>
  );
}
