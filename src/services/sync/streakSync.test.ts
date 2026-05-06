import { resetUserSpecificState, useAppStore } from '../../store/useAppStore';
import { resetStreakSyncForTests, startStreakSync } from './streakSync';

type TableName = 'kwilt_streak_summaries' | 'kwilt_streak_events';

const mockSummaryRows = new Map<string, any>();
const mockEventRows = new Map<string, any>();
const mockUpsertOptions: Array<{ table: TableName; options: any }> = [];
let mockSelectError: any = null;
let mockUpsertError: any = null;

jest.mock('../backend/supabaseClient', () => ({
  getSupabaseClient: jest.fn(() => ({
    from: jest.fn((table: TableName) => ({
      select: jest.fn(() => ({
        eq: jest.fn((_column: string, value: string) => ({
          limit: jest.fn(() => {
            if (mockSelectError) return Promise.resolve({ data: null, error: mockSelectError });
            if (table === 'kwilt_streak_summaries') {
              const row = mockSummaryRows.get(value);
              return Promise.resolve({ data: row ? [row] : [], error: null });
            }
            return Promise.resolve({ data: [], error: null });
          }),
        })),
      })),
      upsert: jest.fn((rows: any, options: any) => {
        mockUpsertOptions.push({ table, options });
        const list = Array.isArray(rows) ? rows : [rows];
        if (!mockUpsertError) {
          if (table === 'kwilt_streak_summaries') {
            for (const row of list) {
              mockSummaryRows.set(row.user_id, {
                ...mockSummaryRows.get(row.user_id),
                ...row,
                updated_at: row.client_updated_at,
              });
            }
          } else {
            for (const row of list) {
              mockEventRows.set(`${row.user_id}:${row.client_event_id}`, row);
            }
          }
        }
        return {
          select: jest.fn(() => ({
            throwOnError: jest.fn(() => {
              if (mockUpsertError) return Promise.reject(mockUpsertError);
              return Promise.resolve({ data: [], error: null });
            }),
          })),
        };
      }),
    })),
  })),
}));

function wait(ms = 5): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let i = 0; i < 80; i += 1) {
    if (predicate()) return;
    await wait();
  }
  throw new Error(`Timed out waiting for streak sync: ${JSON.stringify(useAppStore.getState())}`);
}

function remoteSummary(overrides: Record<string, unknown>) {
  return {
    user_id: 'user-a',
    last_show_up_date: null,
    current_show_up_streak: 0,
    last_streak_date: null,
    current_covered_show_up_streak: 0,
    free_days_remaining: 1,
    last_free_reset_week: null,
    shields_available: 0,
    last_shield_earned_week_key: null,
    grace_days_used: 0,
    broken_at_date: null,
    broken_streak_length: null,
    eligible_repair_until_ms: null,
    repaired_at_ms: null,
    timezone: 'America/Denver',
    client_updated_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('streakSync', () => {
  beforeEach(() => {
    resetStreakSyncForTests();
    useAppStore.getState().resetStore();
    useAppStore.getState().clearAuthIdentity();
    mockSummaryRows.clear();
    mockEventRows.clear();
    mockUpsertOptions.length = 0;
    mockSelectError = null;
    mockUpsertError = null;
    jest.useRealTimers();
  });

  afterEach(() => {
    resetStreakSyncForTests();
    jest.useRealTimers();
  });

  it('seeds cloud summary and ledger event when remote is empty', async () => {
    useAppStore.setState({
      lastShowUpDate: '2026-04-15',
      currentShowUpStreak: 6,
      lastStreakDateKey: '2026-04-15',
      currentCoveredShowUpStreak: 7,
      streakUpdatedAtIso: '2026-04-15T18:00:00.000Z',
    } as any);

    startStreakSync();
    useAppStore.getState().setAuthIdentity({ userId: 'user-a', email: 'a@example.com' } as any);

    await waitFor(() => mockSummaryRows.get('user-a')?.current_show_up_streak === 6);
    expect(mockSummaryRows.get('user-a')).toMatchObject({
      last_show_up_date: '2026-04-15',
      current_show_up_streak: 6,
      last_streak_date: '2026-04-15',
      current_covered_show_up_streak: 7,
    });
    expect(Array.from(mockEventRows.values())).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event_type: 'show_up',
          local_date: '2026-04-15',
          streak_value: 6,
        }),
      ]),
    );
  });

  it('hydrates local state when remote summary is newer', async () => {
    mockSummaryRows.set(
      'user-a',
      remoteSummary({
        current_show_up_streak: 12,
        current_covered_show_up_streak: 13,
        last_show_up_date: '2026-04-20',
        last_streak_date: '2026-04-20',
        shields_available: 2,
        client_updated_at: '2026-04-20T15:00:00.000Z',
        updated_at: '2026-04-20T15:00:00.000Z',
      }),
    );
    useAppStore.setState({
      currentShowUpStreak: 3,
      streakUpdatedAtIso: '2026-04-19T15:00:00.000Z',
    } as any);

    startStreakSync();
    useAppStore.getState().setAuthIdentity({ userId: 'user-a', email: 'a@example.com' } as any);

    await waitFor(() => useAppStore.getState().currentShowUpStreak === 12);
    expect(useAppStore.getState().lastShowUpDate).toBe('2026-04-20');
    expect(useAppStore.getState().currentCoveredShowUpStreak).toBe(13);
    expect(useAppStore.getState().streakGrace.shieldsAvailable).toBe(2);
  });

  it('pushes local summary when local state is newer than remote', async () => {
    mockSummaryRows.set(
      'user-a',
      remoteSummary({
        current_show_up_streak: 2,
        client_updated_at: '2026-04-10T15:00:00.000Z',
        updated_at: '2026-04-10T15:00:00.000Z',
      }),
    );
    useAppStore.setState({
      lastShowUpDate: '2026-04-15',
      currentShowUpStreak: 8,
      lastStreakDateKey: '2026-04-15',
      currentCoveredShowUpStreak: 8,
      streakUpdatedAtIso: '2026-04-15T15:00:00.000Z',
    } as any);

    startStreakSync();
    useAppStore.getState().setAuthIdentity({ userId: 'user-a', email: 'a@example.com' } as any);

    await waitFor(() => mockSummaryRows.get('user-a')?.current_show_up_streak === 8);
    expect(mockSummaryRows.get('user-a')).toMatchObject({
      current_show_up_streak: 8,
      client_updated_at: '2026-04-15T15:00:00.000Z',
    });
  });

  it('keeps local streak updates working when cloud pull fails', async () => {
    mockSelectError = { message: 'network down' };

    startStreakSync();
    useAppStore.getState().setAuthIdentity({ userId: 'user-a', email: 'a@example.com' } as any);
    await wait();

    jest.useFakeTimers().setSystemTime(new Date(2026, 3, 15, 10, 0, 0));
    useAppStore.getState().recordShowUp();

    expect(useAppStore.getState().currentShowUpStreak).toBe(1);
    expect(useAppStore.getState().lastShowUpDate).toBe('2026-04-15');
  });

  it('uses idempotent event upserts for local streak changes', async () => {
    startStreakSync();
    useAppStore.getState().setAuthIdentity({ userId: 'user-a', email: 'a@example.com' } as any);
    await waitFor(() => mockSummaryRows.has('user-a'));

    useAppStore.setState({
      lastShowUpDate: '2026-04-15',
      currentShowUpStreak: 1,
      lastStreakDateKey: '2026-04-15',
      currentCoveredShowUpStreak: 1,
      streakUpdatedAtIso: '2026-04-15T16:00:00.000Z',
    } as any);
    await waitFor(() => Array.from(mockEventRows.values()).some((row) => row.event_type === 'show_up'));

    const eventUpsert = mockUpsertOptions.find((entry) => entry.table === 'kwilt_streak_events');
    expect(eventUpsert?.options).toMatchObject({
      onConflict: 'user_id,client_event_id',
      ignoreDuplicates: true,
    });
  });

  it('supports account isolation when switching users', async () => {
    mockSummaryRows.set(
      'user-a',
      remoteSummary({
        user_id: 'user-a',
        current_show_up_streak: 9,
        last_show_up_date: '2026-04-15',
        last_streak_date: '2026-04-15',
        client_updated_at: '2026-04-15T15:00:00.000Z',
        updated_at: '2026-04-15T15:00:00.000Z',
      }),
    );
    mockSummaryRows.set(
      'user-b',
      remoteSummary({
        user_id: 'user-b',
        current_show_up_streak: 1,
        last_show_up_date: '2026-04-16',
        last_streak_date: '2026-04-16',
        client_updated_at: '2026-04-16T15:00:00.000Z',
        updated_at: '2026-04-16T15:00:00.000Z',
      }),
    );

    startStreakSync();
    useAppStore.getState().setAuthIdentity({ userId: 'user-a', email: 'a@example.com' } as any);
    await waitFor(() => useAppStore.getState().currentShowUpStreak === 9);

    resetUserSpecificState();
    useAppStore.getState().setAuthIdentity({ userId: 'user-b', email: 'b@example.com' } as any);
    await waitFor(() => useAppStore.getState().lastShowUpDate === '2026-04-16');

    expect(useAppStore.getState().currentShowUpStreak).toBe(1);
    expect(useAppStore.getState().lastShowUpDate).toBe('2026-04-16');
  });
});
