/**
 * Product-owned inventory of user-meaningful Kwilt operations.
 *
 * This intentionally lives outside Chat. Every conversational channel must
 * account for every operation here as live, pending, confirmation-only, or
 * explicitly excluded. UI gestures are not operations; durable user outcomes
 * are.
 */
export type KwiltOperationOwner =
  | 'general'
  | 'relationships'
  | 'profile'
  | 'arcs'
  | 'goals'
  | 'todos'
  | 'plan'
  | 'chapters'
  | 'account'
  | 'screenTime'
  | 'notifications'
  | 'navigation'
  | 'channels';

type KwiltOperationDefinition = {
  id: string;
  owner: KwiltOperationOwner;
};

const owned = <const Ids extends readonly string[]>(
  owner: KwiltOperationOwner,
  ids: Ids,
): Array<{ id: Ids[number]; owner: KwiltOperationOwner }> =>
  ids.map((id) => ({ id, owner }));

export const KWILT_OPERATION_REGISTRY = [
  ...owned('general', ['general.answer', 'general.answer_with_context'] as const),
  ...owned('relationships', [
    'relationships.read',
    'relationships.remember',
    'relationships.correct',
    'relationships.forget',
    'relationships.forget_person',
  ] as const),
  ...owned('profile', ['profile.read', 'profile.update'] as const),
  ...owned('arcs', ['arcs.list', 'arcs.get', 'arcs.create', 'arcs.update', 'arcs.delete'] as const),
  ...owned('goals', [
    'goals.list',
    'goals.get',
    'goals.create',
    'goals.update',
    'goals.delete',
    'goals.check_in',
    'goals.share',
  ] as const),
  ...owned('todos', [
    'activities.list',
    'activities.get',
    'activities.search',
    'activities.capture',
    'activities.update',
    'activities.complete',
    'activities.delete',
    'activities.steps.create',
    'activities.steps.update',
    'activities.steps.complete',
    'activities.steps.delete',
    'activities.steps.reorder',
    'activities.focus.open',
    'activities.focus_today',
    'activities.schedule',
    'activities.reminder.update',
    'activities.repeat.update',
    'activities.location.update',
    'activities.attachments.update',
    'activities.share',
  ] as const),
  ...owned('plan', [
    'plan.schedule_chunks',
    'plan.read_day_context',
    'plan.recommend_day',
    'plan.schedule_activity',
    'plan.reschedule_activity',
    'plan.remove_activity',
    'plan.preferences.open',
  ] as const),
  ...owned('chapters', [
    'chapters.list',
    'chapters.get',
    'chapters.reflect',
    'chapters.note.update',
  ] as const),
  ...owned('account', [
    'account.show_up_status',
    'account.settings.open',
    'account.subscription.manage',
    'account.delete',
  ] as const),
  ...owned('screenTime', ['screen_time.configure'] as const),
  ...owned('notifications', ['notifications.configure'] as const),
  ...owned('navigation', ['search.open'] as const),
  ...owned('channels', ['channel.phone.continue_run'] as const),
] as const satisfies readonly KwiltOperationDefinition[];

export type KwiltOperationId = typeof KWILT_OPERATION_REGISTRY[number]['id'];

const OPERATION_BY_ID = new Map<string, KwiltOperationDefinition>(
  KWILT_OPERATION_REGISTRY.map((operation) => [operation.id, operation]),
);

export function getKwiltOperation(id: string): KwiltOperationDefinition {
  const operation = OPERATION_BY_ID.get(id);
  if (!operation) throw new Error(`Unknown Kwilt operation: ${id}`);
  return operation;
}
