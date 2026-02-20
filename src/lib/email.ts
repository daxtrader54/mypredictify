const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = 'MyPredictify <noreply@mypredictify.com>';

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('Resend error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

export async function sendWelcomeEmail(to: string, name?: string | null): Promise<boolean> {
  const firstName = name?.split(' ')[0] || 'there';

  return sendEmail(
    to,
    'Welcome to MyPredictify!',
    `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #22c55e;">Welcome to MyPredictify!</h1>
      <p>Hey ${firstName},</p>
      <p>Thanks for signing up! You've got <strong>100 free credits</strong> to start exploring AI-powered football predictions across Europe's top 5 leagues.</p>
      <h3>Getting Started:</h3>
      <ul>
        <li><strong>Browse Predictions</strong> — See AI predictions for upcoming matches</li>
        <li><strong>Find Value Bets</strong> — Spot odds the bookies got wrong</li>
        <li><strong>Build ACCAs</strong> — Create smarter accumulators with AI</li>
        <li><strong>Claim Daily Bonus</strong> — +10 free credits every day</li>
      </ul>
      <p><a href="https://mypredictify.com/dashboard" style="background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Go to Dashboard</a></p>
      <p style="color: #666; font-size: 12px; margin-top: 32px;">18+ | Gamble responsibly | BeGambleAware.org</p>
    </div>
    `
  );
}

export async function sendUpgradeEmail(
  to: string,
  name?: string | null,
  tier?: string
): Promise<boolean> {
  const firstName = name?.split(' ')[0] || 'there';
  const planName = tier === 'gold' ? 'Gold' : 'Pro';

  return sendEmail(
    to,
    `You're now on ${planName}!`,
    `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #22c55e;">You're on ${planName}!</h1>
      <p>Hey ${firstName},</p>
      <p>Your upgrade to <strong>${planName}</strong> is confirmed. Here's what you've unlocked:</p>
      ${tier === 'gold' ? `
      <ul>
        <li>Unlimited predictions across all 5 leagues</li>
        <li>No credit limits</li>
        <li>Unlimited AI ACCA recommendations</li>
        <li>Priority support</li>
      </ul>
      ` : `
      <ul>
        <li>Unlimited Premier League predictions</li>
        <li>100 credits + 10 daily for other leagues</li>
        <li>Unlimited AI ACCA recommendations</li>
        <li>Advanced match statistics</li>
      </ul>
      `}
      <p><a href="https://mypredictify.com/dashboard?upgraded=true" style="background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Go to Dashboard</a></p>
      <p style="color: #666; font-size: 12px; margin-top: 32px;">18+ | Gamble responsibly | BeGambleAware.org</p>
    </div>
    `
  );
}
