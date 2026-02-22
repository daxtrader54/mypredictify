import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { getOrCreateUser, awardShareCredits, getShareCreditsUsedToday } from '@/lib/db/users';
import { SHARE_CREDITS } from '@/config/pricing';

const VALID_CONTENT_TYPES = ['prediction', 'value-bet', 'acca', 'blog', 'market'];
const VALID_PLATFORMS = ['twitter', 'facebook', 'whatsapp', 'copy'];

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { contentType, platform } = body;

    if (!contentType || !VALID_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json({ error: 'Invalid contentType' }, { status: 400 });
    }
    if (!platform || !VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    const user = await getOrCreateUser(session.user.email, session.user.name, session.user.image);

    // Gold tier: share works, no credit reward needed
    if (user.tier === 'gold') {
      const used = await getShareCreditsUsedToday(user.id);
      return NextResponse.json({
        success: true,
        creditsAwarded: 0,
        newBalance: user.credits,
        dailyUsed: used,
        dailyCap: SHARE_CREDITS.DAILY_CAP,
      });
    }

    const result = await awardShareCredits(user.id, contentType, platform);

    return NextResponse.json({
      success: result.success,
      creditsAwarded: result.creditsAwarded,
      newBalance: result.newBalance,
      dailyUsed: result.dailyUsed,
      dailyCap: SHARE_CREDITS.DAILY_CAP,
      ...(result.error && { error: result.error }),
    });
  } catch (error) {
    console.error('Error awarding share credits:', error);
    return NextResponse.json({ error: 'Failed to award share credits' }, { status: 500 });
  }
}
