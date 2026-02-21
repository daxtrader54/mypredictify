/**
 * Polymarket Gamma API client
 *
 * Fetches prediction market prices for football match events.
 * Uses the public Gamma API (no authentication required).
 */

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com';

/** Polymarket tag IDs for supported football leagues (from /sports endpoint) */
export const POLYMARKET_TAGS: Record<number, number> = {
  8: 82,       // Premier League
  564: 780,    // La Liga
  82: 1494,    // Bundesliga
  301: 102070, // Ligue 1
  384: 101962, // Serie A
};

/** @deprecated Use POLYMARKET_TAGS instead */
export const POLYMARKET_SERIES = POLYMARKET_TAGS;

export interface PolymarketOutcome {
  outcome: string;      // e.g. "Yes"
  outcomePrices: string; // JSON string of price, e.g. "0.45"
}

export interface PolymarketMarket {
  id: string;
  question: string;        // e.g. "Will Manchester City win?"
  groupItemTitle?: string; // e.g. "Manchester City"
  outcomePrices: string;   // JSON array of prices, e.g. "[\"0.55\",\"0.45\"]"
  volume: string;
  liquidity: string;
  active: boolean;
  closed: boolean;
}

export interface PolymarketEvent {
  id: string;
  title: string;           // e.g. "Manchester City vs Arsenal"
  slug: string;
  startDate: string;
  endDate: string;
  markets: PolymarketMarket[];
  active: boolean;
  closed: boolean;
  volume: string;
  liquidity: string;
}

export interface MatchPrices {
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  volume: number;
  liquidity: number;
  eventId: string;
}

const RATE_LIMIT_MS = 300;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch events for a specific Polymarket league tag.
 */
export async function fetchSeriesEvents(tagId: number): Promise<PolymarketEvent[]> {
  const url = `${GAMMA_API_BASE}/events?tag_id=${tagId}&closed=false&active=true&limit=50`;

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Polymarket API error: ${response.status} ${response.statusText}`);
  }

  const events: PolymarketEvent[] = await response.json();
  return events;
}

/**
 * Fetch all active football events across all supported leagues.
 */
export async function fetchAllLeagueEvents(): Promise<Map<number, PolymarketEvent[]>> {
  const results = new Map<number, PolymarketEvent[]>();

  for (const [leagueIdStr, tagId] of Object.entries(POLYMARKET_TAGS)) {
    const leagueId = parseInt(leagueIdStr);
    try {
      const events = await fetchSeriesEvents(tagId);
      results.set(leagueId, events);
    } catch (error) {
      console.warn(`Failed to fetch Polymarket events for league ${leagueId}:`, error);
      results.set(leagueId, []);
    }
    await sleep(RATE_LIMIT_MS);
  }

  return results;
}

/**
 * Extract H/D/A probabilities from a Polymarket event's markets.
 *
 * Polymarket football events typically have 3 markets per match:
 * - "Home Win" / team name → home win probability
 * - "Draw" → draw probability
 * - "Away Win" / team name → away win probability
 *
 * Each market has outcomePrices like ["0.55","0.45"] where index 0 = "Yes" price.
 */
export function extractMatchPrices(event: PolymarketEvent): MatchPrices | null {
  if (!event.markets || event.markets.length === 0) return null;

  let homeProb = 0;
  let drawProb = 0;
  let awayProb = 0;
  let matched = 0;

  // Event title format: "Team A vs Team B" or "Team A v Team B"
  const titleParts = event.title.split(/\s+(?:vs?\.?|versus)\s+/i);
  const homeTeamHint = titleParts[0]?.trim().toLowerCase() || '';
  const awayTeamHint = titleParts[1]?.trim().toLowerCase() || '';

  for (const market of event.markets) {
    const question = market.question.toLowerCase();
    const groupTitle = (market.groupItemTitle || '').toLowerCase();

    let prices: number[];
    try {
      prices = JSON.parse(market.outcomePrices);
    } catch {
      continue;
    }

    // The "Yes" price (index 0) represents the probability of this outcome
    const yesPrice = prices[0] || 0;

    if (question.includes('draw') || groupTitle === 'draw') {
      drawProb = yesPrice;
      matched++;
    } else if (
      question.includes(homeTeamHint) ||
      groupTitle === homeTeamHint ||
      (matched === 0 && !question.includes('draw'))
    ) {
      // First non-draw market = home team
      if (homeProb === 0) {
        homeProb = yesPrice;
        matched++;
      } else if (awayProb === 0) {
        awayProb = yesPrice;
        matched++;
      }
    } else {
      // Remaining = away team
      if (awayProb === 0) {
        awayProb = yesPrice;
        matched++;
      } else if (homeProb === 0) {
        homeProb = yesPrice;
        matched++;
      }
    }
  }

  // Need at least 2 of 3 to be meaningful
  if (matched < 2) return null;

  // If one is missing, derive from the other two (must sum to ~1)
  const total = homeProb + drawProb + awayProb;
  if (total > 0 && total < 0.5) return null; // too low, probably bad data

  // Normalize to sum to 1.0
  const norm = total > 0 ? 1 / total : 1;
  homeProb *= norm;
  drawProb *= norm;
  awayProb *= norm;

  return {
    homeWinProb: Math.round(homeProb * 10000) / 10000,
    drawProb: Math.round(drawProb * 10000) / 10000,
    awayWinProb: Math.round(awayProb * 10000) / 10000,
    volume: parseFloat(event.volume) || 0,
    liquidity: parseFloat(event.liquidity) || 0,
    eventId: event.id,
  };
}
