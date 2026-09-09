import { beginExploreSession, completeExploreSession, createEmptyExploreData } from '../domain/exploreState';
import { destinationCoordinate } from '../domain/exploreGeometry';
import type { ExploreData } from '../domain/types';
import { useExploreStore } from './useExploreStore';

describe('Explore store persistence', () => {
  it('does not hydrate the heavy Explore history during app module startup', () => {
    expect(useExploreStore.persist.getOptions().skipHydration).toBe(true);
  });

  it('migrates unknown completed sessions conservatively while retaining an active policy', async () => {
    const startedAt = '2026-08-01T12:00:00.000Z';
    const completed = completeExploreSession(
      beginExploreSession(createEmptyExploreData(), 'completed', startedAt, 'adventure'),
      '2026-08-01T12:30:00.000Z',
    );
    const active = beginExploreSession(completed, 'active', '2026-08-01T13:00:00.000Z', 'adventure');
    const legacy = JSON.parse(JSON.stringify(active)) as {
      version: number;
      activeSession: { trackingPolicy?: string } | null;
      sessions: Array<{ trackingPolicy?: string }>;
    };
    if (legacy.activeSession) delete legacy.activeSession.trackingPolicy;
    delete legacy.sessions[0].trackingPolicy;
    legacy.version = 8;

    const migrate = useExploreStore.persist.getOptions().migrate;
    expect(migrate).toBeDefined();
    const upgraded = await migrate!(legacy, 8) as ExploreData;

    expect(upgraded.version).toBe(11);
    expect(upgraded.activeSession?.trackingPolicy).toBe('adventure');
    expect(upgraded.sessions[0].trackingPolicy).toBe('ambient');
    expect(upgraded.sync).toEqual({
      historyResetAt: null,
      deletedPlaceIds: {},
      lastSyncedAt: null,
    });
  });

  it('backfills continuous fog cells when upgrading version ten ambient history', async () => {
    const startedAt = '2026-09-04T12:00:00.000Z';
    const first = {
      id: 'ambient-1', latitude: 40.5, longitude: -105.1, altitudeM: 1500,
      horizontalAccuracyM: 8, altitudeAccuracyM: 6, speedMps: 20, courseDeg: 0,
      recordedAt: startedAt,
    };
    const second = {
      ...first,
      id: 'ambient-2',
      ...destinationCoordinate(first, 100, 0),
      recordedAt: '2026-09-04T12:00:05.000Z',
    };
    const legacy = {
      ...createEmptyExploreData(),
      version: 10,
      activeSession: null,
      sessions: [{
        ...beginExploreSession(createEmptyExploreData(), 'ambient-trip', startedAt, 'ambient').activeSession!,
        endedAt: second.recordedAt,
        points: [first, second],
      }],
      exploredCells: {},
    };

    const migrate = useExploreStore.persist.getOptions().migrate;
    const upgraded = await migrate!(legacy, 10) as ExploreData;

    expect(upgraded.version).toBe(11);
    expect(Object.keys(upgraded.exploredCells).length).toBeGreaterThan(2);
  });

  it('persists reset and Place tombstones for cross-device deletion', () => {
    useExploreStore.setState({ ...createEmptyExploreData(), lastPointDecision: null });
    useExploreStore.getState().addPlaceVisit({
      place: {
        id: 'user:home',
        name: 'Home',
        kind: 'place',
        latitude: 40.5,
        longitude: -105.1,
        source: 'user',
      },
      userId: 'user-a',
      visitedAt: '2026-08-03T12:00:00.000Z',
    });

    useExploreStore.getState().removeDiscoveredPlace('session-a', 'user:home', 'user-a');
    expect(useExploreStore.getState().sync.deletedPlaceIds['user:home']).toBeTruthy();

    useExploreStore.getState().clearHistory();
    expect(useExploreStore.getState().sync.historyResetAt).toBeTruthy();
    expect(useExploreStore.getState().sync.deletedPlaceIds).toEqual({});
  });

  it('stores presentation reconstruction without rebuilding earned territory', () => {
    const state = completeExploreSession(
      beginExploreSession(
        createEmptyExploreData(),
        'recorded-path',
        '2026-08-01T12:00:00.000Z',
        'adventure',
      ),
      '2026-08-01T12:30:00.000Z',
    );
    useExploreStore.setState({ ...state, lastPointDecision: null });
    const exploredCells = useExploreStore.getState().exploredCells;
    const segments = [{
      fromPointId: 'from',
      toPointId: 'to',
      coordinates: [{ latitude: 40.5, longitude: -105.1 }, { latitude: 40.6, longitude: -105.2 }],
      source: 'apple-directions' as const,
      routeDistanceM: 100,
    }];

    useExploreStore.getState().setSessionPathReconstruction('recorded-path', segments);

    expect(useExploreStore.getState().exploredCells).toBe(exploredCells);
    expect(useExploreStore.getState().sessions[0].reconstructedSegments).toEqual(segments);
  });
});
