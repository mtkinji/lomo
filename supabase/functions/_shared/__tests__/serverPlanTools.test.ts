import { executeServerPlanTool } from '../serverPlanTools';

function planClient() {
  const rows: Record<string, unknown> = {
    kwilt_activities: { id: 'activity-1', updated_at: 'activity-v1', data: { title: 'Deep work', updatedAt: 'activity-v1' } },
    kwilt_calendar_preferences: { write_calendar_ref: { provider: 'google', accountId: 'google-1', calendarId: 'primary' } },
    kwilt_calendar_accounts: { provider: 'google', provider_account_id: 'google-1', status: 'active' },
  };
  return {
    from: jest.fn((table: string) => {
      const query: Record<string, unknown> = {};
      for (const method of ['select', 'eq']) query[method] = jest.fn(() => query);
      query.maybeSingle = jest.fn(async () => ({ data: rows[table] ?? null, error: null }));
      return query;
    }),
  };
}

test('stages Phone-authored Plan chunks as one atomic group for the native batch review path', async () => {
  const stageProposals = jest.fn(async () => [
    { id: 'proposal-1', status: 'pending' as const, version: 1, replayed: false },
    { id: 'proposal-2', status: 'pending' as const, version: 1, replayed: false },
  ]);
  await expect(executeServerPlanTool({
    client: planClient(), userId: 'user-1',
    call: {
      id: 'call-chunks', toolId: 'plan.schedule_chunks', arguments: {
        activityId: 'activity-1', chunks: [
          { title: 'Deep work, part 1', startDate: '2026-07-24T17:00:00.000Z', endDate: '2026-07-24T18:00:00.000Z', targetDateKey: '2026-07-24' },
          { title: 'Deep work, part 2', startDate: '2026-07-24T19:00:00.000Z', endDate: '2026-07-24T20:00:00.000Z', targetDateKey: '2026-07-24' },
        ],
      },
    },
    stageProposals,
  })).resolves.toMatchObject({ status: 'proposed', proposal: { groupId: 'plan-chunks:call-chunks', count: 2 } });
  expect(stageProposals).toHaveBeenCalledWith([
    expect.objectContaining({
      title: 'Deep work, part 1',
      operation: expect.objectContaining({ type: 'schedule_activity_chunk', payload: expect.objectContaining({ groupId: 'plan-chunks:call-chunks', chunkId: 'chunk-1' }) }),
    }),
    expect.objectContaining({
      title: 'Deep work, part 2',
      operation: expect.objectContaining({ type: 'schedule_activity_chunk', payload: expect.objectContaining({ groupId: 'plan-chunks:call-chunks', chunkId: 'chunk-2' }) }),
    }),
  ]);
});

test('rejects overlapping chunks before atomic persistence', async () => {
  const stageProposals = jest.fn();
  await expect(executeServerPlanTool({
    client: planClient(), userId: 'user-1',
    call: {
      id: 'bad-chunks', toolId: 'plan.schedule_chunks', arguments: {
        activityId: 'activity-1', chunks: [
          { title: 'One', startDate: '2026-07-24T17:00:00.000Z', endDate: '2026-07-24T19:00:00.000Z', targetDateKey: '2026-07-24' },
          { title: 'Two', startDate: '2026-07-24T18:00:00.000Z', endDate: '2026-07-24T20:00:00.000Z', targetDateKey: '2026-07-24' },
        ],
      },
    },
    stageProposals,
  })).resolves.toMatchObject({ status: 'failed', code: 'invalid_plan_chunks' });
  expect(stageProposals).not.toHaveBeenCalled();
});
