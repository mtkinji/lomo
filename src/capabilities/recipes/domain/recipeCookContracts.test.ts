import { parseRecipeCookSession } from './recipeCookContracts';

describe('Recipe Cook contracts', () => {
  it('requires an exact Recipe version, bounded cue position, revision, and device metadata', () => {
    expect(parseRecipeCookSession(session())).toMatchObject({ recipeId: 'recipe-1', recipeVersionId: 'version-3', currentCueIndex: 0 });
    expect(() => parseRecipeCookSession({ ...session(), currentCueIndex: 3 })).toThrow(expect.objectContaining({ code: 'recipe_cook.cue_invalid' }));
  });

  it('rejects timers without deterministic cue origin and schedule state', () => {
    expect(() => parseRecipeCookSession({ ...session(), timers: [{ id: '', cueId: 'cue-1', durationSeconds: 60 }] as never })).toThrow(
      expect.objectContaining({ code: 'recipe_cook.timer_invalid' }),
    );
  });
});

export function session() {
  return {
    id: 'cook-1', ownerPersonId: 'person-1', recipeId: 'recipe-1', recipeVersionId: 'version-3', recipeVersion: 3,
    recipeScaleMultiplier: 2 as const, status: 'active' as const, currentCueIndex: 0, cueCount: 2, revision: 1,
    startedAt: '2026-08-05T12:00:00.000Z', pausedAt: null, completedAt: null, updatedAt: '2026-08-05T12:00:00.000Z',
    lastDevice: { deviceId: 'device-1', platform: 'ios' as const, appVersion: '1.0.102', observedAt: '2026-08-05T12:00:00.000Z' }, timers: [],
  };
}
