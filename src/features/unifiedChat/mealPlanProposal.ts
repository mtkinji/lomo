import type { MealPlanCandidateDraft } from '../../capabilities/meal-planning/data/mealPlanningRepository';
import type { MealPlanHorizon } from '../../capabilities/meal-planning/domain/mealPlanContracts';
import type { ReviewedMealPlanOccasion } from '../../capabilities/meal-planning/domain/mealPlanFinalization';

export type MealPlanProposalOperation =
  | { type: 'meal_planning.plan.create'; targetId: null; expectedVersion: 0; payload: { householdId: string | null; horizon: MealPlanHorizon } }
  | { type: 'meal_planning.plan.update'; targetId: string; expectedVersion: number; payload: { horizon: MealPlanHorizon } }
  | { type: 'meal_planning.candidate.add'; targetId: string; expectedVersion: number; payload: { candidate: MealPlanCandidateDraft } }
  | { type: 'meal_planning.candidate.remove'; targetId: string; expectedVersion: number; payload: { candidateId: string } }
  | { type: 'meal_planning.round.open'; targetId: string; expectedVersion: number; payload: { participantPersonIds: string[] } }
  | { type: 'meal_planning.round.close'; targetId: string; expectedVersion: number; payload: Record<string, never> }
  | { type: 'meal_planning.response.submit'; targetId: string; expectedVersion: number; payload: { candidateIds: string[]; pass: boolean; suggestion: string | null; availableCandidateIds: string[] } }
  | { type: 'meal_planning.response.withdraw'; targetId: string; expectedVersion: number; payload: Record<string, never> }
  | { type: 'meal_planning.plan.finalize'; targetId: string; expectedVersion: number; payload: { occasions: ReviewedMealPlanOccasion[]; organizerNote: string | null } }
  | { type: 'meal_planning.plan.revise'; targetId: string; expectedVersion: number; payload: Record<string, never> };
