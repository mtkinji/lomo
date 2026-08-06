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
  return {
    ...value,
    horizon: parseHorizon(value.horizon),
    candidates,
    entries: value.entries.map((entry) => ({ ...entry, recipeSnapshot: cloneSnapshot(entry.recipeSnapshot) })),
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
    selected: Array<{ candidateId: string; servings: number | null; placementDate: string | null }>;
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
  const entries = input.selected.map((selection, index): MealPlanEntry => {
    const candidate = candidateById.get(selection.candidateId);
    if (!candidate) throw new MealPlanContractError('meal_plan.candidate_invalid', 'Selected candidate no longer exists.');
    if (selection.servings !== null && (!Number.isFinite(selection.servings) || selection.servings <= 0)) {
      throw new MealPlanContractError('meal_plan.servings_invalid', 'Servings must be positive when supplied.');
    }
    if (selection.placementDate) assertDate(selection.placementDate, 'placementDate');
    return {
      id: `${plan.id}:entry:${index + 1}`,
      candidateId: candidate.id,
      kind: candidate.kind,
      recipeSnapshot: cloneSnapshot(candidate.recipeSnapshot),
      title: candidate.title,
      servings: selection.servings,
      placementDate: selection.placementDate,
    };
  });
  const now = new Date(input.now).toISOString();
  return {
    ...plan,
    version: plan.version + 1,
    status: 'finalized',
    entries,
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
