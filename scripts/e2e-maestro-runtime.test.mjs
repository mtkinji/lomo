import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import yaml from 'js-yaml';

const root = path.resolve(import.meta.dirname, '..');
const runner = path.join(root, 'scripts/e2e/run-maestro-ios.sh');

test('native CI publishes the host before UI jobs and retains each group diagnostics', () => {
  const workflow = yaml.load(fs.readFileSync(path.join(root, '.github/workflows/e2e-maestro.yml'), 'utf8'));
  const host = workflow.jobs['native-host'];
  assert.ok(host, 'native compilation must survive a later UI failure');
  assert.ok(host.steps.some(s => s.uses === 'actions/cache/save@v4'));
  const restore = host.steps.find(s => s.uses === 'actions/cache/restore@v4');
  assert.ok(restore);
  assert.equal(restore.with['restore-keys'], undefined, 'never reuse a partially compatible binary');
  assert.ok(host.steps.some(s => s.uses === 'actions/upload-artifact@v4'));
  for (const name of ['native-tests', 'maestro-full']) {
    const job = workflow.jobs[name];
    assert.equal(job.needs, 'native-host');
    assert.ok(job.steps.some(s => s.uses === './.github/actions/native-test-runtime'));
    assert.ok(job.steps.some(s => s.uses === 'actions/upload-artifact@v4' && s.if === 'always()'));
  }
  const steps = workflow.jobs['native-tests'].steps;
  for (const group of ['auth', 'workspace', 'budget']) {
    const index = steps.findIndex(s => s.id === group);
    assert.ok(index >= 0);
    assert.equal(steps[index + 1].uses, 'actions/upload-artifact@v4');
    assert.equal(steps[index + 1].if, 'always()');
    assert.notEqual(steps[index]['continue-on-error'], true, 'failed assertions must keep the job failed');
  }
  assert.equal(workflow.on.workflow_dispatch.inputs.suite.default, 'acceptance');
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
elif [[ "$*" == *"application/expo+json"* ]]; then
  if [[ "$TEST_MODE" == malformed_manifest ]]; then echo '{}'; exit 0; fi
  if [[ "$TEST_MODE" == foreign_manifest ]]; then echo '{"launchAsset":{"url":"https://example.com/private.bundle"}}'; exit 0; fi
  if [[ "$KWILT_MAESTRO_BUDGET_FIXTURE" == 1 || -n "$KWILT_MAESTRO_APP_FIXTURE" ]]; then entry=index; else entry=.expo/.virtual-metro-entry; fi
  echo '{"launchAsset":{"url":"http://localhost:8081/'"$entry"'.bundle?platform=ios&lazy=true&transform.engine=hermes&transform.bytecode=1"}}'
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
  const [, flow] = yaml.loadAll(fs.readFileSync(path.join(root, 'e2e/budget-fixture/navigation-refresh.yaml'), 'utf8'));
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

// The hosted device requested Hermes/lazy transforms after the old generic
// warm-up, leaving UI assertions racing a second seven-minute cold build.
test('readiness warms the exact iOS launch asset before any UI test', () => {
  const result = run('ready', false, '/bin/bash', 'auth');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.commands, /application\/expo\+json/);
  assert.match(result.commands, /index\.bundle\?platform=ios&lazy=true&transform.engine=hermes&transform.bytecode=1/);
  assert.ok(result.commands.indexOf('transform.bytecode=1') < result.commands.indexOf('maestro --device'));
});
test('missing or nonlocal launch assets stop before UI testing', () => {
  for (const mode of ['malformed_manifest', 'foreign_manifest']) {
    const result = run(mode);
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.commands, /maestro --device|xcrun/);
  }
});

// A fresh hosted Simulator asks separately for exp+kwilt and kwilt schemes.
// The first workspace flow previously left the second OS confirmation open.
test('workspace startup handles first-use confirmation for each URL scheme', () => {
  const [, commands] = yaml.loadAll(fs.readFileSync(path.join(root, 'e2e/workspace-fixture/start.yaml'), 'utf8'));
  const links = commands.flatMap((command, index) => command.openLink ? [index] : []);
  assert.equal(links.length, 2);
  for (const index of links) {
    const confirmation = commands[index + 1]?.repeat;
    assert.equal(confirmation?.times, 3);
    assert.equal(confirmation?.while?.visible, 'Open in .*Kwilt.*');
    assert.equal(confirmation?.commands[0]?.tapOn?.text, 'Open');
    assert.equal(commands[index + 2]?.assertNotVisible, 'Open in .*Kwilt.*');
  }
  assert.equal(commands.at(-1).extendedWaitUntil.visible, 'Dev tools');
});

test('quick Budget smoke retains navigation and refresh; acceptance still traverses 4000 rows', () => {
  const read = name => yaml.loadAll(fs.readFileSync(path.join(root, `e2e/budget-fixture/${name}.yaml`), 'utf8'))[1];
  const quick = read('navigation-refresh');
  const full = read('navigation-inventory');
  assert.deepEqual(full[0], { runFlow: 'navigation-refresh.yaml' });
  assert.ok(quick.some(c => c.assertVisible === 'Completed refreshes: 1'));
  assert.ok(quick.some(c => c.swipe));
  assert.ok(full.some(c => c.assertVisible === '4000 of 4000 shown'));
  assert.ok(full.some(c => c.scrollUntilVisible?.element?.text?.includes('End of synthetic')));
  assert.ok(full.some(c => c.tapOn === 'Go back from End of synthetic transaction history'));
});

test('workspace startup stops on a native loading error and still requires the real fixture', () => {
  const [, commands] = yaml.loadAll(fs.readFileSync(path.join(root, 'e2e/workspace-fixture/start.yaml'), 'utf8'));
  const index = commands.findIndex(c => c.extendedWaitUntil?.visible?.includes('problem loading'));
  assert.ok(index >= 0, 'known loading error should stop waiting immediately');
  assert.equal(commands[index + 1].assertVisible, 'Workspace native fixture');
});
