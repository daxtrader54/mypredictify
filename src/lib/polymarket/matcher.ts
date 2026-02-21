/**
 * Fuzzy match Polymarket event titles to MyPredictify fixture team names.
 *
 * Polymarket uses slightly different team naming conventions (e.g. "Man City"
 * vs "Manchester City"). This module normalizes and matches them.
 */

import type { PolymarketEvent } from './client';

/**
 * Common team name aliases mapping Polymarket names → SportMonks names.
 * Keys are lowercase normalized forms that Polymarket might use.
 */
const TEAM_ALIASES: Record<string, string> = {
  // Premier League
  'man city': 'manchester city',
  'man united': 'manchester united',
  'man utd': 'manchester united',
  'newcastle': 'newcastle united',
  'wolves': 'wolverhampton wanderers',
  'wolverhampton': 'wolverhampton wanderers',
  'brighton': 'brighton and hove albion',
  'brighton & hove albion': 'brighton and hove albion',
  'nottm forest': 'nottingham forest',
  "nott'm forest": 'nottingham forest',
  'nottingham': 'nottingham forest',
  'spurs': 'tottenham hotspur',
  'tottenham': 'tottenham hotspur',
  'west ham': 'west ham united',
  'leicester': 'leicester city',
  'ipswich': 'ipswich town',
  'luton': 'luton town',
  'sheffield utd': 'sheffield united',

  // La Liga
  'barca': 'fc barcelona',
  'barcelona': 'fc barcelona',
  'real madrid': 'real madrid',
  'atletico': 'atletico madrid',
  'atletico madrid': 'atletico madrid',
  'athletic': 'athletic club',
  'athletic bilbao': 'athletic club',
  'betis': 'real betis',
  'real sociedad': 'real sociedad',
  'villarreal': 'villarreal cf',
  'sevilla': 'sevilla fc',
  'celta': 'celta vigo',
  'celta de vigo': 'celta vigo',
  'mallorca': 'rcd mallorca',
  'osasuna': 'ca osasuna',
  'getafe': 'getafe cf',
  'alaves': 'deportivo alaves',
  'las palmas': 'ud las palmas',
  'rayo vallecano': 'rayo vallecano',
  'girona': 'girona fc',
  'espanyol': 'rcd espanyol',
  'real valladolid': 'real valladolid',
  'leganes': 'cd leganes',

  // Bundesliga
  'bayern': 'bayern munich',
  'bayern munchen': 'bayern munich',
  'fc bayern': 'bayern munich',
  'dortmund': 'borussia dortmund',
  'borussia dortmund': 'borussia dortmund',
  'bvb': 'borussia dortmund',
  'leverkusen': 'bayer leverkusen',
  'bayer 04': 'bayer leverkusen',
  'leipzig': 'rb leipzig',
  'gladbach': 'borussia monchengladbach',
  "m'gladbach": 'borussia monchengladbach',
  'monchengladbach': 'borussia monchengladbach',
  'frankfurt': 'eintracht frankfurt',
  'wolfsburg': 'vfl wolfsburg',
  'freiburg': 'sc freiburg',
  'stuttgart': 'vfb stuttgart',
  'hoffenheim': 'tsg hoffenheim',
  'mainz': 'fsv mainz 05',
  'mainz 05': 'fsv mainz 05',
  'augsburg': 'fc augsburg',
  'werder': 'werder bremen',
  'werder bremen': 'werder bremen',
  'union berlin': 'union berlin',
  'heidenheim': 'fc heidenheim',
  'bochum': 'vfl bochum',
  'st pauli': 'fc st pauli',
  'st. pauli': 'fc st pauli',
  'holstein kiel': 'holstein kiel',

  // Serie A
  'inter': 'inter milan',
  'inter milan': 'inter milan',
  'internazionale': 'inter milan',
  'ac milan': 'ac milan',
  'milan': 'ac milan',
  'juve': 'juventus',
  'juventus': 'juventus',
  'napoli': 'ssc napoli',
  'ssc napoli': 'ssc napoli',
  'roma': 'as roma',
  'as roma': 'as roma',
  'lazio': 'ss lazio',
  'ss lazio': 'ss lazio',
  'fiorentina': 'fiorentina',
  'atalanta': 'atalanta',
  'torino': 'torino fc',
  'bologna': 'bologna fc',
  'udinese': 'udinese calcio',
  'empoli': 'empoli fc',
  'cagliari': 'cagliari calcio',
  'genoa': 'genoa cfc',
  'parma': 'parma calcio 1913',
  'lecce': 'us lecce',
  'verona': 'hellas verona',
  'hellas verona': 'hellas verona',
  'monza': 'ac monza',
  'como': 'como 1907',
  'venezia': 'venezia fc',

  // Ligue 1
  'psg': 'paris saint-germain',
  'paris saint germain': 'paris saint-germain',
  'paris sg': 'paris saint-germain',
  'marseille': 'olympique marseille',
  'om': 'olympique marseille',
  'lyon': 'olympique lyonnais',
  'ol': 'olympique lyonnais',
  'monaco': 'as monaco',
  'lille': 'losc lille',
  'losc': 'losc lille',
  'nice': 'ogc nice',
  'lens': 'rc lens',
  'rennes': 'stade rennais',
  'stade rennais': 'stade rennais',
  'strasbourg': 'rc strasbourg',
  'nantes': 'fc nantes',
  'toulouse': 'toulouse fc',
  'montpellier': 'montpellier hsc',
  'reims': 'stade de reims',
  'brest': 'stade brestois',
  'le havre': 'le havre ac',
  'clermont': 'clermont foot',
  'auxerre': 'aj auxerre',
  'angers': 'angers sco',
  'saint-etienne': 'as saint-etienne',
  'st etienne': 'as saint-etienne',
};

/**
 * Normalize a team name for comparison:
 * - Lowercase
 * - Remove "FC", "CF", "SC", etc. suffixes/prefixes
 * - Remove accents
 * - Trim whitespace
 */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/\b(fc|cf|sc|ac|ssc|ss|as|rc|ca|cd|ud|rcd|vfl|vfb|fsv|tsg|ogc|rb|1\.\s*fc|losc)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolve a name to its canonical form using the alias map.
 */
function resolveAlias(name: string): string {
  const lower = name.toLowerCase().trim();
  if (TEAM_ALIASES[lower]) return TEAM_ALIASES[lower];

  const normalized = normalize(name);
  if (TEAM_ALIASES[normalized]) return TEAM_ALIASES[normalized];

  return normalized;
}

/**
 * Check if two team names match (fuzzy).
 */
function teamsMatch(polyName: string, fixtureName: string): boolean {
  const a = resolveAlias(polyName);
  const b = resolveAlias(fixtureName);

  // Exact match after normalization
  if (a === b) return true;

  // One contains the other
  if (a.includes(b) || b.includes(a)) return true;

  // Check without common suffixes
  const aNorm = normalize(a);
  const bNorm = normalize(b);
  if (aNorm === bNorm) return true;
  if (aNorm.includes(bNorm) || bNorm.includes(aNorm)) return true;

  return false;
}

export interface MatchedEvent {
  event: PolymarketEvent;
  fixtureId: number;
}

/**
 * Parse home/away team names from a Polymarket event title.
 * Expected formats: "Team A vs Team B", "Team A v Team B", "Team A versus Team B"
 */
function parseEventTeams(title: string): { home: string; away: string } | null {
  const parts = title.split(/\s+(?:vs?\.?|versus)\s+/i);
  if (parts.length !== 2) return null;
  return { home: parts[0].trim(), away: parts[1].trim() };
}

interface Fixture {
  fixtureId: number;
  homeTeam: { name: string; id?: number };
  awayTeam: { name: string; id?: number };
}

/**
 * Match Polymarket events to MyPredictify fixtures.
 * Returns matched events with their fixture IDs.
 */
export function matchEventsToFixtures(
  events: PolymarketEvent[],
  fixtures: Fixture[]
): MatchedEvent[] {
  const matched: MatchedEvent[] = [];

  for (const event of events) {
    const teams = parseEventTeams(event.title);
    if (!teams) continue;

    for (const fixture of fixtures) {
      const homeMatch = teamsMatch(teams.home, fixture.homeTeam.name);
      const awayMatch = teamsMatch(teams.away, fixture.awayTeam.name);

      if (homeMatch && awayMatch) {
        matched.push({ event, fixtureId: fixture.fixtureId });
        break;
      }
    }
  }

  return matched;
}
