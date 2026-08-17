import assert from 'node:assert/strict';
import test from 'node:test';
import admissions from '../../assets/audio/SOUNDSCAPE_LOOP_ADMISSION.json' with { type: 'json' };
import { validateSoundscapeLoopContract } from './soundscape-loop-contract.mjs';

test('accepts the production soundscape loop admission file', () => {
  assert.deepEqual(validateSoundscapeLoopContract(admissions), []);
});

test('rejects duplicate identities, invalid formats, and non-seamless entries', () => {
  const invalid = admissions.map((item) => structuredClone(item));
  invalid[1].id = invalid[0].id;
  invalid[1].assetKey = invalid[0].assetKey;
  invalid[1].sampleRateHz = 44_100;
  invalid[1].loopPlayback = 'ordinary';

  const failures = validateSoundscapeLoopContract(invalid);
  assert.ok(failures.includes('duplicate soundscape id: default'));
  assert.ok(failures.includes(`duplicate loop asset key: ${admissions[0].assetKey}`));
  assert.ok(failures.includes('default: expected 48 kHz stereo'));
  assert.ok(failures.includes('default: not admitted for seamless looping'));
  assert.ok(failures.includes('copacabanaFocus: missing loop admission'));
});

test('rejects unknown bundled keys and malformed remote ids', () => {
  const invalid = admissions.map((item) => structuredClone(item));
  invalid[0].source.key = 'missing';
  invalid[1].source.id = 'game.not-focus';

  const failures = validateSoundscapeLoopContract(invalid);
  assert.ok(failures.includes('default: unknown bundled asset key'));
  assert.ok(failures.includes('copacabanaFocus: malformed remote asset id'));
});
