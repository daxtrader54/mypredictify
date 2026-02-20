import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In — AI Football Predictions',
  description: 'Sign in to MyPredictify and access AI-powered football predictions, value bets, and ACCA builder for the Premier League, La Liga, Bundesliga, Serie A and Ligue 1.',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
