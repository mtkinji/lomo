import type { ServerAgentProposalRequest } from './agentRuntime.ts';
import {
  compileGroceryAuthority, compileHouseholdPlanGroceryAuthority,
  type HouseholdPlanGroceryAuthorityInput, type GroceryAuthorityInput,
} from './groceryCompiler.ts';

type QueryResult = { data: unknown; error: unknown };
type Query = PromiseLike<QueryResult> & {
  select(columns: string): Query; eq(column: string, value: unknown): Query;
  in(column: string, values: string[]): Query; order(column: string): Query;
  maybeSingle(): Query; single(): Query;
};
type Client = { from(table: string): unknown };
type Row = Record<string, unknown>;
function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function rows(value: unknown): Row[] {
  if (!Array.isArray(value)) throw new Error('grocery_authority_read_failed');
  return value.map(row);
}
async function read(query: Query): Promise<unknown> {
  const result = await query;
  if (result.error) throw new Error('grocery_authority_read_failed');
  return result.data;
}
async function hash(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Reuses the native grocery compiler. No caller-supplied compiled items or recipe bodies are trusted.
 * SQL rechecks actor authority and the exact plan version in the receipt transaction. */
export async function enrichExternalFoodGroceryProposals(
  context: { client: Client; userId: string }, proposals: ServerAgentProposalRequest[],
): Promise<ServerAgentProposalRequest[]> {
  const query = (table: string) => context.client.from(table) as Query;
  const enriched: ServerAgentProposalRequest[] = [];
  for (const proposal of proposals) {
    if (proposal.operation.type !== 'groceries.compile') { enriched.push(proposal); continue; }
    const planId = proposal.operation.targetId;
    const expectedVersion = proposal.operation.payload.expectedVersion;
    if (!planId || !Number.isInteger(expectedVersion) || Number(expectedVersion) < 1) throw new Error('invalid_grocery_compile');
    const binding = row(await read(query('kwilt_person_auth_bindings').select('person_id')
      .eq('user_id', context.userId).eq('status', 'active').maybeSingle()));
    if (typeof binding.person_id !== 'string') throw new Error('person_binding_required');
    const plan = row(await read(query('kwilt_meal_plans').select('id,household_id,organizer_person_id,version,state,horizon')
      .eq('id', planId).single()));
    if (plan.id !== planId) throw new Error('grocery_plan_not_found');
    if (plan.version !== expectedVersion) throw new Error('stale_grocery_plan');
    let actorRole: string | null = null;
    if (plan.household_id !== null) {
      const membership = row(await read(query('kwilt_household_memberships').select('role')
        .eq('household_id', plan.household_id).eq('person_id', binding.person_id).eq('status', 'active').maybeSingle()));
      actorRole = typeof membership.role === 'string' ? membership.role : null;
      if (!actorRole || !['owner', 'caregiver'].includes(actorRole)) throw new Error('household_plan_grocery_manage_forbidden');
    } else if (plan.organizer_person_id !== binding.person_id) throw new Error('grocery_plan_not_owned');

    let candidates: HouseholdPlanGroceryAuthorityInput['candidates'] = [];
    let entries: GroceryAuthorityInput['entries'] = [];
    let candidateIds: string[] = [];
    if (plan.state === 'draft' && row(plan.horizon).kind === 'open') {
      const source = rows(await read(query('kwilt_meal_plan_candidates')
        .select('id,lifecycle_state,removed_grocery_behavior,recipe_snapshot').eq('plan_id', planId).order('position')));
      candidateIds = source.filter((candidate) => candidate.lifecycle_state === 'idea' && candidate.recipe_snapshot)
        .map((candidate) => String(candidate.id));
      if (!candidateIds.length || candidateIds.length > 60) throw new Error('grocery_cart_candidates_required');
      const selected = new Set(candidateIds);
      candidates = source.map((candidate) => ({
        id: String(candidate.id), lifecycleState: (selected.has(String(candidate.id)) ? 'sent' : candidate.lifecycle_state) as 'sent' | 'removed',
        removedGroceryBehavior: candidate.removed_grocery_behavior === 'kept' ? 'kept' as const : null,
        recipeSnapshot: candidate.recipe_snapshot ? row(candidate.recipe_snapshot) : null,
      })).filter((candidate) => candidate.lifecycleState === 'sent' || candidate.lifecycleState === 'removed' && candidate.removedGroceryBehavior === 'kept');
    } else if (plan.state === 'finalized') {
      entries = rows(await read(query('kwilt_meal_plan_entries').select('id,plan_version,servings,recipe_snapshot')
        .eq('plan_id', planId).eq('plan_version', expectedVersion).order('position'))) as GroceryAuthorityInput['entries'];
    } else throw new Error('stale_or_unfinalized_meal_plan');
    const snapshots = candidates.length ? candidates.map((candidate) => candidate.recipeSnapshot) : entries.map((entry) => entry.recipe_snapshot);
    const versionIds = [...new Set(snapshots.flatMap((snapshot) => {
      const id = snapshot?.recipeVersionId;
      return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? [id] : [];
    }))];
    const ingredientsByVersionId: GroceryAuthorityInput['ingredientsByVersionId'] = {};
    if (versionIds.length) {
      const versions = rows(await read(query('kwilt_recipe_versions')
        .select('id,ingredients:kwilt_recipe_ingredients(id,original_text,optional,scale_rule),recipe:kwilt_recipes!inner(lifecycle)').in('id', versionIds)));
      for (const version of versions) {
        const recipe = row(Array.isArray(version.recipe) ? version.recipe[0] : version.recipe);
        if (recipe.lifecycle === 'deleted' || !Array.isArray(version.ingredients)) throw new Error('missing_recipe_version');
        ingredientsByVersionId[String(version.id)] = version.ingredients as GroceryAuthorityInput['ingredientsByVersionId'][string];
      }
    }
    const compiled = plan.state === 'draft'
      ? compileHouseholdPlanGroceryAuthority({ plan: plan as HouseholdPlanGroceryAuthorityInput['plan'], expectedVersion: Number(expectedVersion),
        actorPersonId: binding.person_id, actorRole, candidates, ingredientsByVersionId })
      : compileGroceryAuthority({ plan: plan as GroceryAuthorityInput['plan'], expectedVersion: Number(expectedVersion),
        actorPersonId: binding.person_id, entries, ingredientsByVersionId });
    enriched.push({ ...proposal, operation: { ...proposal.operation, payload: {
      expectedVersion, payloadHash: await hash(compiled.items), compiledItems: compiled.items,
      ...(plan.state === 'draft' ? { candidateIds, planAction: 'send', acknowledgeHardPasses: false } : {}),
    } } });
  }
  return enriched;
}
