import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { leagueStandings } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const leagueId = request.nextUrl.searchParams.get('leagueId');

  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId is required' }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(leagueStandings)
    .where(eq(leagueStandings.leagueId, parseInt(leagueId, 10)))
    .orderBy(asc(leagueStandings.position));

  return NextResponse.json(rows);
}
