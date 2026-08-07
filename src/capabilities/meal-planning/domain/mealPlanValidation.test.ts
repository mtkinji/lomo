import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = [
  '20260806020000_meal_planning.sql',
  '20260807014330_preserve_meal_entry_candidate_snapshots.sql',
  '20260807025224_stale_groceries_when_revising_meal_plan.sql',
].map((file) => readFileSync(resolve(process.cwd(), 'supabase/migrations', file), 'utf8')).join('\n').toLowerCase();

describe('Meal Planning persistence contract', () => {
  it('defines versioned plans, frozen rounds, explicit participants, private responses, and final entries', () => {
    for (const table of [
      'kwilt_meal_plans','kwilt_meal_plan_candidates','kwilt_meal_choice_rounds',
      'kwilt_meal_choice_participants','kwilt_meal_choice_candidates','kwilt_meal_choice_responses','kwilt_meal_plan_entries',
    ]) {
      expect(sql).toContain(`create table public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
    for (const rpc of [
      'create_kwilt_meal_plan','update_kwilt_meal_plan','open_kwilt_meal_choice_round',
      'get_kwilt_meal_choice_projection','submit_kwilt_meal_choice_response','withdraw_kwilt_meal_choice_response',
      'close_kwilt_meal_choice_round','finalize_kwilt_meal_plan','revise_kwilt_meal_plan',
    ]) expect(sql).toContain(`function public.${rpc}`);
    expect(sql).toContain('stale_meal_plan_version');
    expect(sql).toContain('meal_choice_round_closed');
    expect(sql).toContain("('meal-planning', 'meal planning', false)");
    expect(sql).toContain('revoke insert,update,delete');
    expect(sql).not.toContain('delete from public.kwilt_meal_plan_entries where plan_id=p_plan_id;');
    expect(sql).toContain('drop constraint kwilt_meal_plan_entries_candidate_id_fkey');
    expect(sql).toContain('where plan_id=p_plan_id and plan_version=v_plan.version');
    expect(sql).toContain("update public.kwilt_grocery_lists set status='stale'");
    expect(sql).toContain('where source_meal_plan_id=p_plan_id');
    expect(sql).toContain("and status in ('review_needed','ready')");
    expect(sql).toContain("array['kwilt_meal_plans','kwilt_meal_choice_rounds','kwilt_meal_choice_participants','kwilt_meal_choice_responses']");
    expect(sql).toContain("alter publication supabase_realtime add table public.%i");
  });
});
