import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET() {
  const results: Record<string, unknown> = {};

  // Check which env var is available
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  results.hasDATABASE_URL = !!process.env.DATABASE_URL;
  results.hasPOSTGRES_URL = !!process.env.POSTGRES_URL;
  results.urlPrefix = dbUrl ? dbUrl.substring(0, 30) + '...' : 'NONE';

  if (!dbUrl) {
    return NextResponse.json({ error: 'No database URL found', ...results });
  }

  const sql = neon(dbUrl);

  // Test 1: Basic connectivity
  try {
    const r = await sql`SELECT 1 as ok`;
    results.test1_connectivity = { ok: true, result: r };
  } catch (e) {
    results.test1_connectivity = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // Test 2: Users table
  try {
    const r = await sql`SELECT count(*) as cnt FROM predictify.users`;
    results.test2_users = { ok: true, count: r[0]?.cnt };
  } catch (e) {
    results.test2_users = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // Test 3: League standings table exists?
  try {
    const r = await sql`SELECT count(*) as cnt FROM predictify.league_standings`;
    results.test3_standings_count = { ok: true, count: r[0]?.cnt };
  } catch (e) {
    results.test3_standings_count = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // Test 4: Actual standings query (PL)
  try {
    const r = await sql`SELECT team_name, points FROM predictify.league_standings WHERE league_id = 8 ORDER BY position LIMIT 3`;
    results.test4_standings_query = { ok: true, top3: r };
  } catch (e) {
    results.test4_standings_query = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // Test 5: List all tables in predictify schema
  try {
    const r = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'predictify' ORDER BY table_name`;
    results.test5_tables = { ok: true, tables: r.map((row: Record<string, string>) => row.table_name) };
  } catch (e) {
    results.test5_tables = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // Test 6: Drizzle ORM query (same as standings route uses)
  try {
    const { db } = await import('@/lib/db');
    const { leagueStandings } = await import('@/lib/db/schema');
    const { eq, asc } = await import('drizzle-orm');
    const rows = await db.select().from(leagueStandings).where(eq(leagueStandings.leagueId, 8)).orderBy(asc(leagueStandings.position)).limit(3);
    results.test6_drizzle = { ok: true, count: rows.length, first: rows[0]?.teamName };
  } catch (e) {
    results.test6_drizzle = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  return NextResponse.json(results);
}
