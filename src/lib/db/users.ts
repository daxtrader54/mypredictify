import { eq } from 'drizzle-orm';
import { db, users, creditTransactions, type User, type NewUser } from './index';

export async function getUser(id: string): Promise<User | null> {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
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

  return createUser({
    id: email, // Use email as ID
    email,
    name: name || null,
    image: image || null,
    credits: 100, // Starting credits
    tier: 'free',
    hasApiAccess: false,
    favoriteLeagues: [8], // Premier League
  });
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
  const canRedeemDaily = hoursSinceReset >= 24 && user.tier === 'free';

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
  const user = await getUser(userId);

  if (!user) {
    return { success: false, newBalance: 0, error: 'User not found' };
  }

  if (user.credits < amount) {
    return { success: false, newBalance: user.credits, error: 'Insufficient credits' };
  }

  const newBalance = user.credits - amount;

  // Update user credits
  await db
    .update(users)
    .set({ credits: newBalance, updatedAt: new Date() })
    .where(eq(users.id, userId));

  // Log transaction
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
  const user = await getUser(userId);

  if (!user) {
    return { success: false, newBalance: 0, error: 'User not found' };
  }

  const newBalance = user.credits + amount;

  // Update user credits
  await db
    .update(users)
    .set({ credits: newBalance, updatedAt: new Date() })
    .where(eq(users.id, userId));

  // Log transaction
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
  const user = await getUser(userId);

  if (!user) {
    return { success: false, creditsAdded: 0, newBalance: 0, error: 'User not found' };
  }

  // Only free tier can redeem daily
  if (user.tier !== 'free') {
    return {
      success: false,
      creditsAdded: 0,
      newBalance: user.credits,
      error: 'Daily redemption only available for free tier',
    };
  }

  const now = new Date();
  const lastReset = user.dailyCreditsLastReset;
  const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

  if (hoursSinceReset < 24) {
    const hoursRemaining = Math.ceil(24 - hoursSinceReset);
    return {
      success: false,
      creditsAdded: 0,
      newBalance: user.credits,
      error: `You can redeem again in ${hoursRemaining} hours`,
    };
  }

  const newBalance = user.credits + DAILY_CREDITS;

  // Update user
  await db
    .update(users)
    .set({
      credits: newBalance,
      dailyCreditsLastReset: now,
      updatedAt: now,
    })
    .where(eq(users.id, userId));

  // Log transaction
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
    updates.credits = 500;
    updates.monthlyCreditsLastReset = new Date();
  } else if (tier === 'gold') {
    updates.credits = 2000;
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
