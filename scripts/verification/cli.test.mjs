import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { makeRepo } from './test-repo.mjs';

const scripts = fileURLToPath(new URL('../', import.meta.url));
const cli = (root, args, env = {}) => spawnSync(process.execPath, [path.join(scripts, 'verify-local.mjs'), ...args], {
  cwd: root, env: { ...process.env, CI: '', GITHUB_ACTIONS: '', EAS_BUILD: '', ...env }, encoding: 'utf8',
});

test('CLI previews selected files and discloses unrelated unfinished work', t => {
  const { root, write } = makeRepo(t);
  write('src/a.ts', 'changed');
  write('docs/new.md', 'other work');
  const result = cli(root, ['--json', '--files', 'src/a.ts']);
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout);
  assert.deepEqual(plan.changedFiles, ['src/a.ts']);
  assert.deepEqual(plan.omitted, ['docs/new.md']);
  assert.equal(fs.existsSync(path.join(root, '.git/kwilt-verification/receipts.json')), false);
});

test('CLI rejects unknown options, missing values, invalid worker counts, and unusable refs', t => {
  const { root } = makeRepo(t);
  for (const args of [['--typo'], ['--files'], ['--scope'], ['--workers', '0'], ['--workers', '2.5'], ['--base', 'missing'], ['--json', '--run']]) {
    const result = cli(root, args);
    assert.equal(result.status, 1, JSON.stringify(args));
    assert.ok(result.stderr.length);
  }
});

test('CLI refuses CI even when no files changed', t => {
  const { root } = makeRepo(t);
  const result = cli(root, ['--run'], { CI: 'true' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /protected integration/);
});

test('protected CLI always executes checks with local receipts present and remains fail-fast', t => {
  const { root, write } = makeRepo(t);
  write('src/a.ts', 'changed');
  write('.git/kwilt-verification/receipts.json', JSON.stringify({ version: 1, entries: { everything: { exitCode: 0 } } }));
  const npm = path.join(root, 'bin/npm');
  write('bin/npm', `#!${process.execPath}\nconst fs=require('node:fs');fs.appendFileSync(process.env.CALL_LOG,JSON.stringify(process.argv.slice(2))+'\\n');if(process.argv.includes(process.env.FAIL_COMMAND))process.exit(7);\n`);
  fs.chmodSync(npm, 0o755);
  const log = path.join(root, '.git/calls.log');
  const run = env => spawnSync(process.execPath, [path.join(scripts, 'verify-changed.mjs'), '--run'], {
    cwd: root, env: { ...process.env, CI: 'true', PATH: `${path.dirname(npm)}:${process.env.PATH}`, CALL_LOG: log, ...env }, encoding: 'utf8',
  });
  assert.equal(run({}).status, 0);
  let calls = fs.readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse);
  assert.ok(calls.some(args => args.includes('lint')));
  assert.ok(calls.some(args => args.includes('--findRelatedTests')));
  fs.writeFileSync(log, '');
  assert.equal(run({ FAIL_COMMAND: 'lint' }).status, 7);
  calls = fs.readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(calls, [['run', 'lint']]);
});
