import { unstable_cache } from 'next/cache';
import type {
  SportMonksResponse,
  Fixture,
  Standing,
  Season,
  League,
  Team,
  Odd,
  FixturesQueryParams,
  ProcessedFixture,
  ProcessedTeam,
} from './types';

const BASE_URL = 'https://api.sportmonks.com/v3/football';

class SportMonksError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public entity?: string
  ) {
    super(message);
    this.name = 'SportMonksError';
  }
}

class SportMonksClient {
  private apiToken: string;

  constructor() {
    const token = process.env.SPORTMONKS_API_TOKEN;
    if (!token) {
      throw new Error('SPORTMONKS_API_TOKEN environment variable is required');
    }
    this.apiToken = token;
  }

  private async request<T>(
    endpoint: string,
    params: Record<string, string | number | undefined> = {},
    options: { revalidate?: number; tags?: string[] } = {}
  ): Promise<SportMonksResponse<T>> {
    const url = new URL(`${BASE_URL}${endpoint}`);
    url.searchParams.set('api_token', this.apiToken);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });

    const fetchOptions: RequestInit & { next?: { revalidate?: number; tags?: string[] } } = {
      headers: {
        Accept: 'application/json',
      },
    };

    if (options.revalidate !== undefined || options.tags) {
      fetchOptions.next = {};
      if (options.revalidate !== undefined) {
        fetchOptions.next.revalidate = options.revalidate;
      }
      if (options.tags) {
        fetchOptions.next.tags = options.tags;
      }
    }

    const response = await fetch(url.toString(), fetchOptions);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new SportMonksError(
        response.status,
        error.message || `HTTP ${response.status}`,
        endpoint
      );
    }

    return response.json();
  }

  // Fixtures
  async getFixtures(params: FixturesQueryParams = {}): Promise<SportMonksResponse<Fixture[]>> {
    return this.request<Fixture[]>('/fixtures', params, {
      revalidate: 300, // 5 minutes
      tags: ['fixtures'],
    });
  }

  async getFixtureById(id: number, include?: string): Promise<SportMonksResponse<Fixture>> {
    return this.request<Fixture>(`/fixtures/${id}`, { include }, {
      revalidate: 300,
      tags: ['fixtures', `fixture-${id}`],
    });
  }

  async getFixturesByDate(date: string, params: FixturesQueryParams = {}): Promise<SportMonksResponse<Fixture[]>> {
    return this.request<Fixture[]>(`/fixtures/date/${date}`, params, {
      revalidate: 300,
      tags: ['fixtures', `fixtures-date-${date}`],
    });
  }

  async getFixturesByDateRange(
    startDate: string,
    endDate: string,
    params: FixturesQueryParams = {}
  ): Promise<SportMonksResponse<Fixture[]>> {
    return this.request<Fixture[]>(`/fixtures/between/${startDate}/${endDate}`, params, {
      revalidate: 300,
      tags: ['fixtures'],
    });
  }

  async getFixturesByLeague(
    leagueId: number,
    seasonId?: number,
    params: FixturesQueryParams = {}
  ): Promise<SportMonksResponse<Fixture[]>> {
    const filters = seasonId
      ? `fixtureLeagues:${leagueId};fixtureSeasons:${seasonId}`
      : `fixtureLeagues:${leagueId}`;
    return this.request<Fixture[]>('/fixtures', {
      ...params,
      filters,
    }, {
      revalidate: 300,
      tags: ['fixtures', `fixtures-league-${leagueId}`],
    });
  }

  async getHeadToHead(teamId1: number, teamId2: number): Promise<SportMonksResponse<Fixture[]>> {
    return this.request<Fixture[]>(`/fixtures/head-to-head/${teamId1}/${teamId2}`, {
      include: 'scores;participants',
    }, {
      revalidate: 3600, // 1 hour
      tags: ['h2h', `h2h-${teamId1}-${teamId2}`],
    });
  }

  // Rounds
  async getRoundsBySeason(seasonId: number): Promise<SportMonksResponse<unknown[]>> {
    return this.request<unknown[]>(`/rounds/seasons/${seasonId}`, {
      include: 'stage',
      per_page: 50,
    }, {
      revalidate: 86400,
      tags: ['rounds', `rounds-season-${seasonId}`],
    });
  }

  // Odds (Standard plan uses /odds/pre-match/ endpoints)
  async getOddsByFixture(fixtureId: number, marketId: number = 1): Promise<SportMonksResponse<Odd[]>> {
    return this.request<Odd[]>(`/odds/pre-match/fixtures/${fixtureId}/markets/${marketId}`, {
      include: 'market;bookmaker',
    }, {
      revalidate: 300,
      tags: ['odds', `odds-fixture-${fixtureId}`],
    });
  }

  async getPreMatchOdds(fixtureId: number, params: Record<string, string | number> = {}): Promise<SportMonksResponse<Odd[]>> {
    return this.request<Odd[]>(`/odds/pre-match/fixtures/${fixtureId}`, {
      include: 'market;bookmaker',
      ...params,
    }, {
      revalidate: 300,
      tags: ['odds', 'pre-match-odds'],
    });
  }

  // Standings
  async getStandingsBySeason(seasonId: number): Promise<SportMonksResponse<Standing[]>> {
    return this.request<Standing[]>(`/standings/seasons/${seasonId}`, {
      include: 'participant;details.type',
    }, {
      revalidate: 3600, // 1 hour
      tags: ['standings', `standings-season-${seasonId}`],
    });
  }

  async getLiveStandingsBySeason(seasonId: number): Promise<SportMonksResponse<Standing[]>> {
    return this.request<Standing[]>(`/standings/live/seasons/${seasonId}`, {
      include: 'participant;details.type',
    }, {
      revalidate: 60, // 1 minute for live
      tags: ['standings', 'live-standings'],
    });
  }

  // Leagues & Seasons
  async getLeagues(): Promise<SportMonksResponse<League[]>> {
    return this.request<League[]>('/leagues', {}, {
      revalidate: 86400, // 24 hours
      tags: ['leagues'],
    });
  }

  async getSeasonsByLeague(leagueId: number): Promise<SportMonksResponse<Season[]>> {
    return this.request<Season[]>('/seasons', {
      filters: `seasonLeagues:${leagueId}`,
      per_page: 25,
    }, {
      revalidate: 86400,
      tags: ['seasons', `seasons-league-${leagueId}`],
    });
  }

  async getCurrentSeason(leagueId: number): Promise<Season | null> {
    const response = await this.getSeasonsByLeague(leagueId);
    return response.data.find((s) => s.is_current) || null;
  }

  // Teams
  async getTeamsBySeason(seasonId: number): Promise<SportMonksResponse<Team[]>> {
    return this.request<Team[]>(`/teams/seasons/${seasonId}`, {
      include: 'venue',
    }, {
      revalidate: 86400,
      tags: ['teams', `teams-season-${seasonId}`],
    });
  }

  async getTeamById(teamId: number): Promise<SportMonksResponse<Team>> {
    return this.request<Team>(`/teams/${teamId}`, {
      include: 'venue',
    }, {
      revalidate: 86400,
      tags: ['teams', `team-${teamId}`],
    });
  }
}

// Singleton instance
let clientInstance: SportMonksClient | null = null;

export function getSportMonksClient(): SportMonksClient {
  if (!clientInstance) {
    clientInstance = new SportMonksClient();
  }
  return clientInstance;
}

// Helper functions for data processing

export function processFixture(fixture: Fixture): ProcessedFixture {
  const homeTeam = fixture.participants?.find((p) => p.meta?.location === 'home');
  const awayTeam = fixture.participants?.find((p) => p.meta?.location === 'away');

  const homeScore = fixture.scores?.find(
    (s) => s.score.participant === 'home' && s.description === 'CURRENT'
  );
  const awayScore = fixture.scores?.find(
    (s) => s.score.participant === 'away' && s.description === 'CURRENT'
  );

  let status: ProcessedFixture['status'] = 'upcoming';
  if (fixture.state?.developer_name === 'FT' || fixture.state?.developer_name === 'AET') {
    status = 'finished';
  } else if (fixture.state?.developer_name?.includes('LIVE') || fixture.state?.developer_name === 'HT') {
    status = 'live';
  } else if (fixture.state?.developer_name === 'POSTP' || fixture.state?.developer_name === 'CANC') {
    status = 'postponed';
  }

  return {
    id: fixture.id,
    leagueId: fixture.league_id,
    leagueName: fixture.league?.name || '',
    homeTeam: processTeam(homeTeam),
    awayTeam: processTeam(awayTeam),
    startTime: new Date(fixture.starting_at),
    status,
    score: homeScore && awayScore
      ? { home: homeScore.score.goals, away: awayScore.score.goals }
      : undefined,
    venue: fixture.venue?.name,
  };
}

function processTeam(team?: Team): ProcessedTeam {
  return {
    id: team?.id || 0,
    name: team?.name || 'Unknown',
    shortCode: team?.short_code || '???',
    logo: team?.image_path || '',
  };
}

// Cached functions for common queries

export const getCachedUpcomingFixtures = unstable_cache(
  async (leagueIds: number[], days: number = 7) => {
    const client = getSportMonksClient();
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    const startStr = today.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const response = await client.getFixturesByDateRange(startStr, endStr, {
      include: 'participants;scores;league;venue;state',
      filters: `fixtureLeagues:${leagueIds.join(',')}`,
    });

    return response.data.map(processFixture);
  },
  ['upcoming-fixtures'],
  { revalidate: 300, tags: ['fixtures'] }
);

export const getCachedStandings = unstable_cache(
  async (seasonId: number) => {
    const client = getSportMonksClient();
    const response = await client.getStandingsBySeason(seasonId);
    return response.data;
  },
  ['standings'],
  { revalidate: 3600, tags: ['standings'] }
);

export { SportMonksClient, SportMonksError };
