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

const KWILT_WIDGET_CENTER_SWIFT = `import Foundation
import React

#if canImport(WidgetKit)
import WidgetKit
#endif

@objc(KwiltWidgetCenter)
class KwiltWidgetCenter: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc(reloadTimelines:resolver:rejecter:)
  func reloadTimelines(
    _ kinds: [String],
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
#if canImport(WidgetKit)
    if #available(iOS 14.0, *) {
      if kinds.isEmpty {
        WidgetCenter.shared.reloadAllTimelines()
        resolve(true)
        return
      }
      kinds.forEach { kind in
        WidgetCenter.shared.reloadTimelines(ofKind: kind)
      }
      resolve(true)
      return
    }
#endif
    resolve(false)
  }
}
`;

const KWILT_WIDGET_CENTER_EXTERN = `#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(KwiltWidgetCenter, NSObject)

RCT_EXTERN_METHOD(
  reloadTimelines:(NSArray<NSString *> *)kinds
  resolver:(RCTPromiseResolveBlock)resolve
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
    filePath: 'KwiltWidgetCenter.swift',
    contents: KWILT_WIDGET_CENTER_SWIFT,
    overwrite: false,
  });
  config = withBuildSourceFile(config, {
    filePath: 'KwiltWidgetCenter.m',
    contents: KWILT_WIDGET_CENTER_EXTERN,
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
    const bundleIdRaw = config?.ios?.bundleIdentifier;
    const bundleId = typeof bundleIdRaw === 'string' ? bundleIdRaw.trim() : '';
    if (!bundleId) {
      throw new Error(
        [
          '[withAppleEcosystemIntegrations] KWILT_ENABLE_WIDGETS=1 requires a valid `ios.bundleIdentifier`.',
          'This is needed to create a WidgetKit extension whose bundle identifier is correctly prefixed by the parent app.',
          'Fix: ensure `ios.bundleIdentifier` is present in `app.config.ts` (and as a fallback in `app.json` if CI ever fails to evaluate the dynamic config).',
        ].join(' '),
      );
    }
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

    // Ensure the extension target has a valid SWIFT_VERSION set (Xcode errors if empty).
    const ensureSwiftVersionForBundleId = (bundleIdentifier, swiftVersion = '5.0') => {
      const section = project.pbxXCBuildConfigurationSection?.() || {};
      Object.keys(section).forEach((key) => {
        const cfg = section[key];
        if (!cfg || cfg.isa !== 'XCBuildConfiguration') return;
        const buildSettings = cfg.buildSettings || {};
        const prodBundle = String(buildSettings.PRODUCT_BUNDLE_IDENTIFIER || '').replace(/^"|"$/g, '');
        if (prodBundle !== bundleIdentifier) return;
        const current = String(buildSettings.SWIFT_VERSION ?? '').replace(/^"|"$/g, '').trim();
        if (!current) {
          buildSettings.SWIFT_VERSION = `"${swiftVersion}"`;
        }
        cfg.buildSettings = buildSettings;
        section[key] = cfg;
      });
    };
    ensureSwiftVersionForBundleId(targetBundleId, '5.0');

    // For v1 of widget configuration, we use AppIntentConfiguration which requires iOS 17+.
    // Set the widget extension's deployment target accordingly.
    const ensureDeploymentTargetForBundleId = (bundleIdentifier, deploymentTarget = '16.0') => {
      const section = project.pbxXCBuildConfigurationSection?.() || {};
      Object.keys(section).forEach((key) => {
        const cfg = section[key];
        if (!cfg || cfg.isa !== 'XCBuildConfiguration') return;
        const buildSettings = cfg.buildSettings || {};
        const prodBundle = String(buildSettings.PRODUCT_BUNDLE_IDENTIFIER || '').replace(/^"|"$/g, '');
        if (prodBundle !== bundleIdentifier) return;
        buildSettings.IPHONEOS_DEPLOYMENT_TARGET = `"${deploymentTarget}"`;
        cfg.buildSettings = buildSettings;
        section[key] = cfg;
      });
    };
    ensureDeploymentTargetForBundleId(targetBundleId, '17.0');

    const ensureVersionForBundleId = (bundleIdentifier, version, buildNumber) => {
      if (!version && !buildNumber) return;
      const section = project.pbxXCBuildConfigurationSection?.() || {};
      Object.keys(section).forEach((key) => {
        const cfg = section[key];
        if (!cfg || cfg.isa !== 'XCBuildConfiguration') return;
        const buildSettings = cfg.buildSettings || {};
        const prodBundle = String(buildSettings.PRODUCT_BUNDLE_IDENTIFIER || '').replace(/^"|"$/g, '');
        if (prodBundle !== bundleIdentifier) return;
        if (version) {
          buildSettings.MARKETING_VERSION = `"${version}"`;
        }
        if (buildNumber) {
          buildSettings.CURRENT_PROJECT_VERSION = `"${buildNumber}"`;
        }
        cfg.buildSettings = buildSettings;
        section[key] = cfg;
      });
    };
    const appVersion = typeof config?.version === 'string' ? config.version.trim() : '';
    const buildNumberRaw = typeof config?.ios?.buildNumber === 'string' ? config.ios.buildNumber.trim() : '';
    const appVersionFinal = appVersion || '1.0.0';
    const buildNumberFinal = buildNumberRaw || '1';
    ensureVersionForBundleId(targetBundleId, appVersionFinal, buildNumberFinal);

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
  <key>CFBundleDevelopmentRegion</key>
  <string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>XPC!</string>
  <key>CFBundleShortVersionString</key>
  <string>$(MARKETING_VERSION)</string>
  <key>CFBundleVersion</key>
  <string>$(CURRENT_PROJECT_VERSION)</string>
  <key>CFBundleDisplayName</key>
  <string>${targetName}</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionAttributes</key>
    <dict>
      <key>WKAppBundleIdentifier</key>
      <string>${bundleId}</string>
    </dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
  </dict>
</dict>
</plist>
`,
        'utf8',
      );
    }
    // Ensure required Info.plist keys exist for an app extension bundle.
    // If missing, Apple validation and/or Xcode embedded validation may treat them as (null)
    // and reject the archive at upload time.
    try {
      const raw = fs.readFileSync(infoPlistAbs, 'utf8');
      const ensureKey = (input, key, value) => {
        if (input.includes(`<key>${key}</key>`)) return input;
        return input.replace(
          /<dict>\\s*/m,
          `<dict>\\n  <key>${key}</key>\\n  <string>${value}</string>\\n`,
        );
      };
      const ensureExtensionAttributes = (input, appBundleId) => {
        if (input.includes('<key>NSExtensionAttributes</key>')) return input;
        return input.replace(
          /<key>NSExtension<\/key>\s*<dict>/m,
          `<key>NSExtension</key>\n  <dict>\n    <key>NSExtensionAttributes</key>\n    <dict>\n      <key>WKAppBundleIdentifier</key>\n      <string>${appBundleId}</string>\n    </dict>`,
        );
      };

      let patched = raw.replace(/\\n/g, '\n');
      patched = ensureKey(patched, 'CFBundleDevelopmentRegion', '$(DEVELOPMENT_LANGUAGE)');
      patched = ensureKey(patched, 'CFBundleExecutable', '$(EXECUTABLE_NAME)');
      patched = ensureKey(patched, 'CFBundleIdentifier', '$(PRODUCT_BUNDLE_IDENTIFIER)');
      patched = ensureKey(patched, 'CFBundleInfoDictionaryVersion', '6.0');
      patched = ensureKey(patched, 'CFBundleName', '$(PRODUCT_NAME)');
      patched = ensureKey(patched, 'CFBundlePackageType', 'XPC!');
      patched = ensureKey(patched, 'CFBundleShortVersionString', '$(MARKETING_VERSION)');
      patched = ensureKey(patched, 'CFBundleVersion', '$(CURRENT_PROJECT_VERSION)');
      patched = ensureExtensionAttributes(patched, bundleId);
      // WidgetKit extensions should not declare NSExtensionPrincipalClass.
      patched = patched.replace(
        /\s*<key>NSExtensionPrincipalClass<\/key>\s*<string>[^<]*<\/string>\s*/m,
        '\n    ',
      );

      if (patched !== raw) fs.writeFileSync(infoPlistAbs, patched, 'utf8');
    } catch {
      // Non-fatal; if this fails, Xcode will surface a clear error during archive validation.
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
#if canImport(AppIntents)
import AppIntents
#endif

// Widgets should preserve the app shell/canvas by deep-linking into existing screens.
// We keep WidgetKit data minimal and read a single JSON blob from the App Group:
// key = "kwilt_glanceable_state_v1" (written by startGlanceableStateSync() in the app).

struct GlanceableStateV1: Codable {
  struct WidgetItem: Codable {
    let activityId: String
    let title: String
    let scheduledAtMs: Double?
    let estimateMinutes: Double?
  }

  struct Suggested: Codable { let items: [WidgetItem] }
  struct Schedule: Codable { let items: [WidgetItem] }

  struct Momentum: Codable {
    let completedToday: Int
    let completedThisWeek: Int
    let showUpStreakDays: Int?
    let focusStreakDays: Int?
  }

  struct NextUp: Codable {
    let activityId: String
    let title: String
    let scheduledAtMs: Double?
    let estimateMinutes: Double?
  }

  struct TodaySummary: Codable {
    struct Top3: Codable { let activityId: String; let title: String }
    let top3: [Top3]
    let completedCount: Int
  }

  struct ActivityViewSummary: Codable {
    let id: String
    let name: String
    let isSystem: Bool?
  }

  struct ActivitiesWidgetRow: Codable {
    let activityId: String
    let title: String
    let scheduledAtMs: Double?
    let status: String?
  }

  struct ActivitiesWidgetPayload: Codable {
    let viewId: String
    let viewName: String
    let totalCount: Int
    let rows: [ActivitiesWidgetRow]
    let updatedAtMs: Double
  }

  let version: Int
  let updatedAtMs: Double
  let nextUp: NextUp?
  let todaySummary: TodaySummary?
  let suggested: Suggested?
  let schedule: Schedule?
  let momentum: Momentum?
  let activityViews: [ActivityViewSummary]?
  let activitiesWidgetByViewId: [String: ActivitiesWidgetPayload]?
}

func readGlanceableState() -> GlanceableStateV1? {
  let defaults = UserDefaults(suiteName: "${appGroupId}")
  guard let json = defaults?.string(forKey: "kwilt_glanceable_state_v1") else { return nil }
  guard let data = json.data(using: .utf8) else { return nil }
  return try? JSONDecoder().decode(GlanceableStateV1.self, from: data)
}

func deepLinkToday() -> URL? {
  return URL(string: "kwilt://today?source=widget")
}

func deepLinkActivity(_ activityId: String) -> URL? {
  return URL(string: "kwilt://activity/\\(activityId)?source=widget")
}

func deepLinkActivities(viewId: String?) -> URL? {
  if let viewId = viewId, !viewId.isEmpty {
    return URL(string: "kwilt://activities?viewId=\\(viewId)&source=widget")
  }
  return URL(string: "kwilt://activities?source=widget")
}

struct KwiltPalette {
  static let pine: Color = Color(red: 49/255, green: 85/255, blue: 69/255)
  static let pineSoft: Color = Color(red: 49/255, green: 85/255, blue: 69/255, opacity: 0.12)
}

struct WidgetFormatters {
  static let time: DateFormatter = {
    let df = DateFormatter()
    df.locale = Locale.autoupdatingCurrent
    df.dateStyle = .none
    df.timeStyle = .short
    return df
  }()

  static let relative: RelativeDateTimeFormatter = {
    let rf = RelativeDateTimeFormatter()
    rf.locale = Locale.autoupdatingCurrent
    rf.unitsStyle = .abbreviated
    return rf
  }()
}

func formatTimeLabel(ms: Double?) -> String? {
  guard let ms = ms else { return nil }
  let date = Date(timeIntervalSince1970: ms / 1000.0)
  return WidgetFormatters.time.string(from: date)
}

func formatRelativeLabel(ms: Double?) -> String? {
  guard let ms = ms else { return nil }
  let date = Date(timeIntervalSince1970: ms / 1000.0)
  return WidgetFormatters.relative.localizedString(for: date, relativeTo: Date())
}

func isLockScreenFamily(_ family: WidgetFamily) -> Bool {
  return family == .accessoryCircular || family == .accessoryRectangular || family == .accessoryInline
}

@ViewBuilder
func widgetContainer<Content: View>(@ViewBuilder content: () -> Content) -> some View {
  if #available(iOS 17.0, *) {
    content().containerBackground(.fill.tertiary, for: .widget)
  } else {
    content()
  }
}

// MARK: - Activities widget (single widget for v1)

struct ActivitiesEntry: TimelineEntry {
  let date: Date
  let viewId: String
  let viewName: String
  let rows: [GlanceableStateV1.ActivitiesWidgetRow]
  let totalCount: Int
}

@available(iOS 16.0, *)
struct ActivityViewEntity: AppEntity, Identifiable {
  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Activity view"
  static var defaultQuery = ActivityViewEntityQuery()

  var id: String
  var name: String

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: LocalizedStringResource(stringLiteral: name))
  }
}

@available(iOS 16.0, *)
struct ActivityViewEntityQuery: EntityQuery {
  func suggestedEntities() async throws -> [ActivityViewEntity] {
    let state = readGlanceableState()
    let views = state?.activityViews ?? []
    return views.map { ActivityViewEntity(id: $0.id, name: $0.name) }
  }

  func entities(for identifiers: [String]) async throws -> [ActivityViewEntity] {
    let state = readGlanceableState()
    let views = state?.activityViews ?? []
    let byId = Dictionary(uniqueKeysWithValues: views.map { ($0.id, $0.name) })
    return identifiers.compactMap { id in
      guard let name = byId[id] else { return nil }
      return ActivityViewEntity(id: id, name: name)
    }
  }
}

@available(iOS 17.0, *)
struct ActivitiesWidgetConfigurationIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "Activities"
  static var description = IntentDescription("Show activities from any of your views.")

  @Parameter(title: "List")
  var view: ActivityViewEntity?
}

@available(iOS 17.0, *)
struct ActivitiesWidgetProvider: AppIntentTimelineProvider {
  typealias Intent = ActivitiesWidgetConfigurationIntent

  func placeholder(in context: Context) -> ActivitiesEntry {
    ActivitiesEntry(date: Date(), viewId: "default", viewName: "Default", rows: [], totalCount: 0)
  }

  func snapshot(for configuration: ActivitiesWidgetConfigurationIntent, in context: Context) async -> ActivitiesEntry {
    return buildEntry(configuration: configuration)
  }

  func timeline(for configuration: ActivitiesWidgetConfigurationIntent, in context: Context) async -> Timeline<ActivitiesEntry> {
    let entry = buildEntry(configuration: configuration)
    let refresh = Date().addingTimeInterval(15 * 60)
    return Timeline(entries: [entry], policy: .after(refresh))
  }

  private func buildEntry(configuration: ActivitiesWidgetConfigurationIntent) -> ActivitiesEntry {
    let state = readGlanceableState()
    let defaultView = state?.activityViews?.first?.id ?? "default"
    let viewId = configuration.view?.id ?? defaultView
    let viewName =
      configuration.view?.name ??
      state?.activityViews?.first(where: { $0.id == viewId })?.name ??
      "Activities"

    let payload = state?.activitiesWidgetByViewId?[viewId]
    let rows = payload?.rows ?? []
    let total = payload?.totalCount ?? rows.count

    return ActivitiesEntry(date: Date(), viewId: viewId, viewName: viewName, rows: rows, totalCount: total)
  }
}

struct ActivitiesWidgetView: View {
  let entry: ActivitiesEntry
  @Environment(\\.widgetFamily) var family

  var body: some View {
    let url = deepLinkActivities(viewId: entry.viewId)
    let limit = family == .systemLarge ? 10 : 5
    let rows = Array(entry.rows.prefix(limit))
    let remaining = max(0, entry.totalCount - rows.count)

    widgetContainer {
      VStack(alignment: .leading, spacing: 10) {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
          Image(systemName: "checklist")
            .foregroundStyle(KwiltPalette.pine)
          VStack(alignment: .leading, spacing: 2) {
            Text("Activities")
              .font(.headline)
              .foregroundStyle(.primary)
              .lineLimit(1)
            Text(entry.viewName)
              .font(.caption)
              .foregroundStyle(.secondary)
              .lineLimit(1)
          }
          Spacer()
        }

        if rows.isEmpty {
          Spacer()
          Text("Open Kwilt to sync this widget.")
            .font(.caption)
            .foregroundStyle(.secondary)
            .multilineTextAlignment(.leading)
          Spacer()
        } else {
          VStack(alignment: .leading, spacing: 6) {
            ForEach(Array(rows.enumerated()), id: \\.offset) { _, row in
              HStack(alignment: .firstTextBaseline, spacing: 8) {
                Image(systemName: row.status == "done" ? "checkmark.circle.fill" : "circle")
                  .foregroundStyle(row.status == "done" ? KwiltPalette.pine : .secondary)
                Text(row.title)
                  .font(.subheadline)
                  .foregroundStyle(.primary)
                  .lineLimit(1)
                Spacer()
                if let ms = row.scheduledAtMs, let label = formatTimeLabel(ms: ms) {
                  Text(label)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
                    .lineLimit(1)
                }
              }
            }
          }
          Spacer()
          if remaining > 0 {
            Text("\\(remaining) more")
              .font(.caption)
              .foregroundStyle(.secondary)
              .lineLimit(1)
          }
        }
      }
      .widgetURL(url)
      .padding()
    }
  }
}

@available(iOS 17.0, *)
struct KwiltActivitiesWidget: Widget {
  let kind: String = "${targetName}.activities"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: ActivitiesWidgetConfigurationIntent.self, provider: ActivitiesWidgetProvider()) { entry in
      ActivitiesWidgetView(entry: entry)
    }
    .configurationDisplayName("Activities")
    .description("Show activities from any of your views.")
    .supportedFamilies([.systemMedium, .systemLarge])
  }
}

@main
struct ${targetName}Bundle: WidgetBundle {
  var body: some Widget {
    if #available(iOS 17.0, *) {
      KwiltActivitiesWidget()
    }
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

    const removeSourceFromTargetByRelPath = (target, relPath) => {
      const sources = project.pbxSourcesBuildPhaseObj?.(target);
      if (!sources || !Array.isArray(sources.files)) return;

      const buildFiles = project.pbxBuildFileSection?.() || {};
      const fileRefs = project.pbxFileReferenceSection?.() || {};

      const fileRefUuid = Object.keys(fileRefs).find((key) => {
        if (key.endsWith('_comment')) return false;
        const entry = fileRefs[key];
        const p = String(entry?.path || '').replace(/^"|"$/g, '');
        return p === relPath;
      });

      sources.files = sources.files.filter((entry) => {
        const buildFileUuid = entry?.value;
        if (!buildFileUuid) return true;

        const bf = buildFiles[buildFileUuid];
        const bfFileRef = bf?.fileRef;
        if (fileRefUuid && bfFileRef === fileRefUuid) {
          delete buildFiles[buildFileUuid];
          delete buildFiles[`${buildFileUuid}_comment`];
          return false;
        }

        // Fallback: remove by matching the comment (covers older generated projects).
        const comment = String(entry?.comment || '');
        const base = path.basename(relPath);
        if (comment.includes(base)) {
          delete buildFiles[buildFileUuid];
          delete buildFiles[`${buildFileUuid}_comment`];
          return false;
        }

        return true;
      });
    };

    const appTargetUuid = project.getTarget?.('com.apple.product-type.application')?.uuid || project.getFirstTarget?.()?.uuid;
    if (appTargetUuid) {
      // Defensive: some historical generated projects accidentally compiled widget sources in the app target.
      removeSourceFromTargetByRelPath(appTargetUuid, widgetSwiftRel);
    }
    ensureSourceInTarget(widgetSwiftRel, targetSubfolder, targetUuid);

    // Ensure the shared ActivityAttributes file is compiled into the extension target too
    // (required for `KwiltFocusAttributes` used by the Live Activity widget).
    const sharedRel = `${projectName}/KwiltFocusLiveActivity.swift`;
    ensureGroupRecursively(project, projectName);
    ensureSourceInTarget(sharedRel, projectName, targetUuid);
    // And ensure it's compiled into the main app target too (required by `KwiltLiveActivity.swift`).
    if (appTargetUuid) {
      ensureSourceInTarget(sharedRel, projectName, appTargetUuid);
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
    // Extra defensive cleanup: certain Xcodeproj mutation paths can still attach the widget
    // source file to the main app target. Ensure it is NOT compiled there.
    if (appTargetUuid) {
      removeSourceFromTargetByRelPath(appTargetUuid, widgetSwiftRel);
    }

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


