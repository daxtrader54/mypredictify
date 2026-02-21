import { getAccuracyData, type AccuracyData, type GameweekAccuracy } from '@/app/(dashboard)/dashboard/accuracy-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Target, Crosshair, Trophy, CalendarCheck, Info } from 'lucide-react';
import { CURRENT_SEASON } from '@/config/site';

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatFraction(correct: number, total: number): string {
  if (total === 0) return '--';
  return `${formatPct(correct / total)} (${correct}/${total})`;
}

function CumulativeCards({ data }: { data: AccuracyData['cumulative'] & { gameweeksEvaluated: number } }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-gradient-to-br from-indigo-500/10 to-transparent border-indigo-500/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Predictions</CardTitle>
          <div className="h-8 w-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
            <Target className="h-4 w-4 text-indigo-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{data.totalPredictions}</div>
          <p className="text-xs text-muted-foreground mt-2">Matches evaluated</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Result Accuracy</CardTitle>
          <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Trophy className="h-4 w-4 text-emerald-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {data.totalPredictions > 0 ? formatPct(data.outcomeAccuracy) : '--'}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {data.totalPredictions > 0
              ? `${data.correctOutcomes} of ${data.totalPredictions} correct`
              : 'H/D/A predictions'}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Score Accuracy</CardTitle>
          <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Crosshair className="h-4 w-4 text-amber-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {data.totalPredictions > 0 ? formatPct(data.scoreAccuracy) : '--'}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {data.totalPredictions > 0
              ? `${data.correctScores} of ${data.totalPredictions} exact`
              : 'Exact score predictions'}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-violet-500/10 to-transparent border-violet-500/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gameweeks Evaluated</CardTitle>
          <div className="h-8 w-8 rounded-full bg-violet-500/10 flex items-center justify-center">
            <CalendarCheck className="h-4 w-4 text-violet-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{data.gameweeksEvaluated}</div>
          <p className="text-xs text-muted-foreground mt-2">Completed rounds</p>
        </CardContent>
      </Card>
    </div>
  );
}

function LeagueTable({ leagues }: { leagues: AccuracyData['leagueTotals'] }) {
  if (leagues.length === 0) {
    return null;
  }

  return (
    <Card variant="terminal">
      <div className="pb-3 border-b border-border/40">
        <div className="text-base font-semibold">Accuracy by League</div>
        <div className="text-muted-foreground text-sm">Cumulative performance across all evaluated gameweeks</div>
      </div>
      <div className="pt-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>League</TableHead>
              <TableHead className="text-right">Predictions</TableHead>
              <TableHead className="text-right">Results Correct</TableHead>
              <TableHead className="text-right">Scores Correct</TableHead>
              <TableHead className="text-right">Result %</TableHead>
              <TableHead className="text-right">Score %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leagues.map((league) => (
              <TableRow key={league.name}>
                <TableCell className="font-medium">{league.name}</TableCell>
                <TableCell className="text-right">{league.predictions}</TableCell>
                <TableCell className="text-right">{league.correctOutcomes}</TableCell>
                <TableCell className="text-right">{league.correctScores}</TableCell>
                <TableCell className="text-right">{formatPct(league.outcomeAccuracy)}</TableCell>
                <TableCell className="text-right">{formatPct(league.scoreAccuracy)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function GameweekHistory({ gameweeks }: { gameweeks: GameweekAccuracy[] }) {
  if (gameweeks.length === 0) {
    return null;
  }

  return (
    <Card variant="terminal">
      <div className="pb-3 border-b border-border/40">
        <div className="text-base font-semibold">Gameweek History</div>
        <div className="text-muted-foreground text-sm">Per-round accuracy breakdown (most recent first)</div>
      </div>
      <div className="pt-3 space-y-4">
        {gameweeks.map((gw) => (
          <div key={gw.name} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono">{gw.name}</Badge>
                {gw.date && (
                  <span className="text-xs text-muted-foreground">{gw.date}</span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span>
                  Results: <span className="font-semibold">{formatFraction(gw.correctOutcomes, gw.totalPredictions)}</span>
                </span>
                <span>
                  Scores: <span className="font-semibold">{formatFraction(gw.correctScores, gw.totalPredictions)}</span>
                </span>
              </div>
            </div>
            {gw.leagues.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {gw.leagues.map((league) => (
                  <Badge key={league.name} variant="secondary" className="text-xs">
                    {league.name}: {formatFraction(league.correctOutcomes, league.predictions)}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

export async function AccuracyTracker() {
  const data = await getAccuracyData();
  const hasData = data.gameweeks.length > 0;

  return (
    <div data-tour="accuracy-tracker" className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Prediction Accuracy — {CURRENT_SEASON} Season</h2>
        <p className="text-sm text-muted-foreground">
          Cumulative stats across all evaluated gameweeks this season. Updated after each round of matches.
        </p>
      </div>

      <CumulativeCards
        data={{
          ...data.cumulative,
          gameweeksEvaluated: data.gameweeks.length,
        }}
      />

      {hasData ? (
        <>
          <LeagueTable leagues={data.leagueTotals} />
          <GameweekHistory gameweeks={data.gameweeks} />
        </>
      ) : (
        <Card>
          <CardContent className="flex items-center gap-3 py-8">
            <Info className="h-5 w-5 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              No evaluations yet — predictions will be scored after matches finish. Check back after the next round of games.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
