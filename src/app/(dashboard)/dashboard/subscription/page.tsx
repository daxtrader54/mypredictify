import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { getOrCreateUser } from '@/lib/db/users';
import { SubscriptionContent } from './subscription-content';

export const metadata: Metadata = {
  title: 'Subscription',
  description: 'Manage your MyPredictify subscription',
};

export default async function SubscriptionPage() {
  const session = await getSession();

  if (!session?.user?.email) {
    redirect('/login');
  }

  const user = await getOrCreateUser(
    session.user.email,
    session.user.name,
    session.user.image
  );

  return <SubscriptionContent user={user} />;
}
