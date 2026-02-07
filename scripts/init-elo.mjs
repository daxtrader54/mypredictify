// Initialize Elo ratings from current standings for all 5 leagues
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env.local') });

const token = process.env.SPORTMONKS_API_TOKEN;
const base = 'https://api.sportmonks.com/v3/football';
const ELO_FILE = resolve(__dirname, '..', 'data', 'memory', 'elo-ratings.json');

const leagues = JSON.parse(readFileSync(resolve(__dirname, '..', 'data', 'config', 'leagues.json'), 'utf8'));

async function fetchJSON(endpoint, params = {}) {
  const url = new URL(`${base}${endpoint}`);
  url.searchParams.set('api_token', token);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  const r = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`API error ${r.status}`);
  return r.json();
}

const ratings = { ratings: {}, lastUpdated: new Date().toISOString() };

for (const league of leagues.leagues) {
  console.log(`Fetching standings for ${league.name}...`);
  const data = await fetchJSON(`/standings/seasons/${league.seasonId}`, {
    include: 'participant',
  });

  const totalTeams = data.data.length;
  for (const s of data.data) {
    const teamId = String(s.participant_id);
    const teamName = s.participant?.name || `Team_${teamId}`;
    const position = s.position;

    // Seed Elo: 1st gets ~1700, last gets ~1300
    const positionFactor = (totalTeams - position) / (totalTeams - 1);
    const initialElo = Math.round(1300 + positionFactor * 400);

    ratings.ratings[teamId] = {
      rating: initialElo,
      team: teamName,
      league: league.name,
      updatedAt: new Date().toISOString(),
    };
  }
  console.log(`  ${totalTeams} teams initialized`);
}

writeFileSync(ELO_FILE, JSON.stringify(ratings, null, 2));
console.log(`\nTotal teams: ${Object.keys(ratings.ratings).length}`);
console.log(`Saved to: ${ELO_FILE}`);

// Show top teams per league
const byLeague = {};
for (const [id, info] of Object.entries(ratings.ratings)) {
  if (!byLeague[info.league]) byLeague[info.league] = [];
  byLeague[info.league].push({ id, ...info });
}
for (const [league, teams] of Object.entries(byLeague)) {
  teams.sort((a, b) => b.rating - a.rating);
  console.log(`\n${league}:`);
  teams.slice(0, 3).forEach(t => console.log(`  ${t.team}: ${t.rating}`));
  console.log(`  ... ${teams[teams.length-1].team}: ${teams[teams.length-1].rating}`);
}
