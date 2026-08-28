import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { getHouseholdSnapshot, type HouseholdMember } from '../../household/data/household';
import type { PersonFoodNeed } from '../domain/householdMealFit';
import { DEFAULT_MEAL_SERVINGS, MAX_MEAL_SERVINGS, MIN_MEAL_SERVINGS } from '../../../capabilities/recipes/domain/mealPreferences';

export type MealSetupState = 'unseen' | 'skipped' | 'completed';

export type HouseholdMealPreferencesProjection = {
  householdId: string;
  version: number;
  updatedAt: string | null;
  usualDinerCount: number;
  usualDinerPersonIds: string[];
  setupState: MealSetupState;
  foodNeeds: PersonFoodNeed[];
  members: HouseholdMember[];
};

function requiredText(value: unknown, message: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(message);
  return value.trim();
}

function parseSetupState(value: unknown): MealSetupState {
  if (value === 'unseen' || value === 'skipped' || value === 'completed') return value;
  throw new Error('Invalid household meal preferences');
}

function parseUsualDinerCount(value: unknown, dinerCount: number): number {
  const fallback = dinerCount || DEFAULT_MEAL_SERVINGS;
  if (value === undefined || value === null) return fallback;
  if (!Number.isInteger(value) || (value as number) < MIN_MEAL_SERVINGS || (value as number) > MAX_MEAL_SERVINGS
    || (value as number) < dinerCount) {
    throw new Error('Invalid household meal preferences');
  }
  return value as number;
}

function parseFoodNeed(row: Record<string, unknown>): PersonFoodNeed {
  if (row.kind !== 'must_avoid') throw new Error('Invalid person food need');
  return {
    id: requiredText(row.id, 'Invalid person food need'),
    personId: requiredText(row.person_id, 'Invalid person food need'),
    kind: 'must_avoid',
    ingredientConcept: requiredText(row.ingredient_concept, 'Invalid person food need').toLocaleLowerCase(),
    displayLabel: requiredText(row.display_label, 'Invalid person food need'),
  };
}

async function callRpc(client: SupabaseClient, name: string, args: Record<string, unknown>): Promise<void> {
  const { error } = await client.rpc(name, args);
  if (error) throw new Error(error.message);
}

export function createHouseholdMealPreferencesRepository(client: SupabaseClient = getSupabaseClient()) {
  return {
    async load(): Promise<HouseholdMealPreferencesProjection | null> {
      const household = await getHouseholdSnapshot(client);
      if (!household.household) return null;
      const householdId = household.household.id;
      const [preferencesResult, foodNeedsResult] = await Promise.all([
        client.from('kwilt_meal_planner_preferences').select('household_id,usual_diner_person_ids,usual_diner_count,setup_state,version,updated_at').eq('household_id', householdId).maybeSingle(),
        client.from('kwilt_person_food_needs').select('id,person_id,kind,ingredient_concept,display_label').eq('household_id', householdId).order('created_at'),
      ]);
      if (preferencesResult.error) throw new Error(preferencesResult.error.message);
      if (foodNeedsResult.error) throw new Error(foodNeedsResult.error.message);
      const preference = preferencesResult.data as Record<string, unknown> | null;
      const diners = preference?.usual_diner_person_ids ?? [];
      if (!Array.isArray(diners) || diners.some((id) => typeof id !== 'string' || !id)) {
        throw new Error('Invalid household meal preferences');
      }
      const usualDinerPersonIds = preference
        ? [...new Set(diners as string[])]
        : household.members.map((member) => member.personId);
      return {
        householdId,
        version: preference && Number.isInteger(preference.version) ? preference.version as number : 0,
        updatedAt: preference && typeof preference.updated_at === 'string' ? preference.updated_at : null,
        usualDinerCount: parseUsualDinerCount(preference?.usual_diner_count, usualDinerPersonIds.length),
        usualDinerPersonIds,
        setupState: preference ? parseSetupState(preference.setup_state) : 'unseen',
        foodNeeds: ((foodNeedsResult.data ?? []) as Record<string, unknown>[]).map(parseFoodNeed),
        members: household.members.map((member) => ({ ...member })),
      };
    },
    async setPreferences(input: {
      householdId: string;
      usualDinerCount: number;
      usualDinerPersonIds: string[];
      setupState: MealSetupState;
    }): Promise<void> {
      const householdId = requiredText(input.householdId, 'Invalid household meal preferences');
      const setupState = parseSetupState(input.setupState);
      const diners = [...new Set(input.usualDinerPersonIds.map((id) => requiredText(id, 'Invalid household meal preferences')))];
      const usualDinerCount = parseUsualDinerCount(input.usualDinerCount, diners.length);
      await callRpc(client, 'set_kwilt_meal_planner_preferences', {
        p_household_id: householdId,
        p_usual_diner_person_ids: diners,
        p_usual_diner_count: usualDinerCount,
        p_setup_state: setupState,
      });
    },
    async setFoodNeed(input: {
      personId: string;
      ingredientConcept: string;
      displayLabel: string;
      present: boolean;
    }): Promise<void> {
      const personId = requiredText(input.personId, 'Invalid person food need');
      const ingredientConcept = requiredText(input.ingredientConcept, 'Invalid person food need').toLocaleLowerCase();
      const displayLabel = requiredText(input.displayLabel, 'Invalid person food need');
      await callRpc(client, 'set_kwilt_person_food_need', {
        p_person_id: personId,
        p_ingredient_concept: ingredientConcept,
        p_display_label: displayLabel,
        p_present: input.present,
      });
    },
    async updateReviewed(input: {
      householdId: string;
      expectedVersion: number;
      idempotencyKey: string;
      usualDinerCount: number;
      usualDinerPersonIds: string[];
      setupState: MealSetupState;
      foodNeedChanges: Array<{ personId: string; ingredientConcept: string; displayLabel: string; present: boolean }>;
    }): Promise<{ householdId: string; version: number; replayed: boolean }> {
      const householdId = requiredText(input.householdId, 'Invalid household meal preferences');
      const idempotencyKey = requiredText(input.idempotencyKey, 'Invalid household meal preferences');
      if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 0) throw new Error('Invalid household meal preferences');
      const setupState = parseSetupState(input.setupState);
      const diners = [...new Set(input.usualDinerPersonIds.map((id) => requiredText(id, 'Invalid household meal preferences')))];
      const usualDinerCount = parseUsualDinerCount(input.usualDinerCount, diners.length);
      const changes = input.foodNeedChanges.map((change) => ({
        personId: requiredText(change.personId, 'Invalid person food need'),
        ingredientConcept: requiredText(change.ingredientConcept, 'Invalid person food need').toLocaleLowerCase(),
        displayLabel: requiredText(change.displayLabel, 'Invalid person food need'),
        present: Boolean(change.present),
      }));
      const { data, error } = await client.rpc('update_kwilt_meal_preferences_conversational', {
        p_household_id: householdId,
        p_expected_version: input.expectedVersion,
        p_idempotency_key: idempotencyKey,
        p_usual_diner_person_ids: diners,
        p_usual_diner_count: usualDinerCount,
        p_setup_state: setupState,
        p_food_need_changes: changes,
      });
      if (error) throw new Error(error.message);
      const receipt = data as Record<string, unknown> | null;
      if (!receipt || !Number.isInteger(receipt.version)) throw new Error('Invalid household meal preference receipt');
      return { householdId, version: receipt.version as number, replayed: receipt.replayed === true };
    },
  };
}

export type HouseholdMealPreferencesRepository = ReturnType<typeof createHouseholdMealPreferencesRepository>;
