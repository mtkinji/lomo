const PREREQUISITE_CONFIGURATION_SWIFT = `
#if canImport(DeviceActivity) && canImport(FamilyControls)
private struct KwiltPrerequisiteMonitorConfiguration: Codable {
  let agreementId: String
  let policyVersion: Int
  let targetSelectionId: String
  let targetSelection: FamilyActivitySelection
  let prerequisiteLabel: String
  let targetLabel: String
  let thresholdMinutes: Int
}
#endif
`;

const PREREQUISITE_PROPERTIES_SWIFT = `
  private let prerequisiteConfigPrefix = "kwilt_screen_time_prerequisite_config_v1."
  private let prerequisiteEventKey = "kwilt_screen_time_prerequisite_event_v1"
  private let prerequisiteLabelKey = "kwilt_screen_time_prerequisite_label_v1"
  private let targetLabelKey = "kwilt_screen_time_target_label_v1"
  private let prerequisiteMinutesKey = "kwilt_screen_time_prerequisite_minutes_v1"
`;

const PREREQUISITE_HELPERS_SWIFT = `
  @available(iOS 16.0, *)
  private func payload(from json: String) -> [String: Any]? {
    guard let data = json.data(using: .utf8) else { return nil }
    return try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any]
  }

  @available(iOS 16.0, *)
  private func safeIdentifier(_ raw: String, fallback: String = "default") -> String {
    let allowed = raw.unicodeScalars.filter {
      CharacterSet.alphanumerics.contains($0) || $0 == "-" || $0 == "_"
    }
    let normalized = String(String.UnicodeScalarView(allowed)).prefix(48)
    return normalized.isEmpty ? fallback : String(normalized)
  }

  @available(iOS 16.0, *)
  private func prerequisiteStore(for agreementId: String) -> ManagedSettingsStore {
    ManagedSettingsStore(named: ManagedSettingsStore.Name(
      "kwilt.prerequisite.\\(safeIdentifier(agreementId))"
    ))
  }

  @available(iOS 16.0, *)
  private func prerequisiteActivityName(for agreementId: String) -> DeviceActivityName {
    DeviceActivityName("kwilt.prerequisite.\\(safeIdentifier(agreementId))")
  }

  @available(iOS 16.0, *)
  private func isAuthorized() -> Bool {
    let status = AuthorizationCenter.shared.authorizationStatus
    return status == .approved || status.rawValue == 3
  }

  @available(iOS 16.0, *)
  private func applySelection(_ selection: FamilyActivitySelection, to managedStore: ManagedSettingsStore) {
    managedStore.shield.applications = selection.applicationTokens.isEmpty ? nil : selection.applicationTokens
    managedStore.shield.applicationCategories = selection.categoryTokens.isEmpty
      ? nil
      : .specific(selection.categoryTokens, except: Set<ApplicationToken>())
    managedStore.shield.webDomains = selection.webDomainTokens.isEmpty ? nil : selection.webDomainTokens
  }
`;

const PREREQUISITE_METHODS_SWIFT = `
  @objc(applyPrerequisiteRule:resolver:rejecter:)
  func applyPrerequisiteRule(
    _ json: String,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
#if canImport(DeviceActivity) && canImport(FamilyControls) && canImport(ManagedSettings)
    if #available(iOS 16.0, *) {
      guard isAuthorized(), let payload = payload(from: json),
            let rawAgreementId = payload["agreementId"] as? String,
            let rawTargetSelectionId = payload["targetSelectionId"] as? String,
            let rawPrerequisiteSelectionId = payload["prerequisiteSelectionId"] as? String,
            let thresholdMinutes = payload["thresholdMinutes"] as? Int,
            let policyVersion = payload["policyVersion"] as? Int,
            let prerequisiteLabel = payload["prerequisiteLabel"] as? String,
            let targetLabel = payload["targetLabel"] as? String,
            thresholdMinutes >= 1, thresholdMinutes <= 1440,
            policyVersion >= 1 else {
        resolve(false)
        return
      }
      let agreementId = safeIdentifier(rawAgreementId)
      let targetSelectionId = safeIdentifier(rawTargetSelectionId)
      let prerequisiteSelectionId = safeIdentifier(rawPrerequisiteSelectionId)
      guard targetSelectionId != prerequisiteSelectionId else {
        resolve(false)
        return
      }
      let targetSelection = loadSelection(for: targetSelectionId)
      let prerequisiteSelection = loadSelection(for: prerequisiteSelectionId)
      let targetIsEmpty = targetSelection.applicationTokens.isEmpty
        && targetSelection.categoryTokens.isEmpty && targetSelection.webDomainTokens.isEmpty
      let prerequisiteIsEmpty = prerequisiteSelection.applicationTokens.isEmpty
        && prerequisiteSelection.categoryTokens.isEmpty && prerequisiteSelection.webDomainTokens.isEmpty
      guard !targetIsEmpty, !prerequisiteIsEmpty,
            let shared = UserDefaults(suiteName: appGroupIdentifier) else {
        resolve(false)
        return
      }

      let activity = prerequisiteActivityName(for: agreementId)
      let configuration = KwiltPrerequisiteMonitorConfiguration(
        agreementId: agreementId,
        policyVersion: policyVersion,
        targetSelectionId: targetSelectionId,
        targetSelection: targetSelection,
        prerequisiteLabel: String(prerequisiteLabel.prefix(80)),
        targetLabel: String(targetLabel.prefix(80)),
        thresholdMinutes: thresholdMinutes
      )
      guard let configurationData = try? JSONEncoder().encode(configuration) else {
        resolve(false)
        return
      }
      shared.set(configurationData, forKey: "\\(prerequisiteConfigPrefix)\\(activity.rawValue)")
      shared.set("family_prerequisite", forKey: shieldReasonKey)
      shared.set(configuration.prerequisiteLabel, forKey: prerequisiteLabelKey)
      shared.set(configuration.targetLabel, forKey: targetLabelKey)
      shared.set(thresholdMinutes, forKey: prerequisiteMinutesKey)

      let managedStore = prerequisiteStore(for: agreementId)
      applySelection(targetSelection, to: managedStore)
      let schedule = DeviceActivitySchedule(
        intervalStart: DateComponents(hour: 0, minute: 0),
        intervalEnd: DateComponents(hour: 23, minute: 59),
        repeats: true
      )
      let event = DeviceActivityEvent(
        applications: prerequisiteSelection.applicationTokens,
        categories: prerequisiteSelection.categoryTokens,
        webDomains: prerequisiteSelection.webDomainTokens,
        threshold: DateComponents(minute: thresholdMinutes)
      )
      let center = DeviceActivityCenter()
      center.stopMonitoring([activity])
      do {
        try center.startMonitoring(
          activity,
          during: schedule,
          events: [DeviceActivityEvent.Name("prerequisite"): event]
        )
        resolve(true)
      } catch {
        managedStore.clearAllSettings()
        shared.removeObject(forKey: "\\(prerequisiteConfigPrefix)\\(activity.rawValue)")
        resolve(false)
      }
      return
    }
#endif
    resolve(false)
  }

  @objc(clearPrerequisiteRule:resolver:rejecter:)
  func clearPrerequisiteRule(
    _ json: String,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
#if canImport(DeviceActivity) && canImport(ManagedSettings)
    if #available(iOS 16.0, *) {
      guard let payload = payload(from: json), let rawAgreementId = payload["agreementId"] as? String else {
        resolve(false)
        return
      }
      let agreementId = safeIdentifier(rawAgreementId)
      let activity = prerequisiteActivityName(for: agreementId)
      DeviceActivityCenter().stopMonitoring([activity])
      prerequisiteStore(for: agreementId).clearAllSettings()
      UserDefaults(suiteName: appGroupIdentifier)?.removeObject(
        forKey: "\\(prerequisiteConfigPrefix)\\(activity.rawValue)"
      )
      resolve(true)
      return
    }
#endif
    resolve(false)
  }

  @objc(consumePrerequisiteRuleEvent:rejecter:)
  func consumePrerequisiteRuleEvent(
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    guard let shared = UserDefaults(suiteName: appGroupIdentifier),
          let data = shared.data(forKey: prerequisiteEventKey) else {
      resolve(nil)
      return
    }
    shared.removeObject(forKey: prerequisiteEventKey)
    resolve(try? JSONSerialization.jsonObject(with: data, options: []))
  }
`;

const PREREQUISITE_EXTERN = `
RCT_EXTERN_METHOD(
  applyPrerequisiteRule:(NSString *)json
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  clearPrerequisiteRule:(NSString *)json
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  consumePrerequisiteRuleEvent:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)
`;

module.exports = {
  PREREQUISITE_CONFIGURATION_SWIFT,
  PREREQUISITE_EXTERN,
  PREREQUISITE_HELPERS_SWIFT,
  PREREQUISITE_METHODS_SWIFT,
  PREREQUISITE_PROPERTIES_SWIFT,
};
