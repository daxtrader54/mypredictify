import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { isAdmin } from '@/config/site';
import { getUser, addCredits, deductCredits } from '@/lib/db/users';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const userId = decodeURIComponent(id);
  const body = await request.json();
  const { amount, reason } = body;

  if (typeof amount !== 'number' || amount === 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  const user = await getUser(userId);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  let result;
  if (amount > 0) {
    result = await addCredits(userId, amount, 'subscription', reason || `Admin: added ${amount} credits`);
  } else {
    result = await deductCredits(userId, Math.abs(amount), reason || `Admin: removed ${Math.abs(amount)} credits`);
  }

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, newBalance: result.newBalance });
}
