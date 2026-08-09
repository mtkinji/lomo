import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = [
  '20260808032242_shared_meal_cart.sql',
  '20260808034442_harden_shared_meal_cart_grants.sql',
  '20260808034640_fix_shared_meal_cart_candidate_snapshot.sql',
  '20260808034921_hide_shared_meal_cart_policy_helper.sql',
].map((file) => readFileSync(resolve(process.cwd(), 'supabase/migrations', file), 'utf8')).join('\n').toLowerCase();

describe('shared Meal Cart migration contract', () => {
  it('uses additive RLS-protected reactions and narrow permanent-user RPCs', () => {
    expect(sql).toContain('create table public.kwilt_meal_candidate_reactions');
    expect(sql).toContain('unique(candidate_id, person_id)');
    expect(sql).toContain('alter table public.kwilt_meal_candidate_reactions enable row level security');
    for (const fn of ['get_kwilt_shared_meal_cart', 'add_kwilt_shared_meal_candidate', 'withdraw_kwilt_shared_meal_candidate', 'set_kwilt_shared_meal_reaction']) {
      expect(sql).toContain(`function public.${fn}`);
    }
    expect(sql).toContain('public.kwilt_require_permanent_user()');
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain('revoke insert, update, delete on public.kwilt_meal_candidate_reactions from public, anon, authenticated');
    expect(sql).toContain('grant select on public.kwilt_meal_candidate_reactions to authenticated');
    expect(sql).toContain('revoke all on table public.kwilt_meal_candidate_reactions from public, anon');
    expect(sql).not.toContain('create table realtime.');
    expect(sql).not.toContain('alter table realtime.');
  });

  it('keeps support positive, actor-owned, and separate from settlement', () => {
    expect(sql).toContain("reaction = 'sounds_good'");
    expect(sql).toContain('suggested_by_person_id = v_actor.person_id');
    expect(sql).toContain('person_id = v_actor.person_id');
    expect(sql).not.toContain('order by reaction_count');
    expect(sql).not.toContain('order by supporter_count');
  });
});
