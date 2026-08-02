import { beginExploreSession, completeExploreSession, createEmptyExploreData } from '../domain/exploreState';
import type { ExploreData } from '../domain/types';
import { useExploreStore } from './useExploreStore';

describe('Explore store persistence', () => {
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

    expect(upgraded.version).toBe(9);
    expect(upgraded.activeSession?.trackingPolicy).toBe('adventure');
    expect(upgraded.sessions[0].trackingPolicy).toBe('ambient');
  });
});
