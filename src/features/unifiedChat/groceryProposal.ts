import type { FoodStockObservationInput } from '../../capabilities/groceries/actions/foodStockActions';
import type { GroceryItemPatch } from '../../capabilities/groceries/actions/groceryListActions';

export type GroceryProposalOperation =
  | { type: 'food_stock.observe'; targetId: string | null; expectedObservationId: string | null;
      payload: { observation: FoodStockObservationInput } }
  | { type: 'food_stock.deplete'; targetId: string | null; expectedObservationId: string | null;
      payload: { concept: string; observedAt: string } }
  | { type: 'groceries.compile'; targetId: string; expectedVersion: number; payload: { mealPlanVersion: number } }
  | { type: 'groceries.item.add'; targetId: string; expectedVersion: number;
      payload: { title: string; sourceKind: 'manual' | 'household_request' } }
  | { type: 'groceries.item.update'; targetId: string; expectedVersion: number;
      payload: { patch: GroceryItemPatch; reason: string | null } }
  | { type: 'groceries.item.set_state'; targetId: string; expectedVersion: number;
      payload: { state: 'needed' | 'already_have' | 'purchased' | 'removed' } };
