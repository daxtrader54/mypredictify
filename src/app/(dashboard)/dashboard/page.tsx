import { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { getOrCreateUser } from '@/lib/db/users';
import { DashboardContent } from './dashboard-content';
import { AccuracyTracker } from '@/components/dashboard/accuracy-tracker';
import { LeagueStandings } from '@/components/dashboard/league-standings';
import { UpcomingFixtures } from '@/components/dashboard/upcoming-fixtures';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your MyPredictify dashboard',
};

export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.user?.email) {
    redirect('/login');
  }

  const user = await getOrCreateUser(
    session.user.email,
    session.user.name,
    session.user.image
  );

  return (
    <div className="space-y-6">
      <DashboardContent user={user} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-lg" />}>
          <UpcomingFixtures />
        </Suspense>
        <LeagueStandings />
      </div>

      <AccuracyTracker />
    </div>
  );
}
