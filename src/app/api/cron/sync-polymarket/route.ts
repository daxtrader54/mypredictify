import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { rawQuery } from '@/lib/db/raw-query';
import { db } from '@/lib/db';
import { predictionMarketPrices } from '@/lib/db/schema';
import { getAvailableGameweeks, GW_BASE_DIR } from '@/lib/gameweeks';
import { fetchAllLeagueEvents, extractMatchPrices, POLYMARKET_SERIES } from '@/lib/polymarket/client';
import { matchEventsToFixtures } from '@/lib/polymarket/matcher';

export const dynamic = 'force-dynamic';

interface MatchData {
  fixtureId: number;
  league: { id: number; name: string };
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  kickoff: string;
}

async function ensureTable() {
  const check = await rawQuery<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'predictify' AND table_name = 'prediction_market_prices'
    ) as exists`
  );

  if (check[0]?.exists) return;

  await rawQuery(`
    CREATE TABLE IF NOT EXISTS predictify.prediction_market_prices (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      fixture_id INTEGER NOT NULL,
      source TEXT NOT NULL,
      home_win_prob DECIMAL(5,4) NOT NULL,
      draw_prob DECIMAL(5,4) NOT NULL,
      away_win_prob DECIMAL(5,4) NOT NULL,
      volume DECIMAL(15,2),
      liquidity DECIMAL(15,2),
      external_event_id TEXT,
      fetched_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);
}

export async function GET(_request: NextRequest) {
  try {
    await ensureTable();
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to ensure prediction_market_prices table', detail: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }

  const now = new Date();
  const gameweeks = await getAvailableGameweeks();

  // Collect upcoming fixtures from all gameweeks
  const upcomingFixtures: MatchData[] = [];

  for (const gw of gameweeks) {
    const gwDir = path.join(GW_BASE_DIR, `GW${gw}`);
    try {
      const raw = await fs.readFile(path.join(gwDir, 'matches.json'), 'utf-8');
      const matches: MatchData[] = JSON.parse(raw);

      for (const m of matches) {
        // Only include upcoming fixtures (kickoff in the future)
        if (new Date(m.kickoff) > now && POLYMARKET_SERIES[m.league.id]) {
          upcomingFixtures.push(m);
        }
      }
    } catch {
      continue;
    }
  }

  if (upcomingFixtures.length === 0) {
    return NextResponse.json({
      message: 'No upcoming fixtures to check',
      checked: 0,
      synced: 0,
      timestamp: now.toISOString(),
    });
  }

  // Fetch Polymarket events for all leagues
  let allEvents;
  try {
    allEvents = await fetchAllLeagueEvents();
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch Polymarket events', detail: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }

  let synced = 0;
  const errors: string[] = [];

  // Match and sync by league
  for (const [leagueIdStr, events] of allEvents) {
    if (events.length === 0) continue;

    const leagueFixtures = upcomingFixtures.filter(f => f.league.id === leagueIdStr);
    if (leagueFixtures.length === 0) continue;

    const matched = matchEventsToFixtures(events, leagueFixtures);

    for (const { event, fixtureId } of matched) {
      try {
        const prices = extractMatchPrices(event);
        if (!prices) continue;

        await db.insert(predictionMarketPrices).values({
          fixtureId,
          source: 'polymarket',
          homeWinProb: prices.homeWinProb.toString(),
          drawProb: prices.drawProb.toString(),
          awayWinProb: prices.awayWinProb.toString(),
          volume: prices.volume.toString(),
          liquidity: prices.liquidity.toString(),
          externalEventId: prices.eventId,
        });
        synced++;
      } catch (error) {
        errors.push(`${fixtureId}: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }
  }

  return NextResponse.json({
    checked: upcomingFixtures.length,
    synced,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: now.toISOString(),
  });
}
