import { buildAgentSystemPrompt, executeCanonicalAgentRun, type AgentRunPersistence } from '../agentRunCoordinator';
import type { CanonicalAgentRunRequest, ServerAgentModelStep } from '../agentRuntime';

const request: CanonicalAgentRunRequest = {
  channel: 'sms', requestId: 'SM123', prompt: 'Open Screen Time settings', threadId: null,
  channelContext: { phoneLinkId: 'link-1', externalMessageId: 'SM123' },
};
const run = {
  threadId: 'thread-1', messageId: 'message-1', runId: 'run-1',
  status: 'queued', version: 1, replayed: false,
};

test('grounds relative Plan dates in the linked user timezone', () => {
  expect(buildAgentSystemPrompt({
    ...request,
    channelContext: { ...request.channelContext, timeZone: 'America/Denver' },
  }, new Date('2026-07-24T05:30:00.000Z'))).toContain(
    'Current date in America/Denver is 2026-07-23',
  );
});

test('tells the model to combine capability-owned reads for cross-domain questions', () => {
  expect(buildAgentSystemPrompt(request)).toContain(
    'For questions that span Kwilt, call every relevant read tool and synthesize their results',
  );
});

test('requires explicit relationship facts instead of inferred sensitive memory', () => {
  expect(buildAgentSystemPrompt(request)).toContain(
    'Use relationships.remember only when the user explicitly asks Kwilt to remember or directly states a personal fact',
  );
  expect(buildAgentSystemPrompt(request)).toContain('Never infer sensitive relationship facts');
});

function persistence(order: string[]): AgentRunPersistence {
  return {
    enqueue: jest.fn(async () => { order.push('enqueue'); return run; }),
    start: jest.fn(async () => { order.push('start'); return 2; }),
    loadHistory: jest.fn(async () => { order.push('history'); return [{ role: 'user' as const, content: request.prompt }]; }),
    stageClientAction: jest.fn(async () => { order.push('stage'); }),
    stageProposal: jest.fn(async () => { order.push('proposal'); return { id: 'proposal-1', status: 'pending', version: 1, replayed: false }; }),
    stageProposals: jest.fn(async ({ proposals }) => {
      order.push('proposals');
      return proposals.map((_, index) => ({ id: `proposal-${index + 1}`, status: 'pending', version: 1, replayed: false }));
    }),
    complete: jest.fn(async (input) => { order.push('complete'); return { id: input.run.runId, status: input.status }; }),
    fail: jest.fn(async () => { order.push('fail'); }),
  };
}

test('persists causal run state around the shared bounded loop', async () => {
  const order: string[] = [];
  const store = persistence(order);
  const steps: ServerAgentModelStep[] = [
    { content: null, toolCalls: [{ id: 'call-1', toolId: 'screen_time.configure', arguments: {} }] },
    { content: 'Screen Time is configured.', toolCalls: [] },
  ];
  await expect(executeCanonicalAgentRun({
    request, userId: 'user-1', persistence: store,
    dataClient: { from: jest.fn() },
    modelStep: async () => steps.shift()!,
  })).resolves.toMatchObject({
    state: 'complete',
    answer: 'I prepared that next step for review in Kwilt. The underlying action has not happened yet.',
  });
  expect(order).toEqual(['enqueue', 'start', 'history', 'stage', 'complete']);
  expect(store.complete).toHaveBeenCalledWith(expect.objectContaining({
    expectedVersion: 2, participatingCapabilities: ['screenTime'], requestClass: 'capability_question',
  }));
});

test('returns an idempotent replay without invoking the model', async () => {
  const order: string[] = [];
  const store = persistence(order);
  (store.enqueue as jest.Mock).mockResolvedValue({ ...run, status: 'complete', version: 3, replayed: true });
  const modelStep = jest.fn();
  await expect(executeCanonicalAgentRun({
    request, userId: 'user-1', persistence: store,
    dataClient: { from: jest.fn() }, modelStep,
  })).resolves.toMatchObject({ state: 'complete', replayed: true });
  expect(modelStep).not.toHaveBeenCalled();
  expect(order).toEqual([]);
});

test('records a durable failure after an active run throws', async () => {
  const order: string[] = [];
  const store = persistence(order);
  await expect(executeCanonicalAgentRun({
    request, userId: 'user-1', persistence: store,
    dataClient: { from: jest.fn() }, modelStep: async () => { throw new Error('provider_failed:503'); },
  })).rejects.toThrow('provider_failed');
  expect(order).toEqual(['enqueue', 'start', 'history', 'fail']);
  expect(store.fail).toHaveBeenCalledWith(expect.objectContaining({ expectedVersion: 2, code: 'provider_failed' }));
});

test('returns a tool-level denial when channel permission rejects a discovered write', async () => {
  const order: string[] = [];
  const store = persistence(order);
  const modelStep = jest.fn()
    .mockResolvedValueOnce({ content: null, toolCalls: [{ id: 'call-1', toolId: 'activities.capture', arguments: { title: 'Buy milk' } }] })
    .mockResolvedValueOnce({ content: 'I cannot add that from this channel yet.', toolCalls: [] });
  await executeCanonicalAgentRun({
    request, userId: 'user-1', persistence: store, dataClient: { from: jest.fn() }, modelStep,
    authorizeTool: (candidate) => candidate.id !== 'activities.capture',
  });
  expect(modelStep.mock.calls[1][0].messages).toContainEqual(expect.objectContaining({
    role: 'tool', content: expect.stringContaining('tool_not_permitted'),
  }));
});

test('persists a server-discovered Goal update as a mobile-review proposal', async () => {
  const order: string[] = [];
  const store = persistence(order);
  const goalQuery = {
    select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(async () => ({
      data: { id: 'goal-1', data: { title: 'Calmer mornings', updatedAt: 'v1' }, updated_at: 'v1' }, error: null,
    })),
  };
  const steps: ServerAgentModelStep[] = [
    { content: null, toolCalls: [{ id: 'call-goal', toolId: 'goals.update', arguments: { goalId: 'goal-1', fields: { title: 'Calm mornings' } } }] },
    { content: 'Done — I renamed that Goal.', toolCalls: [] },
  ];
  await expect(executeCanonicalAgentRun({
    request: { ...request, prompt: 'Rename my calmer mornings goal to calm mornings' },
    userId: 'user-1', persistence: store,
    dataClient: { from: jest.fn(() => goalQuery) }, modelStep: async () => steps.shift()!,
  })).resolves.toMatchObject({
    answer: 'I prepared that change for review in Kwilt. It has not been applied yet.',
  });
  expect(order).toEqual(['enqueue', 'start', 'history', 'proposal', 'complete']);
  expect(store.stageProposal).toHaveBeenCalledWith(expect.objectContaining({
    run, callId: 'call-goal', proposal: expect.objectContaining({ capabilityId: 'goals' }),
  }));
  expect(store.complete).toHaveBeenCalledWith(expect.objectContaining({
    body: 'I prepared that change for review in Kwilt. It has not been applied yet.',
  }));
});

test('keeps a Phone-authored Profile edit on the versioned native Profile review path', async () => {
  const order: string[] = [];
  const store = persistence(order);
  const profileQuery = {
    select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(async () => ({
      data: {
        profile_id: 'profile-1', full_name: 'Andrew', age_range: '35-44',
        profile_updated_at: 'profile-v1',
      },
      error: null,
    })),
  };
  const steps: ServerAgentModelStep[] = [
    {
      content: null,
      toolCalls: [{
        id: 'call-profile', toolId: 'profile.update', arguments: { fields: { fullName: 'Andy' } },
      }],
    },
    { content: 'Done — I changed your name to Andy.', toolCalls: [] },
  ];
  await expect(executeCanonicalAgentRun({
    request: { ...request, prompt: 'Change my profile name to Andy' },
    userId: 'user-1', persistence: store,
    dataClient: { from: jest.fn(() => profileQuery) }, modelStep: async () => steps.shift()!,
  })).resolves.toMatchObject({
    answer: 'I prepared that change for review in Kwilt. It has not been applied yet.',
  });
  expect(store.stageProposal).toHaveBeenCalledWith(expect.objectContaining({
    run, callId: 'call-profile',
    proposal: expect.objectContaining({
      capabilityId: 'profile',
      operation: expect.objectContaining({
        type: 'update_profile', targetId: 'profile-1',
        payload: { fullName: 'Andy', expectedUpdatedAt: 'profile-v1' },
      }),
    }),
  }));
  expect(store.complete).toHaveBeenCalledWith(expect.objectContaining({
    body: 'I prepared that change for review in Kwilt. It has not been applied yet.',
    participatingCapabilities: ['profile'],
  }));
});

test('keeps a Phone-authored Activity step change on the existing mobile review path', async () => {
  const order: string[] = [];
  const store = persistence(order);
  const activityQuery = {
    select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(async () => ({
      data: {
        id: 'activity-1', updated_at: 'v1',
        data: {
          title: 'Pack lunch', updatedAt: 'v1',
          steps: [{ id: 'step-1', title: 'Make sandwich', completedAt: null, orderIndex: 0 }],
        },
      },
      error: null,
    })),
  };
  const steps: ServerAgentModelStep[] = [
    {
      content: null,
      toolCalls: [{
        id: 'call-step', toolId: 'activities.steps.complete',
        arguments: { activityId: 'activity-1', stepId: 'step-1', completed: true },
      }],
    },
    { content: 'Done — I checked off Make sandwich.', toolCalls: [] },
  ];
  await expect(executeCanonicalAgentRun({
    request: { ...request, prompt: 'Check off make sandwich on pack lunch' },
    userId: 'user-1', persistence: store,
    dataClient: { from: jest.fn(() => activityQuery) }, modelStep: async () => steps.shift()!,
  })).resolves.toMatchObject({
    answer: 'I prepared that change for review in Kwilt. It has not been applied yet.',
  });
  expect(store.stageProposal).toHaveBeenCalledWith(expect.objectContaining({
    run, callId: 'call-step',
    proposal: expect.objectContaining({
      capabilityId: 'todos',
      operation: expect.objectContaining({ type: 'complete_activity_step', targetId: 'activity-1' }),
    }),
  }));
});

test('answers a Phone Plan request from the shared priority order with timezone-grounded tool routing', async () => {
  const order: string[] = [];
  const store = persistence(order);
  const activityRows = [
    {
      id: 'easy', updated_at: 'easy-v1',
      data: {
        id: 'easy', title: 'Easy errand', status: 'planned', type: 'task', tags: [],
        priority: 2, estimateMinutes: 10, createdAt: '2026-07-01T12:00:00.000Z', updatedAt: 'easy-v1',
      },
    },
    {
      id: 'urgent', updated_at: 'urgent-v1',
      data: {
        id: 'urgent', title: 'Important deep work', status: 'planned', type: 'task', tags: [],
        goalId: 'goal-1', scheduledDate: '2026-07-24', estimateMinutes: 120,
        createdAt: '2026-07-01T12:00:00.000Z', updatedAt: 'urgent-v1',
      },
    },
  ];
  const goalRows = [{
    id: 'goal-1', updated_at: 'goal-v1',
    data: { id: 'goal-1', title: 'Finish the build', status: 'in_progress', priority: 1, updatedAt: 'goal-v1' },
  }];
  const queryFor = (data: unknown) => {
    const query: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'order']) query[method] = jest.fn(() => query);
    query.limit = jest.fn(async () => ({ data, error: null }));
    return query;
  };
  const dataClient = {
    from: jest.fn((table: string) => queryFor(table === 'kwilt_activities' ? activityRows : goalRows)),
  };
  const modelStep = jest.fn()
    .mockResolvedValueOnce({
      content: null,
      toolCalls: [{ id: 'call-plan', toolId: 'plan.recommend_day', arguments: { targetDate: '2026-07-24' } }],
    })
    .mockResolvedValueOnce({
      content: 'Tomorrow: 1. Important deep work 2. Easy errand. These are priority-ranked; calendar placement is unavailable.',
      toolCalls: [],
    });

  await expect(executeCanonicalAgentRun({
    request: {
      ...request,
      prompt: 'What should I add to my plan tomorrow?',
      channelContext: { ...request.channelContext, timeZone: 'America/Denver' },
    },
    userId: 'user-1', persistence: store, dataClient, modelStep,
  })).resolves.toMatchObject({
    state: 'complete',
    answer: expect.stringMatching(/Important deep work.*Easy errand/),
  });
  expect(modelStep.mock.calls[0][0].messages[0]).toEqual(expect.objectContaining({
    role: 'system', content: expect.stringContaining('Current date in America/Denver is'),
  }));
  expect(modelStep.mock.calls[1][0].messages).toContainEqual(expect.objectContaining({
    role: 'tool', content: expect.stringMatching(/Important deep work.*Easy errand/),
  }));
  expect(store.complete).toHaveBeenCalledWith(expect.objectContaining({
    participatingCapabilities: ['plan'], requestClass: 'capability_question',
  }));
});

test('answers an ordinary cross-domain question from multiple authoritative Kwilt reads', async () => {
  const order: string[] = [];
  const store = persistence(order);
  const rows: Record<string, unknown[]> = {
    kwilt_goals: [{ id: 'goal-1', updated_at: 'goal-v1', data: { title: 'Be present at dinner', status: 'in_progress' } }],
    kwilt_activities: [{ id: 'activity-1', updated_at: 'activity-v1', data: { title: 'Put phone away at 6', goalId: 'goal-1', status: 'planned' } }],
  };
  const dataClient = {
    from: jest.fn((table: string) => {
      const query: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'gte', 'order']) query[method] = jest.fn(() => query);
      query.limit = jest.fn(async () => ({ data: rows[table] ?? [], error: null }));
      return query;
    }),
  };
  const modelStep = jest.fn()
    .mockResolvedValueOnce({
      content: null,
      toolCalls: [
        { id: 'call-goals', toolId: 'goals.read', arguments: {} },
        { id: 'call-activities', toolId: 'activities.read', arguments: {} },
      ],
    })
    .mockResolvedValueOnce({
      content: 'Your active Goal is being present at dinner. The concrete next step already in Kwilt is to put your phone away at 6.',
      toolCalls: [],
    });

  await expect(executeCanonicalAgentRun({
    request: { ...request, prompt: 'How do my current goals and to-dos fit together?' },
    userId: 'user-1', persistence: store, dataClient, modelStep,
  })).resolves.toMatchObject({
    state: 'complete',
    answer: expect.stringMatching(/present at dinner.*phone away at 6/i),
  });
  expect(modelStep.mock.calls[1][0].messages.filter((message: { role: string }) => message.role === 'tool')).toHaveLength(2);
  expect(store.complete).toHaveBeenCalledWith(expect.objectContaining({
    participatingCapabilities: ['goals', 'todos'], requestClass: 'capability_question',
  }));
});

test('interprets a relationship message into the explicit receipt-safe memory tool', async () => {
  const order: string[] = [];
  const store = persistence(order);
  const rpc = jest.fn(async () => ({
    data: {
      status: 'applied', personId: 'person-lily', recordIds: ['memory-1', 'event-1'],
      receiptId: 'receipt-relationship', replayed: false,
    },
    error: null,
  }));
  const modelStep = jest.fn()
    .mockResolvedValueOnce({
      content: null,
      toolCalls: [{
        id: 'remember-lily', toolId: 'relationships.remember', arguments: {
          personName: 'Lily', aliases: [],
          memories: [{ kind: 'preference', text: 'likes dragons' }],
          events: [{ kind: 'birthday', title: "Lily's birthday", dateText: 'Oct 12' }],
          cadences: [],
        },
      }],
    })
    .mockResolvedValueOnce({ content: "I remembered Lily's birthday and that she likes dragons.", toolCalls: [] });

  await expect(executeCanonicalAgentRun({
    request: { ...request, prompt: "Lily's birthday is Oct 12. She likes dragons." },
    userId: 'user-1', persistence: store,
    dataClient: { from: jest.fn(), rpc }, modelStep,
  })).resolves.toMatchObject({
    state: 'complete', answer: "I remembered Lily's birthday and that she likes dragons.",
  });
  expect(rpc).toHaveBeenCalledWith('remember_kwilt_agent_relationship', expect.objectContaining({
    p_user_id: 'user-1', p_thread_id: 'thread-1', p_run_id: 'run-1',
    p_message_id: 'message-1', p_call_id: 'remember-lily',
  }));
  expect(store.complete).toHaveBeenCalledWith(expect.objectContaining({
    participatingCapabilities: ['relationships'], requestClass: 'capability_question',
  }));
});

test('reads before correcting the exact versioned relationship record', async () => {
  const order: string[] = [];
  const store = persistence(order);
  const rows: Record<string, unknown[]> = {
    kwilt_phone_agent_people: [{ id: 'person-lily', display_name: 'Lily', updated_at: 'person-v1' }],
    kwilt_phone_agent_memory_items: [],
    kwilt_phone_agent_events: [{
      id: 'event-1', person_id: 'person-lily', kind: 'birthday', title: "Lily's birthday",
      date_text: 'Oct 12', starts_at: null, timezone: null, updated_at: '2026-07-23T12:00:00.000Z',
    }],
    kwilt_phone_agent_cadences: [],
  };
  const rpc = jest.fn(async () => ({
    data: { status: 'applied', recordType: 'event', recordId: 'event-1', receiptId: 'receipt-2', replayed: false },
    error: null,
  }));
  const dataClient = {
    from: jest.fn((table: string) => {
      const query: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'order']) query[method] = jest.fn(() => query);
      query.limit = jest.fn(async () => ({ data: rows[table] ?? [], error: null }));
      return query;
    }),
    rpc,
  };
  const modelStep = jest.fn()
    .mockResolvedValueOnce({ content: null, toolCalls: [
      { id: 'read-lily', toolId: 'relationships.read', arguments: {} },
    ] })
    .mockResolvedValueOnce({ content: null, toolCalls: [{
      id: 'correct-lily', toolId: 'relationships.correct', arguments: {
        recordType: 'event', recordId: 'event-1', expectedUpdatedAt: '2026-07-23T12:00:00.000Z',
        fields: { dateText: 'Oct 14' },
      },
    }] })
    .mockResolvedValueOnce({ content: "I corrected Lily's birthday to October 14.", toolCalls: [] });

  await expect(executeCanonicalAgentRun({
    request: { ...request, prompt: "Actually, Lily's birthday is October 14." },
    userId: 'user-1', persistence: store, dataClient, modelStep,
  })).resolves.toMatchObject({ state: 'complete', answer: "I corrected Lily's birthday to October 14." });
  expect(rpc).toHaveBeenCalledWith('manage_kwilt_agent_relationship', expect.objectContaining({
    p_action: 'correct', p_record_type: 'event', p_record_id: 'event-1',
    p_expected_updated_at: '2026-07-23T12:00:00.000Z', p_fields: { dateText: 'Oct 14' },
  }));
});

test('turns a Phone Plan placement into the existing mobile-reviewed proposal rather than calendar success', async () => {
  const order: string[] = [];
  const store = persistence(order);
  const rows: Record<string, unknown> = {
    kwilt_activities: {
      id: 'activity-1', updated_at: 'activity-v1',
      data: { title: 'Important deep work', updatedAt: 'activity-v1', estimateMinutes: 120 },
    },
    kwilt_calendar_preferences: {
      write_calendar_ref: { provider: 'google', accountId: 'google-1', calendarId: 'primary' },
    },
    kwilt_calendar_accounts: { provider: 'google', provider_account_id: 'google-1', status: 'active' },
  };
  const dataClient = {
    from: jest.fn((table: string) => {
      const query: Record<string, unknown> = {};
      for (const method of ['select', 'eq']) query[method] = jest.fn(() => query);
      query.maybeSingle = jest.fn(async () => ({ data: rows[table] ?? null, error: null }));
      return query;
    }),
  };
  const modelStep = jest.fn()
    .mockResolvedValueOnce({
      content: null,
      toolCalls: [{
        id: 'call-plan-schedule', toolId: 'plan.schedule_activity',
        arguments: {
          activityId: 'activity-1', startDate: '2026-07-24T19:00:00.000Z',
          endDate: '2026-07-24T21:00:00.000Z', targetDateKey: '2026-07-24',
        },
      }],
    })
    .mockResolvedValueOnce({ content: 'Done — I added it to your calendar.', toolCalls: [] });

  await expect(executeCanonicalAgentRun({
    request: {
      ...request, prompt: 'Put important deep work on my Plan tomorrow from 1 to 3.',
      channelContext: { ...request.channelContext, timeZone: 'America/Denver' },
    },
    userId: 'user-1', persistence: store, dataClient, modelStep,
  })).resolves.toMatchObject({
    state: 'complete',
    answer: 'I prepared that change for review in Kwilt. It has not been applied yet.',
  });
  expect(store.stageProposal).toHaveBeenCalledWith(expect.objectContaining({
    run, callId: 'call-plan-schedule',
    proposal: expect.objectContaining({
      capabilityId: 'plan',
      operation: expect.objectContaining({ type: 'schedule_activity', targetId: 'activity-1' }),
    }),
  }));
  expect(order).toEqual(['enqueue', 'start', 'history', 'proposal', 'complete']);
});

test('stages a Phone Plan chunk group atomically and reports every review item as unapplied', async () => {
  const order: string[] = [];
  const store = persistence(order);
  const rows: Record<string, unknown> = {
    kwilt_activities: { id: 'activity-1', updated_at: 'activity-v1', data: { title: 'Deep work', updatedAt: 'activity-v1' } },
    kwilt_calendar_preferences: { write_calendar_ref: { provider: 'google', accountId: 'google-1', calendarId: 'primary' } },
    kwilt_calendar_accounts: { provider: 'google', provider_account_id: 'google-1', status: 'active' },
  };
  const dataClient = {
    from: jest.fn((table: string) => {
      const query: Record<string, unknown> = {};
      for (const method of ['select', 'eq']) query[method] = jest.fn(() => query);
      query.maybeSingle = jest.fn(async () => ({ data: rows[table] ?? null, error: null }));
      return query;
    }),
  };
  const modelStep = jest.fn()
    .mockResolvedValueOnce({
      content: null,
      toolCalls: [{
        id: 'call-chunks', toolId: 'plan.schedule_chunks', arguments: {
          activityId: 'activity-1', chunks: [
            { title: 'Deep work, part 1', startDate: '2026-07-24T17:00:00.000Z', endDate: '2026-07-24T18:00:00.000Z', targetDateKey: '2026-07-24' },
            { title: 'Deep work, part 2', startDate: '2026-07-24T19:00:00.000Z', endDate: '2026-07-24T20:00:00.000Z', targetDateKey: '2026-07-24' },
          ],
        },
      }],
    })
    .mockResolvedValueOnce({ content: 'Done — both blocks are on your calendar.', toolCalls: [] });

  await expect(executeCanonicalAgentRun({
    request: { ...request, prompt: 'Split deep work into two calendar blocks tomorrow.' },
    userId: 'user-1', persistence: store, dataClient, modelStep,
  })).resolves.toMatchObject({
    state: 'complete',
    answer: 'I prepared 2 changes for review in Kwilt. They have not been applied yet.',
  });
  expect(store.stageProposals).toHaveBeenCalledWith(expect.objectContaining({
    run, callId: 'call-chunks', proposals: expect.arrayContaining([
      expect.objectContaining({ operation: expect.objectContaining({ type: 'schedule_activity_chunk' }) }),
    ]),
  }));
  expect(order).toEqual(['enqueue', 'start', 'history', 'proposals', 'complete']);
});

test('turns a Phone reminder request into the existing Activity review without claiming a notification exists', async () => {
  const order: string[] = [];
  const store = persistence(order);
  const dataClient = {
    from: jest.fn(() => {
      const query: Record<string, unknown> = {};
      for (const method of ['select', 'eq']) query[method] = jest.fn(() => query);
      query.maybeSingle = jest.fn(async () => ({
        data: {
          id: 'activity-1', updated_at: 'activity-v1',
          data: { title: 'Pack lunch', updatedAt: 'activity-v1' },
        },
        error: null,
      }));
      return query;
    }),
  };
  const modelStep = jest.fn()
    .mockResolvedValueOnce({
      content: null,
      toolCalls: [{
        id: 'call-reminder', toolId: 'activities.reminder.update',
        arguments: { activityId: 'activity-1', reminderAt: '2026-07-24T15:00:00.000Z' },
      }],
    })
    .mockResolvedValueOnce({ content: 'Done — your notification is scheduled.', toolCalls: [] });

  await expect(executeCanonicalAgentRun({
    request: { ...request, prompt: 'Remind me tomorrow morning to pack lunch.' },
    userId: 'user-1', persistence: store, dataClient, modelStep,
  })).resolves.toMatchObject({
    state: 'complete',
    answer: 'I prepared that change for review in Kwilt. It has not been applied yet.',
  });
  expect(store.stageProposal).toHaveBeenCalledWith(expect.objectContaining({
    run, callId: 'call-reminder',
    proposal: expect.objectContaining({
      capabilityId: 'todos',
      operation: expect.objectContaining({
        type: 'update_activity', targetId: 'activity-1',
        payload: expect.objectContaining({ reminderAt: '2026-07-24T15:00:00.000Z' }),
      }),
    }),
  }));
  expect(order).toEqual(['enqueue', 'start', 'history', 'proposal', 'complete']);
});
