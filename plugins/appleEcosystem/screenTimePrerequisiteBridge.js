const { PERSONAL_RULE_CORE_SWIFT } = require('./personalRuleCore');
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

private struct KwiltPersonalUsageLimitConfiguration: Codable {
  let ruleId: String
  let selectionId: String
  let targetSelection: FamilyActivitySelection
  let limitMinutes: Int
  let restrictionLabel: String
}

${PERSONAL_RULE_CORE_SWIFT}

private struct KwiltPersonalCompositeConditionExplanation: Codable {
  let conditionId: String
  let whenMatched: String
  let whenUnmatched: String
}

private struct KwiltPersonalCompositeRulePayload: Codable {
  let version: Int
  let ruleId: String
  let selectionId: String
  let activeRuleIds: [String]?
  let connector: String
  let outcome: String
  let conditions: [KwiltPersonalCompositeCondition]
  let expression: KwiltRuleExpression?
  let conditionExplanations: [KwiltPersonalCompositeConditionExplanation]?
  let restrictionLabel: String
  let hostTruth: [String: Bool]?
  let hostEvidence: [String: KwiltRuleEvidence]?
}

private struct KwiltPersonalCompositeRuleConfiguration: Codable {
  let version: Int
  let ruleId: String
  let selectionId: String
  let targetSelection: FamilyActivitySelection
  let connector: String
  let outcome: String
  let conditions: [KwiltPersonalCompositeCondition]
  let expression: KwiltRuleExpression?
  let conditionExplanations: [KwiltPersonalCompositeConditionExplanation]?
  let restrictionLabel: String
}
#endif
`;

const PREREQUISITE_PROPERTIES_SWIFT = `
  private let prerequisiteConfigPrefix = "kwilt_screen_time_prerequisite_config_v1."
  private let prerequisiteEventKey = "kwilt_screen_time_prerequisite_event_v1"
  private let prerequisiteLabelKey = "kwilt_screen_time_prerequisite_label_v1"
  private let targetLabelKey = "kwilt_screen_time_target_label_v1"
  private let prerequisiteMinutesKey = "kwilt_screen_time_prerequisite_minutes_v1"
  private let personalUsageLimitConfigPrefix = "kwilt_screen_time_personal_limit_config_v1."
  private let personalCompositeConfigPrefix = "kwilt_screen_time_composite_config_v2."
  private let personalCompositeMonitorConfigPrefix = "kwilt_screen_time_composite_monitor_v2."
  private let personalCompositeTruthPrefix = "kwilt_screen_time_composite_truth_v2."
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
  private func personalCompositeConditionIdentifier(_ raw: String) -> String {
    let allowed = raw.unicodeScalars.filter {
      CharacterSet.alphanumerics.contains($0) || $0 == "-" || $0 == "_"
    }
    let normalized = String(String.UnicodeScalarView(allowed))
    guard !normalized.isEmpty else { return "condition" }
    guard normalized.count > 48 else { return normalized }
    var hash: UInt64 = 1469598103934665603
    for byte in raw.utf8 {
      hash = (hash ^ UInt64(byte)) &* 1099511628211
    }
    let digest = String(hash, radix: 16)
    let suffix = normalized.suffix(48 - digest.count - 1)
    return "\\(suffix)_\\(digest)"
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
  private func personalUsageLimitStore(for ruleId: String) -> ManagedSettingsStore {
    ManagedSettingsStore(named: ManagedSettingsStore.Name(
      "kwilt.personal.limit.\\(safeIdentifier(ruleId))"
    ))
  }

  @available(iOS 16.0, *)
  private func personalUsageLimitActivityName(for ruleId: String) -> DeviceActivityName {
    DeviceActivityName("kwilt.personal.limit.\\(safeIdentifier(ruleId))")
  }

  @available(iOS 16.0, *)
  private func personalCompositeStore(for ruleId: String) -> ManagedSettingsStore {
    ManagedSettingsStore(named: ManagedSettingsStore.Name(
      "kwilt.personal.composite.\\(safeIdentifier(ruleId))"
    ))
  }

  @available(iOS 16.0, *)
  private func personalCompositeActivityName(ruleId: String, conditionId: String) -> DeviceActivityName {
    DeviceActivityName("kwilt.composite.\\(safeIdentifier(ruleId)).\\(personalCompositeConditionIdentifier(conditionId))")
  }

  @available(iOS 16.0, *)
  private func personalCompositeRuleId(from activity: DeviceActivityName) -> String? {
    let prefix = "kwilt.composite."
    guard activity.rawValue.hasPrefix(prefix) else { return nil }
    return activity.rawValue.dropFirst(prefix.count).split(separator: ".", maxSplits: 1)
      .first.map(String.init)
  }

  @available(iOS 16.0, *)
  private func personalCompositeTruthKey(ruleId: String, conditionId: String) -> String {
    "\\(personalCompositeTruthPrefix)\\(safeIdentifier(ruleId)).\\(personalCompositeConditionIdentifier(conditionId))"
  }

  @available(iOS 16.0, *)
  private func evaluatePersonalCompositeRule(_ configuration: KwiltPersonalCompositeRuleConfiguration) {
    guard let shared = UserDefaults(suiteName: appGroupIdentifier) else { return }
    let values: [Bool?] = configuration.conditions.map { condition in
      let key = personalCompositeTruthKey(ruleId: configuration.ruleId, conditionId: condition.id)
      let evidence = shared.data(forKey: key + ".evidence").flatMap { try? JSONDecoder().decode(KwiltRuleEvidence.self, from: $0) }
      return KwiltPersonalRuleCore.truth(condition, evidence: evidence,
        usageReached: shared.object(forKey: key) as? Bool, usageDay: shared.string(forKey: key + ".day"))
    }
    let truth = Dictionary(uniqueKeysWithValues: zip(configuration.conditions, values).compactMap { condition, value -> (String, Bool)? in
      guard let value = value else { return nil }; return (condition.id, value)
    })
    let decision = configuration.expression.map { KwiltPersonalRuleCore.evaluate($0, truth: truth) }
      ?? KwiltPersonalRuleCore.combine(configuration.connector, values)
    guard let matched = decision else {
      // Unknown holds the existing store; explain why instead of asserting stale facts.
      KwiltRestrictionLedger.markWaitingForEvidence(id: "personal_composite.\\(configuration.ruleId)")
      return
    }
    let shouldPause = configuration.outcome == "available" ? !matched : matched
    let managedStore = personalCompositeStore(for: configuration.ruleId)
    let ledgerId = "personal_composite.\\(configuration.ruleId)"
    if shouldPause {
      applySelection(configuration.targetSelection, to: managedStore)
      shared.set("personal_composite_rule", forKey: shieldReasonKey)
      KwiltRestrictionLedger.upsert(
        id: ledgerId,
        ruleId: configuration.ruleId,
        selectionId: configuration.selectionId,
        reason: "personal_composite_rule",
        label: configuration.restrictionLabel,
        details: personalCompositeBlockingDetails(configuration: configuration, values: values),
        applicationTokenKeys: KwiltRestrictionLedger.tokenKeys(configuration.targetSelection.applicationTokens),
        categoryTokenKeys: KwiltRestrictionLedger.tokenKeys(configuration.targetSelection.categoryTokens),
        webDomainTokenKeys: KwiltRestrictionLedger.tokenKeys(configuration.targetSelection.webDomainTokens)
      )
    } else {
      managedStore.clearAllSettings()
      KwiltRestrictionLedger.remove(id: ledgerId)
    }
  }

  @available(iOS 16.0, *)
  private func personalCompositeBlockingDetails(
    configuration: KwiltPersonalCompositeRuleConfiguration,
    values: [Bool?]
  ) -> [String] {
    let explanations = Dictionary(
      uniqueKeysWithValues: (configuration.conditionExplanations ?? []).map { ($0.conditionId, $0) }
    )
    let truth = Dictionary(uniqueKeysWithValues: zip(configuration.conditions, values).compactMap { condition, value -> (String, Bool)? in
      guard let value = value else { return nil }; return (condition.id, value)
    })
    let decisive = configuration.expression.map { KwiltPersonalRuleCore.decisiveIds($0, truth: truth) }
    return zip(configuration.conditions, values).compactMap { condition, value -> String? in
      guard let value = value, decisive?.contains(condition.id) ?? true else { return nil }
      let causesPause = configuration.outcome == "pause" ? value : !value
      guard causesPause, let explanation = explanations[condition.id] else { return nil }
      return value ? explanation.whenMatched : explanation.whenUnmatched
    }
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
      let minutes = configuration.thresholdMinutes
      KwiltRestrictionLedger.upsert(
        id: "prerequisite.\\(agreementId)",
        ruleId: agreementId,
        selectionId: configuration.targetSelectionId,
        reason: "family_prerequisite",
        label: "Use \\(configuration.prerequisiteLabel) for \\(minutes) minute\\(minutes == 1 ? "" : "s")",
        applicationTokenKeys: KwiltRestrictionLedger.tokenKeys(targetSelection.applicationTokens),
        categoryTokenKeys: KwiltRestrictionLedger.tokenKeys(targetSelection.categoryTokens),
        webDomainTokenKeys: KwiltRestrictionLedger.tokenKeys(targetSelection.webDomainTokens)
      )
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
        KwiltRestrictionLedger.remove(id: "prerequisite.\\(agreementId)")
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
      KwiltRestrictionLedger.remove(id: "prerequisite.\\(agreementId)")
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

  @objc(applyPersonalUsageLimit:resolver:rejecter:)
  func applyPersonalUsageLimit(
    _ json: String,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
#if canImport(DeviceActivity) && canImport(FamilyControls) && canImport(ManagedSettings)
    if #available(iOS 16.0, *) {
      guard isAuthorized(), let payload = payload(from: json),
            let rawRuleId = payload["ruleId"] as? String,
            let rawSelectionId = payload["selectionId"] as? String,
            let limitMinutes = payload["limitMinutes"] as? Int,
            payload["reset"] as? String == "daily",
            limitMinutes >= 1, limitMinutes <= 1440 else {
        resolve(false)
        return
      }
      let ruleId = safeIdentifier(rawRuleId)
      let selectionId = safeIdentifier(rawSelectionId)
      let selection = loadSelection(for: selectionId)
      let isEmpty = selection.applicationTokens.isEmpty
        && selection.categoryTokens.isEmpty && selection.webDomainTokens.isEmpty
      guard !isEmpty, let shared = UserDefaults(suiteName: appGroupIdentifier) else {
        resolve(false)
        return
      }
      let activity = personalUsageLimitActivityName(for: ruleId)
      let label = String(((payload["restrictionLabel"] as? String) ?? "Daily app limit").prefix(80))
      let configuration = KwiltPersonalUsageLimitConfiguration(
        ruleId: ruleId,
        selectionId: selectionId,
        targetSelection: selection,
        limitMinutes: limitMinutes,
        restrictionLabel: label
      )
      guard let data = try? JSONEncoder().encode(configuration) else {
        resolve(false)
        return
      }
      shared.set(data, forKey: "\\(personalUsageLimitConfigPrefix)\\(activity.rawValue)")
      personalUsageLimitStore(for: ruleId).clearAllSettings()
      KwiltRestrictionLedger.remove(id: "personal_limit.\\(ruleId)")
      let schedule = DeviceActivitySchedule(
        intervalStart: DateComponents(hour: 0, minute: 0),
        intervalEnd: DateComponents(hour: 23, minute: 59),
        repeats: true
      )
      let event: DeviceActivityEvent
      if #available(iOS 17.4, *) {
        event = DeviceActivityEvent(
          applications: selection.applicationTokens,
          categories: selection.categoryTokens,
          webDomains: selection.webDomainTokens,
          threshold: DateComponents(minute: limitMinutes),
          includesPastActivity: true
        )
      } else {
        event = DeviceActivityEvent(
          applications: selection.applicationTokens,
          categories: selection.categoryTokens,
          webDomains: selection.webDomainTokens,
          threshold: DateComponents(minute: limitMinutes)
        )
      }
      let center = DeviceActivityCenter()
      center.stopMonitoring([activity])
      do {
        try center.startMonitoring(
          activity,
          during: schedule,
          events: [DeviceActivityEvent.Name("personal_daily_limit"): event]
        )
        resolve(true)
      } catch {
        shared.removeObject(forKey: "\\(personalUsageLimitConfigPrefix)\\(activity.rawValue)")
        resolve(false)
      }
      return
    }
#endif
    resolve(false)
  }

  @objc(clearPersonalUsageLimit:resolver:rejecter:)
  func clearPersonalUsageLimit(
    _ json: String,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
#if canImport(DeviceActivity) && canImport(ManagedSettings)
    if #available(iOS 16.0, *) {
      guard let payload = payload(from: json), let rawRuleId = payload["ruleId"] as? String else {
        resolve(false)
        return
      }
      let ruleId = safeIdentifier(rawRuleId)
      let activity = personalUsageLimitActivityName(for: ruleId)
      DeviceActivityCenter().stopMonitoring([activity])
      personalUsageLimitStore(for: ruleId).clearAllSettings()
      KwiltRestrictionLedger.remove(id: "personal_limit.\\(ruleId)")
      UserDefaults(suiteName: appGroupIdentifier)?.removeObject(
        forKey: "\\(personalUsageLimitConfigPrefix)\\(activity.rawValue)"
      )
      resolve(true)
      return
    }
#endif
    resolve(false)
  }

  @objc(applyPersonalCompositeRule:resolver:rejecter:)
  func applyPersonalCompositeRule(
    _ json: String,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
#if canImport(DeviceActivity) && canImport(FamilyControls) && canImport(ManagedSettings)
    if #available(iOS 16.0, *) {
      guard isAuthorized() else {
        resolve(["ok": false, "code": "monitoring_unauthorized"])
        return
      }
      guard let data = json.data(using: .utf8),
            let payload = try? JSONDecoder().decode(KwiltPersonalCompositeRulePayload.self, from: data),
            (payload.version == 2 || payload.version == 3), !payload.conditions.isEmpty,
            payload.connector == "all" || payload.connector == "any",
            payload.outcome == "available" || payload.outcome == "pause",
            let shared = UserDefaults(suiteName: appGroupIdentifier) else {
        resolve(["ok": false, "code": "invalid_payload"])
        return
      }
      let ruleId = safeIdentifier(payload.ruleId)
      // The picker stores selections with selectionIdentifier (64 characters).
      // Use the same normalization here so UUID-backed rule IDs are not
      // truncated to a different UserDefaults key during enforcement.
      let selectionId = selectionIdentifier(payload.selectionId)
      let conditionIds = Set(payload.conditions.map { personalCompositeConditionIdentifier($0.id) })
      var uniqueTypes = Set<String>()
      let conditionsAreValid = conditionIds.count == payload.conditions.count
        && payload.conditions.allSatisfy { condition in
          guard let operators = KwiltPersonalRuleCore.operators[condition.type],
            operators.contains((condition.type == "budget" ? condition.preset : condition.operator) ?? "") else { return false }
          if !KwiltPersonalRuleCore.repeatableTypes.contains(condition.type) && !uniqueTypes.insert(condition.type).inserted { return false }
          if condition.type == "real_step_complete" {
            return condition.operator == "is" || condition.operator == "is_not"
          }
          if condition.type == "focus_active" {
            return condition.operator == "is" || condition.operator == "is_not"
          }
          if condition.type == "daily_usage", let minutes = condition.minutes {
            return (condition.operator == "below" || condition.operator == "reaches")
              && minutes >= 1 && minutes <= 1440
          }
          if condition.type == "time_of_day", let minute = condition.minuteOfDay {
            return (condition.operator == "after" || condition.operator == "before")
              && minute >= 0 && minute <= 1439
          }
          if condition.type == "day_of_week", let days = condition.days {
            return (condition.operator == "is" || condition.operator == "is_not")
              && !days.isEmpty && days.count <= 7 && Set(days).count == days.count
              && days.allSatisfy { $0 >= 1 && $0 <= 7 }
          }
          if condition.type == "budget" {
            let presets = ["always_review", "when_hot", "at_95_percent", "when_over", "needs_review"]
            return !(condition.categorySourceId?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true)
              && !(condition.categoryName?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true)
              && presets.contains(condition.preset ?? "")
          }
          return false
        }
      let expressionIsValid = payload.expression.map {
        KwiltPersonalRuleCore.validExpression($0, conditionIds: payload.conditions.map { $0.id }, connector: payload.connector)
      } ?? true
      guard conditionsAreValid && expressionIsValid else {
        resolve(["ok": false, "code": "invalid_conditions"])
        return
      }
      let selection = loadSelection(for: selectionId)
      guard !selection.applicationTokens.isEmpty || !selection.categoryTokens.isEmpty
        || !selection.webDomainTokens.isEmpty else {
        resolve(["ok": false, "code": "missing_selection"])
        return
      }
      let configuration = KwiltPersonalCompositeRuleConfiguration(
        version: 3, ruleId: ruleId, selectionId: selectionId, targetSelection: selection,
        connector: payload.connector, outcome: payload.outcome, conditions: payload.conditions, expression: payload.expression,
        conditionExplanations: payload.conditionExplanations,
        restrictionLabel: String(payload.restrictionLabel.prefix(80))
      )
      guard let configurationData = try? JSONEncoder().encode(configuration) else {
        resolve(["ok": false, "code": "configuration_encoding_failed"])
        return
      }
      let center = DeviceActivityCenter()
      let activeRuleIds = Set((payload.activeRuleIds ?? [payload.ruleId]).map { safeIdentifier($0) })
        .union([ruleId])
      let staleCompositeActivities = center.activities.filter { activity in
        guard let monitoredRuleId = personalCompositeRuleId(from: activity) else { return false }
        return !activeRuleIds.contains(monitoredRuleId)
      }
      if !staleCompositeActivities.isEmpty {
        center.stopMonitoring(staleCompositeActivities)
        staleCompositeActivities.forEach { activity in
          shared.removeObject(forKey: "\\(personalCompositeMonitorConfigPrefix)\\(activity.rawValue)")
          if let staleRuleId = personalCompositeRuleId(from: activity) {
            shared.removeObject(forKey: "\\(personalCompositeConfigPrefix)\\(staleRuleId)")
            personalCompositeStore(for: staleRuleId).clearAllSettings()
            KwiltRestrictionLedger.remove(id: "personal_composite.\\(staleRuleId)")
          }
        }
      }
      let configurationKey = "\\(personalCompositeConfigPrefix)\\(ruleId)"
      let configurationChanged = shared.data(forKey: configurationKey) != configurationData
      let previousConfiguration = shared.data(forKey: configurationKey).flatMap {
        try? JSONDecoder().decode(KwiltPersonalCompositeRuleConfiguration.self, from: $0)
      }
      let sameUsageTargets = previousConfiguration?.targetSelection.applicationTokens == selection.applicationTokens
        && previousConfiguration?.targetSelection.categoryTokens == selection.categoryTokens
        && previousConfiguration?.targetSelection.webDomainTokens == selection.webDomainTokens
      configuration.conditions.filter { $0.type == "daily_usage" }.forEach { condition in
        let previousCondition = previousConfiguration?.conditions.first { $0.id == condition.id && $0.type == "daily_usage" }
        if !sameUsageTargets || previousCondition?.minutes != condition.minutes {
          let key = personalCompositeTruthKey(ruleId: ruleId, conditionId: condition.id)
          shared.removeObject(forKey: key)
          shared.removeObject(forKey: key + ".day")
        }
      }
      shared.set(configurationData, forKey: configurationKey)
      // Missing host evidence explicitly invalidates the previous observation.
      configuration.conditions.filter { KwiltPersonalRuleCore.hostMaxAgeMs[$0.type] != nil }.forEach { condition in
        let key = personalCompositeTruthKey(ruleId: ruleId, conditionId: condition.id) + ".evidence"
        if let evidence = payload.hostEvidence?[condition.id], let data = try? JSONEncoder().encode(evidence) {
          shared.set(data, forKey: key)
        } else {
          shared.removeObject(forKey: key)
        }
      }

      let expectedActivities = configuration.conditions
        .filter { $0.type == "time_of_day" || $0.type == "daily_usage" || $0.type == "day_of_week" }
        .map { personalCompositeActivityName(ruleId: ruleId, conditionId: $0.id) }
      let obsoleteCurrentRuleActivities = center.activities.filter { activity in
        personalCompositeRuleId(from: activity) == ruleId && !expectedActivities.contains(activity)
      }
      if !obsoleteCurrentRuleActivities.isEmpty {
        center.stopMonitoring(obsoleteCurrentRuleActivities)
        obsoleteCurrentRuleActivities.forEach {
          shared.removeObject(forKey: "\\(personalCompositeMonitorConfigPrefix)\\($0.rawValue)")
        }
      }
      let monitoringChanged = configurationChanged
        || expectedActivities.contains { !center.activities.contains($0) }
      if monitoringChanged {
        var activities: [DeviceActivityName] = []
        for condition in configuration.conditions where condition.type == "time_of_day" || condition.type == "daily_usage" || condition.type == "day_of_week" {
          let activity = personalCompositeActivityName(ruleId: ruleId, conditionId: condition.id)
          activities.append(activity)
          shared.set(configurationData, forKey: "\\(personalCompositeMonitorConfigPrefix)\\(activity.rawValue)")
          let schedule: DeviceActivitySchedule
          var events: [DeviceActivityEvent.Name: DeviceActivityEvent] = [:]
          if condition.type == "day_of_week" {
            schedule = DeviceActivitySchedule(
              intervalStart: DateComponents(hour: 0, minute: 0),
              intervalEnd: DateComponents(hour: 23, minute: 59), repeats: true
            )
          } else if condition.type == "time_of_day", let minuteOfDay = condition.minuteOfDay {
            let threshold = DateComponents(hour: minuteOfDay / 60, minute: minuteOfDay % 60)
            schedule = condition.operator == "before"
              ? DeviceActivitySchedule(intervalStart: DateComponents(hour: 0, minute: 0), intervalEnd: threshold, repeats: true)
              : DeviceActivitySchedule(intervalStart: threshold, intervalEnd: DateComponents(hour: 23, minute: 59), repeats: true)
          } else if let minutes = condition.minutes {
            schedule = DeviceActivitySchedule(
              intervalStart: DateComponents(hour: 0, minute: 0),
              intervalEnd: DateComponents(hour: 23, minute: 59), repeats: true
            )
            let event: DeviceActivityEvent
            if #available(iOS 17.4, *) {
              event = DeviceActivityEvent(
                applications: selection.applicationTokens,
                categories: selection.categoryTokens,
                webDomains: selection.webDomainTokens,
                threshold: DateComponents(minute: minutes),
                includesPastActivity: true
              )
            } else {
              event = DeviceActivityEvent(
                applications: selection.applicationTokens,
                categories: selection.categoryTokens,
                webDomains: selection.webDomainTokens,
                threshold: DateComponents(minute: minutes)
              )
            }
            events[DeviceActivityEvent.Name(condition.id)] = event
          } else {
            resolve(["ok": false, "code": "invalid_schedule"])
            return
          }
          center.stopMonitoring([activity])
          do {
            try center.startMonitoring(activity, during: schedule, events: events)
          } catch let error as DeviceActivityCenter.MonitoringError {
            center.stopMonitoring(activities)
            personalCompositeStore(for: ruleId).clearAllSettings()
            KwiltRestrictionLedger.remove(id: "personal_composite.\\(ruleId)")
            shared.removeObject(forKey: configurationKey)
            activities.forEach {
              shared.removeObject(forKey: "\\(personalCompositeMonitorConfigPrefix)\\($0.rawValue)")
            }
            let code: String
            switch error {
            case .excessiveActivities: code = "monitoring_excessive_activities"
            case .intervalTooLong: code = "monitoring_interval_too_long"
            case .intervalTooShort: code = "monitoring_interval_too_short"
            case .invalidDateComponents: code = "monitoring_invalid_date_components"
            case .unauthorized: code = "monitoring_unauthorized"
            @unknown default: code = "monitoring_failed"
            }
            resolve([
              "ok": false,
              "code": code,
              "message": error.errorDescription ?? error.localizedDescription,
              "monitoredActivityCount": center.activities.count,
            ])
            return
          } catch {
            center.stopMonitoring(activities)
            personalCompositeStore(for: ruleId).clearAllSettings()
            KwiltRestrictionLedger.remove(id: "personal_composite.\\(ruleId)")
            shared.removeObject(forKey: configurationKey)
            activities.forEach {
              shared.removeObject(forKey: "\\(personalCompositeMonitorConfigPrefix)\\($0.rawValue)")
            }
            resolve([
              "ok": false,
              "code": "monitoring_failed",
              "message": error.localizedDescription,
              "monitoredActivityCount": center.activities.count,
            ])
            return
          }
        }
      }
      evaluatePersonalCompositeRule(configuration)
      resolve(["ok": true])
      return
    }
#endif
    resolve(["ok": false, "code": "screen_time_unavailable"])
  }

  @objc(clearPersonalCompositeRule:resolver:rejecter:)
  func clearPersonalCompositeRule(
    _ json: String,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
#if canImport(DeviceActivity) && canImport(ManagedSettings)
    if #available(iOS 16.0, *) {
      guard let payload = payload(from: json), let rawRuleId = payload["ruleId"] as? String else {
        resolve(false)
        return
      }
      let ruleId = safeIdentifier(rawRuleId)
      let shared = UserDefaults(suiteName: appGroupIdentifier)
      if let data = shared?.data(forKey: "\\(personalCompositeConfigPrefix)\\(ruleId)"),
         let configuration = try? JSONDecoder().decode(KwiltPersonalCompositeRuleConfiguration.self, from: data) {
        let activities = configuration.conditions
          .filter { $0.type == "time_of_day" || $0.type == "daily_usage" || $0.type == "day_of_week" }
          .map { personalCompositeActivityName(ruleId: ruleId, conditionId: $0.id) }
        DeviceActivityCenter().stopMonitoring(activities)
        activities.forEach { shared?.removeObject(forKey: "\\(personalCompositeMonitorConfigPrefix)\\($0.rawValue)") }
        configuration.conditions.forEach {
          let key = personalCompositeTruthKey(ruleId: ruleId, conditionId: $0.id)
          shared?.removeObject(forKey: key)
          shared?.removeObject(forKey: key + ".day")
          shared?.removeObject(forKey: key + ".evidence")
        }
      }
      shared?.removeObject(forKey: "\\(personalCompositeConfigPrefix)\\(ruleId)")
      personalCompositeStore(for: ruleId).clearAllSettings()
      KwiltRestrictionLedger.remove(id: "personal_composite.\\(ruleId)")
      resolve(true)
      return
    }
#endif
    resolve(false)
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

RCT_EXTERN_METHOD(
  applyPersonalUsageLimit:(NSString *)json
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  clearPersonalUsageLimit:(NSString *)json
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  applyPersonalCompositeRule:(NSString *)json
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  clearPersonalCompositeRule:(NSString *)json
  resolver:(RCTPromiseResolveBlock)resolve
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
