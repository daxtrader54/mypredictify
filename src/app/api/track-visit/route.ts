import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getSession } from '@/lib/auth/get-session';
import { db, pageVisits } from '@/lib/db';

let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) return;

  const sql = neon(dbUrl);

  const check = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'predictify' AND table_name = 'page_visits'
    ) as exists
  `;

  if (!check[0]?.exists) {
    await sql`
      CREATE TABLE IF NOT EXISTS predictify.page_visits (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL REFERENCES predictify.users(id) ON DELETE CASCADE,
        route TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_page_visits_user_id ON predictify.page_visits(user_id)`;
  }

  tableReady = true;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { route } = await request.json();
    if (!route || typeof route !== 'string') {
      return NextResponse.json({ error: 'Invalid route' }, { status: 400 });
    }

    await ensureTable();

    await db.insert(pageVisits).values({
      userId: session.user.email,
      route,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to track visit' }, { status: 500 });
  }
}
