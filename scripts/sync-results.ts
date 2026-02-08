import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';

const SPORTMONKS_BASE = 'https://api.sportmonks.com/v3/football';

interface MatchData {
  fixtureId: number;
  league: { id: number; name: string };
  homeTeam: { id: number; name: string; shortCode: string; logo: string };
  awayTeam: { id: number; name: string; shortCode: string; logo: string };
  kickoff: string;
}

interface ResultData {
  fixtureId: number;
  homeGoals: number;
  awayGoals: number;
  status: 'finished' | 'live' | 'postponed';
}

async function fetchFixture(fixtureId: number): Promise<ResultData | null> {
  const token = process.env.SPORTMONKS_API_TOKEN;
  if (!token) throw new Error('SPORTMONKS_API_TOKEN required');

  const url = `${SPORTMONKS_BASE}/fixtures/${fixtureId}?api_token=${token}&include=scores;state`;
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`  Failed to fetch fixture ${fixtureId}: HTTP ${response.status}`);
    return null;
  }

  const json = await response.json();
  const fixture = json.data;
  if (!fixture) return null;

  const stateName = fixture.state?.developer_name || '';

  // Only return results for finished matches
  if (stateName === 'FT' || stateName === 'AET' || stateName === 'FT_PEN') {
    const scores = fixture.scores || [];
    const homeScore = scores.find(
      (s: { score: { participant: string; goals: number }; description: string }) =>
        s.score.participant === 'home' && s.description === 'CURRENT'
    );
    const awayScore = scores.find(
      (s: { score: { participant: string; goals: number }; description: string }) =>
        s.score.participant === 'away' && s.description === 'CURRENT'
    );

    return {
      fixtureId,
      homeGoals: homeScore?.score?.goals ?? 0,
      awayGoals: awayScore?.score?.goals ?? 0,
      status: 'finished',
    };
  }

  if (stateName === 'POSTP' || stateName === 'CANC') {
    return { fixtureId, homeGoals: 0, awayGoals: 0, status: 'postponed' };
  }

  if (stateName.includes('LIVE') || stateName === 'HT' || stateName === '1ST_HALF' || stateName === '2ND_HALF') {
    const scores = fixture.scores || [];
    const homeScore = scores.find(
      (s: { score: { participant: string; goals: number }; description: string }) =>
        s.score.participant === 'home' && s.description === 'CURRENT'
    );
    const awayScore = scores.find(
      (s: { score: { participant: string; goals: number }; description: string }) =>
        s.score.participant === 'away' && s.description === 'CURRENT'
    );

    return {
      fixtureId,
      homeGoals: homeScore?.score?.goals ?? 0,
      awayGoals: awayScore?.score?.goals ?? 0,
      status: 'live',
    };
  }

  return null;
}

async function main() {
  const baseDir = path.join(process.cwd(), 'data', 'gameweeks', '2025-26');
  const entries = await fs.readdir(baseDir);
  const gameweeks = entries
    .filter((e) => e.startsWith('GW'))
    .sort((a, b) => parseInt(b.replace('GW', '')) - parseInt(a.replace('GW', '')));

  if (gameweeks.length === 0) {
    console.log('No gameweek directories found');
    return;
  }

  const gwDir = path.join(baseDir, gameweeks[0]);
  console.log(`Processing ${gameweeks[0]}...`);

  const raw = await fs.readFile(path.join(gwDir, 'matches.json'), 'utf-8');
  const matches: MatchData[] = JSON.parse(raw);

  // Load existing results
  const resultsPath = path.join(gwDir, 'results.json');
  let existingResults = new Map<number, ResultData>();
  try {
    const existingRaw = await fs.readFile(resultsPath, 'utf-8');
    const existing: ResultData[] = JSON.parse(existingRaw);
    existingResults = new Map(existing.map((r) => [r.fixtureId, r]));
  } catch {
    // No existing results
  }

  const now = new Date();
  // Only check fixtures that have passed kickoff and don't already have a 'finished' result
  const toCheck = matches.filter((m) => {
    const kickoff = new Date(m.kickoff);
    if (kickoff > now) return false; // hasn't started yet
    const existing = existingResults.get(m.fixtureId);
    if (existing?.status === 'finished') return false; // already have final result
    return true;
  });

  console.log(`  ${toCheck.length} fixtures to check (${matches.length} total, ${existingResults.size} already have results)`);

  let fetched = 0;
  for (const m of toCheck) {
    const result = await fetchFixture(m.fixtureId);
    if (result) {
      existingResults.set(m.fixtureId, result);
      console.log(`  ${m.homeTeam.name} ${result.homeGoals}-${result.awayGoals} ${m.awayTeam.name} [${result.status}]`);
      fetched++;
    }
    // Small delay to respect rate limits
    await new Promise((r) => setTimeout(r, 200));
  }

  // Write results
  const allResults = Array.from(existingResults.values());
  await fs.writeFile(resultsPath, JSON.stringify(allResults, null, 2));
  console.log(`  ✓ ${fetched} new results fetched, ${allResults.length} total saved to results.json`);
}

main().catch(console.error);
