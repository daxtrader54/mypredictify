import { NextResponse } from 'next/server';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { db } from '@/lib/db';
import { gameweeks, matchPredictions, weeklyMetrics } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

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

    // Build gameweek rows (one per league) — batch upsert
    const leagueIds = [...new Set(predictions.map((p: { leagueId?: number }) => p.leagueId || 8))] as number[];

    const gwRows = leagueIds.map((leagueId) => ({
      id: `${targetSeason}-${targetGw}-${leagueId}`,
      leagueId,
      number: gwNumber,
      name: targetGw!,
      status: 'predicted' as const,
    }));

    if (gwRows.length > 0) {
      await db
        .insert(gameweeks)
        .values(gwRows)
        .onConflictDoUpdate({
          target: gameweeks.id,
          set: {
            status: sql`excluded.status`,
            updatedAt: new Date(),
          },
        });
    }

    // Build prediction rows — batch upsert
    const predRows = predictions.map((pred: {
      fixtureId: number;
      leagueId?: number;
      homeTeam: string;
      awayTeam: string;
      homeWinProb: number;
      drawProb: number;
      awayWinProb: number;
      predictedScore: string;
      prediction: string;
      confidence: number;
      explanation?: string;
    }) => {
      const leagueId = pred.leagueId || 8;
      const gwId = `${targetSeason}-${targetGw}-${leagueId}`;
      return {
        id: `${gwId}-${pred.fixtureId}`,
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
    });

    if (predRows.length > 0) {
      await db
        .insert(matchPredictions)
        .values(predRows)
        .onConflictDoUpdate({
          target: matchPredictions.id,
          set: {
            homeWinProb: sql`excluded.home_win_prob`,
            drawProb: sql`excluded.draw_prob`,
            awayWinProb: sql`excluded.away_win_prob`,
            predictedScore: sql`excluded.predicted_score`,
            prediction: sql`excluded.prediction`,
            confidence: sql`excluded.confidence`,
            explanation: sql`excluded.explanation`,
          },
        });
    }

    // Sync evaluation if exists — batch upsert
    const evalPath = resolve(gwDir, 'evaluation.json');
    if (existsSync(evalPath)) {
      const evaluation = JSON.parse(readFileSync(evalPath, 'utf-8'));

      if (evaluation.summary) {
        const metricRows = leagueIds.map((leagueId) => {
          const gwId = `${targetSeason}-${targetGw}-${leagueId}`;
          return {
            id: `${gwId}-metric`,
            gameweekId: gwId,
            leagueId,
            accuracy: String(evaluation.summary.outcomeAccuracy),
            avgLogLoss: String(evaluation.summary.avgLogLoss),
            brierScore: String(evaluation.summary.avgBrierScore),
            predictions: evaluation.summary.totalPredictions,
            correct: evaluation.summary.correctOutcomes,
          };
        });

        if (metricRows.length > 0) {
          await db
            .insert(weeklyMetrics)
            .values(metricRows)
            .onConflictDoUpdate({
              target: weeklyMetrics.id,
              set: {
                accuracy: sql`excluded.accuracy`,
                avgLogLoss: sql`excluded.avg_log_loss`,
                brierScore: sql`excluded.brier_score`,
                predictions: sql`excluded.predictions`,
                correct: sql`excluded.correct`,
              },
            });
        }
      }
    }

    return NextResponse.json({
      success: true,
      season: targetSeason,
      gameweek: targetGw,
      syncedPredictions: predRows.length,
    });
  } catch (error) {
    console.error('Pipeline sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    );
  }
}
