import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check } from 'lucide-react';
import { CREDIT_COSTS } from '@/config/pricing';
import { PricingCards } from './pricing-cards';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Choose the plan that works best for you',
};

export default function PricingPage() {
  return (
    <div className="py-20">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">Pricing</Badge>
          <h1 className="text-4xl font-bold mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Start free and upgrade as you grow. No hidden fees, cancel anytime.
          </p>
        </div>

        {/* Pricing Cards with billing toggle */}
        <PricingCards />

        <Separator className="my-16" />

        {/* Credit costs */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Credit Usage</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">What costs credits?</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span>View match prediction</span>
                    <Badge variant="secondary">{CREDIT_COSTS.VIEW_PREDICTION} credit</Badge>
                  </li>
                  <li className="flex justify-between">
                    <span>View detailed statistics</span>
                    <Badge variant="secondary">{CREDIT_COSTS.VIEW_DETAILED_STATS} credits</Badge>
                  </li>
                  <li className="flex justify-between">
                    <span>Generate AI ACCA</span>
                    <Badge variant="secondary">{CREDIT_COSTS.GENERATE_ACCA} credits</Badge>
                  </li>
                  <li className="flex justify-between">
                    <span>View value bet analysis</span>
                    <Badge variant="secondary">{CREDIT_COSTS.VIEW_VALUE_BET} credits</Badge>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">What&apos;s always free?</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Browse upcoming fixtures</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>View league standings</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Basic match information</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Daily credit refresh (+10/day)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Premier League predictions (Pro+)</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Can I cancel anytime?</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  Yes! You can cancel your subscription at any time. You&apos;ll continue
                  to have access until the end of your billing period.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Do credits roll over?</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  Credits reset at the start of each billing cycle. Daily bonus credits
                  must be claimed within 24 hours.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">What&apos;s the difference between Pro and Gold?</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  Pro gives you unlimited Premier League predictions at no credit cost, plus
                  100 credits and +10 daily for other leagues. Gold gives you unlimited
                  predictions across all 5 European leagues with no credit limits at all.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Can Free users access all leagues?</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  Yes! Free users can browse and unlock predictions for any league using credits.
                  You start with 100 credits and earn +10 daily. Upgrading to Pro or Gold gives
                  you free access to specific leagues without spending credits.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
