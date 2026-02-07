'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layers, Sparkles, Trash2, AlertCircle, TrendingUp, Target, Zap, Lightbulb } from 'lucide-react';
import { useAccaStore } from '@/stores/acca-store';
import { useCredits } from '@/hooks/use-credits';
import { CREDIT_COSTS } from '@/config/pricing';
import { FixtureSelector } from './fixture-selector';
import { BetSlip } from './bet-slip';
import { AiRecommendations } from './ai-recommendations';

export function AccaBuilderContent() {
  const { selections, clearSelections, getCombinedOdds, getCombinedProbability } = useAccaStore();
  const { credits } = useCredits();
  const [activeTab, setActiveTab] = useState('build');

  const combinedOdds = getCombinedOdds();
  const combinedProbability = getCombinedProbability();

  // Free tier: 3 ACCA/day limit (would need to track in DB)
  const canUseAi = credits >= CREDIT_COSTS.GENERATE_ACCA;

  return (
    <div className="space-y-6">
      {/* Header with gradient */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/15 via-purple-500/5 to-transparent p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge variant="outline" className="mb-3 border-purple-500/50 text-purple-400">
              <Layers className="w-3 h-3 mr-1" />
              Accumulator Builder
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
              ACCA Builder
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Build your accumulator bet with AI-powered recommendations. Select fixtures and let our ML models optimize your picks.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-base px-4 py-2 border-border/50 bg-background/50 backdrop-blur">
              <Target className="h-4 w-4 mr-2 text-purple-400" />
              {selections.length}/10 picks
            </Badge>
            {selections.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearSelections} className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-400">
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left side - Fixture selection */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-muted/50">
              <TabsTrigger value="build" className="data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2">
                <Layers className="h-4 w-4" />
                Build Your ACCA
              </TabsTrigger>
              <TabsTrigger value="ai" className="data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2">
                <Sparkles className="h-4 w-4" />
                AI Suggestions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="build" className="mt-4">
              <FixtureSelector />
            </TabsContent>

            <TabsContent value="ai" className="mt-4">
              {canUseAi ? (
                <AiRecommendations />
              ) : (
                <Card className="bg-gradient-to-br from-card to-card/50 border-border/50">
                  <CardContent className="py-12">
                    <div className="text-center">
                      <div className="h-16 w-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="h-8 w-8 text-yellow-500" />
                      </div>
                      <h3 className="font-semibold text-xl mb-2">Insufficient Credits</h3>
                      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                        AI ACCA generation costs {CREDIT_COSTS.GENERATE_ACCA} credits.
                        You currently have {credits} credits.
                      </p>
                      <Button asChild>
                        <a href="/pricing">Upgrade to Pro</a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right side - Bet slip */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-4">
            <BetSlip />

            {/* ACCA Stats */}
            {selections.length >= 2 && (
              <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    ACCA Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Combined Odds</span>
                    <span className="font-bold text-2xl text-green-500">
                      {combinedOdds.toFixed(2)}
                    </span>
                  </div>
                  <Separator className="bg-border/50" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Win Probability</span>
                    <div className="text-right">
                      <span className="font-bold text-lg">
                        {combinedProbability.toFixed(1)}%
                      </span>
                      <div className="w-24 h-1.5 bg-muted rounded-full mt-1">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${Math.min(combinedProbability, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <Separator className="bg-border/50" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Return (£10 stake)</span>
                    <span className="font-bold text-xl text-green-500">
                      £{(10 * combinedOdds).toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tips */}
            <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-blue-400" />
                  Pro Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <Zap className="h-3 w-3 mt-0.5 text-yellow-500 shrink-0" />
                    <span>Combine 3-5 selections for best value</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="h-3 w-3 mt-0.5 text-yellow-500 shrink-0" />
                    <span>Mix high and low probability bets</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="h-3 w-3 mt-0.5 text-yellow-500 shrink-0" />
                    <span>Check form and head-to-head stats</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="h-3 w-3 mt-0.5 text-yellow-500 shrink-0" />
                    <span>Use AI suggestions for data-driven picks</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
