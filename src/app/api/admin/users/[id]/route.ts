import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { isAdmin } from '@/config/site';
import { getUser, updateUser } from '@/lib/db/users';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const user = await getUser(decodeURIComponent(id));
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const updates: Record<string, unknown> = {};

  // Validate tier
  if (body.tier !== undefined) {
    if (!['free', 'pro', 'gold'].includes(body.tier)) {
      return NextResponse.json({ error: 'Invalid tier. Must be free, pro, or gold' }, { status: 400 });
    }
    updates.tier = body.tier;
  }

  // Validate credits
  if (body.credits !== undefined) {
    if (typeof body.credits !== 'number' || !Number.isInteger(body.credits) || body.credits < 0) {
      return NextResponse.json({ error: 'Credits must be a non-negative integer' }, { status: 400 });
    }
    updates.credits = body.credits;
  }

  // Validate hasApiAccess
  if (body.hasApiAccess !== undefined) {
    if (typeof body.hasApiAccess !== 'boolean') {
      return NextResponse.json({ error: 'hasApiAccess must be a boolean' }, { status: 400 });
    }
    updates.hasApiAccess = body.hasApiAccess;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const user = await updateUser(decodeURIComponent(id), updates);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(user);
}
