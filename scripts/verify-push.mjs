#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';

import {
  findMainPush,
  parsePrePushUpdates,
  validateMainPushCandidate,
} from './push-verification-lib.mjs';

const remoteName = process.argv[2] || 'origin';
const updates = parsePrePushUpdates(fs.readFileSync(0, 'utf8'));
const mainPush = findMainPush(updates);

if (!mainPush) {
  process.exit(0);
}

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

const error = validateMainPushCandidate(mainPush, {
  headSha: git(['rev-parse', 'HEAD']),
  statusPorcelain: git(['status', '--porcelain', '--untracked-files=normal']),
});

if (error) {
  console.error(`[verify:push] ${error}`);
  process.exit(1);
}

const commands = [
  ['npm', ['run', 'verify:changed', '--', '--run', '--base', `${remoteName}/main`]],
  ['npm', ['run', 'test:ci']],
];

for (const [command, args] of commands) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
