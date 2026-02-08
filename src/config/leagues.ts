export interface League {
  id: number;
  name: string;
  shortName: string;
  country: string;
  countryCode: string;
  flag: string;
  logo?: string;
  tier: 'free' | 'gold';
  seasonId: number;
}

export const LEAGUES: League[] = [
  {
    id: 8,
    name: 'Premier League',
    shortName: 'PL',
    country: 'England',
    countryCode: 'GB-ENG',
    flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
    tier: 'free',
    seasonId: 25583,
  },
  {
    id: 564,
    name: 'La Liga',
    shortName: 'LL',
    country: 'Spain',
    countryCode: 'ES',
    flag: '\u{1F1EA}\u{1F1F8}',
    tier: 'gold',
    seasonId: 25659,
  },
  {
    id: 82,
    name: 'Bundesliga',
    shortName: 'BL',
    country: 'Germany',
    countryCode: 'DE',
    flag: '\u{1F1E9}\u{1F1EA}',
    tier: 'gold',
    seasonId: 25646,
  },
  {
    id: 384,
    name: 'Serie A',
    shortName: 'SA',
    country: 'Italy',
    countryCode: 'IT',
    flag: '\u{1F1EE}\u{1F1F9}',
    tier: 'gold',
    seasonId: 25533,
  },
  {
    id: 301,
    name: 'Ligue 1',
    shortName: 'L1',
    country: 'France',
    countryCode: 'FR',
    flag: '\u{1F1EB}\u{1F1F7}',
    tier: 'gold',
    seasonId: 25651,
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
export const GOLD_LEAGUES = LEAGUES.filter((l) => l.tier === 'gold');
/** @deprecated Use GOLD_LEAGUES instead */
export const PRO_LEAGUES = GOLD_LEAGUES;

export function getLeagueById(id: number): League | undefined {
  return LEAGUE_BY_ID[id];
}

export function getLeaguesForTier(tier: 'free' | 'pro' | 'gold' | 'unlimited'): League[] {
  if (tier === 'free' || tier === 'pro') return FREE_LEAGUES;
  return LEAGUES;
}
