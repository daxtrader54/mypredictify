import { promises as fs } from 'fs';
import path from 'path';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TrendingUp, AlertCircle, ArrowUpRight } from 'lucide-react';

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

interface ValueBet {
  fixtureId: number;
  league: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  bet: string;
  modelProb: number;
  impliedProb: number;
  odds: number;
  edge: number;
  predictedScore: string;
  confidence: number;
}

async function getLatestGameweekDir(): Promise<string | null> {
  const baseDir = path.join(process.cwd(), 'data', 'gameweeks', '2025-26');
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

async function getValueBets(): Promise<ValueBet[]> {
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
  const valueBets: ValueBet[] = [];
  const MIN_EDGE = 0.05; // 5% edge threshold

  for (const pred of predictions) {
    const match = matchMap.get(pred.fixtureId);
    if (!match?.odds || !match.odds.home) continue;

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
        {valueBets.map((vb, i) => (
          <Card key={`${vb.fixtureId}-${vb.bet}`} className="overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">{vb.league}</Badge>
                <div className="flex items-center gap-1 text-green-500 font-bold text-sm">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  +{(vb.edge * 100).toFixed(1)}% edge
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-semibold text-sm">
                  {vb.homeTeam} vs {vb.awayTeam}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(vb.kickoff).toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <div className="p-3 bg-gradient-to-br from-green-500/10 to-transparent rounded-xl border border-green-500/20">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Value Bet</p>
                <p className="text-lg font-bold text-green-500">{vb.bet}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Predicted score: {vb.predictedScore}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="font-bold text-sm">{(vb.modelProb * 100).toFixed(0)}%</p>
                  <p className="text-muted-foreground">Our Model</p>
                </div>
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="font-bold text-sm">{(vb.impliedProb * 100).toFixed(0)}%</p>
                  <p className="text-muted-foreground">Bookmaker</p>
                </div>
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="font-bold text-sm">{vb.odds.toFixed(2)}</p>
                  <p className="text-muted-foreground">Odds</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <Badge variant="secondary" className="text-xs">
                  {(vb.confidence * 100).toFixed(0)}% confident
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
