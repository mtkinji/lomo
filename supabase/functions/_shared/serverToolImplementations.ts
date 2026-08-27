import type { RuntimeToolProviderRegistration } from '../../../packages/kwilt-agent-runtime/src/providerRegistry.ts';
import { KWILT_TOOL_CONTRACTS } from '../../../packages/kwilt-agent-runtime/src/kwiltToolContracts.ts';
import type {
  ServerAgentToolCall,
  ServerAgentToolDefinition,
  ServerAgentToolResult,
} from './agentRuntime.ts';

export type ServerToolProviderContext = {
  dispatch(call: ServerAgentToolCall, tool: ServerAgentToolDefinition): Promise<ServerAgentToolResult>;
};

const SERVER_EXECUTABLE_TOOL_IDS = [
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
  'navigation.account_settings.open', 'navigation.search.open', 'notifications.configure',
  'plan.preferences.open', 'plan.read_day_context', 'plan.recommend_day',
  'plan.remove_activity', 'plan.reschedule_activity', 'plan.schedule_activity',
  'plan.schedule_chunks', 'profile.read', 'profile.update', 'relationships.correct',
  'relationships.forget', 'relationships.read', 'relationships.remember', 'screen_time.configure',
] as const;

const contractById = new Map(KWILT_TOOL_CONTRACTS.map((tool) => [tool.id, tool]));
const contractOrder = new Map(KWILT_TOOL_CONTRACTS.map((tool, index) => [tool.id, index]));

/** Each registration names an ID handled by executeServerAgentTool or one of its delegates. */
export const SERVER_TOOL_PROVIDER_REGISTRATIONS: readonly RuntimeToolProviderRegistration<ServerToolProviderContext>[] =
  [...SERVER_EXECUTABLE_TOOL_IDS]
    .sort((left, right) => (contractOrder.get(left) ?? 0) - (contractOrder.get(right) ?? 0))
    .map((toolId) => {
    const tool = contractById.get(toolId);
    if (!tool) throw new Error(`Missing canonical server tool contract: ${toolId}`);
    const provider = tool.providers.includes('server') ? 'server' as const : 'device' as const;
    if (!tool.providers.includes(provider)) {
      throw new Error(`Server tool has no executable provider: ${toolId}`);
    }
    return {
      toolId,
      provider,
      execute: ({ context, call, tool: definition }) => context.dispatch(call, definition),
    };
  });
