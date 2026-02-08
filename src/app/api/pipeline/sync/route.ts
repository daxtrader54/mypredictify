import { NextResponse } from 'next/server';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { db } from '@/lib/db';
import { gameweeks, matchPredictions, weeklyMetrics } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/pipeline/sync
 * Sync prediction data files to Postgres for dynamic queries.
 * Called after pipeline runs to make data available to the web UI.
 */
export async function POST(request: Request) {
  try {
    // Verify API key (required — fail closed)
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.PIPELINE_SYNC_KEY;
    if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { season, gameweek: gwName } = body as { season?: string; gameweek?: string };

    // Validate input formats to prevent path traversal
    if (season && !/^\d{4}-\d{2}$/.test(season)) {
      return NextResponse.json({ error: 'Invalid season format' }, { status: 400 });
    }
    if (gwName && !/^GW\d+$/.test(gwName)) {
      return NextResponse.json({ error: 'Invalid gameweek format' }, { status: 400 });
    }

    // Find the latest gameweek if not specified
    const dataDir = resolve(process.cwd(), 'data', 'gameweeks');
    if (!existsSync(dataDir)) {
      return NextResponse.json({ error: 'No data directory found' }, { status: 404 });
    }

    let targetSeason = season;
    let targetGw = gwName;

    if (!targetSeason) {
      const seasons = readdirSync(dataDir).sort().reverse();
      if (seasons.length === 0) {
        return NextResponse.json({ error: 'No seasons found' }, { status: 404 });
      }
      targetSeason = seasons[0];
    }

    if (!targetGw) {
      const seasonDir = resolve(dataDir, targetSeason);
      const gws = readdirSync(seasonDir)
        .filter(d => d.startsWith('GW'))
        .sort((a, b) => {
          const numA = parseInt(a.replace('GW', ''));
          const numB = parseInt(b.replace('GW', ''));
          return numB - numA;
        });
      if (gws.length === 0) {
        return NextResponse.json({ error: 'No gameweeks found' }, { status: 404 });
      }
      targetGw = gws[0];
    }

    const gwDir = resolve(dataDir, targetSeason, targetGw);
    const gwNumber = parseInt(targetGw.replace('GW', ''));

    // Load predictions
    const predictionsPath = resolve(gwDir, 'predictions.json');
    if (!existsSync(predictionsPath)) {
      return NextResponse.json({ error: 'No predictions.json found' }, { status: 404 });
    }

    const predictions = JSON.parse(readFileSync(predictionsPath, 'utf-8'));

    // Upsert gameweek entries (one per league)
    const leagueIds = [...new Set(predictions.map((p: { league?: string; leagueId?: number }) => p.leagueId || 8))];

    for (const leagueId of leagueIds) {
      const gwId = `${targetSeason}-${targetGw}-${leagueId}`;

      // Check if exists
      const existing = await db.select().from(gameweeks).where(eq(gameweeks.id, gwId));

      if (existing.length === 0) {
        await db.insert(gameweeks).values({
          id: gwId,
          leagueId: leagueId as number,
          number: gwNumber,
          name: targetGw,
          status: 'predicted',
        });
      }
    }

    // Upsert predictions
    let syncedCount = 0;
    for (const pred of predictions) {
      const leagueId = pred.leagueId || 8;
      const gwId = `${targetSeason}-${targetGw}-${leagueId}`;
      const predId = `${gwId}-${pred.fixtureId}`;

      const existing = await db.select().from(matchPredictions).where(eq(matchPredictions.id, predId));

      const values = {
        id: predId,
        gameweekId: gwId,
        fixtureId: pred.fixtureId,
        homeTeam: pred.homeTeam,
        awayTeam: pred.awayTeam,
        homeWinProb: String(pred.homeWinProb),
        drawProb: String(pred.drawProb),
        awayWinProb: String(pred.awayWinProb),
        predictedScore: pred.predictedScore,
        prediction: pred.prediction,
        confidence: String(pred.confidence),
        explanation: pred.explanation || null,
      };

      if (existing.length === 0) {
        await db.insert(matchPredictions).values(values);
      } else {
        await db.update(matchPredictions).set(values).where(eq(matchPredictions.id, predId));
      }
      syncedCount++;
    }

    // Sync evaluation if exists
    const evalPath = resolve(gwDir, 'evaluation.json');
    if (existsSync(evalPath)) {
      const evaluation = JSON.parse(readFileSync(evalPath, 'utf-8'));

      if (evaluation.summary) {
        for (const leagueId of leagueIds) {
          const gwId = `${targetSeason}-${targetGw}-${leagueId}`;
          const metricId = `${gwId}-metric`;

          const existing = await db.select().from(weeklyMetrics).where(eq(weeklyMetrics.id, metricId));

          const metricValues = {
            id: metricId,
            gameweekId: gwId,
            leagueId: leagueId as number,
            accuracy: String(evaluation.summary.outcomeAccuracy),
            avgLogLoss: String(evaluation.summary.avgLogLoss),
            brierScore: String(evaluation.summary.avgBrierScore),
            predictions: evaluation.summary.totalPredictions,
            correct: evaluation.summary.correctOutcomes,
          };

          if (existing.length === 0) {
            await db.insert(weeklyMetrics).values(metricValues);
          } else {
            await db.update(weeklyMetrics).set(metricValues).where(eq(weeklyMetrics.id, metricId));
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      season: targetSeason,
      gameweek: targetGw,
      syncedPredictions: syncedCount,
    });
  } catch (error) {
    console.error('Pipeline sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    );
  }
}
