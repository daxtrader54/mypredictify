import { Metadata } from 'next';
import { Suspense } from 'react';
import { PredictionsList } from './predictions-list';
import { PredictionsFilter } from './predictions-filter';
import { PredictionCardSkeleton } from '@/components/predictions/prediction-card';
import { LEAGUES } from '@/config/leagues';
import { Badge } from '@/components/ui/badge';
import { Target, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Predictions',
  description: 'AI-powered football match predictions',
};

// ISR: Revalidate every 5 minutes
export const revalidate = 300;

interface PredictionsPageProps {
  searchParams: Promise<{ league?: string; date?: string }>;
}

export default async function PredictionsPage({ searchParams }: PredictionsPageProps) {
  const params = await searchParams;
  const leagueId = params.league ? parseInt(params.league) : LEAGUES[0].id;
  const selectedLeague = LEAGUES.find((l) => l.id === leagueId) || LEAGUES[0];

  return (
    <div className="space-y-6">
      {/* Header with gradient */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="relative">
          <Badge variant="outline" className="mb-3 border-primary/50 text-primary">
            <Sparkles className="w-3 h-3 mr-1" />
            ML-Powered
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Target className="h-6 w-6 text-primary" />
            </div>
            Predictions
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            AI-powered match predictions for upcoming fixtures. Our machine learning models analyze team form, head-to-head records, and 50+ other factors.
          </p>
        </div>
      </div>

      <PredictionsFilter
        selectedLeagueId={selectedLeague.id}
        leagues={LEAGUES}
      />

      <Suspense fallback={<PredictionsLoading />}>
        <PredictionsList leagueId={selectedLeague.id} />
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
