import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260808132340_progressive_meal_commitment.sql'),
  'utf8',
).toLowerCase();

describe('progressive meal commitment migration', () => {
  it('stores explicit timing on immutable occasion versions', () => {
    expect(migration).toContain('timing_kind');
    expect(migration).toContain('meal_period');
    expect(migration).toContain('coverage_dates');
    expect(migration).toContain("timing_kind in ('flexible', 'occasion', 'coverage')");
    expect(migration).toContain("meal_period in ('breakfast', 'lunch', 'dinner', 'snack')");
    expect(migration).toContain('progressive_meal_timing_valid');
  });

  it('carries only unselected candidates and their named support into a new draft', () => {
    expect(migration).toContain('v_selected_candidate_ids');
    expect(migration).toContain('v_candidate_map');
    expect(migration).toContain('kwilt_meal_candidate_reactions');
    expect(migration).toContain('not (candidate.id = any(v_selected_candidate_ids))');
    expect(migration).toContain("jsonb_build_object('kind', 'open')");
    expect(migration).toContain("'carriedcandidatecount'");
  });

  it('keeps the cart projection draft-only and hardens finalization grants', () => {
    expect(migration).not.toContain("plan.state = 'finalized'");
    expect(migration).toContain('revoke execute on function public.finalize_kwilt_meal_plan(uuid,integer,jsonb,text,text,text) from public, anon');
    expect(migration).toContain('grant execute on function public.finalize_kwilt_meal_plan(uuid,integer,jsonb,text,text,text) to authenticated');
  });
});
