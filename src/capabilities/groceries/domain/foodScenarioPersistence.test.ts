import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260806050000_food_thrift_foundation.sql'), 'utf8').toLowerCase();

describe('Food scenario persistence contract', () => {
  it('preserves a private, durable recovery receipt before accepting cross-capability diffs', () => {
    expect(sql).toContain('create table public.kwilt_food_scenario_applications');
    expect(sql).toContain('alter table public.kwilt_food_scenario_applications enable row level security');
    expect(sql).toContain('kwilt_food_scenario_applications_owner_read');
    expect(sql).toContain("'recovery_required'");
    expect(sql).toContain('pending_meal_plan_diffs');
    expect(sql).toContain('pending_grocery_diffs');
    expect(sql).toContain("'applicationid',v_application_id");
    expect(sql.indexOf('insert into public.kwilt_food_scenario_applications')).toBeLessThan(sql.indexOf('update public.kwilt_food_scenarios set lifecycle'));
    expect(sql).toContain('revoke insert,update,delete on public.kwilt_store_opportunities,public.kwilt_food_scenarios,public.kwilt_food_scenario_applications');
  });
});
