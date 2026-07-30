import type { AgentToolLoopEvent } from '@kwilt/agent-runtime';
import {
  buildUnifiedChatReconciliationTelemetry,
  buildUnifiedChatRouteTelemetry,
  buildUnifiedChatToolTelemetry,
  buildFamilyScreenTimeDecisionTelemetry,
} from './unifiedChatTelemetry';

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
