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

test('TestFlight commands cannot bypass the protected changed-file gate', () => {
  assert.equal(packageJson.scripts['ios:testflight'], 'bash scripts/ios-testflight.sh');
  assert.equal(
    packageJson.scripts['ios:testflight:no-widgets'],
    'KWILT_TESTFLIGHT_PROFILE=testflight bash scripts/ios-testflight.sh',
  );

  const verification = releaseScript.indexOf('npm run verify:changed -- --run --base');
  const build = releaseScript.indexOf('npx eas-cli@22.0.0 build');
  assert.ok(verification >= 0, 'release script must run verify:changed');
  assert.ok(build > verification, 'EAS build must start only after verify:changed passes');
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
    assert.match(commands, /npm run verify:changed -- --run --base origin\/main/);
    assert.match(commands, /npx eas-cli@22\.0\.0 build --platform ios --profile testflight-widgets --non-interactive --auto-submit/);
  } finally {
    fs.rmSync(binDir, { recursive: true, force: true });
  }
});
