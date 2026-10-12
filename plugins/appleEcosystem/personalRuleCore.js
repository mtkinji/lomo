const catalog = require('../../src/features/screen-time/domain/personalRuleConditionCatalog.json');

// Embedded unchanged in both native targets; Foundation-only for executable parity tests.
const PERSONAL_RULE_CORE_SWIFT = `
private struct KwiltPersonalCompositeCondition: Codable {
  let id: String
  let type: String
  let \`operator\`: String?
  let minutes: Int?
  let minuteOfDay: Int?
  let days: [Int]?
  let categorySourceId: String?
  let categoryName: String?
  let preset: String?
}
private struct KwiltRuleExpression: Codable {
  let type: String
  let id: String?
  let conditionId: String?
  let connector: String?
  let children: [KwiltRuleExpression]?
}
private struct KwiltRuleEvidence: Codable {
  let value: Bool
  let observedAtMs: Double
  let expiresAtMs: Double
}
private enum KwiltPersonalRuleCore {
  static let operators: [String: [String]] = [${Object.entries(catalog).map(([type, c]) => `"${type}": [${c.operators.map(op => `"${op}"`).join(', ')}]`).join(', ')}]
  static let repeatableTypes: Set<String> = [${Object.entries(catalog).filter(([, c]) => c.repeatable).map(([type]) => `"${type}"`).join(', ')}]
  static let hostMaxAgeMs: [String: Double] = [${Object.entries(catalog).filter(([, c]) => c.source === 'host').map(([type, c]) => `"${type}": ${c.maxAgeMs}`).join(', ')}]

  static func combine(_ connector: String, _ values: [Bool?]) -> Bool? {
    guard !values.isEmpty else { return nil }
    if connector == "all" {
      if values.contains(where: { $0 == false }) { return false }
      return values.contains(where: { $0 == nil }) ? nil : true
    }
    guard connector == "any" else { return nil }
    if values.contains(where: { $0 == true }) { return true }
    return values.contains(where: { $0 == nil }) ? nil : false
  }
  static func evaluate(_ node: KwiltRuleExpression, truth: [String: Bool], depth: Int = 1) -> Bool? {
    guard depth <= 5 else { return nil }
    if node.type == "condition", let id = node.conditionId { return truth[id] }
    guard node.type == "group", let children = node.children, let connector = node.connector else { return nil }
    return combine(connector, children.map { evaluate($0, truth: truth, depth: depth + 1) })
  }
  static func validExpression(_ root: KwiltRuleExpression, conditionIds: [String], connector: String) -> Bool {
    var references = Set<String>()
    var groups = Set<String>()
    var count = 0
    func visit(_ node: KwiltRuleExpression, _ depth: Int) -> Bool {
      count += 1
      guard count <= 256 else { return false }
      if node.type == "condition" {
        guard let id = node.conditionId, conditionIds.contains(id), !references.contains(id) else { return false }
        references.insert(id)
        return true
      }
      guard node.type == "group", depth <= 4, let id = node.id,
        !id.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, !groups.contains(id), !conditionIds.contains(id),
        node.connector == "all" || node.connector == "any", let children = node.children, !children.isEmpty else { return false }
      groups.insert(id)
      return children.allSatisfy { visit($0, depth + 1) }
    }
    return root.type == "group" && root.connector == connector && visit(root, 1) && references.count == conditionIds.count
  }
  static func decisiveIds(_ node: KwiltRuleExpression, truth: [String: Bool]) -> Set<String> {
    guard let result = evaluate(node, truth: truth) else { return [] }
    if node.type == "condition", let id = node.conditionId { return [id] }
    return (node.children ?? []).filter { evaluate($0, truth: truth) == result }
      .reduce(into: Set<String>()) { $0.formUnion(decisiveIds($1, truth: truth)) }
  }
  static func dayKey(_ date: Date, calendar: Calendar = .current) -> String {
    let parts = calendar.dateComponents([.era, .year, .month, .day], from: date)
    return "\\(parts.era ?? 0)-\\(parts.year ?? 0)-\\(parts.month ?? 0)-\\(parts.day ?? 0)"
  }
  static func truth(_ condition: KwiltPersonalCompositeCondition, now: Date = Date(), calendar: Calendar = .current,
    evidence: KwiltRuleEvidence? = nil, usageReached: Bool? = nil, usageDay: String? = nil) -> Bool? {
    if condition.type == "time_of_day", let threshold = condition.minuteOfDay {
      let parts = calendar.dateComponents([.hour, .minute], from: now)
      let minute = (parts.hour ?? 0) * 60 + (parts.minute ?? 0)
      return condition.operator == "before" ? minute < threshold : minute >= threshold
    }
    if condition.type == "day_of_week", let days = condition.days {
      let weekday = (calendar.component(.weekday, from: now) + 5) % 7 + 1
      let included = days.contains(weekday)
      return condition.operator == "is_not" ? !included : included
    }
    if condition.type == "daily_usage" {
      guard usageDay == dayKey(now, calendar: calendar), let reached = usageReached else { return nil }
      return condition.operator == "below" ? !reached : reached
    }
    guard let maxAge = hostMaxAgeMs[condition.type], let evidence = evidence else { return nil }
    let nowMs = now.timeIntervalSince1970 * 1000
    guard evidence.observedAtMs.isFinite, evidence.expiresAtMs.isFinite,
      evidence.observedAtMs <= nowMs, evidence.expiresAtMs > nowMs,
      evidence.expiresAtMs > evidence.observedAtMs,
      evidence.expiresAtMs - evidence.observedAtMs <= maxAge else { return nil }
    return condition.operator == "is_not" ? !evidence.value : evidence.value
  }
}
`;
module.exports = { PERSONAL_RULE_CORE_SWIFT };
