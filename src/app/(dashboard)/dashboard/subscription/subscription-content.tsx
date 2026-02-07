'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, Crown, CreditCard, Coins, ExternalLink, Loader2 } from 'lucide-react';
import { type User } from '@/lib/db/index';
import { PRICING_PLANS, formatPrice, CREDIT_COSTS } from '@/config/pricing';

export function SubscriptionContent({ user }: { user: User }) {
  const [portalLoading, setPortalLoading] = useState(false);
  const isPro = user.tier === 'pro';
  const currentPlan = PRICING_PLANS.find(p => p.id === user.tier);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setPortalLoading(false);
      }
    } catch {
      setPortalLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Subscription</h1>
        <p className="text-muted-foreground mt-1">Manage your plan and billing</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Current Plan
                <Badge variant={isPro ? 'default' : 'secondary'} className="ml-2">
                  {isPro ? (
                    <><Crown className="h-3 w-3 mr-1" /> PRO</>
                  ) : (
                    'FREE'
                  )}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                {currentPlan?.description}
              </CardDescription>
            </div>
            {isPro && (
              <div className="text-right">
                <div className="text-2xl font-bold">{formatPrice(currentPlan?.price || 0)}</div>
                <div className="text-sm text-muted-foreground">/month</div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {currentPlan?.features.map((feature, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter className="flex gap-3">
          {isPro ? (
            <Button onClick={handleManageBilling} disabled={portalLoading}>
              {portalLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading...</>
              ) : (
                <><CreditCard className="h-4 w-4 mr-2" /> Manage Billing</>
              )}
            </Button>
          ) : (
            <Button asChild>
              <Link href="/pricing">
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Pro
              </Link>
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Credits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-500" />
            Credits
          </CardTitle>
          <CardDescription>
            Your current credit balance and usage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <div className="text-sm text-muted-foreground">Available Credits</div>
              <div className="text-3xl font-bold">{user.credits.toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Monthly Allowance</div>
              <div className="text-xl font-semibold">{currentPlan?.credits.toLocaleString()}</div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-semibold mb-3">Credit Costs</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                <span className="text-sm">View prediction</span>
                <Badge variant="outline">{CREDIT_COSTS.VIEW_PREDICTION} credit</Badge>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                <span className="text-sm">Detailed stats</span>
                <Badge variant="outline">{CREDIT_COSTS.VIEW_DETAILED_STATS} credits</Badge>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                <span className="text-sm">Generate AI ACCA</span>
                <Badge variant="outline">{CREDIT_COSTS.GENERATE_ACCA} credits</Badge>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                <span className="text-sm">Value bet analysis</span>
                <Badge variant="outline">{CREDIT_COSTS.VIEW_VALUE_BET} credits</Badge>
              </div>
            </div>
          </div>

          {!isPro && (
            <>
              <Separator />
              <div className="text-sm text-muted-foreground">
                Free plan includes +{currentPlan?.dailyRefresh} daily bonus credits. Upgrade to Pro for {PRICING_PLANS.find(p => p.id === 'pro')?.credits.toLocaleString()} credits/month.
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Upgrade CTA for free users */}
      {!isPro && (
        <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="py-8 text-center">
            <Crown className="h-10 w-10 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Unlock All 5 Leagues</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
              Get 1,000 credits/month, all European leagues, value bet alerts, and unlimited AI ACCA recommendations.
            </p>
            <Button asChild size="lg">
              <Link href="/pricing">
                View Pro Plans
                <ExternalLink className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
