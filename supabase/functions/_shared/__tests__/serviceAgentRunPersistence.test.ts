import { createServiceAgentRunPersistence } from '../serviceAgentRunPersistence';

test('uses only service-scoped RPCs with the exact user identity', async () => {
  const results = [
    { data: { threadId: 'thread-1', messageId: 'message-1', runId: 'run-1', status: 'queued', version: 1, replayed: false }, error: null },
    { data: { version: 2 }, error: null },
    { data: { runId: 'run-1', status: 'complete', version: 3 }, error: null },
  ];
  const rpc = jest.fn(async () => results.shift()!);
  const query = {
    select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(),
    limit: jest.fn(async () => ({ data: [{ role: 'user', body: 'Hi' }], error: null })),
    insert: jest.fn(async () => ({ error: null })),
  };
  const persistence = createServiceAgentRunPersistence({
    admin: { rpc, from: jest.fn(() => query) }, userId: 'user-1',
  });
  const request = {
    channel: 'sms' as const, requestId: 'SM1', prompt: 'Hi', threadId: null,
    channelContext: { phoneLinkId: 'link-1' },
  };
  const run = await persistence.enqueue(request);
  await persistence.start(run, request);
  await persistence.complete({
    run, expectedVersion: 2, body: 'Hello', status: 'complete',
    participatingCapabilities: [], requestClass: 'general',
  });
  expect(rpc).toHaveBeenNthCalledWith(1, 'enqueue_kwilt_agent_run', expect.objectContaining({ p_user_id: 'user-1' }));
  expect(rpc).toHaveBeenNthCalledWith(2, 'transition_kwilt_agent_channel_run', expect.objectContaining({
    p_user_id: 'user-1', p_from_status: 'queued', p_to_status: 'active',
  }));
  expect(rpc).toHaveBeenNthCalledWith(3, 'complete_kwilt_agent_run_with_message', expect.objectContaining({ p_user_id: 'user-1' }));
});

test('stages a cross-channel proposal through one owner-scoped idempotent RPC', async () => {
  const rpc = jest.fn(async () => ({
    data: { id: 'proposal-1', status: 'pending', version: 1, replayed: false }, error: null,
  }));
  const persistence = createServiceAgentRunPersistence({
    admin: { rpc, from: jest.fn() }, userId: 'user-1',
  });
  await expect(persistence.stageProposal({
    run: { threadId: 'thread-1', messageId: 'message-1', runId: 'run-1', status: 'active', version: 2, replayed: false },
    callId: 'call-1',
    proposal: {
      capabilityId: 'goals', title: 'Update Goal', body: 'Review it.',
      operation: {
        type: 'update_goal', targetType: 'goal', targetId: 'goal-1', summary: 'Update Goal',
        payload: { title: 'Calm mornings', expectedUpdatedAt: 'v1' },
      },
    },
  })).resolves.toEqual({ id: 'proposal-1', status: 'pending', version: 1, replayed: false });
  expect(rpc).toHaveBeenCalledWith('stage_kwilt_agent_proposal', {
    p_user_id: 'user-1', p_thread_id: 'thread-1', p_run_id: 'run-1', p_message_id: 'message-1',
    p_call_id: 'call-1', p_capability_id: 'goals', p_title: 'Update Goal', p_body: 'Review it.',
    p_operation_type: 'update_goal', p_target_type: 'goal', p_target_id: 'goal-1',
    p_summary: 'Update Goal', p_payload: { title: 'Calm mornings', expectedUpdatedAt: 'v1' },
  });
});

test('stages a proposal group through one atomic owner-scoped RPC', async () => {
  const rpc = jest.fn(async () => ({
    data: [
      { id: 'proposal-1', status: 'pending', version: 1, replayed: false },
      { id: 'proposal-2', status: 'pending', version: 1, replayed: false },
    ],
    error: null,
  }));
  const persistence = createServiceAgentRunPersistence({
    admin: { rpc, from: jest.fn() }, userId: 'user-1',
  });
  const proposals = [1, 2].map((index) => ({
    capabilityId: 'plan', title: `Chunk ${index}`, body: `Review chunk ${index}.`,
    operation: {
      type: 'schedule_activity_chunk', targetType: 'activity', targetId: 'activity-1',
      summary: `Schedule chunk ${index}`, payload: { groupId: 'group-1', chunkId: `chunk-${index}` },
    },
  }));
  await expect(persistence.stageProposals({
    run: { threadId: 'thread-1', messageId: 'message-1', runId: 'run-1', status: 'active', version: 2, replayed: false },
    callId: 'call-chunks', proposals,
  })).resolves.toHaveLength(2);
  expect(rpc).toHaveBeenCalledWith('stage_kwilt_agent_proposal_batch', expect.objectContaining({
    p_user_id: 'user-1', p_call_id: 'call-chunks', p_proposals: proposals,
  }));
});
