import Link from 'next/link';
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

export default function HomePage() {
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
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="text-base px-8 h-12">
                <Link href="/login">
                  Start Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-base px-8 h-12">
                <Link href="/predictions">View Predictions</Link>
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
      <section className="py-12 border-y border-border/50 bg-muted/20">
        <div className="container">
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
      <section className="py-16">
        <div className="container">
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
      <section className="py-20 md:py-28">
        <div className="container">
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
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container">
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

      {/* Pricing Preview */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Pricing</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground mt-4">
              Start free, upgrade when you need more
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 max-w-3xl mx-auto">
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="text-center mb-6">
                  <h3 className="font-semibold text-lg">Free</h3>
                  <div className="text-4xl font-bold mt-2">$0</div>
                  <p className="text-muted-foreground text-sm mt-1">Forever free</p>
                </div>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    100 credits/month + 10/day
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Premier League predictions
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    3 ACCA generations/day
                  </li>
                </ul>
                <Button asChild variant="outline" className="w-full mt-6">
                  <Link href="/login">Get Started</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-primary relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">Popular</Badge>
              </div>
              <CardContent className="pt-6">
                <div className="text-center mb-6">
                  <h3 className="font-semibold text-lg">Pro</h3>
                  <div className="text-4xl font-bold mt-2">$19</div>
                  <p className="text-muted-foreground text-sm mt-1">per month</p>
                </div>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    1,000 credits/month
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    All 5 leagues
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Unlimited ACCA generations
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Value bet alerts
                  </li>
                </ul>
                <Button asChild className="w-full mt-6">
                  <Link href="/pricing">View Plans</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="relative rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8 md:p-16 text-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Start Winning?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Join thousands of users making smarter betting decisions with AI-powered predictions.
              </p>
              <Button asChild size="lg" className="text-base px-8 h-12">
                <Link href="/login">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
