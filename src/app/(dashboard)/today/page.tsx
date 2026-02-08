import { Metadata } from 'next';
import { Suspense } from 'react';
import { TodaysFixtures } from './todays-fixtures';
import { PredictionCardSkeleton } from '@/components/predictions/prediction-card';
import { CalendarDays } from 'lucide-react';
import { format } from 'date-fns';

export const metadata: Metadata = {
  title: "Today's Games",
  description: "Today's football fixtures with AI predictions",
};

export const revalidate = 300;

export default function TodayPage() {
  const todayStr = format(new Date(), 'EEEE, MMMM d, yyyy');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
          <CalendarDays className="h-4 w-4 text-emerald-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold leading-tight">Today&apos;s Games</h1>
          <p className="text-xs text-muted-foreground">{todayStr}</p>
        </div>
      </div>

      <Suspense fallback={<TodayLoading />}>
        <TodaysFixtures />
      </Suspense>
    </div>
  );
}

function TodayLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <PredictionCardSkeleton key={i} />
      ))}
    </div>
  );
}
