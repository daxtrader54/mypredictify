import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { leagueStandings } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const leagueId = request.nextUrl.searchParams.get('leagueId');
  const seasonId = request.nextUrl.searchParams.get('seasonId');

  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId is required' }, { status: 400 });
  }

  try {
    const conditions = [eq(leagueStandings.leagueId, parseInt(leagueId, 10))];
    if (seasonId) {
      conditions.push(eq(leagueStandings.seasonId, parseInt(seasonId, 10)));
    }

    const rows = await db
      .select()
      .from(leagueStandings)
      .where(and(...conditions))
      .orderBy(asc(leagueStandings.position));

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Failed to fetch standings:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load standings data', detail: message },
      { status: 500 }
    );
  }
}
