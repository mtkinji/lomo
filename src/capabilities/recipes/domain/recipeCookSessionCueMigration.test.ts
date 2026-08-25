import type { CookCue, RecipeCookSession } from './recipeCookContracts';
import { reconcileRecipeCookSessionCues } from './recipeCookSessionCueMigration';

function session(): RecipeCookSession {
  return {
    id: 'session-1',
    ownerPersonId: 'person-1',
    recipeId: 'recipe-1',
    recipeVersionId: 'version-1',
    recipeVersion: 1,
    recipeScaleMultiplier: 1,
    status: 'paused',
    currentCueIndex: 3,
    cueCount: 5,
    revision: 1,
    startedAt: '2026-08-07T12:00:00.000Z',
    pausedAt: '2026-08-07T12:05:00.000Z',
    completedAt: null,
    updatedAt: '2026-08-07T12:05:00.000Z',
    lastDevice: { deviceId: 'device-1', platform: 'ios', appVersion: '102', observedAt: '2026-08-07T12:05:00.000Z' },
    timers: [],
  };
}

function cue(position: number, phasePosition: number, cuePositionInPhase: number): CookCue {
  return {
    id: cuePositionInPhase === 0 ? `cue:phase-${phasePosition}` : `cue:phase-${phasePosition}:${cuePositionInPhase + 1}`,
    instructionId: `phase-${phasePosition}`,
    position,
    section: null,
    phasePosition,
    phaseCount: 5,
    cuePositionInPhase,
    cueCountInPhase: phasePosition === 3 ? 3 : 1,
    displayText: 'Do the action.',
    actionText: 'Do the action.',
    supportingCue: null,
    accessibilityLabel: 'Do the action.',
    media: null,
    ingredientReferences: [],
    timerSuggestions: [],
  };
}

describe('reconcileRecipeCookSessionCues', () => {
  it('maps an older phase-only position to the first cue of that phase', () => {
    const cues = [
      cue(0, 0, 0),
      cue(1, 1, 0),
      cue(2, 2, 0),
      cue(3, 3, 0),
      cue(4, 3, 1),
      cue(5, 3, 2),
      cue(6, 4, 0),
    ];

    expect(reconcileRecipeCookSessionCues(session(), cues, '2026-08-07T12:06:00.000Z')).toMatchObject({
      currentCueIndex: 3,
      cueCount: 7,
      revision: 2,
      updatedAt: '2026-08-07T12:06:00.000Z',
    });
  });

  it('does not change a session that already matches the current cue structure', () => {
    const current = { ...session(), currentCueIndex: 4, cueCount: 7 };
    const cues = [0, 1, 2, 3, 4, 5, 6].map((position) => cue(position, Math.min(position, 4), 0));

    expect(reconcileRecipeCookSessionCues(current, cues)).toBe(current);
  });
});
