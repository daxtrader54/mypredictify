import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, Sparkles, Zap } from 'lucide-react';
import { PRICING_PLANS, ADD_ONS, formatPrice, CREDIT_COSTS } from '@/config/pricing';
import { SubscribeButton } from './subscribe-button';

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

        {/* Pricing Cards */}
        <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
          {PRICING_PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`relative flex flex-col ${
                plan.popular ? 'border-primary shadow-lg scale-105' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="text-center mb-6">
                  <span className="text-4xl font-bold">
                    {plan.price === 0 ? 'Free' : formatPrice(plan.price)}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-muted-foreground">/month</span>
                  )}
                  {plan.priceAnnual > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      or {formatPrice(plan.priceAnnual)}/year (save 16%)
                    </p>
                  )}
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {plan.price === 0 ? (
                  <Button asChild className="w-full" variant="outline">
                    <Link href="/login">Get Started Free</Link>
                  </Button>
                ) : (
                  <SubscribeButton
                    priceId={plan.stripePriceIdMonthly || ''}
                    popular={plan.popular}
                  />
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* API Add-on */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">
              <Zap className="h-3 w-3 mr-1" />
              Add-on
            </Badge>
            <h2 className="text-2xl font-bold">Need API Access?</h2>
            <p className="text-muted-foreground mt-2">
              Build custom integrations and automate your workflow
            </p>
          </div>

          {ADD_ONS.map((addon) => (
            <Card key={addon.id} className="bg-muted/30">
              <CardContent className="py-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{addon.name}</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      {addon.description}
                    </p>
                    <ul className="mt-4 grid gap-2 md:grid-cols-2">
                      {addon.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-center md:text-right">
                    <div className="text-3xl font-bold">{formatPrice(addon.price)}</div>
                    <div className="text-sm text-muted-foreground">/month</div>
                    <Button asChild className="mt-4">
                      <Link href="/login?addon=api">Add to Pro</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

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
                    <span>Daily credit refresh (Free plan)</span>
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
                  for free users must be claimed within 24 hours.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Can I add API access later?</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  Yes! API access is an optional add-on available to Pro subscribers.
                  You can add or remove it at any time from your dashboard.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
