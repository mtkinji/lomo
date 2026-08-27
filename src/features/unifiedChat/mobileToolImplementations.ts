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
  'chapters.note.update', 'chapters.read', 'goals.check_in', 'goals.create',
  'goals.delete', 'goals.read', 'goals.share.open', 'goals.update',
  'household.invitation.preview', 'household.read',
  'money.app_control.review', 'money.category.create', 'money.category.rename', 'money.read',
  'navigation.account_settings.open', 'navigation.search.open', 'notifications.configure',
  'plan.preferences.open', 'plan.read_day_context', 'plan.recommend_day',
  'plan.remove_activity', 'plan.reschedule_activity', 'plan.schedule_activity',
  'plan.schedule_chunks', 'profile.read', 'profile.update', 'recipes.create',
  'recipes.delete', 'recipes.read', 'recipes.update', 'relationships.correct',
  'relationships.forget', 'relationships.read', 'relationships.remember',
  'screen_time.agreement.create', 'screen_time.configure', 'screen_time.device.release.open',
  'screen_time.device.setup.open', 'screen_time.override.allow', 'screen_time.override.block',
  'screen_time.personal.limit.open', 'screen_time.personal.setup.open', 'screen_time.read',
  'screen_time.selection.open',
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
