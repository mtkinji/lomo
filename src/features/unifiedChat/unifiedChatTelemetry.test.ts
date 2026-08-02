import type { AgentToolLoopEvent } from '@kwilt/agent-runtime';
import {
  buildUnifiedChatReconciliationTelemetry,
  buildUnifiedChatRouteTelemetry,
  buildUnifiedChatToolTelemetry,
  buildFamilyScreenTimeDecisionTelemetry,
  buildUnifiedChatAgentJudgmentTelemetry,
  buildUnifiedChatAgentPlanOutcomeTelemetry,
  buildUnifiedChatFreshEntryTelemetry,
} from './unifiedChatTelemetry';

test('fresh-entry telemetry contains only bounded source and outcome metadata', () => {
  expect(buildUnifiedChatFreshEntryTelemetry('widget', 'first_send')).toEqual({
    entry_source: 'widget',
    outcome: 'first_send',
  });
  expect(JSON.stringify(buildUnifiedChatFreshEntryTelemetry('widget', 'abandoned')))
    .not.toMatch(/prompt|message|thread|title|text/i);
});

test('route telemetry contains only bounded routing metadata', () => {
  const record = buildUnifiedChatRouteTelemetry({
    requestClass: 'capability_action', participatingCapabilities: ['todos', 'plan'],
    usePrivateContext: true, clarification: null, policyReason: 'semantic-route:needs scheduling',
  });
  expect(record).toEqual({
    request_class: 'capability_action', capability_ids: 'todos,plan', capability_count: 2,
    route_source: 'semantic', uses_private_context: true,
  });
  expect(Object.keys(record)).toEqual(expect.not.arrayContaining([
    'prompt', 'message', 'messages', 'text', 'title', 'notes', 'arguments',
  ]));
});

test('tool telemetry records tool choice and outcome without arguments', () => {
  const events: AgentToolLoopEvent[] = [
    { sequence: 1, type: 'model_step', round: 1 },
    { sequence: 2, type: 'tool_completed', round: 1, toolCallId: 'call-1', toolId: 'activities.update', resultStatus: 'proposed' },
    { sequence: 3, type: 'unknown_tool', round: 2, toolCallId: 'call-2', toolId: 'send_money' },
  ];
  expect(buildUnifiedChatToolTelemetry(events)).toEqual([
    { tool_id: 'activities.update', outcome: 'proposed', loop_event: 'tool_completed', round: 1 },
    { tool_id: 'send_money', outcome: 'unsupported', loop_event: 'unknown_tool', round: 2 },
  ]);
});

test('reconciliation telemetry reports only capability outcomes and counts', () => {
  const before = {
    thread: { id: 'thread-1' }, messages: [], runs: [], proposals: [],
    receipts: [
      { id: 'receipt-1', capabilityId: 'plan', status: 'reserved' },
      { id: 'receipt-2', capabilityId: 'plan', status: 'reserved' },
      { id: 'receipt-3', capabilityId: 'goals', status: 'applied' },
    ],
  };
  const after = {
    ...before,
    receipts: [
      { id: 'receipt-1', capabilityId: 'plan', status: 'applied' },
      { id: 'receipt-2', capabilityId: 'plan', status: 'failed' },
      { id: 'receipt-3', capabilityId: 'goals', status: 'applied' },
    ],
  };

  expect(buildUnifiedChatReconciliationTelemetry(before as never, after as never)).toEqual([
    { capability_id: 'plan', outcome: 'applied', receipt_count: 1, trigger: 'thread_load' },
    { capability_id: 'plan', outcome: 'failed', receipt_count: 1, trigger: 'thread_load' },
  ]);
  expect(buildUnifiedChatReconciliationTelemetry(before as never, after as never)
    .flatMap((record) => Object.keys(record))).toEqual(expect.not.arrayContaining([
    'thread_id', 'receipt_id', 'proposal_id', 'title', 'prompt', 'message',
  ]));
});

test('family Screen Time decision telemetry excludes child, app, expiry, and message content', () => {
  const record = buildFamilyScreenTimeDecisionTelemetry({
    id: 'proposal-1', threadId: 'thread-1', runId: 'run-1', messageId: null,
    capabilityId: 'screenTime', title: 'Block Brawl Stars', body: 'Charlie · until 1 PM',
    status: 'pending', version: 1, createdAt: 'created', updatedAt: 'updated',
    operation: {
      id: 'operation-1', proposalId: 'proposal-1', capabilityId: 'screenTime',
      type: 'block_family_screen_time_selection', targetId: null, summary: 'Block Brawl Stars',
      idempotencyKey: 'one', sequence: 1,
      payload: {
        targets: [{ childMembershipId: 'charlie', selectionId: 'opaque-selection', expectedVersion: 7 }],
        timeBasis: 'wall_clock', expiresAt: '2026-07-30T13:00:00.000Z',
      },
    },
  }, 'approve', 'saved');
  expect(record).toEqual({
    capability_id: 'screenTime', operation_type: 'block_family_screen_time_selection',
    decision: 'approve', target_count: 1, time_basis: 'wall_clock', outcome: 'saved',
  });
  expect(JSON.stringify(record)).not.toMatch(/charlie|brawl|opaque|expires|message/i);
});

test('agent judgment telemetry contains only bounded classifications', () => {
  const judgment = {
    schemaVersion: 1 as const,
    userJob: 'Remember a private title',
    desiredOutcome: 'Create a dated private To-do',
    requestClass: 'capability_action' as const,
    participatingCapabilities: ['todos' as const, 'plan' as const],
    usePrivateContext: true,
    informationNeed: 'stable' as const,
    executionMode: 'multi_tool' as const,
    constraints: [
      { kind: 'title' as const, sourceText: 'Call private person', normalizedValue: 'Call private person' },
      { kind: 'date' as const, sourceText: 'August 5', normalizedValue: '2026-08-05' },
    ],
    steps: [
      { sequence: 1, objective: 'Read private day', toolId: 'plan.read_day_context', dependsOn: null },
      { sequence: 2, objective: 'Capture private title', toolId: 'activities.capture', dependsOn: 1 },
    ],
    clarificationQuestion: null,
    confidence: 0.84,
    reason: 'Private model reason',
  };

  const selected = buildUnifiedChatAgentJudgmentTelemetry(judgment, 'model');
  expect(selected).toEqual({
    judgment_source: 'model',
    request_class: 'capability_action',
    execution_mode: 'multi_tool',
    capability_ids: 'todos,plan',
    tool_ids: 'plan.read_day_context,activities.capture',
    step_count: 2,
    constraint_kinds: 'title,date',
    confidence_bucket: 'high',
  });
  expect(Object.keys(selected)).toEqual(expect.arrayContaining([
    'judgment_source', 'request_class', 'execution_mode', 'capability_ids', 'tool_ids',
    'step_count', 'constraint_kinds', 'confidence_bucket',
  ]));
  expect(JSON.stringify(selected)).not.toMatch(/private|2026-08-05|August 5|reason|argument/i);

  expect(buildUnifiedChatAgentPlanOutcomeTelemetry(judgment, 'model', 'review', null)).toEqual({
    ...selected,
    outcome: 'review',
    failure_code: null,
  });
});

test('agent judgment fallback telemetry omits all user and model content', () => {
  const record = buildUnifiedChatAgentJudgmentTelemetry(null, 'semantic_fallback', {
    requestClass: 'capability_question',
    participatingCapabilities: ['plan'],
  });
  expect(record).toEqual({
    judgment_source: 'semantic_fallback',
    request_class: 'capability_question',
    execution_mode: null,
    capability_ids: 'plan',
    tool_ids: '',
    step_count: 0,
    constraint_kinds: '',
    confidence_bucket: null,
  });
});
