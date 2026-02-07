#!/usr/bin/env npx tsx
/**
 * SportMonks CLI Tool — v3 API (Standard European Plan)
 * Usage: npx tsx scripts/fetch-sportmonks.ts <command> [args]
 *
 * Commands:
 *   fixtures    --league <id> [--round <n>] [--season <id>] [--days <n>]
 *   standings   --season <id>
 *   odds        --fixture <id> [--market <id>]
 *   h2h         --team1 <id> --team2 <id>
 *   team-stats  --team <id> [--season <id>]
 *   results     --league <id> [--round <n>] [--season <id>] [--days <n>]
 *   seasons     --league <id>
 *   fixture     --id <id>
 *   rounds      --season <id>
 *   teams       --season <id>
 *
 * Endpoint reference (Standard European Plan):
 *   Fixtures:   /fixtures, /fixtures/{id}, /fixtures/between/{start}/{end}
 *   H2H:        /fixtures/head-to-head/{team1}/{team2}
 *   Standings:  /standings/seasons/{seasonId}
 *   Odds:       /odds/pre-match/fixtures/{fixtureId}
 *                /odds/pre-match/fixtures/{fixtureId}/markets/{marketId}
 *   Teams:      /teams/{id}, /teams/seasons/{seasonId}
 *   Seasons:    /seasons?filters=seasonLeagues:{leagueId}
 *   Rounds:     /rounds/seasons/{seasonId}
 *   Leagues:    /leagues?include=currentSeason
 *
 * Market IDs: 1 = Fulltime Result (1X2)
 *
 * NOT available on Standard plan (needs add-ons):
 *   /predictions/probabilities — needs Predictions add-on
 *   /predictions/value-bets    — needs Predictions add-on
 *   /odds/fixtures/{id}        — needs Premium Odds add-on (use /odds/pre-match instead)
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load env from .env.local
config({ path: resolve(__dirname, '..', '.env.local') });

const BASE_URL = 'https://api.sportmonks.com/v3/football';
const API_TOKEN = process.env.SPORTMONKS_API_TOKEN;

if (!API_TOKEN) {
  console.error('Error: SPORTMONKS_API_TOKEN not found in .env.local');
  process.exit(1);
}

interface FetchOptions {
  include?: string;
  filters?: string;
  per_page?: number;
  page?: number;
  [key: string]: string | number | undefined;
}

async function fetchAPI<T>(endpoint: string, params: FetchOptions = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set('api_token', API_TOKEN!);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`SportMonks API error (${response.status}): ${error.message || JSON.stringify(error)}`);
  }

  return response.json() as Promise<T>;
}

// Paginated fetch — follows all pages automatically
async function fetchAllPages<T>(endpoint: string, params: FetchOptions = {}): Promise<{ data: T[] }> {
  const allData: T[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const result = await fetchAPI<{ data: T[]; pagination?: { has_more: boolean } }>(endpoint, {
      ...params,
      page,
      per_page: params.per_page || 50,
    });

    if (Array.isArray(result.data)) {
      allData.push(...result.data);
    }

    hasMore = result.pagination?.has_more ?? false;
    page++;

    // Safety: max 10 pages to avoid runaway
    if (page > 10) break;
  }

  return { data: allData };
}

function parseArgs(args: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
      parsed[key] = value;
      if (value !== 'true') i++;
    }
  }
  return parsed;
}

// ============================================================
// COMMANDS
// ============================================================

async function getFixtures(args: Record<string, string>) {
  const leagueId = args.league;
  const round = args.round;
  const seasonId = args.season;
  const days = parseInt(args.days || '14');

  if (!leagueId) {
    console.error('Error: --league <id> is required');
    process.exit(1);
  }

  const params: FetchOptions = {
    include: 'participants;scores;league;venue;state;round',
    per_page: 50,
  };

  let endpoint: string;

  if (round && seasonId) {
    // Specific round — resolve round dates then use date-range endpoint
    // Note: fixtureRounds filter is silently ignored by API, so we use date range
    const roundData = await fetchAPI<{ data: { id: number; name: string; starting_at: string; ending_at: string }[] }>(
      `/rounds/seasons/${seasonId}`,
      { per_page: 50 }
    );
    const targetRound = roundData.data.find(
      (r) => r.name === round || r.id === parseInt(round)
    );
    if (!targetRound) {
      console.error(`Error: Round ${round} not found in season ${seasonId}`);
      process.exit(1);
    }
    endpoint = `/fixtures/between/${targetRound.starting_at}/${targetRound.ending_at}`;
    params.filters = `fixtureLeagues:${leagueId}`;
  } else if (seasonId) {
    // All fixtures for a season (paginated)
    endpoint = `/fixtures`;
    params.filters = `fixtureLeagues:${leagueId};fixtureSeasons:${seasonId}`;
  } else {
    // Upcoming fixtures (next N days)
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);
    const startStr = today.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    endpoint = `/fixtures/between/${startStr}/${endStr}`;
    params.filters = `fixtureLeagues:${leagueId}`;
  }

  const data = await fetchAllPages(endpoint, params);
  console.log(JSON.stringify(data, null, 2));
}

async function getStandings(args: Record<string, string>) {
  const seasonId = args.season;
  if (!seasonId) {
    console.error('Error: --season <id> is required');
    process.exit(1);
  }

  const data = await fetchAPI(`/standings/seasons/${seasonId}`, {
    include: 'participant;details.type',
  });
  console.log(JSON.stringify(data, null, 2));
}

async function getOdds(args: Record<string, string>) {
  const fixtureId = args.fixture;
  const marketId = args.market || '1'; // Default: 1 = Fulltime Result (1X2)

  if (!fixtureId) {
    console.error('Error: --fixture <id> is required');
    process.exit(1);
  }

  // Standard plan uses /odds/pre-match/ (NOT /odds/fixtures/)
  const endpoint = `/odds/pre-match/fixtures/${fixtureId}/markets/${marketId}`;
  const data = await fetchAPI(endpoint, {
    include: 'market;bookmaker',
  });
  console.log(JSON.stringify(data, null, 2));
}

async function getH2H(args: Record<string, string>) {
  const team1 = args.team1;
  const team2 = args.team2;
  if (!team1 || !team2) {
    console.error('Error: --team1 <id> and --team2 <id> are required');
    process.exit(1);
  }

  const data = await fetchAPI(`/fixtures/head-to-head/${team1}/${team2}`, {
    include: 'scores;participants;league;venue;state',
    per_page: 10,
  });
  console.log(JSON.stringify(data, null, 2));
}

async function getTeamStats(args: Record<string, string>) {
  const teamId = args.team;
  const seasonId = args.season;
  if (!teamId) {
    console.error('Error: --team <id> is required');
    process.exit(1);
  }

  // Fetch team info
  const teamData = await fetchAPI(`/teams/${teamId}`, {
    include: 'venue;coaches;activeSeasons',
  });

  // If season provided, get squad for that season
  if (seasonId) {
    try {
      const squadData = await fetchAPI(`/squads/seasons/${seasonId}/teams/${teamId}`, {
        include: 'player',
      });
      console.log(JSON.stringify({ team: teamData, squad: squadData }, null, 2));
    } catch {
      // Squad endpoint might not be available, fall back to team only
      console.log(JSON.stringify(teamData, null, 2));
    }
  } else {
    console.log(JSON.stringify(teamData, null, 2));
  }
}

async function getResults(args: Record<string, string>) {
  const leagueId = args.league;
  const round = args.round;
  const seasonId = args.season;
  const days = parseInt(args.days || '7');

  if (!leagueId) {
    console.error('Error: --league <id> is required');
    process.exit(1);
  }

  const params: FetchOptions = {
    include: 'participants;scores;league;state;events;statistics.type;round',
    per_page: 50,
  };

  let endpoint: string;

  if (round && seasonId) {
    // Resolve round dates then use date-range (fixtureRounds filter is silently ignored)
    const roundData = await fetchAPI<{ data: { id: number; name: string; starting_at: string; ending_at: string }[] }>(
      `/rounds/seasons/${seasonId}`,
      { per_page: 50 }
    );
    const targetRound = roundData.data.find(
      (r) => r.name === round || r.id === parseInt(round)
    );
    if (!targetRound) {
      console.error(`Error: Round ${round} not found in season ${seasonId}`);
      process.exit(1);
    }
    endpoint = `/fixtures/between/${targetRound.starting_at}/${targetRound.ending_at}`;
    params.filters = `fixtureLeagues:${leagueId}`;
  } else {
    // Recent results (past N days)
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = today.toISOString().split('T')[0];
    endpoint = `/fixtures/between/${startStr}/${endStr}`;
    params.filters = `fixtureLeagues:${leagueId}`;
  }

  const data = await fetchAllPages(endpoint, params);

  // Filter to finished matches only (FT, AET, FT_PEN)
  const finishedStatuses = ['FT', 'AET', 'FT_PEN'];
  if (Array.isArray(data.data)) {
    data.data = data.data.filter((f: any) =>
      finishedStatuses.includes(f.state?.developer_name || '')
    );
  }

  console.log(JSON.stringify(data, null, 2));
}

async function getSeasons(args: Record<string, string>) {
  const leagueId = args.league;
  if (!leagueId) {
    console.error('Error: --league <id> is required');
    process.exit(1);
  }

  // Correct endpoint: /seasons with league filter
  const data = await fetchAPI(`/seasons`, {
    filters: `seasonLeagues:${leagueId}`,
    per_page: 25,
  });
  console.log(JSON.stringify(data, null, 2));
}

async function getRounds(args: Record<string, string>) {
  const seasonId = args.season;
  if (!seasonId) {
    console.error('Error: --season <id> is required');
    process.exit(1);
  }

  const data = await fetchAPI(`/rounds/seasons/${seasonId}`, {
    include: 'stage',
    per_page: 50,
  });
  console.log(JSON.stringify(data, null, 2));
}

async function getTeams(args: Record<string, string>) {
  const seasonId = args.season;
  if (!seasonId) {
    console.error('Error: --season <id> is required');
    process.exit(1);
  }

  const data = await fetchAPI(`/teams/seasons/${seasonId}`, {
    include: 'venue',
  });
  console.log(JSON.stringify(data, null, 2));
}

async function getFixture(args: Record<string, string>) {
  const fixtureId = args.id;
  if (!fixtureId) {
    console.error('Error: --id <id> is required');
    process.exit(1);
  }

  const data = await fetchAPI(`/fixtures/${fixtureId}`, {
    include: 'participants;scores;league;venue;state;events;statistics.type;lineups.player;round',
  });
  console.log(JSON.stringify(data, null, 2));
}

// ============================================================
// MAIN
// ============================================================

const [command, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);

const commands: Record<string, (args: Record<string, string>) => Promise<void>> = {
  fixtures: getFixtures,
  standings: getStandings,
  odds: getOdds,
  h2h: getH2H,
  'team-stats': getTeamStats,
  results: getResults,
  seasons: getSeasons,
  rounds: getRounds,
  teams: getTeams,
  fixture: getFixture,
};

if (!command || !commands[command]) {
  console.error(`Usage: npx tsx scripts/fetch-sportmonks.ts <command> [args]

Commands:
  fixtures    --league <id> [--round <n>] [--season <id>] [--days <n>]
  standings   --season <id>
  odds        --fixture <id> [--market <id>]   (market 1 = 1X2 Fulltime Result)
  h2h         --team1 <id> --team2 <id>
  team-stats  --team <id> [--season <id>]
  results     --league <id> [--round <n>] [--season <id>] [--days <n>]
  seasons     --league <id>
  rounds      --season <id>
  teams       --season <id>
  fixture     --id <id>
  `);
  process.exit(1);
}

commands[command](args).catch((err: Error) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
