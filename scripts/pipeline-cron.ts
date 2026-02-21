#!/usr/bin/env tsx
/**
 * Smart Pipeline Orchestrator
 *
 * Detects which gameweeks need prediction or evaluation and runs
 * the appropriate pipeline steps automatically.
 *
 * Usage:
 *   npx tsx scripts/pipeline-cron.ts [--dry-run] [--season 2025-26]
 *
 * Evaluate first (oldest→newest), then predict — so Elo ratings are
 * fresh before generating new predictions.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const seasonIdx = args.indexOf('--season');
const season = seasonIdx !== -1 && args[seasonIdx + 1] ? args[seasonIdx + 1] : process.env.SEASON || '2025-26';

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data', 'gameweeks', season);
const STATUS_FILE = path.join(ROOT, 'pipeline-status.json');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Match {
  fixtureId: number;
  kickoff: string; // "2026-02-10 19:30:00"
  league?: { id: number; name: string };
  [key: string]: unknown;
}

interface Result {
  fixtureId: number;
  status: string;
  [key: string]: unknown;
}

interface GWInfo {
  name: string; // "GW26"
  dir: string;
  num: number;
  hasMatches: boolean;
  hasPredictions: boolean;
  hasResults: boolean;
  hasEvaluation: boolean;
  matches: Match[];
  results: Result[];
  firstKickoff: Date | null;
  lastKickoff: Date | null;
}

interface ActionResult {
  action: string;
  gameweek: string;
  status: 'success' | 'skipped' | 'failed';
  reason?: string;
  duration?: number;
}

interface PipelineStatus {
  timestamp: string;
  season: string;
  dryRun: boolean;
  actions: ActionResult[];
  summary: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg: string) {
  console.log(`[pipeline] ${msg}`);
}

function warn(msg: string) {
  console.warn(`[pipeline] ⚠ ${msg}`);
}

function parseKickoff(kickoff: string): Date {
  // Format: "2026-02-10 19:30:00" (UTC)
  return new Date(kickoff.replace(' ', 'T') + 'Z');
}

function readJSON<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return null;
  }
}

function hoursUntil(date: Date): number {
  return (date.getTime() - Date.now()) / (1000 * 60 * 60);
}

function hoursSince(date: Date): number {
  return (Date.now() - date.getTime()) / (1000 * 60 * 60);
}

function run(cmd: string, label: string): { ok: boolean; output: string } {
  log(`  → ${label}`);
  if (dryRun) {
    log(`    [dry-run] would execute: ${cmd}`);
    return { ok: true, output: '' };
  }
  try {
    const output = execSync(cmd, {
      cwd: ROOT,
      stdio: ['inherit', 'pipe', 'pipe'],
      timeout: 5 * 60 * 1000, // 5 min per step
      env: { ...process.env, SEASON: season },
    }).toString();
    console.log(output);
    return { ok: true, output };
  } catch (err: unknown) {
    const error = err as { stderr?: Buffer; stdout?: Buffer; message?: string };
    const stderr = error.stderr?.toString() || '';
    const stdout = error.stdout?.toString() || '';
    warn(`  Command failed: ${label}`);
    if (stderr) console.error(stderr);
    if (stdout) console.log(stdout);
    return { ok: false, output: stderr || error.message || 'unknown error' };
  }
}

// ---------------------------------------------------------------------------
// Scan gameweek directories
// ---------------------------------------------------------------------------

function scanGameweeks(): GWInfo[] {
  if (!fs.existsSync(DATA_DIR)) {
    log(`Season directory not found: ${DATA_DIR}`);
    return [];
  }

  const dirs = fs.readdirSync(DATA_DIR)
    .filter(d => /^GW\d+$/.test(d))
    .sort((a, b) => parseInt(a.slice(2)) - parseInt(b.slice(2)));

  return dirs.map(name => {
    const dir = path.join(DATA_DIR, name);
    const matchesFile = path.join(dir, 'matches.json');
    const predictionsFile = path.join(dir, 'predictions.json');
    const resultsFile = path.join(dir, 'results.json');
    const evaluationFile = path.join(dir, 'evaluation.json');

    const matches = readJSON<Match[]>(matchesFile) || [];
    const results = readJSON<Result[]>(resultsFile) || [];

    const kickoffs = matches
      .map(m => parseKickoff(m.kickoff))
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    return {
      name,
      dir,
      num: parseInt(name.slice(2)),
      hasMatches: fs.existsSync(matchesFile) && matches.length > 0,
      hasPredictions: fs.existsSync(predictionsFile),
      hasResults: fs.existsSync(resultsFile) && results.length > 0,
      hasEvaluation: fs.existsSync(evaluationFile),
      matches,
      results,
      firstKickoff: kickoffs[0] || null,
      lastKickoff: kickoffs[kickoffs.length - 1] || null,
    };
  });
}

// ---------------------------------------------------------------------------
// Detection: which GWs need evaluation?
// ---------------------------------------------------------------------------

function findEvaluationTargets(gameweeks: GWInfo[]): { gw: GWInfo; reason: string }[] {
  const targets: { gw: GWInfo; reason: string }[] = [];

  for (const gw of gameweeks) {
    // Need predictions but no evaluation yet
    if (!gw.hasPredictions || gw.hasEvaluation) continue;
    if (!gw.lastKickoff) continue;

    const hSinceLast = hoursSince(gw.lastKickoff);

    // Last kickoff must be >3h ago for matches to be finished
    if (hSinceLast < 3) {
      if (hSinceLast < 0) {
        log(`${gw.name}: last kickoff is ${(-hSinceLast).toFixed(1)}h in the future — not ready to evaluate`);
      } else {
        log(`${gw.name}: last kickoff was ${hSinceLast.toFixed(1)}h ago — too soon to evaluate`);
      }
      continue;
    }

    // Check result coverage (need results first, but we'll sync them)
    // For now, mark as target — we'll validate after syncing results
    if (hSinceLast > 7 * 24) {
      targets.push({ gw, reason: `${hSinceLast.toFixed(0)}h since last match (>7d fallback)` });
    } else {
      targets.push({ gw, reason: `${hSinceLast.toFixed(1)}h since last match` });
    }
  }

  // Sort oldest first so Elo cascades correctly
  targets.sort((a, b) => a.gw.num - b.gw.num);
  return targets;
}

// ---------------------------------------------------------------------------
// Detection: which GWs need prediction?
// ---------------------------------------------------------------------------

function findPredictionTargets(gameweeks: GWInfo[]): { gw: GWInfo; reason: string; emergency: boolean }[] {
  const targets: { gw: GWInfo; reason: string; emergency: boolean }[] = [];

  for (const gw of gameweeks) {
    // Need matches but no predictions yet
    if (!gw.hasMatches || gw.hasPredictions) continue;
    if (!gw.firstKickoff) continue;

    const hUntilFirst = hoursUntil(gw.firstKickoff);

    // Already started — too late
    if (hUntilFirst < 0) {
      log(`${gw.name}: first kickoff already passed — skipping prediction`);
      continue;
    }

    // More than 7 days away — too early
    if (hUntilFirst > 7 * 24) {
      log(`${gw.name}: first kickoff in ${(hUntilFirst / 24).toFixed(1)}d — too early to predict`);
      continue;
    }

    // Emergency: <12h away
    if (hUntilFirst < 12) {
      targets.push({
        gw,
        reason: `first kickoff in ${hUntilFirst.toFixed(1)}h — EMERGENCY predict`,
        emergency: true,
      });
    } else {
      targets.push({
        gw,
        reason: `first kickoff in ${(hUntilFirst / 24).toFixed(1)}d`,
        emergency: false,
      });
    }
  }

  return targets;
}

// ---------------------------------------------------------------------------
// Evaluate a single gameweek
// ---------------------------------------------------------------------------

function evaluateGameweek(gw: GWInfo): ActionResult {
  const start = Date.now();
  log(`\n=== EVALUATE ${gw.name} ===`);

  // Step 1: Sync results (targets latest GW, but we still run it)
  const syncRes = run('npx tsx scripts/sync-results.ts', `sync-results for ${gw.name}`);
  if (!syncRes.ok && !dryRun) {
    warn(`sync-results failed for ${gw.name} — continuing with existing results`);
  }

  // Re-read results after sync
  const resultsFile = path.join(gw.dir, 'results.json');
  const results = readJSON<Result[]>(resultsFile) || [];
  const finishedCount = results.filter(r => r.status === 'finished').length;
  const totalMatches = gw.matches.length;
  const coverage = totalMatches > 0 ? finishedCount / totalMatches : 0;

  log(`  Results: ${finishedCount}/${totalMatches} finished (${(coverage * 100).toFixed(0)}%)`);

  // Check coverage thresholds
  const hSinceLast = gw.lastKickoff ? hoursSince(gw.lastKickoff) : 0;
  const minCoverage = hSinceLast > 7 * 24 ? 0.5 : 0.8;

  if (coverage < minCoverage && !dryRun) {
    const reason = `Only ${(coverage * 100).toFixed(0)}% results (need ${(minCoverage * 100).toFixed(0)}%)`;
    log(`  ${reason} — skipping evaluation`);
    return {
      action: 'evaluate',
      gameweek: gw.name,
      status: 'skipped',
      reason,
      duration: Date.now() - start,
    };
  }

  // Step 2: Evaluate
  const evalRes = run(
    `npx tsx scripts/evaluate-gameweek.ts --gameweek ${gw.name} --season ${season}`,
    'evaluate-gameweek'
  );
  if (!evalRes.ok && !dryRun) {
    return { action: 'evaluate', gameweek: gw.name, status: 'failed', reason: 'evaluate-gameweek failed', duration: Date.now() - start };
  }

  // Step 3: Update Elo ratings
  const eloRes = run(
    `npx tsx scripts/update-elo-batch.ts --gameweek ${gw.name} --season ${season}`,
    'update-elo-batch'
  );
  if (!eloRes.ok && !dryRun) {
    warn('update-elo-batch failed — continuing');
  }

  // Step 4: Adjust weights (needs 2+ evaluated GWs, handles gracefully)
  run(`npx tsx scripts/adjust-weights.ts --season ${season}`, 'adjust-weights');

  // Step 5: Update Poisson calibration
  run(`npx tsx scripts/update-poisson-calibration.ts --season ${season}`, 'update-poisson-calibration');

  // Step 6: Update performance log
  run(
    `npx tsx scripts/update-performance-log.ts --gameweek ${gw.name} --season ${season}`,
    'update-performance-log'
  );

  // Step 7: Track skill performance
  run(
    `npx tsx scripts/track-skill-performance.ts --gameweek ${gw.name} --season ${season}`,
    'track-skill-performance'
  );

  log(`  ✓ ${gw.name} evaluation complete`);
  return {
    action: 'evaluate',
    gameweek: gw.name,
    status: 'success',
    duration: Date.now() - start,
  };
}

// ---------------------------------------------------------------------------
// Predict a single gameweek
// ---------------------------------------------------------------------------

function predictGameweek(gw: GWInfo): ActionResult {
  const start = Date.now();
  log(`\n=== PREDICT ${gw.name} ===`);

  // Step 0: Export latest Polymarket prices from DB → JSON
  const polyRes = run('npx tsx scripts/export-polymarket-prices.ts', 'export-polymarket-prices');
  if (!polyRes.ok && !dryRun) {
    warn('export-polymarket-prices failed — continuing without Polymarket data');
  }

  // Run generate-predictions.mjs
  const predRes = run(
    `node scripts/generate-predictions.mjs ${gw.name} ${season}`,
    `generate-predictions for ${gw.name}`
  );
  if (!predRes.ok && !dryRun) {
    return { action: 'predict', gameweek: gw.name, status: 'failed', reason: 'generate-predictions failed', duration: Date.now() - start };
  }

  log(`  ✓ ${gw.name} predictions generated`);
  return {
    action: 'predict',
    gameweek: gw.name,
    status: 'success',
    duration: Date.now() - start,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  log(`Pipeline orchestrator started`);
  log(`  Season: ${season}`);
  log(`  Dry run: ${dryRun}`);
  log(`  Data dir: ${DATA_DIR}`);
  log('');

  const actions: ActionResult[] = [];
  let hasFailure = false;

  // Phase 0: Ingest new fixtures (may create a new GW directory)
  log('=== INGEST ===');
  const ingestRes = run('node scripts/parse-fixtures.mjs', 'parse-fixtures (ingest)');
  if (!ingestRes.ok && !dryRun) {
    warn('Ingest failed — continuing with existing data');
  }

  // Scan gameweeks after ingest (new dirs may have appeared)
  const gameweeks = scanGameweeks();
  log(`\nFound ${gameweeks.length} gameweek(s): ${gameweeks.map(g => g.name).join(', ')}`);

  for (const gw of gameweeks) {
    const parts = [
      gw.hasMatches ? 'matches' : null,
      gw.hasPredictions ? 'predictions' : null,
      gw.hasResults ? 'results' : null,
      gw.hasEvaluation ? 'evaluation' : null,
    ].filter(Boolean);
    log(`  ${gw.name}: ${parts.join(', ') || '(empty)'}`);
  }

  // Phase 1: Evaluate (oldest → newest)
  const evalTargets = findEvaluationTargets(gameweeks);
  if (evalTargets.length > 0) {
    log(`\n--- Evaluation targets ---`);
    for (const { gw, reason } of evalTargets) {
      log(`  ${gw.name}: ${reason}`);
    }

    for (const { gw } of evalTargets) {
      const result = evaluateGameweek(gw);
      actions.push(result);
      if (result.status === 'failed') hasFailure = true;
    }
  } else {
    log('\nNo gameweeks need evaluation.');
  }

  // Phase 2: Predict (re-scan after evaluation, as new data may affect detection)
  const updatedGWs = scanGameweeks();
  const predictTargets = findPredictionTargets(updatedGWs);
  if (predictTargets.length > 0) {
    log(`\n--- Prediction targets ---`);
    for (const { gw, reason, emergency } of predictTargets) {
      if (emergency) warn(`${gw.name}: ${reason}`);
      else log(`  ${gw.name}: ${reason}`);
    }

    for (const { gw } of predictTargets) {
      const result = predictGameweek(gw);
      actions.push(result);
      if (result.status === 'failed') hasFailure = true;
    }
  } else {
    log('\nNo gameweeks need prediction.');
  }

  // Summary
  const summary = actions.length === 0
    ? 'Nothing to do — all gameweeks up to date.'
    : actions.map(a => `${a.action} ${a.gameweek}: ${a.status}${a.reason ? ` (${a.reason})` : ''}`).join('; ');

  log(`\n=== SUMMARY ===`);
  log(summary);

  // Write status file (for GitHub Actions to consume)
  const status: PipelineStatus = {
    timestamp: new Date().toISOString(),
    season,
    dryRun,
    actions,
    summary,
  };

  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
  log(`Status written to ${STATUS_FILE}`);

  if (hasFailure) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[pipeline] Fatal error:', err);
  process.exit(1);
});
