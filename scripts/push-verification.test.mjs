import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  findMainPush,
  parsePrePushUpdates,
  validateMainPushCandidate,
} from './push-verification-lib.mjs';

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const ZERO = '0'.repeat(40);

test('ordinary feature-branch pushes do not select the full main gate', () => {
  const updates = parsePrePushUpdates(
    `refs/heads/feature ${A} refs/heads/feature ${B}\n`,
  );

  assert.equal(findMainPush(updates), null);
});

test('direct and explicit pushes targeting main select the full main gate', () => {
  const direct = parsePrePushUpdates(
    `refs/heads/main ${A} refs/heads/main ${B}\n`,
  );
  const explicit = parsePrePushUpdates(
    `refs/heads/feature ${A} refs/heads/main ${B}\n`,
  );

  assert.equal(findMainPush(direct)?.localSha, A);
  assert.equal(findMainPush(explicit)?.localRef, 'refs/heads/feature');
});

test('main deletion does not run a test suite against a nonexistent candidate', () => {
  const updates = parsePrePushUpdates(
    `delete ${ZERO} refs/heads/main ${B}\n`,
  );

  assert.equal(findMainPush(updates), null);
});

test('a multi-ref push selects its main update', () => {
  const updates = parsePrePushUpdates(
    [
      `refs/heads/feature ${B} refs/heads/feature ${A}`,
      `refs/heads/main ${A} refs/heads/main ${B}`,
    ].join('\n'),
  );

  assert.equal(findMainPush(updates)?.remoteRef, 'refs/heads/main');
});

test('main verification requires a clean checkout at the exact pushed HEAD', () => {
  const update = {
    localRef: 'refs/heads/main',
    localSha: A,
    remoteRef: 'refs/heads/main',
    remoteSha: B,
  };

  assert.equal(
    validateMainPushCandidate(update, { headSha: A, statusPorcelain: '' }),
    null,
  );
  assert.match(
    validateMainPushCandidate(update, {
      headSha: A,
      statusPorcelain: ' M src/App.tsx',
    }),
    /working tree is not clean/i,
  );
  assert.match(
    validateMainPushCandidate(update, { headSha: B, statusPorcelain: '' }),
    /does not match HEAD/i,
  );
});

test('the push runner executes protected verification and the full suite for a clean main candidate', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'kwilt-push-verification-'));
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'kwilt-push-bin-'));
  const commandLog = path.join(bin, 'commands.log');
  const npmStub = path.join(bin, 'npm');
  fs.writeFileSync(
    npmStub,
    '#!/usr/bin/env sh\nprintf "%s\\n" "$*" >> "$KWILT_PUSH_COMMAND_LOG"\n',
  );
  fs.chmodSync(npmStub, 0o755);

  try {
    for (const args of [
      ['init', '-b', 'main'],
      ['config', 'user.email', 'test@example.com'],
      ['config', 'user.name', 'Kwilt Test'],
    ]) {
      const result = spawnSync('git', args, { cwd: repo, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
    }
    fs.writeFileSync(path.join(repo, 'README.md'), 'candidate\n');
    spawnSync('git', ['add', 'README.md'], { cwd: repo });
    const commit = spawnSync('git', ['commit', '-m', 'candidate'], {
      cwd: repo,
      encoding: 'utf8',
    });
    assert.equal(commit.status, 0, commit.stderr);
    const head = spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: repo,
      encoding: 'utf8',
    }).stdout.trim();

    const result = spawnSync(
      process.execPath,
      [fileURLToPath(new URL('./verify-push.mjs', import.meta.url)), 'origin'],
      {
        cwd: repo,
        encoding: 'utf8',
        input: `refs/heads/main ${head} refs/heads/main ${B}\n`,
        env: {
          ...process.env,
          KWILT_PUSH_COMMAND_LOG: commandLog,
          PATH: `${bin}:${process.env.PATH ?? ''}`,
        },
      },
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.deepEqual(fs.readFileSync(commandLog, 'utf8').trim().split('\n'), [
      'run verify:changed -- --run --base origin/main',
      'run test:ci',
    ]);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(bin, { recursive: true, force: true });
  }
});

test('repository contracts install a composite pre-push hook and full-suite boundaries', () => {
  const packageJson = JSON.parse(
    fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  );
  const prePush = fs.readFileSync(
    new URL('../.githooks/pre-push', import.meta.url),
    'utf8',
  );
  const postCommit = fs.readFileSync(
    new URL('../.githooks/post-commit', import.meta.url),
    'utf8',
  );
  const postCheckout = fs.readFileSync(
    new URL('../.githooks/post-checkout', import.meta.url),
    'utf8',
  );
  const postMerge = fs.readFileSync(
    new URL('../.githooks/post-merge', import.meta.url),
    'utf8',
  );
  const ci = fs.readFileSync(
    new URL('../.github/workflows/ci.yml', import.meta.url),
    'utf8',
  );

  assert.equal(packageJson.scripts['verify:push'], 'node scripts/verify-push.mjs');
  assert.equal(packageJson.scripts['hooks:install'], 'node scripts/install-git-hooks.mjs');
  assert.match(packageJson.scripts.postinstall, /hooks:install/);
  assert.match(prePush, /scripts\/verify-push\.mjs/);
  assert.match(prePush, /< "\$push_updates"/);
  assert.match(prePush, /git lfs pre-push/);
  assert.match(postCommit, /git lfs post-commit/);
  assert.match(postCheckout, /git lfs post-checkout/);
  assert.match(postMerge, /git lfs post-merge/);
  assert.match(
    ci,
    /name: Jest \(PR full suite\)[\s\S]*if: github\.event_name == 'pull_request'[\s\S]*run: npm run test:ci/,
  );
});
