import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const releaseScript = fs.readFileSync(new URL('./ios-testflight.sh', import.meta.url), 'utf8');
const workflow = fs.readFileSync(new URL('../.github/workflows/ios-testflight.yml', import.meta.url), 'utf8');

function installGitStub(binDir) {
  fs.writeFileSync(path.join(binDir, 'git'), `#!/usr/bin/env bash
case "$1" in
  fetch) exit "\${KWILT_TEST_FETCH_EXIT:-0}" ;;
  status) printf '%s' "\${KWILT_TEST_DIRTY:-}" ;;
  rev-parse) if [ "\${KWILT_TEST_MOVE_BOTH:-}" = 1 ] && [ -f "$KWILT_TESTFLIGHT_COMMAND_LOG" ]; then echo moved-main; elif [ "$2" = HEAD ]; then echo candidate; elif [ "\${KWILT_TEST_MOVE_MAIN:-}" = 1 ] && [ -f "$KWILT_TESTFLIGHT_COMMAND_LOG" ]; then echo moved-main; else echo "\${KWILT_TEST_MAIN_HEAD:-candidate}"; fi ;;
  *) exit 19 ;;
esac
`);
  fs.chmodSync(path.join(binDir, 'git'), 0o755);
}

test('TestFlight commands cannot bypass the protected changed-file gate', () => {
  assert.equal(packageJson.scripts['ios:testflight'], 'bash scripts/ios-testflight.sh');
  assert.equal(packageJson.scripts['money:verify-backend'], 'node scripts/money/backend-contract.mjs');
  assert.equal(
    packageJson.scripts['ios:testflight:no-widgets'],
    'KWILT_TESTFLIGHT_PROFILE=testflight bash scripts/ios-testflight.sh',
  );

  const verification = releaseScript.indexOf('npm run verify:changed -- --run --base');
  const fullTests = releaseScript.indexOf('npm run test:ci');
  const build = releaseScript.indexOf('npx eas-cli@22.0.0 build');
  assert.ok(verification >= 0, 'release script must run verify:changed');
  assert.ok(fullTests > verification, 'the full suite must run after verify:changed');
  assert.ok(build > fullTests, 'EAS build must start only after the full suite passes');
});

test('tag-triggered TestFlight builds fetch the integration base used by verification', () => {
  assert.match(workflow, /fetch-depth:\s*0/);
  assert.match(workflow, /npm run -s ios:testflight/);
});

test('TestFlight wrapper executes verification and build commands under strict shell mode', () => {
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kwilt-testflight-bin-'));
  const commandLog = path.join(binDir, 'commands.log');
  const stub = '#!/usr/bin/env bash\nprintf "%s\\n" "$0 $*" >> "$KWILT_TESTFLIGHT_COMMAND_LOG"\n';

  try {
    for (const command of ['npm', 'npx']) {
      const executable = path.join(binDir, command);
      fs.writeFileSync(executable, stub);
      fs.chmodSync(executable, 0o755);
    }

    installGitStub(binDir);
    const result = spawnSync('bash', [fileURLToPath(new URL('./ios-testflight.sh', import.meta.url))], {
      encoding: 'utf8',
      env: {
        ...process.env,
        KWILT_TESTFLIGHT_COMMAND_LOG: commandLog,
        PATH: `${binDir}:${process.env.PATH ?? ''}`,
      },
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const commands = fs.readFileSync(commandLog, 'utf8');
    assert.match(commands, /npm run verify:changed -- --run --base HEAD\^1/);
    assert.match(commands, /npm run test:ci/);
    assert.match(commands, /npx eas-cli@22\.0\.0 build --platform ios --profile testflight-widgets --non-interactive --auto-submit/);
  } finally {
    fs.rmSync(binDir, { recursive: true, force: true });
  }
});

test('an incompatible Budget backend stops release before EAS build or upload', () => {
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kwilt-backend-gate-'));
  const commandLog = path.join(binDir, 'commands.log');
  try {
    for (const command of ['npm', 'npx']) {
      const executable = path.join(binDir, command);
      fs.writeFileSync(executable, '#!/usr/bin/env bash\nprintf "%s\\n" "$0 $*" >> "$KWILT_TESTFLIGHT_COMMAND_LOG"\nif [[ "$*" == *"money:verify-backend"* ]]; then exit 17; fi\n');
      fs.chmodSync(executable, 0o755);
    }
    installGitStub(binDir);
    const result = spawnSync('bash', [fileURLToPath(new URL('./ios-testflight.sh', import.meta.url))], {
      encoding: 'utf8', env: { ...process.env, PATH: `${binDir}:${process.env.PATH ?? ''}`, KWILT_TESTFLIGHT_COMMAND_LOG: commandLog },
    });
    assert.equal(result.status, 17);
    const commands = fs.readFileSync(commandLog, 'utf8');
    assert.match(commands, /money:verify-backend -- --profile testflight-widgets/);
    assert.doesNotMatch(commands, /npx .*build/);
  } finally { fs.rmSync(binDir, { recursive: true, force: true }); }
});

test('backend-only dispatch cannot select Expo setup, EAS build or submission', async () => {
  const { default: yaml } = await import('js-yaml');
  const { runInNewContext } = await import('node:vm');
  const parsed = yaml.load(workflow);
  for (const [event, backendOnly, expectedJob] of [
    ['workflow_dispatch', true, 'verify_backend'],
    ['workflow_dispatch', false, 'build_and_submit'],
    ['push', undefined, 'build_and_submit'],
  ]) {
    const enabled = Object.entries(parsed.jobs).filter(([, job]) => runInNewContext(
      job.if.replace(/^\$\{\{\s*|\s*\}\}$/g, ''),
      { github: { event_name: event }, inputs: { backend_check_only: backendOnly } }, { timeout: 100 },
    ));
    assert.deepEqual(enabled.map(([name]) => name), [expectedJob]);
    if (backendOnly) {
      const steps = enabled[0][1].steps;
      assert.deepEqual(steps.filter(step => step.run).map(step => step.run), [
        'npm ci', 'npm run money:verify-backend -- --profile testflight-widgets',
      ]);
      assert(steps.filter(step => step.uses).every(step => /^actions\/(checkout|setup-node)@/.test(step.uses)));
      assert(!JSON.stringify(steps).includes('EXPO_TOKEN'));
    }
  }
});


test('TestFlight refuses dirty, off-main, and unverifiable candidates before build work', () => {
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kwilt-main-gate-'));
  const commandLog = path.join(binDir, 'commands.log');
  try {
    installGitStub(binDir);
    for (const command of ['npm', 'npx']) {
      fs.writeFileSync(path.join(binDir, command), '#!/usr/bin/env bash\necho called >> "$KWILT_TESTFLIGHT_COMMAND_LOG"\n');
      fs.chmodSync(path.join(binDir, command), 0o755);
    }
    for (const scenario of [
      { KWILT_TEST_MAIN_HEAD: 'older-main' },
      { KWILT_TEST_DIRTY: ' M app.config.ts' },
      { KWILT_TEST_FETCH_EXIT: '1' },
    ]) {
      const result = spawnSync('bash', [fileURLToPath(new URL('./ios-testflight.sh', import.meta.url))], {
        encoding: 'utf8', env: { ...process.env, ...scenario, PATH: `${binDir}:${process.env.PATH}`, KWILT_TESTFLIGHT_COMMAND_LOG: commandLog },
      });
      assert.notEqual(result.status, 0, JSON.stringify(scenario));
      assert.equal(fs.existsSync(commandLog), false, 'no verification/build side effects before main guard');
    }
  } finally { fs.rmSync(binDir, { recursive: true, force: true }); }
});

test('hosted TestFlight rejects an off-main candidate before dependency installation', async () => {
  const { default: yaml } = await import('js-yaml');
  const steps = yaml.load(workflow).jobs.build_and_submit.steps;
  const guard = steps.findIndex(s => s.run === 'bash scripts/ios-testflight-main.sh');
  const install = steps.findIndex(s => s.run === 'npm ci');
  assert(guard >= 0 && guard < install);
});

test('a clean main release still verifies files changed by the latest integration', async () => {
  const { buildVerificationPlan } = await import('./verification/plan.mjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kwilt-release-base-'));
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  try {
    git('init', '-q');
    git('config', 'user.name', 'Release regression');
    git('config', 'user.email', 'release-test@example.invalid');
    const source = 'src/capabilities/money/domain/releaseRegression.ts';
    fs.mkdirSync(path.dirname(path.join(root, source)), { recursive: true });
    fs.writeFileSync(path.join(root, source), 'export const value = 1;\n');
    git('add', '.'); git('commit', '-qm', 'baseline');
    fs.writeFileSync(path.join(root, source), 'export const value = 2;\n');
    git('commit', '-qam', 'integrated change');
    git('update-ref', 'refs/remotes/origin/main', 'HEAD');
    const base = releaseScript.match(/verification_base="\$\{KWILT_VERIFY_BASE:-([^}]+)\}"/)[1];
    const files = git('diff', '--name-only', `${base}...HEAD`).split('\n').filter(Boolean);
    assert.deepEqual(files, [source]);
    assert(buildVerificationPlan(files, base).commands.some(c => c.command === 'npm run lint'));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

for (const movement of ['KWILT_TEST_MOVE_MAIN', 'KWILT_TEST_MOVE_BOTH']) test(`${movement} during verification stops upload without repeating successful checks`, () => {
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kwilt-main-moved-'));
  const commandLog = path.join(binDir, 'commands.log');
  try {
    installGitStub(binDir);
    for (const command of ['npm', 'npx']) {
      fs.writeFileSync(path.join(binDir, command), '#!/usr/bin/env bash\nprintf "%s\\n" "$0 $*" >> "$KWILT_TESTFLIGHT_COMMAND_LOG"\n');
      fs.chmodSync(path.join(binDir, command), 0o755);
    }
    const result = spawnSync('bash', [fileURLToPath(new URL('./ios-testflight.sh', import.meta.url))], {
      encoding: 'utf8', env: { ...process.env, [movement]: '1', PATH: `${binDir}:${process.env.PATH}`, KWILT_TESTFLIGHT_COMMAND_LOG: commandLog },
    });
    assert.notEqual(result.status, 0);
    const commands = fs.readFileSync(commandLog, 'utf8');
    assert.match(commands, /money:verify-backend/);
    assert.doesNotMatch(commands, /npx/);
  } finally { fs.rmSync(binDir, { recursive: true, force: true }); }
});
