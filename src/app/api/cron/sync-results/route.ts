import { NextRequest, NextResponse } from 'next/server';
import { rawQuery } from '@/lib/db/raw-query';
import { db } from '@/lib/db';
import { matchResults, syncEvents } from '@/lib/db/schema';
import { computeSyncPlan } from '@/lib/sync/match-windows';
import { checkGameweekCompleteness, writeEvaluationMarker } from '@/lib/sync/evaluation-trigger';

const SPORTMONKS_BASE = 'https://api.sportmonks.com/v3/football';

interface FetchedResult {
  fixtureId: number;
  homeGoals: number;
  awayGoals: number;
  status: 'finished' | 'live' | 'postponed';
}

async function ensureTable() {
  const check = await rawQuery<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'predictify' AND table_name = 'match_results'
    ) as exists`
  );

  if (check[0]?.exists) return;

  await rawQuery(`
    CREATE TABLE IF NOT EXISTS predictify.match_results (
      fixture_id INTEGER PRIMARY KEY,
      home_goals INTEGER NOT NULL,
      away_goals INTEGER NOT NULL,
      status TEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);
}

async function ensureSyncEventsTable() {
  const check = await rawQuery<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'predictify' AND table_name = 'sync_events'
    ) as exists`
  );

  if (check[0]?.exists) return;

  await rawQuery(`
    CREATE TABLE IF NOT EXISTS predictify.sync_events (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      endpoint TEXT NOT NULL,
      status TEXT NOT NULL,
      api_calls INTEGER NOT NULL DEFAULT 0,
      duration_ms INTEGER,
      metadata JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);
}

async function logSyncEvent(endpoint: string, status: string, apiCalls: number, durationMs: number, metadata?: Record<string, unknown>) {
  try {
    await ensureSyncEventsTable();
    await db.insert(syncEvents).values({
      endpoint,
      status,
      apiCalls,
      durationMs,
      metadata: metadata ?? null,
    });
  } catch {
    // Non-critical — don't fail the sync if logging fails
  }
}

async function fetchFixtureResult(fixtureId: number, token: string): Promise<FetchedResult | null> {
  const url = `${SPORTMONKS_BASE}/fixtures/${fixtureId}?api_token=${token}&include=scores;state`;
  const response = await fetch(url);
  if (!response.ok) return null;

  const json = await response.json();
  const fixture = json.data;
  if (!fixture) return null;

  const stateName = fixture.state?.developer_name || '';
  const scores = fixture.scores || [];

  const homeScore = scores.find(
    (s: { score: { participant: string; goals: number }; description: string }) =>
      s.score.participant === 'home' && s.description === 'CURRENT'
  );
  const awayScore = scores.find(
    (s: { score: { participant: string; goals: number }; description: string }) =>
      s.score.participant === 'away' && s.description === 'CURRENT'
  );

  if (stateName === 'FT' || stateName === 'AET' || stateName === 'FT_PEN') {
    return {
      fixtureId,
      homeGoals: homeScore?.score?.goals ?? 0,
      awayGoals: awayScore?.score?.goals ?? 0,
      status: 'finished',
    };
  }

  if (stateName === 'POSTP' || stateName === 'CANC') {
    return { fixtureId, homeGoals: 0, awayGoals: 0, status: 'postponed' };
  }

  if (stateName.includes('LIVE') || stateName === 'HT' || stateName === '1ST_HALF' || stateName === '2ND_HALF') {
    return {
      fixtureId,
      homeGoals: homeScore?.score?.goals ?? 0,
      awayGoals: awayScore?.score?.goals ?? 0,
      status: 'live',
    };
  }

  return null;
}

export async function GET(_request: NextRequest) {
  const startTime = Date.now();
  const token = process.env.SPORTMONKS_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'SPORTMONKS_API_TOKEN not configured' }, { status: 500 });
  }

  try {
    await ensureTable();
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create match_results table', detail: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }

  // Compute match-time-aware sync plan
  const syncPlan = await computeSyncPlan();

  // No active windows — short-circuit with 0 API calls
  if (syncPlan.activeWindows.length === 0) {
    const duration = Date.now() - startTime;
    await logSyncEvent('sync-results', 'skipped', 0, duration, {
      reason: 'no-match-window',
      nextWindowAt: syncPlan.nextWindowAt?.toISOString() ?? null,
    });

    return NextResponse.json({
      status: 'no-match-window',
      apiCalls: 0,
      windowsActive: 0,
      fixturesChecked: 0,
      synced: 0,
      nextWindowAt: syncPlan.nextWindowAt?.toISOString() ?? null,
      isMatchday: syncPlan.isMatchday,
      timestamp: new Date().toISOString(),
    });
  }

  // Active windows exist — fetch only fixtures in those windows
  const fixturesToCheck = syncPlan.pendingFixtureIds;

  let synced = 0;
  let apiCalls = 0;
  const errors: string[] = [];

  for (const fixtureId of fixturesToCheck) {
    try {
      apiCalls++;
      const result = await fetchFixtureResult(fixtureId, token);
      if (result) {
        await db
          .insert(matchResults)
          .values({
            fixtureId: result.fixtureId,
            homeGoals: result.homeGoals,
            awayGoals: result.awayGoals,
            status: result.status,
          })
          .onConflictDoUpdate({
            target: matchResults.fixtureId,
            set: {
              homeGoals: result.homeGoals,
              awayGoals: result.awayGoals,
              status: result.status,
              updatedAt: new Date(),
            },
          });
        synced++;
      }
    } catch (error) {
      errors.push(`${fixtureId}: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // Rate limit: 200ms between requests
    await new Promise((r) => setTimeout(r, 200));
  }

  // After syncing, check if any gameweeks are now complete and need evaluation
  const evaluationTriggers: number[] = [];
  try {
    const completeness = await checkGameweekCompleteness();
    for (const gw of completeness) {
      if (gw.needsEvaluation) {
        await writeEvaluationMarker(gw.gameweek);
        evaluationTriggers.push(gw.gameweek);
      }
    }
  } catch {
    // Non-critical — evaluation check failure shouldn't block sync response
  }

  const duration = Date.now() - startTime;
  await logSyncEvent('sync-results', 'success', apiCalls, duration, {
    windowsActive: syncPlan.activeWindows.length,
    fixturesChecked: fixturesToCheck.length,
    synced,
    evaluationTriggers,
  });

  return NextResponse.json({
    status: 'synced',
    windowsActive: syncPlan.activeWindows.length,
    fixturesChecked: fixturesToCheck.length,
    synced,
    apiCalls,
    nextWindowAt: syncPlan.nextWindowAt?.toISOString() ?? null,
    isMatchday: syncPlan.isMatchday,
    evaluationTriggers: evaluationTriggers.length > 0 ? evaluationTriggers : undefined,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: new Date().toISOString(),
  });
}
