import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import OpenAI from 'openai';
import type { AccaFixture } from '@/lib/acca';

export const maxDuration = 30;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type Market = 'home' | 'draw' | 'away' | 'btts_yes' | 'btts_no';

interface AiSelection {
  fixtureId: number;
  market: Market;
  reasoning: string;
}

interface AiResponse {
  recommendations: {
    name: string;
    description: string;
    risk: 'low' | 'medium' | 'high';
    selections: AiSelection[];
  }[];
}

interface RequestBody {
  fixtures?: AccaFixture[];
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: RequestBody = await request.json();
    const fixtures: AccaFixture[] = body.fixtures ?? [];

    if (fixtures.length === 0) {
      return NextResponse.json({
        recommendations: [],
        message: 'No upcoming fixtures available',
      });
    }

    // Try OpenAI first, fall back to programmatic
    let recommendations;
    try {
      recommendations = await generateAiRecommendations(fixtures);
    } catch (err) {
      console.error('OpenAI failed, using programmatic fallback:', err);
      recommendations = generateProgrammaticRecommendations(fixtures);
    }

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error('AI recommendations error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

async function generateAiRecommendations(fixtures: AccaFixture[]) {
  // Build compact fixture summary for the prompt
  const fixtureSummary = fixtures.map((f) => ({
    id: f.fixtureId,
    match: `${f.homeTeam} vs ${f.awayTeam}`,
    league: f.leagueName,
    kickoff: f.kickoff,
    odds: f.odds,
    modelProbs: {
      home: f.predictions.home,
      draw: f.predictions.draw,
      away: f.predictions.away,
      btts_yes: f.predictions.btts_yes,
      btts_no: f.predictions.btts_no,
    },
    confidence: f.confidence,
    predictedScore: f.predictedScore,
  }));

  const prompt = `You are a football betting analyst. Given these upcoming fixtures with model probabilities and bookmaker odds, create 3 accumulator recommendations at different risk levels.

FIXTURES:
${JSON.stringify(fixtureSummary, null, 2)}

Create exactly 3 ACCAs:
1. "Safe Banker" (low risk) — 3-4 selections, combined odds ~3-5x, pick highest confidence outcomes
2. "Value Hunter" (medium risk) — 3-5 selections, combined odds ~5-15x, find value where model disagrees with bookmakers
3. "Big Odds Chaser" (high risk) — 3-5 selections, combined odds ~15-50x, higher-risk picks with upside

RULES:
- Only use fixtureIds from the data provided
- Available markets: home, draw, away, btts_yes, btts_no
- Each fixture can appear at most once per ACCA
- For each selection, provide a short reasoning (1 sentence)
- Do NOT use the same selections across all 3 ACCAs — make them meaningfully different

Return JSON:
{
  "recommendations": [
    {
      "name": "Safe Banker",
      "description": "brief 1-line description",
      "risk": "low",
      "selections": [
        { "fixtureId": 12345, "market": "home", "reasoning": "..." }
      ]
    },
    ...
  ]
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 2000,
  }, { timeout: 20000 });

  const raw = JSON.parse(completion.choices[0].message.content || '{}') as AiResponse;

  // Validate and enrich — cross-reference AI output against real data
  return validateAndEnrich(raw, fixtures);
}

function validateAndEnrich(raw: AiResponse, fixtures: AccaFixture[]) {
  const fixtureMap = new Map(fixtures.map((f) => [f.fixtureId, f]));
  const validMarkets = new Set<Market>(['home', 'draw', 'away', 'btts_yes', 'btts_no']);

  return (raw.recommendations || []).map((acca) => {
    const enrichedSelections = (acca.selections || [])
      .filter((s) => fixtureMap.has(s.fixtureId) && validMarkets.has(s.market))
      .map((s) => {
        const f = fixtureMap.get(s.fixtureId)!;
        const odds = getOdds(f, s.market);
        const probability = f.predictions[s.market];
        return {
          fixtureId: s.fixtureId,
          homeTeam: f.homeTeam,
          awayTeam: f.awayTeam,
          kickoff: f.kickoff,
          market: s.market,
          selection: getLabel(f, s.market),
          odds,
          probability,
          confidence: f.confidence,
          reasoning: s.reasoning || '',
        };
      });

    const expectedOdds = enrichedSelections.reduce((acc, s) => acc * s.odds, 1);

    return {
      name: acca.name,
      description: acca.description,
      risk: acca.risk,
      expectedOdds: Math.round(expectedOdds * 100) / 100,
      selections: enrichedSelections,
    };
  }).filter((acca) => acca.selections.length >= 2); // discard ACCAs with <2 valid selections
}

function generateProgrammaticRecommendations(fixtures: AccaFixture[]) {
  // Sort by confidence descending for safe picks
  const byConfidence = [...fixtures].sort((a, b) => b.confidence - a.confidence);

  // Safe Banker: top 4 by confidence, pick the predicted outcome
  const safePicks = byConfidence.slice(0, 4).map((f) => {
    const market = getBestMarket(f);
    return buildSelection(f, market, 'High model confidence');
  });

  // Value Hunter: find value edges (model prob vs implied odds prob)
  const valueEdges: { fixture: AccaFixture; market: Market; edge: number }[] = [];
  for (const f of fixtures) {
    for (const market of ['home', 'draw', 'away'] as const) {
      const modelProb = f.predictions[market] / 100;
      const impliedProb = 1 / f.odds[market];
      const edge = modelProb - impliedProb;
      if (edge > 0.03) {
        valueEdges.push({ fixture: f, market, edge });
      }
    }
  }
  valueEdges.sort((a, b) => b.edge - a.edge);
  const usedForValue = new Set<number>();
  const valuePicks = valueEdges
    .filter((v) => {
      if (usedForValue.has(v.fixture.fixtureId)) return false;
      usedForValue.add(v.fixture.fixtureId);
      return true;
    })
    .slice(0, 4)
    .map((v) => buildSelection(v.fixture, v.market, `${Math.round(v.edge * 100)}% edge over bookmaker`));

  // Big Odds: pick draws and away wins for higher combined odds
  const longshots = fixtures
    .filter((f) => f.odds.draw >= 3.0 || f.odds.away >= 3.0)
    .slice(0, 4)
    .map((f) => {
      const market: Market = f.odds.away > f.odds.draw ? 'draw' : 'away';
      return buildSelection(f, market, 'Higher odds selection for big returns');
    });

  const accas = [];

  if (safePicks.length >= 2) {
    accas.push({
      name: 'Safe Banker',
      description: 'High-confidence selections from our prediction model',
      risk: 'low' as const,
      expectedOdds: Math.round(safePicks.reduce((a, s) => a * s.odds, 1) * 100) / 100,
      selections: safePicks,
    });
  }

  if (valuePicks.length >= 2) {
    accas.push({
      name: 'Value Hunter',
      description: 'Selections where our model finds edge over bookmaker odds',
      risk: 'medium' as const,
      expectedOdds: Math.round(valuePicks.reduce((a, s) => a * s.odds, 1) * 100) / 100,
      selections: valuePicks,
    });
  }

  if (longshots.length >= 2) {
    accas.push({
      name: 'Big Odds Chaser',
      description: 'Higher-risk selections with potential for large returns',
      risk: 'high' as const,
      expectedOdds: Math.round(longshots.reduce((a, s) => a * s.odds, 1) * 100) / 100,
      selections: longshots,
    });
  }

  return accas;
}

function getBestMarket(f: AccaFixture): Market {
  const probs = [
    { market: 'home' as Market, prob: f.predictions.home },
    { market: 'draw' as Market, prob: f.predictions.draw },
    { market: 'away' as Market, prob: f.predictions.away },
  ];
  probs.sort((a, b) => b.prob - a.prob);
  return probs[0].market;
}

function getOdds(f: AccaFixture, market: Market): number {
  if (market === 'home') return f.odds.home;
  if (market === 'draw') return f.odds.draw;
  if (market === 'away') return f.odds.away;
  // BTTS: derive fair odds from probability
  const prob = f.predictions[market];
  return prob > 0 ? Math.round((100 / prob) * 100) / 100 : 2.0;
}

function getLabel(f: AccaFixture, market: Market): string {
  switch (market) {
    case 'home': return `${f.homeTeam} to win`;
    case 'draw': return 'Draw';
    case 'away': return `${f.awayTeam} to win`;
    case 'btts_yes': return 'Both teams to score';
    case 'btts_no': return 'Both teams NOT to score';
  }
}

function buildSelection(f: AccaFixture, market: Market, reasoning: string) {
  return {
    fixtureId: f.fixtureId,
    homeTeam: f.homeTeam,
    awayTeam: f.awayTeam,
    kickoff: f.kickoff,
    market,
    selection: getLabel(f, market),
    odds: getOdds(f, market),
    probability: f.predictions[market],
    confidence: f.confidence,
    reasoning,
  };
}
