'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles } from 'lucide-react';
import { PRICING_PLANS, formatPrice } from '@/config/pricing';
import { SubscribeButton } from './subscribe-button';

export function PricingCards() {
  const [annual, setAnnual] = useState(false);

  return (
    <div>
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 mb-10">
        <span className={`text-sm font-medium ${!annual ? 'text-foreground' : 'text-muted-foreground'}`}>
          Monthly
        </span>
        <button
          onClick={() => setAnnual(!annual)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            annual ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
              annual ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className={`text-sm font-medium ${annual ? 'text-foreground' : 'text-muted-foreground'}`}>
          Annual
        </span>
        {annual && (
          <Badge variant="secondary" className="text-xs">Save up to 30%</Badge>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
        {PRICING_PLANS.map((plan) => {
          const displayPrice = annual && plan.priceAnnual > 0
            ? Math.round(plan.priceAnnual / 12)
            : plan.price;
          const priceId = annual
            ? plan.stripePriceIdAnnual
            : plan.stripePriceIdMonthly;

          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col ${
                plan.popular ? 'border-primary shadow-lg scale-[1.03]' : ''
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
                    {plan.price === 0 ? 'Free' : formatPrice(displayPrice)}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-muted-foreground">/mo</span>
                  )}
                  {annual && plan.priceAnnual > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatPrice(plan.priceAnnual)} billed annually
                    </p>
                  )}
                  {!annual && plan.priceAnnual > 0 && (
                    <p className="text-sm text-primary/80 mt-1">
                      Save with annual billing
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
                    priceId={priceId || ''}
                    popular={plan.popular}
                  />
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
