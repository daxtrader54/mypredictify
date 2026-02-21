import { promises as fs } from 'fs';
import path from 'path';
import { getAvailableGameweeks, GW_BASE_DIR } from '@/lib/gameweeks';
import { db } from '@/lib/db';
import { matchResults } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';

interface MatchData {
  fixtureId: number;
  league: { id: number; name: string };
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  kickoff: string;
}

export interface GameweekCompleteness {
  gameweek: number;
  totalMatches: number;
  finishedMatches: number;
  isComplete: boolean;
  hasPredictions: boolean;
  hasEvaluation: boolean;
  needsEvaluation: boolean;
}

/** Check completeness of all gameweeks */
export async function checkGameweekCompleteness(): Promise<GameweekCompleteness[]> {
  const gameweeks = await getAvailableGameweeks();
  const results: GameweekCompleteness[] = [];

  for (const gw of gameweeks) {
    const gwDir = path.join(GW_BASE_DIR, `GW${gw}`);

    // Load matches
    let matches: MatchData[] = [];
    try {
      const raw = await fs.readFile(path.join(gwDir, 'matches.json'), 'utf-8');
      matches = JSON.parse(raw);
    } catch {
      continue;
    }

    if (matches.length === 0) continue;

    // Check if predictions exist
    let hasPredictions = false;
    try {
      await fs.access(path.join(gwDir, 'predictions.json'));
      hasPredictions = true;
    } catch {
      // no predictions
    }

    // Check if evaluation marker already exists (or results.json with evaluation data)
    let hasEvaluation = false;
    try {
      await fs.access(path.join(gwDir, 'results.json'));
      // Check if the results file has evaluation data (not just raw results)
      const resultsRaw = await fs.readFile(path.join(gwDir, 'results.json'), 'utf-8');
      const resultsData = JSON.parse(resultsRaw);
      // If results array exists and has entries with 'correct' field, evaluation was done
      if (Array.isArray(resultsData) && resultsData.length > 0 && 'correct' in resultsData[0]) {
        hasEvaluation = true;
      }
    } catch {
      // no results file
    }

    // Check DB for finished matches in this GW
    const fixtureIds = matches.map((m) => m.fixtureId);
    let finishedCount = 0;
    try {
      const dbResults = await db
        .select({ fixtureId: matchResults.fixtureId })
        .from(matchResults)
        .where(inArray(matchResults.fixtureId, fixtureIds));
      finishedCount = dbResults.filter((r) => r.fixtureId).length;
    } catch {
      // DB error — treat as 0 finished
    }

    const isComplete = finishedCount === matches.length;
    const needsEvaluation = isComplete && hasPredictions && !hasEvaluation;

    results.push({
      gameweek: gw,
      totalMatches: matches.length,
      finishedMatches: finishedCount,
      isComplete,
      hasPredictions,
      hasEvaluation,
      needsEvaluation,
    });
  }

  return results;
}

/** Write evaluation marker file for a gameweek */
export async function writeEvaluationMarker(gameweek: number): Promise<void> {
  const gwDir = path.join(GW_BASE_DIR, `GW${gameweek}`);
  const markerPath = path.join(gwDir, '_needs-evaluation.json');
  await fs.writeFile(
    markerPath,
    JSON.stringify({
      gameweek,
      detectedAt: new Date().toISOString(),
      reason: 'all-matches-complete',
    }),
    'utf-8'
  );
}

/** Check if evaluation marker exists for a gameweek */
export async function hasEvaluationMarker(gameweek: number): Promise<boolean> {
  const markerPath = path.join(GW_BASE_DIR, `GW${gameweek}`, '_needs-evaluation.json');
  try {
    await fs.access(markerPath);
    return true;
  } catch {
    return false;
  }
}

/** Remove evaluation marker after successful evaluation */
export async function removeEvaluationMarker(gameweek: number): Promise<void> {
  const markerPath = path.join(GW_BASE_DIR, `GW${gameweek}`, '_needs-evaluation.json');
  try {
    await fs.unlink(markerPath);
  } catch {
    // marker didn't exist
  }
}
