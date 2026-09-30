#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const installIfGit = process.argv.includes('--if-git');

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

try {
  git(['rev-parse', '--is-inside-work-tree']);
} catch (error) {
  if (installIfGit) {
    console.log('[hooks:install] No Git checkout detected; skipping local hook installation.');
    process.exit(0);
  }
  throw error;
}

let currentHooksPath = '';
try {
  currentHooksPath = git(['config', '--local', '--get', 'core.hooksPath']);
} catch {
  currentHooksPath = '';
}

if (currentHooksPath && currentHooksPath !== '.githooks') {
  throw new Error(
    `Refusing to replace existing core.hooksPath=${currentHooksPath}. Merge Kwilt's hooks into that path or clear it explicitly.`,
  );
}

for (const hook of ['pre-push', 'post-commit', 'post-checkout', 'post-merge']) {
  fs.chmodSync(new URL(`../.githooks/${hook}`, import.meta.url), 0o755);
}

git(['config', '--local', 'core.hooksPath', '.githooks']);
console.log('[hooks:install] Installed repository hooks from .githooks.');
