import { beginExploreSession, completeExploreSession, createEmptyExploreData } from '../domain/exploreState';
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

    expect(upgraded.version).toBe(10);
    expect(upgraded.activeSession?.trackingPolicy).toBe('adventure');
    expect(upgraded.sessions[0].trackingPolicy).toBe('ambient');
    expect(upgraded.sync).toEqual({
      historyResetAt: null,
      deletedPlaceIds: {},
      lastSyncedAt: null,
    });
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
