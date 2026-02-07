import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { getUserCredits } from '@/lib/db/users';

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { credits, tier, hasApiAccess, canRedeemDaily } = await getUserCredits(session.user.email);

    return NextResponse.json({
      credits,
      tier,
      hasApiAccess,
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
