import 'dotenv/config';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
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

interface Match {
  fixtureId: number;
  league: { id: number; name: string };
  homeTeam: { name: string };
  awayTeam: { name: string };
  kickoff: string;
}

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

// Load data
const matchesPath = join(gwDir, 'matches.json');
const predictionsPath = join(gwDir, 'predictions.json');
const resultsPath = join(gwDir, 'results.json');

if (!existsSync(matchesPath) || !existsSync(predictionsPath) || !existsSync(resultsPath)) {
  console.error(`Missing required files in ${gwDir}`);
  process.exit(1);
}

const matches: Match[] = JSON.parse(readFileSync(matchesPath, 'utf-8'));
const predictions: Prediction[] = JSON.parse(readFileSync(predictionsPath, 'utf-8'));
const results: Result[] = JSON.parse(readFileSync(resultsPath, 'utf-8'));

const resultMap = new Map(results.map((r) => [r.fixtureId, r]));

// Group by league
const byLeague = new Map<string, { match: Match; pred: Prediction; result: Result }[]>();
for (const pred of predictions) {
  const match = matches.find((m) => m.fixtureId === pred.fixtureId);
  const result = resultMap.get(pred.fixtureId);
  if (!match || !result || result.status !== 'finished') continue;

  const league = pred.league;
  if (!byLeague.has(league)) byLeague.set(league, []);
  byLeague.get(league)!.push({ match, pred, result });
}

function getActualOutcome(result: Result): string {
  if (result.homeGoals > result.awayGoals) return 'H';
  if (result.homeGoals < result.awayGoals) return 'A';
  return 'D';
}

function leagueSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Build overall stats
let totalPredictions = 0;
let correctOutcomes = 0;
let exactScores = 0;

const leagueStats: { league: string; total: number; correct: number; exact: number }[] = [];

for (const [league, entries] of byLeague) {
  let lCorrect = 0;
  let lExact = 0;

  for (const { pred, result } of entries) {
    const actual = getActualOutcome(result);
    const scoreStr = `${result.homeGoals}-${result.awayGoals}`;

    if (pred.prediction === actual) {
      correctOutcomes++;
      lCorrect++;
    }
    if (pred.predictedScore === scoreStr) {
      exactScores++;
      lExact++;
    }
    totalPredictions++;
  }

  leagueStats.push({ league, total: entries.length, correct: lCorrect, exact: lExact });
}

// Generate content
const lines: string[] = [];

lines.push(`Gameweek ${gwNumber} is in the books! Here's how our AI predictions performed across all leagues this round.`);
lines.push('');
lines.push('## Overall Performance');
lines.push('');
lines.push(`| Metric | Value |`);
lines.push(`|---|---|`);
lines.push(`| Total Predictions | ${totalPredictions} |`);
lines.push(`| Correct Results (H/D/A) | ${correctOutcomes} (${totalPredictions > 0 ? ((correctOutcomes / totalPredictions) * 100).toFixed(1) : 0}%) |`);
lines.push(`| Exact Scores | ${exactScores} (${totalPredictions > 0 ? ((exactScores / totalPredictions) * 100).toFixed(1) : 0}%) |`);
lines.push('');

// League breakdown
lines.push('## League Breakdown');
lines.push('');
lines.push('| League | Predictions | Correct | Accuracy | Exact Scores |');
lines.push('|---|---|---|---|---|');
for (const stat of leagueStats.sort((a, b) => (b.correct / b.total) - (a.correct / a.total))) {
  const acc = stat.total > 0 ? ((stat.correct / stat.total) * 100).toFixed(1) : '0.0';
  lines.push(`| ${stat.league} | ${stat.total} | ${stat.correct} | ${acc}% | ${stat.exact} |`);
}
lines.push('');

// Per-league match details
for (const [league, entries] of byLeague) {
  lines.push(`## ${league}`);
  lines.push('');
  lines.push('| Match | Predicted | Actual | Result |');
  lines.push('|---|---|---|---|');

  for (const { pred, result } of entries) {
    const actual = getActualOutcome(result);
    const scoreStr = `${result.homeGoals}-${result.awayGoals}`;
    const isCorrect = pred.prediction === actual;
    const isExact = pred.predictedScore === scoreStr;
    const emoji = isExact ? '🎯' : isCorrect ? '✅' : '❌';

    lines.push(`| ${pred.homeTeam} vs ${pred.awayTeam} | ${pred.predictedScore} (${pred.prediction}) | ${scoreStr} (${actual}) | ${emoji} |`);
  }
  lines.push('');
}

lines.push(`*Analysis by MyPredictify AI. Our model uses Elo ratings, Poisson distributions, and real-time market data.*`);

const content = lines.join('\n');
const slug = `gw${gwNumber}-results-review-${season}`;

const post = {
  slug,
  title: `GW${gwNumber} Results Review — ${season} Season`,
  description: `How our AI predictions performed in Gameweek ${gwNumber}: ${correctOutcomes}/${totalPredictions} correct results (${totalPredictions > 0 ? ((correctOutcomes / totalPredictions) * 100).toFixed(0) : 0}%), ${exactScores} exact scores.`,
  league: 'All Leagues',
  leagueId: 0,
  gameweek: gwNumber,
  season,
  publishedAt: new Date().toISOString(),
  content,
  keywords: [
    `gameweek ${gwNumber} results`,
    'prediction accuracy',
    'football predictions review',
    ...leagueStats.map((s) => `${s.league} results`),
  ],
  type: 'review',
};

const outPath = join(blogDir, `${slug}.json`);
writeFileSync(outPath, JSON.stringify(post, null, 2));
console.log(`✓ Review post generated: ${slug}.json`);
console.log(`  ${correctOutcomes}/${totalPredictions} correct (${totalPredictions > 0 ? ((correctOutcomes / totalPredictions) * 100).toFixed(1) : 0}%), ${exactScores} exact scores`);
