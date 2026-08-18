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

  it('starts a separate personal daily-limit monitor that shields only after threshold', () => {
    expect(bridgePlugin).toContain('applyPersonalUsageLimit');
    expect(bridgePlugin).toContain('clearPersonalUsageLimit');
    expect(extensionPlugin).toContain('KwiltPersonalUsageLimitConfiguration');
    expect(extensionPlugin).toContain('personal_usage_limit_reached');
    expect(extensionPlugin).toContain('applyPersonalUsageLimitShield');
    expect(bridgePlugin).toContain('includesPastActivity: true');
  });
});
