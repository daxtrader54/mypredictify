import { NextRequest, NextResponse } from 'next/server';
import { getSportMonksClient, processFixture } from '@/lib/sportmonks/client';
import { LEAGUES } from '@/config/leagues';
import { getSession } from '@/lib/auth/get-session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    const leagueId = searchParams.get('league');
    const days = parseInt(searchParams.get('days') || '7', 10);

    const client = getSportMonksClient();
    const leagueIds = leagueId
      ? [parseInt(leagueId, 10)]
      : LEAGUES.map((l) => l.id);

    let fixtures;

    if (date) {
      // Get fixtures for a specific date
      const response = await client.getFixturesByDate(date, {
        include: 'participants;scores;league;venue;state',
        filters: `fixtureLeagues:${leagueIds.join(',')}`,
      });
      fixtures = response.data;
    } else {
      // Get fixtures for date range
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + days);

      const startStr = today.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      const response = await client.getFixturesByDateRange(startStr, endStr, {
        include: 'participants;scores;league;venue;state',
        filters: `fixtureLeagues:${leagueIds.join(',')}`,
      });
      fixtures = response.data;
    }

    const processed = fixtures.map(processFixture);

    // Sort by start time
    processed.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    return NextResponse.json({ fixtures: processed });
  } catch (error) {
    console.error('SportMonks fixtures error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fixtures' },
      { status: 500 }
    );
  }
}
