import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { sql, and, ne, lt } from 'drizzle-orm';

/**
 * POST /api/cron/reset-credits
 * Monthly credit reset: free → 100, pro → 100, gold → skipped (unlimited).
 * Scheduled via Vercel cron on 1st of each month at midnight UTC.
 * Guard: only resets where monthlyCreditsLastReset < first of current month.
 */
export async function GET() {
  try {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Reset credits for free and pro users who haven't been reset this month
    const result = await db
      .update(users)
      .set({
        credits: 100,
        monthlyCreditsLastReset: now,
        updatedAt: now,
      })
      .where(
        and(
          ne(users.tier, 'gold'),
          lt(users.monthlyCreditsLastReset, firstOfMonth)
        )
      )
      .returning({ id: users.id });

    return NextResponse.json({
      success: true,
      usersReset: result.length,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Credit reset cron error:', error);
    return NextResponse.json(
      { error: 'Credit reset failed' },
      { status: 500 }
    );
  }
}
