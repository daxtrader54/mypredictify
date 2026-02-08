import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { db } from '@/lib/db';
import { leagueStandings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { LEAGUES } from '@/config/leagues';
import { getSession } from '@/lib/auth/get-session';
import { isAdmin } from '@/config/site';

const SPORTMONKS_BASE = 'https://api.sportmonks.com/v3/football';

interface StandingEntry {
  position: number;
  points: number;
  participant?: { id: number; name: string; image_path?: string };
  details?: Array<{ type?: { code?: string }; value: number }>;
}

function getDetail(details: Array<{ type?: { code?: string }; value: number }>, code: string): number {
  return details?.find((d) => d.type?.code === code)?.value ?? 0;
}

async function ensureTable() {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) return;

  const sql = neon(dbUrl);

  // Check if table exists
  const check = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'predictify' AND table_name = 'league_standings'
    ) as exists
  `;

  if (check[0]?.exists) return;

  // Create the table
  await sql`
    CREATE TABLE IF NOT EXISTS predictify.league_standings (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      league_id INTEGER NOT NULL,
      season_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      team_id INTEGER NOT NULL,
      team_name TEXT NOT NULL,
      team_logo TEXT,
      played INTEGER NOT NULL DEFAULT 0,
      won INTEGER NOT NULL DEFAULT 0,
      drawn INTEGER NOT NULL DEFAULT 0,
      lost INTEGER NOT NULL DEFAULT 0,
      goals_for INTEGER NOT NULL DEFAULT 0,
      goals_against INTEGER NOT NULL DEFAULT 0,
      goal_difference INTEGER NOT NULL DEFAULT 0,
      points INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `;
}

export async function GET(request: NextRequest) {
  // Auth: accept either CRON_SECRET or admin session
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCron) {
    const session = await getSession();
    if (!isAdmin(session?.user?.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const token = process.env.SPORTMONKS_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'SPORTMONKS_API_TOKEN not configured' }, { status: 500 });
  }

  // Ensure table exists before syncing
  try {
    await ensureTable();
  } catch (error) {
    console.error('Failed to ensure league_standings table:', error);
    return NextResponse.json(
      { error: 'Failed to create standings table', detail: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }

  const results: Array<{ league: string; status: string; count?: number; error?: string }> = [];

  for (const league of LEAGUES) {
    try {
      const url = `${SPORTMONKS_BASE}/standings/seasons/${league.seasonId}?api_token=${token}&include=participant;details.type`;
      const response = await fetch(url);

      if (!response.ok) {
        results.push({ league: league.name, status: 'error', error: `HTTP ${response.status}` });
        continue;
      }

      const json = await response.json();
      const standings: StandingEntry[] = json.data ?? [];

      if (standings.length === 0) {
        results.push({ league: league.name, status: 'skipped', error: 'No data' });
        continue;
      }

      // Delete old rows
      await db.delete(leagueStandings).where(eq(leagueStandings.leagueId, league.id));

      // Insert fresh rows
      const rows = standings.map((s) => {
        const details = (s.details ?? []) as Array<{ type?: { code?: string }; value: number }>;
        const gf = getDetail(details, 'goals-for');
        const ga = getDetail(details, 'goals-against');
        return {
          leagueId: league.id,
          seasonId: league.seasonId,
          position: s.position,
          teamId: s.participant?.id ?? 0,
          teamName: s.participant?.name ?? 'Unknown',
          teamLogo: s.participant?.image_path ?? null,
          played: getDetail(details, 'matches-played') || getDetail(details, 'overall-matches-played'),
          won: getDetail(details, 'won') || getDetail(details, 'overall-won'),
          drawn: getDetail(details, 'draw') || getDetail(details, 'overall-draw'),
          lost: getDetail(details, 'lost') || getDetail(details, 'overall-lost'),
          goalsFor: gf,
          goalsAgainst: ga,
          goalDifference: gf - ga,
          points: s.points,
        };
      });

      await db.insert(leagueStandings).values(rows);
      results.push({ league: league.name, status: 'ok', count: rows.length });
    } catch (error) {
      results.push({
        league: league.name,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({ synced: results, timestamp: new Date().toISOString() });
}
