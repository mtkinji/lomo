import type { GroceryProjection } from '../data/groceryRepository';
import { resolveGroceryListEntry } from './GroceryListScreen';

function list(
  id: string,
  status: GroceryProjection['status'],
  planId: string,
  planVersion: number,
): GroceryProjection {
  return {
    id,
    revision: 1,
    status,
    sourceMealPlanId: planId,
    sourceMealPlanVersion: planVersion,
    items: [],
    updatedAt: '2026-08-07T00:00:00.000Z',
  };
}

describe('Grocery List entry resolution', () => {
  it('reopens an existing list for the exact finalized plan version', () => {
    const current = list('current', 'review_needed', 'plan-1', 4);
    expect(resolveGroceryListEntry([current], 'plan-1', 4)).toEqual({
      kind: 'show',
      list: current,
    });
  });

  it('surfaces the stale source list so changes can be preserved', () => {
    const stale = list('stale', 'stale', 'plan-1', 3);
    expect(resolveGroceryListEntry([stale], 'plan-1', 4)).toEqual({
      kind: 'show',
      list: stale,
    });
  });

  it('compiles only when the plan has no current or stale grocery list', () => {
    expect(resolveGroceryListEntry([], 'plan-1', 4)).toEqual({ kind: 'compile' });
  });
});
