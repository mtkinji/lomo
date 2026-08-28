import {
  KWILT_TOOL_CONTRACTS,
  type RuntimeToolProviderRegistration,
} from '@kwilt/agent-runtime';
import type { MobileToolProviderContext } from './mobileToolProviderRegistry';

const MOBILE_EXECUTABLE_TOOL_IDS = [
  'account.delete.open', 'account.show_up_status', 'account.subscription.open',
  'activities.attachments.open', 'activities.capture', 'activities.delete',
  'activities.focus_today', 'activities.location.update', 'activities.open_focus',
  'activities.read', 'activities.reminder.update', 'activities.repeat.update',
  'activities.share.open', 'activities.steps.complete', 'activities.steps.create',
  'activities.steps.delete', 'activities.steps.reorder', 'activities.steps.update',
  'activities.update', 'arcs.create', 'arcs.delete', 'arcs.read', 'arcs.update',
  'chapters.alignment.apply', 'chapters.alignment.preview', 'chapters.digest_settings.read',
  'chapters.digest_settings.update', 'chapters.note.update', 'chapters.read', 'goals.check_in', 'goals.create',
  'goals.delete', 'goals.read', 'goals.share.open', 'goals.update',
  'chores.list', 'chores.get', 'chores.definition.create', 'chores.definition.update',
  'chores.definition.pause', 'chores.definition.delete', 'chores.occurrence.complete',
  'chores.occurrence.claim', 'chores.occurrence.release', 'chores.occurrence.reopen',
  'chores.occurrence.report_earlier',
  'chores.evidence.add', 'chores.review.approve', 'chores.review.return',
  'chores.review.leave_missed',
  'chores.reward.read', 'chores.reward.configure', 'chores.reward.reserve',
  'chores.reward.cancel', 'chores.reward.settle',
  'chores.open',
  'household.caregiver_grant.update', 'household.child_capability.update',
  'household.device.list', 'household.device.reconcile', 'household.device.revoke',
  'household.device.update', 'household.invitation.accept', 'household.invitation.create',
  'household.invitation.preview', 'household.member.add_dependent', 'household.member.remove',
  'household.member.update', 'household.read',
  'money.app_control.review', 'money.category.create', 'money.category.rename', 'money.read',
  'money.review_transaction', 'money.category.update', 'money.privacy.configure',
  'money.connection.connect', 'money.connection.sync',
  'money.budget.read', 'money.budget.update', 'money.transaction.get',
  'money.transaction.meaning.update', 'money.transaction.plan_treatment.update',
  'money.connection.disconnect', 'money.connection.repair.open',
  'money.transfer.list', 'money.transfer.get', 'money.transfer.review',
  'navigation.account_settings.open', 'navigation.open_capability', 'navigation.search.open', 'notifications.configure',
  'notifications.preferences.read', 'notifications.preferences.update',
  'plan.preferences.open', 'plan.read_day_context', 'plan.recommend_day',
  'plan.availability.read', 'plan.availability.update', 'plan.calendars.read', 'plan.calendars.update',
  'plan.remove_activity', 'plan.reschedule_activity', 'plan.schedule_activity',
  'plan.schedule_chunks', 'profile.read', 'profile.update', 'recipes.search', 'recipes.scale.preview', 'recipes.create',
  'recipes.import.prepare', 'recipes.import.approve',
  'recipes.delete', 'recipes.read', 'recipes.update', 'recipes.fork', 'recipes.share_copy.prepare', 'recipes.collaborator.invite',
  'recipes.publication.prepare', 'recipes.publication.publish',
  'recipes.favorite.update', 'recipes.visibility.update',
  'cook_session.read', 'cook_session.start', 'cook_session.control', 'cook_session.complete',
  'meal_planning.preferences.read', 'meal_planning.preferences.update', 'relationships.correct',
  'meal_planning.plan.create', 'meal_planning.plan.update',
  'meal_planning.candidate.add', 'meal_planning.candidate.remove',
  'meal_planning.round.open', 'meal_planning.round.close',
  'meal_planning.response.submit', 'meal_planning.response.withdraw',
  'meal_planning.plan.finalize', 'meal_planning.plan.revise',
  'meal_planning.candidates.prepare',
  'food_budget.read', 'food_stock.read', 'food_stock.observe', 'food_stock.deplete',
  'groceries.compile', 'groceries.item.add', 'groceries.item.update', 'groceries.item.set_state', 'groceries.list.review',
  'groceries.product_match.prepare', 'groceries.product_match.confirm', 'groceries.handoff.prepare', 'groceries.handoff.open',
  'store_opportunity.capture', 'food_scenario.prepare', 'food_scenario.accept',
  'savings.review', 'savings.accept', 'savings.coupon.open', 'receipt.extract', 'receipt.reconcile',
  'relationships.forget', 'relationships.read', 'relationships.remember',
  'screen_time.agreement.create', 'screen_time.agreement.deactivate', 'screen_time.agreement.update',
  'screen_time.configure', 'screen_time.device.release.open',
  'screen_time.device.setup.open', 'screen_time.override.allow', 'screen_time.override.block',
  'screen_time.override.cancel', 'screen_time.request.decide',
  'screen_time.personal.limit.open', 'screen_time.personal.setup.open', 'screen_time.read',
  'screen_time.personal_rule.list', 'screen_time.personal_rule.get',
  'screen_time.personal_rule.update', 'screen_time.personal_rule.deactivate',
  'screen_time.personal_rule.delete', 'screen_time.selection.open',
  'settings.haptics.read', 'settings.haptics.update',
  'settings.widgets.read', 'settings.widgets.configure',
  'settings.appearance.read', 'settings.appearance.update',
  'settings.connected_tools.list', 'settings.connected_tools.get',
  'settings.connected_tools.connect.open', 'settings.connected_tools.revoke',
  'settings.phone_agent.read', 'settings.phone_agent.update',
  'settings.ai_model.read', 'settings.ai_model.update',
  'settings.sharing.list', 'settings.sharing.invitation.prepare', 'settings.sharing.connection.revoke',
  'settings.execution_targets.list', 'settings.execution_targets.get',
  'settings.execution_targets.create', 'settings.execution_targets.update', 'settings.execution_targets.delete',
  'settings.destinations.list', 'settings.destinations.get',
  'settings.destinations.create', 'settings.destinations.delete',
  'settings.activity_areas.list', 'settings.activity_areas.get',
  'settings.activity_areas.create', 'settings.activity_areas.update', 'settings.activity_areas.delete',
  'channel.phone.continue_run',
] as const;

const contractById = new Map(KWILT_TOOL_CONTRACTS.map((tool) => [tool.id, tool]));
const contractOrder = new Map(KWILT_TOOL_CONTRACTS.map((tool, index) => [tool.id, index]));

/** Each entry names an ID handled by createUnifiedChatToolProvider or its delegates. */
export const MOBILE_TOOL_PROVIDER_REGISTRATIONS: readonly RuntimeToolProviderRegistration<MobileToolProviderContext>[] =
  [...MOBILE_EXECUTABLE_TOOL_IDS]
    .sort((left, right) => (contractOrder.get(left) ?? 0) - (contractOrder.get(right) ?? 0))
    .flatMap((toolId) => {
    const tool = contractById.get(toolId);
    if (!tool) throw new Error(`Missing canonical mobile tool contract: ${toolId}`);
    return tool.providers.map((provider) => ({
      toolId,
      provider,
      execute: ({ context, call, tool: definition }) => context.execute(call, definition),
    }));
  });
