import type { GroceryProjection } from '../data/groceryRepository';
import {
  prepareGroceryListForFulfillment,
  resolveGroceryListEntry,
} from './GroceryListScreen';

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
    sourceKind: 'meal_plan',
    sourceMealPlanId: planId,
    sourceMealPlanVersion: planVersion,
    sourceRecipeVersionId: null,
    sourceTitle: null,
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

describe('Grocery List fulfillment preparation', () => {
  it('uses the fulfillment action itself to settle a review-needed list', async () => {
    const markReviewed = jest.fn().mockResolvedValue({ status: 'ready' });
    await prepareGroceryListForFulfillment(
      list('review', 'review_needed', 'plan-1', 4),
      markReviewed,
    );

    expect(markReviewed).toHaveBeenCalledWith('review', 1);
  });

  it('opens an already-ready list without adding another confirmation', async () => {
    const markReviewed = jest.fn();
    await prepareGroceryListForFulfillment(
      list('ready', 'ready', 'plan-1', 4),
      markReviewed,
    );

    expect(markReviewed).not.toHaveBeenCalled();
  });

  it('does not fulfill a stale list', async () => {
    await expect(
      prepareGroceryListForFulfillment(
        list('stale', 'stale', 'plan-1', 4),
        jest.fn(),
      ),
    ).rejects.toThrow('Update this grocery list from the current Plan before shopping.');
  });
});
