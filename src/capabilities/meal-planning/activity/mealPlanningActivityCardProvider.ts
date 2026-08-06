import type { ActivityActionCardProvider, ActivityCardReceipt } from '../../../features/activities/actionCards/activityActionCardTypes';

type AuthorityProjection = { state: 'draft'|'collecting_choices'|'ready_to_finalize'|'finalized'|'open'|'closed'|'unavailable'|'unauthorized'; responseCount: number };
type Target = { screen: 'NextMeals'; params?: undefined } | { screen: 'MealChoiceResponse'; params: { roundId: string; intent?: 'pass' } };

export function createMealPlanningActivityCardProvider(input: {
  resolve(resourceRef: string, projectionKind: string, viewerPersonId: string): Promise<AuthorityProjection>;
  navigate(target: Target): void | Promise<void>;
}): ActivityActionCardProvider {
  const provider: ActivityActionCardProvider = {
    id: 'meal_planning',
    async resolve(binding, context) {
      const authority = await input.resolve(binding.resourceRef, binding.projectionKind, context.viewerPersonId);
      if (authority.state === 'unavailable' || authority.state === 'unauthorized') return { providerId: provider.id, projectionKind: binding.projectionKind, state: authority.state, eyebrow: 'Meal Planning', title: authority.state === 'unauthorized' ? 'You no longer have access' : 'Meal planning is unavailable', detail: 'Open Food to check the current plan.', freshnessLabel: null, primaryAction: null, secondaryAction: null };
      if (binding.projectionKind === 'participant_round') {
        const open = authority.state === 'open';
        return { providerId: provider.id, projectionKind: binding.projectionKind, state: open ? 'ready' : 'completed', eyebrow: 'Family meal choices', title: open ? 'What sounds good?' : 'Choices are closed', detail: open ? 'Pick up to three, pass, or suggest one.' : null, freshnessLabel: null, primaryAction: open ? { id: 'choose', label: 'Choose meals' } : null, secondaryAction: open ? { id: 'pass', label: 'Pass' } : null };
      }
      const completed = authority.state === 'finalized';
      return { providerId: provider.id, projectionKind: binding.projectionKind, state: completed ? 'completed' : 'ready', eyebrow: 'Meal Planning', title: completed ? 'Meals are decided' : 'Plan the next meals', detail: authority.responseCount ? `${authority.responseCount} household responses are ready.` : 'Choose the cadence and meals that fit this shop.', freshnessLabel: null, primaryAction: completed ? null : { id: 'open_plan', label: 'Open plan' }, secondaryAction: null };
    },
    async invoke(invocation): Promise<ActivityCardReceipt> {
      const target: Target = invocation.binding.projectionKind === 'participant_round'
        ? { screen: 'MealChoiceResponse', params: { roundId: invocation.binding.resourceRef, ...(invocation.actionId === 'pass' ? { intent: 'pass' as const } : {}) } }
        : { screen: 'NextMeals' };
      if (!['choose','pass','open_plan'].includes(invocation.actionId)) return { id: `meal-planning:${invocation.idempotencyKey}`, providerId: provider.id, actionId: invocation.actionId, idempotencyKey: invocation.idempotencyKey, outcome: 'rejected', code: 'action_not_offered', returnTarget: null };
      await input.navigate(target);
      return { id: `meal-planning:${invocation.idempotencyKey}`, providerId: provider.id, actionId: invocation.actionId, idempotencyKey: invocation.idempotencyKey, outcome: 'completed', code: null, returnTarget: target };
    },
  };
  return provider;
}
