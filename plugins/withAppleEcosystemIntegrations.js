// Expo config plugin: adds minimal native iOS foundations for Apple ecosystem surfaces.
//
// This repo ignores `/ios` in git; we therefore inject native source files + entitlements
// at prebuild time instead of committing Xcode project changes.

const {
  withEntitlementsPlist,
  withXcodeProject,
  withAppDelegate,
  withDangerousMod,
} = require('@expo/config-plugins');
const { withBuildSourceFile } = require('@expo/config-plugins/build/ios/XcodeProjectFile');
const { ensureGroupRecursively, addBuildSourceFileToGroup, addResourceFileToGroup, getProjectName } = require('@expo/config-plugins/build/ios/utils/Xcodeproj');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');

const fs = require('fs');
const path = require('path');

const KWILT_APP_GROUP_FALLBACK = 'group.com.andrewwatanabe.kwilt';

function getAppGroupId(config) {
  const bundleId = config?.ios?.bundleIdentifier;
  if (typeof bundleId === 'string' && bundleId.trim()) {
    return `group.${bundleId.trim()}`;
  }
  return KWILT_APP_GROUP_FALLBACK;
}

const KWILT_APP_GROUP_SWIFT = `import Foundation
import React

@objc(KwiltAppGroup)
class KwiltAppGroup: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }

  private func userDefaults(for appGroup: String) -> UserDefaults? {
    return UserDefaults(suiteName: appGroup)
  }

  @objc(setString:value:appGroup:resolver:rejecter:)
  func setString(
    _ key: String,
    value: String,
    appGroup: String,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    guard let defaults = userDefaults(for: appGroup) else {
      reject("E_NO_APP_GROUP", "Could not open UserDefaults for App Group '\\(appGroup)'", nil)
      return
    }
    defaults.set(value, forKey: key)
    resolve(true)
  }

  @objc(getString:appGroup:resolver:rejecter:)
  func getString(
    _ key: String,
    appGroup: String,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    guard let defaults = userDefaults(for: appGroup) else {
      reject("E_NO_APP_GROUP", "Could not open UserDefaults for App Group '\\(appGroup)'", nil)
      return
    }
    let value = defaults.string(forKey: key)
    resolve(value)
  }
}
`;

const KWILT_APP_GROUP_EXTERN = `#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(KwiltAppGroup, NSObject)

RCT_EXTERN_METHOD(
  setString:(NSString *)key
  value:(NSString *)value
  appGroup:(NSString *)appGroup
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  getString:(NSString *)key
  appGroup:(NSString *)appGroup
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

@end
`;

const KWILT_SPOTLIGHT_SWIFT = `import Foundation
import React
import CoreSpotlight
import UniformTypeIdentifiers

@objc(KwiltSpotlight)
class KwiltSpotlight: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc(indexActivitiesJson:resolver:rejecter:)
  func indexActivitiesJson(
    _ json: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let data = json.data(using: .utf8) else {
      reject("E_BAD_JSON", "Could not encode JSON string", nil)
      return
    }

    let raw: Any
    do {
      raw = try JSONSerialization.jsonObject(with: data, options: [])
    } catch {
      reject("E_BAD_JSON", "Could not parse JSON", error)
      return
    }

    guard let arr = raw as? [[String: Any]] else {
      reject("E_BAD_JSON", "Expected an array payload", nil)
      return
    }

    let items: [CSSearchableItem] = arr.compactMap { entry in
      guard let id = entry["id"] as? String else { return nil }
      let title = (entry["title"] as? String) ?? "Activity"

      let set = CSSearchableItemAttributeSet(contentType: UTType.item)
      set.title = title
      set.contentDescription = "Kwilt Activity"
      set.contentURL = URL(string: "kwilt://activity/\\(id)")

      return CSSearchableItem(uniqueIdentifier: id, domainIdentifier: "kwilt.activities", attributeSet: set)
    }

    CSSearchableIndex.default().indexSearchableItems(items) { error in
      if let error = error {
        reject("E_INDEX_FAILED", "Failed to index Spotlight items", error)
        return
      }
      resolve(true)
    }
  }

  @objc(clearActivities:rejecter:)
  func clearActivities(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    CSSearchableIndex.default().deleteSearchableItems(withDomainIdentifiers: ["kwilt.activities"]) { error in
      if let error = error {
        reject("E_CLEAR_FAILED", "Failed to clear Spotlight items", error)
        return
      }
      resolve(true)
    }
  }
}
`;

const KWILT_SPOTLIGHT_EXTERN = `#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(KwiltSpotlight, NSObject)

RCT_EXTERN_METHOD(
  indexActivitiesJson:(NSString *)json
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  clearActivities:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

@end
`;

function buildAppIntentsSwift({ appGroupId }) {
  return `import Foundation

#if canImport(AppIntents)
import AppIntents
#endif

#if canImport(UIKit)
import UIKit
#endif

struct GlanceableStateV1: Codable {
  struct NextUp: Codable {
    let activityId: String
  }
  struct FocusSession: Codable {
    let activityId: String
  }
  let version: Int
  let nextUp: NextUp?
  let focusSession: FocusSession?
}

func readGlanceableState() -> GlanceableStateV1? {
  let defaults = UserDefaults(suiteName: "${appGroupId}")
  guard let json = defaults?.string(forKey: "kwilt_glanceable_state_v1") else { return nil }
  guard let data = json.data(using: .utf8) else { return nil }
  return try? JSONDecoder().decode(GlanceableStateV1.self, from: data)
}

@available(iOS 16.0, *)
struct OpenTodayIntent: AppIntent {
  static var title: LocalizedStringResource = "Open Today"
  static var description = IntentDescription("Open Kwilt to your Today canvas.")
  static var openAppWhenRun = true

  @MainActor
  func perform() async throws -> some IntentResult {
    if let url = URL(string: "kwilt://today") {
      await UIApplication.shared.open(url)
    }
    return .result()
  }
}

@available(iOS 16.0, *)
struct OpenNextUpIntent: AppIntent {
  static var title: LocalizedStringResource = "Open Next Up"
  static var description = IntentDescription("Open your next scheduled Activity in Kwilt.")
  static var openAppWhenRun = true

  @MainActor
  func perform() async throws -> some IntentResult {
    if let state = readGlanceableState(), state.version == 1, let next = state.nextUp {
      if let url = URL(string: "kwilt://activity/\\(next.activityId)") {
        await UIApplication.shared.open(url)
        return .result()
      }
    }
    if let url = URL(string: "kwilt://today") {
      await UIApplication.shared.open(url)
    }
    return .result()
  }
}

@available(iOS 16.0, *)
struct StartFocusIntent: AppIntent {
  static var title: LocalizedStringResource = "Start Focus"
  static var description = IntentDescription("Start a Focus session for an Activity (best-effort).")
  static var openAppWhenRun = true

  @Parameter(title: "Minutes")
  var minutes: Int

  @Parameter(title: "Activity ID")
  var activityId: String?

  static var parameterSummary: some ParameterSummary {
    Summary("Start Focus for \\(\\.$activityId) for \\(\\.$minutes) minutes")
  }

  init() {
    self.minutes = 25
    self.activityId = nil
  }

  @MainActor
  func perform() async throws -> some IntentResult {
    let safeMinutes = max(1, min(180, minutes))
    let explicitId = activityId?.trimmingCharacters(in: .whitespacesAndNewlines)
    let id = (explicitId?.isEmpty == false) ? explicitId : readGlanceableState()?.nextUp?.activityId
    if let id = id, let url = URL(string: "kwilt://activity/\\(id)?autoStartFocus=1&minutes=\\(safeMinutes)") {
      await UIApplication.shared.open(url)
      return .result()
    }
    if let url = URL(string: "kwilt://today") { await UIApplication.shared.open(url) }
    return .result()
  }
}

@available(iOS 16.0, *)
struct EndFocusIntent: AppIntent {
  static var title: LocalizedStringResource = "End Focus"
  static var description = IntentDescription("End the current Focus session (best-effort).")
  static var openAppWhenRun = true

  @MainActor
  func perform() async throws -> some IntentResult {
    if let state = readGlanceableState(), state.version == 1, let focus = state.focusSession {
      if let url = URL(string: "kwilt://activity/\\(focus.activityId)?endFocus=1") {
        await UIApplication.shared.open(url)
        return .result()
      }
    }
    // Fallback: just open the app.
    if let url = URL(string: "kwilt://today") { await UIApplication.shared.open(url) }
    return .result()
  }
}

@available(iOS 16.0, *)
struct KwiltAppShortcutsProvider: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    return [
      AppShortcut(
        intent: OpenTodayIntent(),
        phrases: ["Open Today in \\(.applicationName)", "Open \\(.applicationName) Today"],
        shortTitle: "Today",
        systemImageName: "sun.max"
      ),
      AppShortcut(
        intent: OpenNextUpIntent(),
        phrases: ["Open Next Up in \\(.applicationName)", "Next Up in \\(.applicationName)"],
        shortTitle: "Next Up",
        systemImageName: "calendar"
      ),
      AppShortcut(
        intent: StartFocusIntent(),
        phrases: ["Start Focus in \\(.applicationName)", "Focus in \\(.applicationName)"],
        shortTitle: "Start Focus",
        systemImageName: "timer"
      ),
      AppShortcut(
        intent: EndFocusIntent(),
        phrases: ["End Focus in \\(.applicationName)", "Stop Focus in \\(.applicationName)"],
        shortTitle: "End Focus",
        systemImageName: "stop.circle"
      ),
    ]
  }
}
`;
}

const KWILT_FOCUS_LIVE_ACTIVITY_SHARED_SWIFT = `import Foundation

#if canImport(ActivityKit)
import ActivityKit
#endif

// Shared Live Activity attributes used by both the app target and the Widget extension.
// IMPORTANT: this file must be included in BOTH targets so ActivityKit type identity matches.

#if canImport(ActivityKit)
@available(iOS 16.1, *)
public struct KwiltFocusAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    public var title: String
    public var startedAtMs: Int64
    public var endAtMs: Int64
  }

  public var activityId: String

  public init(activityId: String) {
    self.activityId = activityId
  }
}
#endif
`;

const KWILT_LIVE_ACTIVITY_MODULE_SWIFT = `import Foundation
import React

#if canImport(ActivityKit)
import ActivityKit
#endif

@objc(KwiltLiveActivity)
class KwiltLiveActivity: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }

#if canImport(ActivityKit)
  @available(iOS 16.1, *)
  private static var current: Activity<KwiltFocusAttributes>?
#endif

  @objc(start:title:startedAtMs:endAtMs:resolver:rejecter:)
  func start(
    _ activityId: String,
    title: String,
    startedAtMs: NSNumber,
    endAtMs: NSNumber,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
#if canImport(ActivityKit)
    if #available(iOS 16.1, *) {
      Task {
        do {
          if let existing = KwiltLiveActivity.current {
            await existing.end(dismissalPolicy: .immediate)
            KwiltLiveActivity.current = nil
          }

          let attributes = KwiltFocusAttributes(activityId: activityId)
          let state = KwiltFocusAttributes.ContentState(
            title: title,
            startedAtMs: startedAtMs.int64Value,
            endAtMs: endAtMs.int64Value
          )
          if #available(iOS 16.2, *) {
            let content = ActivityContent(state: state, staleDate: nil)
            KwiltLiveActivity.current = try Activity.request(attributes: attributes, content: content, pushType: nil)
          } else {
            KwiltLiveActivity.current = try Activity.request(attributes: attributes, contentState: state, pushType: nil)
          }
          resolve(true)
        } catch {
          reject("E_LIVE_ACTIVITY_START", "Failed to start Live Activity", error)
        }
      }
      return
    }
#endif
    resolve(false)
  }

  @objc(update:title:startedAtMs:endAtMs:resolver:rejecter:)
  func update(
    _ activityId: String,
    title: String,
    startedAtMs: NSNumber,
    endAtMs: NSNumber,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
#if canImport(ActivityKit)
    if #available(iOS 16.1, *) {
      Task {
        guard let current = KwiltLiveActivity.current else {
          resolve(false)
          return
        }

        if current.attributes.activityId != activityId {
          // If the activityId changed, restart to avoid mismatched state.
          await current.end(dismissalPolicy: .immediate)
          KwiltLiveActivity.current = nil
          resolve(false)
          return
        }

        let state = KwiltFocusAttributes.ContentState(
          title: title,
          startedAtMs: startedAtMs.int64Value,
          endAtMs: endAtMs.int64Value
        )
        if #available(iOS 16.2, *) {
          await current.update(ActivityContent(state: state, staleDate: nil))
        } else {
          await current.update(using: state)
        }
        resolve(true)
      }
      return
    }
#endif
    resolve(false)
  }

  @objc(end:rejecter:)
  func end(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
#if canImport(ActivityKit)
    if #available(iOS 16.1, *) {
      Task {
        if let current = KwiltLiveActivity.current {
          await current.end(dismissalPolicy: .immediate)
          KwiltLiveActivity.current = nil
        }
        resolve(true)
      }
      return
    }
#endif
    resolve(false)
  }
}
`;

const KWILT_LIVE_ACTIVITY_MODULE_EXTERN = `#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(KwiltLiveActivity, NSObject)

RCT_EXTERN_METHOD(
  start:(NSString *)activityId
  title:(NSString *)title
  startedAtMs:(nonnull NSNumber *)startedAtMs
  endAtMs:(nonnull NSNumber *)endAtMs
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  update:(NSString *)activityId
  title:(NSString *)title
  startedAtMs:(nonnull NSNumber *)startedAtMs
  endAtMs:(nonnull NSNumber *)endAtMs
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  end:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

@end
`;

module.exports = function withAppleEcosystemIntegrations(config) {
  const enableAppGroups = String(process.env.KWILT_ENABLE_APP_GROUPS || '0') === '1';
  const enableWidgets = String(process.env.KWILT_ENABLE_WIDGETS || '0') === '1';
  const appGroupId = getAppGroupId(config);
  // 1) App Group entitlement (shared state for widgets/live activities later)
  if (enableAppGroups) {
    config = withEntitlementsPlist(config, (config) => {
      const entitlements = config.modResults;
      const existing = entitlements['com.apple.security.application-groups'];
      const next = Array.isArray(existing) ? existing.slice() : [];
      if (!next.includes(appGroupId)) next.push(appGroupId);
      entitlements['com.apple.security.application-groups'] = next;
      config.modResults = entitlements;
      return config;
    });
  }

  // 2) Native source files (bridged modules + App Intents)
  config = withBuildSourceFile(config, {
    filePath: 'KwiltAppGroup.swift',
    contents: KWILT_APP_GROUP_SWIFT,
    overwrite: false,
  });
  config = withBuildSourceFile(config, {
    filePath: 'KwiltAppGroup.m',
    contents: KWILT_APP_GROUP_EXTERN,
    overwrite: false,
  });
  config = withBuildSourceFile(config, {
    filePath: 'KwiltSpotlight.swift',
    contents: KWILT_SPOTLIGHT_SWIFT,
    overwrite: false,
  });
  config = withBuildSourceFile(config, {
    filePath: 'KwiltSpotlight.m',
    contents: KWILT_SPOTLIGHT_EXTERN,
    overwrite: false,
  });
  config = withBuildSourceFile(config, {
    filePath: 'KwiltAppIntents.swift',
    contents: buildAppIntentsSwift({ appGroupId }),
    overwrite: true,
  });

  // Shared ActivityAttributes used by both the app and widget extension.
  config = withBuildSourceFile(config, {
    filePath: 'KwiltFocusLiveActivity.swift',
    contents: KWILT_FOCUS_LIVE_ACTIVITY_SHARED_SWIFT,
    overwrite: true,
  });

  // ActivityKit bridge (start/update/end Live Activity from JS).
  config = withBuildSourceFile(config, {
    filePath: 'KwiltLiveActivity.swift',
    contents: KWILT_LIVE_ACTIVITY_MODULE_SWIFT,
    overwrite: true,
  });
  config = withBuildSourceFile(config, {
    filePath: 'KwiltLiveActivity.m',
    contents: KWILT_LIVE_ACTIVITY_MODULE_EXTERN,
    overwrite: true,
  });

  // Spotlight open routing: selecting a Spotlight result often launches the app via NSUserActivity
  // (CSSearchableItemActionType) instead of a URL. Translate this to a deep link so we always land
  // in the existing shell/canvas (Activity detail).
  config = withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error(
        `Cannot setup Spotlight user activity handling because AppDelegate is not Swift: ${config.modResults.language}`,
      );
    }

    const importSrc = 'import CoreSpotlight';
    const importAnchor = /import ReactAppDependencyProvider/;
    config.modResults.contents = mergeContents({
      src: config.modResults.contents,
      newSrc: importSrc,
      tag: 'kwilt_spotlight_import',
      anchor: importAnchor,
      offset: 1,
      comment: '//',
    }).contents;

    const handlerSrc = `
if userActivity.activityType == CSSearchableItemActionType,
   let info = userActivity.userInfo,
   let id = info[CSSearchableItemActivityIdentifier] as? String,
   let url = URL(string: "kwilt://activity/\\(id)") {
  // Route Spotlight opens through the standard RN Linking path.
  let handled = RCTLinkingManager.application(application, open: url, options: [:])
  if handled { return true }
}
`.trim();

    const handlerAnchor = /let result = RCTLinkingManager\.application/;
    config.modResults.contents = mergeContents({
      src: config.modResults.contents,
      newSrc: handlerSrc,
      tag: 'kwilt_spotlight_open',
      anchor: handlerAnchor,
      offset: 0,
      comment: '//',
    }).contents;

    return config;
  });

  // 2.5) Podfile signing fix for EAS / Xcode 14+:
  // Resource bundle targets may be signed by default, which can fail in CI unless a team is set
  // (or signing is disabled). Since `/ios` is gitignored, we patch the GENERATED Podfile at prebuild.
  if (enableAppGroups || enableWidgets) {
    config = withDangerousMod(config, [
      'ios',
      async (config) => {
        const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
        if (!fs.existsSync(podfilePath)) return config;
        let contents = fs.readFileSync(podfilePath, 'utf8');
        if (contents.includes('kwilt_eas_bundle_signing_fix')) return config;

        const postInstallAnchor = 'post_install do |installer|';
        const startIdx = contents.indexOf(postInstallAnchor);
        if (startIdx === -1) return config;

        const endMarker = '\n  end\nend';
        const endIdx = contents.indexOf(endMarker, startIdx);
        if (endIdx === -1) return config;

        const teamId = config?.ios?.appleTeamId || process.env.APPLE_TEAM_ID || 'BK3N7YXHN7';
        const rubyPatch = `

    # kwilt_eas_bundle_signing_fix
    # Starting from Xcode 14, resource bundles may be code signed by default.
    # Ensure a team is set and disable signing for .bundle targets to avoid CI failures.
    team_id = ENV['APPLE_TEAM_ID'] || '${teamId}'
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        build_config.build_settings['DEVELOPMENT_TEAM'] = team_id
        if target.respond_to?(:product_type) && target.product_type == 'com.apple.product-type.bundle'
          build_config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
          build_config.build_settings['CODE_SIGNING_REQUIRED'] = 'NO'
          build_config.build_settings['CODE_SIGNING_IDENTITY'] = ''
          build_config.build_settings['EXPANDED_CODE_SIGN_IDENTITY'] = ''
          build_config.build_settings['CODE_SIGNING_IDENTITY[sdk=iphoneos*]'] = ''
          build_config.build_settings['EXPANDED_CODE_SIGN_IDENTITY[sdk=iphoneos*]'] = ''
        end
      end
    end

    # Also ensure the user Xcode project targets (app + extensions) have a team set.
    installer.aggregate_targets
             .map(&:user_project)
             .compact
             .uniq
             .each do |project|
      project.targets.each do |target|
        target.build_configurations.each do |build_config|
          build_config.build_settings['DEVELOPMENT_TEAM'] = team_id

          if target.respond_to?(:product_type) && target.product_type == 'com.apple.product-type.bundle'
            build_config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
            build_config.build_settings['CODE_SIGNING_REQUIRED'] = 'NO'
            build_config.build_settings['CODE_SIGNING_IDENTITY'] = ''
            build_config.build_settings['EXPANDED_CODE_SIGN_IDENTITY'] = ''
            build_config.build_settings['CODE_SIGNING_IDENTITY[sdk=iphoneos*]'] = ''
            build_config.build_settings['EXPANDED_CODE_SIGN_IDENTITY[sdk=iphoneos*]'] = ''
          end
        end
      end
      project.save
    end
`.replace(/^\n/, '');

        contents = contents.slice(0, endIdx) + rubyPatch + contents.slice(endIdx);
        fs.writeFileSync(podfilePath, contents);
        return config;
      },
    ]);
  }

  // 3) WidgetKit extension target (Lock Screen widget + Live Activity UI shell).
  // NOTE: this repo ignores `/ios`, so we create the target and files during prebuild.
  if (enableWidgets) config = withXcodeProject(config, (config) => {
    let project = config.modResults;
    const projectName = getProjectName(config.modRequest.projectRoot);
    const bundleId = config?.ios?.bundleIdentifier || 'com.andrewwatanabe.kwilt';
    const appGroupId = getAppGroupId(config);

    const targetName = `${projectName}Widgets`;
    const targetSubfolder = targetName;
    const targetBundleId = `${bundleId}.widgets`;

    // Idempotency: skip if the target already exists.
    const nativeTargets = project.pbxNativeTargetSection?.() || {};
    const existingTargetKey = Object.keys(nativeTargets).find((k) => {
      const t = nativeTargets[k];
      if (!t || typeof t !== 'object') return false;
      const name = String(t.name || '').replace(/^"|"$/g, '');
      return name === targetName;
    });

    let targetUuid = existingTargetKey;
    if (!targetUuid) {
      const added = project.addTarget(targetName, 'app_extension', targetSubfolder, targetBundleId);
      targetUuid = added?.uuid;
    }
    if (!targetUuid) {
      return config;
    }

    // IMPORTANT:
    // `xcode.addTarget(..., 'app_extension', ...)` creates a target WITHOUT build phases.
    // The xcode library will then "fall back" to the first app target's build phases when
    // adding files, which can accidentally compile widget sources into the main app target.
    // We must ensure the extension target has its own Sources/Resources/Frameworks phases.
    const ensureBuildPhase = (phaseName, isa) => {
      try {
        const existing = project.buildPhase(phaseName, targetUuid);
        if (!existing) {
          project.addBuildPhase([], isa, phaseName, targetUuid, 'app_extension');
        }
      } catch {
        // If anything goes wrong, don't block the build; worst case EAS will surface it.
      }
    };
    ensureBuildPhase('Sources', 'PBXSourcesBuildPhase');
    ensureBuildPhase('Resources', 'PBXResourcesBuildPhase');
    ensureBuildPhase('Frameworks', 'PBXFrameworksBuildPhase');

    // Ensure the PBXGroup exists so file linking doesn't throw.
    ensureGroupRecursively(project, targetSubfolder);

    const iosRoot = config.modRequest.platformProjectRoot;
    const targetRootAbs = path.join(iosRoot, targetSubfolder);
    if (!fs.existsSync(targetRootAbs)) {
      fs.mkdirSync(targetRootAbs, { recursive: true });
    }

    const infoPlistRel = `${targetSubfolder}/${targetSubfolder}-Info.plist`;
    const infoPlistAbs = path.join(iosRoot, infoPlistRel);
    if (!fs.existsSync(infoPlistAbs)) {
      fs.writeFileSync(
        infoPlistAbs,
        `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDisplayName</key>
  <string>${targetName}</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
  </dict>
</dict>
</plist>
`,
        'utf8',
      );
    }

    const entitlementsRel = `${targetSubfolder}/${targetSubfolder}.entitlements`;
    const entitlementsAbs = path.join(iosRoot, entitlementsRel);
    fs.writeFileSync(
      entitlementsAbs,
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${appGroupId}</string>
  </array>
</dict>
</plist>
`,
      'utf8',
    );

    const widgetSwiftRel = `${targetSubfolder}/${targetSubfolder}.swift`;
    const widgetSwiftAbs = path.join(iosRoot, widgetSwiftRel);
    fs.writeFileSync(
      widgetSwiftAbs,
      `import WidgetKit
import SwiftUI

// NOTE: v1 is intentionally minimal. Widgets/Live Activities should preserve the app shell/canvas
// by deep-linking into existing screens (e.g. kwilt://today, kwilt://activity/<id>?openFocus=1).

struct SimpleEntry: TimelineEntry {
  let date: Date
  let title: String
  let deepLink: URL?
}

struct GlanceableStateV1: Codable {
  struct NextUp: Codable {
    let activityId: String
    let title: String
    let scheduledAtMs: Double?
  }
  let version: Int
  let updatedAtMs: Double
  let nextUp: NextUp?
}

func readGlanceableState() -> GlanceableStateV1? {
  let defaults = UserDefaults(suiteName: "${appGroupId}")
  guard let json = defaults?.string(forKey: "kwilt_glanceable_state_v1") else { return nil }
  guard let data = json.data(using: .utf8) else { return nil }
  return try? JSONDecoder().decode(GlanceableStateV1.self, from: data)
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> SimpleEntry {
    SimpleEntry(date: Date(), title: "Open Kwilt", deepLink: URL(string: "kwilt://today"))
  }

  func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> Void) {
    if let state = readGlanceableState(), state.version == 1, let next = state.nextUp {
      completion(SimpleEntry(date: Date(), title: next.title, deepLink: URL(string: "kwilt://activity/\\(next.activityId)")))
      return
    }
    completion(SimpleEntry(date: Date(), title: "Open Kwilt", deepLink: URL(string: "kwilt://today")))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> Void) {
    let entry: SimpleEntry
    if let state = readGlanceableState(), state.version == 1, let next = state.nextUp {
      entry = SimpleEntry(date: Date(), title: next.title, deepLink: URL(string: "kwilt://activity/\\(next.activityId)"))
    } else {
      entry = SimpleEntry(date: Date(), title: "Open Kwilt", deepLink: URL(string: "kwilt://today"))
    }
    completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(60))))
  }
}

struct KwiltWidgetsEntryView: View {
  var entry: Provider.Entry

  var body: some View {
    if let url = entry.deepLink {
      Link(destination: url) {
        Text(entry.title)
          .font(.headline)
          .lineLimit(2)
      }
    } else {
      Text(entry.title).font(.headline)
    }
  }
}

struct KwiltQuickWidget: Widget {
  let kind: String = "${targetName}.quick"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      KwiltWidgetsEntryView(entry: entry)
    }
    .configurationDisplayName("Kwilt")
    .description("Quick entrypoints into your plan.")
    .supportedFamilies([.accessoryRectangular, .accessoryCircular, .systemSmall])
  }
}

#if canImport(ActivityKit)
import ActivityKit

@available(iOS 16.1, *)
struct KwiltFocusLiveActivityWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: KwiltFocusAttributes.self) { context in
      VStack(alignment: .leading, spacing: 6) {
        Text("Focus").font(.caption).foregroundStyle(.secondary)
        Text(context.state.title).font(.headline).lineLimit(1)
        // Let SwiftUI handle the countdown rendering.
        Text(Date(timeIntervalSince1970: TimeInterval(context.state.endAtMs) / 1000.0), style: .timer)
          .font(.title3).monospacedDigit()
      }
      .padding()
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Text("Focus").font(.caption)
        }
        DynamicIslandExpandedRegion(.center) {
          Text(context.state.title).lineLimit(1)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text(Date(timeIntervalSince1970: TimeInterval(context.state.endAtMs) / 1000.0), style: .timer)
            .monospacedDigit()
        }
      } compactLeading: {
        Text("F")
      } compactTrailing: {
        Text(Date(timeIntervalSince1970: TimeInterval(context.state.endAtMs) / 1000.0), style: .timer)
          .monospacedDigit()
      } minimal: {
        Text("F")
      }
    }
  }
}
#endif

@main
struct ${targetName}Bundle: WidgetBundle {
  var body: some Widget {
    KwiltQuickWidget()
#if canImport(ActivityKit)
    if #available(iOS 16.1, *) {
      KwiltFocusLiveActivityWidget()
    }
#endif
  }
}
`,
      'utf8',
    );

    // Ensure widget source is compiled ONLY in the extension target (and not in the main app target).
    const ensureSourceInTarget = (relPath, groupName, target) => {
      // Ensure file exists in the PBXFileReference section (create if missing).
      addBuildSourceFileToGroup({
        filepath: relPath,
        groupName,
        project,
        targetUuid: target,
      });

      // Find existing fileRef UUID.
      const fileRefs = project.pbxFileReferenceSection?.() || {};
      const fileRefKey = Object.keys(fileRefs).find((key) => {
        if (key.endsWith('_comment')) return false;
        const entry = fileRefs[key];
        const p = String(entry?.path || '').replace(/^"|"$/g, '');
        return p === relPath;
      });
      if (!fileRefKey) return;

      // Ensure it's included in the target's Sources build phase.
      const sources = project.pbxSourcesBuildPhaseObj?.(target);
      const base = path.basename(relPath);
      const already = Array.isArray(sources?.files) && sources.files.some((f) => String(f?.comment || '').includes(base));
      if (already) return;

      const PbxFile = require('xcode/lib/pbxFile');
      const f = new PbxFile(relPath);
      f.fileRef = fileRefKey;
      f.uuid = project.generateUuid();
      f.target = target;
      project.addToPbxBuildFileSection(f);
      project.addToPbxSourcesBuildPhase(f);
    };

    const removeSourceFromTargetByBasename = (target, base) => {
      const sources = project.pbxSourcesBuildPhaseObj?.(target);
      if (!sources || !Array.isArray(sources.files)) return;
      const buildFiles = project.pbxBuildFileSection?.() || {};
      sources.files = sources.files.filter((entry) => {
        const comment = String(entry?.comment || '');
        if (!comment.includes(base)) return true;
        const buildFileUuid = entry?.value;
        if (buildFileUuid) {
          delete buildFiles[buildFileUuid];
          delete buildFiles[`${buildFileUuid}_comment`];
        }
        return false;
      });
    };

    const appTargetUuid = project.getTarget?.('com.apple.product-type.application')?.uuid || project.getFirstTarget?.()?.uuid;
    if (appTargetUuid) {
      removeSourceFromTargetByBasename(appTargetUuid, path.basename(widgetSwiftRel));
    }
    ensureSourceInTarget(widgetSwiftRel, targetSubfolder, targetUuid);

    // Ensure the shared ActivityAttributes file is compiled into the extension target too.
    const sharedRel = `${projectName}/KwiltFocusLiveActivity.swift`;
    const pbxFileRefs = project.pbxFileReferenceSection?.() || {};
    const sharedFileRefKey = Object.keys(pbxFileRefs).find((key) => {
      if (key.endsWith('_comment')) return false;
      const entry = pbxFileRefs[key];
      const p = String(entry?.path || '').replace(/^"|"$/g, '');
      return p === sharedRel;
    });

    if (sharedFileRefKey) {
      const PbxFile = require('xcode/lib/pbxFile');
      const f = new PbxFile(sharedRel);
      f.fileRef = sharedFileRefKey;
      // Idempotency: don't add duplicate build entries for the same file into the same target.
      const sources = project.pbxSourcesBuildPhaseObj?.(targetUuid);
      const already = Array.isArray(sources?.files) && sources.files.some((e) => String(e?.comment || '').includes(path.basename(sharedRel)));
      if (!already) {
        f.uuid = project.generateUuid();
        f.target = targetUuid;
        project.addToPbxBuildFileSection(f);
        project.addToPbxSourcesBuildPhase(f);
      }
    }

    // Link files into the extension target.
    project = addResourceFileToGroup({
      filepath: infoPlistRel,
      groupName: targetSubfolder,
      isBuildFile: false,
      project,
      targetUuid,
    });
    project = addBuildSourceFileToGroup({
      filepath: widgetSwiftRel,
      groupName: targetSubfolder,
      project,
      targetUuid,
    });

    // Point the extension target at its entitlements file.
    const section = project.pbxXCBuildConfigurationSection?.() || {};
    Object.keys(section).forEach((key) => {
      const cfg = section[key];
      if (!cfg || cfg.isa !== 'XCBuildConfiguration') return;
      const buildSettings = cfg.buildSettings || {};
      if (String(buildSettings.PRODUCT_BUNDLE_IDENTIFIER || '').replace(/^"|"$/g, '') !== targetBundleId) return;
      buildSettings.CODE_SIGN_ENTITLEMENTS = `"${entitlementsRel}"`;
      cfg.buildSettings = buildSettings;
      section[key] = cfg;
    });

    config.modResults = project;
    return config;
  });

  return config;
};


