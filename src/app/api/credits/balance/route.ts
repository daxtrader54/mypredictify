import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { getOrCreateUser } from '@/lib/db/users';

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getOrCreateUser(
      session.user.email,
      session.user.name,
      session.user.image
    );

    const now = new Date();
    const hoursSinceReset = (now.getTime() - user.dailyCreditsLastReset.getTime()) / (1000 * 60 * 60);
    const canRedeemDaily = hoursSinceReset >= 24 && user.tier === 'free';

    return NextResponse.json({
      credits: user.credits,
      tier: user.tier,
      hasApiAccess: user.hasApiAccess,
      canRedeemDaily,
    });
  } catch (error) {
    console.error('Error fetching credits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credits' },
      { status: 500 }
    );
  }
}
