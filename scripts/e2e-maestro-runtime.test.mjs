import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import yaml from 'js-yaml';

const root = path.resolve(import.meta.dirname, '..');
const runner = path.join(root, 'scripts/e2e/run-maestro-ios.sh');

test('every native CI job supplies JavaScript and preserves failure artifacts', () => {
  const workflow = yaml.load(fs.readFileSync(path.join(root, '.github/workflows/e2e-maestro.yml'), 'utf8'));
  for (const job of Object.values(workflow.jobs)) {
    const run = job.steps.find(step => step.run?.includes('scripts/e2e/run-maestro-ios.sh'));
    assert.ok(run, 'Debug simulator must load Metro before testing app UI');
    const upload = job.steps.find(step => step.uses?.startsWith('actions/upload-artifact@'));
    assert.equal(upload?.if, 'always()');
    assert.equal(upload?.with.path, 'artifacts/maestro');
  }
});

function run(mode, fixture = false, shell = 'bash') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kwilt-maestro-runtime-'));
  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin);
  fs.mkdirSync(path.join(dir, 'node_modules/.bin'), { recursive: true });
  const write = (name, body) => fs.writeFileSync(name, '#!/bin/bash\nset -eu\n' + body, { mode: 0o755 });
  write(path.join(dir, 'node_modules/.bin/expo'), 'echo "expo $*" >> "$TEST_LOG"\ntrap "exit 0" TERM\nwhile true; do sleep 0.1; done\n');
  write(path.join(bin, 'curl'), `
echo "curl $*" >> "$TEST_LOG"
if [[ "$*" == *"/status"* ]]; then
  if [[ "$TEST_MODE" == busy ]]; then echo packager-status:running; exit 0; fi
  if [[ ! -f "$TEST_SEEN" ]]; then touch "$TEST_SEEN"; exit 7; fi
  echo packager-status:running
elif [[ "$TEST_MODE" == bundle_failure ]]; then exit 22; fi
`);
  write(path.join(bin, 'xcrun'), 'echo "xcrun $*" >> "$TEST_LOG"\n');
  write(path.join(bin, 'maestro'), 'echo "maestro $*" >> "$TEST_LOG"\nif [[ "$TEST_MODE" == test_failure ]]; then exit 9; fi\n');
  try {
    const result = spawnSync(shell, [runner, 'e2e/maestro/auth-gate-smoke.yaml'], {
      cwd: dir, encoding: 'utf8', timeout: 10000,
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, SIMULATOR_ID: 'synthetic-simulator', KWILT_MAESTRO_BUDGET_FIXTURE: fixture ? '1' : '0', TEST_MODE: mode, TEST_LOG: path.join(dir, 'commands'), TEST_SEEN: path.join(dir, 'seen') },
    });
    return { ...result, commands: fs.existsSync(path.join(dir, 'commands')) ? fs.readFileSync(path.join(dir, 'commands'), 'utf8') : '' };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

test('native tests start only after the bundle is available and the dev client is opened', () => {
  const result = run('ready');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.commands, /\.virtual-metro-entry\.bundle/);
  assert.ok(result.commands.indexOf('.bundle') < result.commands.indexOf('xcrun simctl openurl'));
  assert.ok(result.commands.indexOf('xcrun simctl openurl') < result.commands.indexOf('maestro --device'));
  assert.match(result.commands, /--test-output-dir artifacts\/maestro/);
  assert.match(result.commands, /--flatten-debug-output/);
});
test('the default app starts under macOS system Bash with unset-variable checks', { skip: process.platform !== 'darwin' }, () => {
  const result = run('ready', false, '/bin/bash');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.commands, /expo start /, 'Metro must actually start before the mocked readiness response');
  assert.match(result.commands, /maestro --device/);
});
test('a failed JavaScript bundle stops before launching or testing the app', () => {
  const result = run('bundle_failure');
  assert.equal(result.status, 22, result.stderr);
  assert.doesNotMatch(result.commands, /xcrun|maestro --device/);
});
test('Maestro failures remain failures', () => {
  assert.equal(run('test_failure').status, 9);
});
test('the runner refuses to reuse an unrelated Metro process', () => {
  const result = run('busy');
  assert.equal(result.status, 1, result.stderr);
  assert.doesNotMatch(result.commands, /maestro --device|xcrun/);
});

// A fixture run must neither warm the real app nor overwrite its diagnostics.
test('Budget native acceptance selects only the isolated entry and separate diagnostics', () => {
  const result = run('ready', true);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.commands, /expo start scripts\/money\/native-harness/);
  assert.match(result.commands, /http:\/\/localhost:8081\/index\.bundle/);
  assert.doesNotMatch(result.commands, /virtual-metro-entry/);
  assert.match(result.commands, /--test-output-dir artifacts\/maestro\/budget-fixture/);
});
