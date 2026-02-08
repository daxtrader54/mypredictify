import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as schema from '../src/lib/db/schema';

const SPORTMONKS_BASE = 'https://api.sportmonks.com/v3/football';

interface League {
  id: number;
  name: string;
  seasonId: number;
}

const LEAGUES: League[] = [
  { id: 8, name: 'Premier League', seasonId: 25583 },
  { id: 564, name: 'La Liga', seasonId: 25659 },
  { id: 82, name: 'Bundesliga', seasonId: 25646 },
  { id: 384, name: 'Serie A', seasonId: 25533 },
  { id: 301, name: 'Ligue 1', seasonId: 25651 },
];

async function fetchStandings(seasonId: number) {
  const token = process.env.SPORTMONKS_API_TOKEN;
  if (!token) throw new Error('SPORTMONKS_API_TOKEN required');

  const url = `${SPORTMONKS_BASE}/standings/seasons/${seasonId}?api_token=${token}&include=participant;details.type`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  const json = await response.json();
  return json.data as Array<{
    position: number;
    points: number;
    participant?: { id: number; name: string; image_path?: string };
    details?: Array<{ type?: { code?: string }; value: number }>;
  }>;
}

function getDetail(details: Array<{ type?: { code?: string }; value: number }>, code: string): number {
  return details?.find((d) => d.type?.code === code)?.value ?? 0;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL or POSTGRES_URL required');

  const sql = neon(databaseUrl);
  const db = drizzle(sql, { schema });

  for (const league of LEAGUES) {
    console.log(`Syncing ${league.name} (season ${league.seasonId})...`);
    try {
      const standings = await fetchStandings(league.seasonId);
      if (!standings || standings.length === 0) {
        console.log(`  No standings data for ${league.name}`);
        continue;
      }

      // Delete old rows for this league
      await db.delete(schema.leagueStandings).where(
        eq(schema.leagueStandings.leagueId, league.id)
      );

      // Insert fresh rows
      const rows = standings.map((s) => {
        const details = (s.details ?? []) as Array<{ type?: { code?: string }; value: number }>;
        const gf = getDetail(details, 'goals-for');
        const ga = getDetail(details, 'goals-against');
        return {
          leagueId: league.id,
          seasonId: league.seasonId,
          position: s.position,
          teamId: s.participant?.id ?? 0,
          teamName: s.participant?.name ?? 'Unknown',
          teamLogo: s.participant?.image_path ?? null,
          played: getDetail(details, 'matches-played') || getDetail(details, 'overall-matches-played'),
          won: getDetail(details, 'won') || getDetail(details, 'overall-won'),
          drawn: getDetail(details, 'draw') || getDetail(details, 'overall-draw'),
          lost: getDetail(details, 'lost') || getDetail(details, 'overall-lost'),
          goalsFor: gf,
          goalsAgainst: ga,
          goalDifference: gf - ga,
          points: s.points,
        };
      });

      await db.insert(schema.leagueStandings).values(rows);
      console.log(`  ✓ ${rows.length} teams synced`);
    } catch (err) {
      console.error(`  ✗ Error syncing ${league.name}:`, err);
    }
  }

  console.log('Done.');
}

main().catch(console.error);
