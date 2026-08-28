import { createActivityAreaActions } from '../account/actions/activityAreaActions';
import { DEFAULT_ACTIVITY_AREA_ACTIONS_BOUNDARY } from '../account/actions/activityAreaActionsBoundary';
import { createAiModelPreferenceActions } from '../account/actions/aiModelPreferenceActions';
import { createAppearancePreferenceActions } from '../account/actions/appearancePreferenceActions';
import { createConnectedToolActions } from '../account/actions/connectedToolActions';
import { createDestinationActions } from '../account/actions/destinationActions';
import { DEFAULT_DESTINATION_ACTIONS_BOUNDARY } from '../account/actions/destinationActionsBoundary';
import { createExecutionTargetActions } from '../account/actions/executionTargetActions';
import { DEFAULT_EXECUTION_TARGET_ACTIONS_BOUNDARY } from '../account/actions/executionTargetActionsBoundary';
import { createHapticsPreferenceActions } from '../account/actions/hapticsPreferenceActions';
import { createPhoneAgentSettingsActions } from '../account/actions/phoneAgentSettingsActions';
import { createSharingActions } from '../account/actions/sharingActions';
import { DEFAULT_SHARING_ACTIONS_BOUNDARY } from '../account/actions/sharingActionsBoundary';
import { readGlanceableState } from '../../services/appleEcosystem/glanceableState';
import { fetchExternalConnections, revokeExternalConnection } from '../../services/externalConnections';
import { HapticsService } from '../../services/HapticsService';
import {
  continuePhoneAgentThread,
  getPhoneAgentStatus,
  updatePhoneAgentSettings,
} from '../../services/phoneAgent';
import { useAppStore } from '../../store/useAppStore';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import type { UnifiedChatClientAction } from './types';
import { createWidgetPreferenceActions } from '../account/actions/widgetPreferenceActions';

type ClientActionExecutionResult = Record<string, unknown> | Promise<Record<string, unknown>>;
type DeviceOwnedClientActionResult = { handled: true; result: ClientActionExecutionResult } | { handled: false };

export function executeDeviceOwnedClientAction(
  clientAction: UnifiedChatClientAction,
  threadId: string | null | undefined,
): DeviceOwnedClientActionResult {
  if (clientAction.actionType === 'continue_thread_on_phone') {
    if (!threadId) throw new Error('Open a durable Kwilt conversation before continuing it on Phone Agent.');
    return { handled: true, result: continuePhoneAgentThread(threadId)
      .then((result) => ({ outcome: 'continued_thread_on_phone', ...result })) };
  }
  if (clientAction.actionType === 'read_activity_areas'
    || clientAction.actionType === 'read_activity_area'
    || clientAction.actionType === 'create_activity_area'
    || clientAction.actionType === 'update_activity_area'
    || clientAction.actionType === 'archive_activity_area') {
    const actions = createActivityAreaActions(DEFAULT_ACTIVITY_AREA_ACTIONS_BOUNDARY);
    if (clientAction.actionType === 'read_activity_areas') {
      return { handled: true, result: { outcome: 'read_activity_areas', ...actions.list() } };
    }
    if (clientAction.actionType === 'read_activity_area') {
      const areaId = clientAction.payload.areaId;
      if (typeof areaId !== 'string') throw new Error('This Activity-area request is invalid.');
      return { handled: true, result: { outcome: 'read_activity_area', ...actions.get({ areaId }) } };
    }
    if (clientAction.actionType === 'create_activity_area') {
      const label = clientAction.payload.label;
      if (typeof label !== 'string') throw new Error('This Activity-area creation is invalid.');
      return { handled: true, result: { outcome: 'created_activity_area', ...actions.create({ label }) } };
    }
    const areaId = clientAction.payload.areaId;
    const expectedFingerprint = clientAction.payload.expectedFingerprint;
    if (typeof areaId !== 'string' || typeof expectedFingerprint !== 'string') {
      throw new Error('This Activity-area change is invalid.');
    }
    if (clientAction.actionType === 'update_activity_area') {
      const label = clientAction.payload.label;
      if (typeof label !== 'string') throw new Error('This Activity-area rename is invalid.');
      return { handled: true, result: {
        outcome: 'updated_activity_area', ...actions.update({ areaId, expectedFingerprint, label }),
      } };
    }
    return { handled: true, result: {
      outcome: 'archived_activity_area', ...actions.delete({ areaId, expectedFingerprint }),
    } };
  }
  if (clientAction.actionType === 'read_destinations'
    || clientAction.actionType === 'read_destination'
    || clientAction.actionType === 'install_destination'
    || clientAction.actionType === 'uninstall_destination') {
    const actions = createDestinationActions(DEFAULT_DESTINATION_ACTIONS_BOUNDARY);
    if (clientAction.actionType === 'read_destinations') {
      return { handled: true, result: { outcome: 'read_destinations', ...actions.list() } };
    }
    if (clientAction.actionType === 'read_destination') {
      const destinationId = clientAction.payload.destinationId;
      if (typeof destinationId !== 'string') throw new Error('This destination request is invalid.');
      return { handled: true, result: { outcome: 'read_destination', ...actions.get({ destinationId }) } };
    }
    if (clientAction.actionType === 'install_destination') {
      const kind = clientAction.payload.kind;
      if (typeof kind !== 'string') throw new Error('This destination installation is invalid.');
      return { handled: true, result: { outcome: 'installed_destination', ...actions.install({ kind: kind as never }) } };
    }
    const destinationId = clientAction.payload.destinationId;
    if (typeof destinationId !== 'string' || clientAction.payload.expectedInstalled !== true) {
      throw new Error('This destination removal is invalid.');
    }
    return { handled: true, result: {
      outcome: 'uninstalled_destination',
      ...actions.uninstall({ destinationId, expectedInstalled: true }),
    } };
  }
  if (clientAction.actionType === 'read_execution_targets'
    || clientAction.actionType === 'read_execution_target'
    || clientAction.actionType === 'create_execution_target'
    || clientAction.actionType === 'update_execution_target'
    || clientAction.actionType === 'delete_execution_target') {
    const actions = createExecutionTargetActions(DEFAULT_EXECUTION_TARGET_ACTIONS_BOUNDARY);
    if (clientAction.actionType === 'read_execution_targets') {
      return { handled: true, result: actions.list()
        .then((result) => ({ outcome: 'read_execution_targets', ...result })) };
    }
    if (clientAction.actionType === 'read_execution_target') {
      const targetId = clientAction.payload.targetId;
      if (typeof targetId !== 'string') throw new Error('This execution-target request is invalid.');
      return { handled: true, result: actions.get({ targetId })
        .then((result) => ({ outcome: 'read_execution_target', ...result })) };
    }
    if (clientAction.actionType === 'create_execution_target') {
      const { providerId, displayName, repoName } = clientAction.payload;
      if (providerId !== 'cursor_mcp_v1' || typeof displayName !== 'string' || typeof repoName !== 'string') {
        throw new Error('This execution-target installation is invalid.');
      }
      return { handled: true, result: actions.create({ providerId, displayName, repoName })
        .then((result) => ({ outcome: 'created_execution_target', ...result })) };
    }
    const targetId = clientAction.payload.targetId;
    const expectedUpdatedAt = clientAction.payload.expectedUpdatedAt;
    if (typeof targetId !== 'string' || typeof expectedUpdatedAt !== 'string') {
      throw new Error('This execution-target change is invalid.');
    }
    if (clientAction.actionType === 'update_execution_target') {
      const fields = clientAction.payload.fields;
      if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
        throw new Error('This execution-target update is invalid.');
      }
      return { handled: true, result: actions.update({ targetId, expectedUpdatedAt, fields: fields as never })
        .then((result) => ({ outcome: 'updated_execution_target', ...result })) };
    }
    return { handled: true, result: actions.delete({ targetId, expectedUpdatedAt })
      .then((result) => ({ outcome: 'deleted_execution_target', ...result })) };
  }
  if (clientAction.actionType === 'read_sharing_connections'
    || clientAction.actionType === 'prepare_friend_invitation'
    || clientAction.actionType === 'revoke_sharing_connection') {
    const actions = createSharingActions(DEFAULT_SHARING_ACTIONS_BOUNDARY);
    if (clientAction.actionType === 'read_sharing_connections') {
      return { handled: true, result: actions.list()
        .then((result) => ({ outcome: 'read_sharing_connections', ...result })) };
    }
    if (clientAction.actionType === 'prepare_friend_invitation') {
      const expiresInDays = clientAction.payload.expiresInDays;
      if (!Number.isInteger(expiresInDays)) throw new Error('This friendship invitation is invalid.');
      return { handled: true, result: actions.prepareInvitation({ expiresInDays: Number(expiresInDays) })
        .then((result) => ({ outcome: 'friend_invitation_reviewed', ...result })) };
    }
    const connectionId = clientAction.payload.connectionId;
    const expectedFingerprint = clientAction.payload.expectedFingerprint;
    if (typeof connectionId !== 'string' || typeof expectedFingerprint !== 'string') {
      throw new Error('This sharing revocation is invalid.');
    }
    return { handled: true, result: actions.revoke({ connectionId, expectedFingerprint })
      .then((result) => ({ outcome: 'revoked_sharing_connection', ...result })) };
  }
  if (clientAction.actionType === 'read_ai_model_preference'
    || clientAction.actionType === 'apply_ai_model_preference') {
    const actions = createAiModelPreferenceActions({
      read: () => ({ modelId: useAppStore.getState().llmModel, isPro: useEntitlementsStore.getState().isPro }),
      apply: ({ modelId }) => useAppStore.getState().setLlmModel(modelId),
    });
    if (clientAction.actionType === 'read_ai_model_preference') {
      return { handled: true, result: { outcome: 'read_device_preference', ...actions.read() } };
    }
    const expectedModelId = clientAction.payload.expectedModelId;
    const modelId = clientAction.payload.modelId;
    if (typeof expectedModelId !== 'string' || typeof modelId !== 'string') {
      throw new Error('This AI model request is invalid.');
    }
    return { handled: true, result: {
      outcome: 'applied_device_preference', ...actions.update({ expectedModelId, modelId }),
    } };
  }
  if (clientAction.actionType === 'read_phone_agent_settings'
    || clientAction.actionType === 'apply_phone_agent_settings') {
    const actions = createPhoneAgentSettingsActions({ load: getPhoneAgentStatus, update: updatePhoneAgentSettings });
    return { handled: true, result: clientAction.actionType === 'read_phone_agent_settings'
      ? actions.read().then((result) => ({ outcome: 'read_phone_agent_settings', ...result }))
      : actions.update(clientAction.payload as never)
        .then((result) => ({ outcome: 'applied_phone_agent_settings', ...result })) };
  }
  if (clientAction.actionType === 'read_connected_tools'
    || clientAction.actionType === 'read_connected_tool'
    || clientAction.actionType === 'revoke_connected_tool') {
    const actions = createConnectedToolActions({ load: fetchExternalConnections, revoke: revokeExternalConnection });
    if (clientAction.actionType === 'read_connected_tools') {
      return { handled: true, result: actions.list()
        .then((result) => ({ outcome: 'read_device_connections', ...result })) };
    }
    const connectionId = clientAction.payload.connectionId;
    if (typeof connectionId !== 'string' || !connectionId.trim()) {
      throw new Error('This connected-tool request is invalid.');
    }
    if (clientAction.actionType === 'read_connected_tool') {
      return { handled: true, result: actions.get({ connectionId })
        .then((result) => ({ outcome: 'read_device_connection', ...result })) };
    }
    const expectedConnectedAt = clientAction.payload.expectedConnectedAt;
    if (expectedConnectedAt !== null && typeof expectedConnectedAt !== 'string') {
      throw new Error('This connected-tool revocation is invalid.');
    }
    return { handled: true, result: actions.revoke({ connectionId, expectedConnectedAt })
      .then((result) => ({ outcome: 'revoked_device_connection', ...result })) };
  }
  if (clientAction.actionType === 'read_appearance_preference'
    || clientAction.actionType === 'apply_appearance_preference') {
    const actions = createAppearancePreferenceActions({
      read: () => {
        const profile = useAppStore.getState().userProfile;
        const thumbnailStyles = profile?.visuals.thumbnailStyles?.length
          ? profile.visuals.thumbnailStyles
          : profile?.visuals.thumbnailStyle ? [profile.visuals.thumbnailStyle] : ['topographyDots'] as const;
        return { updatedAt: profile?.updatedAt ?? new Date(0).toISOString(), thumbnailStyles };
      },
      apply: ({ thumbnailStyles }) => useAppStore.getState().updateUserProfile((profile) => ({
        ...profile, visuals: { ...profile.visuals, thumbnailStyles, thumbnailStyle: thumbnailStyles[0] },
      })),
    });
    if (clientAction.actionType === 'read_appearance_preference') {
      return { handled: true, result: { outcome: 'read_device_preference', ...actions.read() } };
    }
    const expectedUpdatedAt = clientAction.payload.expectedUpdatedAt;
    const thumbnailStyles = clientAction.payload.thumbnailStyles;
    if (typeof expectedUpdatedAt !== 'string' || !Array.isArray(thumbnailStyles)
      || thumbnailStyles.some((value) => typeof value !== 'string')) {
      throw new Error('This appearance request is invalid.');
    }
    return { handled: true, result: {
      outcome: 'applied_device_preference',
      ...actions.update({ expectedUpdatedAt, thumbnailStyles: thumbnailStyles as string[] }),
    } };
  }
  if (clientAction.actionType === 'read_widget_status') {
    return { handled: true, result: createWidgetPreferenceActions({
      readLastSyncMs: async () => (await readGlanceableState())?.updatedAtMs ?? null,
    }).read().then((result) => ({ outcome: 'read_device_preference', ...result })) };
  }
  if (clientAction.actionType === 'read_haptics_preference'
    || clientAction.actionType === 'apply_haptics_preference') {
    const actions = createHapticsPreferenceActions({
      read: () => ({ enabled: useAppStore.getState().hapticsEnabled }),
      apply: ({ enabled }) => {
        useAppStore.getState().setHapticsEnabled(enabled);
        HapticsService.setEnabled(enabled);
      },
    });
    if (clientAction.actionType === 'read_haptics_preference') {
      return { handled: true, result: { outcome: 'read_device_preference', ...actions.read() } };
    }
    const expectedEnabled = clientAction.payload.expectedEnabled;
    const enabled = clientAction.payload.enabled;
    if (typeof expectedEnabled !== 'boolean' || typeof enabled !== 'boolean') {
      throw new Error('This haptics request is invalid.');
    }
    return { handled: true, result: {
      outcome: 'applied_device_preference', ...actions.update({ expectedEnabled, enabled }),
    } };
  }
  return { handled: false };
}
