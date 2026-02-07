export interface League {
  id: number;
  name: string;
  shortName: string;
  country: string;
  countryCode: string;
  logo?: string;
  tier: 'free' | 'pro';
}

export const LEAGUES: League[] = [
  {
    id: 8,
    name: 'Premier League',
    shortName: 'PL',
    country: 'England',
    countryCode: 'GB-ENG',
    tier: 'free',
  },
  {
    id: 564,
    name: 'La Liga',
    shortName: 'LL',
    country: 'Spain',
    countryCode: 'ES',
    tier: 'pro',
  },
  {
    id: 82,
    name: 'Bundesliga',
    shortName: 'BL',
    country: 'Germany',
    countryCode: 'DE',
    tier: 'pro',
  },
  {
    id: 384,
    name: 'Serie A',
    shortName: 'SA',
    country: 'Italy',
    countryCode: 'IT',
    tier: 'pro',
  },
  {
    id: 301,
    name: 'Ligue 1',
    shortName: 'L1',
    country: 'France',
    countryCode: 'FR',
    tier: 'pro',
  },
];

export const LEAGUE_BY_ID = LEAGUES.reduce(
  (acc, league) => {
    acc[league.id] = league;
    return acc;
  },
  {} as Record<number, League>
);

export const FREE_LEAGUES = LEAGUES.filter((l) => l.tier === 'free');
export const PRO_LEAGUES = LEAGUES.filter((l) => l.tier === 'pro');

export function getLeagueById(id: number): League | undefined {
  return LEAGUE_BY_ID[id];
}

export function getLeaguesForTier(tier: 'free' | 'pro' | 'unlimited'): League[] {
  if (tier === 'free') return FREE_LEAGUES;
  return LEAGUES;
}
