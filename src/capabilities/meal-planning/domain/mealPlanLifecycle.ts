import type { MealPlanHorizon } from './mealPlanContracts';

export type MealPlanLifecycleState = 'draft' | 'collecting_choices' | 'ready_to_finalize' | 'finalized' | 'archived';
export type MealPlanLifecycleEvent = 'open_choices' | 'close_choices' | 'cancel_choices' | 'finalize' | 'revise' | 'archive';

export function validateMealPlanHorizon(horizon: MealPlanHorizon): MealPlanHorizon {
  if (horizon.kind === 'next_shop') {
    if (horizon.shopBy !== null && !/^\d{4}-\d{2}-\d{2}$/.test(horizon.shopBy)) throw new Error('Next-shop date is invalid.');
    return { ...horizon };
  }
  if (horizon.kind === 'meal_count') {
    if (!Number.isInteger(horizon.count) || horizon.count < 1 || horizon.count > 60) throw new Error('Meal count must be between 1 and 60.');
    return { ...horizon };
  }
  if (horizon.kind === 'date_range') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(horizon.startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(horizon.endsOn)) throw new Error('Date range is invalid.');
    if (horizon.endsOn < horizon.startsOn) throw new Error('Date range ends before it starts.');
    return { ...horizon };
  }
  if (horizon.kind === 'open') return { kind: 'open' };
  throw new Error('Planning horizon is unsupported.');
}

const transitions: Record<MealPlanLifecycleState, Partial<Record<MealPlanLifecycleEvent, MealPlanLifecycleState>>> = {
  draft: { open_choices: 'collecting_choices', finalize: 'finalized', archive: 'archived' },
  collecting_choices: { close_choices: 'ready_to_finalize', cancel_choices: 'draft', archive: 'archived' },
  ready_to_finalize: { finalize: 'finalized', open_choices: 'collecting_choices', archive: 'archived' },
  finalized: { revise: 'draft', archive: 'archived' },
  archived: {},
};

export function transitionMealPlan(state: MealPlanLifecycleState, event: MealPlanLifecycleEvent): MealPlanLifecycleState {
  const next = transitions[state][event];
  if (!next) throw new Error(`Meal Plan transition ${state} -> ${event} is not allowed.`);
  return next;
}

type DraftCandidate = {
  id: string;
  kind: 'recipe' | 'meal_note';
  title: string;
  recipeSnapshot: Record<string, unknown> | null;
};

export function addRecipeCandidateToDraft(
  plan: { id: string; version: number; state: MealPlanLifecycleState; candidates: DraftCandidate[] },
  candidate: DraftCandidate & { kind: 'recipe'; recipeSnapshot: Record<string, unknown> & { recipeId: string; recipeVersionId: string } },
): {
  outcome: 'added' | 'replayed' | 'needs_recovery';
  expectedVersion: number;
  candidates: DraftCandidate[];
  recoveryChoices: Array<'start_new_plan' | 'add_to_draft_copy'>;
  effectiveCandidateId: string;
} {
  if (plan.state !== 'draft') {
    return {
      outcome: 'needs_recovery',
      expectedVersion: plan.version,
      candidates: [...plan.candidates],
      recoveryChoices: ['start_new_plan', 'add_to_draft_copy'],
      effectiveCandidateId: candidate.id,
    };
  }
  const alreadyIncluded = plan.candidates.some(
    (current) => current.kind === 'recipe' && current.recipeSnapshot?.recipeVersionId === candidate.recipeSnapshot.recipeVersionId,
  );
  const existingCandidate=alreadyIncluded?plan.candidates.find((current)=>current.kind==='recipe'&&current.recipeSnapshot?.recipeVersionId===candidate.recipeSnapshot.recipeVersionId):null;
  return {
    outcome: alreadyIncluded ? 'replayed' : 'added',
    expectedVersion: plan.version,
    candidates: alreadyIncluded ? [...plan.candidates] : [...plan.candidates, candidate],
    recoveryChoices: [],
    effectiveCandidateId: existingCandidate?.id??candidate.id,
  };
}
