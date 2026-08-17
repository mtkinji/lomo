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

function buildRestrictionLedgerSwift(appGroupId) {
  return `private struct KwiltRestrictionLedgerEntry: Codable {
  let id: String
  let ruleId: String?
  let selectionId: String?
  let reason: String
  let label: String?
  let appliedAtMs: Double
  let applicationTokenKeys: [String]
  let categoryTokenKeys: [String]
  let webDomainTokenKeys: [String]
}

private enum KwiltRestrictionLedger {
  static let appGroupIdentifier = "${appGroupId}"
  static let entryPrefix = "kwilt_screen_time_restriction_v2."

  static func defaults() -> UserDefaults? {
    UserDefaults(suiteName: appGroupIdentifier)
  }

  static func safeIdentifier(_ value: String) -> String {
    let allowed = value.unicodeScalars.filter {
      CharacterSet.alphanumerics.contains($0) || $0 == "-" || $0 == "_" || $0 == "."
    }
    let normalized = String(String.UnicodeScalarView(allowed)).prefix(80)
    return normalized.isEmpty ? "default" : String(normalized)
  }

  static func tokenKey<T: Encodable>(_ token: T?) -> String? {
    guard let token, let data = try? JSONEncoder().encode(token) else { return nil }
    return data.base64EncodedString()
  }

  static func tokenKeys<T: Encodable & Hashable>(_ tokens: Set<T>) -> [String] {
    tokens.compactMap { tokenKey($0) }.sorted()
  }

  static func upsert(
    id: String,
    ruleId: String,
    selectionId: String,
    reason: String,
    label: String?,
    applicationTokenKeys: [String],
    categoryTokenKeys: [String],
    webDomainTokenKeys: [String]
  ) {
    let entry = KwiltRestrictionLedgerEntry(
      id: id,
      ruleId: ruleId,
      selectionId: selectionId,
      reason: reason,
      label: label,
      appliedAtMs: Date().timeIntervalSince1970 * 1000.0,
      applicationTokenKeys: applicationTokenKeys,
      categoryTokenKeys: categoryTokenKeys,
      webDomainTokenKeys: webDomainTokenKeys
    )
    guard let data = try? JSONEncoder().encode(entry) else { return }
    defaults()?.set(data, forKey: "\\(entryPrefix)\\(safeIdentifier(id))")
  }

  static func remove(id: String) {
    defaults()?.removeObject(forKey: "\\(entryPrefix)\\(safeIdentifier(id))")
  }

  static func entries() -> [KwiltRestrictionLedgerEntry] {
    guard let defaults = defaults() else { return [] }
    return defaults.dictionaryRepresentation().compactMap { element in
      let (key, value) = element
      guard key.hasPrefix(entryPrefix), let data = value as? Data else { return nil }
      return try? JSONDecoder().decode(KwiltRestrictionLedgerEntry.self, from: data)
    }
  }

  static func priority(for reason: String) -> Int {
    if reason == "focus_session_active" || reason == "focus" { return 400 }
    if reason == "family_prerequisite" { return 300 }
    if reason.hasPrefix("money_") { return 200 }
    if reason.hasPrefix("meaningful_first_") { return 100 }
    return 0
  }

  static func matchingRestrictions(
    applicationTokenKey: String? = nil,
    categoryTokenKey: String? = nil,
    webDomainTokenKey: String? = nil
  ) -> [KwiltRestrictionLedgerEntry] {
    entries().filter { entry in
      (applicationTokenKey.map { entry.applicationTokenKeys.contains($0) } ?? false)
        || (categoryTokenKey.map { entry.categoryTokenKeys.contains($0) } ?? false)
        || (webDomainTokenKey.map { entry.webDomainTokenKeys.contains($0) } ?? false)
    }.sorted { left, right in
      let leftPriority = priority(for: left.reason)
      let rightPriority = priority(for: right.reason)
      return leftPriority == rightPriority ? left.id < right.id : leftPriority > rightPriority
    }
  }
}
`;
}

function buildConfigurationSwift(appGroupId) {
  return `import Foundation
import ManagedSettings
import ManagedSettingsUI
import UIKit

${buildRestrictionLedgerSwift(appGroupId)}
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

  static func nextAction(for entry: KwiltRestrictionLedgerEntry) -> String {
    switch entry.reason {
    case "focus_session_active", "focus":
      return "return to Focus in Kwilt"
    case "family_prerequisite":
      let value = entry.label ?? "complete the family requirement"
      return value.prefix(1).lowercased() + String(value.dropFirst())
    case let reason where reason.hasPrefix("money_"):
      return "review \\(entry.label ?? "the required category") in Kwilt Money"
    case "meaningful_first_bypass":
      return "wait for the Kwilt pause to end"
    default:
      return "complete a to-do, record progress, or finish Focus in Kwilt"
    }
  }

  static func buttonLabel(for reason: String) -> String {
    if reason == "focus_session_active" || reason == "focus" { return "Open Focus" }
    if reason == "family_prerequisite" { return "Open Screen Time" }
    if reason.hasPrefix("money_") { return "Review in Money" }
    if reason == "meaningful_first_locked" { return "Open Today" }
    return "Open Kwilt"
  }

  static func countWord(_ count: Int) -> String {
    switch count {
    case 2: return "Two"
    case 3: return "Three"
    case 4: return "Four"
    default: return String(count)
    }
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

private enum KwiltShieldArtwork {
  private static let pine = UIColor(red: 0.192, green: 0.333, blue: 0.271, alpha: 1.0)
  private static let parchment = UIColor(red: 0.980, green: 0.969, blue: 0.929, alpha: 1.0)
  private static let parchmentDarker = UIColor(red: 0.965, green: 0.902, blue: 0.784, alpha: 1.0)
  private static let sumi = UIColor(red: 0.110, green: 0.102, blue: 0.098, alpha: 1.0)

  static func icon(appName: String) -> UIImage {
    let trimmed = appName.trimmingCharacters(in: .whitespacesAndNewlines)
    let appPrefix = String(trimmed.prefix(2))
    let monogram = String(appPrefix.prefix(1)).uppercased() + String(appPrefix.dropFirst()).lowercased()
    let renderer = UIGraphicsImageRenderer(size: CGSize(width: 236, height: 176))

    return renderer.image { rendererContext in
      let context = rendererContext.cgContext

      // The interrupted app leans behind Kwilt, like something gently set aside.
      let blockedTile = CGRect(x: 48, y: 38, width: 112, height: 112)
      context.saveGState()
      context.translateBy(x: blockedTile.midX, y: blockedTile.midY)
      context.rotate(by: -8 * .pi / 180)
      context.translateBy(x: -blockedTile.midX, y: -blockedTile.midY)
      context.setShadow(
        offset: CGSize(width: 0, height: 5),
        blur: 10,
        color: UIColor.black.withAlphaComponent(0.22).cgColor
      )
      parchmentDarker.setFill()
      UIBezierPath(roundedRect: blockedTile, cornerRadius: 28).fill()
      context.setShadow(offset: .zero, blur: 0, color: nil)

      let monogramText = monogram.isEmpty ? "•" : monogram
      let monogramFont = UIFont(name: "Inter-Black", size: 42)
        ?? UIFont.systemFont(ofSize: 42, weight: .black)
      let attributes: [NSAttributedString.Key: Any] = [
        .font: monogramFont,
        .foregroundColor: sumi,
      ]
      let monogramSize = (monogramText as NSString).size(withAttributes: attributes)
      (monogramText as NSString).draw(
        at: CGPoint(
          x: blockedTile.midX - monogramSize.width / 2,
          y: blockedTile.midY - monogramSize.height / 2 - 1
        ),
        withAttributes: attributes
      )
      context.restoreGState()

      // Kwilt owns the foreground because Kwilt is applying the pause.
      let kwiltTile = CGRect(x: 82, y: 20, width: 132, height: 132)
      context.saveGState()
      context.setShadow(
        offset: CGSize(width: -3, height: 6),
        blur: 16,
        color: UIColor.black.withAlphaComponent(0.28).cgColor
      )
      parchment.setFill()
      UIBezierPath(roundedRect: kwiltTile, cornerRadius: 28).fill()
      context.restoreGState()
      UIImage(named: "KwiltShieldAppIcon")?
        .withTintColor(pine, renderingMode: .alwaysOriginal)
        .draw(in: kwiltTile.insetBy(dx: 28, dy: 28))

      // A small, high-contrast state marker keeps the symbol readable at shield scale.
      let badgeFrame = CGRect(x: 174, y: 112, width: 54, height: 54)
      parchment.setFill()
      UIBezierPath(ovalIn: badgeFrame).fill()
      UIColor.black.setFill()
      UIBezierPath(ovalIn: badgeFrame.insetBy(dx: 3, dy: 3)).fill()
      parchment.setFill()
      UIBezierPath(roundedRect: CGRect(x: 191, y: 127, width: 6, height: 24), cornerRadius: 3).fill()
      UIBezierPath(roundedRect: CGRect(x: 205, y: 127, width: 6, height: 24), cornerRadius: 3).fill()
    }
  }
}

final class KwiltShieldConfigurationExtension: ShieldConfigurationDataSource {
  private let detailColor = UIColor(white: 1.0, alpha: 0.84)
  private let pine = UIColor(red: 0.192, green: 0.333, blue: 0.271, alpha: 1.0)

  private func configuration(
    appName: String,
    applicationTokenKey: String? = nil,
    categoryTokenKey: String? = nil,
    webDomainTokenKey: String? = nil
  ) -> ShieldConfiguration {
    let restrictions = KwiltRestrictionLedger.matchingRestrictions(
      applicationTokenKey: applicationTokenKey,
      categoryTokenKey: categoryTokenKey,
      webDomainTokenKey: webDomainTokenKey
    )
    let reason = restrictions.first?.reason ?? KwiltShieldCopy.reason()
    let title: String
    let subtitle: String
    if restrictions.count > 1, let first = restrictions.first, restrictions.indices.contains(1) {
      title = "\\(KwiltShieldCopy.countWord(restrictions.count)) things before \\(appName)."
      let remaining = restrictions.count - 2
      let suffix = remaining > 0 ? " \\(remaining) more rules will still apply." : ""
      subtitle = "First, \\(KwiltShieldCopy.nextAction(for: first)). Then \\(KwiltShieldCopy.nextAction(for: restrictions[1])).\\(suffix)"
    } else {
      title = KwiltShieldCopy.title(for: reason)
      subtitle = KwiltShieldCopy.subtitle(for: reason, appName: appName)
    }
    return ShieldConfiguration(
      backgroundBlurStyle: .dark,
      backgroundColor: pine,
      icon: KwiltShieldArtwork.icon(appName: appName),
      title: ShieldConfiguration.Label(text: title, color: UIColor.white),
      subtitle: ShieldConfiguration.Label(text: subtitle, color: detailColor),
      primaryButtonLabel: ShieldConfiguration.Label(text: KwiltShieldCopy.buttonLabel(for: reason), color: pine),
      primaryButtonBackgroundColor: UIColor.white,
      secondaryButtonLabel: nil
    )
  }

  override func configuration(shielding application: Application) -> ShieldConfiguration {
    configuration(
      appName: application.localizedDisplayName ?? "this app",
      applicationTokenKey: KwiltRestrictionLedger.tokenKey(application.token)
    )
  }

  override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration {
    configuration(
      appName: application.localizedDisplayName ?? category.localizedDisplayName ?? "this app",
      applicationTokenKey: KwiltRestrictionLedger.tokenKey(application.token),
      categoryTokenKey: KwiltRestrictionLedger.tokenKey(category.token)
    )
  }

  override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
    configuration(
      appName: webDomain.domain ?? "this website",
      webDomainTokenKey: KwiltRestrictionLedger.tokenKey(webDomain.token)
    )
  }

  override func configuration(shielding webDomain: WebDomain, in category: ActivityCategory) -> ShieldConfiguration {
    configuration(
      appName: webDomain.domain ?? category.localizedDisplayName ?? "this website",
      categoryTokenKey: KwiltRestrictionLedger.tokenKey(category.token),
      webDomainTokenKey: KwiltRestrictionLedger.tokenKey(webDomain.token)
    )
  }
}
`;
}

function buildActionSwift(appGroupId) {
return `import Foundation
import ManagedSettings

${buildRestrictionLedgerSwift(appGroupId)}
private enum KwiltReviewRequest {
  static let appGroupIdentifier = "${appGroupId}"
  static let requestedAtKey = "kwilt_screen_time_review_requested_at_v1"
  static let reasonKey = "kwilt_screen_time_shield_reason_v1"
  static let handoffReasonKey = "kwilt_screen_time_handoff_reason_v1"
  static let handoffRestrictionsKey = "kwilt_screen_time_handoff_restrictions_v2"

  static func record(restrictions: [KwiltRestrictionLedgerEntry]) {
    guard let defaults = UserDefaults(suiteName: appGroupIdentifier) else { return }
    defaults.set(
      Date().timeIntervalSince1970 * 1000.0,
      forKey: requestedAtKey
    )
    defaults.set(restrictions.first?.reason ?? legacyReason(), forKey: handoffReasonKey)
    if let data = try? JSONEncoder().encode(restrictions) {
      defaults.set(data, forKey: handoffRestrictionsKey)
    }
  }

  static func legacyReason() -> String {
    UserDefaults(suiteName: appGroupIdentifier)?.string(forKey: reasonKey) ?? "default"
  }
}

final class KwiltShieldActionExtension: ShieldActionDelegate {
  override func handle(action: ShieldAction, for application: ApplicationToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
    handle(
      action: action,
      restrictions: KwiltRestrictionLedger.matchingRestrictions(
        applicationTokenKey: KwiltRestrictionLedger.tokenKey(application)
      ),
      completionHandler: completionHandler
    )
  }

  override func handle(action: ShieldAction, for category: ActivityCategoryToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
    handle(
      action: action,
      restrictions: KwiltRestrictionLedger.matchingRestrictions(
        categoryTokenKey: KwiltRestrictionLedger.tokenKey(category)
      ),
      completionHandler: completionHandler
    )
  }

  override func handle(action: ShieldAction, for webDomain: WebDomainToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
    handle(
      action: action,
      restrictions: KwiltRestrictionLedger.matchingRestrictions(
        webDomainTokenKey: KwiltRestrictionLedger.tokenKey(webDomain)
      ),
      completionHandler: completionHandler
    )
  }

  private func handle(
    action: ShieldAction,
    restrictions: [KwiltRestrictionLedgerEntry],
    completionHandler: @escaping (ShieldActionResponse) -> Void
  ) {
    switch action {
    case .primaryButtonPressed:
      if #available(iOS 26.5, *), let openKwilt = ShieldActionResponse(rawValue: 3) {
        KwiltReviewRequest.record(restrictions: restrictions)
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

${buildRestrictionLedgerSwift(appGroupId)}
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
    let minutes = configuration.thresholdMinutes
    KwiltRestrictionLedger.upsert(
      id: "prerequisite.\\(configuration.agreementId)",
      ruleId: configuration.agreementId,
      selectionId: configuration.targetSelectionId,
      reason: "family_prerequisite",
      label: "Use \\(configuration.prerequisiteLabel) for \\(minutes) minute\\(minutes == 1 ? "" : "s")",
      applicationTokenKeys: KwiltRestrictionLedger.tokenKeys(targetSelection.applicationTokens),
      categoryTokenKeys: KwiltRestrictionLedger.tokenKeys(targetSelection.categoryTokens),
      webDomainTokenKeys: KwiltRestrictionLedger.tokenKeys(targetSelection.webDomainTokens)
    )
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
    KwiltRestrictionLedger.remove(id: "prerequisite.\\(configuration.agreementId)")
    KwiltPrerequisiteMonitorRuntime.record(kind: "threshold_reached", configuration: configuration)
  }

  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)
    guard let configuration = KwiltPrerequisiteMonitorRuntime.configuration(for: activity) else { return }
    KwiltPrerequisiteMonitorRuntime.store(for: configuration).clearAllSettings()
    KwiltRestrictionLedger.remove(id: "prerequisite.\\(configuration.agreementId)")
    KwiltPrerequisiteMonitorRuntime.record(kind: "interval_ended", configuration: configuration)
  }
}
`;
}

function infoPlist({ displayName, extensionPointIdentifier, principalClass, fonts = [] }) {
  const fontEntries = fonts.length
    ? `  <key>UIAppFonts</key>
  <array>
${fonts.map((font) => `    <string>${font}</string>`).join('\n')}
  </array>
`
    : '';
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
${fontEntries}  <key>NSExtension</key>
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
        resources: [
          { source: 'assets/logo-white.png', file: 'KwiltShieldAppIcon.png' },
          {
            source: 'node_modules/@expo-google-fonts/inter/900Black/Inter_900Black.ttf',
            file: 'KwiltShieldInterBlack.ttf',
          },
        ],
        fonts: ['KwiltShieldInterBlack.ttf'],
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

module.exports = {
  buildActionSwift,
  buildConfigurationSwift,
  buildDeviceActivityMonitorSwift,
  buildRestrictionLedgerSwift,
  infoPlist,
  withScreenTimeShieldExtensions,
};
