export type PricingTier = 'free' | 'pro';

export interface PricingPlan {
  id: PricingTier;
  name: string;
  description: string;
  price: number; // in pence, 0 for free
  priceAnnual: number; // in pence, annual pricing
  credits: number;
  dailyRefresh: number; // daily free credit refresh
  features: string[];
  leagues: string[];
  stripePriceIdMonthly: string | null;
  stripePriceIdAnnual: string | null;
  popular?: boolean;
}

export interface AddOn {
  id: string;
  name: string;
  description: string;
  price: number; // in pence per month
  stripePriceId: string | null;
  features: string[];
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Get started with Premier League predictions',
    price: 0,
    priceAnnual: 0,
    credits: 100,
    dailyRefresh: 10,
    features: [
      '100 credits per month',
      '+10 daily bonus credits',
      'Premier League predictions',
      'Basic match analysis',
      '3 AI ACCA recommendations/day',
    ],
    leagues: ['premier-league'],
    stripePriceIdMonthly: null,
    stripePriceIdAnnual: null,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Full access to all European leagues',
    price: 1900, // £19
    priceAnnual: 15900, // £159/year (£13.25/mo)
    credits: 1000,
    dailyRefresh: 0,
    features: [
      '1,000 credits per month',
      'All 5 European leagues',
      'Value bet identification',
      'Unlimited AI ACCA recommendations',
      'Advanced match statistics',
      'Priority support',
    ],
    leagues: ['premier-league', 'la-liga', 'bundesliga', 'serie-a', 'ligue-1'],
    stripePriceIdMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || null,
    stripePriceIdAnnual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || null,
    popular: true,
  },
];

export const ADD_ONS: AddOn[] = [
  {
    id: 'api-access',
    name: 'API Access',
    description: 'Programmatic access for automation and integrations',
    price: 12900, // £129/mo
    stripePriceId: process.env.STRIPE_API_ADDON_PRICE_ID || null,
    features: [
      'RESTful API access',
      'Webhook notifications',
      'Up to 10,000 API calls/month',
      'Prediction data export',
      'Custom integrations',
    ],
  },
];

export const CREDIT_COSTS = {
  VIEW_PREDICTION: 1,
  VIEW_DETAILED_STATS: 2,
  GENERATE_ACCA: 5,
  VIEW_VALUE_BET: 2,
} as const;

export const FREE_ACCA_DAILY_LIMIT = 3;

export function getPlanById(id: PricingTier): PricingPlan | undefined {
  return PRICING_PLANS.find((plan) => plan.id === id);
}

export function getAddOnById(id: string): AddOn | undefined {
  return ADD_ONS.find((addon) => addon.id === id);
}

export function formatPrice(pence: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(pence / 100);
}

export function canAccessLeague(tier: PricingTier, leagueSlug: string): boolean {
  const plan = getPlanById(tier);
  if (!plan) return false;
  return plan.leagues.includes(leagueSlug) || plan.leagues.includes('all');
}

export function getMonthlyCredits(tier: PricingTier): number {
  const plan = getPlanById(tier);
  return plan?.credits || 0;
}
