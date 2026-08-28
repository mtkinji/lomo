import type { AgentToolCall, AgentToolDefinition, AgentToolExecutionResult } from '@kwilt/agent-runtime';
import type { UnifiedChatCapabilitySnapshots } from './capabilityAdapters';
import type { UnifiedChatCapabilityId } from './requestPolicy';
import { parseCapabilityNavigationRequest } from '../../navigation/capabilityNavigationAction';
import { useAppStore } from '../../store/useAppStore';
import { HapticsService } from '../../services/HapticsService';
import {
  HapticsPreferenceConflictError,
  createHapticsPreferenceActions,
  type HapticsPreferenceBoundary,
} from '../account/actions/hapticsPreferenceActions';
import {
  buildWidgetSetupRequest,
  createWidgetPreferenceActions,
  type WidgetPreferenceBoundary,
} from '../account/actions/widgetPreferenceActions';
import { readGlanceableState } from '../../services/appleEcosystem/glanceableState';
import {
  AppearancePreferenceConflictError,
  createAppearancePreferenceActions,
  type AppearancePreferenceBoundary,
} from '../account/actions/appearancePreferenceActions';
import {
  createConnectedToolActions,
  parseConnectedToolConnectRequest,
  type ConnectedToolBoundary,
} from '../account/actions/connectedToolActions';
import { fetchExternalConnections, revokeExternalConnection } from '../../services/externalConnections';
import { getPhoneAgentStatus, updatePhoneAgentSettings } from '../../services/phoneAgent';
import {
  PhoneAgentSettingsConflictError,
  createPhoneAgentSettingsActions,
  type PhoneAgentSettingsBoundary,
} from '../account/actions/phoneAgentSettingsActions';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import {
  AiModelPreferenceConflictError,
  createAiModelPreferenceActions,
  type AiModelPreferenceBoundary,
} from '../account/actions/aiModelPreferenceActions';
import {
  SharingConnectionConflictError,
  createSharingActions,
  type SharingActionsBoundary,
} from '../account/actions/sharingActions';
import { DEFAULT_SHARING_ACTIONS_BOUNDARY } from '../account/actions/sharingActionsBoundary';
import {
  ExecutionTargetConflictError,
  createExecutionTargetActions,
  type ExecutionTargetActionsBoundary,
} from '../account/actions/executionTargetActions';
import { DEFAULT_EXECUTION_TARGET_ACTIONS_BOUNDARY } from '../account/actions/executionTargetActionsBoundary';
import {
  DestinationConflictError,
  createDestinationActions,
  type DestinationActionsBoundary,
} from '../account/actions/destinationActions';
import { DEFAULT_DESTINATION_ACTIONS_BOUNDARY } from '../account/actions/destinationActionsBoundary';
import {
  ActivityAreaConflictError,
  createActivityAreaActions,
  type ActivityAreaActionsBoundary,
} from '../account/actions/activityAreaActions';
import { DEFAULT_ACTIVITY_AREA_ACTIONS_BOUNDARY } from '../account/actions/activityAreaActionsBoundary';
import {
  applyPlanAvailabilityUpdate,
  PlanPreferenceConflictError,
  readPlanAvailability,
  type PlanAvailabilityWindow,
} from '../../capabilities/plan/actions/planPreferenceActions';
import {
  buildPlanCalendarPreferenceSnapshot,
  PlanCalendarPreferenceConflictError,
  reviewPlanCalendarPreferenceUpdate,
} from '../../capabilities/plan/actions/planCalendarPreferenceActions';
import {
  getCalendarPreferences,
  listCalendarAccounts,
  listCalendarsWithErrors,
  type CalendarAccount,
  type CalendarListItem,
  type CalendarRef,
} from '../../services/plan/calendarApi';

export type StagedUnifiedChatClientAction = {
  capabilityId: UnifiedChatCapabilityId;
  actionType: string;
  targetType: string | null;
  targetId: string | null;
  title: string;
  consequenceSummary: string;
  payload: Record<string, unknown>;
};

const DEVICE_TOOL_IDS = new Set([
  'money.app_control.review',
  'money.review_transaction', 'money.category.update', 'money.privacy.configure',
  'money.connection.connect', 'money.connection.sync',
  'screen_time.personal.setup.open', 'screen_time.personal.limit.open',
  'screen_time.configure', 'screen_time.selection.open', 'screen_time.device.setup.open',
  'screen_time.device.release.open', 'notifications.configure', 'navigation.search.open',
  'navigation.account_settings.open', 'navigation.open_capability',
  'account.subscription.open', 'account.delete.open',
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
  'activities.open_focus', 'activities.location.update', 'activities.attachments.open',
  'activities.share.open', 'goals.share.open', 'goals.check_in', 'plan.preferences.open',
  'plan.availability.read', 'plan.availability.update',
  'plan.calendars.read', 'plan.calendars.update',
  'chores.open',
  'recipes.publication.prepare', 'recipes.publication.publish',
  'store_opportunity.capture', 'food_scenario.prepare', 'food_scenario.accept',
  'savings.review', 'savings.accept', 'savings.coupon.open',
  'receipt.extract', 'receipt.reconcile',
]);

export type PlanCalendarPreferencesBoundary = {
  load(): Promise<{
    accounts: CalendarAccount[];
    calendars: CalendarListItem[];
    errors: string[];
    preferences: { version: number; readCalendarRefs: CalendarRef[]; writeCalendarRef: CalendarRef | null };
  }>;
};

const DEFAULT_PLAN_CALENDAR_PREFERENCES_BOUNDARY: PlanCalendarPreferencesBoundary = {
  async load() {
    const [accounts, preferences, calendarResult] = await Promise.all([
      listCalendarAccounts(), getCalendarPreferences(), listCalendarsWithErrors(),
    ]);
    return { accounts, preferences, calendars: calendarResult.calendars, errors: calendarResult.errors };
  },
};

const DEFAULT_HAPTICS_PREFERENCE_BOUNDARY: HapticsPreferenceBoundary = {
  read: () => ({ enabled: useAppStore.getState().hapticsEnabled }),
  apply: ({ enabled }) => {
    useAppStore.getState().setHapticsEnabled(enabled);
    HapticsService.setEnabled(enabled);
  },
};
const DEFAULT_WIDGET_PREFERENCE_BOUNDARY: WidgetPreferenceBoundary = {
  readLastSyncMs: async () => (await readGlanceableState())?.updatedAtMs ?? null,
};
const DEFAULT_APPEARANCE_PREFERENCE_BOUNDARY: AppearancePreferenceBoundary = {
  read: () => {
    const profile = useAppStore.getState().userProfile;
    const thumbnailStyles = profile?.visuals.thumbnailStyles?.length
      ? profile.visuals.thumbnailStyles
      : profile?.visuals.thumbnailStyle ? [profile.visuals.thumbnailStyle] : ['topographyDots'] as const;
    return { updatedAt: profile?.updatedAt ?? new Date(0).toISOString(), thumbnailStyles };
  },
  apply: ({ thumbnailStyles }) => useAppStore.getState().updateUserProfile((profile) => ({
    ...profile,
    visuals: { ...profile.visuals, thumbnailStyles, thumbnailStyle: thumbnailStyles[0] },
  })),
};
const DEFAULT_CONNECTED_TOOL_BOUNDARY: ConnectedToolBoundary = {
  load: fetchExternalConnections,
  revoke: revokeExternalConnection,
};
const DEFAULT_PHONE_AGENT_SETTINGS_BOUNDARY: PhoneAgentSettingsBoundary = {
  load: getPhoneAgentStatus,
  update: updatePhoneAgentSettings,
};
const DEFAULT_AI_MODEL_PREFERENCE_BOUNDARY: AiModelPreferenceBoundary = {
  read: () => ({
    modelId: useAppStore.getState().llmModel,
    isPro: useEntitlementsStore.getState().isPro,
  }),
  apply: ({ modelId }) => useAppStore.getState().setLlmModel(modelId),
};

export function createDeviceToolProvider({
  snapshots,
  calendarPreferences = DEFAULT_PLAN_CALENDAR_PREFERENCES_BOUNDARY,
  hapticsPreferences = DEFAULT_HAPTICS_PREFERENCE_BOUNDARY,
  widgetPreferences = DEFAULT_WIDGET_PREFERENCE_BOUNDARY,
  appearancePreferences = DEFAULT_APPEARANCE_PREFERENCE_BOUNDARY,
  connectedTools = DEFAULT_CONNECTED_TOOL_BOUNDARY,
  phoneAgentSettings = DEFAULT_PHONE_AGENT_SETTINGS_BOUNDARY,
  aiModelPreferences = DEFAULT_AI_MODEL_PREFERENCE_BOUNDARY,
  sharing = DEFAULT_SHARING_ACTIONS_BOUNDARY,
  executionTargets = DEFAULT_EXECUTION_TARGET_ACTIONS_BOUNDARY,
  destinations = DEFAULT_DESTINATION_ACTIONS_BOUNDARY,
  activityAreas = DEFAULT_ACTIVITY_AREA_ACTIONS_BOUNDARY,
}: {
  snapshots: UnifiedChatCapabilitySnapshots;
  calendarPreferences?: PlanCalendarPreferencesBoundary;
  hapticsPreferences?: HapticsPreferenceBoundary;
  widgetPreferences?: WidgetPreferenceBoundary;
  appearancePreferences?: AppearancePreferenceBoundary;
  connectedTools?: ConnectedToolBoundary;
  phoneAgentSettings?: PhoneAgentSettingsBoundary;
  aiModelPreferences?: AiModelPreferenceBoundary;
  sharing?: SharingActionsBoundary;
  executionTargets?: ExecutionTargetActionsBoundary;
  destinations?: DestinationActionsBoundary;
  activityAreas?: ActivityAreaActionsBoundary;
}) {
  const staged: StagedUnifiedChatClientAction[] = [];

  const stage = (request: StagedUnifiedChatClientAction): AgentToolExecutionResult => {
    staged.push(request);
    return { status: 'pending_client_action', provider: 'device', request: request as unknown as Record<string, unknown> };
  };

  const execute = async (call: AgentToolCall, tool: AgentToolDefinition): Promise<AgentToolExecutionResult | null> => {
    if (!DEVICE_TOOL_IDS.has(call.toolId)) return null;
    if (call.toolId !== tool.id) {
      return { status: 'failed', code: 'tool_mismatch', message: 'The discovered device tool does not match this call.', retryable: false };
    }
    if (call.toolId === 'channel.phone.continue_run') {
      if (Object.keys(call.arguments).length !== 0) return {
        status: 'failed', code: 'invalid_phone_continuation',
        message: 'Continuing this conversation on Phone Agent does not accept a phone number or extra fields.',
        retryable: false,
      };
      return stage({
        capabilityId: 'account', actionType: 'continue_thread_on_phone',
        targetType: 'phone_agent_thread', targetId: null,
        title: 'Continue on Phone Agent',
        consequenceSummary: 'Kwilt will connect this conversation to your already verified Phone Agent. Your phone number is never exposed to Chat.',
        payload: {},
      });
    }
    if (call.toolId === 'money.review_transaction'
      || call.toolId === 'money.category.update'
      || call.toolId === 'money.privacy.configure'
      || call.toolId === 'money.connection.connect'
      || call.toolId === 'money.connection.sync') {
      const transactionId = typeof call.arguments.transactionId === 'string' ? call.arguments.transactionId.trim() : '';
      const categoryId = typeof call.arguments.categoryId === 'string' ? call.arguments.categoryId.trim() : '';
      const connectionId = typeof call.arguments.connectionId === 'string' ? call.arguments.connectionId.trim() : '';
      const valid = call.toolId === 'money.review_transaction'
        ? Object.keys(call.arguments).every((key) => key === 'transactionId')
        : call.toolId === 'money.category.update'
          ? Boolean(categoryId && call.arguments.fields && typeof call.arguments.fields === 'object'
            && !Array.isArray(call.arguments.fields))
          : call.toolId === 'money.privacy.configure'
            ? typeof call.arguments.enabled === 'boolean' && Object.keys(call.arguments).length === 1
            : call.toolId === 'money.connection.connect'
              ? Object.keys(call.arguments).length === 0
              : Object.keys(call.arguments).every((key) => key === 'connectionId');
      if (!valid) return {
        status: 'failed', code: 'invalid_money_handoff',
        message: 'Choose a valid private Money control to review on this device.', retryable: false,
      };
      const targetId = transactionId || categoryId || connectionId || null;
      const targetType = transactionId ? 'money_transaction'
        : categoryId ? 'money_category' : connectionId ? 'money_connection' : 'money';
      return stage({
        capabilityId: 'money', actionType: 'open_money_control', targetType, targetId,
        title: 'Review private Money action',
        consequenceSummary: 'Kwilt will open the matching authenticated Money surface. Private financial details and provider credentials remain outside Chat.',
        payload: { toolId: call.toolId, arguments: call.arguments },
      });
    }
    if (call.toolId === 'money.app_control.review') {
      const subject = call.arguments.subject as Record<string, unknown> | undefined;
      const condition = call.arguments.condition as Record<string, unknown> | undefined;
      const effect = call.arguments.effect as Record<string, unknown> | undefined;
      const categoryId = typeof condition?.categoryId === 'string' ? condition.categoryId.trim() : '';
      const preset = typeof condition?.preset === 'string' ? condition.preset : '';
      const presets = new Set(['always_review', 'when_hot', 'at_95_percent', 'when_over', 'needs_review']);
      const suggestedAppLabels = Array.isArray(effect?.suggestedAppLabels)
        ? effect.suggestedAppLabels.flatMap((value) => typeof value === 'string' && value.trim()
            ? [value.trim().slice(0, 80)] : []).slice(0, 8)
        : [];
      if (
        subject?.kind !== 'self' || condition?.owner !== 'money' || effect?.owner !== 'screenTime' ||
        effect?.kind !== 'pause_selected_apps' || !categoryId || !presets.has(preset)
      ) {
        return { status: 'failed', code: 'invalid_money_app_control_intent', message: 'That app-control request does not have a valid self subject, Money condition, and Screen Time effect.', retryable: false };
      }
      const category = snapshots.money?.categories.find((candidate) => (
        candidate.id === categoryId || candidate.sourceId === categoryId
      ));
      if (!category) {
        return { status: 'needs_input', prompt: 'Which Money category should decide when those apps pause?', fields: ['categoryId'] };
      }
      return stage({
        capabilityId: 'money', actionType: 'review_money_app_control',
        targetType: 'money_category', targetId: category.sourceId,
        title: `Review app controls for ${category.name}`,
        consequenceSummary: 'Kwilt will open this Money category. You still choose the apps and review the condition with Apple Screen Time. Nothing is applied in Chat.',
        payload: { subject: { kind: 'self' }, preset, suggestedAppLabels },
      });
    }
    if (call.toolId === 'navigation.open_capability') {
      const request = parseCapabilityNavigationRequest(call.arguments);
      if (!request) {
        return {
          status: 'failed', code: 'invalid_capability_navigation',
          message: 'Choose an included Kwilt capability or one supported stable object.', retryable: false,
        };
      }
      return stage({
        capabilityId: 'navigation', actionType: 'open_capability',
        targetType: request.objectRef?.objectType ?? 'capability',
        targetId: request.objectRef?.objectId ?? request.capabilityId,
        title: `Open ${request.capabilityId}`,
        consequenceSummary: 'Kwilt will open this native destination without changing its contents.',
        payload: request,
      });
    }
    if (call.toolId === 'settings.haptics.read') {
      return { status: 'completed', output: createHapticsPreferenceActions(hapticsPreferences).read(), receipt: null };
    }
    if (call.toolId === 'settings.haptics.update') {
      if (typeof call.arguments.expectedEnabled !== 'boolean' || typeof call.arguments.enabled !== 'boolean') {
        return {
          status: 'failed', code: 'invalid_haptics_preference',
          message: 'Choose whether haptics should be enabled on this device.', retryable: false,
        };
      }
      try {
        return {
          status: 'completed',
          output: createHapticsPreferenceActions(hapticsPreferences).update({
            expectedEnabled: call.arguments.expectedEnabled,
            enabled: call.arguments.enabled,
          }),
          receipt: null,
        };
      } catch (error) {
        if (error instanceof HapticsPreferenceConflictError) {
          return {
            status: 'failed', code: 'haptics_preference_conflict',
            message: error.message, retryable: true,
          };
        }
        throw error;
      }
    }
    if (call.toolId === 'settings.widgets.read') {
      return {
        status: 'completed', output: await createWidgetPreferenceActions(widgetPreferences).read(), receipt: null,
      };
    }
    if (call.toolId === 'settings.widgets.configure') {
      const request = buildWidgetSetupRequest(call.arguments);
      if (!request) {
        return {
          status: 'failed', code: 'invalid_widget_setup',
          message: 'Kwilt can open widget setup guidance, but iOS owns widget placement and shortcut selection.',
          retryable: false,
        };
      }
      return stage({
        capabilityId: 'account', actionType: 'open_widgets_settings',
        targetType: 'device_setting', targetId: 'widgets', title: 'Open widget setup',
        consequenceSummary: 'Kwilt will open native widget guidance. iOS still owns Home Screen placement and widget editing.',
        payload: request,
      });
    }
    if (call.toolId === 'settings.appearance.read') {
      return {
        status: 'completed', output: createAppearancePreferenceActions(appearancePreferences).read(), receipt: null,
      };
    }
    if (call.toolId === 'settings.appearance.update') {
      const styles = Array.isArray(call.arguments.thumbnailStyles)
        ? call.arguments.thumbnailStyles.filter((value): value is string => typeof value === 'string')
        : [];
      if (typeof call.arguments.expectedUpdatedAt !== 'string'
        || styles.length !== (Array.isArray(call.arguments.thumbnailStyles) ? call.arguments.thumbnailStyles.length : -1)) {
        return {
          status: 'failed', code: 'invalid_appearance_preference',
          message: 'Choose one or more supported Kwilt thumbnail styles.', retryable: false,
        };
      }
      try {
        return {
          status: 'completed', output: createAppearancePreferenceActions(appearancePreferences).update({
            expectedUpdatedAt: call.arguments.expectedUpdatedAt, thumbnailStyles: styles,
          }), receipt: null,
        };
      } catch (error) {
        return error instanceof AppearancePreferenceConflictError
          ? { status: 'failed', code: 'appearance_preference_conflict', message: error.message, retryable: true }
          : { status: 'failed', code: 'invalid_appearance_preference', message: error instanceof Error ? error.message : 'Invalid appearance preference.', retryable: false };
      }
    }
    if (call.toolId === 'settings.connected_tools.list') {
      return { status: 'completed', output: await createConnectedToolActions(connectedTools).list(), receipt: null };
    }
    if (call.toolId === 'settings.connected_tools.get') {
      const connectionId = typeof call.arguments.connectionId === 'string' ? call.arguments.connectionId.trim() : '';
      if (!connectionId) return { status: 'failed', code: 'invalid_connection_id', message: 'Choose a connected tool.', retryable: false };
      try {
        return {
          status: 'completed', output: await createConnectedToolActions(connectedTools).get({ connectionId }), receipt: null,
        };
      } catch (error) {
        return { status: 'failed', code: 'connection_not_found', message: error instanceof Error ? error.message : 'Connected tool unavailable.', retryable: true };
      }
    }
    if (call.toolId === 'settings.connected_tools.connect.open') {
      const request = parseConnectedToolConnectRequest(call.arguments);
      if (!request) return {
        status: 'failed', code: 'invalid_connection_provider',
        message: 'Choose a supported app. Credentials and tokens are never accepted in Chat.', retryable: false,
      };
      return stage({
        capabilityId: 'account', actionType: 'open_connected_tool_setup',
        targetType: 'connection_provider', targetId: request.providerId,
        title: `Connect ${request.providerId}`,
        consequenceSummary: 'Kwilt will open provider-owned connector setup. OAuth approval stays outside Chat.',
        payload: request,
      });
    }
    if (call.toolId === 'settings.connected_tools.revoke') {
      const connectionId = typeof call.arguments.connectionId === 'string' ? call.arguments.connectionId.trim() : '';
      const expectedConnectedAt = typeof call.arguments.expectedConnectedAt === 'string'
        ? call.arguments.expectedConnectedAt : call.arguments.expectedConnectedAt === null ? null : undefined;
      if (!connectionId || expectedConnectedAt === undefined) return {
        status: 'failed', code: 'invalid_connection_revoke',
        message: 'Choose an exact reviewed connection version.', retryable: false,
      };
      try {
        return {
          status: 'completed', output: await createConnectedToolActions(connectedTools).revoke({
            connectionId, expectedConnectedAt,
          }), receipt: null,
        };
      } catch (error) {
        return {
          status: 'failed', code: error instanceof Error && error.name === 'ConnectedToolConflictError'
            ? 'connected_tool_conflict' : 'connected_tool_revoke_failed',
          message: error instanceof Error ? error.message : 'Connected tool revocation failed.', retryable: true,
        };
      }
    }
    if (call.toolId === 'settings.phone_agent.read') {
      return {
        status: 'completed', output: await createPhoneAgentSettingsActions(phoneAgentSettings).read(), receipt: null,
      };
    }
    if (call.toolId === 'settings.phone_agent.update') {
      try {
        return {
          status: 'completed',
          output: await createPhoneAgentSettingsActions(phoneAgentSettings).update(call.arguments as never),
          receipt: null,
        };
      } catch (error) {
        return {
          status: 'failed',
          code: error instanceof PhoneAgentSettingsConflictError
            ? 'phone_agent_settings_conflict' : 'invalid_phone_agent_settings',
          message: error instanceof Error ? error.message : 'Phone Agent settings are invalid.',
          retryable: error instanceof PhoneAgentSettingsConflictError,
        };
      }
    }
    if (call.toolId === 'settings.ai_model.read') {
      return {
        status: 'completed', output: createAiModelPreferenceActions(aiModelPreferences).read(), receipt: null,
      };
    }
    if (call.toolId === 'settings.ai_model.update') {
      const expectedModelId = typeof call.arguments.expectedModelId === 'string' ? call.arguments.expectedModelId : '';
      const modelId = typeof call.arguments.modelId === 'string' ? call.arguments.modelId : '';
      try {
        return {
          status: 'completed',
          output: createAiModelPreferenceActions(aiModelPreferences).update({ expectedModelId, modelId }),
          receipt: null,
        };
      } catch (error) {
        return {
          status: 'failed',
          code: error instanceof AiModelPreferenceConflictError ? 'ai_model_conflict' : 'invalid_ai_model',
          message: error instanceof Error ? error.message : 'The AI model preference is invalid.',
          retryable: error instanceof AiModelPreferenceConflictError,
        };
      }
    }
    if (call.toolId === 'settings.sharing.list') {
      return { status: 'completed', output: await createSharingActions(sharing).list(), receipt: null };
    }
    if (call.toolId === 'settings.sharing.invitation.prepare') {
      if (!Number.isInteger(call.arguments.expiresInDays)
        || Number(call.arguments.expiresInDays) < 1 || Number(call.arguments.expiresInDays) > 30) {
        return {
          status: 'failed', code: 'invalid_sharing_invitation',
          message: 'Choose an invitation expiration from 1 through 30 days.', retryable: false,
        };
      }
      return stage({
        capabilityId: 'account', actionType: 'prepare_friend_invitation',
        targetType: 'sharing_invitation', targetId: null, title: 'Invite a friend',
        consequenceSummary: 'Kwilt will prepare a one-use friendship invitation, then you choose the exact recipient and delivery in the native share sheet. Friendship grants no content access.',
        payload: { expiresInDays: call.arguments.expiresInDays },
      });
    }
    if (call.toolId === 'settings.sharing.connection.revoke') {
      const connectionId = typeof call.arguments.connectionId === 'string' ? call.arguments.connectionId.trim() : '';
      const expectedFingerprint = typeof call.arguments.expectedFingerprint === 'string'
        ? call.arguments.expectedFingerprint.trim() : '';
      if (!connectionId || !expectedFingerprint) return {
        status: 'failed', code: 'invalid_sharing_revocation',
        message: 'Choose the exact reviewed sharing connection.', retryable: false,
      };
      try {
        return {
          status: 'completed',
          output: await createSharingActions(sharing).revoke({ connectionId, expectedFingerprint }),
          receipt: null,
        };
      } catch (error) {
        return {
          status: 'failed',
          code: error instanceof SharingConnectionConflictError
            ? 'sharing_connection_conflict' : 'sharing_connection_revoke_failed',
          message: error instanceof Error ? error.message : 'The sharing connection could not be revoked.',
          retryable: true,
        };
      }
    }
    if (call.toolId.startsWith('settings.execution_targets.')) {
      const actions = createExecutionTargetActions(executionTargets);
      try {
        if (call.toolId === 'settings.execution_targets.list') {
          if (Object.keys(call.arguments).length !== 0) throw new Error('Execution-target inventory does not accept extra fields.');
          return { status: 'completed', output: await actions.list(), receipt: null };
        }
        if (call.toolId === 'settings.execution_targets.get') {
          const targetId = typeof call.arguments.targetId === 'string' ? call.arguments.targetId.trim() : '';
          if (!targetId || Object.keys(call.arguments).length !== 1) throw new Error('Choose one execution target.');
          return { status: 'completed', output: await actions.get({ targetId }), receipt: null };
        }
        if (call.toolId === 'settings.execution_targets.create') {
          const { providerId, displayName, repoName } = call.arguments;
          if (providerId !== 'cursor_mcp_v1' || typeof displayName !== 'string' || typeof repoName !== 'string'
            || Object.keys(call.arguments).length !== 3) {
            throw new Error('Choose the curated Cursor provider, a display name, and a repository name. URLs and commands are not accepted in Chat.');
          }
          return { status: 'completed', output: await actions.create({ providerId, displayName, repoName }), receipt: null };
        }
        if (call.toolId === 'settings.execution_targets.update') {
          const targetId = typeof call.arguments.targetId === 'string' ? call.arguments.targetId.trim() : '';
          const expectedUpdatedAt = typeof call.arguments.expectedUpdatedAt === 'string' ? call.arguments.expectedUpdatedAt : '';
          const fields = call.arguments.fields;
          const allowed = new Set(['displayName', 'repoName', 'enabled']);
          if (!targetId || !expectedUpdatedAt || !fields || typeof fields !== 'object' || Array.isArray(fields)
            || Object.keys(call.arguments).length !== 3 || Object.keys(fields).length === 0
            || Object.keys(fields).some((key) => !allowed.has(key))) {
            throw new Error('Choose bounded execution-target fields. URLs and commands are not accepted in Chat.');
          }
          return {
            status: 'completed',
            output: await actions.update({ targetId, expectedUpdatedAt, fields: fields as never }), receipt: null,
          };
        }
        const targetId = typeof call.arguments.targetId === 'string' ? call.arguments.targetId.trim() : '';
        const expectedUpdatedAt = typeof call.arguments.expectedUpdatedAt === 'string' ? call.arguments.expectedUpdatedAt : '';
        if (!targetId || !expectedUpdatedAt || Object.keys(call.arguments).length !== 2) {
          throw new Error('Choose the exact reviewed execution target to delete.');
        }
        return {
          status: 'completed', output: await actions.delete({ targetId, expectedUpdatedAt }), receipt: null,
        };
      } catch (error) {
        return {
          status: 'failed',
          code: error instanceof ExecutionTargetConflictError ? 'execution_target_conflict' : 'invalid_execution_target',
          message: error instanceof Error ? error.message : 'The execution-target request is invalid.',
          retryable: error instanceof ExecutionTargetConflictError,
        };
      }
    }
    if (call.toolId.startsWith('settings.destinations.')) {
      const actions = createDestinationActions(destinations);
      try {
        if (call.toolId === 'settings.destinations.list') {
          if (Object.keys(call.arguments).length !== 0) throw new Error('Destination inventory does not accept extra fields.');
          return { status: 'completed', output: actions.list(), receipt: null };
        }
        if (call.toolId === 'settings.destinations.get') {
          const destinationId = typeof call.arguments.destinationId === 'string' ? call.arguments.destinationId : '';
          if (!destinationId || Object.keys(call.arguments).length !== 1) throw new Error('Choose one supported destination.');
          return { status: 'completed', output: actions.get({ destinationId }), receipt: null };
        }
        if (call.toolId === 'settings.destinations.create') {
          const kind = typeof call.arguments.kind === 'string' ? call.arguments.kind : '';
          if (!kind || Object.keys(call.arguments).length !== 1) throw new Error('Choose one supported retailer destination.');
          return { status: 'completed', output: actions.install({ kind: kind as never }), receipt: null };
        }
        const destinationId = typeof call.arguments.destinationId === 'string' ? call.arguments.destinationId : '';
        if (!destinationId || call.arguments.expectedInstalled !== true || Object.keys(call.arguments).length !== 2) {
          throw new Error('Choose the exact installed retailer destination to remove.');
        }
        return {
          status: 'completed',
          output: actions.uninstall({ destinationId, expectedInstalled: true }), receipt: null,
        };
      } catch (error) {
        return {
          status: 'failed',
          code: error instanceof DestinationConflictError ? 'destination_conflict' : 'invalid_destination',
          message: error instanceof Error ? error.message : 'The destination request is invalid.',
          retryable: error instanceof DestinationConflictError,
        };
      }
    }
    if (call.toolId.startsWith('settings.activity_areas.')) {
      const actions = createActivityAreaActions(activityAreas);
      try {
        if (call.toolId === 'settings.activity_areas.list') {
          if (Object.keys(call.arguments).length !== 0) throw new Error('Activity-area inventory does not accept extra fields.');
          return { status: 'completed', output: actions.list(), receipt: null };
        }
        if (call.toolId === 'settings.activity_areas.get') {
          const areaId = typeof call.arguments.areaId === 'string' ? call.arguments.areaId.trim() : '';
          if (!areaId || Object.keys(call.arguments).length !== 1) throw new Error('Choose one Activity area.');
          return { status: 'completed', output: actions.get({ areaId }), receipt: null };
        }
        if (call.toolId === 'settings.activity_areas.create') {
          const label = typeof call.arguments.label === 'string' ? call.arguments.label : '';
          if (!label.trim() || Object.keys(call.arguments).length !== 1) throw new Error('Choose one Activity area name.');
          return { status: 'completed', output: actions.create({ label }), receipt: null };
        }
        const areaId = typeof call.arguments.areaId === 'string' ? call.arguments.areaId.trim() : '';
        const expectedFingerprint = typeof call.arguments.expectedFingerprint === 'string'
          ? call.arguments.expectedFingerprint.trim() : '';
        if (!areaId || !expectedFingerprint) throw new Error('Choose the exact reviewed Activity area.');
        if (call.toolId === 'settings.activity_areas.update') {
          const label = typeof call.arguments.label === 'string' ? call.arguments.label : '';
          if (!label.trim() || Object.keys(call.arguments).length !== 3) throw new Error('Choose one Activity area name.');
          return {
            status: 'completed', output: actions.update({ areaId, expectedFingerprint, label }), receipt: null,
          };
        }
        if (Object.keys(call.arguments).length !== 2) throw new Error('Activity-area archive does not accept extra fields.');
        return {
          status: 'completed', output: actions.delete({ areaId, expectedFingerprint }), receipt: null,
        };
      } catch (error) {
        return {
          status: 'failed',
          code: error instanceof ActivityAreaConflictError ? 'activity_area_conflict' : 'invalid_activity_area',
          message: error instanceof Error ? error.message : 'The Activity-area request is invalid.',
          retryable: error instanceof ActivityAreaConflictError,
        };
      }
    }
    if (call.toolId === 'plan.availability.read' || call.toolId === 'plan.availability.update') {
      const profile = snapshots.profile?.profile;
      if (!profile) {
        return { status: 'unavailable', reason: 'Plan availability is not available for this profile.', retryable: true };
      }
      const current = readPlanAvailability(profile);
      if (call.toolId === 'plan.availability.read') {
        return { status: 'completed', receipt: null, output: current };
      }
      const windows = Array.isArray(call.arguments.windows)
        ? call.arguments.windows as PlanAvailabilityWindow[]
        : [];
      try {
        const reviewed = applyPlanAvailabilityUpdate(profile, {
          expectedVersion: Number(call.arguments.expectedVersion),
          timeZone: typeof call.arguments.timeZone === 'string' ? call.arguments.timeZone : '',
          windows,
        });
        const next = readPlanAvailability(reviewed.profile);
        return stage({
          capabilityId: 'plan', actionType: 'review_plan_availability',
          targetType: 'plan_availability', targetId: profile.id,
          title: 'Review weekly Plan availability',
          consequenceSummary: `Kwilt will open the exact version ${current.version} weekly diff for ${reviewed.receipt.affectedWeekdays.length} affected day${reviewed.receipt.affectedWeekdays.length === 1 ? '' : 's'}. Nothing changes until you apply it in native review.`,
          payload: {
            expectedVersion: current.version,
            timeZone: next.timeZone,
            windows: next.windows,
            affectedWeekdays: reviewed.receipt.affectedWeekdays,
          },
        });
      } catch (error) {
        if (error instanceof PlanPreferenceConflictError) {
          return { status: 'failed', code: error.code, message: error.message, retryable: true };
        }
        return {
          status: 'failed', code: 'plan_availability_invalid',
          message: error instanceof Error ? error.message : 'The Plan availability diff is invalid.', retryable: false,
        };
      }
    }
    if (call.toolId === 'plan.calendars.read' || call.toolId === 'plan.calendars.update') {
      try {
        const loaded = await calendarPreferences.load();
        const snapshot = buildPlanCalendarPreferenceSnapshot(loaded);
        if (call.toolId === 'plan.calendars.read') {
          if (snapshot.authorization !== 'connected') {
            return stage({
              capabilityId: 'plan', actionType: 'review_plan_calendars',
              targetType: 'plan_calendars', targetId: null, title: 'Connect Plan calendars',
              consequenceSummary: 'Kwilt will open native Calendar settings. Provider authorization stays outside Chat and no calendar is selected automatically.',
              payload: { reason: snapshot.authorization },
            });
          }
          return { status: 'completed', output: snapshot, receipt: null };
        }
        const review = reviewPlanCalendarPreferenceUpdate(snapshot, {
          expectedVersion: Number(call.arguments.expectedVersion),
          readCalendarIds: Array.isArray(call.arguments.readCalendarIds)
            ? call.arguments.readCalendarIds as string[] : [],
          writeCalendarId: typeof call.arguments.writeCalendarId === 'string'
            ? call.arguments.writeCalendarId : null,
        });
        return stage({
          capabilityId: 'plan', actionType: 'review_plan_calendars',
          targetType: 'plan_calendars', targetId: null, title: 'Review Plan calendars',
          consequenceSummary: `Kwilt will open the exact calendar selection: ${review.addedReadCalendarIds.length} added, ${review.removedReadCalendarIds.length} removed${review.writeCalendarChanged ? ', commitment calendar changed' : ''}. Nothing changes until native review.`,
          payload: review,
        });
      } catch (error) {
        if (error instanceof PlanCalendarPreferenceConflictError) {
          return { status: 'failed', code: error.code, message: error.message, retryable: true };
        }
        return {
          status: 'failed', code: 'plan_calendar_preferences_unavailable',
          message: error instanceof Error ? error.message : 'Plan calendars are unavailable.', retryable: true,
        };
      }
    }
    if (call.toolId === 'recipes.publication.prepare' || call.toolId === 'recipes.publication.publish') {
      const versionId = call.toolId === 'recipes.publication.prepare'
        ? (typeof call.arguments.recipeVersionId === 'string' ? call.arguments.recipeVersionId.trim() : '')
        : (typeof call.arguments.confirmedVersionId === 'string' ? call.arguments.confirmedVersionId.trim() : '');
      const recipe = snapshots.recipes?.recipes.find((candidate) => candidate.currentVersion.id === versionId);
      if (!recipe) {
        return { status: 'failed', code: 'recipe_publication_version_not_found',
          message: 'That exact Recipe version is not available for native publication review.', retryable: true };
      }
      const scopes = call.toolId === 'recipes.publication.prepare'
        ? call.arguments.distributionScopes : call.arguments.confirmedScopes;
      if (!Array.isArray(scopes) || scopes.length < 1 || scopes.length > 4
        || scopes.some((scope) => typeof scope !== 'string' || !scope.trim())) {
        return { status: 'failed', code: 'recipe_publication_scopes_invalid',
          message: 'Choose one to four exact publication destinations.', retryable: false };
      }
      return stage({
        capabilityId: 'recipes', actionType: 'open_recipe_publication_review',
        targetType: 'recipe', targetId: recipe.recipe.id,
        title: call.toolId === 'recipes.publication.prepare'
          ? `Review publication for ${recipe.currentVersion.title}`
          : `Confirm publication for ${recipe.currentVersion.title}`,
        consequenceSummary: 'Kwilt will open the exact Recipe version for native identity, rights, media, destination, and final publication review. Nothing is published by Chat.',
        payload: { operationId: call.toolId, recipeVersionId: versionId, arguments: call.arguments },
      });
    }
    if (call.toolId === 'food_scenario.accept') {
      const scenarioId = typeof call.arguments.scenarioId === 'string' ? call.arguments.scenarioId.trim() : '';
      const expectedVersion = Number(call.arguments.expectedVersion);
      if (!scenarioId || !Number.isInteger(expectedVersion) || expectedVersion < 1) {
        return { status: 'failed', code: 'food_scenario_target_invalid',
          message: 'Choose one exact current Food Scenario.', retryable: false };
      }
      return stage({
        capabilityId: 'groceries', actionType: 'open_food_scenario_review',
        targetType: 'food_scenario', targetId: scenarioId,
        title: 'Review Food Scenario',
        consequenceSummary: 'Kwilt will open the version-bound scenario and its partial-recovery details. Nothing changes until native review applies it.',
        payload: { operationId: call.toolId, expectedVersion },
      });
    }
    if (call.toolId === 'savings.review') {
      const listId = typeof call.arguments.groceryListId === 'string' ? call.arguments.groceryListId.trim() : '';
      if (!listId) return { status: 'failed', code: 'grocery_list_not_found', message: 'Choose one exact Grocery list.', retryable: false };
      return stage({
        capabilityId: 'savings', actionType: 'open_grocery_savings', targetType: 'grocery_list', targetId: listId,
        title: 'Review current Grocery savings',
        consequenceSummary: 'Kwilt will refresh current price and offer evidence in native review. Estimated savings are not realized savings, and no coupon is activated by Chat.',
        payload: { operationId: call.toolId, arguments: call.arguments },
      });
    }
    if (call.toolId === 'receipt.extract' || call.toolId === 'receipt.reconcile') {
      const sourceArtifactRefs = Array.isArray(call.arguments.sourceArtifactRefs)
        ? call.arguments.sourceArtifactRefs.filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
        : [];
      const receiptDraftId = typeof call.arguments.receiptDraftId === 'string' ? call.arguments.receiptDraftId.trim() : '';
      if (call.toolId === 'receipt.extract' && (sourceArtifactRefs.length < 1 || sourceArtifactRefs.length > 20)) {
        return { status: 'needs_input', prompt: 'Choose the receipt photo or file to review.', fields: ['sourceArtifactRefs'] };
      }
      if (call.toolId === 'receipt.reconcile' && !receiptDraftId) {
        return { status: 'failed', code: 'receipt_draft_invalid', message: 'Choose one exact reviewed receipt draft.', retryable: false };
      }
      return stage({
        capabilityId: 'groceries', actionType: 'open_grocery_receipt_review',
        targetType: 'grocery_receipt', targetId: receiptDraftId || null,
        title: call.toolId === 'receipt.extract' ? 'Review receipt extraction' : 'Review receipt reconciliation',
        consequenceSummary: 'Kwilt will open native receipt evidence review. Extraction is only a draft; realized savings require reviewed line matches and are not claimed by Chat.',
        payload: { operationId: call.toolId, ...call.arguments, sourceArtifactRefs },
      });
    }
    if (call.toolId === 'store_opportunity.capture' || call.toolId === 'food_scenario.prepare'
      || call.toolId === 'savings.accept' || call.toolId === 'savings.coupon.open') {
      const operationTarget = call.toolId === 'savings.accept'
        ? (typeof call.arguments.savingsPlanId === 'string' ? call.arguments.savingsPlanId.trim() : '')
        : call.toolId === 'savings.coupon.open'
          ? (typeof call.arguments.offerId === 'string' ? call.arguments.offerId.trim() : '')
          : null;
      if (operationTarget === '') {
        return { status: 'failed', code: 'food_review_target_invalid', message: 'Choose one exact reviewed Food target.', retryable: false };
      }
      return stage({
        capabilityId: call.toolId.startsWith('savings.') ? 'savings' : 'groceries',
        actionType: 'open_grocery_food_review', targetType: operationTarget ? 'food_review' : null,
        targetId: operationTarget,
        title: call.toolId === 'store_opportunity.capture' ? 'Review Store Opportunity'
          : call.toolId === 'food_scenario.prepare' ? 'Review Food Scenario inputs'
            : call.toolId === 'savings.accept' ? 'Review Savings Plan'
              : 'Open retailer coupon review',
        consequenceSummary: call.toolId === 'savings.coupon.open'
          ? 'Kwilt will open the native Grocery review. The retailer owns eligibility and activation; Chat does not claim the coupon was applied.'
          : 'Kwilt will open the exact Food review with the supplied evidence. No plan, Grocery list, purchase, or savings state changes in Chat.',
        payload: { operationId: call.toolId, arguments: call.arguments },
      });
    }
    if (call.toolId === 'screen_time.personal.setup.open') {
      const subject = call.arguments.subject as Record<string, unknown> | undefined;
      if (subject?.kind !== 'self') {
        return { status: 'failed', code: 'invalid_personal_screen_time_subject', message: 'Personal Screen Time setup requires the signed-in person on this device.', retryable: false };
      }
      return stage({
        capabilityId: 'screenTime', actionType: 'configure_screen_time',
        targetType: 'personal_screen_time_device', targetId: 'self',
        title: 'Set up My Screen Time',
        consequenceSummary: 'Kwilt will open Screen Time setup on this device. Apple permission and app selection remain under your review.',
        payload: { subject: { kind: 'self' } },
      });
    }
    if (call.toolId === 'screen_time.personal.limit.open') {
      const subject = call.arguments.subject as Record<string, unknown> | undefined;
      const limitMinutes = Number(call.arguments.limitMinutes);
      const suggestedAppLabel = typeof call.arguments.suggestedAppLabel === 'string'
        ? call.arguments.suggestedAppLabel.trim().slice(0, 80)
        : null;
      if (subject?.kind !== 'self' || !Number.isInteger(limitMinutes)
        || limitMinutes < 1 || limitMinutes > 1440 || call.arguments.reset !== 'daily') {
        return {
          status: 'failed', code: 'invalid_personal_screen_time_limit',
          message: 'Personal Screen Time limits require the signed-in person, a daily reset, and a valid minute allowance.',
          retryable: false,
        };
      }
      return stage({
        capabilityId: 'screenTime', actionType: 'open_personal_screen_time_limit',
        targetType: 'personal_screen_time_device', targetId: 'self',
        title: `Review ${limitMinutes}-minute app limit`,
        consequenceSummary: 'Kwilt will open native rule review on this device. You still choose the apps and save the rule there.',
        payload: {
          subject: { kind: 'self' }, limitMinutes, reset: 'daily',
          ...(suggestedAppLabel ? { suggestedAppLabel } : {}),
        },
      });
    }
    if (call.toolId.startsWith('activities.')) {
      const activityId = typeof call.arguments.activityId === 'string' ? call.arguments.activityId : '';
      const activity = snapshots.todos.activities.find((candidate) => candidate.id === activityId);
      if (!activity) return { status: 'failed', code: 'activity_not_found', message: 'The selected Activity is no longer available.', retryable: false };
      const definition = call.toolId === 'activities.open_focus'
        ? { actionType: 'open_activity_focus', title: `Open Focus for ${activity.title}`, consequenceSummary: 'Kwilt will open the Focus sheet. You still choose whether and how long to start the timer.', payload: { route: 'activity', openFocus: true } }
        : call.toolId === 'activities.location.update'
          ? { actionType: 'open_activity_location', title: `Review location for ${activity.title}`, consequenceSummary: 'Kwilt will open this To-do. Location access and any trigger remain under native permission and review.', payload: { route: 'activity' } }
          : call.toolId === 'activities.attachments.open'
            ? { actionType: 'open_activity_attachments', title: `Add an attachment to ${activity.title}`, consequenceSummary: 'Kwilt will open this To-do. You choose the file or photo in the native picker.', payload: { route: 'activity' } }
            : { actionType: 'open_activity_share', title: `Review sharing for ${activity.title}`, consequenceSummary: 'Kwilt will open this To-do. Nothing is shared until you choose the audience and confirm natively.', payload: { route: 'activity' } };
      return stage({ capabilityId: 'todos', targetType: 'activity', targetId: activity.id, ...definition });
    }
    if (call.toolId === 'goals.share.open' || call.toolId === 'goals.check_in') {
      const goalId = typeof call.arguments.goalId === 'string' ? call.arguments.goalId : '';
      const goal = snapshots.goals.goals.find((candidate) => candidate.id === goalId);
      if (!goal) return { status: 'failed', code: 'goal_not_found', message: 'The selected Goal is no longer available.', retryable: false };
      if (call.toolId === 'goals.check_in') {
        const text = typeof call.arguments.text === 'string' ? call.arguments.text.trim() : '';
        if (!text || text.length > 2000) {
          return { status: 'failed', code: 'invalid_checkin_text', message: 'A valid check-in draft is required.', retryable: false };
        }
        return stage({
          capabilityId: 'goals', actionType: 'open_goal_checkin', targetType: 'goal', targetId: goal.id,
          title: `Review check-in for ${goal.title}`,
          consequenceSummary: 'Kwilt will prepare this draft and open the native audience review. Nothing is sent until you confirm there.',
          payload: { text },
        });
      }
      return stage({
        capabilityId: 'goals', actionType: 'open_goal_share', targetType: 'goal', targetId: goal.id,
        title: `Review sharing for ${goal.title}`,
        consequenceSummary: 'Kwilt will open this Goal. Nothing is shared until you choose visibility, audience, and confirm natively.',
        payload: { route: 'goal' },
      });
    }
    if (call.toolId === 'screen_time.configure') {
      const childName = typeof call.arguments.childName === 'string' ? call.arguments.childName.trim() : '';
      const appName = typeof call.arguments.appName === 'string' ? call.arguments.appName.trim() : '';
      const desiredAccess = call.arguments.desiredAccess === 'allow' || call.arguments.desiredAccess === 'block'
        ? call.arguments.desiredAccess
        : null;
      if (!childName || !appName || !desiredAccess) {
        return {
          status: 'needs_input',
          prompt: 'Which child, app, and access change should Kwilt prepare for Screen Time review?',
          fields: ['childName', 'appName', 'desiredAccess'],
        };
      }
      const matches = snapshots.screenTime?.children.filter((candidate) => (
        candidate.canManage && candidate.householdId
        && candidate.displayName.localeCompare(childName, undefined, { sensitivity: 'base' }) === 0
      )) ?? [];
      if (matches.length !== 1) {
        return {
          status: 'failed', code: matches.length === 0 ? 'screen_time_child_not_found' : 'screen_time_child_ambiguous',
          message: matches.length === 0
            ? 'That child is not available in your authorized Screen Time household.'
            : 'More than one authorized child has that name. Choose the exact child first.',
          retryable: true,
        };
      }
      const child = matches[0];
      return stage({
        capabilityId: 'screenTime', actionType: 'open_family_screen_time_setup',
        targetType: 'family_screen_time_child', targetId: child.membershipId,
        title: `Review ${desiredAccess} for ${appName}`,
        consequenceSummary: `Kwilt will open ${child.displayName}'s native app-selection review. Nothing changes until Apple authorization, selection, and device confirmation complete there.`,
        payload: {
          householdId: child.householdId, childDisplayName: child.displayName,
          setupStep: 'selection', suggestedLabel: appName, desiredAccess,
          expectedPolicyVersion: child.policy.desiredPolicyVersion,
        },
      });
    }
    if (call.toolId === 'screen_time.selection.open' || call.toolId === 'screen_time.device.setup.open'
      || call.toolId === 'screen_time.device.release.open') {
      const childMembershipId = typeof call.arguments.childMembershipId === 'string'
        ? call.arguments.childMembershipId.trim()
        : '';
      const child = snapshots.screenTime?.children.find((candidate) => (
        candidate.canManage && candidate.householdId && candidate.membershipId === childMembershipId
      ));
      if (!child) {
        return {
          status: 'failed', code: 'screen_time_child_not_found',
          message: 'That child is not available in your authorized Screen Time household.', retryable: true,
        };
      }
      const setupStep = call.toolId === 'screen_time.selection.open'
        ? 'selection'
        : call.toolId === 'screen_time.device.release.open' ? 'release' : 'device';
      const suggestedLabel = typeof call.arguments.suggestedLabel === 'string'
        ? call.arguments.suggestedLabel.trim().slice(0, 80)
        : null;
      return stage({
        capabilityId: 'screenTime', actionType: 'open_family_screen_time_setup',
        targetType: 'family_screen_time_child', targetId: child.membershipId,
        title: setupStep === 'release'
          ? `Review ${child.displayName}'s device release`
          : `Continue Screen Time setup for ${child.displayName}`,
        consequenceSummary: setupStep === 'release'
          ? 'Kwilt will open native release review. Removing protection still happens only after you confirm there.'
          : 'Kwilt will open the exact native setup step. Apple authorization or app selection still happens there.',
        payload: {
          householdId: child.householdId,
          childDisplayName: child.displayName,
          setupStep,
          ...(suggestedLabel ? { suggestedLabel } : {}),
        },
      });
    }
    const definitions: Record<string, StagedUnifiedChatClientAction> = {
      'notifications.configure': {
        capabilityId: 'notifications', actionType: 'configure_notifications', targetType: null, targetId: null,
        title: 'Review notification settings',
        consequenceSummary: 'Kwilt will open notification settings. System permission and reminder choices remain under native review.', payload: {},
      },
      'navigation.search.open': {
        capabilityId: 'navigation', actionType: 'open_search', targetType: null, targetId: null,
        title: 'Open Search', consequenceSummary: 'Kwilt will open native search.', payload: {},
      },
      'navigation.account_settings.open': {
        capabilityId: 'account', actionType: 'open_account_settings', targetType: null, targetId: null,
        title: 'Open account settings', consequenceSummary: 'Kwilt will open your native account settings.', payload: {},
      },
      'chores.open': {
        capabilityId: 'chores', actionType: 'open_chores', targetType: null, targetId: null,
        title: 'Open Chores', consequenceSummary: 'Kwilt will open the native Chores surface.', payload: {},
      },
      'account.subscription.open': {
        capabilityId: 'account', actionType: 'open_subscription_management', targetType: null, targetId: null,
        title: 'Review subscription',
        consequenceSummary: 'Kwilt will open subscription management. No billing or plan change is made by Chat.', payload: {},
      },
      'account.delete.open': {
        capabilityId: 'account', actionType: 'open_account_deletion', targetType: null, targetId: null,
        title: 'Review account deletion',
        consequenceSummary: 'Account deletion is destructive. Kwilt will open the native consequence and confirmation flow; Chat will not delete the account.', payload: {},
      },
      'plan.preferences.open': {
        capabilityId: 'plan', actionType: 'open_plan_preferences', targetType: null, targetId: null,
        title: 'Review Plan preferences',
        consequenceSummary: 'Kwilt will open native availability and calendar preference settings.', payload: {},
      },
    };
    return stage(definitions[call.toolId]);
  };

  return { execute, actions: (): readonly StagedUnifiedChatClientAction[] => [...staged] };
}
