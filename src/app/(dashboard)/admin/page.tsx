import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { isAdmin } from '@/config/site';
import { AdminContent } from './admin-content';

export const metadata: Metadata = {
  title: 'Admin',
  description: 'User management',
};

export default async function AdminPage() {
  const session = await getSession();

  if (!session?.user?.email || !isAdmin(session.user.email)) {
    redirect('/dashboard');
  }

  return <AdminContent />;
}
