import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260903144422_repair_legacy_planned_recipe_scale.sql'),
  'utf8',
).toLowerCase();

describe('legacy planned Recipe scale repair', () => {
  it('makes the historic one-batch assumption explicit only for already-sent meals', () => {
    expect(sql).toContain("set recipe_snapshot=jsonb_set(recipe_snapshot,'{recipescalemultiplier}',to_jsonb(1),true)");
    expect(sql).toContain("lifecycle_state='sent'");
    expect(sql).toContain("recipe_snapshot ? 'selectedservings'");
    expect(sql).toContain("not (recipe_snapshot ? 'recipescalemultiplier')");
    expect(sql).toContain("coalesce(recipe_snapshot->>'yieldunit','')<>'servings'");
  });
});
