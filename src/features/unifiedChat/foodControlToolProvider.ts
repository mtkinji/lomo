import type { AgentToolCall, AgentToolDefinition, AgentToolExecutionResult } from '@kwilt/agent-runtime';
import type { MealPreferenceActions, MealPreferencePatch } from '../../capabilities/meal-planning/actions/mealPreferenceActions';
import type { RecipeControlActions } from '../../capabilities/recipes/actions/recipeControlActions';

export type RecipeControlProposalOperation =
  | { type: 'recipes.favorite.update'; targetId: string; expectedVersion: number; payload: { favorite: boolean } }
  | { type: 'recipes.visibility.update'; targetId: string; expectedVersion: number; payload: { visibility: 'visible' | 'hidden' } };

export type MealPreferenceProposalOperation = {
  type: 'meal_planning.preferences.update';
  targetId: string;
  expectedVersion: number;
  payload: { patch: MealPreferencePatch };
};

export type FoodControlProposalOperation = RecipeControlProposalOperation | MealPreferenceProposalOperation;

export type StagedFoodControlProposal = ({
  capabilityId: 'recipes';
  operation: RecipeControlProposalOperation;
} | {
  capabilityId: 'meal_planning';
  operation: MealPreferenceProposalOperation;
}) & {
  title: string;
  body: string;
};

const TOOL_IDS = new Set([
  'recipes.favorite.update',
  'recipes.visibility.update',
  'meal_planning.preferences.read',
  'meal_planning.preferences.update',
]);

const failed = (code: string, message: string, retryable = false): AgentToolExecutionResult => ({
  status: 'failed', code, message, retryable,
});

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function record(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (!Array.isArray(value)) return null;
  const entries = value.flatMap((item) => {
    const field = item && typeof item === 'object' && !Array.isArray(item) ? item as Record<string, unknown> : null;
    const key = text(field?.key);
    return key && field && Object.prototype.hasOwnProperty.call(field, 'value')
      ? [[key, field.value] as [string, unknown]]
      : [];
  });
  return entries.length === value.length ? Object.fromEntries(entries) : null;
}

function mealPatch(value: unknown): MealPreferencePatch | null {
  const fields = record(value);
  if (!fields || Object.keys(fields).length === 0) return null;
  const allowed = new Set(['usualDinerCount', 'usualDinerPersonIds', 'setupState', 'foodNeedChanges']);
  if (Object.keys(fields).some((key) => !allowed.has(key))) return null;
  if (fields.usualDinerCount !== undefined && (!Number.isInteger(fields.usualDinerCount) || Number(fields.usualDinerCount) < 1 || Number(fields.usualDinerCount) > 24)) return null;
  if (fields.usualDinerPersonIds !== undefined && (!Array.isArray(fields.usualDinerPersonIds) || fields.usualDinerPersonIds.some((id) => !text(id)))) return null;
  if (fields.setupState !== undefined && !['unseen', 'skipped', 'completed'].includes(String(fields.setupState))) return null;
  if (fields.foodNeedChanges !== undefined && (!Array.isArray(fields.foodNeedChanges) || fields.foodNeedChanges.length > 100)) return null;
  return fields as MealPreferencePatch;
}

export function createFoodControlToolProvider({ recipeActions, mealActions }: {
  recipeActions: Pick<RecipeControlActions, 'readPreferenceState'>;
  mealActions: Pick<MealPreferenceActions, 'read'>;
}) {
  const staged: StagedFoodControlProposal[] = [];

  const execute = async (call: AgentToolCall, tool: AgentToolDefinition): Promise<AgentToolExecutionResult | null> => {
    if (!TOOL_IDS.has(call.toolId)) return null;
    if (call.toolId !== tool.id) return failed('tool_mismatch', 'The discovered food tool does not match this call.');
    try {
      if (call.toolId === 'meal_planning.preferences.read') {
        const receipt = await mealActions.read();
        return { status: 'completed', output: receipt.result, receipt: null };
      }
      const expectedVersion = call.arguments.expectedVersion;
      if (!Number.isInteger(expectedVersion) || Number(expectedVersion) < 0) {
        return failed('invalid_food_version', 'Read the current food setting before changing it.');
      }
      if (call.toolId === 'recipes.favorite.update' || call.toolId === 'recipes.visibility.update') {
        const recipeId = text(call.arguments.recipeId);
        if (!recipeId) return failed('invalid_recipe_target', 'Choose one exact Recipe.');
        const current = await recipeActions.readPreferenceState(recipeId);
        const beforeVersion = call.toolId === 'recipes.favorite.update'
          ? (current.favorite ? 1 : 0)
          : (current.visibility === 'hidden' ? 1 : 0);
        if (beforeVersion !== expectedVersion) {
          return failed('recipe_preference_stale', 'That Recipe preference changed. Review its current state.', true);
        }
        const favorite = call.arguments.favorite;
        const visibility = call.arguments.visibility;
        if (call.toolId === 'recipes.favorite.update' && typeof favorite !== 'boolean') {
          return failed('invalid_recipe_preference', 'Choose whether this Recipe should be a favorite.');
        }
        if (call.toolId === 'recipes.visibility.update' && visibility !== 'visible' && visibility !== 'hidden') {
          return failed('invalid_recipe_preference', 'Choose whether this Recipe should be visible or hidden.');
        }
        const common = { targetId: recipeId, expectedVersion: Number(expectedVersion) };
        const proposal: StagedFoodControlProposal = call.toolId === 'recipes.favorite.update'
          ? { capabilityId: 'recipes', title: `${favorite ? 'Favorite' : 'Unfavorite'} recipe`,
              body: 'Changes only this personal Recipe preference after review.',
              operation: { type: call.toolId, ...common, payload: { favorite: favorite as boolean } } }
          : { capabilityId: 'recipes', title: `${visibility === 'hidden' ? 'Hide' : 'Restore'} recipe`,
              body: 'Changes only this personal Recipe preference after review.',
              operation: { type: call.toolId, ...common, payload: { visibility: visibility as 'visible' | 'hidden' } } };
        staged.push(proposal);
        return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
      }
      const current = (await mealActions.read()).result;
      if (current.version !== expectedVersion) {
        return failed('meal_preferences_stale', 'Household meal preferences changed. Review the current version.', true);
      }
      const patch = mealPatch(call.arguments.fields);
      if (!patch) return failed('invalid_meal_preferences', 'Choose at least one supported household meal preference.');
      const proposal: StagedFoodControlProposal = {
        capabilityId: 'meal_planning', title: 'Update household meal preferences',
        body: 'Applies the reviewed diners, setup state, and food needs together under Household authority.',
        operation: { type: 'meal_planning.preferences.update', targetId: current.householdId, expectedVersion: Number(expectedVersion), payload: { patch } },
      };
      staged.push(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    } catch (error) {
      return failed('food_control_provider_failed', error instanceof Error ? error.message : 'Kwilt could not safely prepare that food setting.');
    }
  };

  return { execute, proposals: () => staged as readonly StagedFoodControlProposal[] };
}
