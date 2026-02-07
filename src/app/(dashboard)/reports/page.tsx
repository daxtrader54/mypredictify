import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, TrendingUp, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';

export const metadata = {
  title: 'Reports | MyPredictify',
  description: 'Weekly prediction reports and analysis',
};

interface GameweekReport {
  season: string;
  gameweek: string;
  hasReport: boolean;
  hasEvaluation: boolean;
  predictionsCount: number;
  accuracy: number | null;
}

function getReports(): GameweekReport[] {
  const dataDir = resolve(process.cwd(), 'data', 'gameweeks');
  const reports: GameweekReport[] = [];

  if (!existsSync(dataDir)) return reports;

  try {
    const seasons = readdirSync(dataDir);
    for (const season of seasons) {
      const seasonDir = resolve(dataDir, season);
      const gameweeks = readdirSync(seasonDir).filter(d => d.startsWith('GW'));

      for (const gw of gameweeks) {
        const gwDir = resolve(seasonDir, gw);
        const hasReport = existsSync(resolve(gwDir, 'report.md'));
        const hasPredictions = existsSync(resolve(gwDir, 'predictions.json'));
        const hasEvaluation = existsSync(resolve(gwDir, 'evaluation.json'));

        let predictionsCount = 0;
        let accuracy: number | null = null;

        if (hasPredictions) {
          try {
            const preds = JSON.parse(readFileSync(resolve(gwDir, 'predictions.json'), 'utf-8'));
            predictionsCount = Array.isArray(preds) ? preds.length : 0;
          } catch { /* skip */ }
        }

        if (hasEvaluation) {
          try {
            const eval_ = JSON.parse(readFileSync(resolve(gwDir, 'evaluation.json'), 'utf-8'));
            accuracy = eval_.summary?.outcomeAccuracy ?? null;
          } catch { /* skip */ }
        }

        reports.push({
          season,
          gameweek: gw,
          hasReport,
          hasEvaluation,
          predictionsCount,
          accuracy,
        });
      }
    }
  } catch { /* skip if dir issues */ }

  // Sort by season desc, then gameweek desc
  return reports.sort((a, b) => {
    if (a.season !== b.season) return b.season.localeCompare(a.season);
    const numA = parseInt(a.gameweek.replace('GW', ''));
    const numB = parseInt(b.gameweek.replace('GW', ''));
    return numB - numA;
  });
}

export default function ReportsPage() {
  const reports = getReports();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
          <FileText className="h-5 w-5 text-indigo-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground text-sm">
            Weekly prediction reports and post-match analysis
          </p>
        </div>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No reports yet</h3>
            <p className="text-muted-foreground text-sm">
              Reports will appear here after the prediction pipeline runs.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <Link
              key={`${report.season}-${report.gameweek}`}
              href={`/reports/${report.season}/${report.gameweek}`}
            >
              <Card className="hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{report.gameweek}</CardTitle>
                    <Badge variant="outline" className="text-xs">{report.season}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{report.predictionsCount} predictions</span>
                  </div>

                  {report.hasEvaluation && report.accuracy !== null && (
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="font-medium">
                        {(report.accuracy * 100).toFixed(1)}% accuracy
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {report.hasReport && (
                      <Badge variant="secondary" className="text-xs">
                        <FileText className="h-3 w-3 mr-1" />
                        Report
                      </Badge>
                    )}
                    {report.hasEvaluation && (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Evaluated
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
