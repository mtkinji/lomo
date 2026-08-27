import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(
  path.join(process.cwd(), 'supabase/pending-migrations/20260822185837_inferred_meal_plan_household_attention.sql'),
  'utf8',
);

describe('inferred Meal Plan Household attention migration', () => {
  it('uses one extendable 30-minute window triggered only by candidate inserts or Household attachment', () => {
    expect(migration).toContain("p_changed_at + interval '30 minutes'");
    expect(migration).toContain('after insert on public.kwilt_meal_plan_candidates');
    expect(migration).toContain('after update of household_id on public.kwilt_meal_plans');
    expect(migration).not.toContain('after update on public.kwilt_meal_plan_candidates');
  });

  it('suppresses contributors, viewers, and participants while retaining default member eligibility', () => {
    expect(migration).toContain('not membership.person_id = any(v_window.actor_person_ids)');
    expect(migration).toContain("member_state.last_viewed_at, '-infinity'::timestamptz) < v_window.last_change_at");
    expect(migration).toContain('member_state.last_participated_at');
    expect(migration).toContain("activation.capability_id = 'meal-planning'");
  });

  it('owns unseen attention without creating a Shared Home delivery', () => {
    expect(migration).not.toContain('kwilt_shared_deliveries');
    expect(migration).toContain('needs_attention boolean not null default false');
    expect(migration).toContain('get_kwilt_meal_plan_attention_status');
    expect(migration).toContain('last_notified_window = excluded.last_notified_window');
  });

  it('makes direct Plan push preference-controlled and retryable', () => {
    expect(migration).toContain('kwilt_meal_plan_attention_push_outbox');
    expect(migration).toContain('plan_id uuid not null');
    expect(migration).toContain('kwilt_meal_plan_push_preferences');
    expect(migration).toContain('for update skip locked');
    expect(migration).toContain('grant execute on function public.process_kwilt_meal_plan_attention(integer) to service_role');
  });
});
