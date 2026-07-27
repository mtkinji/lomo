import { readFileSync } from 'fs';
import path from 'path';

const migration = readFileSync(path.join(
  process.cwd(),
  'supabase/migrations/20260727191420_add_budget_category_cover.sql',
), 'utf8');

describe('Money category cover migration', () => {
  it('keeps the payload constrained and the write owner-scoped', () => {
    expect(migration).toContain('octet_length(cover_image::text) <= 4096');
    expect(migration).toContain('security invoker');
    expect(migration).toContain('v_user_id uuid := (select auth.uid())');
    expect(migration).toContain('and user_id = v_user_id');
    expect(migration).toContain("and status = 'active'");
    expect(migration).toContain('revoke execute on function public.set_budget_category_cover(uuid, jsonb) from public, anon');
    expect(migration).toContain('grant execute on function public.set_budget_category_cover(uuid, jsonb) to authenticated');
    expect(migration).not.toContain('security definer');
  });
});
