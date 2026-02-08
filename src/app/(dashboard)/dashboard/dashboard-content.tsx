'use client';

import { useCredits } from '@/hooks/use-credits';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Coins, Crown, Gift, Target, TrendingUp, History, Layers, ArrowRight, Zap } from 'lucide-react';
import Link from 'next/link';
import type { User } from '@/lib/db/schema';
import { PRICING_PLANS, formatPrice } from '@/config/pricing';

interface DashboardContentProps {
  user: User;
}

export function DashboardContent({ user }: DashboardContentProps) {
  const { credits, tier, isPro, canRedeemDaily, redeemDailyCredits, loading } = useCredits();

  const currentPlan = PRICING_PLANS.find((p) => p.id === tier);
  const maxCredits = currentPlan?.credits || 100;
  const creditPercentage = Math.min((credits / maxCredits) * 100, 100);

  const handleRedeem = async () => {
    await redeemDailyCredits();
  };

  return (
    <div className="space-y-4">
      {/* Welcome header with gradient background */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-4 md:p-5">
        <div className="relative">
          <Badge variant="outline" className="mb-1 border-primary/50 text-primary">
            <Zap className="w-3 h-3 mr-1" />
            Dashboard
          </Badge>
          <h1 className="text-2xl font-bold">
            Welcome back, {user.name?.split(' ')[0] || 'User'}!
          </h1>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Credits card */}
        <Card className="bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-sm font-medium">Credits</CardTitle>
            <div className="h-6 w-6 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Coins className="h-3.5 w-3.5 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{credits.toLocaleString()}</div>
                <Progress value={creditPercentage} className="mt-3 h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {maxCredits.toLocaleString()} monthly limit
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Plan card */}
        <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Crown className="h-3.5 w-3.5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl font-bold capitalize">{tier}</span>
            </div>
            <Badge variant={isPro ? 'default' : 'secondary'} className="mb-2">
              {tier === 'free' ? 'Free Forever' : formatPrice(currentPlan?.price || 0) + '/mo'}
            </Badge>
            {tier === 'free' && (
              <Link href="/pricing" className="block">
                <Button variant="link" className="p-0 h-auto text-xs text-primary">
                  View Plans <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Daily reward card */}
        <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-sm font-medium">Daily Reward</CardTitle>
            <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center">
              <Gift className="h-3.5 w-3.5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            {tier === 'free' ? (
              canRedeemDaily ? (
                <>
                  <div className="text-2xl font-bold text-green-500">+10</div>
                  <Button onClick={handleRedeem} className="w-full mt-2" size="sm">
                    <Gift className="w-4 h-4 mr-2" />
                    Claim Now
                  </Button>
                </>
              ) : (
                <div>
                  <div className="text-2xl font-bold text-green-500">Claimed</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Come back tomorrow for more!
                  </p>
                </div>
              )
            ) : (
              <div>
                <div className="text-2xl font-bold">N/A</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Pro plans have monthly credits
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick stats */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Target className="h-3.5 w-3.5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-2">
              Predictions viewed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/predictions" className="group">
            <Card className="h-full bg-gradient-to-br from-card to-card/50 border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5">
              <CardHeader>
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base">Predictions</CardTitle>
                <CardDescription>
                  Browse upcoming match predictions
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/value-bets" className="group">
            <Card className="h-full bg-gradient-to-br from-card to-card/50 border-border/50 hover:border-green-500/50 transition-all hover:shadow-lg hover:shadow-green-500/5">
              <CardHeader>
                <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <CardTitle className="text-base">Value Bets</CardTitle>
                <CardDescription>
                  Find positive expected value bets
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/acca-builder" className="group">
            <Card className="h-full bg-gradient-to-br from-card to-card/50 border-border/50 hover:border-purple-500/50 transition-all hover:shadow-lg hover:shadow-purple-500/5">
              <CardHeader>
                <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Layers className="h-4 w-4 text-purple-500" />
                </div>
                <CardTitle className="text-base">ACCA Builder</CardTitle>
                <CardDescription>
                  Build accumulators with AI help
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/history" className="group">
            <Card className="h-full bg-gradient-to-br from-card to-card/50 border-border/50 hover:border-orange-500/50 transition-all hover:shadow-lg hover:shadow-orange-500/5">
              <CardHeader>
                <div className="h-9 w-9 rounded-lg bg-orange-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <History className="h-4 w-4 text-orange-500" />
                </div>
                <CardTitle className="text-base">History</CardTitle>
                <CardDescription>
                  View past predictions and ACCAs
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
