import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PRICING_PLANS, ADD_ONS, type PricingTier } from '@/config/pricing';
import {
  getUserByEmail,
  getUserByStripeCustomerId,
  updateUserSubscription,
  cancelSubscription,
} from '@/lib/db/users';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Build price ID → tier lookup from the pricing config
const PRICE_TO_TIER: Record<string, PricingTier> = {};
for (const plan of PRICING_PLANS) {
  if (plan.stripePriceIdMonthly) PRICE_TO_TIER[plan.stripePriceIdMonthly] = plan.id;
  if (plan.stripePriceIdAnnual) PRICE_TO_TIER[plan.stripePriceIdAnnual] = plan.id;
}

// API access add-on price IDs
const API_ACCESS_PRICE_IDS = new Set(
  ADD_ONS.filter((a) => a.id === 'api-access' && a.stripePriceId).map((a) => a.stripePriceId!)
);

function getTierFromSubscription(subscription: Stripe.Subscription): {
  tier: PricingTier;
  hasApiAccess: boolean;
} {
  let tier: PricingTier = 'free';
  let hasApiAccess = false;

  for (const item of subscription.items.data) {
    const priceId = item.price.id;
    if (PRICE_TO_TIER[priceId]) {
      tier = PRICE_TO_TIER[priceId];
    }
    if (API_ACCESS_PRICE_IDS.has(priceId)) {
      hasApiAccess = true;
    }
  }

  return { tier, hasApiAccess };
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode !== 'subscription' || !session.subscription) break;

        // Get user email from metadata (set during checkout) or customer_email
        const userId = session.metadata?.userId || session.customer_email;
        if (!userId) {
          console.error('Webhook: no userId in checkout session', session.id);
          break;
        }

        // Retrieve the full subscription to inspect line items
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        const { tier, hasApiAccess } = getTierFromSubscription(subscription);

        await updateUserSubscription(
          userId,
          tier,
          hasApiAccess,
          session.customer as string,
          subscription.id
        );

        console.log(`Webhook: ${userId} upgraded to ${tier} (subscription: ${subscription.id})`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const user = await getUserByStripeCustomerId(customerId);
        if (!user) {
          console.error('Webhook: no user for Stripe customer', customerId);
          break;
        }

        // Check if subscription was cancelled (cancel_at_period_end)
        if (subscription.cancel_at_period_end) {
          console.log(`Webhook: ${user.id} subscription set to cancel at period end`);
          // Don't downgrade yet — they keep access until period ends
          break;
        }

        // Subscription is active — update tier based on current items
        if (subscription.status === 'active') {
          const { tier, hasApiAccess } = getTierFromSubscription(subscription);
          await updateUserSubscription(user.id, tier, hasApiAccess);
          console.log(`Webhook: ${user.id} subscription updated to ${tier}`);
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const user = await getUserByStripeCustomerId(customerId);
        if (!user) {
          console.error('Webhook: no user for Stripe customer', customerId);
          break;
        }

        await cancelSubscription(user.id);
        console.log(`Webhook: ${user.id} subscription cancelled, downgraded to free`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const user = await getUserByStripeCustomerId(customerId);
        if (!user) break;

        console.error(`Webhook: payment failed for ${user.id} (invoice: ${invoice.id})`);
        // Don't downgrade on first failure — Stripe retries automatically
        // Subscription will be deleted after all retries fail, handled above
        break;
      }

      default:
        // Unhandled event type — ignore silently
        break;
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err);
    // Return 200 anyway to prevent Stripe retries for non-transient errors
    // Stripe will retry on 5xx, which we don't want for logic errors
  }

  // Always return 200 to acknowledge receipt
  return NextResponse.json({ received: true });
}
