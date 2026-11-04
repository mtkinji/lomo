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

function run(mode, fixture = false, shell = 'bash', appFixture = '') {
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
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, SIMULATOR_ID: 'synthetic-simulator', KWILT_MAESTRO_BUDGET_FIXTURE: fixture ? '1' : '0', KWILT_MAESTRO_APP_FIXTURE: appFixture, TEST_MODE: mode, TEST_LOG: path.join(dir, 'commands'), TEST_SEEN: path.join(dir, 'seen') },
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

test('Budget startup does not pre-open a project that Maestro will launch again', () => {
  const result = run('ready', true);
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.commands, /xcrun simctl openurl/);
  const [, flow] = yaml.loadAll(fs.readFileSync(path.join(root, 'e2e/budget-fixture/navigation-inventory.yaml'), 'utf8'));
  assert.deepEqual(flow[0], { launchApp: { clearState: true } });
  assert.equal(flow.filter(command => command.openLink).length, 1);
});

test('fresh development clients do not cover app tests with the Expo tools tutorial', () => {
  for (const fixture of [false, true]) {
    const result = run('ready', fixture);
    assert.equal(result.status, 0, result.stderr);
    const link = result.commands.match(/-e DEV_CLIENT_URL=(\S+)/)?.[1];
    assert.ok(link);
    const projectUrl = new URL(new URL(link).searchParams.get('url'));
    assert.equal(projectUrl.searchParams.get('disableOnboarding'), '1');
  }
});

for (const mode of ['auth', 'workspace']) {
  test(`${mode} smoke uses isolated configuration and preserves its own diagnostics`, () => {
    const result = run('ready', false, 'bash', mode);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.commands, /expo start scripts\/e2e\/native-harness/);
    assert.match(result.commands, new RegExp(`--test-output-dir artifacts/maestro/${mode}-fixture`));
    assert.doesNotMatch(result.commands, /xcrun simctl openurl/);
  });
}
test('conflicting or unknown fixture modes fail before starting Metro', () => {
  for (const result of [run('ready', true, 'bash', 'auth'), run('ready', false, 'bash', 'unknown')]) {
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.commands, /expo start/);
  }
});

test('isolated workspace flows preserve the legacy interaction assertions', () => {
  for (const name of ['smoke-devtools', 'onboarding-plan-ready-touch-regression', 'arc-banner-touch-regression', 'activity-detail-key-actions']) {
    const [, original] = yaml.loadAll(fs.readFileSync(path.join(root, `e2e/maestro/${name}.yaml`), 'utf8'));
    const [, isolated] = yaml.loadAll(fs.readFileSync(path.join(root, `e2e/workspace-fixture/${name}.yaml`), 'utf8'));
    const firstAssertion = original.findIndex(command => name === 'smoke-devtools' ? command.assertVisible : command.scrollUntilVisible);
    assert.ok(firstAssertion >= 0);
    assert.deepEqual(isolated[0], { runFlow: 'start.yaml' });
    assert.deepEqual(isolated.slice(1), original.slice(firstAssertion));
  }
});

test('native smoke configuration ignores real backend environment values', () => {
  const result = spawnSync(process.execPath, ['-e', `console.log(JSON.stringify(require('./scripts/e2e/native-harness/app.config.js')))`], {
    cwd: root, encoding: 'utf8', env: {
      ...process.env, KWILT_MAESTRO_APP_FIXTURE: 'auth',
      SUPABASE_URL: 'https://must-not-be-used.example', SUPABASE_PUBLISHABLE_KEY: 'must-not-be-used',
    },
  });
  assert.equal(result.status, 0, result.stderr);
  const { extra } = JSON.parse(result.stdout).expo;
  assert.equal(extra.supabaseUrl, 'http://127.0.0.1:55439');
  assert.equal(extra.supabasePublishableKey, 'sb_publishable_native_smoke_not_a_real_key');
  assert.equal(extra.nativeSmokeMode, 'auth');
});
