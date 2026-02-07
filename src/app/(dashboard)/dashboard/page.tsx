import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { getUser } from '@/lib/db/users';
import { DashboardContent } from './dashboard-content';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your MyPredictify dashboard',
};

export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.user?.email) {
    redirect('/login');
  }

  const user = await getUser(session.user.email);

  if (!user) {
    redirect('/login');
  }

  return <DashboardContent user={user} />;
}
