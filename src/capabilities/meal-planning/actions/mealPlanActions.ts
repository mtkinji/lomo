import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import type { MealPlanCandidateDraft } from '../data/mealPlanningRepository';
import { validateMealPlanHorizon } from '../domain/mealPlanLifecycle';
import type { MealPlanHorizon } from '../domain/mealPlanContracts';
import { validateMealChoiceResponse } from '../domain/mealChoiceAggregate';
import type { ReviewedMealPlanOccasion } from '../domain/mealPlanFinalization';

export type MealPlanActionOperation =
  | 'meal_planning.plan.create' | 'meal_planning.plan.update'
  | 'meal_planning.candidate.add' | 'meal_planning.candidate.remove'
  | 'meal_planning.round.open' | 'meal_planning.round.close'
  | 'meal_planning.response.submit' | 'meal_planning.response.withdraw'
  | 'meal_planning.plan.finalize' | 'meal_planning.plan.revise';
export type MealPlanActionReceipt = {
  planId?: string; roundId?: string; responseId?: string;
  version?: number; roundVersion?: number; planVersion?: number; state?: string;
  operationId: MealPlanActionOperation; replayed: boolean;
};
export type MealPlanActionBoundary = { apply(input: {
  operationId: MealPlanActionOperation; planId: string | null; expectedVersion: number;
  requestId: string; payload: Record<string, unknown>;
}): Promise<MealPlanActionReceipt> };

export function createMealPlanActionBoundary(client: SupabaseClient = getSupabaseClient()): MealPlanActionBoundary {
  return { async apply(input) {
    const { data, error } = await client.rpc('apply_kwilt_meal_plan_conversational', {
      p_operation_id: input.operationId, p_plan_id: input.planId,
      p_expected_version: input.expectedVersion, p_idempotency_key: input.requestId,
      p_payload: input.payload,
    });
    if (error) throw new Error(error.message);
    return data as unknown as MealPlanActionReceipt;
  } };
}

export function createMealPlanActions(boundary: MealPlanActionBoundary) {
  const requireConfirmation = (confirmed: boolean) => {
    if (!confirmed) throw new Error('meal_plan.confirmation_required');
  };
  const requireVersion = (version: number, allowZero = false) => {
    if (!Number.isInteger(version) || version < (allowZero ? 0 : 1)) throw new Error('meal_plan.version_invalid');
  };
  return {
    async create(input: { requestId: string; confirmed: boolean; householdId: string | null; horizon: MealPlanHorizon }) {
      requireConfirmation(input.confirmed);
      const horizon = validateMealPlanHorizon(input.horizon);
      return await boundary.apply({ operationId: 'meal_planning.plan.create', planId: null, expectedVersion: 0,
        requestId: input.requestId, payload: { householdId: input.householdId, horizon } });
    },
    async update(input: { requestId: string; confirmed: boolean; planId: string; expectedVersion: number; horizon: MealPlanHorizon }) {
      requireConfirmation(input.confirmed); requireVersion(input.expectedVersion);
      return await boundary.apply({ operationId: 'meal_planning.plan.update', planId: input.planId,
        expectedVersion: input.expectedVersion, requestId: input.requestId,
        payload: { horizon: validateMealPlanHorizon(input.horizon) } });
    },
    async addCandidate(input: { requestId: string; confirmed: boolean; planId: string; expectedVersion: number; candidate: MealPlanCandidateDraft }) {
      requireConfirmation(input.confirmed); requireVersion(input.expectedVersion);
      if (!input.candidate.id || !input.candidate.title.trim()
        || (input.candidate.kind === 'recipe' && !input.candidate.recipeSnapshot)
        || (input.candidate.kind === 'meal_note' && input.candidate.recipeSnapshot)) throw new Error('meal_plan.candidate_invalid');
      return await boundary.apply({ operationId: 'meal_planning.candidate.add', planId: input.planId,
        expectedVersion: input.expectedVersion, requestId: input.requestId, payload: { candidate: input.candidate } });
    },
    async removeCandidate(input: { requestId: string; confirmed: boolean; planId: string; expectedVersion: number; candidateId: string }) {
      requireConfirmation(input.confirmed); requireVersion(input.expectedVersion);
      if (!input.candidateId) throw new Error('meal_plan.candidate_invalid');
      return await boundary.apply({ operationId: 'meal_planning.candidate.remove', planId: input.planId,
        expectedVersion: input.expectedVersion, requestId: input.requestId, payload: { candidateId: input.candidateId } });
    },
    async openRound(input: { requestId: string; confirmed: boolean; planId: string; expectedVersion: number; participantPersonIds: string[] }) {
      requireConfirmation(input.confirmed); requireVersion(input.expectedVersion);
      const participants = input.participantPersonIds.map((id) => id.trim()).filter(Boolean);
      if (participants.length < 1 || participants.length > 20 || new Set(participants).size !== participants.length) {
        throw new Error('meal_plan.participants_invalid');
      }
      return await boundary.apply({ operationId: 'meal_planning.round.open', planId: input.planId,
        expectedVersion: input.expectedVersion, requestId: input.requestId, payload: { participantPersonIds: participants } });
    },
    async closeRound(input: { requestId: string; confirmed: boolean; roundId: string; expectedVersion: number }) {
      requireConfirmation(input.confirmed); requireVersion(input.expectedVersion);
      return await boundary.apply({ operationId: 'meal_planning.round.close', planId: input.roundId,
        expectedVersion: input.expectedVersion, requestId: input.requestId, payload: {} });
    },
    async submitResponse(input: { requestId: string; confirmed: boolean; roundId: string; expectedVersion: number;
      candidateIds: string[]; availableCandidateIds: string[]; pass: boolean; suggestion: string | null }) {
      requireConfirmation(input.confirmed); requireVersion(input.expectedVersion);
      const response = validateMealChoiceResponse({ selectedCandidateIds: input.candidateIds,
        pass: input.pass, suggestion: input.suggestion }, { candidateIds: input.availableCandidateIds, limit: 3 });
      return await boundary.apply({ operationId: 'meal_planning.response.submit', planId: input.roundId,
        expectedVersion: input.expectedVersion, requestId: input.requestId,
        payload: { candidateIds: response.selectedCandidateIds, pass: response.pass, suggestion: response.suggestion } });
    },
    async withdrawResponse(input: { requestId: string; confirmed: boolean; roundId: string; expectedVersion: number }) {
      requireConfirmation(input.confirmed); requireVersion(input.expectedVersion);
      return await boundary.apply({ operationId: 'meal_planning.response.withdraw', planId: input.roundId,
        expectedVersion: input.expectedVersion, requestId: input.requestId, payload: {} });
    },
    async revise(input: { requestId: string; confirmed: boolean; planId: string; expectedVersion: number }) {
      requireConfirmation(input.confirmed); requireVersion(input.expectedVersion);
      return await boundary.apply({ operationId: 'meal_planning.plan.revise', planId: input.planId,
        expectedVersion: input.expectedVersion, requestId: input.requestId, payload: {} });
    },
    async finalize(input: { requestId: string; confirmed: boolean; planId: string; expectedVersion: number;
      occasions: ReviewedMealPlanOccasion[]; organizerNote: string | null }) {
      requireConfirmation(input.confirmed); requireVersion(input.expectedVersion);
      if (input.occasions.length < 1 || input.occasions.length > 60
        || (input.organizerNote !== null && input.organizerNote.length > 2_000)) throw new Error('meal_plan.finalization_invalid');
      return await boundary.apply({ operationId: 'meal_planning.plan.finalize', planId: input.planId,
        expectedVersion: input.expectedVersion, requestId: input.requestId,
        payload: { occasions: input.occasions, organizerNote: input.organizerNote } });
    },
  };
}

export type MealPlanActions = ReturnType<typeof createMealPlanActions>;
