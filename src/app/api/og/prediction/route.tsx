import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { CURRENT_SEASON } from '@/config/site';
import { getAvailableGameweeks, GW_BASE_DIR } from '@/lib/gameweeks';

export const runtime = 'nodejs';

interface MatchData {
  fixtureId: number;
  league: { id: number; name: string };
  homeTeam: { name: string; shortCode: string };
  awayTeam: { name: string; shortCode: string };
}

interface PredictionEntry {
  fixtureId: number;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  predictedScore: string;
  prediction: string;
  confidence: number;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const fixtureId = searchParams.get('fixtureId');
  const gw = searchParams.get('gw');

  if (!fixtureId || !gw) {
    return new Response('Missing fixtureId or gw', { status: 400 });
  }

  const gwDir = path.join(GW_BASE_DIR, `GW${gw}`);

  let match: MatchData | undefined;
  let pred: PredictionEntry | undefined;

  try {
    const matchesRaw = await fs.readFile(path.join(gwDir, 'matches.json'), 'utf-8');
    const matches: MatchData[] = JSON.parse(matchesRaw);
    match = matches.find((m) => m.fixtureId === parseInt(fixtureId));
  } catch {
    return new Response('Match data not found', { status: 404 });
  }

  if (!match) {
    return new Response('Fixture not found', { status: 404 });
  }

  try {
    const predsRaw = await fs.readFile(path.join(gwDir, 'predictions.json'), 'utf-8');
    const preds: PredictionEntry[] = JSON.parse(predsRaw);
    pred = preds.find((p) => p.fixtureId === parseInt(fixtureId));
  } catch {
    // No predictions
  }

  const homeProb = pred ? Math.round(pred.homeWinProb * 100) : 0;
  const drawProb = pred ? Math.round(pred.drawProb * 100) : 0;
  const awayProb = pred ? Math.round(pred.awayWinProb * 100) : 0;
  const confidence = pred ? Math.round(pred.confidence * 100) : 0;
  const predictedScore = pred?.predictedScore || '? - ?';

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
          <div style={{ fontSize: '14px', color: '#888', marginLeft: '8px' }}>
            GW {gw}
          </div>
        </div>

        {/* League */}
        <div style={{ fontSize: '14px', color: '#888', marginBottom: '32px', textTransform: 'uppercase' as const, letterSpacing: '3px' }}>
          {match.league.name}
        </div>

        {/* Teams */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '40px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '280px' }}>
            <div style={{ fontSize: '40px', fontWeight: 800, textAlign: 'center' }}>{match.homeTeam.name}</div>
            <div style={{ fontSize: '14px', color: '#888', marginTop: '4px' }}>HOME</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '56px', fontWeight: 900, color: '#22c55e' }}>{predictedScore}</div>
            <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' as const, letterSpacing: '2px' }}>Predicted</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '280px' }}>
            <div style={{ fontSize: '40px', fontWeight: 800, textAlign: 'center' }}>{match.awayTeam.name}</div>
            <div style={{ fontSize: '14px', color: '#888', marginTop: '4px' }}>AWAY</div>
          </div>
        </div>

        {/* Probability bar */}
        {pred && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '600px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', marginBottom: '8px', fontSize: '16px' }}>
              <span style={{ color: '#3b82f6' }}>{homeProb}%</span>
              <span style={{ color: '#888' }}>{drawProb}%</span>
              <span style={{ color: '#ef4444' }}>{awayProb}%</span>
            </div>
            <div style={{ display: 'flex', width: '100%', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ width: `${homeProb}%`, background: '#3b82f6' }} />
              <div style={{ width: `${drawProb}%`, background: '#6b7280' }} />
              <div style={{ width: `${awayProb}%`, background: '#ef4444' }} />
            </div>
          </div>
        )}

        {/* Confidence */}
        {pred && (
          <div style={{ fontSize: '18px', color: confidence >= 60 ? '#22c55e' : confidence >= 45 ? '#eab308' : '#f97316' }}>
            {confidence}% Confidence
          </div>
        )}

        {/* Footer */}
        <div style={{ position: 'absolute', bottom: '24px', fontSize: '13px', color: '#555' }}>
          mypredictify.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
