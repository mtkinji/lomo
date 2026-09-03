import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);

test('Expo config owns the complete app privacy manifest', () => {
  const config = require('../app.config.ts');
  const manifest = config.ios?.privacyManifests;

  assert.equal(manifest?.NSPrivacyTracking, false);
  assert.deepEqual(manifest?.NSPrivacyTrackingDomains ?? [], []);
  assert.equal(manifest?.NSPrivacyCollectedDataTypes?.length, 22);

  const collectedTypes = new Set(
    manifest.NSPrivacyCollectedDataTypes.map((entry) => entry.NSPrivacyCollectedDataType),
  );
  assert.equal(collectedTypes.size, 22, 'collected data types must be unique');
  assert.ok(collectedTypes.has('NSPrivacyCollectedDataTypeEmailAddress'));
  assert.ok(collectedTypes.has('NSPrivacyCollectedDataTypeHealth'));
  assert.ok(collectedTypes.has('NSPrivacyCollectedDataTypePreciseLocation'));
  assert.ok(collectedTypes.has('NSPrivacyCollectedDataTypeOtherFinancialInfo'));

  for (const entry of manifest.NSPrivacyCollectedDataTypes) {
    assert.equal(entry.NSPrivacyCollectedDataTypeLinked, true);
    assert.equal(entry.NSPrivacyCollectedDataTypeTracking, false);
    assert.ok(entry.NSPrivacyCollectedDataTypePurposes.length > 0);
  }
});
