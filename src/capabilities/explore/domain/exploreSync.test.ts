import { appendExplorePoint, beginExploreSession, completeExploreSession, createEmptyExploreData, recordPlaceVisit } from './exploreState';
import {
  encodeExploreRecords,
  mergeExploreRecords,
  recordsChangedAfter,
  type ExploreRemoteRecord,
} from './exploreSync';

const USER_ID = '11111111-1111-4111-8111-111111111111';

function completedData() {
  let data = beginExploreSession(createEmptyExploreData(), 'session-a', '2026-08-03T12:00:00.000Z');
  data = appendExplorePoint(data, {
    id: 'point-a', latitude: 40.5, longitude: -105.1, altitudeM: 1500,
    horizontalAccuracyM: 5, altitudeAccuracyM: 5, speedMps: 2, courseDeg: 90,
    recordedAt: '2026-08-03T12:01:00.000Z',
  });
  data = completeExploreSession(data, '2026-08-03T12:02:00.000Z');
  return recordPlaceVisit(data, {
    place: { id: 'user:home', name: 'Home', kind: 'place', latitude: 40.5, longitude: -105.1, source: 'user' },
    userId: USER_ID,
    visitedAt: '2026-08-03T12:01:00.000Z',
    evidence: 'user-confirmed',
  });
}

function asRemote(records: ReturnType<typeof encodeExploreRecords>): ExploreRemoteRecord[] {
  return records.map((record, index) => ({
    ...record,
    created_at: `2026-08-03T12:0${index}:30.000Z`,
    updated_at: `2026-08-03T12:0${index}:30.000Z`,
  }));
}

describe('Explore durable record reconciliation', () => {
  it('encodes canonical history without uploading derived cells or transient tracking', () => {
    const records = encodeExploreRecords(completedData(), USER_ID);

    expect(records.map((record) => `${record.record_type}:${record.record_id}`)).toEqual([
      'session:session-a',
      'place:user:home',
      `relationship:${USER_ID}:user:home`,
    ]);
    expect(JSON.stringify(records)).not.toContain('exploredCells');
    expect(JSON.stringify(records)).not.toContain('wakeAnchor');
  });

  it('restores a clean device and rebuilds explored territory', () => {
    const restored = mergeExploreRecords(createEmptyExploreData(), asRemote(
      encodeExploreRecords(completedData(), USER_ID),
    ));

    expect(restored.sessions).toHaveLength(1);
    expect(restored.sessions[0].points).toHaveLength(1);
    expect(restored.places['user:home']?.name).toBe('Home');
    expect(Object.keys(restored.exploredCells).length).toBeGreaterThan(0);
  });

  it('selects only locally changed records after the last successful sync', () => {
    const records = encodeExploreRecords(completedData(), USER_ID);
    expect(recordsChangedAfter(records, null)).toHaveLength(3);
    expect(recordsChangedAfter(records, '2026-08-03T12:01:30.000Z').map((record) => record.record_type))
      .toEqual(['session']);
  });

  it('lets a reset and Place tombstone defeat older remote history', () => {
    const original = completedData();
    const remote = asRemote(encodeExploreRecords(original, USER_ID));
    const cleared = {
      ...createEmptyExploreData(),
      sync: {
        historyResetAt: '2026-08-03T13:00:00.000Z',
        deletedPlaceIds: { 'user:home': '2026-08-03T13:01:00.000Z' },
        lastSyncedAt: null,
      },
    };

    const merged = mergeExploreRecords(cleared, remote);
    expect(merged.sessions).toEqual([]);
    expect(merged.places).toEqual({});
    expect(merged.placeRelationships).toEqual({});

    const deletionRecords = encodeExploreRecords(cleared, USER_ID);
    expect(deletionRecords).toEqual(expect.arrayContaining([
      expect.objectContaining({ record_type: 'reset', record_id: 'history' }),
      expect.objectContaining({ record_type: 'place', record_id: 'user:home', deleted_at: '2026-08-03T13:01:00.000Z' }),
    ]));
  });

  it('accepts a newer remote reset and tombstone on a device with stale local data', () => {
    const local = completedData();
    const reset: ExploreRemoteRecord = {
      user_id: USER_ID,
      record_type: 'reset',
      record_id: 'history',
      payload: { historyResetAt: '2026-08-03T14:00:00.000Z', deletedPlaceIds: { 'user:home': '2026-08-03T14:01:00.000Z' } },
      client_updated_at: '2026-08-03T14:01:00.000Z',
      deleted_at: null,
      created_at: '2026-08-03T14:01:01.000Z',
      updated_at: '2026-08-03T14:01:01.000Z',
    };

    const merged = mergeExploreRecords(local, [reset]);
    expect(merged.sessions).toEqual([]);
    expect(merged.places).toEqual({});
    expect(merged.sync.historyResetAt).toBe('2026-08-03T14:00:00.000Z');
  });
});
