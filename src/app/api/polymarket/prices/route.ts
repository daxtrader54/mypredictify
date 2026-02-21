import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { predictionMarketPrices } from '@/lib/db/schema';
import { desc, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const league = searchParams.get('league');

  try {
    // Get latest price per fixture (most recent fetched_at)
    const prices = await db
      .select()
      .from(predictionMarketPrices)
      .where(sql`${predictionMarketPrices.source} = 'polymarket'`)
      .orderBy(desc(predictionMarketPrices.fetchedAt));

    // Deduplicate: keep only the latest entry per fixture
    const latestByFixture = new Map<number, typeof prices[0]>();
    for (const p of prices) {
      if (!latestByFixture.has(p.fixtureId)) {
        latestByFixture.set(p.fixtureId, p);
      }
    }

    let result = Array.from(latestByFixture.values());

    // Filter by league if provided (requires joining with match data — for now return all)
    if (league) {
      // League filter is handled client-side with fixture data
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch prices', detail: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
