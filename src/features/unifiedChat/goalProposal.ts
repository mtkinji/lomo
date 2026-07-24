import type { Goal } from '../../domain/types';

export type GoalMutationPatch = {
  title?: string;
  description?: string | null;
  arcId?: string | null;
  status?: Goal['status'];
  priority?: 1 | 2 | 3 | null;
  targetDate?: string | null;
};

export type GoalProposalOperation = {
  type: 'update_goal'; targetId: string; expectedUpdatedAt: string; payload: GoalMutationPatch;
} | {
  type: 'create_goal'; targetId: null; expectedUpdatedAt: null;
  payload: GoalCreateInput;
} | {
  type: 'delete_goal'; targetId: string; expectedUpdatedAt: string; payload: Record<string, never>;
};

export type GoalCreateInput = {
  title: string;
  description?: string;
  arcId?: string | null;
  status?: Goal['status'];
  priority?: 1 | 2 | 3;
  targetDate?: string;
};

export function parseGoalCreateInput(value: unknown): GoalCreateInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const allowed = new Set(['title', 'description', 'arcId', 'status', 'priority', 'targetDate']);
  if (Object.keys(input).some((key) => !allowed.has(key))) return null;
  if (typeof input.title !== 'string' || !input.title.trim() || input.title.trim().length > 240) return null;
  const parsedPatch = parseGoalMutationPatch({
    ...input,
    title: input.title,
  });
  if (!parsedPatch) return null;
  return {
    title: parsedPatch.title as string,
    ...(typeof parsedPatch.description === 'string' ? { description: parsedPatch.description } : {}),
    ...('arcId' in parsedPatch ? { arcId: parsedPatch.arcId } : {}),
    ...(parsedPatch.status ? { status: parsedPatch.status } : {}),
    ...(parsedPatch.priority ? { priority: parsedPatch.priority } : {}),
    ...(typeof parsedPatch.targetDate === 'string' ? { targetDate: parsedPatch.targetDate } : {}),
  };
}

export function parseGoalMutationPatch(value: unknown): GoalMutationPatch | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const allowed = new Set(['title', 'description', 'arcId', 'status', 'priority', 'targetDate']);
  if (Object.keys(input).length === 0 || Object.keys(input).some((key) => !allowed.has(key))) return null;
  const patch: GoalMutationPatch = {};
  if ('title' in input) {
    if (typeof input.title !== 'string' || !input.title.trim() || input.title.trim().length > 240) return null;
    patch.title = input.title.trim();
  }
  if ('description' in input) {
    if (input.description !== null && (typeof input.description !== 'string' || input.description.length > 5_000)) return null;
    patch.description = input.description as string | null;
  }
  if ('arcId' in input) {
    if (input.arcId !== null && (typeof input.arcId !== 'string' || !input.arcId || input.arcId.length > 200)) return null;
    patch.arcId = input.arcId as string | null;
  }
  if ('status' in input) {
    if (!['planned', 'in_progress', 'completed', 'archived'].includes(input.status as string)) return null;
    patch.status = input.status as Goal['status'];
  }
  if ('priority' in input) {
    if (input.priority !== null && input.priority !== 1 && input.priority !== 2 && input.priority !== 3) return null;
    patch.priority = input.priority as 1 | 2 | 3 | null;
  }
  if ('targetDate' in input) {
    if (input.targetDate !== null &&
        (typeof input.targetDate !== 'string' || !Number.isFinite(Date.parse(input.targetDate)))) return null;
    patch.targetDate = input.targetDate as string | null;
  }
  return patch;
}
