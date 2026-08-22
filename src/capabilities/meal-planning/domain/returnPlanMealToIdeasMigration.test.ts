import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260822171143_return_plan_meal_to_ideas.sql'),
  'utf8',
).toLowerCase();
const edgeFunction = readFileSync(
  resolve(process.cwd(), 'supabase/functions/grocery-compile/index.ts'),
  'utf8',
).toLowerCase();

describe('return Plan meal to Ideas authority', () => {
  it('accepts a return action for household and personal Plans', () => {
    expect(sql).toContain('function public.return_kwilt_household_plan_candidate_to_ideas');
    expect(sql).toContain('function public.return_kwilt_personal_plan_candidate_to_ideas');
    expect(sql).toContain("public.sync_kwilt_household_plan_groceries(\n    p_actor_person_id,p_plan_id,p_expected_version,'remove'");
    expect(sql).toContain("public.sync_kwilt_personal_plan_groceries(\n    p_actor_person_id,p_plan_id,p_expected_version,'remove'");
    expect(sql).toContain("set lifecycle_state='idea'");
    expect(sql).toContain('sent_at=null');
    expect(sql).toContain('sent_by_person_id=null');
    expect(sql).toContain('resolved_at=null');
    expect(sql).toContain('resolved_by_person_id=null');
    expect(sql).toContain('removed_grocery_behavior=null');
  });

  it('keeps the transition inside the authoritative grocery recompile', () => {
    expect(edgeFunction).toContain("body?.planaction==='return'");
    expect(edgeFunction).toContain("filter((candidate)=>planaction!=='return'||!selected.has(candidate.id))");
    expect(edgeFunction).toContain("p_action:planaction");
    expect(sql).toContain('grant execute on function public.return_kwilt_household_plan_candidate_to_ideas');
    expect(sql).toContain('grant execute on function public.return_kwilt_personal_plan_candidate_to_ideas');
    expect(sql).toContain('to service_role');
  });
});
