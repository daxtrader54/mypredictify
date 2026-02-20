import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { isAdmin } from '@/config/site';
import { db, users, pageVisits } from '@/lib/db';
import { like, or, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 50;
  const offset = (page - 1) * limit;

  let query = db.select().from(users);

  if (search) {
    const pattern = `%${search}%`;
    query = query.where(
      or(
        like(users.email, pattern),
        like(users.name, pattern),
        like(users.stripeCustomerId, pattern),
      )
    ) as typeof query;
  }

  const results = await query
    .orderBy(users.createdAt)
    .limit(limit)
    .offset(offset);

  const countResult = await db.select({ count: sql<number>`count(*)` }).from(users);
  const total = Number(countResult[0]?.count ?? 0);

  // Fetch visit stats per user
  let visitStats: Record<string, { totalVisits: number; lastVisit: string | null }> = {};
  try {
    const visitRows = await db
      .select({
        userId: pageVisits.userId,
        totalVisits: sql<number>`count(*)`,
        lastVisit: sql<string>`max(${pageVisits.createdAt})`,
      })
      .from(pageVisits)
      .groupBy(pageVisits.userId);

    for (const row of visitRows) {
      visitStats[row.userId] = {
        totalVisits: Number(row.totalVisits),
        lastVisit: row.lastVisit,
      };
    }
  } catch {
    // page_visits table may not exist yet — continue without visit data
  }

  const usersWithVisits = results.map((u) => ({
    ...u,
    visits: visitStats[u.id] || { totalVisits: 0, lastVisit: null },
  }));

  return NextResponse.json({
    users: usersWithVisits,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
