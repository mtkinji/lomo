import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createRequire } from 'node:module';

const generator = await readFile(new URL('../plugins/appleEcosystem/screenTimeShieldExtensions.js', import.meta.url), 'utf8');
const bridgeGenerator = await readFile(new URL('../plugins/withAppleEcosystemIntegrations.js', import.meta.url), 'utf8');
const require = createRequire(import.meta.url);
const { buildScreenTimeProtectionSwift } = require('../plugins/withAppleEcosystemIntegrations.js');

test('Kwilt Goals uses the non-semantic dark blur so pine700 remains visibly green', () => {
  assert.match(generator, /backgroundBlurStyle: isMoney \? \.systemMaterialDark : \.dark,/);
});

test('Kwilt Goals uses pine700 for the shield', () => {
  assert.match(generator, /UIColor\(red: 0\.192, green: 0\.333, blue: 0\.271, alpha: 1\.0\)/);
});

test('shield actions preserve the reason for an exact in-app handoff', () => {
  assert.match(generator, /handoffReasonKey = "kwilt_screen_time_handoff_reason_v1"/);
  assert.match(generator, /defaults\.set\(reason, forKey: handoffReasonKey\)/);
});

test('native stores keep target-aware restriction entries instead of one last-writer reason', () => {
  assert.match(generator, /kwilt_screen_time_restriction_v2\./);
  assert.match(generator, /applicationTokenKeys/);
  assert.match(generator, /categoryTokenKeys/);
  assert.match(generator, /webDomainTokenKeys/);
  assert.match(bridgeGenerator, /buildRestrictionLedgerSwift\('__KWILT_APP_GROUP_ID__'\)/);
  assert.match(bridgeGenerator, /KwiltRestrictionLedger\.upsert/);
  assert.match(bridgeGenerator, /KwiltRestrictionLedger\.remove/);
});

test('the app bridge and extensions render the same concrete App Group', () => {
  const rendered = buildScreenTimeProtectionSwift('group.test.kwilt');
  assert.doesNotMatch(rendered, /__KWILT_APP_GROUP_ID__/);
  assert.equal(rendered.match(/group\.test\.kwilt/g)?.length, 2);
});

test('the shield and action extension resolve the same highest-priority matching reason', () => {
  assert.match(generator, /matchingRestrictions/);
  assert.match(generator, /priority\(for reason:/);
  assert.match(generator, /things before/);
  assert.match(generator, /more rules will still apply/);
  assert.match(generator, /buttonLabel\(for reason:/);
});
