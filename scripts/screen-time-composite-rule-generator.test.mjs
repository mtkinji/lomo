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
  assert.match(rendered, /let selectionId = selectionIdentifier\(payload\.selectionId\)/);
  assert.doesNotMatch(rendered, /let selectionId = safeIdentifier\(payload\.selectionId\)/);
  assert.match(rendered, /guard self\.isAuthorized\(\) else/);
  assert.doesNotMatch(rendered, /guard AuthorizationCenter\.shared\.authorizationStatus == \.approved else/);
  assert.match(rendered, /connector == "all"/);
  assert.match(rendered, /outcome == "available"/);
  assert.match(rendered, /condition\.type == "budget"/);
  assert.match(rendered, /conditionExplanations: \[KwiltPersonalCompositeConditionExplanation\]\?/);
  assert.match(rendered, /details: personalCompositeBlockingDetails/);
  assert.match(rendered, /let configurationChanged = shared\.data/);
  assert.match(rendered, /let monitoringChanged = configurationChanged/);
  assert.match(rendered, /if monitoringChanged/);
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
  assert.match(rendered, /conditionExplanations: \[KwiltPersonalCompositeConditionExplanation\]\?/);
  assert.match(rendered, /details: blockingDetails/);
});


test('weekday conditions survive native decoding and get a daily wakeup and cleanup', () => {
  const host = buildScreenTimeProtectionSwift('group.test.kwilt');
  const monitor = buildDeviceActivityMonitorSwift('group.test.kwilt');
  for (const source of [host, monitor]) {
    assert.match(source, /let days: \[Int\]\?/);
    assert.match(source, /calendar.component\(\.weekday, from: now\)/);
    assert.match(source, /days.contains\(weekday\)/);
    assert.match(source, /KwiltPersonalRuleCore.truth\(condition/);
  }
  assert.match(host, /days.allSatisfy/);
  assert.equal((host.match(/\$0.type == "day_of_week"/g) ?? []).length, 2, 'schedule and cleanup both include weekday conditions');
  assert.match(host, /if condition.type == "day_of_week" \{\s+schedule = DeviceActivitySchedule/);
});

test('usage evidence belongs to the same threshold and targets and survives unrelated same-day restarts', () => {
  const host = buildScreenTimeProtectionSwift('group.test.kwilt');
  const monitor = buildDeviceActivityMonitorSwift('group.test.kwilt');
  assert.match(host, /previousCondition\?\.minutes != condition.minutes/);
  assert.match(host, /previousConfiguration\?\.targetSelection.applicationTokens == selection.applicationTokens/);
  assert.match(host, /shared.removeObject\(forKey: key \+ "\.day"\)/);
  assert.match(monitor, /static func beginUsageInterval/);
  assert.match(monitor, /string\(forKey: key \+ "\.day"\) == KwiltPersonalRuleCore.dayKey\(Date\(\)\)/);
  assert.match(monitor, /KwiltPersonalCompositeRuleRuntime.beginUsageInterval/);
});
