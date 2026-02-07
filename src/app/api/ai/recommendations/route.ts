import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
// import OpenAI from 'openai';

// Uncomment when ready to use OpenAI
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

interface RequestBody {
  riskLevel?: 'low' | 'medium' | 'high' | 'mixed';
  numSelections?: number;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: RequestBody = await request.json();
    const { riskLevel = 'mixed' } = body;
    // numSelections will be used when OpenAI integration is enabled

    // For now, return mock recommendations
    // In production, this would call OpenAI with real fixture data
    const mockRecommendations = generateMockRecommendations(riskLevel);

    // Uncomment below to use actual OpenAI integration
    // const recommendations = await generateAiRecommendations(riskLevel, numSelections);

    return NextResponse.json({ recommendations: mockRecommendations });
  } catch (error) {
    console.error('AI recommendations error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

function generateMockRecommendations(riskLevel: string) {
  const lowRiskAcca = {
    name: 'Safe Banker',
    description: 'Low-risk selections with high probability outcomes',
    risk: 'low' as const,
    expectedOdds: 3.25,
    selections: [
      {
        fixtureId: 1,
        homeTeam: 'Manchester City',
        awayTeam: 'Southampton',
        kickoff: new Date(Date.now() + 86400000).toISOString(),
        market: 'home' as const,
        selection: 'Manchester City to win',
        odds: 1.25,
        probability: 78,
        confidence: 85,
        reasoning: 'City dominant at home, Southampton struggling away',
      },
      {
        fixtureId: 2,
        homeTeam: 'Arsenal',
        awayTeam: 'Nottingham Forest',
        kickoff: new Date(Date.now() + 86400000).toISOString(),
        market: 'home' as const,
        selection: 'Arsenal to win',
        odds: 1.40,
        probability: 70,
        confidence: 80,
        reasoning: 'Arsenal strong at Emirates, Forest inconsistent',
      },
      {
        fixtureId: 3,
        homeTeam: 'Bayern Munich',
        awayTeam: 'Augsburg',
        kickoff: new Date(Date.now() + 172800000).toISOString(),
        market: 'over_2_5' as const,
        selection: 'Over 2.5 goals',
        odds: 1.45,
        probability: 68,
        confidence: 75,
        reasoning: 'Bayern averaging 3.2 goals at home',
      },
      {
        fixtureId: 4,
        homeTeam: 'Real Madrid',
        awayTeam: 'Getafe',
        kickoff: new Date(Date.now() + 172800000).toISOString(),
        market: 'home' as const,
        selection: 'Real Madrid to win',
        odds: 1.30,
        probability: 75,
        confidence: 82,
        reasoning: 'Madrid unbeaten at Bernabeu this season',
      },
    ],
  };

  const mediumRiskAcca = {
    name: 'Value Hunter',
    description: 'Balanced risk-reward with strong value opportunities',
    risk: 'medium' as const,
    expectedOdds: 8.50,
    selections: [
      {
        fixtureId: 5,
        homeTeam: 'Liverpool',
        awayTeam: 'Everton',
        kickoff: new Date(Date.now() + 86400000).toISOString(),
        market: 'btts_yes' as const,
        selection: 'Both teams to score',
        odds: 1.75,
        probability: 58,
        confidence: 70,
        reasoning: 'Derby matches typically high-scoring',
      },
      {
        fixtureId: 6,
        homeTeam: 'Chelsea',
        awayTeam: 'Crystal Palace',
        kickoff: new Date(Date.now() + 86400000).toISOString(),
        market: 'home' as const,
        selection: 'Chelsea to win',
        odds: 1.85,
        probability: 55,
        confidence: 65,
        reasoning: 'Chelsea improving under new system',
      },
      {
        fixtureId: 7,
        homeTeam: 'Inter Milan',
        awayTeam: 'Roma',
        kickoff: new Date(Date.now() + 172800000).toISOString(),
        market: 'over_2_5' as const,
        selection: 'Over 2.5 goals',
        odds: 1.90,
        probability: 52,
        confidence: 62,
        reasoning: 'Both teams attack-minded',
      },
      {
        fixtureId: 8,
        homeTeam: 'Atletico Madrid',
        awayTeam: 'Villarreal',
        kickoff: new Date(Date.now() + 172800000).toISOString(),
        market: 'home' as const,
        selection: 'Atletico Madrid to win',
        odds: 1.95,
        probability: 50,
        confidence: 60,
        reasoning: 'Strong home record, Villarreal inconsistent',
      },
    ],
  };

  const highRiskAcca = {
    name: 'Big Odds Chaser',
    description: 'Higher risk selections with potential for big returns',
    risk: 'high' as const,
    expectedOdds: 25.00,
    selections: [
      {
        fixtureId: 9,
        homeTeam: 'Aston Villa',
        awayTeam: 'Newcastle',
        kickoff: new Date(Date.now() + 86400000).toISOString(),
        market: 'draw' as const,
        selection: 'Draw',
        odds: 3.40,
        probability: 28,
        confidence: 45,
        reasoning: 'Evenly matched, both defensive',
      },
      {
        fixtureId: 10,
        homeTeam: 'Dortmund',
        awayTeam: 'RB Leipzig',
        kickoff: new Date(Date.now() + 172800000).toISOString(),
        market: 'away' as const,
        selection: 'RB Leipzig to win',
        odds: 2.80,
        probability: 32,
        confidence: 50,
        reasoning: 'Leipzig in strong form away',
      },
      {
        fixtureId: 11,
        homeTeam: 'Juventus',
        awayTeam: 'AC Milan',
        kickoff: new Date(Date.now() + 172800000).toISOString(),
        market: 'btts_yes' as const,
        selection: 'Both teams to score',
        odds: 1.95,
        probability: 48,
        confidence: 55,
        reasoning: 'Big match, both will attack',
      },
      {
        fixtureId: 12,
        homeTeam: 'Monaco',
        awayTeam: 'PSG',
        kickoff: new Date(Date.now() + 259200000).toISOString(),
        market: 'home' as const,
        selection: 'Monaco to win',
        odds: 3.80,
        probability: 25,
        confidence: 40,
        reasoning: 'Monaco strong at home, PSG sometimes complacent',
      },
    ],
  };

  if (riskLevel === 'low') return [lowRiskAcca];
  if (riskLevel === 'medium') return [mediumRiskAcca];
  if (riskLevel === 'high') return [highRiskAcca];

  return [lowRiskAcca, mediumRiskAcca, highRiskAcca];
}

// Uncomment to use actual OpenAI integration
/*
async function generateAiRecommendations(riskLevel: string, numSelections: number) {
  const prompt = `You are a football betting analyst. Generate ${numSelections} accumulator bet selections with ${riskLevel} risk level.

  For each selection, provide:
  - fixtureId (unique number)
  - homeTeam and awayTeam
  - kickoff (ISO date string, within next 7 days)
  - market (one of: home, draw, away, btts_yes, btts_no, over_2_5, under_2_5)
  - selection (human readable description)
  - odds (realistic decimal odds)
  - probability (percentage 0-100)
  - confidence (your confidence percentage 0-100)
  - reasoning (brief explanation)

  Return as JSON array.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  return JSON.parse(completion.choices[0].message.content || '[]');
}
*/
