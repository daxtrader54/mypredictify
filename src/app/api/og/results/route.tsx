import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { GW_BASE_DIR } from '@/lib/gameweeks';
import { loadResults } from '@/lib/results';

export const runtime = 'nodejs';

interface MatchData {
  fixtureId: number;
  league: { id: number; name: string };
  homeTeam: { name: string };
  awayTeam: { name: string };
  kickoff: string;
}

interface PredictionEntry {
  fixtureId: number;
  predictedScore: string;
  prediction: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const gw = searchParams.get('gw');

  if (!gw) {
    return new Response('Missing gw parameter', { status: 400 });
  }

  const gwDir = path.join(GW_BASE_DIR, `GW${gw}`);

  let matches: MatchData[];
  try {
    const raw = await fs.readFile(path.join(gwDir, 'matches.json'), 'utf-8');
    matches = JSON.parse(raw);
  } catch {
    return new Response('Gameweek data not found', { status: 404 });
  }

  const fixtureIds = matches.map((m) => m.fixtureId);
  const resultsMap = await loadResults(fixtureIds, gwDir);

  let predictions: PredictionEntry[] = [];
  try {
    const raw = await fs.readFile(path.join(gwDir, 'predictions.json'), 'utf-8');
    predictions = JSON.parse(raw);
  } catch {
    // No predictions
  }

  const predMap = new Map(predictions.map((p) => [p.fixtureId, p]));

  let total = 0;
  let correctResult = 0;
  let exactScore = 0;
  let incorrect = 0;

  for (const match of matches) {
    const result = resultsMap.get(match.fixtureId);
    if (!result || result.status !== 'finished') continue;
    total++;

    const pred = predMap.get(match.fixtureId);
    if (!pred) continue;

    const actualOutcome = result.homeGoals > result.awayGoals ? 'H' : result.homeGoals < result.awayGoals ? 'A' : 'D';

    if (pred.predictedScore) {
      const [predH, predA] = pred.predictedScore.split('-').map((s) => parseInt(s.trim()));
      if (predH === result.homeGoals && predA === result.awayGoals) {
        exactScore++;
        continue;
      }
    }

    if (pred.prediction === actualOutcome) {
      correctResult++;
    } else {
      incorrect++;
    }
  }

  const correct = correctResult + exactScore;
  const predicted = correct + incorrect;
  const accuracyPct = predicted > 0 ? Math.round((correct / predicted) * 100) : 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200',
          height: '630',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
          fontFamily: 'sans-serif',
          color: 'white',
        }}
      >
        {/* Top branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={{ fontSize: '16px', color: '#22c55e', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const }}>
            MyPredictify
          </div>
        </div>

        {/* Title */}
        <div style={{ fontSize: '48px', fontWeight: 800, marginBottom: '8px' }}>
          Gameweek {gw} Results
        </div>
        <div style={{ fontSize: '16px', color: '#888', marginBottom: '48px', textTransform: 'uppercase' as const, letterSpacing: '3px' }}>
          {total} matches played
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '48px', marginBottom: '40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '64px', fontWeight: 900, color: '#22c55e' }}>{accuracyPct}%</div>
            <div style={{ fontSize: '14px', color: '#888', textTransform: 'uppercase' as const, letterSpacing: '2px' }}>Accuracy</div>
          </div>

          <div style={{ width: '1px', background: '#333' }} />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '64px', fontWeight: 900, color: '#f59e0b' }}>{exactScore}</div>
            <div style={{ fontSize: '14px', color: '#888', textTransform: 'uppercase' as const, letterSpacing: '2px' }}>Exact Scores</div>
          </div>

          <div style={{ width: '1px', background: '#333' }} />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '64px', fontWeight: 900, color: '#3b82f6' }}>{correct}/{predicted}</div>
            <div style={{ fontSize: '14px', color: '#888', textTransform: 'uppercase' as const, letterSpacing: '2px' }}>Correct</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ position: 'absolute', bottom: '24px', fontSize: '13px', color: '#555' }}>
          mypredictify.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
