#!/usr/bin/env npx tsx
/**
 * Track Skill Performance — correlate skill versions with prediction accuracy
 * Usage: npx tsx scripts/track-skill-performance.ts --gameweek GW25 --season 2025-26
 *
 * After each evaluation, reads current skill versions from version.json files,
 * links accuracy data from evaluation.json to the skill versions that produced it.
 * Writes to data/memory/skill-performance.json.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';

const root = resolve(__dirname, '..');
const VERSIONS_DIR = resolve(root, 'data', 'memory', 'versions');
const SKILL_PERF_FILE = resolve(root, 'data', 'memory', 'skill-performance.json');

interface VersionJson {
  current: number;
  versions: Array<{
    version: number;
    timestamp: string;
    reason: string;
    file: string;
  }>;
}

interface SkillPerformanceEntry {
  gameweek: string;
  season: string;
  timestamp: string;
  outcomeAccuracy: number;
  scoreAccuracy: number;
  avgLogLoss: number;
  avgBrierScore: number;
  matchesEvaluated: number;
  skillVersions: Record<string, number>;
  fragmentVersions: Record<string, number>;
}

interface SkillPerformance {
  entries: SkillPerformanceEntry[];
  lastUpdated: string;
}

function parseArgs(args: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
      parsed[key] = value;
      if (value !== 'true') i++;
    }
  }
  return parsed;
}

function readCurrentVersions(subDir: string): Record<string, number> {
  const dir = resolve(VERSIONS_DIR, subDir);
  const versions: Record<string, number> = {};
  if (!existsSync(dir)) return versions;

  for (const name of readdirSync(dir)) {
    const versionJsonPath = resolve(dir, name, 'version.json');
    if (existsSync(versionJsonPath)) {
      const data: VersionJson = JSON.parse(readFileSync(versionJsonPath, 'utf-8'));
      versions[name] = data.current;
    }
  }
  return versions;
}

// Main
const args = parseArgs(process.argv.slice(2));
const gameweek = args.gameweek || args.gw;
const season = args.season || process.env.SEASON || '2025-26';

if (!gameweek) {
  console.error('Usage: npx tsx scripts/track-skill-performance.ts --gameweek GW25 [--season 2025-26]');
  process.exit(1);
}

const evaluationPath = resolve(root, 'data', 'gameweeks', season, gameweek, 'evaluation.json');
if (!existsSync(evaluationPath)) {
  console.error(`evaluation.json not found: ${evaluationPath}. Run evaluate-gameweek.ts first.`);
  process.exit(1);
}

const evaluation = JSON.parse(readFileSync(evaluationPath, 'utf-8'));

// Read current skill and fragment versions
const skillVersions = readCurrentVersions('skills');
const fragmentVersions = readCurrentVersions('prompt-fragments');

// Load existing performance data
const perfData: SkillPerformance = existsSync(SKILL_PERF_FILE)
  ? JSON.parse(readFileSync(SKILL_PERF_FILE, 'utf-8'))
  : { entries: [], lastUpdated: '' };

// Idempotency — skip if already tracked
const alreadyTracked = perfData.entries.some(
  (e) => e.gameweek === gameweek && e.season === season
);
if (alreadyTracked) {
  console.log(`${gameweek} (${season}) already tracked in skill-performance.json. Skipping.`);
  process.exit(0);
}

const entry: SkillPerformanceEntry = {
  gameweek,
  season,
  timestamp: new Date().toISOString(),
  outcomeAccuracy: evaluation.summary.outcomeAccuracy,
  scoreAccuracy: evaluation.summary.scoreAccuracy,
  avgLogLoss: evaluation.summary.avgLogLoss,
  avgBrierScore: evaluation.summary.avgBrierScore,
  matchesEvaluated: evaluation.summary.matchedWithResults,
  skillVersions,
  fragmentVersions,
};

perfData.entries.push(entry);
perfData.lastUpdated = new Date().toISOString();

writeFileSync(SKILL_PERF_FILE, JSON.stringify(perfData, null, 2));

console.log(`Skill performance tracked for ${gameweek} (${season})`);
console.log(`  Accuracy: ${(entry.outcomeAccuracy * 100).toFixed(1)}%`);
console.log(`  Skill versions: ${JSON.stringify(skillVersions)}`);
console.log(`  Fragment versions: ${JSON.stringify(fragmentVersions)}`);

// Show version change correlation if enough data
if (perfData.entries.length >= 2) {
  const prev = perfData.entries[perfData.entries.length - 2];
  const accDiff = entry.outcomeAccuracy - prev.outcomeAccuracy;
  const dir = accDiff > 0 ? '+' : '';
  console.log(`\n  vs ${prev.gameweek}: ${dir}${(accDiff * 100).toFixed(1)}% accuracy change`);

  // Check for version changes
  const changedSkills: string[] = [];
  for (const [skill, version] of Object.entries(entry.skillVersions)) {
    if (prev.skillVersions[skill] !== version) {
      changedSkills.push(`${skill}: v${prev.skillVersions[skill] || 0} → v${version}`);
    }
  }
  const changedFrags: string[] = [];
  for (const [frag, version] of Object.entries(entry.fragmentVersions)) {
    if (prev.fragmentVersions[frag] !== version) {
      changedFrags.push(`${frag}: v${prev.fragmentVersions[frag] || 0} → v${version}`);
    }
  }
  if (changedSkills.length > 0 || changedFrags.length > 0) {
    console.log('  Version changes since last GW:');
    for (const c of [...changedSkills, ...changedFrags]) console.log(`    ${c}`);
  } else {
    console.log('  No version changes since last GW.');
  }
}
