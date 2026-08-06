import type { ActivityActionCardProvider, ActivityCardReceipt } from '../../../features/activities/actionCards/activityActionCardTypes';

export type GroceryActivityAuthority = {
  state: 'review_needed' | 'ready' | 'stale' | 'unavailable' | 'unauthorized' | 'disconnected';
  handoffState: 'provider_link_created' | 'opened_for_product_review' | 'user_reported_checkout_complete' | 'failed' | null;
  expiresAt: string | null;
};

type Target = { screen: 'GroceryList' | 'GroceryHandoff'; params: { listId: string } };

export function createGroceryActivityCardProvider(input: {
  resolve(resourceRef: string, viewerPersonId: string): Promise<GroceryActivityAuthority>;
  navigate(target: Target): void | Promise<void>;
  copy(resourceRef: string): void | Promise<void>;
  now?: () => Date;
}): ActivityActionCardProvider {
  const provider: ActivityActionCardProvider = {
    id: 'groceries',
    async resolve(binding, context) {
      if (binding.projectionKind !== 'shopping_list') return { providerId: provider.id, projectionKind: binding.projectionKind, state: 'unavailable', eyebrow: 'Groceries', title: 'Shopping list unavailable', detail: null, freshnessLabel: null, primaryAction: null, secondaryAction: null };
      const authority = await input.resolve(binding.resourceRef, context.viewerPersonId);
      if (['unavailable','unauthorized','disconnected'].includes(authority.state)) return { providerId: provider.id, projectionKind: binding.projectionKind, state: authority.state as 'unavailable'|'unauthorized'|'disconnected', eyebrow: 'Groceries', title: authority.state === 'disconnected' ? 'Shopping list is offline' : 'Shopping list unavailable', detail: 'Your to-do is unchanged.', freshnessLabel: null, primaryAction: null, secondaryAction: null };
      const expired = authority.expiresAt ? Date.parse(authority.expiresAt) <= (input.now?.() ?? new Date()).getTime() : false;
      if (authority.state === 'stale' || expired) return { providerId: provider.id, projectionKind: binding.projectionKind, state: 'stale', eyebrow: 'Groceries', title: expired ? 'Retailer link expired' : 'Meal plan changed', detail: 'Review the current grocery list before shopping.', freshnessLabel: null, primaryAction: { id: 'review_list', label: 'Review list' }, secondaryAction: { id: 'copy', label: 'Copy list' } };
      if (authority.state === 'review_needed') return { providerId: provider.id, projectionKind: binding.projectionKind, state: 'ready', eyebrow: 'Groceries', title: 'Review grocery list', detail: 'Check uncertain amounts and what you already have.', freshnessLabel: null, primaryAction: { id: 'review_list', label: 'Review list' }, secondaryAction: { id: 'copy', label: 'Copy list' } };
      const reported = authority.handoffState === 'user_reported_checkout_complete';
      const opened = authority.handoffState === 'opened_for_product_review';
      const linked = authority.handoffState === 'provider_link_created';
      return { providerId: provider.id, projectionKind: binding.projectionKind, state: reported ? 'completed' : 'ready', eyebrow: 'Groceries', title: reported ? 'Shopping reported complete' : opened ? 'Finish choosing products' : linked ? 'Continue on Instacart' : 'Groceries are ready', detail: reported ? null : 'Review products and check out with the retailer.', freshnessLabel: null, primaryAction: reported ? null : { id: 'shop', label: linked || opened ? 'Continue' : 'Shop ingredients' }, secondaryAction: reported ? null : { id: 'copy', label: 'Copy list' } };
    },
    async invoke(invocation): Promise<ActivityCardReceipt> {
      let returnTarget: Target | null = null;
      if (invocation.actionId === 'copy') await input.copy(invocation.binding.resourceRef);
      else if (invocation.actionId === 'review_list' || invocation.actionId === 'shop') {
        returnTarget = { screen: invocation.actionId === 'shop' ? 'GroceryHandoff' : 'GroceryList', params: { listId: invocation.binding.resourceRef } };
        await input.navigate(returnTarget);
      } else return { id: `groceries:${invocation.idempotencyKey}`, providerId: provider.id, actionId: invocation.actionId, idempotencyKey: invocation.idempotencyKey, outcome: 'rejected', code: 'action_not_offered', returnTarget: null };
      return { id: `groceries:${invocation.idempotencyKey}`, providerId: provider.id, actionId: invocation.actionId, idempotencyKey: invocation.idempotencyKey, outcome: 'completed', code: null, returnTarget };
    },
  };
  return provider;
}
