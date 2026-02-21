import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getAvailableGameweeks, GW_BASE_DIR } from '@/lib/gameweeks';

export const dynamic = 'force-dynamic';

interface EvaluationMarker {
  gameweek: number;
  detectedAt: string;
  reason: string;
}

/**
 * Pipeline check cron endpoint.
 * Scans for _needs-evaluation.json markers left by sync-results
 * and reports which gameweeks need evaluation.
 *
 * The actual evaluation is triggered externally (e.g., Claude CLI pipeline).
 * This endpoint just reports what needs to be done.
 */
export async function GET(_request: NextRequest) {
  const gameweeks = await getAvailableGameweeks();
  const pendingEvaluations: EvaluationMarker[] = [];

  for (const gw of gameweeks) {
    const markerPath = path.join(GW_BASE_DIR, `GW${gw}`, '_needs-evaluation.json');
    try {
      const raw = await fs.readFile(markerPath, 'utf-8');
      const marker: EvaluationMarker = JSON.parse(raw);
      pendingEvaluations.push(marker);
    } catch {
      continue;
    }
  }

  return NextResponse.json({
    pendingEvaluations,
    count: pendingEvaluations.length,
    timestamp: new Date().toISOString(),
  });
}
