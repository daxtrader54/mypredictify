'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, TrendingUp, Target, Loader2, Plus, CalendarOff } from 'lucide-react';
import { useAccaStore, type AccaSelection } from '@/stores/acca-store';
import { useCredits } from '@/hooks/use-credits';
import { CREDIT_COSTS } from '@/config/pricing';
import type { AccaFixture } from '@/lib/acca';

interface AiSuggestion {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  market: 'home' | 'draw' | 'away' | 'btts_yes' | 'btts_no';
  selection: string;
  odds: number;
  probability: number;
  confidence: number;
  reasoning: string;
}

interface AiAcca {
  name: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
  expectedOdds: number;
  selections: AiSuggestion[];
}

interface AiRecommendationsProps {
  fixtures: AccaFixture[];
}

export function AiRecommendations({ fixtures }: AiRecommendationsProps) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<AiAcca[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { addSelection } = useAccaStore();
  const { deductCredits } = useCredits();

  const generateRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      // Deduct credits first
      const deducted = await deductCredits(CREDIT_COSTS.GENERATE_ACCA, 'AI ACCA generation');
      if (!deducted) {
        setError('Failed to deduct credits');
        return;
      }

      // Call AI API with real fixture data
      const response = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixtures }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate recommendations');
      }

      const data = await response.json();
      setRecommendations(data.recommendations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const addAllSelections = (acca: AiAcca) => {
    acca.selections.forEach((suggestion) => {
      const selection: AccaSelection = {
        fixtureId: suggestion.fixtureId,
        homeTeam: suggestion.homeTeam,
        awayTeam: suggestion.awayTeam,
        kickoff: suggestion.kickoff,
        market: suggestion.market,
        selection: suggestion.selection,
        odds: suggestion.odds,
        probability: suggestion.probability,
      };
      addSelection(selection);
    });
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-green-500/10 text-green-500';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'high':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  if (fixtures.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <CalendarOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Upcoming Fixtures</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              All current fixtures have kicked off. AI suggestions will be available when new gameweek predictions are generated.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recommendations && !loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Sparkles className="h-16 w-16 mx-auto text-primary mb-4" />
            <h3 className="font-semibold text-xl mb-2">AI-Powered ACCA Suggestions</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Let our AI analyze upcoming fixtures and generate smart accumulator bets
              based on form, statistics, and value.
            </p>
            <Button onClick={generateRecommendations} size="lg">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Suggestions ({CREDIT_COSTS.GENERATE_ACCA} credits)
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Analyzing Fixtures...</h3>
              <p className="text-muted-foreground text-sm">
                Our AI is analyzing form, head-to-head records, and statistics
              </p>
            </div>
          </CardContent>
        </Card>
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={generateRecommendations} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">AI Recommendations</h3>
        <Button onClick={generateRecommendations} variant="outline" size="sm">
          <Sparkles className="h-4 w-4 mr-1" />
          Regenerate ({CREDIT_COSTS.GENERATE_ACCA} credits)
        </Button>
      </div>

      {recommendations?.map((acca, index) => (
        <Card key={index}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {acca.risk === 'low' && <Target className="h-5 w-5 text-green-500" />}
                  {acca.risk === 'medium' && <TrendingUp className="h-5 w-5 text-yellow-500" />}
                  {acca.risk === 'high' && <Sparkles className="h-5 w-5 text-red-500" />}
                  {acca.name}
                </CardTitle>
                <CardDescription>{acca.description}</CardDescription>
              </div>
              <div className="text-right">
                <Badge className={getRiskColor(acca.risk)}>
                  {acca.risk.toUpperCase()} RISK
                </Badge>
                <p className="text-lg font-bold mt-1">{acca.expectedOdds.toFixed(2)}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {acca.selections.map((suggestion, sIndex) => (
                <div
                  key={sIndex}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {suggestion.homeTeam} vs {suggestion.awayTeam}
                    </p>
                    <p className="text-xs text-muted-foreground">{suggestion.selection}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{suggestion.odds.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {suggestion.confidence}% conf
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Button
              className="w-full mt-4"
              onClick={() => addAllSelections(acca)}
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add All to Bet Slip
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
