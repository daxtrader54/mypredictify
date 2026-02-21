import 'dotenv/config';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Parse CLI args
const args = process.argv.slice(2);
let gw = 'GW25';
let season = process.env.SEASON || '2025-26';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--gw' && args[i + 1]) gw = args[++i];
  if (args[i] === '--season' && args[i + 1]) season = args[++i];
}

const gwNumber = parseInt(gw.replace('GW', ''));
const gwDir = join(root, 'data', 'gameweeks', season, gw);
const blogDir = join(root, 'data', 'blog');

if (!existsSync(blogDir)) mkdirSync(blogDir, { recursive: true });

interface Prediction {
  fixtureId: number;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  predictedScore: string;
  prediction: string;
  confidence: number;
}

interface Result {
  fixtureId: number;
  homeGoals: number;
  awayGoals: number;
  status: string;
}

// Check if all required files exist
const predictionsPath = join(gwDir, 'predictions.json');
const resultsPath = join(gwDir, 'results.json');

if (!existsSync(predictionsPath) || !existsSync(resultsPath)) {
  console.error(`Missing predictions or results in ${gwDir}`);
  process.exit(1);
}

const predictions: Prediction[] = JSON.parse(readFileSync(predictionsPath, 'utf-8'));
const results: Result[] = JSON.parse(readFileSync(resultsPath, 'utf-8'));
const resultMap = new Map(results.map((r) => [r.fixtureId, r]));

function getActualOutcome(result: Result): string {
  if (result.homeGoals > result.awayGoals) return 'H';
  if (result.homeGoals < result.awayGoals) return 'A';
  return 'D';
}

// Compute stats
const leagueStats = new Map<string, {
  total: number;
  correct: number;
  exact: number;
  bestPick?: { teams: string; pred: string; actual: string; score: string };
  worstMiss?: { teams: string; pred: string; actual: string; score: string };
}>();

for (const pred of predictions) {
  const result = resultMap.get(pred.fixtureId);
  if (!result || result.status !== 'finished') continue;

  const league = pred.league;
  if (!leagueStats.has(league)) {
    leagueStats.set(league, { total: 0, correct: 0, exact: 0 });
  }

  const stat = leagueStats.get(league)!;
  stat.total++;

  const actual = getActualOutcome(result);
  const scoreStr = `${result.homeGoals}-${result.awayGoals}`;
  const isCorrect = pred.prediction === actual;
  const isExact = pred.predictedScore === scoreStr;

  if (isCorrect) stat.correct++;
  if (isExact) {
    stat.exact++;
    if (!stat.bestPick || pred.confidence > 0.5) {
      stat.bestPick = { teams: `${pred.homeTeam} vs ${pred.awayTeam}`, pred: pred.predictedScore, actual: scoreStr, score: scoreStr };
    }
  }

  if (!isCorrect && pred.confidence > 0.5 && !stat.worstMiss) {
    stat.worstMiss = { teams: `${pred.homeTeam} vs ${pred.awayTeam}`, pred: `${pred.prediction} (${pred.predictedScore})`, actual: `${actual} (${scoreStr})`, score: scoreStr };
  }
}

// Also check historical trend (last 3 GWs)
const baseDir = join(root, 'data', 'gameweeks', season);
const gwDirs = existsSync(baseDir)
  ? readdirSync(baseDir)
      .filter((d) => d.startsWith('GW'))
      .map((d) => parseInt(d.replace('GW', '')))
      .sort((a, b) => b - a)
      .slice(0, 5)
  : [];

const historicalAcc: { gw: number; accuracy: number }[] = [];
for (const gwN of gwDirs) {
  try {
    const preds: Prediction[] = JSON.parse(readFileSync(join(baseDir, `GW${gwN}`, 'predictions.json'), 'utf-8'));
    const res: Result[] = JSON.parse(readFileSync(join(baseDir, `GW${gwN}`, 'results.json'), 'utf-8'));
    const resMap = new Map(res.map((r) => [r.fixtureId, r]));

    let total = 0;
    let correct = 0;
    for (const p of preds) {
      const r = resMap.get(p.fixtureId);
      if (!r || r.status !== 'finished') continue;
      total++;
      if (p.prediction === getActualOutcome(r)) correct++;
    }
    if (total > 0) historicalAcc.push({ gw: gwN, accuracy: correct / total });
  } catch {
    continue;
  }
}

// Generate content
const lines: string[] = [];
let totalAll = 0;
let correctAll = 0;
let exactAll = 0;

for (const [, stat] of leagueStats) {
  totalAll += stat.total;
  correctAll += stat.correct;
  exactAll += stat.exact;
}

const overallAcc = totalAll > 0 ? ((correctAll / totalAll) * 100).toFixed(1) : '0.0';

lines.push(`# Gameweek ${gwNumber} Weekly Roundup`);
lines.push('');
lines.push(`Another round of European football is complete. Here's a cross-league summary of how our AI model performed across all five leagues in Gameweek ${gwNumber}.`);
lines.push('');
lines.push('## The Numbers');
lines.push('');
lines.push(`- **${totalAll}** matches predicted across **${leagueStats.size}** leagues`);
lines.push(`- **${overallAcc}%** overall result accuracy (${correctAll}/${totalAll})`);
lines.push(`- **${exactAll}** exact score predictions`);
lines.push('');

// League rankings
const ranked = Array.from(leagueStats.entries())
  .map(([league, stat]) => ({ league, ...stat, accuracy: stat.total > 0 ? stat.correct / stat.total : 0 }))
  .sort((a, b) => b.accuracy - a.accuracy);

lines.push('## League Rankings');
lines.push('');
lines.push('| # | League | Accuracy | Correct | Exact |');
lines.push('|---|---|---|---|---|');
ranked.forEach((stat, i) => {
  lines.push(`| ${i + 1} | ${stat.league} | ${(stat.accuracy * 100).toFixed(1)}% | ${stat.correct}/${stat.total} | ${stat.exact} |`);
});
lines.push('');

// Highlights
const bestLeague = ranked[0];
const worstLeague = ranked[ranked.length - 1];

lines.push('## Highlights');
lines.push('');
if (bestLeague) {
  lines.push(`**Best League:** ${bestLeague.league} at ${(bestLeague.accuracy * 100).toFixed(0)}% accuracy`);
  if (bestLeague.bestPick) {
    lines.push(`  - Star pick: ${bestLeague.bestPick.teams} — predicted ${bestLeague.bestPick.pred}, got ${bestLeague.bestPick.actual}`);
  }
  lines.push('');
}
if (worstLeague && worstLeague !== bestLeague) {
  lines.push(`**Toughest League:** ${worstLeague.league} at ${(worstLeague.accuracy * 100).toFixed(0)}% accuracy`);
  if (worstLeague.worstMiss) {
    lines.push(`  - Biggest miss: ${worstLeague.worstMiss.teams} — predicted ${worstLeague.worstMiss.pred}, actual ${worstLeague.worstMiss.actual}`);
  }
  lines.push('');
}

// Trend
if (historicalAcc.length >= 2) {
  lines.push('## Accuracy Trend');
  lines.push('');
  lines.push('| Gameweek | Accuracy |');
  lines.push('|---|---|');
  for (const h of historicalAcc) {
    lines.push(`| GW${h.gw} | ${(h.accuracy * 100).toFixed(1)}% |`);
  }
  lines.push('');
}

lines.push(`*Weekly roundup by MyPredictify. Predictions use Elo ratings, Poisson models, and real-time market data across Europe's top 5 leagues.*`);

const content = lines.join('\n');
const slug = `gw${gwNumber}-weekly-roundup-${season}`;

const post = {
  slug,
  title: `GW${gwNumber} Weekly Roundup — ${season} Season`,
  description: `Cross-league weekly summary: ${overallAcc}% accuracy across ${totalAll} predictions, ${exactAll} exact scores. ${bestLeague?.league} leads the pack.`,
  league: 'All Leagues',
  leagueId: 0,
  gameweek: gwNumber,
  season,
  publishedAt: new Date().toISOString(),
  content,
  keywords: [
    `gameweek ${gwNumber} roundup`,
    'weekly football roundup',
    'prediction accuracy',
    'cross-league analysis',
    ...ranked.map((s) => `${s.league} GW${gwNumber}`),
  ],
  type: 'weekly-roundup',
};

const outPath = join(blogDir, `${slug}.json`);
writeFileSync(outPath, JSON.stringify(post, null, 2));
console.log(`✓ Weekly roundup generated: ${slug}.json`);
console.log(`  ${correctAll}/${totalAll} correct (${overallAcc}%), ${exactAll} exact scores`);
