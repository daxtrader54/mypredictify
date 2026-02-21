import { promises as fs } from 'fs';
import path from 'path';
import { getAvailableGameweeks, GW_BASE_DIR } from '@/lib/gameweeks';
import { db } from '@/lib/db';
import { matchResults } from '@/lib/db/schema';

interface MatchData {
  fixtureId: number;
  league: { id: number; name: string };
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  kickoff: string;
}

export interface SyncWindow {
  /** Bucket label (rounded kickoff time) */
  bucket: string;
  /** Kickoff time of earliest match in this bucket */
  kickoffTime: Date;
  /** When to first attempt sync (kickoff + 3h) */
  syncAfter: Date;
  /** Backup sync attempt (kickoff + 4h) */
  backupSync: Date;
  /** Stop trying after this (kickoff + 8h) */
  expiry: Date;
  /** Fixture IDs in this window */
  fixtureIds: number[];
  /** League IDs represented */
  leagueIds: number[];
}

export interface SyncPlan {
  /** Windows currently active (syncAfter <= now < expiry) */
  activeWindows: SyncWindow[];
  /** All fixture IDs that need syncing right now */
  pendingFixtureIds: number[];
  /** Next window start time (null if no future windows) */
  nextWindowAt: Date | null;
  /** Whether today has any matches at all */
  isMatchday: boolean;
  /** League IDs that had matches in the last 24h */
  recentLeagueIds: number[];
  /** Total fixtures across all gameweeks */
  totalFixtures: number;
  /** Fixtures already finished in DB */
  finishedInDb: number;
}

const BUCKET_MS = 15 * 60 * 1000; // 15 minutes
const SYNC_AFTER_MS = 3 * 60 * 60 * 1000; // 3 hours
const BACKUP_SYNC_MS = 4 * 60 * 60 * 1000; // 4 hours
const EXPIRY_MS = 8 * 60 * 60 * 1000; // 8 hours

/** Round a timestamp down to the nearest 15-minute bucket */
function toBucket(date: Date): string {
  const rounded = new Date(Math.floor(date.getTime() / BUCKET_MS) * BUCKET_MS);
  return rounded.toISOString();
}

/** Load all match data from gameweek directories */
export async function loadAllMatches(): Promise<MatchData[]> {
  const gameweeks = await getAvailableGameweeks();
  const allMatches: MatchData[] = [];

  for (const gw of gameweeks) {
    const gwDir = path.join(GW_BASE_DIR, `GW${gw}`);
    try {
      const raw = await fs.readFile(path.join(gwDir, 'matches.json'), 'utf-8');
      const matches: MatchData[] = JSON.parse(raw);
      allMatches.push(...matches);
    } catch {
      continue;
    }
  }

  return allMatches;
}

/** Get set of fixture IDs already finished in DB */
async function getFinishedFixtureIds(): Promise<Set<number>> {
  try {
    const existing = await db
      .select({ fixtureId: matchResults.fixtureId, status: matchResults.status })
      .from(matchResults);
    return new Set(existing.filter((r) => r.status === 'finished').map((r) => r.fixtureId));
  } catch {
    return new Set();
  }
}

/** Compute the full sync plan based on match times and DB state */
export async function computeSyncPlan(): Promise<SyncPlan> {
  const now = new Date();
  const allMatches = await loadAllMatches();
  const finishedIds = await getFinishedFixtureIds();

  // Group fixtures by 15-min kickoff bucket
  const buckets = new Map<string, { kickoff: Date; fixtureIds: number[]; leagueIds: Set<number> }>();

  for (const match of allMatches) {
    if (finishedIds.has(match.fixtureId)) continue; // skip already finished

    const kickoff = new Date(match.kickoff);
    const bucket = toBucket(kickoff);

    if (!buckets.has(bucket)) {
      buckets.set(bucket, { kickoff, fixtureIds: [], leagueIds: new Set() });
    }
    const b = buckets.get(bucket)!;
    b.fixtureIds.push(match.fixtureId);
    b.leagueIds.add(match.league.id);
  }

  // Convert to SyncWindows
  const windows: SyncWindow[] = [];
  for (const [bucket, data] of buckets) {
    windows.push({
      bucket,
      kickoffTime: data.kickoff,
      syncAfter: new Date(data.kickoff.getTime() + SYNC_AFTER_MS),
      backupSync: new Date(data.kickoff.getTime() + BACKUP_SYNC_MS),
      expiry: new Date(data.kickoff.getTime() + EXPIRY_MS),
      fixtureIds: data.fixtureIds,
      leagueIds: Array.from(data.leagueIds),
    });
  }

  // Find active windows (syncAfter <= now < expiry)
  const activeWindows = windows.filter((w) => now >= w.syncAfter && now < w.expiry);

  // Pending fixture IDs from active windows
  const pendingFixtureIds = activeWindows.flatMap((w) => w.fixtureIds);

  // Find next future window
  const futureWindows = windows
    .filter((w) => w.syncAfter > now)
    .sort((a, b) => a.syncAfter.getTime() - b.syncAfter.getTime());
  const nextWindowAt = futureWindows.length > 0 ? futureWindows[0].syncAfter : null;

  // Is today a matchday?
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const todayMatches = allMatches.filter((m) => {
    const k = new Date(m.kickoff);
    return k >= todayStart && k < todayEnd;
  });
  const isMatchday = todayMatches.length > 0;

  // Leagues with matches in the last 24h
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const recentLeagueIds = Array.from(
    new Set(
      allMatches
        .filter((m) => {
          const k = new Date(m.kickoff);
          return k >= last24h && k <= now;
        })
        .map((m) => m.league.id)
    )
  );

  return {
    activeWindows,
    pendingFixtureIds,
    nextWindowAt,
    isMatchday,
    recentLeagueIds,
    totalFixtures: allMatches.length,
    finishedInDb: finishedIds.size,
  };
}

/** Get upcoming fixtures within a time window (for Polymarket filtering) */
export async function getUpcomingFixturesInWindow(hoursAhead: number): Promise<MatchData[]> {
  const now = new Date();
  const cutoff = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
  const allMatches = await loadAllMatches();

  return allMatches.filter((m) => {
    const k = new Date(m.kickoff);
    return k > now && k <= cutoff;
  });
}
