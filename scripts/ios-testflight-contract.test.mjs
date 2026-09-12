import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

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
