import type {
  MealPlanCandidateDraft,
  MealPlanProjection,
} from '../../meal-planning/data/mealPlanningRepository';
import type { RecipeProjection } from '../data/recipeCache';
import { buildMealPlanRecipeCandidate, mealPlanContainsRecipeVersion } from './mealPlanRecipeCandidate';

type MealPlanSelectionRepository = {
  create(input: {
    householdId: string;
    horizon: { kind: 'open' };
    candidates: MealPlanCandidateDraft[];
  }): Promise<unknown> | unknown;
  revise(planId: string, expectedVersion: number): Promise<unknown> | unknown;
  update(input: {
    planId: string;
    expectedVersion: number;
    candidates: MealPlanCandidateDraft[];
  }): Promise<unknown> | unknown;
};

type ToggleRecipeInMealPlanInput = {
  plan: MealPlanProjection | null;
  projection: RecipeProjection;
  servings: number;
  candidateId: string;
  repository: MealPlanSelectionRepository;
  reloadPlan(): Promise<MealPlanProjection | null>;
  resolveHouseholdId(): Promise<string>;
};

function selectedCandidatesForPlan(plan: MealPlanProjection): MealPlanCandidateDraft[] {
  if (plan.state !== 'finalized') return plan.candidates;
  const selectedCandidateIds = new Set(plan.entries.map((entry) => entry.candidateId));
  return plan.candidates.filter((candidate) => selectedCandidateIds.has(candidate.id));
}

export function mealPlanContainsSelectedRecipeVersion(
  plan: MealPlanProjection,
  projection: RecipeProjection,
): boolean {
  return mealPlanContainsRecipeVersion(selectedCandidatesForPlan(plan), projection);
}

async function requireReloadedPlan(
  reloadPlan: ToggleRecipeInMealPlanInput['reloadPlan'],
  expectedState?: MealPlanProjection['state'],
): Promise<MealPlanProjection> {
  const plan = await reloadPlan();
  if (!plan) throw new Error('The Meal Plan could not be reloaded.');
  if (expectedState && plan.state !== expectedState) {
    throw new Error('The Meal Plan changed before this meal could be updated.');
  }
  return plan;
}

async function ensureDraftPlan({
  plan,
  repository,
  reloadPlan,
}: {
  plan: MealPlanProjection;
  repository: Pick<MealPlanSelectionRepository, 'revise'>;
  reloadPlan(): Promise<MealPlanProjection | null>;
}): Promise<MealPlanProjection> {
  let editablePlan = plan;
  if (plan.state === 'finalized') {
    await repository.revise(plan.id, plan.version);
    editablePlan = await requireReloadedPlan(reloadPlan, 'draft');
  }

  if (editablePlan.state !== 'draft') {
    throw new Error('Family choices are underway. Open the Plan to review them before changing meals.');
  }
  return editablePlan;
}

/**
 * Applies the one-tap meal-card contract.
 *
 * Planning is activated by the selection itself. A finalized plan is revised
 * before mutation so a checked card remains a truthful, reversible control.
 */
export async function toggleRecipeInMealPlan({
  plan,
  projection,
  servings,
  candidateId,
  repository,
  reloadPlan,
  resolveHouseholdId,
}: ToggleRecipeInMealPlanInput): Promise<{ plan: MealPlanProjection; selected: boolean }> {
  const candidate = buildMealPlanRecipeCandidate(projection, { candidateId, servings });

  if (!plan) {
    const householdId = await resolveHouseholdId();
    await repository.create({ householdId, horizon: { kind: 'open' }, candidates: [candidate] });
    return { plan: await requireReloadedPlan(reloadPlan), selected: true };
  }

  const wasSelected = mealPlanContainsSelectedRecipeVersion(plan, projection);
  const selectedCandidateIds = new Set(selectedCandidatesForPlan(plan).map((current) => current.id));
  const editablePlan = await ensureDraftPlan({ plan, repository, reloadPlan });
  const baseCandidates = plan.state === 'finalized'
    ? editablePlan.candidates.filter((current) => selectedCandidateIds.has(current.id))
    : editablePlan.candidates;
  const existingCandidate = editablePlan.candidates.find(
    (current) => current.recipeSnapshot?.recipeVersionId === projection.currentVersion.id,
  );
  const candidates = wasSelected
    ? baseCandidates.filter(
      (current) => current.recipeSnapshot?.recipeVersionId !== projection.currentVersion.id,
    )
    : [...baseCandidates, existingCandidate ?? candidate];

  await repository.update({
    planId: editablePlan.id,
    expectedVersion: editablePlan.version,
    candidates,
  });

  return {
    plan: await requireReloadedPlan(reloadPlan),
    selected: !wasSelected,
  };
}

export async function removeCandidateFromMealPlan({
  plan,
  candidateId,
  repository,
  reloadPlan,
}: {
  plan: MealPlanProjection;
  candidateId: string;
  repository: Pick<MealPlanSelectionRepository, 'revise' | 'update'>;
  reloadPlan(): Promise<MealPlanProjection | null>;
}): Promise<MealPlanProjection> {
  const selectedCandidateIds = new Set(selectedCandidatesForPlan(plan).map((candidate) => candidate.id));
  const editablePlan = await ensureDraftPlan({ plan, repository, reloadPlan });
  const baseCandidates = plan.state === 'finalized'
    ? editablePlan.candidates.filter((candidate) => selectedCandidateIds.has(candidate.id))
    : editablePlan.candidates;
  await repository.update({
    planId: editablePlan.id,
    expectedVersion: editablePlan.version,
    candidates: baseCandidates.filter((candidate) => candidate.id !== candidateId),
  });
  return requireReloadedPlan(reloadPlan);
}
