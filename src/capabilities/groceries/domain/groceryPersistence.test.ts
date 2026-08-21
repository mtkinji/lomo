import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = [
  '20260806030000_groceries.sql',
  '20260807013757_support_bundled_catalog_grocery_sources.sql',
  '20260807030912_preserve_grocery_item_states_on_rebase.sql',
  '20260807172852_support_recipe_scoped_grocery_lists.sql',
  '20260820213000_manual_grocery_lists.sql',
].map((file) => readFileSync(resolve(process.cwd(), 'supabase/migrations', file), 'utf8')).join('\n').toLowerCase();

describe('Grocery persistence contract', () => {
  it('defines versioned owner-only lists, provenance, corrections, and honest handoffs', () => {
    for (const table of ['kwilt_grocery_lists','kwilt_grocery_items','kwilt_grocery_item_sources','kwilt_grocery_item_corrections','kwilt_grocery_rebase_conflicts','kwilt_retailer_handoffs']) {
      expect(sql).toContain(`create table public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
    for (const rpc of ['compile_kwilt_grocery_list','create_kwilt_manual_grocery_list','update_kwilt_grocery_item','set_kwilt_grocery_item_state','add_kwilt_grocery_item','mark_kwilt_grocery_list_reviewed']) {
      expect(sql).toContain(`function public.${rpc}`);
    }
    expect(sql).toContain('source_meal_plan_version');
    expect(sql).toContain("source_kind text not null default 'meal_plan'");
    expect(sql).toContain('source_recipe_version_id');
    expect(sql).toContain('compile_kwilt_recipe_grocery_list');
    expect(sql).toContain('kwilt_can_read_recipe');
    expect(sql).toContain("scope','recipe_version'");
    expect(sql).toContain("set status='review_needed',updated_at=now()");
    expect(sql).toContain('stale_grocery_list_revision');
    expect(sql).toContain('rebased:user_elected');
    expect(sql).not.toContain('min(new_item.id)');
    expect(sql).toContain('correction_unmatched');
    expect(sql).toContain('stale_grocery_rebase_source');
    expect(sql).toContain('catalog_recipe_ingredient');
    expect(sql).toContain("source_snapshot->>'recipeversionid'");
    expect(sql).toContain('provider_link_created');
    expect(sql).toContain('opened_for_product_review');
    expect(sql).toContain('user_reported_checkout_complete');
    expect(sql).toContain("'state:user_elected'");
    expect(sql).toContain("state=case when v_correction.after_value?'state'");
    expect(sql).toContain('revoke insert,update,delete');
    expect(sql).not.toMatch(/\bordered\b/);
  });
});
