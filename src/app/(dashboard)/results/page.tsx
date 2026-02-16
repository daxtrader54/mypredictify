import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ResultsList } from './results-list';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Results',
  description: 'Match results vs predictions — see how our AI performed',
  openGraph: {
    title: 'Results | MyPredictify',
    description: 'Match results vs predictions — track our AI accuracy across every gameweek.',
    images: [{ url: `${siteConfig.url}/api/og/results?gw=latest`, width: 1200, height: 630 }],
  },
};

export const dynamic = 'force-dynamic';

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
          <CheckCircle className="h-4 w-4 text-emerald-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold leading-tight">Results</h1>
          <p className="text-xs text-muted-foreground">Match outcomes vs predictions — track our accuracy</p>
        </div>
      </div>

      <Suspense fallback={<ResultsLoading />}>
        <ResultsList page={page} />
      </Suspense>
    </div>
  );
}

function ResultsLoading() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}
