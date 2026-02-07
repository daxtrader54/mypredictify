export const ADMIN_EMAIL = 'daxtrader54@gmail.com';

export const siteConfig = {
  name: 'MyPredictify',
  description: 'AI-powered football predictions and betting recommendations',
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://mypredictify.com',
  ogImage: '/og-image.png',
  links: {
    twitter: 'https://twitter.com/mypredictify',
    github: 'https://github.com/mypredictify',
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
  sidebarNav: [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: 'dashboard',
    },
    {
      title: 'Predictions',
      href: '/predictions',
      icon: 'target',
    },
    {
      title: 'Value Bets',
      href: '/value-bets',
      icon: 'trending-up',
    },
    {
      title: 'ACCA Builder',
      href: '/acca-builder',
      icon: 'layers',
    },
    {
      title: 'Pipeline',
      href: '/pipeline',
      icon: 'workflow',
    },
    {
      title: 'Reports',
      href: '/reports',
      icon: 'file-text',
    },
    {
      title: 'History',
      href: '/history',
      icon: 'history',
    },
  ],
};
