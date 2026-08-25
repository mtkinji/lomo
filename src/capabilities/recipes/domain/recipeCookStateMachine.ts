import { parseRecipeCookSession, RecipeCookContractError, type RecipeCookSession } from './recipeCookContracts';

type DeviceInput = Omit<RecipeCookSession['lastDevice'], 'observedAt'>;
export function createRecipeCookSession(input: {
  id: string; ownerPersonId: string; recipeId: string; recipeVersionId: string; recipeVersion: number; recipeScaleMultiplier: RecipeCookSession['recipeScaleMultiplier']; cueCount: number; now: string; device: DeviceInput;
}): RecipeCookSession {
  return parseRecipeCookSession({
    id: input.id, ownerPersonId: input.ownerPersonId, recipeId: input.recipeId, recipeVersionId: input.recipeVersionId, recipeVersion: input.recipeVersion,
    recipeScaleMultiplier: input.recipeScaleMultiplier, status: 'active', currentCueIndex: 0, cueCount: input.cueCount, revision: 1,
    startedAt: input.now, pausedAt: null, completedAt: null, updatedAt: input.now, lastDevice: { ...input.device, observedAt: input.now }, timers: [],
  });
}

export type RecipeCookEvent =
  | { type: 'next' | 'back' | 'pause' | 'resume' | 'finish' | 'abandon'; expectedRevision: number; now: string }
  | { type: 'start_timer'; expectedRevision: number; now: string; cueId: string; timerId: string; durationSeconds: number; label: string; notificationId?: string | null }
  | { type: 'pause_timer' | 'cancel_timer'; expectedRevision: number; now: string; timerId: string }
  | { type: 'resume_timer'; expectedRevision: number; now: string; timerId: string; notificationId?: string | null };
export type RecipeCookCommand = RecipeCookEvent extends infer Event ? Event extends RecipeCookEvent ? Omit<Event, 'expectedRevision' | 'now'> : never : never;

export function transitionRecipeCookSession(input: RecipeCookSession, event: RecipeCookEvent): RecipeCookSession {
  const session = parseRecipeCookSession(input);
  if (session.revision !== event.expectedRevision) throw new RecipeCookContractError('recipe_cook.version_conflict', 'Cooking progress changed on another device.', ['reload_progress', 'keep_current_device']);
  if (['completed', 'abandoned'].includes(session.status)) throw new RecipeCookContractError('recipe_cook.session_finished', 'This Cook Session has ended.');
  const next: RecipeCookSession = { ...session, revision: session.revision + 1, updatedAt: event.now, timers: session.timers.map((timer) => ({ ...timer })) };
  if (event.type === 'next') next.currentCueIndex = Math.min(session.cueCount - 1, session.currentCueIndex + 1);
  else if (event.type === 'back') next.currentCueIndex = Math.max(0, session.currentCueIndex - 1);
  else if (event.type === 'pause') { next.status = 'paused'; next.pausedAt = event.now; }
  else if (event.type === 'resume') { next.status = 'active'; next.pausedAt = null; }
  else if (event.type === 'finish' || event.type === 'abandon') { next.status = event.type === 'finish' ? 'completed' : 'abandoned'; next.completedAt = event.now; next.pausedAt = null; }
  else if (event.type === 'start_timer') {
    if (!event.timerId || !event.cueId || !event.label || !Number.isInteger(event.durationSeconds) || event.durationSeconds < 1) throw new RecipeCookContractError('recipe_cook.timer_invalid', 'Timer details are invalid.');
    if (next.timers.some((timer) => timer.id === event.timerId)) throw new RecipeCookContractError('recipe_cook.timer_duplicate', 'This timer already exists.');
    next.timers.push({ id: event.timerId, cueId: event.cueId, label: event.label, durationSeconds: event.durationSeconds, remainingSeconds: event.durationSeconds, startedAt: event.now, pausedAt: null, firesAt: new Date(Date.parse(event.now) + event.durationSeconds * 1000).toISOString(), status: 'running', notificationId: event.notificationId ?? null, syncState: 'local' });
  } else if (event.type === 'pause_timer' || event.type === 'resume_timer' || event.type === 'cancel_timer') {
    const timer = next.timers.find((candidate) => candidate.id === event.timerId);
    if (!timer) throw new RecipeCookContractError('recipe_cook.timer_missing', 'That timer is no longer available.');
    if (event.type === 'pause_timer') {
      if (timer.status !== 'running' || !timer.firesAt) throw new RecipeCookContractError('recipe_cook.timer_state_invalid', 'Only a running timer can pause.');
      timer.remainingSeconds = Math.max(0, Math.ceil((Date.parse(timer.firesAt) - Date.parse(event.now)) / 1000)); timer.status = 'paused'; timer.pausedAt = event.now; timer.firesAt = null;
    } else if (event.type === 'resume_timer') {
      if (timer.status !== 'paused') throw new RecipeCookContractError('recipe_cook.timer_state_invalid', 'Only a paused timer can resume.');
      timer.status = 'running'; timer.pausedAt = null; timer.firesAt = new Date(Date.parse(event.now) + timer.remainingSeconds * 1000).toISOString();
      timer.notificationId=event.notificationId??null;
    } else { timer.status = 'cancelled'; timer.firesAt = null; timer.pausedAt = null; }
  }
  return parseRecipeCookSession(next);
}
