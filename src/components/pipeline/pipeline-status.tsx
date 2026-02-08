import { promises as fs } from 'fs';
import path from 'path';
import { CURRENT_SEASON } from '@/config/site';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  Circle,
  AlertTriangle,
  TrendingUp,
  Activity,
  BarChart3,
  Brain,
  FileText,
  Calendar,
} from 'lucide-react';

interface PipelineStep {
  name: string;
  label: string;
  status: 'pending' | 'completed' | 'failed' | 'skipped';
  detail?: string;
}

interface IngestLog {
  timestamp: string;
  season: string;
  round: number;
  leaguesProcessed: string[];
  totalMatches: number;
  results: Record<string, { round: number; matches: number }>;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getLatestGameweekDir(): Promise<string | null> {
  const seasonDir = path.join(process.cwd(), 'data', 'gameweeks', CURRENT_SEASON);
  try {
    const dirs = await fs.readdir(seasonDir);
    const gwDirs = dirs.filter(d => d.startsWith('GW')).sort((a, b) => {
      const numA = parseInt(a.replace('GW', ''));
      const numB = parseInt(b.replace('GW', ''));
      return numB - numA;
    });
    return gwDirs.length > 0 ? path.join(seasonDir, gwDirs[0]) : null;
  } catch {
    return null;
  }
}

async function getPipelineState() {
  const gwDir = await getLatestGameweekDir();
  if (!gwDir) {
    return { steps: getDefaultSteps(), gwName: null, ingestLog: null, predictionCount: 0 };
  }

  const gwName = path.basename(gwDir);

  // Check which files exist
  const hasMatches = await fileExists(path.join(gwDir, 'matches.json'));
  const hasIngestLog = await fileExists(path.join(gwDir, '_ingest-log.json'));
  const hasResearch = await fileExists(path.join(gwDir, 'research.json'));
  const hasPredictions = await fileExists(path.join(gwDir, 'predictions.json'));
  const hasReport = await fileExists(path.join(gwDir, 'report.md'));
  const hasResults = await fileExists(path.join(gwDir, 'results.json'));
  const hasEvaluation = await fileExists(path.join(gwDir, 'evaluation.json'));

  // Read ingest log for details
  let ingestLog: IngestLog | null = null;
  if (hasIngestLog) {
    try {
      const raw = await fs.readFile(path.join(gwDir, '_ingest-log.json'), 'utf-8');
      ingestLog = JSON.parse(raw);
    } catch { /* ignore */ }
  }

  // Count predictions
  let predictionCount = 0;
  if (hasPredictions) {
    try {
      const raw = await fs.readFile(path.join(gwDir, 'predictions.json'), 'utf-8');
      const preds = JSON.parse(raw);
      predictionCount = Array.isArray(preds) ? preds.length : 0;
    } catch { /* ignore */ }
  }

  const steps: PipelineStep[] = [
    {
      name: 'ingest',
      label: 'Ingest Fixtures',
      status: hasMatches ? 'completed' : 'pending',
      detail: ingestLog ? `${ingestLog.totalMatches} matches from ${ingestLog.leaguesProcessed.length} leagues` : undefined,
    },
    {
      name: 'research',
      label: 'Research Matches',
      status: hasResearch ? 'completed' : hasMatches ? 'skipped' : 'pending',
      detail: hasResearch ? undefined : hasMatches ? 'Web research not yet run for this gameweek' : undefined,
    },
    {
      name: 'predict',
      label: 'Generate Predictions',
      status: hasPredictions ? 'completed' : 'pending',
      detail: hasPredictions ? `${predictionCount} predictions generated` : undefined,
    },
    {
      name: 'report',
      label: 'Generate Report',
      status: hasReport ? 'completed' : 'pending',
      detail: hasReport ? 'Weekly report available' : undefined,
    },
    {
      name: 'evaluate',
      label: 'Evaluate Results',
      status: hasEvaluation ? 'completed' : hasResults ? 'completed' : 'pending',
      detail: !hasResults ? 'Awaiting match results' : undefined,
    },
  ];

  return { steps, gwName, ingestLog, predictionCount };
}

function getDefaultSteps(): PipelineStep[] {
  return [
    { name: 'ingest', label: 'Ingest Fixtures', status: 'pending' },
    { name: 'research', label: 'Research Matches', status: 'pending' },
    { name: 'predict', label: 'Generate Predictions', status: 'pending' },
    { name: 'report', label: 'Generate Report', status: 'pending' },
    { name: 'evaluate', label: 'Evaluate Results', status: 'pending' },
  ];
}

function StepIcon({ status }: { status: PipelineStep['status'] }) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'failed':
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    case 'skipped':
      return <Circle className="h-5 w-5 text-yellow-500" />;
    default:
      return <Circle className="h-5 w-5 text-muted-foreground/30" />;
  }
}

function StatusBadge({ status }: { status: PipelineStep['status'] }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    completed: 'default',
    failed: 'destructive',
    skipped: 'secondary',
    pending: 'outline',
  };

  return (
    <Badge variant={variants[status] || 'outline'} className="text-xs capitalize">
      {status}
    </Badge>
  );
}

export async function PipelineStatus() {
  const { steps, gwName, ingestLog, predictionCount } = await getPipelineState();
  const completedCount = steps.filter(s => s.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Pipeline Steps */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-cyan-500" />
              Current Pipeline
            </CardTitle>
            {gwName && (
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3 w-3" />
                {gwName}
              </Badge>
            )}
          </div>
          {ingestLog && (
            <p className="text-sm text-muted-foreground">
              Ingested {new Date(ingestLog.timestamp).toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {steps.map((step, i) => (
              <div key={step.name} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative">
                    <StepIcon status={step.status} />
                    {i < steps.length - 1 && (
                      <div className="absolute top-8 left-1/2 -translate-x-1/2 w-px h-4 bg-border" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{step.label}</p>
                    {step.detail && (
                      <p className="text-xs text-muted-foreground">{step.detail}</p>
                    )}
                  </div>
                </div>
                <StatusBadge status={step.status} />
              </div>
            ))}
          </div>

          {completedCount === 0 && (
            <div className="mt-4 p-4 bg-muted/50 rounded-xl text-center">
              <p className="text-sm text-muted-foreground">
                No pipeline runs yet. Run <code className="bg-muted px-1.5 py-0.5 rounded text-xs">/run-pipeline</code> to start.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">--</p>
                <p className="text-xs text-muted-foreground">Season Accuracy</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{predictionCount}</p>
                <p className="text-xs text-muted-foreground">Total Predictions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Brain className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Gameweeks Evaluated</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* League Breakdown */}
      {ingestLog && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-500" />
              League Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {Object.entries(ingestLog.results).map(([league, data]) => (
                <div key={league} className="p-3 bg-muted/50 rounded-xl">
                  <p className="font-medium text-sm truncate">{league}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Round {data.round} &middot; {data.matches} matches
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Signal Weights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            Model Weights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Elo Ratings', weight: 0.30, color: 'bg-blue-500' },
              { name: 'Poisson Model', weight: 0.30, color: 'bg-green-500' },
              { name: 'Bookmaker Odds', weight: 0.40, color: 'bg-purple-500' },
            ].map((signal) => (
              <div key={signal.name} className="flex items-center gap-3">
                <span className="text-sm font-medium w-32">{signal.name}</span>
                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${signal.color} rounded-full transition-all`}
                    style={{ width: `${signal.weight * 100}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-12 text-right">
                  {(signal.weight * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Current blend: 30% Elo + 30% Poisson + 40% Bookmaker Odds. Weights will adjust based on evaluation results.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
