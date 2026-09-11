#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { buildVerificationPlan } from './verification/plan.mjs';

const argv = process.argv.slice(2);
const shouldRun = argv.includes('--run');
const asJson = argv.includes('--json');
const baseArgIndex = argv.indexOf('--base');
const baseRef = baseArgIndex >= 0 ? argv[baseArgIndex + 1] : undefined;

function git(args, options = {}) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', options.quiet ? 'ignore' : 'pipe'],
    }).trim();
  } catch {
    return '';
  }
}

function pickBaseRef() {
  if (baseRef) return baseRef;
  const upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], { quiet: true });
  if (upstream) return upstream;
  const originMain = git(['rev-parse', '--verify', 'origin/main'], { quiet: true });
  if (originMain) return 'origin/main';
  return 'main';
}

function splitLines(text) {
  return text.split('\n').map((line) => line.trim()).filter(Boolean);
}

function unique(values) {
  return [...new Set(values)];
}

const base = pickBaseRef();
const committed = splitLines(git(['diff', '--name-only', '--diff-filter=ACMRTUXB', `${base}...HEAD`], { quiet: true }));
const staged = splitLines(git(['diff', '--cached', '--name-only', '--diff-filter=ACMRTUXB'], { quiet: true }));
const unstaged = splitLines(git(['diff', '--name-only', '--diff-filter=ACMRTUXB'], { quiet: true }));
const untracked = splitLines(git(['ls-files', '--others', '--exclude-standard'], { quiet: true }));
const files = unique([...committed, ...staged, ...unstaged, ...untracked]).sort();

const plan = buildVerificationPlan(files, base);
const { commands, manual, notes } = plan;

if (asJson) {
  console.log(JSON.stringify(plan, null, 2));
} else {
  console.log(`Verification plan for ${files.length} changed file${files.length === 1 ? '' : 's'} (base: ${base})`);
  if (files.length > 0) {
    console.log('\nChanged files:');
    for (const file of files) console.log(`- ${file}`);
  }
  if (commands.length > 0) {
    console.log('\nRun:');
    for (const { command, reason } of commands) console.log(`- ${command}\n  ${reason}`);
  }
  if (manual.length > 0) {
    console.log('\nManual or environment-dependent:');
    for (const { command, reason } of manual) console.log(`- ${command}\n  ${reason}`);
  }
  for (const note of notes) console.log(`\n${note}`);
}

if (shouldRun) {
  for (const { command } of commands) {
    console.log(`\n[verify:changed] ${command}`);
    const result = spawnSync(command, {
      cwd: process.cwd(),
      env: process.env,
      shell: true,
      stdio: 'inherit',
    });
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }
}
