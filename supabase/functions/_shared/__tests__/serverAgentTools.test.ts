import { executeServerAgentTool } from '../serverAgentTools';
import { SERVER_AGENT_TOOL_CATALOG } from '../serverAgentCatalog';
function clientWith(result: { data: unknown; error: unknown }) {
  const calls: Array<[string, ...unknown[]]> = [];
  const query: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'gte', 'order']) {
    query[method] = (...args: unknown[]) => {
      calls.push([method, ...args]);
      return query;
    };
  }
  query.limit = async (...args: unknown[]) => {
    calls.push(['limit', ...args]);
    return result;
  };
  query.maybeSingle = async () => result;
  return { client: { from: jest.fn(() => query) }, calls };
}
const tool = (id: string) => SERVER_AGENT_TOOL_CATALOG.find((candidate) => candidate.id === id)!;
function planWriteClient({
  activity,
  preferences = { write_calendar_ref: { provider: 'google', accountId: 'google-1', calendarId: 'primary' } },
  account = { provider: 'google', provider_account_id: 'google-1', status: 'active' },
}: {
  activity: Record<string, unknown>;
  preferences?: Record<string, unknown> | null;
  account?: Record<string, unknown> | null;
}) {
  const calls: Array<[string, string, ...unknown[]]> = [];
  const resultByTable: Record<string, unknown> = {
    kwilt_activities: activity,
    kwilt_calendar_preferences: preferences,
    kwilt_calendar_accounts: account,
  };
  return {
    calls,
    client: {
      from: jest.fn((table: string) => {
        const query: Record<string, unknown> = {};
        for (const method of ['select', 'eq']) {
          query[method] = (...args: unknown[]) => {
            calls.push([table, method, ...args]);
            return query;
          };
        }
        query.maybeSingle = async () => ({ data: resultByTable[table] ?? null, error: null });
        return query;
      }),
    },
  };
}
test('reads bounded server-authoritative Goals under the exact user owner', async () => {
  const { client, calls } = clientWith({
    data: [{ id: 'goal-1', data: { title: 'Calmer mornings', status: 'in_progress' }, updated_at: 'now' }],
    error: null,
  });
  await expect(executeServerAgentTool({
    client, userId: 'user-1', call: { id: 'call-1', toolId: 'goals.read', arguments: {} },
    tool: tool('goals.read'), stageDeviceAction: jest.fn(),
  })).resolves.toMatchObject({
    status: 'completed', output: { goals: [expect.objectContaining({ id: 'goal-1', title: 'Calmer mornings' })] },
  });
  expect(calls).toContainEqual(['eq', 'user_id', 'user-1']);
  expect(calls).toContainEqual(['limit', 100]);
});
test('reads bounded server-authoritative show-up status', async () => {
  const { client, calls } = clientWith({
    data: { last_show_up_date: '2026-07-23', current_show_up_streak: 6, current_covered_show_up_streak: 7 },
    error: null,
  });
  await expect(executeServerAgentTool({
    client, userId: 'user-1', call: { id: 'call-show-up', toolId: 'account.show_up_status', arguments: {} },
    tool: tool('account.show_up_status'), stageDeviceAction: jest.fn(),
  })).resolves.toMatchObject({
    status: 'completed', output: { showUp: expect.objectContaining({ current_show_up_streak: 6 }) },
  });
  expect(calls).toContainEqual(['eq', 'user_id', 'user-1']);
});
test('applies shared consequence policy before a direct server relationship mutation', async () => {
  const rpc = jest.fn(async () => ({ data: null, error: null }));
  const relationshipTool = tool('relationships.remember');
  await expect(executeServerAgentTool({
    client: { from: jest.fn(), rpc }, userId: 'user-1',
    call: {
      id: 'remember', toolId: relationshipTool.id,
      arguments: { personName: 'Lily', aliases: [], memories: [{ kind: 'note', text: 'likes dragons' }], events: [], cadences: [] },
    },
    tool: { ...relationshipTool, reversible: false }, stageDeviceAction: jest.fn(),
    writeContext: { threadId: 'thread-1', runId: 'run-1', messageId: 'message-1' },
  })).resolves.toEqual({
    status: 'needs_input',
    prompt: 'This relationship change needs review before Kwilt can apply it.',
    fields: ['confirmation'],
  });
  expect(rpc).not.toHaveBeenCalled();
});

test('stages a device-only action and never reports the underlying effect as complete', async () => {
  const stageDeviceAction = jest.fn(async () => undefined);
  const { client } = clientWith({ data: [], error: null });
  await expect(executeServerAgentTool({
    client, userId: 'user-1', call: {
      id: 'call-1', toolId: 'screen_time.configure',
      arguments: { childName: 'Charlie', appName: 'Brawl Stars', desiredAccess: 'allow' },
    },
    tool: tool('screen_time.configure'), stageDeviceAction,
  })).resolves.toMatchObject({
    status: 'pending_client_action', provider: 'device',
    request: expect.objectContaining({
      actionType: 'configure_screen_time', title: 'Review Brawl Stars access for Charlie',
      payload: expect.objectContaining({ childName: 'Charlie', appName: 'Brawl Stars', desiredAccess: 'allow' }),
    }),
  });
  expect(stageDeviceAction).toHaveBeenCalledWith(expect.objectContaining({
    consequenceSummary: expect.stringContaining('Apple authorization'),
  }));
});

test('stages native Plan preferences without claiming availability or calendars changed', async () => {
  const stageDeviceAction = jest.fn(async () => undefined);
  const { client } = clientWith({ data: [], error: null });
  await expect(executeServerAgentTool({
    client, userId: 'user-1', call: { id: 'call-plan-settings', toolId: 'plan.preferences.open', arguments: {} },
    tool: tool('plan.preferences.open'), stageDeviceAction,
  })).resolves.toMatchObject({
    status: 'pending_client_action', provider: 'device',
    request: expect.objectContaining({ actionType: 'open_plan_preferences' }),
  });
  expect(stageDeviceAction).toHaveBeenCalledWith(expect.objectContaining({
    consequenceSummary: expect.stringContaining('native availability and calendar preference settings'),
  }));
});

test('stages an owned Goal check-in for later native audience review', async () => {
  const stageDeviceAction = jest.fn(async () => undefined);
  const { client, calls } = clientWith({
    data: { id: 'goal-1', data: { title: 'Calmer mornings' }, updated_at: 'now' }, error: null,
  });
  await expect(executeServerAgentTool({
    client, userId: 'user-1',
    call: { id: 'call-checkin', toolId: 'goals.check_in', arguments: { goalId: 'goal-1', text: 'We made progress.' } },
    tool: tool('goals.check_in'), stageDeviceAction,
  })).resolves.toMatchObject({
    status: 'pending_client_action', provider: 'device',
    request: expect.objectContaining({ actionType: 'open_goal_checkin', targetId: 'goal-1' }),
  });
  expect(calls).toContainEqual(['eq', 'user_id', 'user-1']);
  expect(calls).toContainEqual(['eq', 'id', 'goal-1']);
  expect(stageDeviceAction).toHaveBeenCalledWith(expect.objectContaining({ payload: { text: 'We made progress.' } }));
});

test('captures a low-risk Activity through one receipt-safe service RPC', async () => {
  const rpc = jest.fn(async () => ({
    data: { status: 'applied', activityId: 'activity-1', receiptId: 'receipt-1', replayed: false }, error: null,
  }));
  const { client } = clientWith({ data: [], error: null });
  await expect(executeServerAgentTool({
    client: { ...client, rpc }, userId: 'user-1',
    call: { id: 'call-1', toolId: 'activities.capture', arguments: { title: 'Pack lunch', scheduledDate: '2026-07-24' } },
    tool: tool('activities.capture'), stageDeviceAction: jest.fn(),
    writeContext: { threadId: 'thread-1', runId: 'run-1', messageId: 'message-1' },
  })).resolves.toEqual({
    status: 'completed',
    output: { activityId: 'activity-1', title: 'Pack lunch', replayed: false },
    receipt: { id: 'receipt-1', status: 'applied', resultingObjectType: 'activity', resultingObjectId: 'activity-1' },
  });
  expect(rpc).toHaveBeenCalledWith('capture_kwilt_agent_activity', {
    p_user_id: 'user-1', p_thread_id: 'thread-1', p_run_id: 'run-1', p_message_id: 'message-1',
    p_call_id: 'call-1', p_payload: { title: 'Pack lunch', scheduledDate: '2026-07-24' },
  });
});

test('converts phone reminder intent into durable weekly Activity fields before capture', async () => {
  const rpc = jest.fn(async () => ({
    data: { status: 'applied', activityId: 'activity-1', receiptId: 'receipt-1', replayed: false }, error: null,
  }));
  const { client } = clientWith({ data: [], error: null });
  await executeServerAgentTool({
    client: { ...client, rpc }, userId: 'user-1',
    call: {
      id: 'call-reminder', toolId: 'activities.capture',
      arguments: { title: 'Take out the trash', reminderLocalTime: '20:00', repeatWeekdays: [2] },
    },
    tool: tool('activities.capture'), stageDeviceAction: jest.fn(), timeZone: 'America/Denver',
    writeContext: { threadId: 'thread-1', runId: 'run-1', messageId: 'message-1' },
  });
  expect(rpc).toHaveBeenCalledWith('capture_kwilt_agent_activity', expect.objectContaining({
    p_payload: {
      title: 'Take out the trash', reminderAt: expect.any(String), repeatRule: 'custom',
      repeatCustom: { cadence: 'weeks', interval: 1, weekdays: [2] }, repeatBasis: 'scheduled',
    },
  }));
});

test('rejects malformed Activity capture arguments before the service write', async () => {
  const rpc = jest.fn();
  const { client } = clientWith({ data: [], error: null });
  await expect(executeServerAgentTool({
    client: { ...client, rpc }, userId: 'user-1',
    call: { id: 'call-1', toolId: 'activities.capture', arguments: { title: ' ', surprise: true } },
    tool: tool('activities.capture'), stageDeviceAction: jest.fn(),
    writeContext: { threadId: 'thread-1', runId: 'run-1', messageId: 'message-1' },
  })).resolves.toMatchObject({ status: 'failed', code: 'invalid_activity_patch' });
  expect(rpc).not.toHaveBeenCalled();
});

test('stages an owned version-grounded Goal update for mobile review without mutating the Goal', async () => {
  const stageProposal = jest.fn(async () => ({
    id: 'proposal-1', status: 'pending', version: 1, replayed: false,
  }));
  const { client, calls } = clientWith({
    data: {
      id: 'goal-1',
      data: { title: 'Calmer mornings', updatedAt: '2026-07-23T12:00:00.000Z' },
      updated_at: '2026-07-23T12:00:00.000Z',
    },
    error: null,
  });
  await expect(executeServerAgentTool({
    client, userId: 'user-1',
    call: {
      id: 'call-goal-update', toolId: 'goals.update',
      arguments: { goalId: 'goal-1', fields: { title: 'Calm school mornings', priority: 1 } },
    },
    tool: tool('goals.update'), stageDeviceAction: jest.fn(), stageProposal,
  })).resolves.toEqual({
    status: 'proposed',
    proposal: { id: 'proposal-1', status: 'pending', version: 1, replayed: false },
  });
  expect(calls).toContainEqual(['eq', 'user_id', 'user-1']);
  expect(calls).toContainEqual(['eq', 'id', 'goal-1']);
  expect(stageProposal).toHaveBeenCalledWith({
    capabilityId: 'goals',
    title: 'Update Calmer mornings',
    body: 'Reviews the requested Goal changes before applying them.',
    operation: {
      type: 'update_goal', targetType: 'goal', targetId: 'goal-1',
      summary: 'Update Goal Calmer mornings',
      payload: {
        title: 'Calm school mornings', priority: 1,
        expectedUpdatedAt: '2026-07-23T12:00:00.000Z',
      },
    },
  });
  expect(client.from).toHaveBeenCalledTimes(1);
});

test('rejects malformed Goal changes before staging a cross-channel proposal', async () => {
  const stageProposal = jest.fn();
  const { client } = clientWith({ data: null, error: null });
  await expect(executeServerAgentTool({
    client, userId: 'user-1',
    call: { id: 'call-goal-update', toolId: 'goals.update', arguments: { goalId: 'goal-1', fields: { surprise: true } } },
    tool: tool('goals.update'), stageDeviceAction: jest.fn(), stageProposal,
  })).resolves.toMatchObject({ status: 'failed', code: 'invalid_goal_patch' });
  expect(stageProposal).not.toHaveBeenCalled();
  expect(client.from).not.toHaveBeenCalled();
});

test('stages a reviewed Arc creation without adopting the identity directly', async () => {
  const stageProposal = jest.fn(async () => ({ id: 'proposal-arc-create', status: 'pending' as const, version: 1, replayed: false }));
  const { client } = clientWith({ data: null, error: null });
  await expect(executeServerAgentTool({
    client, userId: 'user-1',
    call: { id: 'call-arc-create', toolId: 'arcs.create', arguments: { name: 'Present parent', narrative: 'More calm evenings.' } },
    tool: tool('arcs.create'), stageDeviceAction: jest.fn(), stageProposal,
  })).resolves.toMatchObject({ status: 'proposed', proposal: { id: 'proposal-arc-create' } });
  expect(stageProposal).toHaveBeenCalledWith({
    capabilityId: 'arcs', title: 'Create Present parent',
    body: 'Creates this identity Arc after review. Kwilt will not adopt it until you approve.',
    operation: {
      type: 'create_arc', targetType: 'arc', targetId: null, summary: 'Create Present parent',
      payload: { name: 'Present parent', narrative: 'More calm evenings.', expectedUpdatedAt: null },
    },
  });
  expect(client.from).not.toHaveBeenCalled();
});

test.each([
  {
    toolId: 'arcs.update',
    arguments: { arcId: 'arc-1', fields: { status: 'paused', identityStatement: 'I choose calm.' } },
    operation: {
      type: 'update_arc', targetType: 'arc', targetId: 'arc-1', summary: 'Update Arc Present parent',
      payload: { status: 'paused', identityStatement: 'I choose calm.', expectedUpdatedAt: 'arc-v1' },
    },
    title: 'Update Present parent', body: 'Reviews the requested identity change before applying it.',
  },
  {
    toolId: 'arcs.delete', arguments: { arcId: 'arc-1' },
    operation: {
      type: 'delete_arc', targetType: 'arc', targetId: 'arc-1', summary: 'Delete Arc Present parent',
      payload: { expectedUpdatedAt: 'arc-v1' },
    },
    title: 'Delete Present parent', body: 'Deletes this Arc and its linked Goals and Activities after review. Undo restores them.',
  },
])('stages owned version-grounded $toolId through mobile Arc review', async ({ toolId, arguments: callArguments, operation, title, body }) => {
  const stageProposal = jest.fn(async () => ({ id: `proposal-${toolId}`, status: 'pending' as const, version: 1, replayed: false }));
  const { client, calls } = clientWith({
    data: { id: 'arc-1', data: { name: 'Present parent', updatedAt: 'arc-v1' }, updated_at: 'arc-v1' }, error: null,
  });
  await expect(executeServerAgentTool({
    client, userId: 'user-1', call: { id: `call-${toolId}`, toolId, arguments: callArguments },
    tool: tool(toolId), stageDeviceAction: jest.fn(), stageProposal,
  })).resolves.toMatchObject({ status: 'proposed' });
  expect(calls).toContainEqual(['eq', 'user_id', 'user-1']);
  expect(calls).toContainEqual(['eq', 'id', 'arc-1']);
  expect(stageProposal).toHaveBeenCalledWith({ capabilityId: 'arcs', title, body, operation });
});

test('stages a Goal creation for mobile review without writing a Goal', async () => {
  const stageProposal = jest.fn(async () => ({ id: 'proposal-goal-create', status: 'pending' as const, version: 1, replayed: false }));
  const { client } = clientWith({ data: null, error: null });
  await expect(executeServerAgentTool({
    client, userId: 'user-1',
    call: {
      id: 'call-goal-create', toolId: 'goals.create',
      arguments: {
        title: 'Calm school mornings', priority: 1,
        followUpActivity: { title: 'Prepare backpacks', repeatRule: 'daily' },
      },
    },
    tool: tool('goals.create'), stageDeviceAction: jest.fn(), stageProposal,
  })).resolves.toMatchObject({ status: 'proposed', proposal: { id: 'proposal-goal-create' } });
  expect(stageProposal).toHaveBeenCalledWith({
    capabilityId: 'goals', title: 'Create Calm school mornings',
    body: 'Creates this unassigned Goal draft after review.',
    operation: {
      type: 'create_goal', targetType: 'goal', targetId: null, summary: 'Create Goal Calm school mornings',
      payload: {
        title: 'Calm school mornings', priority: 1,
        followUpActivity: { title: 'Prepare backpacks', repeatRule: 'daily' },
        expectedUpdatedAt: null,
      },
    },
  });
  expect(client.from).not.toHaveBeenCalled();
});

test('stages an owned Goal deletion for mobile consequence review', async () => {
  const stageProposal = jest.fn(async () => ({ id: 'proposal-goal-delete', status: 'pending' as const, version: 1, replayed: false }));
  const { client } = clientWith({
    data: { id: 'goal-1', data: { title: 'Calmer mornings', updatedAt: 'goal-v1' }, updated_at: 'goal-v1' }, error: null,
  });
  await executeServerAgentTool({
    client, userId: 'user-1',
    call: { id: 'call-goal-delete', toolId: 'goals.delete', arguments: { goalId: 'goal-1' } },
    tool: tool('goals.delete'), stageDeviceAction: jest.fn(), stageProposal,
  });
  expect(stageProposal).toHaveBeenCalledWith({
    capabilityId: 'goals', title: 'Delete Calmer mornings',
    body: 'Deletes this Goal and its linked Activities after review. Undo restores them.',
    operation: {
      type: 'delete_goal', targetType: 'goal', targetId: 'goal-1', summary: 'Delete Goal Calmer mornings',
      payload: { expectedUpdatedAt: 'goal-v1' },
    },
  });
});

test('stages an owned Chapter note through the existing private-note review path', async () => {
  const stageProposal = jest.fn(async () => ({ id: 'proposal-chapter-note', status: 'pending' as const, version: 1, replayed: false }));
  const { client } = clientWith({
    data: {
      id: 'chapter-1', period_key: '2026-W30', user_note: null,
      user_note_updated_at: null, updated_at: 'chapter-v1',
    }, error: null,
  });
  await executeServerAgentTool({
    client, userId: 'user-1',
    call: { id: 'call-chapter-note', toolId: 'chapters.note.update', arguments: { chapterId: 'chapter-1', note: 'Protect the quieter mornings.' } },
    tool: tool('chapters.note.update'), stageDeviceAction: jest.fn(), stageProposal,
  });
  expect(stageProposal).toHaveBeenCalledWith({
    capabilityId: 'chapters', title: 'Add a line to your Chapter',
    body: 'Reviews this personal Chapter note before saving it.',
    operation: {
      type: 'update_chapter_note', targetType: 'chapter', targetId: 'chapter-1',
      summary: 'Update Chapter 2026-W30 note',
      payload: { note: 'Protect the quieter mornings.', expectedUpdatedAt: 'chapter-v1' },
    },
  });
});

test.each([
  ['arcs.create', { name: ' ' }, 'invalid_arc'],
  ['arcs.update', { arcId: 'arc-1', fields: { surprise: true } }, 'invalid_arc_patch'],
  ['goals.create', { title: ' ', surprise: true }, 'invalid_goal'],
  ['chapters.note.update', { chapterId: 'chapter-1', note: 'x'.repeat(501) }, 'invalid_chapter_note'],
])('rejects malformed %s input before reading or staging', async (toolId, callArguments, code) => {
  const stageProposal = jest.fn();
  const { client } = clientWith({ data: null, error: null });
  await expect(executeServerAgentTool({
    client, userId: 'user-1', call: { id: `call-${toolId}`, toolId, arguments: callArguments },
    tool: tool(toolId), stageDeviceAction: jest.fn(), stageProposal,
  })).resolves.toMatchObject({ status: 'failed', code });
  expect(stageProposal).not.toHaveBeenCalled();
  expect(client.from).not.toHaveBeenCalled();
});

test('refuses to move an Activity under a Goal the current user does not own', async () => {
  const activityResult = {
    data: { id: 'activity-1', data: { title: 'Pack lunch', updatedAt: 'activity-v1' }, updated_at: 'activity-v1' },
    error: null,
  };
  const goalResult = { data: null, error: null };
  const queryFor = (result: { data: unknown; error: unknown }) => {
    const query: Record<string, unknown> = {};
    query.select = jest.fn(() => query);
    query.eq = jest.fn(() => query);
    query.maybeSingle = jest.fn(async () => result);
    return query;
  };
  const activityQuery = queryFor(activityResult);
  const goalQuery = queryFor(goalResult);
  const client = {
    from: jest.fn((table: string) => table === 'kwilt_activities' ? activityQuery : goalQuery),
  };
  const stageProposal = jest.fn();
  await expect(executeServerAgentTool({
    client, userId: 'user-1',
    call: {
      id: 'call-activity-goal', toolId: 'activities.update',
      arguments: { activityId: 'activity-1', fields: { goalId: 'someone-elses-goal' } },
    },
    tool: tool('activities.update'), stageDeviceAction: jest.fn(), stageProposal,
  })).resolves.toMatchObject({ status: 'failed', code: 'goal_not_found' });
  expect(client.from).toHaveBeenNthCalledWith(1, 'kwilt_activities');
  expect(client.from).toHaveBeenNthCalledWith(2, 'kwilt_goals');
  expect(stageProposal).not.toHaveBeenCalled();
});

test('refuses a stable-step operation when the addressed step no longer exists', async () => {
  const stageProposal = jest.fn();
  const { client } = clientWith({
    data: {
      id: 'activity-1', data: { title: 'Pack lunch', updatedAt: 'activity-v1', steps: [] },
      updated_at: 'activity-v1',
    },
    error: null,
  });
  await expect(executeServerAgentTool({
    client, userId: 'user-1',
    call: {
      id: 'call-missing-step', toolId: 'activities.steps.complete',
      arguments: { activityId: 'activity-1', stepId: 'missing-step', completed: true },
    },
    tool: tool('activities.steps.complete'), stageDeviceAction: jest.fn(), stageProposal,
  })).resolves.toMatchObject({ status: 'failed', code: 'step_not_found' });
  expect(stageProposal).not.toHaveBeenCalled();
});

test.each(['plan.read_day_context', 'plan.recommend_day'])(
  '%s returns the capability-owned priority order without inventing calendar fit',
  async (toolId) => {
    const activityRows = [
      {
        id: 'easy', updated_at: 'easy-v1',
        data: {
          id: 'easy', title: 'Easy errand', status: 'planned', type: 'task', tags: [],
          goalId: null, priority: 2, estimateMinutes: 10,
          createdAt: '2026-07-01T12:00:00.000Z', updatedAt: 'easy-v1',
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
      {
        id: 'done', updated_at: 'done-v1',
        data: {
          id: 'done', title: 'Already done', status: 'done', type: 'task', tags: [], priority: 1,
          createdAt: '2026-07-01T12:00:00.000Z', updatedAt: 'done-v1',
        },
      },
    ];
    const goalRows = [{
      id: 'goal-1', updated_at: 'goal-v1',
      data: { id: 'goal-1', title: 'Finish the build', status: 'in_progress', priority: 1, updatedAt: 'goal-v1' },
    }];
    const calls: Array<[string, string, ...unknown[]]> = [];
    const queryFor = (table: string, data: unknown) => {
      const query: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'order']) {
        query[method] = (...args: unknown[]) => {
          calls.push([table, method, ...args]);
          return query;
        };
      }
      query.limit = async (...args: unknown[]) => {
        calls.push([table, 'limit', ...args]);
        return { data, error: null };
      };
      return query;
    };
    const client = {
      from: jest.fn((table: string) => queryFor(table, table === 'kwilt_activities' ? activityRows : goalRows)),
    };

    await expect(executeServerAgentTool({
      client, userId: 'user-1',
      call: { id: `call-${toolId}`, toolId, arguments: { targetDate: '2026-07-24' } },
      tool: tool(toolId), stageDeviceAction: jest.fn(),
    })).resolves.toEqual({
      status: 'completed',
      receipt: null,
      output: {
        targetDate: '2026-07-24T12:00:00.000Z', limitation: 'calendar_unavailable',
        recommendations: [
          {
            activityId: 'urgent', expectedUpdatedAt: 'urgent-v1', title: 'Important deep work',
            goalTitle: 'Finish the build', priorityPosition: 0,
            placement: { status: 'unplaced', reason: 'no_write_calendar' },
          },
          {
            activityId: 'easy', expectedUpdatedAt: 'easy-v1', title: 'Easy errand',
            goalTitle: null, priorityPosition: 1,
            placement: { status: 'unplaced', reason: 'no_write_calendar' },
          },
        ],
      },
    });
    expect(calls).toContainEqual(['kwilt_activities', 'eq', 'user_id', 'user-1']);
    expect(calls).toContainEqual(['kwilt_goals', 'eq', 'user_id', 'user-1']);
  },
);

test('rejects an invalid server Plan date before reading account data', async () => {
  const { client } = clientWith({ data: [], error: null });
  await expect(executeServerAgentTool({
    client, userId: 'user-1',
    call: { id: 'call-plan', toolId: 'plan.recommend_day', arguments: { targetDate: 'tomorrow-ish' } },
    tool: tool('plan.recommend_day'), stageDeviceAction: jest.fn(),
  })).resolves.toMatchObject({ status: 'failed', code: 'invalid_plan_date' });
  expect(client.from).not.toHaveBeenCalled();
});

test('stages a Phone-authored Plan placement with the owned Activity version and configured write calendar', async () => {
  const stageProposal = jest.fn(async () => ({ id: 'proposal-plan', status: 'pending' as const, version: 1, replayed: false }));
  const { client, calls } = planWriteClient({
    activity: {
      id: 'activity-1', updated_at: 'activity-v1',
      data: { title: 'Important deep work', updatedAt: 'activity-v1', estimateMinutes: 120 },
    },
  });
  await expect(executeServerAgentTool({
    client, userId: 'user-1',
    call: {
      id: 'call-schedule', toolId: 'plan.schedule_activity',
      arguments: {
        activityId: 'activity-1', startDate: '2026-07-24T19:00:00.000Z',
        endDate: '2026-07-24T21:00:00.000Z', targetDateKey: '2026-07-24',
      },
    },
    tool: tool('plan.schedule_activity'), stageDeviceAction: jest.fn(), stageProposal,
    timeZone: 'America/Denver',
  })).resolves.toMatchObject({ status: 'proposed', proposal: { id: 'proposal-plan' } });
  expect(calls).toContainEqual(['kwilt_activities', 'eq', 'user_id', 'user-1']);
  expect(calls).toContainEqual(['kwilt_calendar_accounts', 'eq', 'provider_account_id', 'google-1']);
  expect(stageProposal).toHaveBeenCalledWith({
    capabilityId: 'plan', title: 'Schedule Important deep work',
    body: 'Reviews the proposed calendar placement before creating it.',
    operation: {
      type: 'schedule_activity', targetType: 'activity', targetId: 'activity-1',
      summary: 'Schedule Important deep work',
      payload: {
        activityId: 'activity-1', expectedUpdatedAt: 'activity-v1',
        startDate: '2026-07-24T19:00:00.000Z', endDate: '2026-07-24T21:00:00.000Z',
        targetDateKey: '2026-07-24',
        writeCalendarRef: { provider: 'google', accountId: 'google-1', calendarId: 'primary' },
      },
    },
  });
});

test.each([
  {
    toolId: 'plan.reschedule_activity',
    arguments: {
      activityId: 'activity-1', startDate: '2026-07-25T18:00:00.000Z',
      endDate: '2026-07-25T19:00:00.000Z', targetDateKey: '2026-07-25',
    },
    title: 'Move Dentist appointment', body: 'Reviews the new calendar placement before moving it.',
    operation: {
      type: 'reschedule_activity', targetType: 'activity', targetId: 'activity-1', summary: 'Move Dentist appointment',
      payload: {
        activityId: 'activity-1', expectedUpdatedAt: 'activity-v1',
        startDate: '2026-07-25T18:00:00.000Z', endDate: '2026-07-25T19:00:00.000Z',
        targetDateKey: '2026-07-25', previousStartDate: '2026-07-24T17:00:00.000Z',
        previousEndDate: '2026-07-24T18:00:00.000Z', previousTargetDateKey: '2026-07-24',
      },
    },
  },
  {
    toolId: 'plan.remove_activity', arguments: { activityId: 'activity-1' },
    title: 'Remove Dentist appointment from Plan',
    body: 'Deletes the managed calendar block after review. Undo recreates it if calendar access remains available.',
    operation: {
      type: 'remove_activity_from_plan', targetType: 'activity', targetId: 'activity-1',
      summary: 'Remove Dentist appointment from Plan',
      payload: {
        activityId: 'activity-1', expectedUpdatedAt: 'activity-v1',
        previousStartDate: '2026-07-24T17:00:00.000Z', previousEndDate: '2026-07-24T18:00:00.000Z',
        previousTargetDateKey: '2026-07-24',
        previousBinding: {
          kind: 'provider', provider: 'google', accountId: 'google-1', calendarId: 'primary',
          eventId: 'event-1', createdBy: 'plan',
        },
      },
    },
  },
])('stages $toolId through the existing mobile Plan review and receipt path', async ({ toolId, arguments: args, title, body, operation }) => {
  const stageProposal = jest.fn(async () => ({ id: `proposal-${toolId}`, status: 'pending' as const, version: 1, replayed: false }));
  const { client } = planWriteClient({
    activity: {
      id: 'activity-1', updated_at: 'activity-v1',
      data: {
        title: 'Dentist appointment', updatedAt: 'activity-v1', estimateMinutes: 60,
        scheduledAt: '2026-07-24T17:00:00.000Z',
        calendarBinding: {
          kind: 'provider', provider: 'google', accountId: 'google-1', calendarId: 'primary',
          eventId: 'event-1', createdBy: 'plan',
        },
      },
    },
  });
  await expect(executeServerAgentTool({
    client, userId: 'user-1', call: { id: `call-${toolId}`, toolId, arguments: args },
    tool: tool(toolId), stageDeviceAction: jest.fn(), stageProposal, timeZone: 'America/Denver',
  })).resolves.toMatchObject({ status: 'proposed' });
  expect(stageProposal).toHaveBeenCalledWith({ capabilityId: 'plan', title, body, operation });
});

test('refuses to stage a Plan placement when the configured calendar account is not active and owned', async () => {
  const stageProposal = jest.fn();
  const { client } = planWriteClient({
    activity: { id: 'activity-1', updated_at: 'v1', data: { title: 'Deep work', updatedAt: 'v1' } },
    account: null,
  });
  await expect(executeServerAgentTool({
    client, userId: 'user-1',
    call: {
      id: 'call-plan', toolId: 'plan.schedule_activity',
      arguments: {
        activityId: 'activity-1', startDate: '2026-07-24T19:00:00.000Z',
        endDate: '2026-07-24T20:00:00.000Z', targetDateKey: '2026-07-24',
      },
    },
    tool: tool('plan.schedule_activity'), stageDeviceAction: jest.fn(), stageProposal,
  })).resolves.toMatchObject({ status: 'unavailable', reason: 'plan_write_calendar_unavailable' });
  expect(stageProposal).not.toHaveBeenCalled();
});

test.each([
  {
    toolId: 'activities.reminder.update',
    arguments: { activityId: 'activity-1', reminderAt: '2026-07-30T15:00:00.000Z' },
    title: 'Update reminder for Pack lunch',
    body: 'Reviews the reminder change before saving it. Device notification settings still apply.',
    payload: { reminderAt: '2026-07-30T15:00:00.000Z', expectedUpdatedAt: 'activity-v1' },
  },
  {
    toolId: 'activities.focus_today',
    arguments: { activityId: 'activity-1' },
    title: 'Focus on Pack lunch today',
    body: "Schedules this To-do for today's focus after review. It remains a soft Plan signal and can be undone.",
    payload: { scheduledDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), expectedUpdatedAt: 'activity-v1' },
  },
])('stages $toolId as the existing reversible Activity proposal', async ({ toolId, arguments: args, title, body, payload }) => {
  const stageProposal = jest.fn(async () => ({ id: `proposal-${toolId}`, status: 'pending' as const, version: 1, replayed: false }));
  const { client, calls } = clientWith({
    data: { id: 'activity-1', updated_at: 'activity-v1', data: { title: 'Pack lunch', updatedAt: 'activity-v1' } },
    error: null,
  });
  await expect(executeServerAgentTool({
    client, userId: 'user-1', call: { id: `call-${toolId}`, toolId, arguments: args },
    tool: tool(toolId), stageDeviceAction: jest.fn(), stageProposal, timeZone: 'America/Denver',
  })).resolves.toMatchObject({ status: 'proposed' });
  expect(calls).toContainEqual(['eq', 'user_id', 'user-1']);
  expect(stageProposal).toHaveBeenCalledWith({
    capabilityId: 'todos', title, body,
    operation: {
      type: 'update_activity', targetType: 'activity', targetId: 'activity-1',
      summary: title, payload,
    },
  });
});

test('stages an owned Focus sheet handoff without claiming a timer started', async () => {
  const stageDeviceAction = jest.fn(async () => undefined);
  const { client, calls } = clientWith({
    data: { id: 'activity-1', updated_at: 'v1', data: { title: 'Pack lunch', updatedAt: 'v1' } },
    error: null,
  });
  await expect(executeServerAgentTool({
    client, userId: 'user-1',
    call: { id: 'call-focus', toolId: 'activities.open_focus', arguments: { activityId: 'activity-1' } },
    tool: tool('activities.open_focus'), stageDeviceAction,
  })).resolves.toMatchObject({
    status: 'pending_client_action', provider: 'device',
    request: expect.objectContaining({ actionType: 'open_activity_focus', targetId: 'activity-1' }),
  });
  expect(calls).toContainEqual(['eq', 'user_id', 'user-1']);
  expect(stageDeviceAction).toHaveBeenCalledWith(expect.objectContaining({
    consequenceSummary: expect.stringContaining('choose whether and how long to start the timer'),
  }));
});

test.each([
  {
    toolId: 'activities.update',
    arguments: { activityId: 'activity-1', fields: { title: 'Pack lunches', status: 'in_progress' } },
    title: 'Update Pack lunch', body: 'Reviews the requested To-do changes before applying them.',
    operation: {
      type: 'update_activity', targetType: 'activity', targetId: 'activity-1', summary: 'Update To-do Pack lunch',
      payload: { title: 'Pack lunches', status: 'in_progress', expectedUpdatedAt: 'activity-v1' },
    },
  },
  {
    toolId: 'activities.delete', arguments: { activityId: 'activity-1' },
    title: 'Delete Pack lunch',
    body: 'Deletes this To-do after review. The receipt can restore it unless another item takes its id.',
    operation: {
      type: 'delete_activity', targetType: 'activity', targetId: 'activity-1', summary: 'Delete To-do Pack lunch',
      payload: { expectedUpdatedAt: 'activity-v1' },
    },
  },
  {
    toolId: 'activities.repeat.update',
    arguments: { activityId: 'activity-1', repeatRule: 'weekly', repeatBasis: 'scheduled' },
    title: 'Update repeat for Pack lunch', body: 'Reviews the repeat change before saving it.',
    operation: {
      type: 'update_activity', targetType: 'activity', targetId: 'activity-1', summary: 'Update repeat for Pack lunch',
      payload: {
        repeatRule: 'weekly', repeatCustom: null, repeatBasis: 'scheduled', expectedUpdatedAt: 'activity-v1',
      },
    },
  },
])('stages owned version-grounded $toolId through the native To-do review path', async ({
  toolId, arguments: callArguments, title, body, operation,
}) => {
  const stageProposal = jest.fn(async () => ({
    id: `proposal-${toolId}`, status: 'pending' as const, version: 1, replayed: false,
  }));
  const { client, calls } = clientWith({
    data: {
      id: 'activity-1',
      data: { title: 'Pack lunch', updatedAt: 'activity-v1', steps: [] },
      updated_at: 'activity-v1',
    },
    error: null,
  });
  await expect(executeServerAgentTool({
    client, userId: 'user-1', call: { id: `call-${toolId}`, toolId, arguments: callArguments },
    tool: tool(toolId), stageDeviceAction: jest.fn(), stageProposal,
  })).resolves.toMatchObject({ status: 'proposed' });
  expect(calls).toContainEqual(['eq', 'user_id', 'user-1']);
  expect(calls).toContainEqual(['eq', 'id', 'activity-1']);
  expect(stageProposal).toHaveBeenCalledWith({ capabilityId: 'todos', title, body, operation });
});

test.each([
  {
    toolId: 'activities.steps.create', arguments: { activityId: 'activity-1', title: 'Add fruit', optional: true },
    title: 'Add step Add fruit', summary: 'Add step Add fruit',
    type: 'create_activity_step', payload: { title: 'Add fruit', isOptional: true, expectedUpdatedAt: 'activity-v1' },
  },
  {
    toolId: 'activities.steps.update', arguments: { activityId: 'activity-1', stepId: 'step-1', title: 'Choose sandwich' },
    title: 'Update step Make sandwich', summary: 'Update step Make sandwich',
    type: 'update_activity_step',
    payload: { stepId: 'step-1', title: 'Choose sandwich', expectedUpdatedAt: 'activity-v1' },
  },
  {
    toolId: 'activities.steps.complete', arguments: { activityId: 'activity-1', stepId: 'step-1', completed: true },
    title: 'Complete step Make sandwich', summary: 'Complete step Make sandwich',
    type: 'complete_activity_step',
    payload: { stepId: 'step-1', completed: true, expectedUpdatedAt: 'activity-v1' },
  },
  {
    toolId: 'activities.steps.delete', arguments: { activityId: 'activity-1', stepId: 'step-1' },
    title: 'Delete step Make sandwich', summary: 'Delete step Make sandwich',
    type: 'delete_activity_step', payload: { stepId: 'step-1', expectedUpdatedAt: 'activity-v1' },
  },
  {
    toolId: 'activities.steps.reorder', arguments: { activityId: 'activity-1', stepIds: ['step-2', 'step-1'] },
    title: 'Reorder steps in Pack lunch', summary: 'Reorder steps in Pack lunch',
    type: 'reorder_activity_steps',
    payload: { stepIds: ['step-2', 'step-1'], expectedUpdatedAt: 'activity-v1' },
  },
])('stages stable $toolId operations without replacing the whole step array', async ({
  toolId, arguments: callArguments, title, summary, type, payload,
}) => {
  const stageProposal = jest.fn(async () => ({
    id: `proposal-${toolId}`, status: 'pending' as const, version: 1, replayed: false,
  }));
  const { client } = clientWith({
    data: {
      id: 'activity-1', updated_at: 'activity-v1',
      data: {
        title: 'Pack lunch', updatedAt: 'activity-v1',
        steps: [
          { id: 'step-1', title: 'Make sandwich', isOptional: false, completedAt: null, orderIndex: 0 },
          { id: 'step-2', title: 'Fill bottle', isOptional: false, completedAt: null, orderIndex: 1 },
        ],
      },
    },
    error: null,
  });
  await expect(executeServerAgentTool({
    client, userId: 'user-1', call: { id: `call-${toolId}`, toolId, arguments: callArguments },
    tool: tool(toolId), stageDeviceAction: jest.fn(), stageProposal,
  })).resolves.toMatchObject({ status: 'proposed' });
  expect(stageProposal).toHaveBeenCalledWith({
    capabilityId: 'todos', title, body: 'Reviews this step change before applying it.',
    operation: { type, targetType: 'activity', targetId: 'activity-1', summary, payload },
  });
});

test.each([
  ['activities.update', { activityId: 'activity-1', fields: { surprise: true } }, 'invalid_activity_patch'],
  ['activities.repeat.update', { activityId: 'activity-1', repeatRule: 'custom' }, 'invalid_activity_schedule'],
  ['activities.steps.create', { activityId: 'activity-1', title: ' ' }, 'invalid_step'],
])('rejects malformed %s reviewed writes before reading or staging', async (toolId, callArguments, code) => {
  const stageProposal = jest.fn();
  const { client } = clientWith({ data: null, error: null });
  await expect(executeServerAgentTool({
    client, userId: 'user-1', call: { id: `call-${toolId}`, toolId, arguments: callArguments },
    tool: tool(toolId), stageDeviceAction: jest.fn(), stageProposal,
  })).resolves.toMatchObject({ status: 'failed', code });
  expect(stageProposal).not.toHaveBeenCalled();
  expect(client.from).not.toHaveBeenCalled();
});
