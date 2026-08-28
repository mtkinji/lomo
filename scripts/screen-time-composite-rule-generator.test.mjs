import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildScreenTimeProtectionSwift } = require('../plugins/withAppleEcosystemIntegrations.js');
const { buildDeviceActivityMonitorSwift } = require('../plugins/appleEcosystem/screenTimeShieldExtensions.js');
const bridgeSource = await readFile(new URL('../plugins/appleEcosystem/screenTimePrerequisiteBridge.js', import.meta.url), 'utf8');

test('generated host bridge stores and applies one V2 composite aggregate', () => {
  const rendered = buildScreenTimeProtectionSwift('group.test.kwilt');
  assert.match(rendered, /KwiltPersonalCompositeRuleConfiguration/);
  assert.match(rendered, /kwilt_screen_time_composite_config_v2/);
  assert.match(rendered, /@objc\(applyPersonalCompositeRule:resolver:rejecter:\)/);
  assert.match(rendered, /@objc\(clearPersonalCompositeRule:resolver:rejecter:\)/);
  assert.match(rendered, /connector == "all"/);
  assert.match(rendered, /outcome == "available"/);
  assert.match(rendered, /let configurationChanged = shared\.data/);
  assert.match(rendered, /if configurationChanged/);
  assert.match(rendered, /includesPastActivity: true/);
  assert.match(rendered, /KwiltRestrictionLedger\.upsert/);
  assert.match(bridgeSource, /applyPersonalCompositeRule:\(NSString \*\)json/);
});

test('generated monitor combines time and usage truth before changing one aggregate store', () => {
  const rendered = buildDeviceActivityMonitorSwift('group.test.kwilt');
  assert.match(rendered, /KwiltPersonalCompositeRuleRuntime/);
  assert.match(rendered, /condition\.type == "time_of_day"/);
  assert.match(rendered, /condition\.type == "daily_usage"/);
  assert.match(rendered, /connector == "all"/);
  assert.match(rendered, /connector == "any"/);
  assert.match(rendered, /evaluate\(configuration:/);
  assert.match(rendered, /personal_composite_rule/);
});
