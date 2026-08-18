import type { AgentJudgment } from './agentJudgment';
import {
  buildAgentJudgmentGrounding,
  buildActionTargetGrounding,
  buildTodoActionGrounding,
  buildCreateCalendarContinuation,
  buildTurnResponseGrounding,
  selectAgentJudgmentTools,
  selectSubjectSafeRuntimeTools,
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
  authorization: 'explicit_request',
  evidenceScope: 'focused',
  responseContract: 'evidence_linked',
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
    'Action authority: explicit_request.',
    'Evidence scope: focused.',
    'Response contract: evidence_linked.',
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

test('self-directed Screen Time requests cannot receive child-control tools', () => {
  const screenTimeTools = UNIFIED_CHAT_TOOL_CATALOG.filter((tool) =>
    tool.capabilityId === 'screenTime' || tool.id === 'money.app_control.review');

  expect(selectSubjectSafeRuntimeTools(
    screenTimeTools,
    'Set up Screen Time controls for me.',
  ).map((tool) => tool.id)).toEqual(expect.arrayContaining([
    'screen_time.read',
    'screen_time.personal.setup.open',
    'money.app_control.review',
  ]));
  expect(selectSubjectSafeRuntimeTools(
    screenTimeTools,
    'Set up Screen Time controls for me.',
  ).map((tool) => tool.id)).not.toEqual(expect.arrayContaining([
    'screen_time.configure',
    'screen_time.override.allow',
  ]));

  const screenshotPrompt = 'Set a screen time rule that allows me to use Instagram for 10 minutes before I have to turn it off.';
  const screenshotTools = selectSubjectSafeRuntimeTools(screenTimeTools, screenshotPrompt).map((tool) => tool.id);
  expect(screenshotTools).toEqual(expect.arrayContaining([
    'screen_time.read',
    'screen_time.personal.limit.open',
  ]));
  expect(screenshotTools).not.toEqual(expect.arrayContaining([
    'screen_time.selection.open',
    'screen_time.device.setup.open',
    'screen_time.override.allow',
  ]));
});

test('grounds evidence-linked reasoning and no-change truth without capability-specific wording', () => {
  const grounding = buildTurnResponseGrounding({
    authorization: 'none', evidenceScope: 'broad', responseContract: 'evidence_linked',
  });
  for (const line of [
    'Lead with the useful conclusion.',
    'Name the material observations that support it.',
    'Distinguish observation from inference and state meaningful coverage limits.',
    'Do not prepare, imply, or claim a change; this turn has no action authority.',
  ]) expect(grounding).toContain(line);

  expect(buildTurnResponseGrounding({
    authorization: 'explicit_request', evidenceScope: 'focused', responseContract: 'evidence_linked',
  })).not.toContain('this turn has no action authority');
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

test('does not contradict all-matching To-do work with the single-operation limit', () => {
  const bulkGrounding = buildTodoActionGrounding(true).join(' ');
  expect(bulkGrounding).toContain('every resolved matching Activity');
  expect(bulkGrounding).not.toContain('at most one To-do operation');

  expect(buildTodoActionGrounding(false).join(' ')).toContain('at most one To-do operation');
});

test('keeps create-plus-calendar intent as an explicit post-create continuation', () => {
  expect(buildCreateCalendarContinuation({
    prompt: 'Remind me to replace the furnace filter in 10 months and put it on my calendar.',
    stagedCreate: true,
    stagedPlanPlacement: false,
  })).toContain('After it’s created');
  expect(buildCreateCalendarContinuation({
    prompt: 'Put the existing school call on my calendar.',
    stagedCreate: false,
    stagedPlanPlacement: true,
  })).toBeNull();
});
