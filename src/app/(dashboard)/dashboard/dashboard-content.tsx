'use client';

import { useCredits } from '@/hooks/use-credits';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Coins, Crown, Gift, Target, Zap, ArrowRight, PartyPopper } from 'lucide-react';
import Link from 'next/link';
import type { User } from '@/lib/db/schema';
import { PRICING_PLANS, formatPrice } from '@/config/pricing';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DashboardContentProps {
  user: User;
  thisWeekPredictions?: number;
  justUpgraded?: boolean;
}

export function DashboardContent({ user, thisWeekPredictions = 0, justUpgraded = false }: DashboardContentProps) {
  const { credits, tier, isPro, canRedeemDaily, redeemDailyCredits, loading } = useCredits();

  const currentPlan = PRICING_PLANS.find((p) => p.id === tier);

  const handleRedeem = async () => {
    await redeemDailyCredits();
  };

  return (
    <>
    {justUpgraded && (
      <Alert className="border-green-500/50 bg-green-500/10 mb-4">
        <PartyPopper className="h-4 w-4 text-green-500" />
        <AlertDescription className="text-green-700 dark:text-green-400">
          Congratulations on upgrading to <span className="font-semibold capitalize">{tier}</span>! You now have access to all your new features.
        </AlertDescription>
      </Alert>
    )}
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-3 md:p-5">
      <div className="relative">
        {/* Top row: badge + greeting */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <Badge variant="outline" className="mb-1 border-primary/50 text-primary">
              <Zap className="w-3 h-3 mr-1" />
              Dashboard
            </Badge>
            <h1 className="text-xl font-bold">
              Welcome back, {user.name?.split(' ')[0] || 'User'}!
            </h1>
          </div>
        </div>

        {/* Inline stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 overflow-hidden">
          {/* Credits */}
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-muted-foreground">Credits</span>
              <Coins className="h-3 w-3 text-yellow-500" />
            </div>
            {loading ? (
              <Skeleton className="h-5 w-16" />
            ) : (
              <p className="text-lg font-bold leading-tight">{tier === 'gold' ? 'Unlimited' : credits.toLocaleString()}</p>
            )}
          </div>

          {/* Plan */}
          <div className="rounded-lg bg-primary/10 border border-primary/20 p-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-muted-foreground">Plan</span>
              <Crown className="h-3 w-3 text-primary" />
            </div>
            <div className="flex items-center gap-1.5">
              <p className="text-lg font-bold leading-tight capitalize">{tier}</p>
              {tier === 'free' && (
                <Link href="/pricing">
                  <ArrowRight className="w-3 h-3 text-primary" />
                </Link>
              )}
            </div>
          </div>

          {/* Daily Reward */}
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-muted-foreground">Daily Bonus</span>
              <Gift className="h-3 w-3 text-green-500" />
            </div>
            {tier === 'free' ? (
              canRedeemDaily ? (
                <Button onClick={handleRedeem} size="sm" className="h-6 text-xs px-2">
                  <Gift className="w-3 h-3 mr-1" />
                  Claim +10
                </Button>
              ) : (
                <p className="text-lg font-bold leading-tight text-green-500">Claimed</p>
              )
            ) : (
              <p className="text-sm font-medium text-muted-foreground leading-tight">
                {formatPrice(currentPlan?.price || 0)}/mo
              </p>
            )}
          </div>

          {/* This Week */}
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-muted-foreground">This Week</span>
              <Target className="h-3 w-3 text-blue-500" />
            </div>
            <p className="text-lg font-bold leading-tight">{thisWeekPredictions}</p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
