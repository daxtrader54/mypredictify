#!/usr/bin/env npx tsx
/**
 * Skill Versioning — snapshot/rollback skills and prompt fragments
 * Usage:
 *   npx tsx scripts/version-skill.ts --skill predict-matches [--reason "description"]
 *   npx tsx scripts/version-skill.ts --fragment form-analysis [--reason "description"]
 *   npx tsx scripts/version-skill.ts --rollback --skill predict-matches --version 1
 *   npx tsx scripts/version-skill.ts --list-versions
 *
 * Windows-friendly: uses file copies, no symlinks.
 * Each snapshot creates a versioned copy and updates version.json pointer.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync } from 'fs';
import { resolve, basename } from 'path';

const root = resolve(__dirname, '..');
const SKILLS_DIR = resolve(root, '.claude', 'skills');
const FRAGMENTS_DIR = resolve(root, 'data', 'memory', 'prompt-fragments');
const VERSIONS_DIR = resolve(root, 'data', 'memory', 'versions');

interface VersionEntry {
  version: number;
  timestamp: string;
  reason: string;
  file: string;
}

interface VersionJson {
  current: number;
  versions: VersionEntry[];
}

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function loadVersionJson(versionPath: string): VersionJson {
  if (existsSync(versionPath)) {
    return JSON.parse(readFileSync(versionPath, 'utf-8'));
  }
  return { current: 0, versions: [] };
}

function snapshotSkill(skillName: string, reason: string) {
  const skillPath = resolve(SKILLS_DIR, skillName, 'SKILL.md');
  if (!existsSync(skillPath)) {
    console.error(`Skill not found: ${skillPath}`);
    process.exit(1);
  }

  const versionDir = resolve(VERSIONS_DIR, 'skills', skillName);
  ensureDir(versionDir);

  const versionJsonPath = resolve(versionDir, 'version.json');
  const versionData = loadVersionJson(versionJsonPath);

  const newVersion = versionData.current + 1;
  const versionFile = `SKILL.v${newVersion}.md`;
  const destPath = resolve(versionDir, versionFile);

  copyFileSync(skillPath, destPath);

  versionData.current = newVersion;
  versionData.versions.push({
    version: newVersion,
    timestamp: new Date().toISOString(),
    reason,
    file: versionFile,
  });

  writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2));
  console.log(`Skill "${skillName}" snapshotted as v${newVersion}: ${destPath}`);
}

function snapshotFragment(fragmentName: string, reason: string) {
  // Find the fragment file
  const fragmentPath = resolve(FRAGMENTS_DIR, `${fragmentName}.md`);
  if (!existsSync(fragmentPath)) {
    console.error(`Fragment not found: ${fragmentPath}`);
    process.exit(1);
  }

  const versionDir = resolve(VERSIONS_DIR, 'prompt-fragments', fragmentName);
  ensureDir(versionDir);

  const versionJsonPath = resolve(versionDir, 'version.json');
  const versionData = loadVersionJson(versionJsonPath);

  const newVersion = versionData.current + 1;
  const versionFile = `${fragmentName}.v${newVersion}.md`;
  const destPath = resolve(versionDir, versionFile);

  copyFileSync(fragmentPath, destPath);

  versionData.current = newVersion;
  versionData.versions.push({
    version: newVersion,
    timestamp: new Date().toISOString(),
    reason,
    file: versionFile,
  });

  writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2));
  console.log(`Fragment "${fragmentName}" snapshotted as v${newVersion}: ${destPath}`);
}

function rollbackSkill(skillName: string, version: number) {
  const versionDir = resolve(VERSIONS_DIR, 'skills', skillName);
  const versionJsonPath = resolve(versionDir, 'version.json');
  const versionData = loadVersionJson(versionJsonPath);

  const entry = versionData.versions.find((v) => v.version === version);
  if (!entry) {
    console.error(`Version ${version} not found for skill "${skillName}"`);
    console.error(`Available: ${versionData.versions.map((v) => `v${v.version}`).join(', ')}`);
    process.exit(1);
  }

  const sourcePath = resolve(versionDir, entry.file);
  const destPath = resolve(SKILLS_DIR, skillName, 'SKILL.md');

  if (!existsSync(sourcePath)) {
    console.error(`Version file not found: ${sourcePath}`);
    process.exit(1);
  }

  copyFileSync(sourcePath, destPath);
  versionData.current = version;
  writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2));
  console.log(`Skill "${skillName}" rolled back to v${version}`);
}

function rollbackFragment(fragmentName: string, version: number) {
  const versionDir = resolve(VERSIONS_DIR, 'prompt-fragments', fragmentName);
  const versionJsonPath = resolve(versionDir, 'version.json');
  const versionData = loadVersionJson(versionJsonPath);

  const entry = versionData.versions.find((v) => v.version === version);
  if (!entry) {
    console.error(`Version ${version} not found for fragment "${fragmentName}"`);
    process.exit(1);
  }

  const sourcePath = resolve(versionDir, entry.file);
  const destPath = resolve(FRAGMENTS_DIR, `${fragmentName}.md`);

  if (!existsSync(sourcePath)) {
    console.error(`Version file not found: ${sourcePath}`);
    process.exit(1);
  }

  copyFileSync(sourcePath, destPath);
  versionData.current = version;
  writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2));
  console.log(`Fragment "${fragmentName}" rolled back to v${version}`);
}

function listVersions() {
  console.log('=== Skill Versions ===');
  const skillsVersionDir = resolve(VERSIONS_DIR, 'skills');
  if (existsSync(skillsVersionDir)) {
    for (const dir of readdirSync(skillsVersionDir)) {
      const versionJsonPath = resolve(skillsVersionDir, dir, 'version.json');
      if (existsSync(versionJsonPath)) {
        const data = loadVersionJson(versionJsonPath);
        console.log(`\n  ${dir} (current: v${data.current})`);
        for (const v of data.versions) {
          const marker = v.version === data.current ? ' ← current' : '';
          console.log(`    v${v.version} [${v.timestamp}] ${v.reason}${marker}`);
        }
      }
    }
  }

  console.log('\n=== Fragment Versions ===');
  const fragsVersionDir = resolve(VERSIONS_DIR, 'prompt-fragments');
  if (existsSync(fragsVersionDir)) {
    for (const dir of readdirSync(fragsVersionDir)) {
      const versionJsonPath = resolve(fragsVersionDir, dir, 'version.json');
      if (existsSync(versionJsonPath)) {
        const data = loadVersionJson(versionJsonPath);
        console.log(`\n  ${dir} (current: v${data.current})`);
        for (const v of data.versions) {
          const marker = v.version === data.current ? ' ← current' : '';
          console.log(`    v${v.version} [${v.timestamp}] ${v.reason}${marker}`);
        }
      }
    }
  }
}

// Parse args
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

const args = parseArgs(process.argv.slice(2));

if (args['list-versions'] === 'true') {
  listVersions();
} else if (args.rollback === 'true') {
  const version = parseInt(args.version, 10);
  if (isNaN(version)) {
    console.error('--version <number> is required for rollback');
    process.exit(1);
  }
  if (args.skill) {
    rollbackSkill(args.skill, version);
  } else if (args.fragment) {
    rollbackFragment(args.fragment, version);
  } else {
    console.error('--skill <name> or --fragment <name> is required for rollback');
    process.exit(1);
  }
} else if (args.skill) {
  snapshotSkill(args.skill, args.reason || 'Manual snapshot');
} else if (args.fragment) {
  snapshotFragment(args.fragment, args.reason || 'Manual snapshot');
} else {
  console.error(`Usage:
  npx tsx scripts/version-skill.ts --skill <name> [--reason "description"]
  npx tsx scripts/version-skill.ts --fragment <name> [--reason "description"]
  npx tsx scripts/version-skill.ts --rollback --skill <name> --version <n>
  npx tsx scripts/version-skill.ts --rollback --fragment <name> --version <n>
  npx tsx scripts/version-skill.ts --list-versions`);
  process.exit(1);
}
