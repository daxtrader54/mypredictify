import { Metadata } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import { predictionMarketPrices } from '@/lib/db/schema';
import { desc, sql } from 'drizzle-orm';
import { getAvailableGameweeks, GW_BASE_DIR } from '@/lib/gameweeks';
import { LEAGUES } from '@/config/leagues';
import { PolymarketContent } from './polymarket-content';

export const metadata: Metadata = {
  title: 'Markets — Polymarket Prediction Markets',
  description: 'Compare prediction market prices from Polymarket with bookmaker odds and our AI model predictions.',
};

export const dynamic = 'force-dynamic';

interface MatchData {
  fixtureId: number;
  league: { id: number; name: string };
  homeTeam: { id: number; name: string; shortCode?: string; logo?: string };
  awayTeam: { id: number; name: string; shortCode?: string; logo?: string };
  kickoff: string;
}

interface PredictionEntry {
  fixtureId: number;
  prediction: string;
  predictedScore: string;
  confidence: number;
  homeWinProb?: number;
  drawProb?: number;
  awayWinProb?: number;
  probabilities?: {
    home: number;
    draw: number;
    away: number;
  };
}

async function getPolymarketData() {
  // Load upcoming fixtures
  const gameweeks = await getAvailableGameweeks();
  const now = new Date();
  const allFixtures: MatchData[] = [];
  const predMap = new Map<number, PredictionEntry>();

  for (const gw of gameweeks) {
    const gwDir = path.join(GW_BASE_DIR, `GW${gw}`);
    try {
      const raw = await fs.readFile(path.join(gwDir, 'matches.json'), 'utf-8');
      const matches: MatchData[] = JSON.parse(raw);
      const upcoming = matches.filter((m) => new Date(m.kickoff) > now);
      allFixtures.push(...upcoming);

      // Load predictions
      try {
        const predRaw = await fs.readFile(path.join(gwDir, 'predictions.json'), 'utf-8');
        const preds: PredictionEntry[] = JSON.parse(predRaw);
        for (const p of preds) {
          if (!predMap.has(p.fixtureId)) {
            predMap.set(p.fixtureId, p);
          }
        }
      } catch {
        // no predictions file
      }
    } catch {
      continue;
    }
  }

  // Fetch latest Polymarket prices from DB
  let prices: Array<{
    fixtureId: number;
    homeWinProb: string;
    drawProb: string;
    awayWinProb: string;
    volume: string | null;
    liquidity: string | null;
    fetchedAt: Date;
  }> = [];

  try {
    prices = await db
      .select({
        fixtureId: predictionMarketPrices.fixtureId,
        homeWinProb: predictionMarketPrices.homeWinProb,
        drawProb: predictionMarketPrices.drawProb,
        awayWinProb: predictionMarketPrices.awayWinProb,
        volume: predictionMarketPrices.volume,
        liquidity: predictionMarketPrices.liquidity,
        fetchedAt: predictionMarketPrices.fetchedAt,
      })
      .from(predictionMarketPrices)
      .where(sql`${predictionMarketPrices.source} = 'polymarket'`)
      .orderBy(desc(predictionMarketPrices.fetchedAt));
  } catch {
    // DB error
  }

  // Deduplicate prices: latest per fixture
  const priceMap = new Map<number, (typeof prices)[0]>();
  for (const p of prices) {
    if (!priceMap.has(p.fixtureId)) {
      priceMap.set(p.fixtureId, p);
    }
  }

  // Build market entries
  const markets = allFixtures
    .filter((f) => priceMap.has(f.fixtureId))
    .map((f) => {
      const price = priceMap.get(f.fixtureId)!;
      const pred = predMap.get(f.fixtureId);

      return {
        fixtureId: f.fixtureId,
        homeTeam: f.homeTeam.name,
        awayTeam: f.awayTeam.name,
        kickoff: f.kickoff,
        leagueId: f.league.id,
        leagueName: f.league.name,
        polymarket: {
          homeWinProb: parseFloat(price.homeWinProb),
          drawProb: parseFloat(price.drawProb),
          awayWinProb: parseFloat(price.awayWinProb),
          volume: parseFloat(price.volume || '0'),
          liquidity: parseFloat(price.liquidity || '0'),
        },
        model: pred ? {
          homeWinProb: pred.homeWinProb ?? pred.probabilities?.home ?? 0,
          drawProb: pred.drawProb ?? pred.probabilities?.draw ?? 0,
          awayWinProb: pred.awayWinProb ?? pred.probabilities?.away ?? 0,
          prediction: pred.prediction,
          confidence: pred.confidence,
        } : null,
      };
    })
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());

  return { markets, leagues: LEAGUES };
}

export default async function PolymarketPage() {
  const { markets, leagues } = await getPolymarketData();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Prediction Markets</h1>
        <p className="text-sm text-muted-foreground">
          Compare Polymarket prices with bookmaker odds and our AI model. Spot value where markets disagree.
        </p>
      </div>
      <PolymarketContent markets={markets} leagues={leagues} />
    </div>
  );
}
