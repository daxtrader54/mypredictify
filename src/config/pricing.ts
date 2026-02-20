export type PricingTier = 'free' | 'pro' | 'gold';

export interface PricingPlan {
  id: PricingTier;
  name: string;
  description: string;
  price: number; // in pence, 0 for free
  priceAnnual: number; // in pence, annual pricing
  credits: number;
  dailyRefresh: number; // daily free credit refresh
  features: string[];
  freeLeagues: string[]; // leagues that don't cost credits
  stripePriceIdMonthly: string | null;
  stripePriceIdAnnual: string | null;
  popular?: boolean;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Get started with football predictions',
    price: 0,
    priceAnnual: 0,
    credits: 100,
    dailyRefresh: 10,
    features: [
      '100 credits per month',
      '+10 daily bonus credits',
      'All 5 leagues (credits per prediction)',
      'Basic match analysis',
      '3 AI ACCA recommendations/day',
    ],
    freeLeagues: [],
    stripePriceIdMonthly: null,
    stripePriceIdAnnual: null,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Unlimited Premier League predictions',
    price: 1900, // £19
    priceAnnual: 15900, // £159/year (£13.25/mo)
    credits: 100,
    dailyRefresh: 10,
    features: [
      'Unlimited Premier League predictions',
      '100 credits + 10 daily for other leagues',
      'Value bet identification',
      'Unlimited AI ACCA recommendations',
      'Advanced match statistics',
    ],
    freeLeagues: ['premier-league'],
    stripePriceIdMonthly: 'price_1SyAY2Lmb0GWa8mAlktlZbHG',
    stripePriceIdAnnual: 'price_1SyAY3Lmb0GWa8mAQdZad4t1',
  },
  {
    id: 'gold',
    name: 'Gold',
    description: 'Unlimited access to all 5 European leagues',
    price: 4900, // £49
    priceAnnual: 41000, // £410/year (~£34.17/mo)
    credits: Infinity,
    dailyRefresh: 0,
    features: [
      'Unlimited predictions — all leagues',
      'No credit limits',
      'Value bet identification',
      'Unlimited AI ACCA recommendations',
      'Advanced match statistics',
      'Priority support',
    ],
    freeLeagues: ['premier-league', 'la-liga', 'bundesliga', 'serie-a', 'ligue-1'],
    stripePriceIdMonthly: 'price_1SyLExLmb0GWa8mAieUyCHPU',
    stripePriceIdAnnual: 'price_1SyLFULmb0GWa8mAcvjpehTq',
    popular: true,
  },
];

export const CREDIT_COSTS = {
  VIEW_PREDICTION: 1,
  VIEW_DETAILED_STATS: 2,
  GENERATE_ACCA: 5,
  VIEW_VALUE_BET: 2,
  REVEAL_LEAGUE_DASHBOARD: 10,
  REVEAL_ALL_DASHBOARD: 50,
} as const;

export const FREE_ACCA_DAILY_LIMIT = 3;

// Premier League league ID for tier-based free access checks
export const PREMIER_LEAGUE_ID = 8;

export function getPlanById(id: PricingTier): PricingPlan | undefined {
  return PRICING_PLANS.find((plan) => plan.id === id);
}

export function formatPrice(pence: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(pence / 100);
}

/**
 * Check if a prediction is free (no credit cost) for a given tier + league.
 * - Gold: everything is free
 * - Pro: PL is free, other leagues cost credits
 * - Free: everything costs credits
 */
export function isFreeForTier(tier: PricingTier, leagueId: number): boolean {
  if (tier === 'gold') return true;
  if (tier === 'pro' && leagueId === PREMIER_LEAGUE_ID) return true;
  return false;
}

export function getMonthlyCredits(tier: PricingTier): number {
  const plan = getPlanById(tier);
  return plan?.credits || 0;
}

export function isPaidTier(tier: PricingTier): boolean {
  return tier === 'pro' || tier === 'gold';
}
