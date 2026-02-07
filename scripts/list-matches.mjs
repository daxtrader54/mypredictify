import { readFileSync } from 'fs';
const d = JSON.parse(readFileSync(process.argv[2] || 'data/gameweeks/2025-26/GW25/matches.json', 'utf8'));
const byLeague = {};
d.forEach(m => {
  const l = m.league.name;
  if (!byLeague[l]) byLeague[l] = [];
  byLeague[l].push(m);
});
Object.entries(byLeague).forEach(([l, ms]) => {
  console.log(`\n=== ${l} (${ms.length} matches) ===`);
  ms.forEach(m => {
    const hOdds = m.odds.home || '?';
    const dOdds = m.odds.draw || '?';
    const aOdds = m.odds.away || '?';
    const hPos = m.standings.home?.position || '?';
    const aPos = m.standings.away?.position || '?';
    console.log(`  ${m.homeTeam.name} vs ${m.awayTeam.name} | H:${hOdds} D:${dOdds} A:${aOdds} | #${hPos} v #${aPos}`);
  });
});
