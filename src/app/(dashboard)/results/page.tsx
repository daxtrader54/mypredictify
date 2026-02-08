import { Metadata } from 'next';
import { Suspense } from 'react';
import { CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ResultsList } from './results-list';

export const metadata: Metadata = {
  title: 'Results',
  description: 'Match results vs predictions — see how our AI performed',
};

export const revalidate = 300;

export default function ResultsPage() {
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
        <ResultsList />
      </Suspense>
    </div>
  );
}

function ResultsLoading() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-48 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
