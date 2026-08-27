import {
  type KwiltCapabilityOperationId,
  type KwiltOperationOwner,
} from '@kwilt/agent-runtime';

export type { KwiltOperationOwner };
export type KwiltOperationId = KwiltCapabilityOperationId;

type KwiltOperationDefinition = {
  id: KwiltOperationId;
  owner: KwiltOperationOwner;
};

const DECLARED_OPERATION_ROWS = [
  'general.answer|general', 'general.answer_with_context|general',
  'relationships.read|relationships', 'relationships.remember|relationships',
  'relationships.correct|relationships', 'relationships.forget|relationships',
  'relationships.forget_person|relationships', 'household.read|household',
  'household.member.add_dependent|household', 'household.invitation.create|household',
  'household.invitation.preview|household', 'household.invitation.accept|household',
  'household.child_capability.update|household', 'household.caregiver_grant.update|household',
  'profile.read|profile', 'profile.update|profile',
  'arcs.list|arcs', 'arcs.get|arcs', 'arcs.create|arcs', 'arcs.update|arcs', 'arcs.delete|arcs',
  'goals.list|goals', 'goals.get|goals', 'goals.create|goals', 'goals.update|goals',
  'goals.delete|goals', 'goals.check_in|goals', 'goals.share|goals',
  'activities.list|todos', 'activities.get|todos', 'activities.search|todos',
  'activities.capture|todos', 'activities.update|todos', 'activities.complete|todos',
  'activities.delete|todos', 'activities.steps.create|todos', 'activities.steps.update|todos',
  'activities.steps.complete|todos', 'activities.steps.delete|todos',
  'activities.steps.reorder|todos', 'activities.focus.open|todos',
  'activities.focus_today|todos', 'activities.schedule|todos', 'plan.schedule_chunks|plan',
  'activities.reminder.update|todos', 'activities.repeat.update|todos',
  'activities.location.update|todos', 'activities.attachments.update|todos',
  'activities.share|todos', 'plan.read_day_context|plan', 'plan.recommend_day|plan',
  'plan.schedule_activity|plan', 'plan.reschedule_activity|plan', 'plan.remove_activity|plan',
  'plan.preferences.open|plan', 'chapters.list|chapters', 'chapters.get|chapters',
  'chapters.reflect|chapters', 'chapters.note.update|chapters',
  'account.show_up_status|account', 'money.read|money', 'money.review_transaction|money',
  'money.category.create|money', 'money.category.rename|money',
  'money.app_control.review|money', 'money.category.update|money',
  'money.privacy.configure|money', 'money.connection.connect|money',
  'money.connection.sync|money', 'explore.open|explore', 'games.open|games', 'chores.open|chores',
  'recipes.search|recipes', 'recipes.read|recipes', 'recipes.create|recipes',
  'recipes.import.prepare|recipes', 'recipes.import.approve|recipes', 'recipes.update|recipes',
  'recipes.scale.preview|recipes', 'recipes.fork|recipes',
  'recipes.share_copy.prepare|recipes', 'recipes.collaborator.invite|recipes',
  'recipes.publication.prepare|recipes', 'recipes.publication.publish|recipes',
  'recipes.publication.attest_rights|recipes', 'recipes.delete|recipes',
  'meal_planning.plan.create|meal_planning', 'meal_planning.plan.update|meal_planning',
  'meal_planning.candidate.add|meal_planning', 'meal_planning.candidate.remove|meal_planning',
  'meal_planning.round.open|meal_planning', 'meal_planning.round.close|meal_planning',
  'meal_planning.response.submit|meal_planning', 'meal_planning.response.withdraw|meal_planning',
  'meal_planning.plan.finalize|meal_planning', 'meal_planning.plan.revise|meal_planning',
  'meal_planning.candidates.prepare|meal_planning', 'food_budget.read|savings',
  'food_stock.read|groceries', 'food_stock.observe|groceries', 'food_stock.deplete|groceries',
  'groceries.compile|groceries', 'groceries.item.add|groceries',
  'groceries.item.update|groceries', 'groceries.item.set_state|groceries',
  'groceries.list.review|groceries', 'groceries.product_match.prepare|groceries',
  'groceries.product_match.confirm|groceries', 'groceries.handoff.prepare|groceries',
  'groceries.handoff.open|groceries', 'groceries.checkout|groceries',
  'groceries.payment|groceries', 'store_opportunity.capture|groceries',
  'food_scenario.prepare|groceries', 'food_scenario.accept|groceries',
  'savings.review|savings', 'savings.accept|savings',
  'savings.coupon.apply_unsupported|savings', 'savings.coupon.open|savings',
  'receipt.extract|groceries', 'receipt.reconcile|groceries', 'cook_session.read|recipes',
  'cook_session.start|recipes', 'cook_session.control|recipes', 'cook_session.complete|recipes',
  'screen_time.read|screenTime', 'screen_time.agreement.create|screenTime',
  'screen_time.agreement.update|screenTime', 'screen_time.agreement.deactivate|screenTime',
  'screen_time.override.block|screenTime', 'screen_time.override.allow|screenTime',
  'screen_time.override.cancel|screenTime', 'screen_time.request.decide|screenTime',
  'screen_time.personal.setup.open|screenTime', 'screen_time.personal.limit.open|screenTime',
  'screen_time.selection.open|screenTime', 'screen_time.device.setup.open|screenTime',
  'screen_time.device.release.open|screenTime', 'screen_time.configure|screenTime',
  'notifications.configure|notifications', 'search.open|navigation',
  'account.settings.open|account', 'account.subscription.manage|account',
  'account.delete|account', 'channel.phone.continue_run|channels',
  'household.member.update|household', 'household.member.remove|household',
  'household.device.list|household', 'household.device.update|household',
  'household.device.revoke|household', 'household.device.reconcile|household',
  'plan.availability.read|plan', 'plan.availability.update|plan',
  'plan.calendars.read|plan', 'plan.calendars.update|plan',
  'chapters.digest_settings.read|chapters', 'chapters.digest_settings.update|chapters',
  'chapters.alignment.preview|chapters', 'chapters.alignment.apply|chapters',
  'settings.appearance.read|settings', 'settings.appearance.update|settings',
  'settings.ai_model.read|settings', 'settings.ai_model.update|settings',
  'settings.phone_agent.read|settings', 'settings.phone_agent.update|settings',
  'settings.connected_tools.list|settings', 'settings.connected_tools.get|settings',
  'settings.connected_tools.connect.open|settings', 'settings.connected_tools.revoke|settings',
  'settings.sharing.list|settings', 'settings.sharing.invitation.prepare|settings',
  'settings.sharing.connection.revoke|settings', 'settings.haptics.read|settings',
  'settings.haptics.update|settings', 'settings.widgets.read|settings',
  'settings.widgets.configure|settings', 'settings.execution_targets.list|settings',
  'settings.execution_targets.get|settings', 'settings.execution_targets.create|settings',
  'settings.execution_targets.update|settings', 'settings.execution_targets.delete|settings',
  'settings.destinations.list|settings', 'settings.destinations.get|settings',
  'settings.destinations.create|settings', 'settings.destinations.update|settings',
  'settings.destinations.delete|settings', 'settings.activity_areas.list|settings',
  'settings.activity_areas.get|settings', 'settings.activity_areas.create|settings',
  'settings.activity_areas.update|settings', 'settings.activity_areas.delete|settings',
  'money.budget.read|money', 'money.budget.update|money',
  'money.transaction.get|money', 'money.transaction.meaning.update|money',
  'money.transaction.plan_treatment.update|money', 'money.connection.disconnect|money',
  'money.connection.repair.open|money', 'money.transfer.list|money',
  'money.transfer.get|money', 'money.transfer.review|money',
  'chores.list|chores', 'chores.get|chores',
  'chores.definition.create|chores', 'chores.definition.update|chores',
  'chores.definition.pause|chores', 'chores.definition.delete|chores',
  'chores.occurrence.claim|chores', 'chores.occurrence.release|chores',
  'chores.occurrence.complete|chores', 'chores.occurrence.reopen|chores',
  'chores.occurrence.report_earlier|chores', 'chores.evidence.add|chores',
  'chores.review.approve|chores', 'chores.review.return|chores',
  'chores.review.leave_missed|chores',
  'chores.reward.read|chores', 'chores.reward.configure|chores',
  'chores.reward.reserve|chores', 'chores.reward.cancel|chores',
  'chores.reward.settle|chores', 'recipes.favorite.update|recipes',
  'recipes.visibility.update|recipes', 'meal_planning.preferences.read|meal_planning',
  'meal_planning.preferences.update|meal_planning',
  'screen_time.personal_rule.list|screenTime', 'screen_time.personal_rule.get|screenTime',
  'screen_time.personal_rule.update|screenTime', 'screen_time.personal_rule.deactivate|screenTime',
  'screen_time.personal_rule.delete|screenTime',
  'notifications.preferences.read|notifications', 'notifications.preferences.update|notifications',
  'navigation.open_capability|navigation',
] as const;

/** Product-owned declarations. Chat contracts and handlers are joined separately. */
export const KWILT_OPERATION_REGISTRY: readonly KwiltOperationDefinition[] = Object.freeze(
  DECLARED_OPERATION_ROWS.map((row) => {
    const [id, owner] = row.split('|');
    return Object.freeze({ id: id as KwiltOperationId, owner: owner as KwiltOperationOwner });
  }),
);

const OPERATION_BY_ID = new Map<string, KwiltOperationDefinition>(
  KWILT_OPERATION_REGISTRY.map((operation) => [operation.id, operation]),
);

export function getKwiltOperation(id: string): KwiltOperationDefinition {
  const operation = OPERATION_BY_ID.get(id);
  if (!operation) throw new Error(`Unknown Kwilt operation: ${id}`);
  return operation;
}
