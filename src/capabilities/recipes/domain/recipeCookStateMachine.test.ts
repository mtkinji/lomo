import { createRecipeCookSession, transitionRecipeCookSession } from './recipeCookStateMachine';

describe('Recipe Cook state machine', () => {
  const started = () => createRecipeCookSession({ id: 'cook-1', ownerPersonId: 'person-1', recipeId: 'recipe-1', recipeVersionId: 'version-3', recipeVersion: 3, recipeScaleMultiplier: 1, cueCount: 3, now: '2026-08-05T12:00:00.000Z', device: { deviceId: 'd1', platform: 'ios', appVersion: '1' } });

  test.each([
    ['next', 1], ['next', 1], ['back', 0],
  ] as const)('%s moves deterministically', (type, expected) => {
    expect(transitionRecipeCookSession(started(), { type, expectedRevision: 1, now: '2026-08-05T12:01:00.000Z' }).currentCueIndex).toBe(expected);
  });

  it('pauses, resumes, completes, and rejects stale revisions', () => {
    const paused = transitionRecipeCookSession(started(), { type: 'pause', expectedRevision: 1, now: '2026-08-05T12:01:00.000Z' });
    expect(paused).toMatchObject({ status: 'paused', revision: 2 });
    const resumed = transitionRecipeCookSession(paused, { type: 'resume', expectedRevision: 2, now: '2026-08-05T12:02:00.000Z' });
    const finished = transitionRecipeCookSession(resumed, { type: 'finish', expectedRevision: 3, now: '2026-08-05T12:03:00.000Z' });
    expect(finished).toMatchObject({ status: 'completed', completedAt: '2026-08-05T12:03:00.000Z' });
    expect(() => transitionRecipeCookSession(finished, { type: 'back', expectedRevision: 1, now: '2026-08-05T12:04:00.000Z' })).toThrow(expect.objectContaining({ code: 'recipe_cook.version_conflict' }));
  });

  it('starts, pauses, resumes, and cancels multiple cue-owned timers', () => {
    const withTimer = transitionRecipeCookSession(started(), { type: 'start_timer', expectedRevision: 1, cueId: 'cue-1', timerId: 'timer-1', durationSeconds: 600, label: 'Bake', now: '2026-08-05T12:01:00.000Z' });
    expect(withTimer.timers[0]).toMatchObject({ status: 'running', firesAt: '2026-08-05T12:11:00.000Z' });
    const paused = transitionRecipeCookSession(withTimer, { type: 'pause_timer', expectedRevision: 2, timerId: 'timer-1', now: '2026-08-05T12:03:00.000Z' });
    expect(paused.timers[0]).toMatchObject({ status: 'paused', remainingSeconds: 480 });
    const resumed = transitionRecipeCookSession(paused, { type: 'resume_timer', expectedRevision: 3, timerId: 'timer-1', now: '2026-08-05T12:04:00.000Z' });
    expect(resumed.timers[0].firesAt).toBe('2026-08-05T12:12:00.000Z');
  });

  it('restores progress without adopting a changed Recipe version', () => {
    const progressed = transitionRecipeCookSession(started(), { type: 'next', expectedRevision: 1, now: '2026-08-05T12:01:00.000Z' });
    expect(progressed.recipeVersionId).toBe('version-3');
    expect(progressed.currentCueIndex).toBe(1);
  });
});
