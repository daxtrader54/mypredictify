import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { deductCredits, getOrCreateUser } from '@/lib/db/users';
import { isFreeForTier } from '@/config/pricing';

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, reason, leagueId } = body;

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== 'string') {
      return NextResponse.json(
        { error: 'Reason is required' },
        { status: 400 }
      );
    }

    // Check if this league is free for the user's tier
    if (typeof leagueId === 'number') {
      const user = await getOrCreateUser(session.user.email, session.user.name, session.user.image);
      if (isFreeForTier(user.tier, leagueId)) {
        return NextResponse.json({ success: true, newBalance: user.credits });
      }
    }

    const result = await deductCredits(session.user.email, amount, reason);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to deduct credits' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      newBalance: result.newBalance,
    });
  } catch (error) {
    console.error('Error deducting credits:', error);
    return NextResponse.json(
      { error: 'Failed to deduct credits' },
      { status: 500 }
    );
  }
}
