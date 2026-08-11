import type { AgentToolLoopEvent } from '@kwilt/agent-runtime';
import {
  buildUnifiedChatConversationLatencyTelemetry,
  buildUnifiedChatReconciliationTelemetry,
  buildUnifiedChatRouteTelemetry,
  buildUnifiedChatToolTelemetry,
  buildFamilyScreenTimeDecisionTelemetry,
  buildUnifiedChatAgentJudgmentTelemetry,
  buildUnifiedChatAgentPlanOutcomeTelemetry,
  buildUnifiedChatFreshEntryTelemetry,
  buildUnifiedChatOperationalTelemetry,
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

test('conversation latency telemetry buckets timings without content or identifiers', () => {
  const record = buildUnifiedChatConversationLatencyTelemetry({
    outcome: 'completed',
    planningStrategy: 'fast_direct',
    requestClass: 'general',
    timings: {
      transcript_final_ms: 480,
      planning_complete_ms: 1_250,
      context_ready_ms: 2_100,
      answer_ready_ms: 2_950,
      first_progress_audio_ms: 720,
      first_audio_ms: 4_500,
    },
    interrupted: false,
    fallbackUsed: true,
  });

  expect(record).toEqual({
    outcome: 'completed',
    planning_strategy: 'fast_direct',
    request_class: 'general',
    transcript_final_bucket: 'under_1s',
    planning_complete_bucket: '1_2s',
    context_ready_bucket: '2_3s',
    answer_ready_bucket: '2_3s',
    first_progress_audio_bucket: 'under_1s',
    first_audio_bucket: '3_6s',
    interrupted: false,
    fallback_used: true,
  });
  expect(Object.keys(record)).toEqual(expect.not.arrayContaining([
    'prompt', 'message', 'text', 'transcript', 'object_id', 'thread_id', 'run_id',
  ]));
});

test('conversation latency telemetry omits unavailable timing stages', () => {
  expect(buildUnifiedChatConversationLatencyTelemetry({
    outcome: 'interrupted',
    planningStrategy: 'full',
    requestClass: 'capability_question',
    timings: {},
    interrupted: true,
    fallbackUsed: false,
  })).toEqual({
    outcome: 'interrupted',
    planning_strategy: 'full',
    request_class: 'capability_question',
    interrupted: true,
    fallback_used: false,
  });
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

test('prerequisite decision telemetry records only a bounded threshold bucket', () => {
  const record = buildFamilyScreenTimeDecisionTelemetry({
    ...({
      id: 'proposal-2', threadId: 'thread-1', runId: 'run-1', messageId: null,
      capabilityId: 'screenTime', title: 'Use Gospel Library before Games', body: 'Private labels',
      status: 'pending', version: 1, createdAt: 'created', updatedAt: 'updated',
      operation: {
        id: 'operation-2', proposalId: 'proposal-2', capabilityId: 'screenTime',
        type: 'create_family_screen_time_prerequisite_agreement', targetId: null,
        summary: 'Private labels', idempotencyKey: 'two', sequence: 1,
        payload: {
          childMembershipId: 'charlie', targetSelectionId: 'games', expectedPolicyVersion: 2,
          rule: {
            weekdays: [0, 1, 2, 3, 4, 5, 6], startMinute: 0, endMinute: 1440,
            dailyLimitMinutes: null,
            prerequisiteActivity: { selectionId: 'gospel-library', thresholdMinutes: 5, reset: 'daily' },
          },
        },
      },
    } as const),
  }, 'approve', 'saved');
  expect(record).toEqual({
    capability_id: 'screenTime', operation_type: 'create_family_screen_time_prerequisite_agreement',
    decision: 'approve', target_count: 1, time_basis: 'foreground_usage_prerequisite',
    threshold_minutes_bucket: '1_5', outcome: 'saved',
  });
  expect(JSON.stringify(record)).not.toMatch(/charlie|gospel|games|selection/i);
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
    authorization: 'explicit_request' as const,
    evidenceScope: 'focused' as const,
    responseContract: 'evidence_linked' as const,
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
    authorization: 'explicit_request',
    evidence_scope: 'focused',
    response_contract: 'evidence_linked',
    confidence_bucket: 'high',
  });
  expect(Object.keys(selected)).toEqual(expect.arrayContaining([
    'judgment_source', 'request_class', 'execution_mode', 'capability_ids', 'tool_ids',
    'step_count', 'constraint_kinds', 'authorization', 'evidence_scope',
    'response_contract', 'confidence_bucket',
  ]));
  expect(JSON.stringify(selected)).not.toMatch(/private|2026-08-05|August 5|reason|argument/i);

  expect(buildUnifiedChatAgentPlanOutcomeTelemetry(judgment, 'model', 'review', null, undefined, {
    attemptNumber: 2,
    recoveryAttempted: true,
    terminalFailure: false,
  })).toEqual({
    ...selected,
    outcome: 'review',
    failure_code: null,
    attempt_number: 2,
    recovery_attempted: true,
    terminal_failure: false,
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
    authorization: null,
    evidence_scope: null,
    response_contract: null,
    confidence_bucket: null,
  });
});

test('operational telemetry contains contract and outcome enums and counts without life data', () => {
  const record = buildUnifiedChatOperationalTelemetry({
    turnContract: {
      schemaVersion: 2, userJob: 'private job', desiredOutcome: 'private outcome',
      constraints: ['private constraint'], requestClass: 'capability_action',
      participatingCapabilities: ['money'], usePrivateContext: true,
      authorization: 'explicit_request', evidenceScope: 'broad', responseContract: 'evidence_linked',
      action: {
        operationIds: ['money.category.rename'], targetScope: 'all_matching',
        targetQuery: 'private target query',
      },
      referent: { runId: 'private-run-id', kind: 'correction' },
    },
    context: {
      evidence: [], omissions: [], coverage: {
        sufficient: true, consideredCount: 9, includedCount: 9, omittedCount: 0, note: 'private note',
      },
    },
    actionOutcomeTruth: {
      state: 'prepared', visibleBody: 'private response', invariantCodes: [],
      loadedRecordCount: 9, preparedChangeCount: 9, failedToolCount: 0,
    },
  });

  expect(record).toEqual({
    turn_contract_version: 2, request_class: 'capability_action', capability_ids: 'money',
    authorization: 'explicit_request', evidence_scope: 'broad', response_contract: 'evidence_linked',
    target_scope: 'all_matching', referent_kind: 'correction', considered_count: 9,
    included_count: 9, omitted_count: 0, prepared_change_count: 9, failed_tool_count: 0,
    invariant_codes: '', outcome_state: 'prepared',
  });
  expect(JSON.stringify(record)).not.toMatch(/private|run-id|private constraint|private note/i);
});
