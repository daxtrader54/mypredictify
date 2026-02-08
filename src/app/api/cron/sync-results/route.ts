import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import { db } from '@/lib/db';
import { matchResults } from '@/lib/db/schema';
import { getAvailableGameweeks, GW_BASE_DIR } from '@/lib/gameweeks';

const SPORTMONKS_BASE = 'https://api.sportmonks.com/v3/football';

// 2.5 hours in milliseconds
const RESULT_DELAY_MS = 2.5 * 60 * 60 * 1000;

interface MatchData {
  fixtureId: number;
  league: { id: number; name: string };
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  kickoff: string;
}

interface FetchedResult {
  fixtureId: number;
  homeGoals: number;
  awayGoals: number;
  status: 'finished' | 'live' | 'postponed';
}

async function ensureTable() {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) return;

  const sql = neon(dbUrl);
  const check = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'predictify' AND table_name = 'match_results'
    ) as exists
  `;

  if (check[0]?.exists) return;

  await sql`
    CREATE TABLE IF NOT EXISTS predictify.match_results (
      fixture_id INTEGER PRIMARY KEY,
      home_goals INTEGER NOT NULL,
      away_goals INTEGER NOT NULL,
      status TEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `;
}

async function fetchFixtureResult(fixtureId: number, token: string): Promise<FetchedResult | null> {
  const url = `${SPORTMONKS_BASE}/fixtures/${fixtureId}?api_token=${token}&include=scores;state`;
  const response = await fetch(url);
  if (!response.ok) return null;

  const json = await response.json();
  const fixture = json.data;
  if (!fixture) return null;

  const stateName = fixture.state?.developer_name || '';
  const scores = fixture.scores || [];

  const homeScore = scores.find(
    (s: { score: { participant: string; goals: number }; description: string }) =>
      s.score.participant === 'home' && s.description === 'CURRENT'
  );
  const awayScore = scores.find(
    (s: { score: { participant: string; goals: number }; description: string }) =>
      s.score.participant === 'away' && s.description === 'CURRENT'
  );

  if (stateName === 'FT' || stateName === 'AET' || stateName === 'FT_PEN') {
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
    return {
      fixtureId,
      homeGoals: homeScore?.score?.goals ?? 0,
      awayGoals: awayScore?.score?.goals ?? 0,
      status: 'live',
    };
  }

  return null;
}

export async function GET(_request: NextRequest) {
  const token = process.env.SPORTMONKS_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'SPORTMONKS_API_TOKEN not configured' }, { status: 500 });
  }

  // Ensure table exists
  try {
    await ensureTable();
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create match_results table', detail: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() - RESULT_DELAY_MS);
  const gameweeks = await getAvailableGameweeks();

  // Collect all fixtures that need results
  const fixturesToCheck: MatchData[] = [];

  // Load existing results from DB to know what we already have
  let existingIds: Set<number>;
  try {
    const existing = await db.select({ fixtureId: matchResults.fixtureId, status: matchResults.status }).from(matchResults);
    existingIds = new Set(existing.filter((r) => r.status === 'finished').map((r) => r.fixtureId));
  } catch {
    existingIds = new Set();
  }

  for (const gw of gameweeks) {
    const gwDir = path.join(GW_BASE_DIR, `GW${gw}`);
    try {
      const raw = await fs.readFile(path.join(gwDir, 'matches.json'), 'utf-8');
      const matches: MatchData[] = JSON.parse(raw);

      for (const m of matches) {
        const kickoff = new Date(m.kickoff);
        // Only check if kickoff + 2.5h has passed and we don't already have a finished result
        if (kickoff < cutoff && !existingIds.has(m.fixtureId)) {
          fixturesToCheck.push(m);
        }
      }
    } catch {
      continue;
    }
  }

  if (fixturesToCheck.length === 0) {
    return NextResponse.json({ message: 'No fixtures need results', checked: 0, synced: 0, timestamp: now.toISOString() });
  }

  // Fetch results from SportMonks (with rate limiting)
  let synced = 0;
  const errors: string[] = [];

  for (const m of fixturesToCheck) {
    try {
      const result = await fetchFixtureResult(m.fixtureId, token);
      if (result) {
        // Upsert into DB
        await db
          .insert(matchResults)
          .values({
            fixtureId: result.fixtureId,
            homeGoals: result.homeGoals,
            awayGoals: result.awayGoals,
            status: result.status,
          })
          .onConflictDoUpdate({
            target: matchResults.fixtureId,
            set: {
              homeGoals: result.homeGoals,
              awayGoals: result.awayGoals,
              status: result.status,
              updatedAt: new Date(),
            },
          });
        synced++;
      }
    } catch (error) {
      errors.push(`${m.fixtureId}: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // Rate limit: 200ms between requests
    await new Promise((r) => setTimeout(r, 200));
  }

  return NextResponse.json({
    checked: fixturesToCheck.length,
    synced,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: now.toISOString(),
  });
}
