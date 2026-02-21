#!/usr/bin/env tsx
/**
 * Export latest Polymarket prices from DB to JSON for pipeline consumption.
 *
 * Writes data/memory/polymarket-prices.json with the latest price snapshot
 * per fixture from the predictionMarketPrices table.
 *
 * Usage: npx tsx scripts/export-polymarket-prices.ts
 */

import 'dotenv/config';
import pg from 'pg';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
  console.log('No DATABASE_URL — skipping Polymarket price export');
  process.exit(0);
}

interface PriceRow {
  fixture_id: number;
  source: string;
  home_win_prob: string;
  draw_prob: string;
  away_win_prob: string;
  volume: string | null;
  liquidity: string | null;
  external_event_id: string | null;
  fetched_at: string;
}

async function main() {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 2 });

  try {
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'predictify' AND table_name = 'prediction_market_prices'
      ) as exists
    `);

    if (!tableCheck.rows[0]?.exists) {
      console.log('prediction_market_prices table does not exist — writing empty file');
      const outPath = join(root, 'data', 'memory', 'polymarket-prices.json');
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, JSON.stringify({ prices: {}, exportedAt: new Date().toISOString() }, null, 2));
      return;
    }

    // Get latest price per fixture (most recent fetched_at)
    const result = await pool.query<PriceRow>(`
      SELECT DISTINCT ON (fixture_id)
        fixture_id, source, home_win_prob, draw_prob, away_win_prob,
        volume, liquidity, external_event_id, fetched_at
      FROM predictify.prediction_market_prices
      WHERE source = 'polymarket'
      ORDER BY fixture_id, fetched_at DESC
    `);

    const prices: Record<number, {
      homeWinProb: number;
      drawProb: number;
      awayWinProb: number;
      volume: number;
      liquidity: number;
      fetchedAt: string;
    }> = {};

    for (const row of result.rows) {
      prices[row.fixture_id] = {
        homeWinProb: parseFloat(row.home_win_prob),
        drawProb: parseFloat(row.draw_prob),
        awayWinProb: parseFloat(row.away_win_prob),
        volume: parseFloat(row.volume || '0'),
        liquidity: parseFloat(row.liquidity || '0'),
        fetchedAt: row.fetched_at,
      };
    }

    const outPath = join(root, 'data', 'memory', 'polymarket-prices.json');
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, JSON.stringify({
      prices,
      count: Object.keys(prices).length,
      exportedAt: new Date().toISOString(),
    }, null, 2));

    console.log(`Exported ${Object.keys(prices).length} Polymarket prices → ${outPath}`);
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('Failed to export Polymarket prices:', err);
  process.exit(1);
});
