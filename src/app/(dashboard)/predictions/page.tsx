import { Metadata } from 'next';
import { Suspense } from 'react';
import { PredictionsList, getAvailableGameweeks } from './predictions-list';
import { PredictionsFilter } from './predictions-filter';
import { PredictionCardSkeleton } from '@/components/predictions/prediction-card';
import { LEAGUES } from '@/config/leagues';
import { Target } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Predictions',
  description: 'AI-powered football match predictions',
};

// ISR: Revalidate every 5 minutes
export const revalidate = 300;

interface PredictionsPageProps {
  searchParams: Promise<{ league?: string; gw?: string }>;
}

export default async function PredictionsPage({ searchParams }: PredictionsPageProps) {
  const params = await searchParams;
  const leagueId = params.league ? parseInt(params.league) : LEAGUES[0].id;
  const selectedLeague = LEAGUES.find((l) => l.id === leagueId) || LEAGUES[0];

  const availableGameweeks = await getAvailableGameweeks();
  const latestGW = availableGameweeks[0] || 1;
  const requestedGW = params.gw ? parseInt(params.gw) : latestGW;
  const currentGW = availableGameweeks.includes(requestedGW) ? requestedGW : latestGW;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <Target className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold leading-tight">Predictions</h1>
          <p className="text-xs text-muted-foreground">ML-powered match predictions across 50+ factors</p>
        </div>
      </div>

      <PredictionsFilter
        selectedLeagueId={selectedLeague.id}
        leagues={LEAGUES}
        currentGameweek={currentGW}
        availableGameweeks={availableGameweeks}
      />

      <Suspense fallback={<PredictionsLoading />}>
        <PredictionsList leagueId={selectedLeague.id} gameweek={currentGW} />
      </Suspense>
    </div>
  );
}

function PredictionsLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <PredictionCardSkeleton key={i} />
      ))}
    </div>
  );
}
