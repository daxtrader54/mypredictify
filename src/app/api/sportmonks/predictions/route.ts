import { NextRequest, NextResponse } from 'next/server';
import { getSportMonksClient, processProbability } from '@/lib/sportmonks/client';
import { getSession } from '@/lib/auth/get-session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const searchParams = request.nextUrl.searchParams;
    const fixtureIds = searchParams.get('fixture_ids');

    if (!fixtureIds) {
      return NextResponse.json(
        { error: 'fixture_ids parameter is required' },
        { status: 400 }
      );
    }

    const client = getSportMonksClient();
    const response = await client.getProbabilities({
      filters: `fixture_ids:${fixtureIds}`,
    });

    // Process and map predictions by fixture ID
    const predictions: Record<number, ReturnType<typeof processProbability>> = {};

    for (const prob of response.data) {
      // Only use FULLTIME_RESULT predictions
      if (prob.type?.code === 'FULLTIME_RESULT' || !prob.type) {
        predictions[prob.fixture_id] = processProbability(prob);
      }
    }

    return NextResponse.json({ predictions });
  } catch (error) {
    console.error('SportMonks predictions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch predictions' },
      { status: 500 }
    );
  }
}
