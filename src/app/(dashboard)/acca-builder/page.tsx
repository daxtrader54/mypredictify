import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { AccaBuilderContent } from './acca-builder-content';

export const metadata: Metadata = {
  title: 'ACCA Builder',
  description: 'Build your accumulator bet with AI recommendations',
};

export default async function AccaBuilderPage() {
  const session = await getSession();

  if (!session?.user?.email) {
    redirect('/login');
  }

  return <AccaBuilderContent />;
}
