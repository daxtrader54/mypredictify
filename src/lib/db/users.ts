import { eq, and, gte, sql, lt } from 'drizzle-orm';
import { db, users, creditTransactions, type User, type NewUser } from './index';
import { sendWelcomeEmail } from '@/lib/email';

export async function getUser(id: string): Promise<User | null> {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0] || null;
}

export async function getUserByStripeCustomerId(customerId: string): Promise<User | null> {
  const result = await db.select().from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);
  return result[0] || null;
}

export async function createUser(data: NewUser): Promise<User> {
  const result = await db.insert(users).values(data).returning();
  return result[0];
}

export async function updateUser(
  id: string,
  data: Partial<Omit<User, 'id' | 'createdAt'>>
): Promise<User | null> {
  const result = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return result[0] || null;
}

export async function getOrCreateUser(
  email: string,
  name?: string | null,
  image?: string | null
): Promise<User> {
  const existing = await getUserByEmail(email);

  if (existing) {
    // Update name and image if changed
    if (name !== existing.name || image !== existing.image) {
      const updated = await updateUser(existing.id, { name: name || undefined, image: image || undefined });
      return updated || existing;
    }
    return existing;
  }

  const newUser = await createUser({
    id: email, // Use email as ID
    email,
    name: name || null,
    image: image || null,
    credits: 100, // Starting credits
    tier: 'free',
    hasApiAccess: false,
    favoriteLeagues: [8], // Premier League
  });

  // Send welcome email (non-blocking — must not block signup)
  try {
    await sendWelcomeEmail(email, name);
  } catch {
    // Email failure should never block account creation
  }

  return newUser;
}

// Credits operations
export async function getUserCredits(userId: string): Promise<{
  credits: number;
  tier: User['tier'];
  hasApiAccess: boolean;
  canRedeemDaily: boolean;
}> {
  const user = await getUser(userId);

  if (!user) {
    throw new Error('User not found');
  }

  const now = new Date();
  const lastReset = user.dailyCreditsLastReset;
  const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);
  // Free and Pro both get daily credits; Gold has unlimited so no need
  const canRedeemDaily = hoursSinceReset >= 24 && user.tier !== 'gold';

  return {
    credits: user.credits,
    tier: user.tier,
    hasApiAccess: user.hasApiAccess,
    canRedeemDaily,
  };
}

export async function deductCredits(
  userId: string,
  amount: number,
  reason: string
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  // Atomic: only deducts if credits >= amount, prevents race conditions
  const result = await db
    .update(users)
    .set({
      credits: sql`${users.credits} - ${amount}`,
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, userId), gte(users.credits, amount)))
    .returning({ credits: users.credits });

  if (result.length === 0) {
    // Either user not found or insufficient credits
    const user = await getUser(userId);
    if (!user) return { success: false, newBalance: 0, error: 'User not found' };
    return { success: false, newBalance: user.credits, error: 'Insufficient credits' };
  }

  const newBalance = result[0].credits;

  // Log transaction (non-critical — credit already deducted atomically)
  await db.insert(creditTransactions).values({
    userId,
    amount: -amount,
    type: 'deduct',
    reason,
    balanceAfter: newBalance,
  });

  return { success: true, newBalance };
}

export async function addCredits(
  userId: string,
  amount: number,
  type: 'redeem' | 'purchase' | 'subscription' | 'refund',
  reason?: string
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  // Atomic: increment credits in a single statement, prevents race conditions
  const result = await db
    .update(users)
    .set({
      credits: sql`${users.credits} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ credits: users.credits });

  if (result.length === 0) {
    return { success: false, newBalance: 0, error: 'User not found' };
  }

  const newBalance = result[0].credits;

  // Log transaction (non-critical — credit already added atomically)
  await db.insert(creditTransactions).values({
    userId,
    amount,
    type,
    reason,
    balanceAfter: newBalance,
  });

  return { success: true, newBalance };
}

export async function redeemDailyCredits(userId: string): Promise<{
  success: boolean;
  creditsAdded: number;
  newBalance: number;
  error?: string;
}> {
  const DAILY_CREDITS = 10;
  const now = new Date();
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Atomic: only redeems if 24h have passed AND not gold tier
  // The WHERE clause acts as the guard — concurrent requests can't both succeed
  const result = await db
    .update(users)
    .set({
      credits: sql`${users.credits} + ${DAILY_CREDITS}`,
      dailyCreditsLastReset: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(users.id, userId),
        lt(users.dailyCreditsLastReset, cutoff),
        sql`${users.tier} != 'gold'`
      )
    )
    .returning({ credits: users.credits });

  if (result.length === 0) {
    // Determine why it failed for a helpful error message
    const user = await getUser(userId);
    if (!user) return { success: false, creditsAdded: 0, newBalance: 0, error: 'User not found' };
    if (user.tier === 'gold') {
      return { success: false, creditsAdded: 0, newBalance: user.credits, error: 'Gold tier has unlimited credits' };
    }
    const hoursSinceReset = (now.getTime() - user.dailyCreditsLastReset.getTime()) / (1000 * 60 * 60);
    const hoursRemaining = Math.ceil(24 - hoursSinceReset);
    return {
      success: false,
      creditsAdded: 0,
      newBalance: user.credits,
      error: `You can redeem again in ${hoursRemaining} hours`,
    };
  }

  const newBalance = result[0].credits;

  // Log transaction (non-critical — credit already added atomically)
  await db.insert(creditTransactions).values({
    userId,
    amount: DAILY_CREDITS,
    type: 'redeem',
    reason: 'Daily redemption',
    balanceAfter: newBalance,
  });

  return {
    success: true,
    creditsAdded: DAILY_CREDITS,
    newBalance,
  };
}

// Subscription management
export async function updateUserSubscription(
  userId: string,
  tier: User['tier'],
  hasApiAccess: boolean,
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
): Promise<void> {
  const updates: Partial<User> = {
    tier,
    hasApiAccess,
    updatedAt: new Date(),
  };

  if (stripeCustomerId) updates.stripeCustomerId = stripeCustomerId;
  if (stripeSubscriptionId) updates.stripeSubscriptionId = stripeSubscriptionId;

  // Reset monthly credits for paid users
  if (tier === 'pro') {
    updates.credits = 100;
    updates.monthlyCreditsLastReset = new Date();
  } else if (tier === 'gold') {
    updates.credits = 999999;
    updates.monthlyCreditsLastReset = new Date();
  }

  await db.update(users).set(updates).where(eq(users.id, userId));
}

export async function cancelSubscription(userId: string): Promise<void> {
  await db
    .update(users)
    .set({
      tier: 'free',
      hasApiAccess: false,
      stripeSubscriptionId: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}
