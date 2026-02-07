import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { ValueBetsList } from './value-bets-list';

export const metadata: Metadata = {
  title: 'Value Bets',
  description: 'AI-identified value bets where model probabilities exceed bookmaker odds',
};

export default async function ValueBetsPage() {
  const session = await getSession();

  if (!session?.user?.email) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Value Bets</h1>
        <p className="text-muted-foreground mt-1">
          Matches where our model finds edges over the bookmaker odds
        </p>
      </div>
      <ValueBetsList />
    </div>
  );
}
