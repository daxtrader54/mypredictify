import { notFound } from 'next/navigation';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { WeeklyReport } from '@/components/reports/weekly-report';
import { PredictionRow } from '@/components/reports/prediction-row';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface ReportPageProps {
  params: Promise<{ gameweek: string[] }>;
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { gameweek: segments } = await params;

  if (!segments || segments.length < 2) {
    notFound();
  }

  const [season, gw] = segments;
  const gwDir = resolve(process.cwd(), 'data', 'gameweeks', season, gw);

  if (!existsSync(gwDir)) {
    notFound();
  }

  // Load report markdown if exists
  const reportPath = resolve(gwDir, 'report.md');
  let reportContent: string | null = null;
  if (existsSync(reportPath)) {
    reportContent = readFileSync(reportPath, 'utf-8');
  }

  // Load predictions
  const predictionsPath = resolve(gwDir, 'predictions.json');
  let predictions: Array<{
    fixtureId: number;
    homeTeam: string;
    awayTeam: string;
    league: string;
    homeWinProb: number;
    drawProb: number;
    awayWinProb: number;
    predictedScore: string;
    prediction: string;
    confidence: number;
    explanation: string;
  }> = [];
  if (existsSync(predictionsPath)) {
    try {
      predictions = JSON.parse(readFileSync(predictionsPath, 'utf-8'));
    } catch { /* skip */ }
  }

  // Load results if exists
  const resultsPath = resolve(gwDir, 'results.json');
  let results: Array<{
    fixtureId: number;
    homeGoals: number;
    awayGoals: number;
    status: string;
  }> = [];
  if (existsSync(resultsPath)) {
    try {
      results = JSON.parse(readFileSync(resultsPath, 'utf-8'));
    } catch { /* skip */ }
  }
  const resultsMap = new Map(results.map((r) => [r.fixtureId, r]));

  // Load evaluation if exists
  const evalPath = resolve(gwDir, 'evaluation.json');
  let evaluation: {
    summary?: {
      outcomeAccuracy: number;
      scoreAccuracy: number;
      avgLogLoss: number;
      avgBrierScore: number;
      correctOutcomes: number;
      totalPredictions: number;
    };
  } | null = null;
  if (existsSync(evalPath)) {
    try {
      evaluation = JSON.parse(readFileSync(evalPath, 'utf-8'));
    } catch { /* skip */ }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/reports"
          className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{gw} Report</h1>
            <Badge variant="outline">{season}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {predictions.length} predictions across all leagues
          </p>
        </div>
      </div>

      {/* Evaluation summary */}
      {evaluation?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-green-500">
                {(evaluation.summary.outcomeAccuracy * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Outcome Accuracy</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-blue-500">
                {(evaluation.summary.scoreAccuracy * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Score Accuracy</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-yellow-500">
                {evaluation.summary.avgLogLoss.toFixed(3)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Avg Log Loss</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-purple-500">
                {evaluation.summary.avgBrierScore.toFixed(3)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Brier Score</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report markdown */}
      {reportContent && <WeeklyReport content={reportContent} />}

      {/* Predictions table */}
      {predictions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Predictions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {predictions.map((pred) => {
                const result = resultsMap.get(pred.fixtureId);
                return (
                  <PredictionRow
                    key={pred.fixtureId}
                    prediction={pred}
                    result={result ? { home: result.homeGoals, away: result.awayGoals } : undefined}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {!reportContent && predictions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No data available for this gameweek yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
