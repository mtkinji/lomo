import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);

test('generated native config keeps microphone recording enabled for Chat voice input', () => {
  const json = execFileSync(
    process.execPath,
    [require.resolve('expo/bin/cli'), 'config', '--type', 'introspect', '--json'],
    { cwd: process.cwd(), encoding: 'utf8' },
  );
  const config = JSON.parse(json);

  assert.match(
    config.ios?.infoPlist?.NSMicrophoneUsageDescription ?? '',
    /chat|voice/i,
  );
  assert.ok(
    config.android?.permissions?.includes('android.permission.RECORD_AUDIO'),
    'generated Android config must request RECORD_AUDIO',
  );
});
