import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260819181607_individual_first_meal_plans.sql'),
  'utf8',
).toLowerCase();

describe('individual-first Meal Plan migration', () => {
  it('keeps personal ownership authoritative without inventing a Household', () => {
    expect(sql).toContain('alter column household_id drop not null');
    expect(sql).toContain('alter column organizer_membership_id drop not null');
    expect(sql).not.toContain('alter column organizer_person_id drop not null');
    expect(sql).toContain('plan.organizer_person_id = public.kwilt_current_person_id()');
    expect(sql).toContain('if p_household_id is null then');
    expect(sql).not.toContain('insert into public.kwilt_households');
  });

  it('attaches only an owned draft to an authorized Household explicitly', () => {
    expect(sql).toContain('function public.attach_kwilt_meal_plan_to_household');
    expect(sql).toContain("v_plan.state <> 'draft'");
    expect(sql).toContain("membership.role in ('owner','caregiver')");
    expect(sql).toContain('another_household_draft_exists');
    expect(sql).toContain('organizer_membership_id = v_member.id');
    expect(sql).toContain('version = version + 1');
  });

  it('exposes only the intended authenticated RPC authority', () => {
    expect(sql).toContain('revoke execute on function public.create_kwilt_meal_plan(uuid,jsonb,jsonb) from public,anon');
    expect(sql).toContain('grant execute on function public.create_kwilt_meal_plan(uuid,jsonb,jsonb) to authenticated');
    expect(sql).toContain('revoke execute on function public.attach_kwilt_meal_plan_to_household(uuid,integer,uuid) from public,anon');
    expect(sql).toContain('grant execute on function public.attach_kwilt_meal_plan_to_household(uuid,integer,uuid) to authenticated');
  });

  it('keeps personal draft Grocery compilation owner-scoped on the server', () => {
    expect(sql).toContain('function public.sync_kwilt_personal_plan_groceries');
    expect(sql).toContain('v_plan.household_id is not null');
    expect(sql).toContain('v_plan.organizer_person_id<>p_actor_person_id');
    expect(sql).toContain("p_actor_person_id,'meal_plan',null,p_plan_id");
    expect(sql).toContain('grant execute on function public.sync_kwilt_personal_plan_groceries');
    expect(sql).toContain('to service_role');
  });
});
