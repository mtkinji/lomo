const { withXcodeProject } = require('@expo/config-plugins');
const { addBuildSourceFileToGroup, addResourceFileToGroup, ensureGroupRecursively } = require('@expo/config-plugins/build/ios/utils/Xcodeproj');
const fs = require('fs');
const path = require('path');

function appGroupIdFor(config) {
  const bundleId = config?.ios?.bundleIdentifier;
  return typeof bundleId === 'string' && bundleId.trim()
    ? `group.${bundleId.trim()}`
    : 'group.com.andrewwatanabe.kwilt';
}

function buildConfigurationSwift(appGroupId) {
  return `import Foundation
import ManagedSettings
import ManagedSettingsUI
import UIKit

private enum KwiltShieldCopy {
  static let appGroupIdentifier = "${appGroupId}"
  static let reasonKey = "kwilt_screen_time_shield_reason_v1"
  static let prerequisiteLabelKey = "kwilt_screen_time_prerequisite_label_v1"
  static let targetLabelKey = "kwilt_screen_time_target_label_v1"
  static let thresholdMinutesKey = "kwilt_screen_time_prerequisite_minutes_v1"

  static func reason() -> String {
    guard let defaults = UserDefaults(suiteName: appGroupIdentifier),
          let value = defaults.string(forKey: reasonKey),
          !value.isEmpty else {
      return "default"
    }
    return value
  }

  static func title(for reason: String) -> String {
    switch reason {
    case "focus_session_active", "focus":
      return "Stay with your focus."
    case "meaningful_first_locked":
      return "Do one thing first."
    case "meaningful_first_bypass":
      return "Your Kwilt pause is active."
    case "money_usage_threshold", "money_review_required":
      return "Review this category first."
    case "money_over_limit":
      return "This category is over its plan."
    case "money_ahead_of_pace":
      return "This category is running hot."
    case "money_transactions_need_review":
      return "Review recent spending."
    case "family_prerequisite":
      let label = UserDefaults(suiteName: appGroupIdentifier)?.string(forKey: prerequisiteLabelKey)
      return "Use \\(label ?? "the required app") first."
    default:
      return "Do one thing first."
    }
  }

  static func subtitle(for reason: String, appName: String) -> String {
    switch reason {
    case "focus_session_active", "focus":
      return "End Focus in Kwilt to open \\(appName)."
    case "meaningful_first_locked":
      return "Complete a to-do, record progress, or finish Focus in Kwilt to open \\(appName) today."
    case "meaningful_first_bypass":
      return "Wait for this short pause to end, or open Kwilt to change it."
    case "money_usage_threshold", "money_review_required", "money_over_limit", "money_ahead_of_pace", "money_transactions_need_review":
      return "Open Kwilt Money to review before using \\(appName)."
    case "family_prerequisite":
      let defaults = UserDefaults(suiteName: appGroupIdentifier)
      let prerequisite = defaults?.string(forKey: prerequisiteLabelKey) ?? "the required app"
      let target = defaults?.string(forKey: targetLabelKey) ?? appName
      let minutes = max(1, defaults?.integer(forKey: thresholdMinutesKey) ?? 1)
      return "Use \\(prerequisite) for \\(minutes) minute\\(minutes == 1 ? "" : "s") to open \\(target)."
    default:
      return "Complete a to-do, record progress, or finish Focus in Kwilt to open \\(appName) today."
    }
  }
}

final class KwiltShieldConfigurationExtension: ShieldConfigurationDataSource {
  private let detailColor = UIColor(white: 1.0, alpha: 0.84)

  private func configuration(appName: String) -> ShieldConfiguration {
    let reason = KwiltShieldCopy.reason()
    let isMoney = reason.hasPrefix("money_")
    let accent = isMoney
      ? UIColor(red: 0.106, green: 0.157, blue: 0.227, alpha: 1.0)
      : UIColor(red: 0.192, green: 0.333, blue: 0.271, alpha: 1.0)
    return ShieldConfiguration(
      backgroundBlurStyle: .systemMaterialDark,
      backgroundColor: accent,
      icon: UIImage(named: "KwiltShieldAppIcon") ?? UIImage(systemName: isMoney ? "creditcard.and.123" : "app.badge.clock")?.withTintColor(UIColor.white, renderingMode: .alwaysOriginal),
      title: ShieldConfiguration.Label(text: KwiltShieldCopy.title(for: reason), color: UIColor.white),
      subtitle: ShieldConfiguration.Label(text: KwiltShieldCopy.subtitle(for: reason, appName: appName), color: detailColor),
      primaryButtonLabel: ShieldConfiguration.Label(text: isMoney ? "Open Kwilt Money" : "Open Kwilt", color: accent),
      primaryButtonBackgroundColor: UIColor.white,
      secondaryButtonLabel: nil
    )
  }

  override func configuration(shielding application: Application) -> ShieldConfiguration {
    configuration(appName: application.localizedDisplayName ?? "this app")
  }

  override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration {
    configuration(appName: application.localizedDisplayName ?? category.localizedDisplayName ?? "this app")
  }

  override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
    configuration(appName: webDomain.domain ?? "this website")
  }

  override func configuration(shielding webDomain: WebDomain, in category: ActivityCategory) -> ShieldConfiguration {
    configuration(appName: webDomain.domain ?? category.localizedDisplayName ?? "this website")
  }
}
`;
}

function buildActionSwift(appGroupId) {
return `import Foundation
import ManagedSettings

private enum KwiltReviewRequest {
  static let appGroupIdentifier = "${appGroupId}"
  static let requestedAtKey = "kwilt_screen_time_review_requested_at_v1"

  static func record() {
    UserDefaults(suiteName: appGroupIdentifier)?.set(
      Date().timeIntervalSince1970 * 1000.0,
      forKey: requestedAtKey
    )
  }
}

final class KwiltShieldActionExtension: ShieldActionDelegate {
  override func handle(action: ShieldAction, for application: ApplicationToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
    handle(action: action, completionHandler: completionHandler)
  }

  override func handle(action: ShieldAction, for category: ActivityCategoryToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
    handle(action: action, completionHandler: completionHandler)
  }

  override func handle(action: ShieldAction, for webDomain: WebDomainToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
    handle(action: action, completionHandler: completionHandler)
  }

  private func handle(action: ShieldAction, completionHandler: @escaping (ShieldActionResponse) -> Void) {
    switch action {
    case .primaryButtonPressed:
      if #available(iOS 26.5, *), let openKwilt = ShieldActionResponse(rawValue: 3) {
        KwiltReviewRequest.record()
        completionHandler(openKwilt)
      } else {
        completionHandler(.close)
      }
    case .secondaryButtonPressed:
      completionHandler(.close)
    default:
      completionHandler(.none)
    }
  }
}
`;
}

function buildDeviceActivityMonitorSwift(appGroupId) {
  return `import DeviceActivity
import FamilyControls
import Foundation
import ManagedSettings

private struct KwiltPrerequisiteMonitorConfiguration: Codable {
  let agreementId: String
  let policyVersion: Int
  let targetSelectionId: String
  let targetSelection: FamilyActivitySelection
  let prerequisiteLabel: String
  let targetLabel: String
  let thresholdMinutes: Int
}

private struct KwiltPrerequisiteMonitorReceipt: Codable {
  let kind: String
  let agreementId: String
  let policyVersion: Int
  let occurredAtMs: Double
}

private enum KwiltPrerequisiteMonitorRuntime {
  static let appGroupIdentifier = "${appGroupId}"
  static let configPrefix = "kwilt_screen_time_prerequisite_config_v1."
  static let eventKey = "kwilt_screen_time_prerequisite_event_v1"
  static let shieldReasonKey = "kwilt_screen_time_shield_reason_v1"
  static let prerequisiteLabelKey = "kwilt_screen_time_prerequisite_label_v1"
  static let targetLabelKey = "kwilt_screen_time_target_label_v1"
  static let thresholdMinutesKey = "kwilt_screen_time_prerequisite_minutes_v1"

  static func safeIdentifier(_ value: String) -> String {
    let allowed = value.unicodeScalars.filter {
      CharacterSet.alphanumerics.contains($0) || $0 == "-" || $0 == "_"
    }
    let normalized = String(String.UnicodeScalarView(allowed)).prefix(48)
    return normalized.isEmpty ? "default" : String(normalized)
  }

  static func defaults() -> UserDefaults? {
    UserDefaults(suiteName: appGroupIdentifier)
  }

  static func configuration(for activity: DeviceActivityName) -> KwiltPrerequisiteMonitorConfiguration? {
    guard let data = defaults()?.data(forKey: "\\(configPrefix)\\(activity.rawValue)") else { return nil }
    return try? JSONDecoder().decode(KwiltPrerequisiteMonitorConfiguration.self, from: data)
  }

  static func store(for configuration: KwiltPrerequisiteMonitorConfiguration) -> ManagedSettingsStore {
    ManagedSettingsStore(named: ManagedSettingsStore.Name(
      "kwilt.prerequisite.\\(safeIdentifier(configuration.agreementId))"
    ))
  }

  static func applyTarget(for configuration: KwiltPrerequisiteMonitorConfiguration) {
    let store = store(for: configuration)
    let targetSelection = configuration.targetSelection
    store.shield.applications = targetSelection.applicationTokens.isEmpty
      ? nil
      : targetSelection.applicationTokens
    store.shield.applicationCategories = targetSelection.categoryTokens.isEmpty
      ? nil
      : .specific(targetSelection.categoryTokens, except: Set<ApplicationToken>())
    store.shield.webDomains = targetSelection.webDomainTokens.isEmpty
      ? nil
      : targetSelection.webDomainTokens
    let shared = defaults()
    shared?.set("family_prerequisite", forKey: shieldReasonKey)
    shared?.set(configuration.prerequisiteLabel, forKey: prerequisiteLabelKey)
    shared?.set(configuration.targetLabel, forKey: targetLabelKey)
    shared?.set(configuration.thresholdMinutes, forKey: thresholdMinutesKey)
  }

  static func record(kind: String, configuration: KwiltPrerequisiteMonitorConfiguration) {
    let receipt = KwiltPrerequisiteMonitorReceipt(
      kind: kind,
      agreementId: configuration.agreementId,
      policyVersion: configuration.policyVersion,
      occurredAtMs: Date().timeIntervalSince1970 * 1000.0
    )
    if let data = try? JSONEncoder().encode(receipt) {
      defaults()?.set(data, forKey: eventKey)
    }
  }
}

final class KwiltDeviceActivityMonitorExtension: DeviceActivityMonitor {
  override func intervalDidStart(for activity: DeviceActivityName) {
    super.intervalDidStart(for: activity)
    guard let configuration = KwiltPrerequisiteMonitorRuntime.configuration(for: activity) else { return }
    KwiltPrerequisiteMonitorRuntime.applyTarget(for: configuration)
    KwiltPrerequisiteMonitorRuntime.record(kind: "interval_started", configuration: configuration)
  }

  override func eventDidReachThreshold(
    _ event: DeviceActivityEvent.Name,
    activity: DeviceActivityName
  ) {
    super.eventDidReachThreshold(event, activity: activity)
    guard let configuration = KwiltPrerequisiteMonitorRuntime.configuration(for: activity) else { return }
    let store = KwiltPrerequisiteMonitorRuntime.store(for: configuration)
    store.clearAllSettings()
    KwiltPrerequisiteMonitorRuntime.record(kind: "threshold_reached", configuration: configuration)
  }

  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)
    guard let configuration = KwiltPrerequisiteMonitorRuntime.configuration(for: activity) else { return }
    KwiltPrerequisiteMonitorRuntime.store(for: configuration).clearAllSettings()
    KwiltPrerequisiteMonitorRuntime.record(kind: "interval_ended", configuration: configuration)
  }
}
`;
}

function infoPlist({ displayName, extensionPointIdentifier, principalClass }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key><string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key><string>${displayName}</string>
  <key>CFBundleExecutable</key><string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key><string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
  <key>CFBundleName</key><string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key><string>XPC!</string>
  <key>CFBundleShortVersionString</key><string>$(MARKETING_VERSION)</string>
  <key>CFBundleVersion</key><string>$(CURRENT_PROJECT_VERSION)</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key><string>${extensionPointIdentifier}</string>
    <key>NSExtensionPrincipalClass</key><string>${principalClass}</string>
  </dict>
</dict>
</plist>
`;
}

function entitlements(appGroupId) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.developer.family-controls</key><true/>
  <key>com.apple.security.application-groups</key>
  <array><string>${appGroupId}</string></array>
</dict>
</plist>
`;
}

function setBuildSettings(project, targetBundleId, entitlementsRel, config) {
  const section = project.pbxXCBuildConfigurationSection?.() || {};
  const version = typeof config?.version === 'string' ? config.version.trim() : '1.0.0';
  const buildNumber = typeof config?.ios?.buildNumber === 'string' ? config.ios.buildNumber.trim() : '1';
  Object.keys(section).forEach((key) => {
    const cfg = section[key];
    if (!cfg || cfg.isa !== 'XCBuildConfiguration') return;
    const buildSettings = cfg.buildSettings || {};
    const prodBundle = String(buildSettings.PRODUCT_BUNDLE_IDENTIFIER || '').replace(/^"|"$/g, '');
    if (prodBundle !== targetBundleId) return;
    buildSettings.CODE_SIGN_ENTITLEMENTS = `"${entitlementsRel}"`;
    buildSettings.CURRENT_PROJECT_VERSION = `"${buildNumber}"`;
    buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '"16.0"';
    buildSettings.MARKETING_VERSION = `"${version}"`;
    buildSettings.SWIFT_VERSION = buildSettings.SWIFT_VERSION || '"5.0"';
    cfg.buildSettings = buildSettings;
    section[key] = cfg;
  });
}

function ensureTarget(project, config, target) {
  const bundleId = config?.ios?.bundleIdentifier?.trim();
  if (!bundleId) throw new Error('KWILT_ENABLE_SCREEN_TIME=1 requires ios.bundleIdentifier.');

  const iosRoot = config.modRequest.platformProjectRoot;
  const projectRoot = config.modRequest.projectRoot;
  const appGroupId = appGroupIdFor(config);
  const targetBundleId = `${bundleId}.${target.suffix}`;
  const nativeTargets = project.pbxNativeTargetSection?.() || {};
  let targetUuid = Object.keys(nativeTargets).find((key) => String(nativeTargets[key]?.name || '').replace(/^"|"$/g, '') === target.name);
  if (!targetUuid) targetUuid = project.addTarget(target.name, 'app_extension', target.name, targetBundleId)?.uuid;
  if (!targetUuid) return project;

  ['Sources:PBXSourcesBuildPhase', 'Resources:PBXResourcesBuildPhase', 'Frameworks:PBXFrameworksBuildPhase'].forEach((phase) => {
    const [name, isa] = phase.split(':');
    if (!project.buildPhase(name, targetUuid)) project.addBuildPhase([], isa, name, targetUuid, 'app_extension');
  });

  ensureGroupRecursively(project, target.name);
  fs.mkdirSync(path.join(iosRoot, target.name), { recursive: true });

  const swiftRel = `${target.name}/${target.file}`;
  const infoRel = `${target.name}/${target.name}-Info.plist`;
  const entitlementsRel = `${target.name}/${target.name}.entitlements`;

  fs.writeFileSync(path.join(iosRoot, swiftRel), target.swift(appGroupId), 'utf8');
  fs.writeFileSync(path.join(iosRoot, infoRel), infoPlist(target), 'utf8');
  fs.writeFileSync(path.join(iosRoot, entitlementsRel), entitlements(appGroupId), 'utf8');

  project = addResourceFileToGroup({ filepath: infoRel, groupName: target.name, isBuildFile: false, project, targetUuid });
  project = addResourceFileToGroup({ filepath: entitlementsRel, groupName: target.name, isBuildFile: false, project, targetUuid });
  (target.resources || []).forEach((resource) => {
    const source = path.join(projectRoot, resource.source);
    const resourceRel = `${target.name}/${resource.file}`;
    fs.copyFileSync(source, path.join(iosRoot, resourceRel));
    project = addResourceFileToGroup({ filepath: resourceRel, groupName: target.name, isBuildFile: true, project, targetUuid });
  });
  project = addBuildSourceFileToGroup({ filepath: swiftRel, groupName: target.name, project, targetUuid });
  setBuildSettings(project, targetBundleId, entitlementsRel, config);
  return project;
}

function withScreenTimeShieldExtensions(config) {
  return withXcodeProject(config, (config) => {
    let project = config.modResults;
    [
      {
        name: 'KwiltShieldConfiguration',
        suffix: 'shield-configuration',
        file: 'KwiltShieldConfiguration.swift',
        swift: buildConfigurationSwift,
        resources: [{ source: 'assets/logo-white.png', file: 'KwiltShieldAppIcon.png' }],
        displayName: 'KwiltShieldConfiguration',
        extensionPointIdentifier: 'com.apple.ManagedSettingsUI.shield-configuration-service',
        principalClass: '$(PRODUCT_MODULE_NAME).KwiltShieldConfigurationExtension',
      },
      {
        name: 'KwiltShieldAction',
        suffix: 'shield-action',
        file: 'KwiltShieldAction.swift',
        swift: buildActionSwift,
        displayName: 'KwiltShieldAction',
        extensionPointIdentifier: 'com.apple.ManagedSettings.shield-action-service',
        principalClass: '$(PRODUCT_MODULE_NAME).KwiltShieldActionExtension',
      },
      {
        name: 'KwiltDeviceActivityMonitor',
        suffix: 'device-activity-monitor',
        file: 'KwiltDeviceActivityMonitor.swift',
        swift: buildDeviceActivityMonitorSwift,
        displayName: 'KwiltDeviceActivityMonitor',
        extensionPointIdentifier: 'com.apple.deviceactivity.monitor-extension',
        principalClass: '$(PRODUCT_MODULE_NAME).KwiltDeviceActivityMonitorExtension',
      },
    ].forEach((target) => {
      project = ensureTarget(project, config, target);
    });
    config.modResults = project;
    return config;
  });
}

module.exports = { withScreenTimeShieldExtensions };
