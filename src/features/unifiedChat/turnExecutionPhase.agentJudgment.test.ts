import type { AgentJudgment } from './agentJudgment';
import {
  buildAgentJudgmentGrounding,
  buildActionTargetGrounding,
  selectAgentJudgmentTools,
} from './turnExecutionPhase';
import { UNIFIED_CHAT_TOOL_CATALOG } from './toolCatalog';

const judgment: AgentJudgment = {
  schemaVersion: 1,
  userJob: 'Make room for a dentist appointment and remember the prerequisite call',
  desiredOutcome: 'A call To-do exists and the appointment can be placed next week',
  requestClass: 'capability_action',
  participatingCapabilities: ['todos', 'plan'],
  usePrivateContext: true,
  informationNeed: 'stable',
  executionMode: 'multi_tool',
  constraints: [
    { kind: 'date', sourceText: 'next week', normalizedValue: '2026-08-03/2026-08-09' },
    { kind: 'other', sourceText: 'call first', normalizedValue: 'call first' },
  ],
  steps: [
    { sequence: 1, objective: "Read next week's Plan", toolId: 'plan.read_day_context', dependsOn: null },
    { sequence: 2, objective: 'Capture the prerequisite call', toolId: 'activities.capture', dependsOn: 1 },
    { sequence: 3, objective: 'Propose placement after the read result', toolId: 'plan.schedule_activity', dependsOn: 2 },
  ],
  clarificationQuestion: null,
  confidence: 0.9,
  reason: 'The steps depend on one another.',
};

test('grounds the job and exposes only judgment-selected tools', () => {
  expect(buildAgentJudgmentGrounding(judgment)).toContain([
    'User job: Make room for a dentist appointment and remember the prerequisite call.',
    'Desired outcome: A call To-do exists and the appointment can be placed next week.',
    'Required constraints: next week; call first.',
    'Execution mode: multi_tool.',
    'Planned steps:',
    '1. Read next week\'s Plan.',
    '2. Capture the prerequisite call. (after step 1)',
    '3. Propose placement after the read result. (after step 2)',
  ].join('\n'));
  expect(selectAgentJudgmentTools(UNIFIED_CHAT_TOOL_CATALOG, judgment).map((tool) => tool.id)).toEqual([
    'plan.read_day_context',
    'activities.capture',
    'plan.schedule_activity',
  ]);
});

test('grounds all-matching semantics without naming a capability-specific bulk action', () => {
  expect(buildActionTargetGrounding({
    operationIds: ['goals.update'],
    targetScope: 'all_matching',
    targetQuery: 'Update every goal.',
  })).toContain('every resolved targetId');
  expect(buildActionTargetGrounding({
    operationIds: ['goals.update'],
    targetScope: 'all_matching',
    targetQuery: 'Update every goal.',
  })).not.toMatch(/money|categor|goal/i);
});
