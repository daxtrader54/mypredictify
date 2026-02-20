import { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { promises as fs } from 'fs';
import path from 'path';
import { getSession } from '@/lib/auth/get-session';
import { getOrCreateUser } from '@/lib/db/users';
import { DashboardContent } from './dashboard-content';
import { AccuracyTracker } from '@/components/dashboard/accuracy-tracker';
import { LeagueStandings } from '@/components/dashboard/league-standings';
import { UpcomingFixtures } from '@/components/dashboard/upcoming-fixtures';
import { Skeleton } from '@/components/ui/skeleton';
import { getAvailableGameweeks, GW_BASE_DIR } from '@/lib/gameweeks';

export const metadata: Metadata = {
  title: 'Dashboard — Upcoming Fixtures, Standings & Accuracy',
  description: 'Your MyPredictify dashboard with upcoming fixtures, live league standings, prediction accuracy tracker, and credits overview.',
};

async function getThisWeekPredictions(): Promise<number> {
  try {
    const gws = await getAvailableGameweeks();
    if (gws.length === 0) return 0;
    const latestGw = gws[0];
    const predsPath = path.join(GW_BASE_DIR, `GW${latestGw}`, 'predictions.json');
    const raw = await fs.readFile(predsPath, 'utf-8');
    const preds = JSON.parse(raw);
    return Array.isArray(preds) ? preds.length : 0;
  } catch {
    return 0;
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const session = await getSession();

  if (!session?.user?.email) {
    redirect('/login');
  }

  const [user, thisWeekPredictions, params] = await Promise.all([
    getOrCreateUser(session.user.email, session.user.name, session.user.image),
    getThisWeekPredictions(),
    searchParams,
  ]);

  const justUpgraded = params.upgraded === 'true';

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-lg" />}>
          <UpcomingFixtures />
        </Suspense>
        <LeagueStandings />
      </div>

      <AccuracyTracker />

      <DashboardContent user={user} thisWeekPredictions={thisWeekPredictions} justUpgraded={justUpgraded} />
    </div>
  );
}
