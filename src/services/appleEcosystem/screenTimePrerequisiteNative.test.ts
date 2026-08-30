import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Screen Time prerequisite native generation', () => {
  const extensionPlugin = readFileSync(resolve(
    process.cwd(), 'plugins/appleEcosystem/screenTimeShieldExtensions.js',
  ), 'utf8');
  const bridgePlugin = [
    'plugins/withAppleEcosystemIntegrations.js',
    'plugins/appleEcosystem/screenTimePrerequisiteBridge.js',
  ].map((file) => readFileSync(resolve(process.cwd(), file), 'utf8')).join('\n');
  const appConfig = readFileSync(resolve(process.cwd(), 'app.config.ts'), 'utf8');
  const generatedBridgeParts = require(resolve(
    process.cwd(), 'plugins/appleEcosystem/screenTimePrerequisiteBridge.js',
  )) as { PREREQUISITE_HELPERS_SWIFT: string; PREREQUISITE_METHODS_SWIFT: string };
  const generatedBridge = [
    generatedBridgeParts.PREREQUISITE_HELPERS_SWIFT,
    generatedBridgeParts.PREREQUISITE_METHODS_SWIFT,
  ].join('\n');

  it('registers a signed Device Activity monitor extension', () => {
    expect(extensionPlugin).toContain("name: 'KwiltDeviceActivityMonitor'");
    expect(extensionPlugin).toContain('com.apple.deviceactivity.monitor-extension');
    expect(extensionPlugin).toContain('final class KwiltDeviceActivityMonitorExtension: DeviceActivityMonitor');
    expect(appConfig).toContain("targetName: 'KwiltDeviceActivityMonitor'");
    expect(appConfig).toContain("bundleIdentifier: 'com.andrewwatanabe.kwilt.device-activity-monitor'");
  });

  it('shields only the target store at reset and clears it at the prerequisite threshold', () => {
    expect(extensionPlugin).toContain('override func intervalDidStart');
    expect(extensionPlugin).toContain('override func eventDidReachThreshold');
    expect(extensionPlugin).toContain('store.clearAllSettings()');
    expect(extensionPlugin).toContain('targetSelection');
    expect(extensionPlugin).toContain('threshold_reached');
  });

  it('starts monitoring from the app bridge without exposing readable app activity', () => {
    expect(bridgePlugin).toContain('DeviceActivityCenter()');
    expect(bridgePlugin).toContain('applyPrerequisiteRule');
    expect(bridgePlugin).toContain('prerequisiteSelectionId');
    expect(bridgePlugin).toContain('targetSelectionId');
    expect(bridgePlugin).toContain('thresholdMinutes');
    expect(bridgePlugin).not.toContain('Gospel Library');
  });

  it('requires callers to choose individual or child authorization explicitly', () => {
    expect(bridgePlugin).toContain('let requestedMember: FamilyControlsMember');
    expect(bridgePlugin).toContain('member == "child" ? .child : .individual');
    expect(bridgePlugin).toContain('requestAuthorization(for: requestedMember)');
    expect(bridgePlugin).not.toContain('requestAuthorization(for: .individual)');
  });

  it('starts a separate personal daily-limit monitor that shields only after threshold', () => {
    expect(bridgePlugin).toContain('applyPersonalUsageLimit');
    expect(bridgePlugin).toContain('clearPersonalUsageLimit');
    expect(extensionPlugin).toContain('KwiltPersonalUsageLimitConfiguration');
    expect(extensionPlugin).toContain('personal_usage_limit_reached');
    expect(extensionPlugin).toContain('applyPersonalUsageLimitShield');
    expect(bridgePlugin).toContain('includesPastActivity: true');
  });

  it('repairs orphaned composite monitors and reports Apple monitoring errors exactly', () => {
    expect(generatedBridge).toContain('center.activities.filter');
    expect(generatedBridge).toContain('activeRuleIds');
    expect(generatedBridge).toContain('center.stopMonitoring(staleCompositeActivities)');
    expect(generatedBridge).toContain('center.stopMonitoring(obsoleteCurrentRuleActivities)');
    expect(generatedBridge).toContain('expectedActivities.contains');
    expect(generatedBridge).toContain('monitoring_excessive_activities');
    expect(generatedBridge).toContain('monitoredActivityCount');
    expect(generatedBridge).toContain('error.errorDescription');
  });

  it('keeps long condition IDs with a shared rule prefix distinct across the app and monitor extension', () => {
    expect(generatedBridge).toContain('private func personalCompositeConditionIdentifier(_ raw: String) -> String');
    expect(generatedBridge).toContain('Set(payload.conditions.map { personalCompositeConditionIdentifier($0.id) })');
    expect(generatedBridge).toContain('safeIdentifier(ruleId)).\\(personalCompositeConditionIdentifier(conditionId))');
    expect(generatedBridge).not.toContain('Set(payload.conditions.map { safeIdentifier($0.id) })');
    expect(extensionPlugin).toContain('static func personalCompositeConditionIdentifier(_ raw: String) -> String');
    expect(extensionPlugin).toContain('safeIdentifier(ruleId)).\\\\(KwiltPrerequisiteMonitorRuntime.personalCompositeConditionIdentifier(conditionId))');
    expect(extensionPlugin).toContain('hasSuffix(KwiltPrerequisiteMonitorRuntime.personalCompositeConditionIdentifier($0.id))');
  });

  it('preserves rule-specific Swift interpolation in generated personal-limit identifiers', () => {
    expect(bridgePlugin).toContain('"kwilt.personal.limit.\\\\(safeIdentifier(ruleId))"');
    expect(bridgePlugin).toContain('forKey: "\\\\(personalUsageLimitConfigPrefix)\\\\(activity.rawValue)"');
    expect(bridgePlugin).toContain('id: "personal_limit.\\\\(ruleId)"');
    expect(generatedBridge).toContain('"kwilt.personal.limit.\\(safeIdentifier(ruleId))"');
    expect(generatedBridge).toContain('forKey: "\\(personalUsageLimitConfigPrefix)\\(activity.rawValue)"');
    expect(generatedBridge).toContain('id: "personal_limit.\\(ruleId)"');
    expect(generatedBridge).not.toContain('"kwilt.personal.limit.(safeIdentifier(ruleId))"');
  });

  it('describes overlapping restrictions without implying an unlock order', () => {
    expect(extensionPlugin).toContain('rules are pausing');
    expect(extensionPlugin).toContain('more rules also apply');
    expect(extensionPlugin).not.toContain('First,');
    expect(extensionPlugin).not.toContain('will still apply');
  });
});
