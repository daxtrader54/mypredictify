import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { leagueStandings } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';

const SPORTMONKS_BASE = 'https://api.sportmonks.com/v3/football';

interface SMStanding {
  position: number;
  points: number;
  participant?: { id: number; name: string; image_path?: string };
  details?: Array<{ type?: { code?: string }; value: number }>;
}

function getDetail(details: Array<{ type?: { code?: string }; value: number }>, code: string): number {
  return details?.find((d) => d.type?.code === code)?.value ?? 0;
}

async function fetchFromSportMonks(seasonId: string, leagueIdNum: number) {
  const token = process.env.SPORTMONKS_API_TOKEN;
  if (!token) return null;

  const url = `${SPORTMONKS_BASE}/standings/seasons/${seasonId}?api_token=${token}&include=participant;details.type`;
  const response = await fetch(url, { next: { revalidate: 3600 } });
  if (!response.ok) return null;

  const json = await response.json();
  const standings: SMStanding[] = json.data ?? [];
  if (standings.length === 0) return null;

  return standings.map((s) => {
    const details = (s.details ?? []) as Array<{ type?: { code?: string }; value: number }>;
    const gf = getDetail(details, 'goals-for');
    const ga = getDetail(details, 'goals-against');
    return {
      leagueId: leagueIdNum,
      seasonId: parseInt(seasonId, 10),
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
}

export async function GET(request: NextRequest) {
  const leagueId = request.nextUrl.searchParams.get('leagueId');
  const seasonId = request.nextUrl.searchParams.get('seasonId');

  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId is required' }, { status: 400 });
  }

  // Try DB first
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

    if (rows.length > 0) {
      return NextResponse.json(rows);
    }
  } catch (error) {
    console.error('DB standings query failed, falling back to SportMonks:', error);
  }

  // Fallback: fetch from SportMonks directly
  if (seasonId) {
    const smRows = await fetchFromSportMonks(seasonId, parseInt(leagueId, 10));
    if (smRows && smRows.length > 0) {
      return NextResponse.json(smRows);
    }
  }

  return NextResponse.json(
    { error: 'No standings data available' },
    { status: 404 }
  );
}
