import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'MyPredictify — AI-Powered Football Predictions';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-2px',
            }}
          >
            MyPredictify
          </div>
          <div
            style={{
              fontSize: 28,
              color: '#22c55e',
              fontWeight: 600,
            }}
          >
            AI-Powered Football Predictions
          </div>
          <div
            style={{
              display: 'flex',
              gap: '16px',
              marginTop: '16px',
            }}
          >
            {['Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1'].map((league) => (
              <div
                key={league}
                style={{
                  padding: '8px 20px',
                  borderRadius: '20px',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#a1a1aa',
                  fontSize: 16,
                  fontWeight: 500,
                }}
              >
                {league}
              </div>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              gap: '48px',
              marginTop: '24px',
              color: '#71717a',
              fontSize: 18,
            }}
          >
            <span>68% Accuracy</span>
            <span>5 Leagues</span>
            <span>98 Teams</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
