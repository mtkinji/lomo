import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260806030000_groceries.sql'), 'utf8').toLowerCase();

describe('Grocery persistence contract', () => {
  it('defines versioned owner-only lists, provenance, corrections, and honest handoffs', () => {
    for (const table of ['kwilt_grocery_lists','kwilt_grocery_items','kwilt_grocery_item_sources','kwilt_grocery_item_corrections','kwilt_grocery_rebase_conflicts','kwilt_retailer_handoffs']) {
      expect(sql).toContain(`create table public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
    for (const rpc of ['compile_kwilt_grocery_list','update_kwilt_grocery_item','set_kwilt_grocery_item_state','add_kwilt_grocery_item','mark_kwilt_grocery_list_reviewed']) {
      expect(sql).toContain(`function public.${rpc}`);
    }
    expect(sql).toContain('source_meal_plan_version');
    expect(sql).toContain('stale_grocery_list_revision');
    expect(sql).toContain('rebased:user_elected');
    expect(sql).not.toContain('min(new_item.id)');
    expect(sql).toContain('correction_unmatched');
    expect(sql).toContain('stale_grocery_rebase_source');
    expect(sql).toContain('provider_link_created');
    expect(sql).toContain('opened_for_product_review');
    expect(sql).toContain('user_reported_checkout_complete');
    expect(sql).toContain('revoke insert,update,delete');
    expect(sql).not.toMatch(/\bordered\b/);
  });
});
