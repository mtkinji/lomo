import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { validateMealChoiceResponse } from '../domain/mealChoiceAggregate';
import { validateMealPlanHorizon } from '../domain/mealPlanLifecycle';
import type { MealPeriod, MealPlanHorizon, MealTimingIntent } from '../domain/mealPlanContracts';
import { aggregateMealChoices } from '../domain/mealChoiceAggregate';
import { stableContentHash } from '@kwilt/food-core';
import { parseSharedMealCartProjection, type PlanReaction, type SharedMealCartProjection } from '../domain/sharedMealCart';

let mealPlanningSubscriptionSequence = 0;

function nextMealPlanningSubscriptionTopic(): string {
  mealPlanningSubscriptionSequence += 1;
  return `meal-planning-invalidation:${Date.now().toString(36)}:${mealPlanningSubscriptionSequence.toString(36)}`;
}

export type MealPlanCandidateDraft = {
  id: string;
  kind: 'recipe' | 'meal_note';
  title: string;
  recipeSnapshot: Record<string, unknown> | null;
  lifecycle?: 'idea' | 'sent' | 'made' | 'removed';
  createdAt?: string;
  sentAt?: string | null;
};

export type MealPlanProjection = {
  id: string;
  organizerPersonId?: string;
  householdId: string | null;
  version: number;
  state: 'draft' | 'collecting_choices' | 'ready_to_finalize' | 'finalized' | 'archived';
  horizon: MealPlanHorizon;
  candidates: MealPlanCandidateDraft[];
  entries: Array<{ id: string; candidateId: string; title: string; servings: number | null; placementDate: string | null; occasionId: string | null; dinerPersonIds: string[]; recipeSnapshot?: Record<string, unknown> | null }>;
  occasions: Array<{
    id: string;
    title: string | null;
    placementDate: string | null;
    timing: MealTimingIntent;
    notEatingPersonIds: string[];
    dishes: Array<{ id: string; candidateId: string; title: string; servings: number | null; dinerPersonIds: string[]; recipeSnapshot?: Record<string, unknown> | null }>;
  }>;
  activeRound: { id: string; version: number; state: 'open' | 'closed' | 'cancelled'; closesAt: string | null } | null;
  updatedAt: string;
};

export type GuestMealFeedbackSummary = {
  candidates: Array<{ id: string; title: string }>;
  invites: Array<{
    id: string;
    state: 'active' | 'expired' | 'revoked';
    expiresAt: string;
    responseCount: number;
    responses: Array<{
      id: string;
      displayName: string | null;
      selectedCandidateIds: string[];
      pass: boolean;
      suggestion: string | null;
      updatedAt: string;
    }>;
  }>;
};

type VersionedMealPlanRow = {
  plan_version?: unknown;
  position?: unknown;
  occasion_id?: unknown;
  [key: string]: unknown;
};

function mealPeriod(value: unknown): MealPeriod {
  return value === 'breakfast' || value === 'lunch' || value === 'dinner' || value === 'snack' ? value : 'dinner';
}

async function rpc(client: SupabaseClient, name: string, args: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(error.message);
  return data;
}

export function mapMealPlanRow(row: any): MealPlanProjection {
  if (!row || typeof row.id !== 'string' || !Number.isInteger(row.version)) throw new Error('Invalid Meal Plan projection.');
  const candidates = Array.isArray(row.candidates) ? [...row.candidates].sort((a, b) => Number(a.position) - Number(b.position)) : [];
  const allEntries: VersionedMealPlanRow[] = Array.isArray(row.entries) ? row.entries : [];
  const allOccasions: VersionedMealPlanRow[] = Array.isArray(row.occasions) ? row.occasions : [];
  const snapshotVersions = [...allEntries, ...allOccasions]
    .map((item) => Number(item.plan_version))
    .filter(Number.isInteger);
  const snapshotVersion = snapshotVersions.length ? Math.max(...snapshotVersions) : null;
  const entries = allEntries.filter((entry) => snapshotVersion === null || Number(entry.plan_version) === snapshotVersion).sort((a, b) => Number(a.position) - Number(b.position));
  const occasions = allOccasions.filter((occasion) => snapshotVersion === null || Number(occasion.plan_version) === snapshotVersion).sort((a, b) => Number(a.position) - Number(b.position));
  const rounds = Array.isArray(row.rounds) ? [...row.rounds].sort((a, b) => String(b.opened_at).localeCompare(String(a.opened_at))) : [];
  return {
    id: row.id, householdId: typeof row.household_id === 'string' ? row.household_id : null, version: row.version, state: row.state,
    horizon: validateMealPlanHorizon(row.horizon),
    organizerPersonId: String(row.organizer_person_id),
    candidates: candidates.map((candidate: any) => ({
      id: candidate.id,
      kind: candidate.kind,
      title: candidate.title,
      recipeSnapshot: candidate.recipe_snapshot ?? null,
      lifecycle: candidate.lifecycle_state ?? 'idea',
      createdAt: candidate.created_at ?? row.updated_at,
      sentAt: candidate.sent_at ?? null,
    })),
    entries: entries.map((entry) => ({ id: String(entry.id), candidateId: String(entry.candidate_id), title: String(entry.title), servings: entry.servings === null ? null : Number(entry.servings), placementDate: typeof entry.placement_date === 'string' ? entry.placement_date : null, occasionId: typeof entry.occasion_id === 'string' ? entry.occasion_id : null, dinerPersonIds: Array.isArray(entry.diner_person_ids) ? entry.diner_person_ids.filter((id): id is string => typeof id === 'string') : [], recipeSnapshot: entry.recipe_snapshot && typeof entry.recipe_snapshot === 'object' ? entry.recipe_snapshot as Record<string, unknown> : null })),
    occasions: occasions.length ? occasions.map((occasion) => ({
      id: String(occasion.id),
      title: typeof occasion.title === 'string' ? occasion.title : null,
      placementDate: typeof occasion.placement_date === 'string' ? occasion.placement_date : null,
      timing: occasion.timing_kind === 'coverage'
        ? {
          kind: 'coverage',
          dates: Array.isArray(occasion.coverage_dates) ? occasion.coverage_dates.filter((date): date is string => typeof date === 'string') : [],
          mealPeriod: mealPeriod(occasion.meal_period),
          label: typeof occasion.coverage_label === 'string' ? occasion.coverage_label : String(occasion.title ?? ''),
        }
        : occasion.timing_kind === 'occasion' || typeof occasion.placement_date === 'string'
          ? { kind: 'occasion', date: String(occasion.placement_date), mealPeriod: mealPeriod(occasion.meal_period) }
          : { kind: 'flexible' },
      notEatingPersonIds: Array.isArray(occasion.not_eating_person_ids) ? occasion.not_eating_person_ids.filter((id): id is string => typeof id === 'string') : [],
      dishes: entries.filter((entry) => entry.occasion_id === occasion.id).map((entry) => ({
        id: String(entry.id),
        candidateId: String(entry.candidate_id),
        title: String(entry.title),
        servings: entry.servings === null ? null : Number(entry.servings),
        dinerPersonIds: Array.isArray(entry.diner_person_ids) ? entry.diner_person_ids.filter((id): id is string => typeof id === 'string') : [],
        recipeSnapshot: entry.recipe_snapshot && typeof entry.recipe_snapshot === 'object' ? entry.recipe_snapshot as Record<string, unknown> : null,
      })),
    })) : entries.map((entry) => ({
      id: `legacy:${entry.id}`,
      title: null,
      placementDate: typeof entry.placement_date === 'string' ? entry.placement_date : null,
      timing: typeof entry.placement_date === 'string'
        ? { kind: 'occasion', date: entry.placement_date, mealPeriod: 'dinner' }
        : { kind: 'flexible' },
      notEatingPersonIds: [],
      dishes: [{ id: String(entry.id), candidateId: String(entry.candidate_id), title: String(entry.title), servings: entry.servings === null ? null : Number(entry.servings), dinerPersonIds: Array.isArray(entry.diner_person_ids) ? entry.diner_person_ids.filter((id): id is string => typeof id === 'string') : [], recipeSnapshot: entry.recipe_snapshot && typeof entry.recipe_snapshot === 'object' ? entry.recipe_snapshot as Record<string, unknown> : null }],
    })),
    activeRound: rounds[0] ? { id: rounds[0].id, version: rounds[0].version, state: rounds[0].state, closesAt: rounds[0].closes_at ?? null } : null,
    updatedAt: row.updated_at,
  };
}

export function projectPersonalMealPlanCart(plan: MealPlanProjection): SharedMealCartProjection {
  if (plan.householdId !== null) throw new Error('Expected a person-owned Meal Plan.');
  if (!plan.organizerPersonId) throw new Error('The person-owned Meal Plan is missing its organizer.');
  const organizerPersonId = plan.organizerPersonId;
  const activeCandidates = plan.candidates.filter((candidate) => candidate.lifecycle !== 'removed' && candidate.lifecycle !== 'made');
  return {
    planId: plan.id,
    householdId: null,
    version: plan.version,
    state: plan.state === 'draft' ? 'draft' : 'finalized',
    activeCount: activeCandidates.length,
    groceryListId: null,
    viewer: {
      personId: organizerPersonId,
      role: 'organizer',
      canAdd: plan.state === 'draft',
      canManage: true,
    },
    candidates: activeCandidates.map((candidate, position) => ({
      id: candidate.id,
      kind: candidate.kind,
      title: candidate.title,
      recipeSnapshot: candidate.recipeSnapshot,
      position,
      createdAt: candidate.createdAt ?? plan.updatedAt,
      lifecycle: candidate.lifecycle === 'sent' ? 'sent' : 'idea',
      sentAt: candidate.sentAt ?? null,
      missingItemCount: null,
      voteCount: 0,
      downvoteCount: 0,
      hardPassCount: 0,
      requiresHardPassReview: false,
      reactionCounts: { thumbs_up: 0, heart: 0, yum: 0, excited: 0, fire: 0 },
      contributor: { personId: organizerPersonId, displayName: 'You', avatarUrl: null },
      supporters: [],
      viewerReaction: null,
      viewerReactionReason: null,
      canReact: false,
      canRemove: true,
      canMarkMade: candidate.lifecycle === 'sent',
    })),
  };
}

export function createMealPlanningRepository(client: SupabaseClient = getSupabaseClient()) {
  const listPlans = async (): Promise<MealPlanProjection[]> => {
    const { data, error } = await client.from('kwilt_meal_plans').select('*,candidates:kwilt_meal_plan_candidates(*),entries:kwilt_meal_plan_entries(*),occasions:kwilt_meal_plan_occasions(*),rounds:kwilt_meal_choice_rounds(*)').order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapMealPlanRow);
  };
  return {
    async getSharedCart(householdId: string): Promise<SharedMealCartProjection> {
      const projection = parseSharedMealCartProjection(await rpc(client, 'get_kwilt_shared_meal_cart', { p_household_id: householdId }));
      if (!projection) throw new Error('The shared Meal Cart is unavailable.');
      return projection;
    },
    addSharedCandidate(householdId: string, candidate: MealPlanCandidateDraft) {
      return rpc(client, 'add_kwilt_shared_meal_candidate', {
        p_household_id: householdId,
        p_candidate_id: candidate.id,
        p_candidate: candidate,
      });
    },
    async getMealCart(householdId: string | null): Promise<SharedMealCartProjection | null> {
      if (householdId) {
        const projection = parseSharedMealCartProjection(await rpc(client, 'get_kwilt_shared_meal_cart', { p_household_id: householdId }));
        if (!projection) throw new Error('The shared Meal Cart is unavailable.');
        return projection;
      }
      const plan = (await listPlans()).find((candidate) => candidate.householdId === null && candidate.state === 'draft');
      return plan ? projectPersonalMealPlanCart(plan) : null;
    },
    async addMealCandidate(householdId: string | null, candidate: MealPlanCandidateDraft) {
      if (householdId) {
        return rpc(client, 'add_kwilt_shared_meal_candidate', {
          p_household_id: householdId,
          p_candidate_id: candidate.id,
          p_candidate: candidate,
        });
      }
      const plan = (await listPlans()).find((candidatePlan) => candidatePlan.householdId === null && candidatePlan.state === 'draft');
      if (!plan) {
        return rpc(client, 'create_kwilt_meal_plan', {
          p_household_id: null,
          p_horizon: { kind: 'open' },
          p_candidate_snapshots: [candidate],
        });
      }
      return rpc(client, 'update_kwilt_meal_plan', {
        p_plan_id: plan.id,
        p_expected_version: plan.version,
        p_patch: { candidates: [...plan.candidates, candidate] },
      });
    },
    async withdrawMealCandidate(householdId: string | null, candidateId: string) {
      if (householdId) return rpc(client, 'withdraw_kwilt_shared_meal_candidate', { p_candidate_id: candidateId });
      const plan = (await listPlans()).find((candidatePlan) =>
        candidatePlan.householdId === null &&
        candidatePlan.state === 'draft' &&
        candidatePlan.candidates.some((candidate) => candidate.id === candidateId),
      );
      if (!plan) throw new Error('The meal is no longer in Plan.');
      return rpc(client, 'update_kwilt_meal_plan', {
        p_plan_id: plan.id,
        p_expected_version: plan.version,
        p_patch: { candidates: plan.candidates.filter((candidate) => candidate.id !== candidateId) },
      });
    },
    withdrawSharedCandidate(candidateId: string) {
      return rpc(client, 'withdraw_kwilt_shared_meal_candidate', { p_candidate_id: candidateId });
    },
    setSharedReaction(candidateId: string, reaction: PlanReaction | null, reason: string | null = null) {
      return rpc(client, 'set_kwilt_shared_meal_reaction', {
        p_candidate_id: candidateId,
        p_reaction: reaction,
        ...(reason === null ? {} : { p_reason: reason }),
      });
    },
    async sendSharedCandidates(
      planId: string,
      expectedVersion: number,
      candidateIds: string[],
      options?: { acknowledgeHardPasses?: boolean },
    ) {
      const { data, error } = await client.functions.invoke('grocery-compile', {
        body: {
          planAction: 'send',
          planId,
          expectedVersion,
          candidateIds,
          ...(options?.acknowledgeHardPasses ? { acknowledgeHardPasses: true } : {}),
        },
      });
      if (error) throw new Error(error.message);
      return (data as { receipt: { planId: string; version: number; groceryListId: string; revision: number } }).receipt;
    },
    async removeSentSharedCandidate(planId: string, expectedVersion: number, candidateId: string) {
      const { data, error } = await client.functions.invoke('grocery-compile', { body: { planAction: 'remove', planId, expectedVersion, candidateIds: [candidateId] } });
      if (error) throw new Error(error.message);
      return (data as { receipt: { planId: string; version: number; groceryListId: string; revision: number } }).receipt;
    },
    async returnSharedCandidateToPlan(planId: string, expectedVersion: number, candidateId: string) {
      const { data, error } = await client.functions.invoke('grocery-compile', { body: { planAction: 'return', planId, expectedVersion, candidateIds: [candidateId] } });
      if (error) throw new Error(error.message);
      return (data as { receipt: { planId: string; version: number; groceryListId: string; revision: number } }).receipt;
    },
    keepGroceriesAndRemoveSharedCandidate(candidateId: string, expectedVersion: number) {
      return rpc(client, 'remove_kwilt_sent_plan_candidate_keep_groceries', { p_candidate_id: candidateId, p_expected_version: expectedVersion });
    },
    markSharedCandidateMade(candidateId: string, expectedVersion: number) {
      return rpc(client, 'mark_kwilt_plan_candidate_made', { p_candidate_id: candidateId, p_expected_version: expectedVersion });
    },
    async list(): Promise<MealPlanProjection[]> {
      return listPlans();
    },
    create(input: { householdId?: string | null; horizon: MealPlanHorizon; candidates: MealPlanCandidateDraft[] }) {
      return rpc(client, 'create_kwilt_meal_plan', { p_household_id: input.householdId ?? null, p_horizon: validateMealPlanHorizon(input.horizon), p_candidate_snapshots: input.candidates });
    },
    attachToHousehold(input: { planId: string; expectedVersion: number; householdId: string }) {
      return rpc(client, 'attach_kwilt_meal_plan_to_household', {
        p_plan_id: input.planId,
        p_expected_version: input.expectedVersion,
        p_household_id: input.householdId,
      });
    },
    update(input: { planId: string; expectedVersion: number; horizon?: MealPlanHorizon; candidates?: MealPlanCandidateDraft[] }) {
      return rpc(client, 'update_kwilt_meal_plan', { p_plan_id: input.planId, p_expected_version: input.expectedVersion, p_patch: { ...(input.horizon ? { horizon: validateMealPlanHorizon(input.horizon) } : {}), ...(input.candidates ? { candidates: input.candidates } : {}) } });
    },
    openRound(input: { planId: string; expectedVersion: number; participantMembershipIds: string[]; closesAt: string | null }) {
      return rpc(client, 'open_kwilt_meal_choice_round', { p_plan_id: input.planId, p_expected_version: input.expectedVersion, p_participant_membership_ids: input.participantMembershipIds, p_closes_at: input.closesAt });
    },
    async createGuestFeedbackInvite(input: { planId: string; expectedVersion: number; expiresAt: string | null }): Promise<{ inviteId: string; token: string; expiresAt: string }> {
      return await rpc(client, 'create_kwilt_guest_meal_feedback_invite', {
        p_plan_id: input.planId,
        p_expected_version: input.expectedVersion,
        p_expires_at: input.expiresAt,
      }) as { inviteId: string; token: string; expiresAt: string };
    },
    revokeGuestFeedbackInvite(inviteId: string) {
      return rpc(client, 'revoke_kwilt_guest_meal_feedback_invite', { p_invite_id: inviteId });
    },
    async getGuestFeedbackSummary(planId: string): Promise<GuestMealFeedbackSummary> {
      return await rpc(client, 'get_kwilt_guest_meal_feedback_summary', { p_plan_id: planId }) as GuestMealFeedbackSummary;
    },
    projection(roundId: string) { return rpc(client, 'get_kwilt_meal_choice_projection', { p_round_id: roundId }); },
    submitResponse(input: { roundId: string; expectedRoundVersion: number; selectedCandidateIds: string[]; pass: boolean; suggestion: string | null; availableCandidateIds?: string[]; selectionLimit?: number }) {
      const response = validateMealChoiceResponse(input, { candidateIds: input.availableCandidateIds ?? input.selectedCandidateIds, limit: input.selectionLimit ?? 3 });
      return rpc(client, 'submit_kwilt_meal_choice_response', { p_round_id: input.roundId, p_expected_round_version: input.expectedRoundVersion, p_selected_candidate_ids: response.selectedCandidateIds, p_pass: response.pass, p_suggestion: response.suggestion });
    },
    withdraw(roundId: string, expectedRoundVersion: number) { return rpc(client, 'withdraw_kwilt_meal_choice_response', { p_round_id: roundId, p_expected_round_version: expectedRoundVersion }); },
    closeRound(roundId: string, expectedVersion: number) { return rpc(client, 'close_kwilt_meal_choice_round', { p_round_id: roundId, p_expected_version: expectedVersion }); },
    async aggregate(roundId: string): Promise<Array<{ candidateId: string; pickCount: number }>> {
      const [{ data: candidates, error: candidateError }, { data: responses, error: responseError }] = await Promise.all([
        client.from('kwilt_meal_choice_candidates').select('candidate_id,position').eq('round_id', roundId).order('position'),
        client.from('kwilt_meal_choice_responses').select('selected_candidate_ids,passed').eq('round_id', roundId).eq('state', 'submitted'),
      ]);
      if (candidateError || responseError) throw new Error(candidateError?.message ?? responseError?.message);
      return aggregateMealChoices({ candidateIds: (candidates ?? []).map((row) => row.candidate_id), responses: (responses ?? []).map((row) => ({ selectedCandidateIds: row.selected_candidate_ids, pass: row.passed })) });
    },
    finalize(input: {
      planId: string;
      expectedVersion: number;
      occasions: Array<{
        id: string;
        title: string | null;
        placementDate: string | null;
        timing: MealTimingIntent;
        notEatingPersonIds?: string[];
        dishes: Array<{ id: string; candidateId: string; dinerPersonIds: string[]; servings: number | null }>;
      }>;
      organizerNote: string | null;
    }) {
      const idempotencyKey = `finalize:${input.planId}:v${input.expectedVersion}`;
      const contentHash = stableContentHash({ occasions: input.occasions, organizerNote: input.organizerNote });
      return rpc(client, 'finalize_kwilt_meal_plan', {
        p_plan_id: input.planId,
        p_expected_version: input.expectedVersion,
        p_occasions: input.occasions,
        p_organizer_note: input.organizerNote,
        p_idempotency_key: idempotencyKey,
        p_content_hash: contentHash,
      });
    },
    revise(planId: string, expectedVersion: number) { return rpc(client, 'revise_kwilt_meal_plan', { p_plan_id: planId, p_expected_version: expectedVersion }); },
    subscribe(onInvalidate: () => void): () => void {
      const channel = client.channel(nextMealPlanningSubscriptionTopic())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kwilt_meal_plans' }, onInvalidate)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kwilt_meal_plan_candidates' }, onInvalidate)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kwilt_meal_candidate_reactions' }, onInvalidate)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kwilt_meal_plan_entries' }, onInvalidate)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kwilt_meal_plan_occasions' }, onInvalidate)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kwilt_grocery_lists' }, onInvalidate)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kwilt_grocery_items' }, onInvalidate)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kwilt_grocery_item_sources' }, onInvalidate)
        .subscribe();
      return () => { void client.removeChannel(channel); };
    },
  };
}

export type MealPlanningRepository = ReturnType<typeof createMealPlanningRepository>;
