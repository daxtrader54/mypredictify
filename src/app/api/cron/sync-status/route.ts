import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { isAdmin } from '@/config/site';
import { computeSyncPlan } from '@/lib/sync/match-windows';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Allow bearer token auth (for VPS/CLI access) or admin session
  const authHeader = request.headers.get('authorization');
  const syncKey = process.env.PIPELINE_SYNC_KEY;
  const isBearerAuth = syncKey && authHeader === `Bearer ${syncKey}`;

  if (!isBearerAuth) {
    const session = await getSession();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const plan = await computeSyncPlan();

    return NextResponse.json({
      isMatchday: plan.isMatchday,
      activeWindows: plan.activeWindows.map((w) => ({
        bucket: w.bucket,
        kickoffTime: w.kickoffTime.toISOString(),
        syncAfter: w.syncAfter.toISOString(),
        backupSync: w.backupSync.toISOString(),
        expiry: w.expiry.toISOString(),
        fixtureCount: w.fixtureIds.length,
        leagueIds: w.leagueIds,
      })),
      pendingFixtures: plan.pendingFixtureIds.length,
      nextWindowAt: plan.nextWindowAt?.toISOString() ?? null,
      recentLeagueIds: plan.recentLeagueIds,
      totalFixtures: plan.totalFixtures,
      finishedInDb: plan.finishedInDb,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to compute sync plan', detail: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
