export type PlannedRecipeSnapshot = {
  recipeId: string;
  recipeVersionId: string;
  recipeVersion: number;
  title: string;
  yieldQuantity: number | null;
  yieldUnit: string | null;
  ownerPersonId: string;
  sourceType: 'manual' | 'url' | 'photo' | 'scan' | 'text' | 'voice' | 'email' | 'copy' | 'catalog';
  sourceAttribution: string | null;
  media: {
    assetId: string;
    storageRef: string;
    mediaType: string;
    rightsBasis: 'user_authored' | 'private_user_import' | 'authorized' | 'licensed' | 'public_domain' | 'kwilt_authored';
    attribution: string | null;
    altText: string | null;
  } | null;
};

export type MealPlanHorizon =
  | { kind: 'next_shop'; shopBy: string | null }
  | { kind: 'meal_count'; count: number }
  | { kind: 'date_range'; startsOn: string; endsOn: string }
  | { kind: 'open' };

export type MealPeriod = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type MealTimingIntent =
  | { kind: 'flexible' }
  | { kind: 'occasion'; date: string; mealPeriod: MealPeriod }
  | { kind: 'coverage'; dates: string[]; mealPeriod: MealPeriod; label: string };

export type MealCandidate = {
  id: string;
  kind: 'recipe' | 'meal_note';
  recipeSnapshot: PlannedRecipeSnapshot | null;
  title: string;
  suggestedByPersonId: string;
};

export type MealPlanEntry = {
  id: string;
  candidateId: string;
  kind: MealCandidate['kind'];
  recipeSnapshot: PlannedRecipeSnapshot | null;
  title: string;
  servings: number | null;
  placementDate: string | null;
  occasionId: string | null;
  dinerPersonIds: string[];
};

export type MealPlanDish = {
  id: string;
  candidateId: string;
  kind: MealCandidate['kind'];
  recipeSnapshot: PlannedRecipeSnapshot | null;
  title: string;
  dinerPersonIds: string[];
  servings: number | null;
};

export type MealPlanOccasion = {
  id: string;
  title: string | null;
  placementDate: string | null;
  timing: MealTimingIntent;
  dishes: MealPlanDish[];
  notEatingPersonIds?: string[];
};

export type MealChoiceRound = {
  id: string;
  version: number;
  state: 'open' | 'closed';
  invitedPersonIds: string[];
  openedAt: string;
  closedAt: string | null;
};

export type MealPlanAiProposal = {
  id: string;
  planId: string;
  expectedPlanVersion: number;
  evidence: Array<{
    capabilityId: string;
    objectId: string;
    authority: 'authoritative' | 'derived' | 'user_supplied';
    authorized: boolean;
  }>;
  candidateIds: string[];
  explanation: string;
};

export type MealPlan = {
  id: string;
  ownerPersonId: string;
  version: number;
  status: 'draft' | 'finalized';
  horizon: MealPlanHorizon;
  candidates: MealCandidate[];
  entries: MealPlanEntry[];
  occasions: MealPlanOccasion[];
  choiceRound: MealChoiceRound | null;
  aiProposals: MealPlanAiProposal[];
  finalization: { idempotencyKey: string; contentHash: string } | null;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export class MealPlanContractError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly recoveryChoices: string[] = [],
  ) {
    super(message);
    this.name = 'MealPlanContractError';
  }
}

function assertDate(value: string, label: string): void {
  if (!Number.isFinite(Date.parse(value))) throw new MealPlanContractError('meal_plan.date_invalid', `${label} is invalid.`);
}

function parseHorizon(value: MealPlanHorizon): MealPlanHorizon {
  if (!value || typeof value !== 'object') throw new MealPlanContractError('meal_plan.horizon_invalid', 'Planning horizon is required.');
  if (value.kind === 'next_shop') {
    if (value.shopBy !== null) assertDate(value.shopBy, 'shopBy');
    return { ...value };
  }
  if (value.kind === 'meal_count') {
    if (!Number.isInteger(value.count) || value.count < 1 || value.count > 60) {
      throw new MealPlanContractError('meal_plan.horizon_invalid', 'Meal-count horizon must be between 1 and 60.');
    }
    return { ...value };
  }
  if (value.kind === 'date_range') {
    assertDate(value.startsOn, 'startsOn');
    assertDate(value.endsOn, 'endsOn');
    if (value.endsOn < value.startsOn) throw new MealPlanContractError('meal_plan.horizon_invalid', 'Date range ends before it starts.');
    return { ...value };
  }
  if (value.kind === 'open') return { kind: 'open' };
  throw new MealPlanContractError('meal_plan.horizon_invalid', 'Unsupported planning horizon.');
}

function cloneSnapshot(snapshot: PlannedRecipeSnapshot | null): PlannedRecipeSnapshot | null {
  return snapshot ? { ...snapshot, media: snapshot.media ? { ...snapshot.media } : null } : null;
}

function validateCandidate(candidate: MealCandidate, planId: string): MealCandidate {
  if (!candidate.id || !candidate.title.trim() || !candidate.suggestedByPersonId) {
    throw new MealPlanContractError('meal_plan.candidate_invalid', 'Candidate identity, title, and suggester are required.');
  }
  if (candidate.kind === 'recipe' && !candidate.recipeSnapshot) {
    throw new MealPlanContractError('meal_plan.recipe_snapshot_required', 'Recipe candidates require an immutable snapshot.');
  }
  if (candidate.kind === 'meal_note' && candidate.recipeSnapshot) {
    throw new MealPlanContractError('meal_plan.recipe_snapshot_invalid', 'Meal notes cannot carry Recipe authority.');
  }
  if (candidate.recipeSnapshot && (
    candidate.recipeSnapshot.recipeVersion < 1 || !candidate.recipeSnapshot.recipeVersionId || !candidate.recipeSnapshot.recipeId
  )) throw new MealPlanContractError('meal_plan.recipe_snapshot_invalid', `Candidate ${candidate.id} has an invalid Recipe snapshot for ${planId}.`);
  if (candidate.recipeSnapshot && (!candidate.recipeSnapshot.sourceType || (candidate.recipeSnapshot.media && !candidate.recipeSnapshot.media.assetId))) {
    throw new MealPlanContractError('meal_plan.recipe_snapshot_invalid', `Candidate ${candidate.id} has incomplete display provenance.`);
  }
  return { ...candidate, recipeSnapshot: cloneSnapshot(candidate.recipeSnapshot) };
}

function validateOccasions(
  occasions: readonly MealPlanOccasion[],
  candidateById: ReadonlyMap<string, MealCandidate>,
): MealPlanOccasion[] {
  const occasionIds = new Set<string>();
  const dishIds = new Set<string>();
  return occasions.map((occasion) => {
    if (!occasion.id || occasionIds.has(occasion.id)) {
      throw new MealPlanContractError('meal_plan.occasion_invalid', 'Meal occasion identities must be present and unique.');
    }
    occasionIds.add(occasion.id);
    if (occasion.placementDate) assertDate(occasion.placementDate, 'placementDate');
    if (!occasion.timing) throw new MealPlanContractError('meal_plan.timing_invalid', 'Meal timing is required.');
    if (!occasion.dishes.length) {
      throw new MealPlanContractError('meal_plan.occasion_invalid', 'A finalized meal occasion needs at least one dish.');
    }
    return {
      ...occasion,
      timing: occasion.timing.kind === 'coverage'
        ? { ...occasion.timing, dates: [...occasion.timing.dates] }
        : { ...occasion.timing },
      notEatingPersonIds: [...new Set(occasion.notEatingPersonIds ?? [])],
      dishes: occasion.dishes.map((dish) => {
        const candidate = candidateById.get(dish.candidateId);
        if (!dish.id || dishIds.has(dish.id) || !candidate) {
          throw new MealPlanContractError('meal_plan.dish_invalid', 'Meal dishes must be unique and reference a current candidate.');
        }
        dishIds.add(dish.id);
        if (new Set(dish.dinerPersonIds).size !== dish.dinerPersonIds.length || dish.dinerPersonIds.some((id) => !id)) {
          throw new MealPlanContractError('meal_plan.diners_invalid', 'Dish diners must be unique people.');
        }
        if (dish.servings !== null && (!Number.isFinite(dish.servings) || dish.servings <= 0)) {
          throw new MealPlanContractError('meal_plan.servings_invalid', 'Servings must be positive when supplied.');
        }
        return {
          id: dish.id,
          candidateId: candidate.id,
          kind: candidate.kind,
          recipeSnapshot: cloneSnapshot(candidate.recipeSnapshot),
          title: candidate.title,
          dinerPersonIds: [...dish.dinerPersonIds],
          servings: dish.servings,
        };
      }),
    };
  });
}

export function parseMealPlan(value: MealPlan): MealPlan {
  if (!value.id || !value.ownerPersonId || !Number.isInteger(value.version) || value.version < 1) {
    throw new MealPlanContractError('meal_plan.identity_invalid', 'Meal Plan identity, owner, and version are required.');
  }
  assertDate(value.createdAt, 'createdAt');
  assertDate(value.updatedAt, 'updatedAt');
  if (value.finalizedAt) assertDate(value.finalizedAt, 'finalizedAt');
  const candidates = value.candidates.map((candidate) => validateCandidate(candidate, value.id));
  const candidateIds = new Set(candidates.map((candidate) => candidate.id));
  if (candidateIds.size !== candidates.length) throw new MealPlanContractError('meal_plan.candidate_invalid', 'Candidate identities must be unique.');
  const aiProposals = value.aiProposals.map((proposal) => {
    if (proposal.planId !== value.id || proposal.expectedPlanVersion !== value.version ||
        proposal.evidence.length === 0 || proposal.evidence.some((evidence) => !evidence.authorized)) {
      throw new MealPlanContractError('meal_plan.ai_evidence_unauthorized', 'AI planning proposals require authorized evidence for the current plan version.');
    }
    if (proposal.candidateIds.some((id) => !candidateIds.has(id))) {
      throw new MealPlanContractError('meal_plan.candidate_invalid', 'AI proposal references an unknown candidate.');
    }
    return { ...proposal, evidence: proposal.evidence.map((evidence) => ({ ...evidence })), candidateIds: [...proposal.candidateIds] };
  });
  const entries = value.entries.map((entry) => ({
    ...entry,
    occasionId: entry.occasionId ?? null,
    dinerPersonIds: [...(entry.dinerPersonIds ?? [])],
    recipeSnapshot: cloneSnapshot(entry.recipeSnapshot),
  }));
  const suppliedOccasions = value.occasions ?? [];
  const legacyOccasions: MealPlanOccasion[] = value.status === 'finalized' && !suppliedOccasions.length
    ? entries.map((entry) => ({
      id: entry.occasionId ?? `${value.id}:occasion:${entry.id}`,
      title: null,
      placementDate: entry.placementDate,
      timing: entry.placementDate
        ? { kind: 'occasion', date: entry.placementDate, mealPeriod: 'dinner' }
        : { kind: 'flexible' },
      dishes: [{
        id: entry.id,
        candidateId: entry.candidateId,
        kind: entry.kind,
        recipeSnapshot: cloneSnapshot(entry.recipeSnapshot),
        title: entry.title,
        dinerPersonIds: [...entry.dinerPersonIds],
        servings: entry.servings,
      }],
      notEatingPersonIds: [],
    }))
    : suppliedOccasions;
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  return {
    ...value,
    horizon: parseHorizon(value.horizon),
    candidates,
    entries,
    occasions: legacyOccasions.length ? validateOccasions(legacyOccasions, candidateById) : [],
    choiceRound: value.choiceRound ? { ...value.choiceRound, invitedPersonIds: [...value.choiceRound.invitedPersonIds] } : null,
    aiProposals,
  };
}

export function finalizeMealPlan(
  planInput: MealPlan,
  input: {
    expectedVersion: number;
    idempotencyKey: string;
    contentHash: string;
    selected?: Array<{ candidateId: string; servings: number | null; placementDate: string | null }>;
    occasions?: Array<{
      id: string;
      title: string | null;
      placementDate: string | null;
      timing: MealTimingIntent;
      dishes: Array<{ id: string; candidateId: string; dinerPersonIds: string[]; servings: number | null }>;
      notEatingPersonIds?: string[];
    }>;
    now: string;
  },
): MealPlan {
  const plan = parseMealPlan(planInput);
  if (!input.idempotencyKey.trim() || !input.contentHash.trim()) {
    throw new MealPlanContractError('meal_plan.idempotency_invalid', 'Finalization identity is required.');
  }
  if (plan.status === 'finalized' && plan.finalization?.idempotencyKey === input.idempotencyKey) {
    if (plan.finalization.contentHash === input.contentHash) return plan;
    throw new MealPlanContractError(
      'meal_plan.idempotency_conflict',
      'This finalization key was already used for different choices.',
      ['review_current_plan', 'start_new_draft'],
    );
  }
  if (plan.status !== 'draft' || plan.version !== input.expectedVersion) {
    throw new MealPlanContractError(
      'meal_plan.version_conflict',
      'Meal Plan is no longer the reviewed draft.',
      ['review_current_plan', 'start_new_draft'],
    );
  }
  const candidateById = new Map(plan.candidates.map((candidate) => [candidate.id, candidate]));
  const requestedOccasions: MealPlanOccasion[] = input.occasions?.map((occasion) => ({
    ...occasion,
    dishes: occasion.dishes.map((dish) => {
      const candidate = candidateById.get(dish.candidateId);
      return {
        ...dish,
        kind: candidate?.kind ?? 'meal_note',
        recipeSnapshot: cloneSnapshot(candidate?.recipeSnapshot ?? null),
        title: candidate?.title ?? '',
      };
    }),
  })) ?? (input.selected ?? []).map((selection, index) => {
    const candidate = candidateById.get(selection.candidateId);
    return {
      id: `${plan.id}:occasion:${index + 1}`,
      title: null,
      placementDate: selection.placementDate,
      timing: selection.placementDate
        ? { kind: 'occasion' as const, date: selection.placementDate, mealPeriod: 'dinner' as const }
        : { kind: 'flexible' as const },
      dishes: [{
        id: `${plan.id}:entry:${index + 1}`,
        candidateId: selection.candidateId,
        kind: candidate?.kind ?? 'meal_note',
        recipeSnapshot: cloneSnapshot(candidate?.recipeSnapshot ?? null),
        title: candidate?.title ?? '',
        dinerPersonIds: [],
        servings: selection.servings,
      }],
      notEatingPersonIds: [],
    };
  });
  const occasions = validateOccasions(requestedOccasions, candidateById);
  const entries = occasions.flatMap((occasion) => occasion.dishes.map((dish): MealPlanEntry => ({
    id: dish.id,
    candidateId: dish.candidateId,
    kind: dish.kind,
    recipeSnapshot: cloneSnapshot(dish.recipeSnapshot),
    title: dish.title,
    servings: dish.servings,
    placementDate: occasion.placementDate,
    occasionId: occasion.id,
    dinerPersonIds: [...dish.dinerPersonIds],
  })));
  const now = new Date(input.now).toISOString();
  return {
    ...plan,
    version: plan.version + 1,
    status: 'finalized',
    entries,
    occasions,
    aiProposals: [],
    finalization: { idempotencyKey: input.idempotencyKey, contentHash: input.contentHash },
    finalizedAt: now,
    updatedAt: now,
  };
}

export function reviseFinalizedMealPlan(planInput: MealPlan, input: { now: string }): MealPlan {
  const plan = parseMealPlan(planInput);
  if (plan.status !== 'finalized') throw new MealPlanContractError('meal_plan.state_invalid', 'Only a finalized plan can be revised.');
  const now = new Date(input.now).toISOString();
  return { ...plan, version: plan.version + 1, status: 'draft', finalization: null, finalizedAt: null, updatedAt: now };
}

export function isGroceryProjectionStale(
  projection: { mealPlanId: string; mealPlanVersion: number },
  plan: MealPlan,
): boolean {
  return projection.mealPlanId !== plan.id || projection.mealPlanVersion !== plan.version || plan.status !== 'finalized';
}

export function summarizeChoiceResponses(
  responses: Array<{ participantPersonId: string; candidateIds: string[]; passed: boolean; privateNote: string | null }>,
  input: { authorizedOrganizerPersonId: string },
): { responseCount: number; passCount: number; candidatePickCounts: Record<string, number> } {
  if (!input.authorizedOrganizerPersonId) throw new MealPlanContractError('meal_plan.organizer_required', 'Organizer authorization is required.');
  const candidatePickCounts: Record<string, number> = {};
  for (const response of responses) {
    for (const candidateId of new Set(response.candidateIds)) {
      candidatePickCounts[candidateId] = (candidatePickCounts[candidateId] ?? 0) + 1;
    }
  }
  return {
    responseCount: responses.length,
    passCount: responses.filter((response) => response.passed).length,
    candidatePickCounts,
  };
}
