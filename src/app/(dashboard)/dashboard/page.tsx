import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { getOrCreateUser } from '@/lib/db/users';
import { DashboardContent } from './dashboard-content';
import { AccuracyTracker } from '@/components/dashboard/accuracy-tracker';

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
    <div className="space-y-8">
      <DashboardContent user={user} />
      <AccuracyTracker />
    </div>
  );
}
