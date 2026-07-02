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
      return "Focus session is protecting this"
    case "meaningful_first_locked":
      return "Open Kwilt to unlock"
    case "meaningful_first_bypass":
      return "Kwilt pause is active"
    default:
      return "Open Kwilt to unlock"
    }
  }

  static func subtitle(for reason: String, appName: String) -> String {
    switch reason {
    case "focus_session_active", "focus":
      return "Kwilt is keeping \\(appName) closed until your Focus session ends."
    case "meaningful_first_locked":
      return "Mark a to-do done, record progress, or finish a Focus session in Kwilt to unblock \\(appName) for today."
    case "meaningful_first_bypass":
      return "\\(appName) opens again when your short pause ends. Open Kwilt to change it."
    default:
      return "Mark a to-do done, record progress, or finish a Focus session in Kwilt to unblock \\(appName) for today."
    }
  }
}

final class KwiltShieldConfigurationExtension: ShieldConfigurationDataSource {
  private let backgroundColor = UIColor(red: 0.953, green: 0.972, blue: 0.953, alpha: 1.0)
  private let foregroundColor = UIColor(red: 0.192, green: 0.333, blue: 0.271, alpha: 1.0)
  private let detailColor = UIColor(red: 0.361, green: 0.435, blue: 0.396, alpha: 1.0)

  private func configuration(appName: String) -> ShieldConfiguration {
    let reason = KwiltShieldCopy.reason()
    return ShieldConfiguration(
      backgroundColor: backgroundColor,
      icon: UIImage(named: "KwiltShieldAppIcon") ?? UIImage(systemName: "app.badge.clock")?.withTintColor(foregroundColor, renderingMode: .alwaysOriginal),
      title: ShieldConfiguration.Label(text: KwiltShieldCopy.title(for: reason), color: foregroundColor),
      subtitle: ShieldConfiguration.Label(text: KwiltShieldCopy.subtitle(for: reason, appName: appName), color: detailColor),
      primaryButtonLabel: ShieldConfiguration.Label(text: "Open Kwilt", color: UIColor.white),
      primaryButtonBackgroundColor: foregroundColor,
      secondaryButtonLabel: ShieldConfiguration.Label(text: "Close \\(appName)", color: detailColor)
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

const actionSwift = `import ManagedSettings

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

function entitlements() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict/>
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
  fs.writeFileSync(path.join(iosRoot, entitlementsRel), entitlements(), 'utf8');

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
        resources: [{ source: 'assets/icon.png', file: 'KwiltShieldAppIcon.png' }],
        displayName: 'KwiltShieldConfiguration',
        extensionPointIdentifier: 'com.apple.ManagedSettingsUI.shield-configuration-service',
        principalClass: '$(PRODUCT_MODULE_NAME).KwiltShieldConfigurationExtension',
      },
      {
        name: 'KwiltShieldAction',
        suffix: 'shield-action',
        file: 'KwiltShieldAction.swift',
        swift: () => actionSwift,
        displayName: 'KwiltShieldAction',
        extensionPointIdentifier: 'com.apple.ManagedSettings.shield-action-service',
        principalClass: '$(PRODUCT_MODULE_NAME).KwiltShieldActionExtension',
      },
    ].forEach((target) => {
      project = ensureTarget(project, config, target);
    });
    config.modResults = project;
    return config;
  });
}

module.exports = { withScreenTimeShieldExtensions };
