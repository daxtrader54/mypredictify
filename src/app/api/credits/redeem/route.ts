import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { redeemDailyCredits } from '@/lib/db/users';

export async function POST() {
  try {
    const session = await getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await redeemDailyCredits(session.user.email);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to redeem credits' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      creditsAdded: result.creditsAdded,
      newBalance: result.newBalance,
    });
  } catch (error) {
    console.error('Error redeeming credits:', error);
    return NextResponse.json(
      { error: 'Failed to redeem credits' },
      { status: 500 }
    );
  }
}
