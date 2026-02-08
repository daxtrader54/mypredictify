import { promises as fs } from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import { matchResults } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';

export interface ResultData {
  fixtureId: number;
  homeGoals: number;
  awayGoals: number;
  status: 'finished' | 'live' | 'postponed';
}

/**
 * Load results for a set of fixture IDs.
 * Checks DB first (live data from cron), then merges with results.json (static fallback).
 * DB results take precedence.
 */
export async function loadResults(
  fixtureIds: number[],
  gwDir: string
): Promise<Map<number, ResultData>> {
  const resultsMap = new Map<number, ResultData>();

  // 1. Load from results.json (static fallback baked into build)
  try {
    const raw = await fs.readFile(path.join(gwDir, 'results.json'), 'utf-8');
    const fileResults: ResultData[] = JSON.parse(raw);
    for (const r of fileResults) {
      resultsMap.set(r.fixtureId, r);
    }
  } catch {
    // No results.json — that's fine
  }

  // 2. Load from DB (overrides file results — DB is more recent)
  if (fixtureIds.length > 0) {
    try {
      const dbResults = await db
        .select()
        .from(matchResults)
        .where(inArray(matchResults.fixtureId, fixtureIds));

      for (const r of dbResults) {
        resultsMap.set(r.fixtureId, {
          fixtureId: r.fixtureId,
          homeGoals: r.homeGoals,
          awayGoals: r.awayGoals,
          status: r.status as ResultData['status'],
        });
      }
    } catch {
      // DB table might not exist yet — fall back to file results
    }
  }

  return resultsMap;
}
