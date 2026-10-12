import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { PERSONAL_RULE_CORE_SWIFT } = require('../plugins/appleEcosystem/personalRuleCore.js');

test('Swift executes the same expression and freshness fixtures as JavaScript', { skip: process.platform !== 'darwin' }, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kwilt-rule-core-'));
  try {
    const source = `import Foundation
${PERSONAL_RULE_CORE_SWIFT}
private struct ExpressionFixture: Decodable {
  let name: String; let connector: String; let outcome: String; let conditionIds: [String]
  let expression: KwiltRuleExpression?; let truth: [String: String]; let expected: String
}
private struct SignalFixture: Decodable {
  let name: String; let condition: KwiltPersonalCompositeCondition; let nowMs: Double; let timeZone: String
  let evidence: KwiltRuleEvidence?; let usageReached: Bool?; let usageDay: String?; let expected: String
}
private struct ValidationFixture: Decodable {
  let name: String; let expression: KwiltRuleExpression; let conditionIds: [String]; let connector: String; let valid: Bool
}
private struct Fixtures: Decodable { let expressions: [ExpressionFixture]; let signals: [SignalFixture]; let validation: [ValidationFixture] }
private let data = try Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1]))
private let fixtures = try JSONDecoder().decode(Fixtures.self, from: data)
for f in fixtures.validation {
  assert(KwiltPersonalRuleCore.validExpression(f.expression, conditionIds: f.conditionIds, connector: f.connector) == f.valid, f.name)
}
for f in fixtures.expressions {
  let truth = f.truth.compactMapValues { $0 == "unknown" ? nil : $0 == "true" }
  if let expression = f.expression {
    assert(KwiltPersonalRuleCore.validExpression(expression, conditionIds: f.conditionIds, connector: f.connector), f.name)
  }
  let decision = f.expression.map { KwiltPersonalRuleCore.evaluate($0, truth: truth) }
    ?? KwiltPersonalRuleCore.combine(f.connector, f.conditionIds.map { truth[$0] })
  let status = decision.map { ($0 == (f.outcome == "pause")) ? "paused" : "available" } ?? "unknown"
  assert(status == f.expected, "Expression: " + f.name + " got " + status)
}
for f in fixtures.signals {
  var calendar = Calendar(identifier: .gregorian)
  calendar.timeZone = TimeZone(identifier: f.timeZone)!
  let value = KwiltPersonalRuleCore.truth(f.condition, now: Date(timeIntervalSince1970: f.nowMs / 1000), calendar: calendar,
    evidence: f.evidence, usageReached: f.usageReached, usageDay: f.usageDay)
  let result = value.map { $0 ? "true" : "false" } ?? "unknown"
  assert(result == f.expected, "Signal: " + f.name + " got " + result)
}
print("contract parity passed")
`;
    const file = join(dir, 'Core.swift');
    await writeFile(file, source);
    const result = execFileSync('swift', [file, fileURLToPath(new URL('../src/features/screen-time/domain/fixtures/personal-rule-contract.json', import.meta.url))], { encoding: 'utf8', timeout: 60000 });
    assert.match(result, /contract parity passed/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
