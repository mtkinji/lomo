import { createRecipeCookActions, parseRecipeCookControlCommand, type RecipeCookActionBoundary } from './recipeCookActions';

const recipe = {
  ownerPersonId: 'person-1', recipeId: 'recipe-1', recipeVersionId: 'version-2', recipeVersion: 2, cueCount: 3,
};

function setup() {
  let current: Awaited<ReturnType<RecipeCookActionBoundary['read']>> = null;
  const boundary: RecipeCookActionBoundary = {
    read: jest.fn(async (sessionId) => current?.id === sessionId ? current : null),
    apply: jest.fn(async ({ session }) => { current = session; return { session, replayed: false }; }),
  };
  const actions = createRecipeCookActions(boundary, {
    now: () => '2026-08-27T12:00:00.000Z', createId: () => 'session-1',
    device: { deviceId: 'device-1', platform: 'ios', appVersion: '1' },
  });
  return { actions, boundary, current: () => current };
}

describe('Recipe Cook actions', () => {
  test('accepts only bounded deterministic Cook commands', () => {
    expect(parseRecipeCookControlCommand({ type: 'next' })).toEqual({ type: 'next' });
    expect(parseRecipeCookControlCommand({ type: 'start_timer', cueId: 'cue-1', timerId: 'timer-1', durationSeconds: 300, label: 'Bake' }))
      .toEqual({ type: 'start_timer', cueId: 'cue-1', timerId: 'timer-1', durationSeconds: 300, label: 'Bake' });
    expect(parseRecipeCookControlCommand({ type: 'next', arbitrary: true })).toBeNull();
    expect(parseRecipeCookControlCommand({ type: 'start_timer', durationSeconds: 999_999 })).toBeNull();
  });
  test('starts one exact-version reviewed session idempotently', async () => {
    const { actions, boundary } = setup();
    await expect(actions.start({ requestId: 'start-1', confirmed: true, recipeScaleMultiplier: 2, ...recipe }))
      .resolves.toMatchObject({ status: 'completed', session: { id: 'session-1', recipeVersionId: 'version-2', revision: 1 } });
    expect(boundary.apply).toHaveBeenCalledWith(expect.objectContaining({ requestId: 'start-1', expectedRevision: 0 }));
  });

  test('requires review for start and completion', async () => {
    const { actions, boundary } = setup();
    await expect(actions.start({ requestId: 'start-1', confirmed: false, recipeScaleMultiplier: 1, ...recipe }))
      .rejects.toThrow('recipe_cook.confirmation_required');
    await expect(actions.complete({ requestId: 'complete-1', confirmed: false, sessionId: 'session-1', expectedRevision: 1, outcome: 'completed' }))
      .rejects.toThrow('recipe_cook.confirmation_required');
    expect(boundary.apply).not.toHaveBeenCalled();
  });

  test('controls and completes only the exact current revision', async () => {
    const { actions } = setup();
    const started = await actions.start({ requestId: 'start-1', confirmed: true, recipeScaleMultiplier: 1, ...recipe });
    await expect(actions.control({ requestId: 'next-1', sessionId: started.session.id, expectedRevision: 1, command: { type: 'next' } }))
      .resolves.toMatchObject({ session: { currentCueIndex: 1, revision: 2 } });
    await expect(actions.control({ requestId: 'stale', sessionId: started.session.id, expectedRevision: 1, command: { type: 'back' } }))
      .rejects.toThrow('recipe_cook.version_conflict');
    await expect(actions.complete({ requestId: 'complete-1', confirmed: true, sessionId: started.session.id, expectedRevision: 2, outcome: 'abandoned' }))
      .resolves.toMatchObject({ session: { status: 'abandoned', revision: 3 } });
  });

  test('repeat reads the current cue without mutating the revision', async () => {
    const { actions, boundary } = setup();
    const started = await actions.start({ requestId: 'start-1', confirmed: true, recipeScaleMultiplier: 1, ...recipe });
    await expect(actions.control({ requestId: 'repeat-1', sessionId: started.session.id, expectedRevision: 1, command: { type: 'repeat' } }))
      .resolves.toMatchObject({ replayedCue: true, session: { revision: 1 } });
    expect(boundary.apply).toHaveBeenCalledTimes(1);
  });
});
