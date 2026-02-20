/** Current football season — change this when a new season starts. */
export const CURRENT_SEASON = '2025-26';

export const ADMIN_EMAILS = ['daxtrader54@gmail.com'];
export const ADMIN_EMAIL = ADMIN_EMAILS[0]; // legacy compat

export function isAdmin(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email);
}

export const siteConfig = {
  name: 'MyPredictify',
  description: 'AI-powered football predictions and betting recommendations',
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://mypredictify.com',
  ogImage: '/og-image.png',
  links: {
    twitter: 'https://twitter.com/mypredictify',
  },
  creator: 'MyPredictify',
  keywords: [
    'football predictions',
    'betting tips',
    'AI predictions',
    'Premier League',
    'La Liga',
    'Bundesliga',
    'Serie A',
    'Ligue 1',
    'accumulator',
    'ACCA',
    'value bets',
  ],
};

export const navConfig = {
  mainNav: [
    {
      title: 'Predictions',
      href: '/predictions',
    },
    {
      title: 'Value Bets',
      href: '/value-bets',
    },
    {
      title: 'ACCA Builder',
      href: '/acca-builder',
    },
    {
      title: 'Pricing',
      href: '/pricing',
    },
  ],
};
