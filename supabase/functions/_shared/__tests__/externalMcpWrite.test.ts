import {
  createActivityForUser,
  createGoalForUser,
  softDeleteObjectForUser,
  updateActivityForUser,
} from '../externalMcpWrite';

function createMockAdmin() {
  const calls: Array<{ table: string; operation: string; payload?: any }> = [];
  const rows = new Map<string, any>();

  const from = (table: string) => ({
    upsert: (payload: any) => {
      calls.push({ table, operation: 'upsert', payload });
      rows.set(`${table}:${payload.user_id}:${payload.id}`, {
        id: payload.id,
        data: payload.data,
        is_deleted: payload.is_deleted,
        updated_at: payload.updated_at,
      });
      return { error: null };
    },
    select: () => ({
      eq: (_field: string, _value: string) => ({
        eq: (_field2: string, _value2: string) => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  });

  return { admin: { from }, calls, rows };
}

describe('externalMcpWrite helpers', () => {
  beforeEach(() => {
    jest.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('createGoalForUser writes a UI-compatible goal row without external-origin fields', async () => {
    const { admin, calls } = createMockAdmin();

    const result = await createGoalForUser(admin, 'user-1', {
      title: 'Finish the launch checklist',
      description: 'Make the last pieces visible.',
      status: 'in_progress',
      priority: 1,
    });

    expect(result.object_type).toBe('goal');
    const upsert = calls.find((call) => call.table === 'kwilt_goals');
    expect(upsert?.payload).toMatchObject({
      user_id: 'user-1',
      id: 'goal_00000000-0000-4000-8000-000000000001',
      is_deleted: false,
      deleted_at: null,
    });
    expect(upsert?.payload.data).toMatchObject({
      id: 'goal_00000000-0000-4000-8000-000000000001',
      arcId: null,
      title: 'Finish the launch checklist',
      description: 'Make the last pieces visible.',
      status: 'in_progress',
      priority: 1,
      metrics: [],
    });
    expect(upsert?.payload.data.creationSource).toBeUndefined();
    expect(upsert?.payload.data.externalClientId).toBeUndefined();
  });

  test('createActivityForUser records a normal activity row and best-effort show-up event', async () => {
    const { admin, calls } = createMockAdmin();

    await createActivityForUser(admin, 'user-1', {
      title: 'Book the appointment',
      tags: ['home', 'home'],
    });

    const activity = calls.find((call) => call.table === 'kwilt_activities');
    expect(activity?.payload.data).toMatchObject({
      title: 'Book the appointment',
      goalId: null,
      type: 'task',
      tags: ['home'],
      forceActual: {
        'force-activity': 0,
        'force-connection': 0,
        'force-mastery': 0,
        'force-spirituality': 0,
      },
    });
    expect(calls.some((call) => call.table === 'kwilt_streak_events')).toBe(true);
  });

  test('createActivityForUser normalizes provided steps into app-compatible activity steps', async () => {
    const { admin, calls } = createMockAdmin();

    await createActivityForUser(admin, 'user-1', {
      title: 'Improve to-do organization',
      steps: [
        { title: 'Write the grouping brief', completed_at: '2026-06-23T12:00:00.000Z' },
        { id: 'external-step-2', title: 'Ship the grouping controls', is_optional: true, order_index: 7 },
        { title: 'Verify unchecked step', completed_at: null },
        { title: '   ' },
        'ignored',
      ],
    });

    const activity = calls.find((call) => call.table === 'kwilt_activities');
    expect(activity?.payload.data.steps).toEqual([
      {
        id: 'step-activity_00000000-0000-4000-8000-000000000001-0',
        title: 'Write the grouping brief',
        completedAt: '2026-06-23T12:00:00.000Z',
        orderIndex: 0,
      },
      {
        id: 'external-step-2',
        title: 'Ship the grouping controls',
        isOptional: true,
        orderIndex: 7,
      },
      {
        id: 'step-activity_00000000-0000-4000-8000-000000000001-2',
        title: 'Verify unchecked step',
        completedAt: null,
        orderIndex: 2,
      },
    ]);
  });

  test('softDeleteObjectForUser writes the same tombstone shape as domainSync', async () => {
    const calls: Array<{ table: string; operation: string; payload?: any }> = [];
    const admin = {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: 'goal-1', data: { id: 'goal-1' }, is_deleted: false }, error: null }),
            }),
          }),
        }),
        upsert: (payload: any) => {
          calls.push({ table, operation: 'upsert', payload });
          return { error: null };
        },
      }),
    };

    await softDeleteObjectForUser(admin, 'user-1', 'kwilt_goals', 'goal-1');

    expect(calls[0].payload).toMatchObject({
      user_id: 'user-1',
      id: 'goal-1',
      data: {},
      is_deleted: true,
    });
    expect(typeof calls[0].payload.deleted_at).toBe('string');
  });

  test('updateActivityForUser marks done with the provided completion timestamp', async () => {
    const calls: Array<{ table: string; operation: string; payload?: any }> = [];
    const admin = {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 'activity-1',
                  data: { id: 'activity-1', title: 'Call Sam', status: 'planned', updatedAt: '2026-05-01T00:00:00.000Z' },
                  is_deleted: false,
                },
                error: null,
              }),
            }),
          }),
        }),
        upsert: (payload: any) => {
          calls.push({ table, operation: 'upsert', payload });
          return { error: null };
        },
      }),
    };

    await updateActivityForUser(admin, 'user-1', {
      activity_id: 'activity-1',
      status: 'done',
      completed_at: '2026-05-13T12:00:00.000Z',
    });

    expect(calls.find((call) => call.table === 'kwilt_activities')?.payload.data).toMatchObject({
      id: 'activity-1',
      status: 'done',
      completedAt: '2026-05-13T12:00:00.000Z',
    });
  });

  test('updateActivityForUser replaces steps only when steps are provided', async () => {
    const calls: Array<{ table: string; operation: string; payload?: any }> = [];
    const admin = {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 'activity-1',
                  data: {
                    id: 'activity-1',
                    title: 'Improve to-do organization',
                    status: 'planned',
                    updatedAt: '2026-05-01T00:00:00.000Z',
                    steps: [{ id: 'old-step', title: 'Old step', orderIndex: 0 }],
                  },
                  is_deleted: false,
                },
                error: null,
              }),
            }),
          }),
        }),
        upsert: (payload: any) => {
          calls.push({ table, operation: 'upsert', payload });
          return { error: null };
        },
      }),
    };

    await updateActivityForUser(admin, 'user-1', {
      activity_id: 'activity-1',
      title: 'Renamed',
    });
    await updateActivityForUser(admin, 'user-1', {
      activity_id: 'activity-1',
      steps: [{ title: 'New step' }],
    });
    await updateActivityForUser(admin, 'user-1', {
      activity_id: 'activity-1',
      steps: [],
    });

    expect(calls[0].payload.data.steps).toEqual([{ id: 'old-step', title: 'Old step', orderIndex: 0 }]);
    expect(calls[1].payload.data.steps).toEqual([
      { id: 'step-activity-1-0', title: 'New step', orderIndex: 0 },
    ]);
    expect(calls[2].payload.data.steps).toEqual([]);
  });
});
