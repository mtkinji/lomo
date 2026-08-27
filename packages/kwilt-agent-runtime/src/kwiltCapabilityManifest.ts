import type { AgentToolProvider } from './types.ts';
import { defineCapabilityManifest, type CapabilityManifestEntry } from './capabilityManifest.ts';
import { KWILT_TOOL_CONTRACTS } from './kwiltToolContracts.ts';
import { FOOD_OPERATION_CONTRACTS } from './foodOperationContracts.ts';

export type KwiltOperationOwner =
  | 'general'
  | 'relationships'
  | 'household'
  | 'profile'
  | 'arcs'
  | 'goals'
  | 'todos'
  | 'plan'
  | 'chapters'
  | 'money'
  | 'explore'
  | 'games'
  | 'chores'
  | 'account'
  | 'screenTime'
  | 'notifications'
  | 'navigation'
  | 'channels'
  | 'recipes'
  | 'meal_planning'
  | 'groceries'
  | 'savings';

export type ExternalControlScope = 'core' | 'supporting' | 'excluded';

/**
 * Product scope for conversational control outside the Kwilt app. Core owners are a
 * coverage obligation, supporting owners keep the operator usable, and exclusions are
 * deliberate product boundaries rather than silent catalog gaps.
 */
export const KWILT_EXTERNAL_CONTROL_SCOPE = {
  general: 'supporting',
  relationships: 'core',
  household: 'core',
  profile: 'core',
  arcs: 'core',
  goals: 'core',
  todos: 'core',
  plan: 'core',
  chapters: 'core',
  money: 'core',
  explore: 'excluded',
  games: 'excluded',
  chores: 'core',
  account: 'core',
  screenTime: 'core',
  notifications: 'supporting',
  navigation: 'supporting',
  channels: 'supporting',
  recipes: 'core',
  meal_planning: 'core',
  groceries: 'core',
  savings: 'core',
} as const satisfies Record<KwiltOperationOwner, ExternalControlScope>;

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
type RowWithChannels<Input extends RowInput> = Input & Pick<ChatCapabilityCoverageRow, 'owner' | 'channels'>;

function ownerForOperation(id: string): KwiltOperationOwner {
  if (id.startsWith('activities.')) return 'todos';
  if (id.startsWith('screen_time.')) return 'screenTime';
  if (id.startsWith('search.')) return 'navigation';
  if (id.startsWith('channel.')) return 'channels';
  if (id.startsWith('receipt.')) return 'groceries';
  if (id.startsWith('food_budget.')) return 'savings';
  if (id.startsWith('food_stock.') || id.startsWith('store_opportunity.') || id.startsWith('food_scenario.')) return 'groceries';
  if (id.startsWith('cook_session.')) return 'recipes';
  const owner = id.split('.')[0];
  if (owner === 'general' || owner === 'relationships' || owner === 'household' || owner === 'profile' || owner === 'arcs' ||
      owner === 'goals' || owner === 'plan' || owner === 'chapters' || owner === 'money' || owner === 'explore' || owner === 'games' || owner === 'chores' || owner === 'account' ||
      owner === 'notifications' || owner === 'recipes' || owner === 'meal_planning' ||
      owner === 'groceries' || owner === 'savings') {
    return owner;
  }
  throw new Error(`Unknown Kwilt capability owner for operation: ${id}`);
}

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
  'household.read', 'household.invitation.preview',
  'screen_time.read',
  'screen_time.agreement.create', 'screen_time.override.block', 'screen_time.override.allow',
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

const live = <const Input extends RowInput>(
  input: Input,
  proofPaths: readonly string[],
): RowWithChannels<Input> => ({
  ...input,
  owner: ownerForOperation(input.id),
  channels: { mobile: mobileLive(input, proofPaths), phone: phoneCoverage(input) },
});

const bounded = <const Input extends RowInput>(
  state: Exclude<ChatCapabilityCoverageState, 'live'>,
  input: Input,
  boundaryReason: string,
  proofPaths: readonly string[] = [],
): RowWithChannels<Input> => ({
  ...input,
  owner: ownerForOperation(input.id),
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
const moneyReadProof = [
  'src/features/unifiedChat/requestPolicy.test.ts',
  'src/features/unifiedChat/capabilityAdapters.test.ts',
  'src/features/unifiedChat/unifiedChatToolProvider.test.ts',
  'src/capabilities/money/data/moneySnapshot.test.ts',
] as const;
const moneyReviewProof = [
  'src/capabilities/money/data/moneyMutations.test.ts',
  'src/capabilities/money/data/moneyRepository.test.ts',
  'src/capabilities/money/data/moneySnapshot.test.ts',
  'src/capabilities/money/screens/MoneyTransactionDetailScreen.tsx',
] as const;
const moneyCategoryCreateProof = [
  'src/capabilities/money/domain/categoryPlanDraft.test.ts',
  'src/capabilities/money/data/moneyRepository.test.ts',
  'src/capabilities/money/screens/MoneyCategoryCreateScreen.tsx',
  'src/features/unifiedChat/unifiedChatToolProvider.test.ts',
  'src/features/unifiedChat/executeMoneyCategoryProposalDecision.test.ts',
] as const;
const moneyPrivacyProof = [
  'src/capabilities/money/domain/privacyLockState.test.ts',
  'src/capabilities/money/runtime/MoneyPrivacyGate.tsx',
  'src/capabilities/money/screens/MoneyPrivacySettingsScreen.tsx',
] as const;
const moneyConnectionProof = [
  'src/capabilities/money/data/moneyPlaidApi.test.ts',
  'src/capabilities/money/native/moneyPlaidLink.native.ts',
  'src/capabilities/money/screens/MoneyAccountsScreen.tsx',
] as const;
const relationshipProof = [
  'src/features/unifiedChat/runUnifiedChatTurn.test.ts',
  'src/features/unifiedChat/unifiedChatToolProvider.test.ts',
  'src/services/relationshipMemoryToolProvider.test.ts',
  'supabase/functions/_shared/__tests__/serverRelationshipTools.test.ts',
  'scripts/unified-chat-migration-contract.test.mjs',
] as const;
const householdReadProof = [
  'supabase/functions/_shared/__tests__/serverHouseholdTools.test.ts',
  'scripts/unified-chat-migration-contract.test.mjs',
] as const;
const screenTimeReadProof = [
  'src/features/unifiedChat/unifiedChatScreenTimeToolProvider.test.ts',
  'src/features/unifiedChat/loadFamilyScreenTimeChatSnapshot.test.ts',
  'src/features/unifiedChat/familyScreenTimeChatEvidence.test.ts',
  'supabase/functions/_shared/__tests__/serverScreenTimeTools.test.ts',
  'scripts/unified-chat-migration-contract.test.mjs',
] as const;
const screenTimeWriteProof = [
  'src/features/unifiedChat/unifiedChatScreenTimeToolProvider.test.ts',
  'src/features/unifiedChat/screenTimeProposal.test.ts',
  'src/features/unifiedChat/executeScreenTimeProposalDecision.test.ts',
  'supabase/functions/_shared/__tests__/serverScreenTimeTools.test.ts',
  'supabase/functions/_shared/__tests__/serviceAgentRunPersistence.test.ts',
] as const;

function foodCapabilityRow(contract: typeof FOOD_OPERATION_CONTRACTS[number]): ChatCapabilityCoverageRow {
  const row = {
    id: contract.id,
    providers: contract.providers,
    consequence: contract.consequence,
    confirmation: contract.confirmation,
    toolIds: contract.authority === 'excluded' ? [] : [contract.id],
    sourceRefs: contract.sourceRefs,
  } as const;
  return bounded(
    contract.authority === 'excluded' ? 'excluded' : 'pending_provider',
    row,
    contract.boundaryReason,
  );
}

const CAPABILITY_ROWS = [
  live({ id: 'general.answer', providers: ['server'], consequence: 'low', confirmation: 'none', toolIds: [], sourceRefs: [] }, readProof),
  live({ id: 'general.answer_with_context', providers: ['device', 'server'], consequence: 'low', confirmation: 'none', toolIds: ['goals.read', 'activities.read', 'plan.read_day_context', 'chapters.read'], sourceRefs: ['legacy:workspace_snapshots'] }, readProof),
  live({ id: 'relationships.read', providers: ['server'], consequence: 'low', confirmation: 'none', toolIds: ['relationships.read'], sourceRefs: ['service:phone_agent_relationship_memory'] }, relationshipProof),
  live({ id: 'relationships.remember', providers: ['server', 'channel'], consequence: 'low', confirmation: 'none', toolIds: ['relationships.remember'], sourceRefs: ['service:phone_agent_relationship_memory', 'legacy:phone_agent_fact_extractor'] }, relationshipProof),
  live({ id: 'relationships.correct', providers: ['server', 'channel'], consequence: 'low', confirmation: 'none', toolIds: ['relationships.read', 'relationships.correct'], sourceRefs: ['service:phone_agent_relationship_memory'] }, relationshipProof),
  live({ id: 'relationships.forget', providers: ['server', 'channel'], consequence: 'low', confirmation: 'none', toolIds: ['relationships.read', 'relationships.forget'], sourceRefs: ['service:phone_agent_relationship_memory'] }, relationshipProof),
  bounded('excluded', { id: 'relationships.forget_person', providers: ['server', 'channel'], consequence: 'consequential', confirmation: 'native', toolIds: [], sourceRefs: [] }, 'Whole-person forgetting is withheld until Kwilt can review and restore every dependent relationship record safely.'),
  live({ id: 'household.read', providers: ['device', 'server'], consequence: 'low', confirmation: 'none', toolIds: ['household.read'], sourceRefs: ['capability:household', 'action:relationshipActions'] }, householdReadProof),
  bounded('pending_provider', { id: 'household.member.add_dependent', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['household.member.add_dependent'], sourceRefs: ['capability:household', 'action:relationshipActions'] }, 'Dependent creation now uses the canonical Household action, but Chat review and provider execution remain pending.'),
  bounded('pending_provider', { id: 'household.invitation.create', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['household.invitation.create'], sourceRefs: ['capability:household', 'action:relationshipActions'] }, 'Invitation creation now uses the canonical Household action, but Chat review and secure delivery remain pending.'),
  live({ id: 'household.invitation.preview', providers: ['device', 'server'], consequence: 'low', confirmation: 'none', toolIds: ['household.invitation.preview'], sourceRefs: ['capability:household', 'action:relationshipActions'] }, householdReadProof),
  bounded('pending_provider', { id: 'household.invitation.accept', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['household.invitation.accept'], sourceRefs: ['capability:household', 'action:relationshipActions'] }, 'Invitation acceptance now uses the canonical Household action, but Chat review and provider execution remain pending.'),
  bounded('pending_provider', { id: 'household.child_capability.update', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['household.child_capability.update'], sourceRefs: ['capability:household', 'action:relationshipActions'] }, 'Child capability authority now uses the canonical Household action, but Chat review and provider execution remain pending.'),
  bounded('pending_provider', { id: 'household.caregiver_grant.update', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['household.caregiver_grant.update'], sourceRefs: ['capability:household', 'action:relationshipActions'] }, 'Caregiver authority now uses the canonical Household action, but Chat review and provider execution remain pending.'),
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
  live({ id: 'activities.schedule', providers: ['connector', 'server'], consequence: 'low', confirmation: 'explicit', toolIds: ['plan.schedule_activity'], sourceRefs: ['legacy:schedule_activity_on_calendar', 'action:planActions'] }, planProof),
  live({ id: 'plan.schedule_chunks', providers: ['connector', 'server'], consequence: 'low', confirmation: 'explicit', toolIds: ['plan.schedule_chunks'], sourceRefs: ['legacy:schedule_activity_chunks_on_calendar', 'action:planActions'] }, planProof),
  live({ id: 'activities.reminder.update', providers: ['device', 'server'], consequence: 'low', confirmation: 'explicit', toolIds: ['activities.reminder.update'], sourceRefs: ['service:NotificationService'] }, activityScheduleProof),
  live({ id: 'activities.repeat.update', providers: ['device', 'server'], consequence: 'low', confirmation: 'explicit', toolIds: ['activities.repeat.update'], sourceRefs: ['domain:activityRecurrence'] }, activityScheduleProof),
  bounded('confirmation_only', { id: 'activities.location.update', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'native', toolIds: ['activities.location.update'], sourceRefs: [] }, 'Chat stages a durable handoff; location triggers complete only after native permission and consequence review.', deviceHandoffProof),
  bounded('confirmation_only', { id: 'activities.attachments.update', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'native', toolIds: ['activities.attachments.open'], sourceRefs: [] }, 'Chat stages a durable handoff; binary attachment selection remains native and user-driven.', deviceHandoffProof),
  bounded('confirmation_only', { id: 'activities.share', providers: ['device', 'server', 'channel'], consequence: 'consequential', confirmation: 'native', toolIds: ['activities.share.open'], sourceRefs: [] }, 'Chat stages a durable handoff; sharing completes only after native audience review.', deviceHandoffProof),

  live({ id: 'plan.read_day_context', providers: ['device', 'server'], consequence: 'low', confirmation: 'none', toolIds: ['plan.read_day_context'], sourceRefs: ['capability:plan'] }, readProof),
  live({ id: 'plan.recommend_day', providers: ['device', 'server'], consequence: 'low', confirmation: 'none', toolIds: ['plan.recommend_day'], sourceRefs: [] }, readProof),
  live({ id: 'plan.schedule_activity', providers: ['connector', 'server'], consequence: 'low', confirmation: 'explicit', toolIds: ['plan.schedule_activity'], sourceRefs: ['action:planActions'] }, planProof),
  live({ id: 'plan.reschedule_activity', providers: ['connector', 'server'], consequence: 'low', confirmation: 'explicit', toolIds: ['plan.reschedule_activity'], sourceRefs: ['action:planActions'] }, planProof),
  live({ id: 'plan.remove_activity', providers: ['connector', 'server'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['plan.remove_activity'], sourceRefs: ['action:planActions'] }, planProof),
  bounded('confirmation_only', { id: 'plan.preferences.open', providers: ['device'], consequence: 'low', confirmation: 'native', toolIds: ['plan.preferences.open'], sourceRefs: [] }, 'Chat stages a durable handoff; availability and calendar changes remain native settings actions.', deviceHandoffProof),

  live({ id: 'chapters.list', providers: ['server'], consequence: 'low', confirmation: 'none', toolIds: ['chapters.read'], sourceRefs: ['capability:chapters'] }, readProof),
  live({ id: 'chapters.get', providers: ['server'], consequence: 'low', confirmation: 'none', toolIds: ['chapters.read'], sourceRefs: ['mcp:get_current_chapter'] }, readProof),
  live({ id: 'chapters.reflect', providers: ['server'], consequence: 'low', confirmation: 'none', toolIds: ['chapters.read'], sourceRefs: [] }, readProof),
  live({ id: 'chapters.note.update', providers: ['server'], consequence: 'low', confirmation: 'explicit', toolIds: ['chapters.note.update'], sourceRefs: ['mcp:update_chapter_user_note'] }, chapterMutationProof),
  live({ id: 'account.show_up_status', providers: ['device', 'server'], consequence: 'low', confirmation: 'none', toolIds: ['account.show_up_status'], sourceRefs: ['mcp:get_show_up_status'] }, showUpProof),
  live({ id: 'money.read', providers: ['device'], consequence: 'low', confirmation: 'none', toolIds: ['money.read'], sourceRefs: ['capability:money'] }, moneyReadProof),
  bounded('confirmation_only', { id: 'money.review_transaction', providers: ['device'], consequence: 'consequential', confirmation: 'native', toolIds: [], sourceRefs: [] }, 'Transaction category changes complete only after an explicit selection in native Money. Chat can explain the path but cannot silently reclassify spending.', moneyReviewProof),
  live({ id: 'money.category.create', providers: ['device'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['money.category.create'], sourceRefs: [] }, moneyCategoryCreateProof),
  live({ id: 'money.category.rename', providers: ['device'], consequence: 'low', confirmation: 'explicit', toolIds: ['money.category.rename'], sourceRefs: [] }, moneyCategoryCreateProof),
  bounded('confirmation_only', { id: 'money.app_control.review', providers: ['device'], consequence: 'consequential', confirmation: 'native', toolIds: ['money.app_control.review'], sourceRefs: ['capability:money', 'capability:screenTime'] }, 'Chat resolves the self subject and Money-owned condition, then opens the category-owned native editor. Apple app selection, permission, and policy persistence remain under explicit device review.', deviceHandoffProof),
  bounded('confirmation_only', { id: 'money.category.update', providers: ['device'], consequence: 'consequential', confirmation: 'native', toolIds: [], sourceRefs: [] }, 'Category name, monthly amount, and rollover changes complete as separate explicit native actions so partial multi-table success is never hidden.', moneyCategoryCreateProof),
  bounded('confirmation_only', { id: 'money.privacy.configure', providers: ['device'], consequence: 'consequential', confirmation: 'native', toolIds: [], sourceRefs: [] }, 'Money privacy lock changes require native device-authentication review. Chat cannot prompt for or bypass Face ID, Touch ID, or passcode.', moneyPrivacyProof),
  bounded('confirmation_only', { id: 'money.connection.connect', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'native', toolIds: [], sourceRefs: [] }, 'Connecting a financial institution completes only in native Plaid Link after institution authentication and consent.', moneyConnectionProof),
  bounded('confirmation_only', { id: 'money.connection.sync', providers: ['device', 'server'], consequence: 'low', confirmation: 'native', toolIds: [], sourceRefs: [] }, 'Manual Plaid sync starts only from native Money; Phone and Chat do not receive client-side financial credentials.', moneyConnectionProof),

  bounded('pending_provider', { id: 'explore.open', providers: ['device'], consequence: 'low', confirmation: 'native', toolIds: [], sourceRefs: ['capability:explore'] }, 'Explore is available from the native capability menu and kwilt://explore, but Chat does not yet receive or control precise location history.'),
  bounded('pending_provider', { id: 'games.open', providers: ['device'], consequence: 'low', confirmation: 'native', toolIds: [], sourceRefs: ['capability:games'] }, 'Games is available from the native capability menu and kwilt://games, but Chat does not yet open sessions, seat players, or act on game state.'),
  bounded('pending_provider', { id: 'chores.open', providers: ['device'], consequence: 'low', confirmation: 'native', toolIds: [], sourceRefs: ['capability:chores'] }, 'Chores is available as a local Labs learning surface, but Chat cannot read, claim, complete, or award from simulated inventory. Conversational access waits for the Activity-backed Household authorization boundary.'),

  ...FOOD_OPERATION_CONTRACTS.map(foodCapabilityRow),

  live({ id: 'screen_time.read', providers: ['device', 'server'], consequence: 'low', confirmation: 'none', toolIds: ['screen_time.read'], sourceRefs: ['capability:screenTime'] }, screenTimeReadProof),
  live({ id: 'screen_time.agreement.create', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['screen_time.agreement.create'], sourceRefs: [] }, screenTimeWriteProof),
  bounded('pending_provider', { id: 'screen_time.agreement.update', providers: ['device'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['screen_time.agreement.update'], sourceRefs: [] }, 'The shared command exists, but Chat proposal staging and confirmation are not wired yet.'),
  bounded('pending_provider', { id: 'screen_time.agreement.deactivate', providers: ['device'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['screen_time.agreement.deactivate'], sourceRefs: [] }, 'The shared command exists, but Chat proposal staging and confirmation are not wired yet.'),
  live({ id: 'screen_time.override.block', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['screen_time.override.block'], sourceRefs: [] }, screenTimeWriteProof),
  live({ id: 'screen_time.override.allow', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['screen_time.override.allow'], sourceRefs: [] }, screenTimeWriteProof),
  bounded('pending_provider', { id: 'screen_time.override.cancel', providers: ['device'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['screen_time.override.cancel'], sourceRefs: [] }, 'Override cancellation exists, but Chat proposal staging and confirmation are not wired yet.'),
  bounded('pending_provider', { id: 'screen_time.request.decide', providers: ['device'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['screen_time.request.decide'], sourceRefs: [] }, 'Child request provenance exists, but Chat approval proposals are not wired yet.'),
  bounded('confirmation_only', { id: 'screen_time.personal.setup.open', providers: ['device'], consequence: 'low', confirmation: 'native', toolIds: ['screen_time.personal.setup.open'], sourceRefs: ['capability:screenTime'] }, 'Chat resolves the signed-in person on the current device and opens the personal native setup flow. Apple authorization and app selection remain user-controlled.', deviceHandoffProof),
  bounded('pending_provider', { id: 'screen_time.personal.limit.open', providers: ['device'], consequence: 'low', confirmation: 'native', toolIds: ['screen_time.personal.limit.open'], sourceRefs: ['capability:screenTime'] }, 'Chat carries a bounded self, app-label, and daily allowance intent into native review. Apple authorization, token selection, persistence, and signed-device enforcement remain capability-owned.'),
  bounded('pending_provider', { id: 'screen_time.selection.open', providers: ['device'], consequence: 'low', confirmation: 'native', toolIds: ['screen_time.selection.open'], sourceRefs: [] }, 'Chat now routes an exact authorized-child native handoff; production child-device selection, completion return, and signed proof remain pending.'),
  bounded('pending_provider', { id: 'screen_time.device.setup.open', providers: ['device'], consequence: 'low', confirmation: 'native', toolIds: ['screen_time.device.setup.open'], sourceRefs: [] }, 'Chat now routes an exact authorized-child native handoff; production child-device authorization, completion return, and signed proof remain pending.'),
  bounded('pending_provider', { id: 'screen_time.device.release.open', providers: ['device'], consequence: 'consequential', confirmation: 'native', toolIds: ['screen_time.device.release.open'], sourceRefs: [] }, 'Chat now routes an exact authorized-child native handoff; production cleanup, completion return, and signed proof remain pending.'),
  bounded('pending_provider', { id: 'screen_time.configure', providers: ['device'], consequence: 'consequential', confirmation: 'native', toolIds: ['screen_time.configure'], sourceRefs: [] }, 'Cross-device child controls are not implemented. Current Screen Time Protection manages only selected apps on this device; Chat must report that boundary without opening the wrong settings surface.', deviceHandoffProof),
  bounded('confirmation_only', { id: 'notifications.configure', providers: ['device'], consequence: 'consequential', confirmation: 'native', toolIds: ['notifications.configure'], sourceRefs: [] }, 'Chat stages a durable handoff; notification permission and scheduling remain device-owned.', deviceHandoffProof),
  bounded('confirmation_only', { id: 'search.open', providers: ['device'], consequence: 'low', confirmation: 'native', toolIds: ['navigation.search.open'], sourceRefs: [] }, 'Chat stages and opens the native search surface; the user completes the search there.', deviceHandoffProof),
  bounded('confirmation_only', { id: 'account.settings.open', providers: ['device'], consequence: 'low', confirmation: 'native', toolIds: ['navigation.account_settings.open'], sourceRefs: [] }, 'Chat stages and opens native account settings; changes remain user-driven.', deviceHandoffProof),
  bounded('confirmation_only', { id: 'account.subscription.manage', providers: ['device'], consequence: 'consequential', confirmation: 'native', toolIds: ['account.subscription.open'], sourceRefs: [] }, 'Chat stages a durable handoff; subscription management completes only in the native App Store or RevenueCat surface.', deviceHandoffProof),
  bounded('confirmation_only', { id: 'account.delete', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'native', toolIds: ['account.delete.open'], sourceRefs: [] }, 'Chat stages a durable handoff to the existing two-step native deletion confirmation and never deletes silently.', deviceHandoffProof),
  bounded('pending_provider', { id: 'channel.phone.continue_run', providers: ['channel', 'server'], consequence: 'low', confirmation: 'none', toolIds: ['channel.phone.continue_run'], sourceRefs: [] }, 'The canonical queued coordinator is implemented, but migration, deployment, scheduler, and signed-provider runtime proof are still pending.'),
] as const satisfies readonly ChatCapabilityCoverageRow[];

const EMPTY_SCHEMA = { type: 'object', properties: {}, additionalProperties: false } as const;
const TOOL_BY_ID = new Map(KWILT_TOOL_CONTRACTS.map((tool) => [tool.id, tool] as const));
const PURPOSE_BY_OPERATION: Readonly<Record<string, string>> = {
  'general.answer': 'Answer an ordinary question without retrieving private Kwilt context.',
  'general.answer_with_context': 'Answer a broader question with the minimum authorized Kwilt evidence that materially improves it.',
  'relationships.forget_person': 'Forget every retained record for one person only when the complete dependency set can be reviewed and restored safely.',
  'channel.phone.continue_run': 'Continue one authorized Phone Agent request through the canonical durable thread and run ledger.',
};

function toolsForRow(row: ChatCapabilityCoverageRow) {
  return row.toolIds.map((toolId) => {
    const tool = TOOL_BY_ID.get(toolId);
    if (!tool) throw new Error(`Unknown canonical tool contract for ${row.id}: ${toolId}`);
    return tool;
  });
}

function manifestEntry(row: ChatCapabilityCoverageRow): CapabilityManifestEntry {
  const tools = toolsForRow(row);
  const mutationTool = tools.find((tool) => tool.effect === 'write');
  const schemaTool = mutationTool ?? tools[0];
  const returnBehavior: CapabilityManifestEntry['returnBehavior'] =
    row.channels.mobile.outcome === 'proposal_or_receipt' ? 'proposal_or_receipt'
      : row.channels.mobile.outcome === 'native_review' ? 'native_handoff'
        : row.channels.mobile.outcome === 'honest_boundary' ? 'honest_boundary'
          : 'answer';
  return {
    id: row.id,
    owner: row.owner,
    purpose: PURPOSE_BY_OPERATION[row.id] ?? schemaTool?.purpose ?? `Serve the ${row.id} Kwilt operation.`,
    effect: mutationTool ? 'write' : 'read',
    consequence: row.consequence,
    reversible: mutationTool?.reversible ?? (row.id !== 'relationships.forget_person'),
    confirmation: row.confirmation,
    providerEligibility: row.providers,
    inputSchema: schemaTool?.inputSchema ?? EMPTY_SCHEMA,
    outputSchema: schemaTool?.outputSchema ?? EMPTY_SCHEMA,
    tools,
    sourceRefs: row.sourceRefs,
    returnBehavior,
    channels: row.channels,
  };
}

export const KWILT_CAPABILITY_MANIFEST = defineCapabilityManifest(
  CAPABILITY_ROWS.map(manifestEntry),
);

export type KwiltCapabilityOperationId = typeof CAPABILITY_ROWS[number]['id'];
