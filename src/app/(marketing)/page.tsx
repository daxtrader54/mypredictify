import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Target,
  TrendingUp,
  Layers,
  Zap,
  BarChart3,
  ArrowRight,
  Check,
  Trophy,
  Sparkles,
} from 'lucide-react';
import { PricingCards } from './pricing/pricing-cards';
import { getSession } from '@/lib/auth/get-session';

export default async function HomePage() {
  const session = await getSession();
  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 lg:py-40 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:64px_64px]" />

        <div className="container relative">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="outline" className="mb-6 border-primary/50 text-primary">
              <Sparkles className="w-3 h-3 mr-1" />
              AI-Powered Predictions
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Smarter Football
              <span className="block text-primary mt-2">Predictions</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Machine learning predictions, value bet analysis, and AI-generated accumulators
              for the top European leagues. Make data-driven decisions.
            </p>
            <div className="mt-10 flex items-center justify-center">
              <Button asChild size="lg" className="text-base px-10 h-13 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/25">
                <Link href="/predictions">
                  View Predictions
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                100 free credits
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                No credit card required
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                +10 daily bonus
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-12 border-y border-border/50 bg-muted/20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        <div className="container relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">5</div>
              <div className="text-sm text-muted-foreground mt-1">Top Leagues</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">98</div>
              <div className="text-sm text-muted-foreground mt-1">Teams Covered</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">68%</div>
              <div className="text-sm text-muted-foreground mt-1">Avg Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">24/7</div>
              <div className="text-sm text-muted-foreground mt-1">Live Updates</div>
            </div>
          </div>
        </div>
      </section>

      {/* Leagues */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_25%,rgba(var(--primary-rgb,34,197,94),0.03)_25%,rgba(var(--primary-rgb,34,197,94),0.03)_50%,transparent_50%,transparent_75%,rgba(var(--primary-rgb,34,197,94),0.03)_75%)] bg-[length:40px_40px]" />
        <div className="container relative">
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-12 opacity-60">
            <span className="text-lg font-semibold">Premier League</span>
            <span className="text-lg font-semibold">La Liga</span>
            <span className="text-lg font-semibold">Bundesliga</span>
            <span className="text-lg font-semibold">Serie A</span>
            <span className="text-lg font-semibold">Ligue 1</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-20 right-10 w-72 h-72 rounded-full bg-primary/3 blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 rounded-full bg-purple-500/3 blur-3xl" />
        <div className="container relative">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              Everything You Need
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              Professional-grade tools powered by machine learning and AI
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-gradient-to-br from-card to-card/50 border-border/50 hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Match Predictions</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  ML-powered predictions for match outcomes with win probabilities,
                  BTTS, and over/under analysis.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-card/50 border-border/50 hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Value Bets</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Identify opportunities where bookmaker odds offer positive
                  expected value compared to our predictions.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-card/50 border-border/50 hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                  <Layers className="h-6 w-6 text-purple-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">ACCA Builder</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Build accumulators with AI assistance. Get smart recommendations
                  with risk analysis and combined odds.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-card/50 border-border/50 hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-yellow-500/10 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-yellow-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Real-Time Data</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Predictions update as new data becomes available.
                  Stay ahead with the latest insights.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-card/50 border-border/50 hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Deep Statistics</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Team stats, head-to-head records, form analysis,
                  and key performance metrics.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-card/50 border-border/50 hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-orange-500/10 flex items-center justify-center mb-4">
                  <Trophy className="h-6 w-6 text-orange-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Track Record</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  View prediction history and accuracy stats.
                  Full transparency on our performance.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-20 md:py-28 bg-muted/30 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent" />
        <div className="container relative">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Simple Process</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              How It Works
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                1
              </div>
              <h3 className="font-semibold text-lg mb-2">Sign Up Free</h3>
              <p className="text-muted-foreground text-sm">
                Create your account with Google. Get 100 credits instantly.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                2
              </div>
              <h3 className="font-semibold text-lg mb-2">Browse Predictions</h3>
              <p className="text-muted-foreground text-sm">
                View AI predictions for upcoming matches across all leagues.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                3
              </div>
              <h3 className="font-semibold text-lg mb-2">Make Better Bets</h3>
              <p className="text-muted-foreground text-sm">
                Use data-driven insights to make informed decisions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Credits Explanation */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        <div className="container relative">
          <div className="text-center mb-10">
            <Badge variant="secondary" className="mb-4">Credits</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              How Credits Work
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              Start with 100 free credits and earn 10 more every day. Use them to unlock predictions, stats, and value bets.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto text-center">
            <div className="rounded-xl bg-muted/50 border border-border/50 p-4">
              <p className="text-2xl font-bold text-primary">1</p>
              <p className="text-sm text-muted-foreground mt-1">View prediction</p>
            </div>
            <div className="rounded-xl bg-muted/50 border border-border/50 p-4">
              <p className="text-2xl font-bold text-primary">2</p>
              <p className="text-sm text-muted-foreground mt-1">Value bet</p>
            </div>
            <div className="rounded-xl bg-muted/50 border border-border/50 p-4">
              <p className="text-2xl font-bold text-primary">3</p>
              <p className="text-sm text-muted-foreground mt-1">Detailed stats</p>
            </div>
            <div className="rounded-xl bg-muted/50 border border-border/50 p-4">
              <p className="text-2xl font-bold text-primary">5</p>
              <p className="text-sm text-muted-foreground mt-1">Generate ACCA</p>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Pro and Gold plans include unlimited predictions for their included leagues — no credits needed.
          </p>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,_var(--tw-gradient-stops))] from-yellow-500/5 via-transparent to-transparent" />
        <div className="container relative">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Pricing</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground mt-4">
              Start free, upgrade when you need more
            </p>
          </div>

          <PricingCards />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="relative rounded-2xl bg-gradient-to-br from-green-600/20 via-green-600/10 to-transparent p-8 md:p-16 text-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-500/10 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px]" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Start Winning?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Join thousands of users making smarter betting decisions with AI-powered predictions.
              </p>
              <Button asChild size="lg" className="text-base px-10 h-13 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/25">
                <Link href="/predictions">
                  View Predictions
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
