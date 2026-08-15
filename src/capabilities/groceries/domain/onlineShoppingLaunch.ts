import type { KrogerLocation } from '../providers/krogerProvider';
import type { RetailerRuntimePolicy } from '../providers/groceryProviderContracts';
import {
  reconcileActionableRetailerPreferences,
  type OnlineShoppingPreferences,
} from './onlineShoppingPreferences';
import { resolveOnlineRetailerOutcomes } from './onlineRetailerResolver';

export type OnlineShoppingLaunch =
  | {
      screen: 'RetailerLinkShopping';
      params: { listId: string; retailerId: 'amazon' };
    }
  | {
      screen: 'OnlineOrder';
      params: { listId: string };
    };

export function resolveOnlineShoppingLaunch(input: {
  listId: string;
  preferences: OnlineShoppingPreferences;
  policies: RetailerRuntimePolicy[];
  preferredStore: KrogerLocation | null;
}): OnlineShoppingLaunch {
  const retailers = reconcileActionableRetailerPreferences({
    fulfillment: input.preferences.defaultFulfillment,
    policies: input.policies,
    preferredStore: input.preferredStore,
    retailers: input.preferences.retailers,
  }).filter((retailer) => retailer.enabled);
  const outcomes = resolveOnlineRetailerOutcomes({
    preferences: { ...input.preferences, retailers },
    policies: input.policies,
    storeReady: Boolean(input.preferredStore),
  });
  const primary = outcomes.find((outcome) =>
    outcome.reason === 'ready' || outcome.reason === 'store_required');

  if (primary?.retailerId === 'amazon' && primary.capability === 'product_links') {
    return {
      screen: 'RetailerLinkShopping',
      params: { listId: input.listId, retailerId: 'amazon' },
    };
  }

  return {
    screen: 'OnlineOrder',
    params: { listId: input.listId },
  };
}
