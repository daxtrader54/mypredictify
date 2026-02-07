// Parse fixture output and create structured match data for ingest
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env.local') });

const token = process.env.SPORTMONKS_API_TOKEN;
const base = 'https://api.sportmonks.com/v3/football';

async function fetchJSON(endpoint, params = {}) {
  const url = new URL(`${base}${endpoint}`);
  url.searchParams.set('api_token', token);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  const r = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`API error ${r.status}: ${await r.text()}`);
  return r.json();
}

async function fetchAllPages(endpoint, params = {}) {
  const allData = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const result = await fetchJSON(endpoint, { ...params, page, per_page: params.per_page || 50 });
    if (Array.isArray(result.data)) allData.push(...result.data);
    hasMore = result.pagination?.has_more ?? false;
    page++;
    if (page > 10) break;
  }
  return allData;
}

// Config
const leagues = JSON.parse(readFileSync(resolve(__dirname, '..', 'data', 'config', 'leagues.json'), 'utf8'));

const args = process.argv.slice(2);
const leagueFilter = args.find(a => a.startsWith('--league='))?.split('=')[1];

async function ingestLeague(league) {
  console.log(`\n=== ${league.name} (season ${league.seasonId}) ===`);

  // 1. Find current round
  const roundsData = await fetchJSON(`/rounds/seasons/${league.seasonId}`, { include: 'stage', per_page: 50 });
  const currentRound = roundsData.data.find(r => r.is_current);
  if (!currentRound) {
    console.log('  No current round found, skipping');
    return null;
  }
  console.log(`  Current round: ${currentRound.name} (${currentRound.starting_at} to ${currentRound.ending_at})`);

  // 2. Fetch fixtures for this round (use date-range — fixtureRounds filter is silently ignored)
  const fixtures = await fetchAllPages(`/fixtures/between/${currentRound.starting_at}/${currentRound.ending_at}`, {
    include: 'participants;scores;league;venue;state;round',
    filters: `fixtureLeagues:${league.id}`,
    per_page: 50,
  });
  console.log(`  Fixtures: ${fixtures.length}`);

  // 3. Fetch standings
  const standingsData = await fetchJSON(`/standings/seasons/${league.seasonId}`, {
    include: 'participant;details.type',
  });

  // Build standings lookup
  const standingsMap = {};
  for (const s of standingsData.data) {
    standingsMap[s.participant_id] = {
      position: s.position,
      points: s.points,
      details: s.details,
    };
  }

  // 4. For each fixture, fetch H2H and odds
  const matches = [];
  for (const fixture of fixtures) {
    const home = fixture.participants?.find(p => p.meta?.location === 'home');
    const away = fixture.participants?.find(p => p.meta?.location === 'away');

    if (!home || !away) {
      console.log(`  Skipping fixture ${fixture.id} - missing participants`);
      continue;
    }

    console.log(`  Processing: ${home.name} vs ${away.name}`);

    // H2H
    let h2h = [];
    try {
      const h2hData = await fetchJSON(`/fixtures/head-to-head/${home.id}/${away.id}`, {
        include: 'scores;participants;league;state',
        per_page: 10,
      });
      h2h = h2hData.data || [];
    } catch (e) {
      console.log(`    H2H failed: ${e.message}`);
    }

    // Odds (market 1 = Fulltime Result)
    let odds = { home: 0, draw: 0, away: 0, bookmaker: '' };
    try {
      const oddsData = await fetchJSON(`/odds/pre-match/fixtures/${fixture.id}/markets/1`, {
        include: 'market;bookmaker',
      });
      // Find bet365 odds, or first bookmaker
      const bet365 = (oddsData.data || []).filter(o => o.bookmaker_id === 2);
      const oddsSource = bet365.length >= 3 ? bet365 : (oddsData.data || []).slice(0, 3);

      for (const o of oddsSource) {
        if (o.label === 'Home' || o.label === '1') odds.home = parseFloat(o.value);
        else if (o.label === 'Draw' || o.label === 'X') odds.draw = parseFloat(o.value);
        else if (o.label === 'Away' || o.label === '2') odds.away = parseFloat(o.value);
        if (o.bookmaker?.name) odds.bookmaker = o.bookmaker.name;
      }
    } catch (e) {
      console.log(`    Odds failed: ${e.message}`);
    }

    const match = {
      fixtureId: fixture.id,
      league: { id: league.id, name: league.name },
      round: parseInt(currentRound.name),
      seasonId: league.seasonId,
      homeTeam: {
        id: home.id,
        name: home.name,
        shortCode: home.short_code,
        logo: home.image_path,
      },
      awayTeam: {
        id: away.id,
        name: away.name,
        shortCode: away.short_code,
        logo: away.image_path,
      },
      kickoff: fixture.starting_at,
      venue: fixture.venue?.name || '',
      standings: {
        home: standingsMap[home.id] || {},
        away: standingsMap[away.id] || {},
      },
      h2h: h2h.slice(0, 5).map(h => ({
        fixtureId: h.id,
        date: h.starting_at,
        home: h.participants?.find(p => p.meta?.location === 'home')?.name,
        away: h.participants?.find(p => p.meta?.location === 'away')?.name,
        result: h.result_info,
      })),
      odds,
      dataGaps: [],
    };

    if (h2h.length === 0) match.dataGaps.push('h2h');
    if (odds.home === 0) match.dataGaps.push('odds');

    matches.push(match);
  }

  return {
    round: parseInt(currentRound.name),
    roundId: currentRound.id,
    matches,
  };
}

// Main
async function main() {
  const targetLeagues = leagueFilter
    ? leagues.leagues.filter(l => l.id === parseInt(leagueFilter))
    : leagues.leagues;

  const allMatches = [];
  const results = {};

  for (const league of targetLeagues) {
    try {
      const result = await ingestLeague(league);
      if (result) {
        allMatches.push(...result.matches);
        results[league.name] = { round: result.round, matches: result.matches.length };
      }
    } catch (e) {
      console.error(`  ERROR for ${league.name}: ${e.message}`);
      results[league.name] = { error: e.message };
    }
  }

  // Write output
  // For now use the first league's round info for the GW directory
  const firstResult = Object.values(results).find(r => r.round);
  if (!firstResult) {
    console.error('No matches found');
    process.exit(1);
  }

  const season = leagues.season || '2025-26';
  const gwDir = resolve(__dirname, '..', 'data', 'gameweeks', season, `GW${firstResult.round}`);
  mkdirSync(gwDir, { recursive: true });

  writeFileSync(resolve(gwDir, 'matches.json'), JSON.stringify(allMatches, null, 2));

  const log = {
    timestamp: new Date().toISOString(),
    season,
    round: firstResult.round,
    leaguesProcessed: Object.keys(results),
    totalMatches: allMatches.length,
    results,
  };
  writeFileSync(resolve(gwDir, '_ingest-log.json'), JSON.stringify(log, null, 2));

  console.log(`\n=== DONE ===`);
  console.log(`Matches: ${allMatches.length}`);
  console.log(`Written to: ${gwDir}`);
  console.log(`Results:`, JSON.stringify(results, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
