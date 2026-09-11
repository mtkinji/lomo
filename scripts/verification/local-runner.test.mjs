import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { runLocalPlan, acquireLock } from './local-runner.mjs';
import { makeRepo } from './test-repo.mjs';

function setup(t) {
  const { root, write } = makeRepo(t);
  const cacheDir = path.join(root, '.git/kwilt-verification');
  const gate = { id: 'regression', file: process.execPath, args: ['-e', 'process.exit(0)'], reason: 'fixture', cacheable: true };
  const plan = { base: 'HEAD', commands: [gate], changedFiles: ['src/a.ts'], omitted: [], manual: [] };
  const options = { root, cacheDir, env: {}, getFingerprint: () => 'same-input', log: () => {}, execute: async () => 0 };
  return { root, write, cacheDir, plan, options };
}

test('an unchanged successful check is reused with its original completion time', async t => {
  const { plan, options } = setup(t);
  let calls = 0;
  options.execute = async () => { calls++; return 0; };
  const first = await runLocalPlan(plan, options);
  const second = await runLocalPlan(plan, options);
  assert.equal(calls, 1);
  assert.equal(second.results[0].status, 'reused');
  assert.equal(first.results[0].completedAt, second.results[0].completedAt);
  assert.deepEqual(second.results[0].command, { file: plan.commands[0].file, args: plan.commands[0].args });
  assert.equal(second.status, 'passed');
});

test('changed inputs and force both rerun checks', async t => {
  const { plan, options } = setup(t);
  await runLocalPlan(plan, options);
  assert.equal((await runLocalPlan(plan, { ...options, force: true })).results[0].status, 'passed');
  assert.equal((await runLocalPlan(plan, { ...options, getFingerprint: () => 'changed' })).results[0].status, 'passed');
});

test('a failed forced run removes an older success and stops subsequent commands', async t => {
  const { plan, options } = setup(t);
  await runLocalPlan(plan, options);
  let calls = 0;
  const failed = await runLocalPlan({ ...plan, commands: [...plan.commands, { ...plan.commands[0], id: 'later' }] }, {
    ...options, force: true, execute: async () => { calls++; return 2; },
  });
  assert.equal(failed.status, 'failed');
  assert.equal(failed.exitCode, 2);
  assert.equal(calls, 1);
  assert.equal((await runLocalPlan(plan, options)).results[0].status, 'passed');
});

test('input changes during execution fail the run and never store successful receipts', async t => {
  const { plan, options } = setup(t);
  let source = 'old';
  const stale = await runLocalPlan(plan, { ...options, getFingerprint: () => source, execute: async () => { source = 'new'; return 0; } });
  assert.equal(stale.status, 'stale');
  assert.equal(stale.exitCode, 1);
  assert.equal((await runLocalPlan(plan, { ...options, getFingerprint: () => 'old' })).results[0].status, 'passed');
});

test('uncacheable checks execute every time and malformed receipts cannot grant a pass', async t => {
  const { plan, options, cacheDir } = setup(t);
  await runLocalPlan(plan, options);
  fs.writeFileSync(path.join(cacheDir, 'receipts.json'), '{bad json');
  assert.equal((await runLocalPlan(plan, options)).results[0].status, 'passed');
  plan.commands[0].cacheable = false;
  assert.equal((await runLocalPlan(plan, options)).results[0].status, 'passed');
});

test('process errors fail and still release the local lock', async t => {
  const { plan, options, cacheDir } = setup(t);
  const result = await runLocalPlan(plan, { ...options, execute: async () => { throw new Error('spawn failed'); } });
  assert.equal(result.status, 'failed');
  assert.match(result.error, /spawn failed/);
  assert.equal(fs.existsSync(path.join(cacheDir, 'run.lock')), false);
});

test('local execution is refused in CI, including when CI is false but GitHub Actions is true', async t => {
  const { plan, options } = setup(t);
  await assert.rejects(runLocalPlan(plan, { ...options, env: { CI: 'true' } }), /integration/i);
  await assert.rejects(runLocalPlan(plan, { ...options, env: { CI: 'false', GITHUB_ACTIONS: 'true' } }), /integration/i);
});

test('a live verifier lock cannot be stolen, but a confirmed dead owner is recoverable', t => {
  const { cacheDir } = setup(t);
  const first = acquireLock(cacheDir);
  assert.throws(() => acquireLock(cacheDir), /running/);
  first.release();
  fs.writeFileSync(path.join(cacheDir, 'run.lock'), JSON.stringify({ pid: 2147483647 }));
  const recovered = acquireLock(cacheDir);
  recovered.release();
});

test('a live orphaned child keeps a dead parent lock protected', t => {
  const { cacheDir } = setup(t);
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(path.join(cacheDir, 'run.lock'), JSON.stringify({ pid: 2147483647, childPid: process.pid }));
  assert.throws(() => acquireLock(cacheDir), /running/);
});

test('the real runner passes shell-looking arguments literally', async t => {
  const { root, plan, options } = setup(t);
  const literal = '$(touch injected) `echo bad` "quoted"';
  plan.commands[0].args = ['-e', 'if (process.argv[1] !== process.env.EXPECTED) process.exit(9)', literal];
  const { execute: unused, ...realOptions } = options;
  const result = await runLocalPlan(plan, { ...realOptions, env: { EXPECTED: literal } });
  assert.equal(result.exitCode, 0);
  assert.equal(fs.existsSync(path.join(root, 'injected')), false);
});

test('a terminated child that exits zero cannot turn interruption into a cached pass', async t => {
  const { plan, options, cacheDir } = setup(t);
  plan.commands[0].args = ['-e', "process.on('SIGTERM',()=>process.exit(0));setTimeout(()=>process.kill(process.ppid,'SIGTERM'),40);setInterval(()=>{},1000)"];
  const { execute: unused, ...realOptions } = options;
  const result = await runLocalPlan(plan, realOptions);
  assert.equal(result.status, 'failed');
  assert.notEqual(result.exitCode, 0);
  const receipts = JSON.parse(fs.readFileSync(path.join(cacheDir, 'receipts.json'), 'utf8'));
  assert.equal(Object.keys(receipts.entries).length, 0);
});
