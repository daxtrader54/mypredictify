import { NextRequest, NextResponse } from 'next/server';
import { getSportMonksClient } from '@/lib/sportmonks/client';

// Market IDs for common bet types
const MARKET_IDS = {
  MATCH_WINNER: 1, // 1X2
  BTTS: 28, // Both Teams to Score
  OVER_UNDER_2_5: 18, // Over/Under 2.5 Goals
};

interface ProcessedOdds {
  home?: number;
  draw?: number;
  away?: number;
  btts_yes?: number;
  btts_no?: number;
  over_2_5?: number;
  under_2_5?: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fixtureId = searchParams.get('fixture_id');

    if (!fixtureId) {
      return NextResponse.json(
        { error: 'fixture_id parameter is required' },
        { status: 400 }
      );
    }

    const client = getSportMonksClient();
    const response = await client.getOddsByFixture(parseInt(fixtureId, 10));

    const odds: ProcessedOdds = {};

    for (const odd of response.data) {
      const marketId = odd.market_id;

      if (marketId === MARKET_IDS.MATCH_WINNER) {
        // 1X2 market
        if (odd.label === '1' || odd.label === 'Home') {
          odds.home = parseFloat(odd.value);
        } else if (odd.label === 'X' || odd.label === 'Draw') {
          odds.draw = parseFloat(odd.value);
        } else if (odd.label === '2' || odd.label === 'Away') {
          odds.away = parseFloat(odd.value);
        }
      } else if (marketId === MARKET_IDS.BTTS) {
        // Both Teams to Score
        if (odd.label === 'Yes') {
          odds.btts_yes = parseFloat(odd.value);
        } else if (odd.label === 'No') {
          odds.btts_no = parseFloat(odd.value);
        }
      } else if (marketId === MARKET_IDS.OVER_UNDER_2_5) {
        // Over/Under 2.5
        if (odd.label === 'Over') {
          odds.over_2_5 = parseFloat(odd.value);
        } else if (odd.label === 'Under') {
          odds.under_2_5 = parseFloat(odd.value);
        }
      }
    }

    return NextResponse.json({ odds });
  } catch (error) {
    console.error('SportMonks odds error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch odds' },
      { status: 500 }
    );
  }
}
