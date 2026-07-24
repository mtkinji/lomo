import type { AgentToolProvider } from '@kwilt/agent-runtime';
import {
  KWILT_OPERATION_REGISTRY,
  getKwiltOperation,
  type KwiltOperationOwner,
} from '../../capabilities/operations';

export type ChatCapabilityCoverageState =
  | 'live'
  | 'pending_provider'
  | 'confirmation_only'
  | 'excluded';

export type ChatCapabilityChannel = 'mobile' | 'phone';

export type ChatCapabilityMobileOutcome =
  | 'answer'
  | 'proposal_or_receipt'
  | 'native_review'
  | 'honest_boundary';

export type ChatCapabilityPhoneOutcome =
  | 'server_execution'
  | 'device_handoff'
  | 'mobile_proposal'
  | 'honest_boundary';

export type ChatCapabilityChannelCoverage<Outcome extends string> = {
  state: ChatCapabilityCoverageState;
  outcome: Outcome;
  proofPaths: readonly string[];
  boundaryReason: string | null;
};

export type ChatCapabilityCoverageRow = {
  id: string;
  owner: KwiltOperationOwner;
  providers: readonly AgentToolProvider[];
  consequence: 'low' | 'consequential';
  confirmation: 'none' | 'explicit' | 'native';
  toolIds: readonly string[];
  sourceRefs: readonly string[];
  channels: {
    mobile: ChatCapabilityChannelCoverage<ChatCapabilityMobileOutcome>;
    phone: ChatCapabilityChannelCoverage<ChatCapabilityPhoneOutcome>;
  };
};

type RowInput = Omit<ChatCapabilityCoverageRow, 'channels' | 'owner'>;

const serverExecutionProof = [
  'supabase/functions/_shared/__tests__/agentRunCoordinator.test.ts',
  'supabase/functions/_shared/__tests__/serverAgentTools.test.ts',
  'supabase/functions/_shared/__tests__/serverProfileTools.test.ts',
  'supabase/functions/_shared/__tests__/serverRelationshipTools.test.ts',
] as const;
const serverDeviceHandoffProof = [
  ...serverExecutionProof,
  'supabase/functions/_shared/__tests__/serviceAgentRunPersistence.test.ts',
] as const;
const serverMobileProposalProof = [
  ...serverExecutionProof,
  'supabase/functions/_shared/__tests__/serviceAgentRunPersistence.test.ts',
  'scripts/unified-chat-migration-contract.test.mjs',
  'src/features/unifiedChat/activityProposalExecutor.test.ts',
  'src/features/unifiedChat/executeProposalDecision.test.ts',
  'src/features/unifiedChat/executeGoalProposalDecision.test.ts',
  'src/features/unifiedChat/recoverGoalMutations.test.ts',
  'src/features/unifiedChat/executeArcProposalDecision.test.ts',
  'src/features/unifiedChat/recoverArcMutations.test.ts',
  'src/features/unifiedChat/executeChapterProposalDecision.test.ts',
  'src/features/unifiedChat/recoverChapterMutations.test.ts',
  'src/features/unifiedChat/planProposalExecutor.test.ts',
  'src/features/unifiedChat/executePlanProposalDecision.test.ts',
  'src/features/unifiedChat/recoverPlanMutations.test.ts',
  'src/features/unifiedChat/profileProposalExecutor.test.ts',
  'src/features/unifiedChat/executeProfileProposalDecision.test.ts',
  'src/features/unifiedChat/recoverProfileMutations.test.ts',
] as const;

const PHONE_EXECUTION_OPERATION_IDS = new Set([
  'general.answer', 'general.answer_with_context',
  'arcs.list', 'arcs.get',
  'goals.list', 'goals.get',
  'activities.list', 'activities.get', 'activities.search', 'activities.capture',
  'chapters.list', 'chapters.get', 'chapters.reflect',
  'account.show_up_status',
  'profile.read',
  'relationships.read', 'relationships.remember', 'relationships.correct', 'relationships.forget',
  'plan.read_day_context', 'plan.recommend_day',
]);

const PHONE_DEVICE_HANDOFF_OPERATION_IDS = new Set([
  'goals.check_in', 'goals.share',
  'activities.focus.open', 'activities.location.update', 'activities.attachments.update', 'activities.share',
  'plan.preferences.open',
  'notifications.configure', 'search.open',
  'account.settings.open', 'account.subscription.manage', 'account.delete',
]);

const PHONE_MOBILE_PROPOSAL_OPERATION_IDS = new Set([
  'arcs.create', 'arcs.update', 'arcs.delete',
  'goals.create', 'goals.update', 'goals.delete',
  'activities.update', 'activities.complete', 'activities.delete',
  'activities.steps.create', 'activities.steps.update', 'activities.steps.complete',
  'activities.steps.delete', 'activities.steps.reorder', 'activities.repeat.update',
  'activities.reminder.update', 'activities.focus_today',
  'chapters.note.update',
  'profile.update',
  'activities.schedule', 'plan.schedule_activity', 'plan.schedule_chunks', 'plan.reschedule_activity', 'plan.remove_activity',
]);

const MOBILE_AUTO_APPLY_OPERATION_IDS = new Set([
  'activities.capture', 'relationships.remember', 'relationships.correct', 'relationships.forget',
]);

function mobileLive(input: RowInput, proofPaths: readonly string[]): ChatCapabilityChannelCoverage<ChatCapabilityMobileOutcome> {
  return {
    state: 'live',
    outcome: input.confirmation === 'none' && !MOBILE_AUTO_APPLY_OPERATION_IDS.has(input.id)
      ? 'answer'
      : 'proposal_or_receipt',
    proofPaths,
    boundaryReason: null,
  };
}

function phoneCoverage(input: RowInput): ChatCapabilityChannelCoverage<ChatCapabilityPhoneOutcome> {
  if (PHONE_EXECUTION_OPERATION_IDS.has(input.id)) {
    return { state: 'live', outcome: 'server_execution', proofPaths: serverExecutionProof, boundaryReason: null };
  }
  if (PHONE_DEVICE_HANDOFF_OPERATION_IDS.has(input.id)) {
    return {
      state: 'confirmation_only', outcome: 'device_handoff', proofPaths: serverDeviceHandoffProof,
      boundaryReason: 'Phone can stage this work for the existing native review; the underlying effect still completes on device.',
    };
  }
  if (PHONE_MOBILE_PROPOSAL_OPERATION_IDS.has(input.id)) {
    return {
      state: 'confirmation_only', outcome: 'mobile_proposal', proofPaths: serverMobileProposalProof,
      boundaryReason: 'Phone stages the capability-owned proposal; authoritative apply, receipt, and undo remain in mobile Chat.',
    };
  }
  return {
    state: 'pending_provider', outcome: 'honest_boundary', proofPaths: [],
    boundaryReason: 'This operation is not yet projected into the canonical server coordinator for Phone Agent.',
  };
}

const live = (input: RowInput, proofPaths: readonly string[]): ChatCapabilityCoverageRow => ({
  ...input,
  owner: getKwiltOperation(input.id).owner,
  channels: { mobile: mobileLive(input, proofPaths), phone: phoneCoverage(input) },
});

const bounded = (
  state: Exclude<ChatCapabilityCoverageState, 'live'>,
  input: RowInput,
  boundaryReason: string,
  proofPaths: readonly string[] = [],
): ChatCapabilityCoverageRow => ({
  ...input,
  owner: getKwiltOperation(input.id).owner,
  channels: {
    mobile: {
      state,
      outcome: state === 'confirmation_only' ? 'native_review' : 'honest_boundary',
      proofPaths,
      boundaryReason,
    },
    phone: state === 'excluded'
      ? { state, outcome: 'honest_boundary', proofPaths, boundaryReason }
      : phoneCoverage(input),
  },
});

const readProof = ['src/features/unifiedChat/runUnifiedChatTurn.test.ts'] as const;
const activityProof = [
  'src/features/unifiedChat/activityProposalExecutor.test.ts',
  'src/features/unifiedChat/executeProposalDecision.test.ts',
] as const;
const activityStepProof = [
  'src/features/unifiedChat/unifiedChatToolProvider.test.ts',
  'src/features/unifiedChat/activityProposalExecutor.test.ts',
  'src/features/unifiedChat/threadRepository.test.ts',
] as const;
const activityScheduleProof = [
  'src/features/unifiedChat/unifiedChatToolProvider.test.ts',
  'src/features/unifiedChat/activityProposalExecutor.test.ts',
  'src/services/NotificationService.ts',
] as const;
const planProof = [
  'src/features/unifiedChat/unifiedChatToolProvider.test.ts',
  'src/features/unifiedChat/planProposalExecutor.test.ts',
  'src/features/unifiedChat/executePlanProposalDecision.test.ts',
  'src/features/unifiedChat/recoverPlanMutations.test.ts',
  'src/features/unifiedChat/threadRepository.test.ts',
  'src/features/unifiedChat/runUnifiedChatTurn.test.ts',
] as const;
const goalProof = [
  'src/features/unifiedChat/unifiedChatToolProvider.test.ts',
  'src/features/unifiedChat/goalProposalExecutor.test.ts',
  'src/features/unifiedChat/executeGoalProposalDecision.test.ts',
  'src/features/unifiedChat/recoverGoalMutations.test.ts',
  'src/features/unifiedChat/threadRepository.test.ts',
] as const;
const arcReadProof = [
  'src/features/unifiedChat/capabilityAdapters.test.ts',
  'src/features/unifiedChat/unifiedChatToolProvider.test.ts',
  'src/features/unifiedChat/requestPolicy.test.ts',
] as const;
const arcMutationProof = [
  'src/features/unifiedChat/unifiedChatToolProvider.test.ts',
  'src/features/unifiedChat/arcProposalExecutor.test.ts',
  'src/features/unifiedChat/executeArcProposalDecision.test.ts',
  'src/features/unifiedChat/recoverArcMutations.test.ts',
  'src/features/unifiedChat/threadRepository.test.ts',
] as const;
const profileProof = [
  'src/features/unifiedChat/unifiedChatToolProvider.test.ts',
  'src/features/unifiedChat/profileProposalExecutor.test.ts',
  'src/features/unifiedChat/executeProfileProposalDecision.test.ts',
  'src/features/unifiedChat/recoverProfileMutations.test.ts',
  'src/features/unifiedChat/threadRepository.test.ts',
] as const;
const chapterMutationProof = [
  'src/features/unifiedChat/unifiedChatToolProvider.test.ts',
  'src/features/unifiedChat/chapterProposalExecutor.test.ts',
  'src/features/unifiedChat/executeChapterProposalDecision.test.ts',
  'src/features/unifiedChat/recoverChapterMutations.test.ts',
  'src/features/unifiedChat/threadRepository.test.ts',
] as const;
const deviceHandoffProof = [
  'src/features/unifiedChat/deviceToolProvider.test.ts',
  'src/features/unifiedChat/runUnifiedChatTurn.test.ts',
  'src/features/unifiedChat/executeClientActionDecision.test.ts',
  'src/features/unifiedChat/clientActionNavigation.test.ts',
  'src/features/unifiedChat/UnifiedChatScreen.test.tsx',
] as const;
const showUpProof = [
  'src/features/unifiedChat/capabilityAdapters.test.ts',
  'src/features/unifiedChat/unifiedChatToolProvider.test.ts',
  'supabase/functions/_shared/__tests__/serverAgentTools.test.ts',
] as const;
const relationshipProof = [
  'src/features/unifiedChat/runUnifiedChatTurn.test.ts',
  'src/features/unifiedChat/unifiedChatToolProvider.test.ts',
  'src/services/relationshipMemoryToolProvider.test.ts',
  'supabase/functions/_shared/__tests__/serverRelationshipTools.test.ts',
  'scripts/unified-chat-migration-contract.test.mjs',
] as const;

export const CHAT_CAPABILITY_COVERAGE: readonly ChatCapabilityCoverageRow[] = [
  live({ id: 'general.answer', providers: ['server'], consequence: 'low', confirmation: 'none', toolIds: [], sourceRefs: [] }, readProof),
  live({ id: 'general.answer_with_context', providers: ['device', 'server'], consequence: 'low', confirmation: 'none', toolIds: ['goals.read', 'activities.read', 'plan.read_day_context', 'chapters.read'], sourceRefs: ['legacy:workspace_snapshots'] }, readProof),
  live({ id: 'relationships.read', providers: ['server'], consequence: 'low', confirmation: 'none', toolIds: ['relationships.read'], sourceRefs: ['service:phone_agent_relationship_memory'] }, relationshipProof),
  live({ id: 'relationships.remember', providers: ['server', 'channel'], consequence: 'low', confirmation: 'none', toolIds: ['relationships.remember'], sourceRefs: ['service:phone_agent_relationship_memory', 'legacy:phone_agent_fact_extractor'] }, relationshipProof),
  live({ id: 'relationships.correct', providers: ['server', 'channel'], consequence: 'low', confirmation: 'none', toolIds: ['relationships.read', 'relationships.correct'], sourceRefs: ['service:phone_agent_relationship_memory'] }, relationshipProof),
  live({ id: 'relationships.forget', providers: ['server', 'channel'], consequence: 'low', confirmation: 'none', toolIds: ['relationships.read', 'relationships.forget'], sourceRefs: ['service:phone_agent_relationship_memory'] }, relationshipProof),
  bounded('excluded', { id: 'relationships.forget_person', providers: ['server', 'channel'], consequence: 'consequential', confirmation: 'native', toolIds: [], sourceRefs: [] }, 'Whole-person forgetting is withheld until Kwilt can review and restore every dependent relationship record safely.'),
  live({ id: 'profile.read', providers: ['device', 'server'], consequence: 'low', confirmation: 'none', toolIds: ['profile.read'], sourceRefs: ['mcp:get_current_account', 'legacy:get_user_profile'] }, profileProof),
  live({ id: 'profile.update', providers: ['device', 'server'], consequence: 'low', confirmation: 'explicit', toolIds: ['profile.update'], sourceRefs: ['legacy:set_user_profile'] }, profileProof),

  live({ id: 'arcs.list', providers: ['device', 'server'], consequence: 'low', confirmation: 'none', toolIds: ['arcs.read'], sourceRefs: ['capability:arcs', 'mcp:list_arcs'] }, arcReadProof),
  live({ id: 'arcs.get', providers: ['device', 'server'], consequence: 'low', confirmation: 'none', toolIds: ['arcs.read'], sourceRefs: ['mcp:get_arc'] }, arcReadProof),
  live({ id: 'arcs.create', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['arcs.create'], sourceRefs: ['mcp:create_arc', 'legacy:arc_creation_workflow'] }, arcMutationProof),
  live({ id: 'arcs.update', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['arcs.update'], sourceRefs: ['mcp:update_arc'] }, arcMutationProof),
  live({ id: 'arcs.delete', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['arcs.delete'], sourceRefs: ['mcp:delete_arc'] }, arcMutationProof),

  live({ id: 'goals.list', providers: ['device', 'server'], consequence: 'low', confirmation: 'none', toolIds: ['goals.read'], sourceRefs: ['capability:goals', 'mcp:list_goals'] }, readProof),
  live({ id: 'goals.get', providers: ['device', 'server'], consequence: 'low', confirmation: 'none', toolIds: ['goals.read'], sourceRefs: ['mcp:get_goal'] }, readProof),
  live({ id: 'goals.create', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['goals.create'], sourceRefs: ['mcp:create_goal', 'legacy:goal_creation_workflow'] }, goalProof),
  live({ id: 'goals.update', providers: ['device', 'server'], consequence: 'low', confirmation: 'explicit', toolIds: ['goals.update'], sourceRefs: ['mcp:update_goal'] }, goalProof),
  live({ id: 'goals.delete', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['goals.delete'], sourceRefs: ['mcp:delete_goal'] }, goalProof),
  bounded('confirmation_only', { id: 'goals.check_in', providers: ['device', 'server'], consequence: 'low', confirmation: 'native', toolIds: ['goals.check_in'], sourceRefs: ['mcp:add_goal_checkin'] }, 'Chat prepares a durable device handoff and draft; publishing waits for the native audience-aware approval sheet.', deviceHandoffProof),
  bounded('confirmation_only', { id: 'goals.share', providers: ['device', 'server', 'channel'], consequence: 'consequential', confirmation: 'native', toolIds: ['goals.share.open'], sourceRefs: [] }, 'Chat stages a durable handoff; sharing completes only in the native audience and invitation review surface.', deviceHandoffProof),

  live({ id: 'activities.list', providers: ['device', 'server'], consequence: 'low', confirmation: 'none', toolIds: ['activities.read'], sourceRefs: ['capability:todos', 'mcp:list_recent_activities'] }, readProof),
  live({ id: 'activities.get', providers: ['device', 'server'], consequence: 'low', confirmation: 'none', toolIds: ['activities.read'], sourceRefs: [] }, readProof),
  live({ id: 'activities.search', providers: ['device', 'server'], consequence: 'low', confirmation: 'none', toolIds: ['activities.read'], sourceRefs: [] }, readProof),
  live({ id: 'activities.capture', providers: ['device', 'server'], consequence: 'low', confirmation: 'none', toolIds: ['activities.capture'], sourceRefs: ['mcp:capture_activity'] }, activityProof),
  live({ id: 'activities.update', providers: ['device', 'server'], consequence: 'low', confirmation: 'explicit', toolIds: ['activities.update'], sourceRefs: ['mcp:update_activity', 'legacy:update_activity_fields'] }, activityProof),
  live({ id: 'activities.complete', providers: ['device', 'server'], consequence: 'low', confirmation: 'explicit', toolIds: ['activities.update'], sourceRefs: ['mcp:mark_activity_done'] }, activityProof),
  live({ id: 'activities.delete', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['activities.delete'], sourceRefs: ['mcp:delete_activity'] }, activityProof),
  live({ id: 'activities.steps.create', providers: ['device', 'server'], consequence: 'low', confirmation: 'explicit', toolIds: ['activities.steps.create'], sourceRefs: ['mcp:create_activity_step'] }, activityStepProof),
  live({ id: 'activities.steps.update', providers: ['device', 'server'], consequence: 'low', confirmation: 'explicit', toolIds: ['activities.steps.update'], sourceRefs: ['mcp:update_activity_step', 'legacy:activity_steps_edit'] }, activityStepProof),
  live({ id: 'activities.steps.complete', providers: ['device', 'server'], consequence: 'low', confirmation: 'explicit', toolIds: ['activities.steps.complete'], sourceRefs: ['mcp:mark_activity_step_done'] }, activityStepProof),
  live({ id: 'activities.steps.delete', providers: ['device', 'server'], consequence: 'low', confirmation: 'explicit', toolIds: ['activities.steps.delete'], sourceRefs: ['mcp:delete_activity_step'] }, activityStepProof),
  live({ id: 'activities.steps.reorder', providers: ['device', 'server'], consequence: 'low', confirmation: 'explicit', toolIds: ['activities.steps.reorder'], sourceRefs: ['mcp:reorder_activity_steps'] }, activityStepProof),
  bounded('confirmation_only', { id: 'activities.focus.open', providers: ['device'], consequence: 'low', confirmation: 'native', toolIds: ['activities.open_focus'], sourceRefs: ['legacy:enter_focus_mode'] }, 'Chat stages a durable handoff; opening Focus is not proof a session started.', deviceHandoffProof),
  live({ id: 'activities.focus_today', providers: ['device', 'server'], consequence: 'low', confirmation: 'explicit', toolIds: ['activities.focus_today'], sourceRefs: ['mcp:set_focus_today'] }, activityProof),
  live({ id: 'activities.schedule', providers: ['connector', 'server'], consequence: 'low', confirmation: 'explicit', toolIds: ['plan.schedule_activity'], sourceRefs: ['legacy:schedule_activity_on_calendar'] }, planProof),
  live({ id: 'plan.schedule_chunks', providers: ['connector'], consequence: 'low', confirmation: 'explicit', toolIds: ['plan.schedule_chunks'], sourceRefs: ['legacy:schedule_activity_chunks_on_calendar'] }, planProof),
  live({ id: 'activities.reminder.update', providers: ['device', 'server'], consequence: 'low', confirmation: 'explicit', toolIds: ['activities.reminder.update'], sourceRefs: ['service:NotificationService'] }, activityScheduleProof),
  live({ id: 'activities.repeat.update', providers: ['device', 'server'], consequence: 'low', confirmation: 'explicit', toolIds: ['activities.repeat.update'], sourceRefs: ['domain:activityRecurrence'] }, activityScheduleProof),
  bounded('confirmation_only', { id: 'activities.location.update', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'native', toolIds: ['activities.location.update'], sourceRefs: [] }, 'Chat stages a durable handoff; location triggers complete only after native permission and consequence review.', deviceHandoffProof),
  bounded('confirmation_only', { id: 'activities.attachments.update', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'native', toolIds: ['activities.attachments.open'], sourceRefs: [] }, 'Chat stages a durable handoff; binary attachment selection remains native and user-driven.', deviceHandoffProof),
  bounded('confirmation_only', { id: 'activities.share', providers: ['device', 'server', 'channel'], consequence: 'consequential', confirmation: 'native', toolIds: ['activities.share.open'], sourceRefs: [] }, 'Chat stages a durable handoff; sharing completes only after native audience review.', deviceHandoffProof),

  live({ id: 'plan.read_day_context', providers: ['device', 'server'], consequence: 'low', confirmation: 'none', toolIds: ['plan.read_day_context'], sourceRefs: ['capability:plan'] }, readProof),
  live({ id: 'plan.recommend_day', providers: ['device', 'server'], consequence: 'low', confirmation: 'none', toolIds: ['plan.recommend_day'], sourceRefs: [] }, readProof),
  live({ id: 'plan.schedule_activity', providers: ['connector', 'server'], consequence: 'low', confirmation: 'explicit', toolIds: ['plan.schedule_activity'], sourceRefs: [] }, planProof),
  live({ id: 'plan.reschedule_activity', providers: ['connector', 'server'], consequence: 'low', confirmation: 'explicit', toolIds: ['plan.reschedule_activity'], sourceRefs: [] }, planProof),
  live({ id: 'plan.remove_activity', providers: ['connector', 'server'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['plan.remove_activity'], sourceRefs: [] }, planProof),
  bounded('confirmation_only', { id: 'plan.preferences.open', providers: ['device'], consequence: 'low', confirmation: 'native', toolIds: ['plan.preferences.open'], sourceRefs: [] }, 'Chat stages a durable handoff; availability and calendar changes remain native settings actions.', deviceHandoffProof),

  live({ id: 'chapters.list', providers: ['server'], consequence: 'low', confirmation: 'none', toolIds: ['chapters.read'], sourceRefs: ['capability:chapters'] }, readProof),
  live({ id: 'chapters.get', providers: ['server'], consequence: 'low', confirmation: 'none', toolIds: ['chapters.read'], sourceRefs: ['mcp:get_current_chapter'] }, readProof),
  live({ id: 'chapters.reflect', providers: ['server'], consequence: 'low', confirmation: 'none', toolIds: ['chapters.read'], sourceRefs: [] }, readProof),
  live({ id: 'chapters.note.update', providers: ['server'], consequence: 'low', confirmation: 'explicit', toolIds: ['chapters.note.update'], sourceRefs: ['mcp:update_chapter_user_note'] }, chapterMutationProof),
  live({ id: 'account.show_up_status', providers: ['device', 'server'], consequence: 'low', confirmation: 'none', toolIds: ['account.show_up_status'], sourceRefs: ['mcp:get_show_up_status'] }, showUpProof),

  bounded('pending_provider', { id: 'screen_time.configure', providers: ['device'], consequence: 'consequential', confirmation: 'native', toolIds: ['screen_time.configure'], sourceRefs: [] }, 'Cross-device child controls are not implemented. Current Screen Time Protection manages only selected apps on this device; Chat must report that boundary without opening the wrong settings surface.', deviceHandoffProof),
  bounded('confirmation_only', { id: 'notifications.configure', providers: ['device'], consequence: 'consequential', confirmation: 'native', toolIds: ['notifications.configure'], sourceRefs: [] }, 'Chat stages a durable handoff; notification permission and scheduling remain device-owned.', deviceHandoffProof),
  bounded('confirmation_only', { id: 'search.open', providers: ['device'], consequence: 'low', confirmation: 'native', toolIds: ['navigation.search.open'], sourceRefs: [] }, 'Chat stages and opens the native search surface; the user completes the search there.', deviceHandoffProof),
  bounded('confirmation_only', { id: 'account.settings.open', providers: ['device'], consequence: 'low', confirmation: 'native', toolIds: ['navigation.account_settings.open'], sourceRefs: [] }, 'Chat stages and opens native account settings; changes remain user-driven.', deviceHandoffProof),
  bounded('confirmation_only', { id: 'account.subscription.manage', providers: ['device'], consequence: 'consequential', confirmation: 'native', toolIds: ['account.subscription.open'], sourceRefs: [] }, 'Chat stages a durable handoff; subscription management completes only in the native App Store or RevenueCat surface.', deviceHandoffProof),
  bounded('confirmation_only', { id: 'account.delete', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'native', toolIds: ['account.delete.open'], sourceRefs: [] }, 'Chat stages a durable handoff to the existing two-step native deletion confirmation and never deletes silently.', deviceHandoffProof),
  bounded('pending_provider', { id: 'channel.phone.continue_run', providers: ['channel', 'server'], consequence: 'low', confirmation: 'none', toolIds: ['channel.phone.continue_run'], sourceRefs: [] }, 'The canonical queued coordinator is implemented, but migration, deployment, scheduler, and signed-provider runtime proof are still pending.'),
];

export function assertCompleteConversationalCoverage(
  operations: readonly { id: string }[] = KWILT_OPERATION_REGISTRY,
  coverage: readonly { id: string }[] = CHAT_CAPABILITY_COVERAGE,
): void {
  const coverageIds = new Set(coverage.map((row) => row.id));
  const missing = operations.map((operation) => operation.id).filter((id) => !coverageIds.has(id));
  if (missing.length > 0) {
    throw new Error(`Missing conversational coverage for Kwilt operation${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}`);
  }
}

assertCompleteConversationalCoverage();

export function summarizeChatCapabilityCoverage(
  channel: ChatCapabilityChannel = 'mobile',
): Record<ChatCapabilityCoverageState, number> {
  return CHAT_CAPABILITY_COVERAGE.reduce<Record<ChatCapabilityCoverageState, number>>(
    (summary, row) => ({
      ...summary,
      [row.channels[channel].state]: summary[row.channels[channel].state] + 1,
    }),
    { live: 0, pending_provider: 0, confirmation_only: 0, excluded: 0 },
  );
}
