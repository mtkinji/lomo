import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { parseRecipeCookSession, type RecipeCookDevice, type RecipeCookSession } from '../domain/recipeCookContracts';
import { createRecipeCookSession, transitionRecipeCookSession, type RecipeCookCommand } from '../domain/recipeCookStateMachine';

export type RecipeCookControlCommand = RecipeCookCommand | { type: 'repeat' };

export function parseRecipeCookControlCommand(value: unknown): RecipeCookControlCommand | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const type = typeof input.type === 'string' ? input.type : '';
  const allowed = new Set(['type', 'cueId', 'timerId', 'durationSeconds', 'label']);
  if (Object.keys(input).some((key) => !allowed.has(key))) return null;
  if (['next', 'back', 'repeat', 'pause', 'resume'].includes(type)) {
    return Object.keys(input).length === 1 ? { type } as RecipeCookControlCommand : null;
  }
  const timerId = typeof input.timerId === 'string' ? input.timerId.trim() : '';
  if (['pause_timer', 'resume_timer', 'cancel_timer'].includes(type)) {
    return timerId && Object.keys(input).every((key) => key === 'type' || key === 'timerId')
      ? { type, timerId } as RecipeCookControlCommand : null;
  }
  const cueId = typeof input.cueId === 'string' ? input.cueId.trim() : '';
  const label = typeof input.label === 'string' ? input.label.trim() : '';
  if (type === 'start_timer' && cueId && timerId && label && label.length <= 160
    && Number.isInteger(input.durationSeconds) && Number(input.durationSeconds) >= 1 && Number(input.durationSeconds) <= 86_400) {
    return { type: 'start_timer', cueId, timerId, label, durationSeconds: Number(input.durationSeconds) };
  }
  return null;
}

export type RecipeCookActionBoundary = {
  read(sessionId: string): Promise<RecipeCookSession | null>;
  apply(input: { requestId: string; expectedRevision: number; session: RecipeCookSession }): Promise<{ session: RecipeCookSession; replayed: boolean }>;
};

function rowToSession(value: unknown): RecipeCookSession | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  try {
    return parseRecipeCookSession({
      id: String(row.id), ownerPersonId: String(row.ownerPersonId ?? row.owner_person_id),
      recipeId: String(row.recipeId ?? row.recipe_id), recipeVersionId: String(row.recipeVersionId ?? row.recipe_version_id),
      recipeVersion: Number(row.recipeVersion ?? row.recipe_version),
      recipeScaleMultiplier: Number(row.recipeScaleMultiplier ?? row.servingScale ?? row.serving_scale) as 1 | 2 | 3,
      status: String(row.status) as RecipeCookSession['status'], currentCueIndex: Number(row.currentCueIndex ?? row.current_cue_index),
      cueCount: Number(row.cueCount ?? row.cue_count), revision: Number(row.revision),
      startedAt: String(row.startedAt ?? row.started_at), pausedAt: (row.pausedAt ?? row.paused_at ?? null) as string | null,
      completedAt: (row.completedAt ?? row.completed_at ?? null) as string | null,
      updatedAt: String(row.updatedAt ?? row.updated_at),
      lastDevice: (row.lastDevice ?? row.last_device) as RecipeCookSession['lastDevice'],
      timers: Array.isArray(row.timers) ? row.timers as RecipeCookSession['timers'] : [],
    });
  } catch { return null; }
}

export function createRecipeCookActionBoundary(client: SupabaseClient = getSupabaseClient()): RecipeCookActionBoundary {
  return {
    async read(sessionId) {
      const { data, error } = await client.from('kwilt_recipe_cook_sessions').select('*').eq('id', sessionId).maybeSingle();
      if (error) throw new Error(error.message);
      return rowToSession(data);
    },
    async apply(input) {
      const legacySession: Record<string, unknown> = { ...input.session, servingScale: input.session.recipeScaleMultiplier };
      delete legacySession.recipeScaleMultiplier;
      const { data, error } = await client.rpc('apply_kwilt_cook_session_conversational', {
        p_idempotency_key: input.requestId, p_expected_revision: input.expectedRevision, p_session: legacySession,
      });
      if (error) throw new Error(error.message);
      const envelope = data && typeof data === 'object' && !Array.isArray(data) ? data as Record<string, unknown> : {};
      const session = rowToSession(envelope.session) ?? input.session;
      return { session, replayed: envelope.replayed === true };
    },
  };
}

export function createRecipeCookActions(
  boundary: RecipeCookActionBoundary,
  runtime: { now(): string; createId(): string; device: Omit<RecipeCookDevice, 'observedAt'> },
) {
  const readExact = async (sessionId: string, expectedRevision: number) => {
    const session = await boundary.read(sessionId);
    if (!session) throw new Error('recipe_cook.session_not_found');
    if (session.revision !== expectedRevision) throw new Error('recipe_cook.version_conflict');
    return session;
  };
  return {
    async read(sessionId: string) {
      const session = await boundary.read(sessionId);
      if (!session) throw new Error('recipe_cook.session_not_found');
      return { status: 'completed' as const, session };
    },
    async start(input: {
      requestId: string; confirmed: boolean; ownerPersonId: string; recipeId: string; recipeVersionId: string;
      recipeVersion: number; recipeScaleMultiplier: 1 | 2 | 3; cueCount: number;
    }) {
      if (!input.confirmed) throw new Error('recipe_cook.confirmation_required');
      const session = createRecipeCookSession({
        id: runtime.createId(), ownerPersonId: input.ownerPersonId, recipeId: input.recipeId,
        recipeVersionId: input.recipeVersionId, recipeVersion: input.recipeVersion,
        recipeScaleMultiplier: input.recipeScaleMultiplier, cueCount: input.cueCount,
        now: runtime.now(), device: runtime.device,
      });
      const applied = await boundary.apply({ requestId: input.requestId, expectedRevision: 0, session });
      return { status: 'completed' as const, ...applied };
    },
    async control(input: { requestId: string; sessionId: string; expectedRevision: number; command: RecipeCookControlCommand }) {
      const session = await readExact(input.sessionId, input.expectedRevision);
      if (input.command.type === 'repeat') return { status: 'completed' as const, session, replayed: false, replayedCue: true };
      const next = transitionRecipeCookSession(session, {
        ...input.command, expectedRevision: input.expectedRevision, now: runtime.now(),
      } as Parameters<typeof transitionRecipeCookSession>[1]);
      const applied = await boundary.apply({ requestId: input.requestId, expectedRevision: input.expectedRevision, session: next });
      return { status: 'completed' as const, ...applied, replayedCue: false };
    },
    async complete(input: { requestId: string; confirmed: boolean; sessionId: string; expectedRevision: number; outcome: 'completed' | 'abandoned' }) {
      if (!input.confirmed) throw new Error('recipe_cook.confirmation_required');
      const session = await readExact(input.sessionId, input.expectedRevision);
      const next = transitionRecipeCookSession(session, {
        type: input.outcome === 'completed' ? 'finish' : 'abandon', expectedRevision: input.expectedRevision, now: runtime.now(),
      });
      const applied = await boundary.apply({ requestId: input.requestId, expectedRevision: input.expectedRevision, session: next });
      return { status: 'completed' as const, ...applied };
    },
  };
}

export type RecipeCookActions = ReturnType<typeof createRecipeCookActions>;
export { rowToSession as parseRecipeCookSessionRow };
