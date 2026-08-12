import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260812012700_collaborative_household_recipe_plan.sql'),
  'utf8',
).toLowerCase();
const contributorReactionSql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260812025828_allow_plan_contributor_reaction_reversal.sql'),
  'utf8',
).toLowerCase();
const positiveReactionSql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260812040825_plan_positive_reactions.sql'),
  'utf8',
).toLowerCase();

describe('collaborative household Recipe Plan migration contract', () => {
  it('keeps one persistent Plan occurrence with explicit non-calendar lifecycle history', () => {
    expect(sql).toContain("lifecycle_state in ('idea','sent','made','removed')");
    expect(sql).toContain('sent_at timestamptz');
    expect(sql).toContain('resolved_at timestamptz');
    expect(sql).toContain("removed_grocery_behavior in ('removed','kept')");
    expect(sql).toContain("horizon) values(p_household_id,v_owner.id,v_owner.person_id,jsonb_build_object('kind','open'))");
    expect(sql).not.toContain("jsonb_build_object('kind','date_range')");
  });

  it('keeps reactions collaborative while adult roles own commitment and resolution', () => {
    expect(sql).toContain("actor.role in ('owner','caregiver')");
    expect(contributorReactionSql).toContain('create or replace function public.set_kwilt_shared_meal_reaction');
    expect(contributorReactionSql).not.toContain('cannot_remove_contributor_support');
    expect(contributorReactionSql).toContain('delete from public.kwilt_meal_candidate_reactions');
    expect(sql).toContain('shared_meal_candidate_remove_forbidden');
    expect(sql).toContain('shared_meal_candidate_resolve_forbidden');
    expect(sql).toContain("grant execute on function public.remove_kwilt_sent_plan_candidate_keep_groceries");
  });

  it('does not react for the nominator and stores one constrained positive reaction per person', () => {
    expect(positiveReactionSql).toContain('delete from public.kwilt_meal_candidate_reactions reaction');
    expect(positiveReactionSql).toContain('candidate.suggested_by_person_id = reaction.person_id');
    expect(positiveReactionSql).toContain("reaction in ('thumbs_up','heart','yum','excited','fire')");
    expect(positiveReactionSql).not.toContain('insert into public.kwilt_meal_candidate_reactions(candidate_id,person_id) values(p_candidate_id,v_actor.person_id)');
    expect(positiveReactionSql).toContain('p_reaction text');
    expect(positiveReactionSql).toContain("'viewerreaction',reaction_data.viewer_reaction");
    expect(positiveReactionSql).toContain("'reactioncounts',reaction_data.reaction_counts");
  });

  it('adds household Plan grocery scope and source-level contribution quantities', () => {
    expect(sql).toContain("source_kind in ('meal_plan','household_plan','recipe_version')");
    expect(sql).toContain('source_household_id uuid');
    expect(sql).toContain('plan_candidate_id uuid');
    expect(sql).toContain('contribution_quantity_min numeric');
    expect(sql).toContain('contribution_quantity_max numeric');
    expect(sql).toContain('contribution_optional boolean');
  });

  it('derives readiness from acquired required items and never retailer cart state', () => {
    expect(sql).toContain("item.state not in ('purchased','already_have')");
    expect(sql).toContain('missingitemcount');
    expect(sql).not.toContain('cart_add_acknowledged');
    expect(sql).not.toContain('provider_acknowledged_at');
  });

  it('keeps compiled writes server-only and public functions narrow', () => {
    expect(sql).toContain('grant execute on function public.sync_kwilt_household_plan_groceries');
    expect(sql).toContain('to service_role');
    expect(sql).toContain('public.kwilt_require_permanent_user()');
    expect(sql).toContain("set search_path=''");
    expect(sql).toContain('alter publication supabase_realtime add table public.kwilt_grocery_items');
  });
});
