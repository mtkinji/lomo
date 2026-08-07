import type { CookCue, RecipeCookSession } from './recipeCookContracts';

export function reconcileRecipeCookSessionCues(
  session: RecipeCookSession,
  cues: readonly CookCue[],
  updatedAt = session.updatedAt,
): RecipeCookSession {
  if (!cues.length || session.cueCount === cues.length) return session;

  const previousPhasePosition = Math.min(
    session.currentCueIndex,
    Math.max(0, cues[0].phaseCount - 1),
  );
  const firstCueInPreviousPhase = cues.findIndex(
    (cue) => cue.phasePosition === previousPhasePosition,
  );

  return {
    ...session,
    currentCueIndex: firstCueInPreviousPhase >= 0
      ? firstCueInPreviousPhase
      : Math.min(session.currentCueIndex, cues.length - 1),
    cueCount: cues.length,
    revision: session.revision + 1,
    updatedAt,
  };
}
