import { appendExplorePoint, beginExploreSession, completeExploreSession, createEmptyExploreData } from '../domain/exploreState';
import type { ExploreRemoteRecord } from '../domain/exploreSync';
import { useExploreStore } from './useExploreStore';
import { syncExploreHistory } from './exploreSyncRepository';

const USER_ID = '11111111-1111-4111-8111-111111111111';

function thenableResult(result: unknown) {
  return { then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) };
}

function clientWith(params: { pulled?: ExploreRemoteRecord[]; upserted?: ExploreRemoteRecord[]; pullError?: unknown; upsertError?: unknown }) {
  const calls: Array<{ operation: string; value?: unknown }> = [];
  const query: any = {
    eq: jest.fn((_column, value) => { calls.push({ operation: 'eq', value }); return query; }),
    order: jest.fn(() => query),
    gt: jest.fn((_column, value) => { calls.push({ operation: 'gt', value }); return query; }),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({
      data: params.pulled ?? [], error: params.pullError ?? null,
    }).then(resolve),
  };
  const client: any = {
    from: jest.fn(() => ({
      select: jest.fn(() => query),
      upsert: jest.fn((rows, options) => {
        calls.push({ operation: 'upsert', value: { rows, options } });
        return { select: jest.fn(() => thenableResult({ data: params.upserted ?? [], error: params.upsertError ?? null })) };
      }),
    })),
  };
  return { client, calls };
}

describe('Explore sync repository', () => {
  beforeEach(() => {
    useExploreStore.setState({ ...createEmptyExploreData(), lastPointDecision: null });
  });

  it('pulls owner-filtered changes, restores them, and advances only to server time', async () => {
    const session = completeExploreSession(
      appendExplorePoint(
        beginExploreSession(createEmptyExploreData(), 'remote-session', '2026-08-03T12:00:00.000Z'),
        { id: 'p', latitude: 40.5, longitude: -105.1, altitudeM: null, horizontalAccuracyM: 5,
          altitudeAccuracyM: null, speedMps: null, courseDeg: null, recordedAt: '2026-08-03T12:01:00.000Z' },
      ),
      '2026-08-03T12:02:00.000Z',
    ).sessions[0];
    const remote: ExploreRemoteRecord = {
      user_id: USER_ID, record_type: 'session', record_id: session.id,
      payload: session as unknown as Record<string, unknown>, client_updated_at: '2026-08-03T12:02:00.000Z',
      deleted_at: null, created_at: '2026-08-03T12:03:00.000Z', updated_at: '2026-08-03T12:03:00.000Z',
    };
    const { client, calls } = clientWith({ pulled: [remote] });

    await syncExploreHistory(USER_ID, client);

    expect(calls).toContainEqual({ operation: 'eq', value: USER_ID });
    expect(useExploreStore.getState().sessions[0]?.id).toBe('remote-session');
    expect(useExploreStore.getState().sync.lastSyncedAt).toBe('2026-08-03T12:03:00.000Z');
  });

  it('pushes only changed local records with the owner conflict key', async () => {
    let local = beginExploreSession(createEmptyExploreData(), 'local-session', '2026-08-03T13:00:00.000Z');
    local = appendExplorePoint(local, { id: 'p', latitude: 40.5, longitude: -105.1, altitudeM: null,
      horizontalAccuracyM: 5, altitudeAccuracyM: null, speedMps: null, courseDeg: null,
      recordedAt: '2026-08-03T13:01:00.000Z' });
    local = completeExploreSession(local, '2026-08-03T13:02:00.000Z');
    local.sync.lastSyncedAt = '2026-08-03T12:00:00.000Z';
    useExploreStore.setState({ ...local, lastPointDecision: null });
    const returned: ExploreRemoteRecord = {
      user_id: USER_ID, record_type: 'session', record_id: 'local-session', payload: local.sessions[0] as unknown as Record<string, unknown>,
      client_updated_at: '2026-08-03T13:02:00.000Z', deleted_at: null,
      created_at: '2026-08-03T13:02:01.000Z', updated_at: '2026-08-03T13:02:01.000Z',
    };
    const { client, calls } = clientWith({ upserted: [returned] });

    await syncExploreHistory(USER_ID, client);

    expect(calls).toContainEqual({ operation: 'gt', value: '2026-08-03T12:00:00.000Z' });
    const upsert = calls.find((call) => call.operation === 'upsert')?.value as any;
    expect(upsert.options).toEqual({ onConflict: 'user_id,record_type,record_id' });
    expect(upsert.rows).toEqual([expect.objectContaining({ user_id: USER_ID, record_id: 'local-session' })]);
  });

  it('does not claim a successful sync after a database error', async () => {
    const { client } = clientWith({ pullError: { message: 'RLS denied' } });
    await expect(syncExploreHistory(USER_ID, client)).rejects.toThrow('RLS denied');
    expect(useExploreStore.getState().sync.lastSyncedAt).toBeNull();
  });
});
