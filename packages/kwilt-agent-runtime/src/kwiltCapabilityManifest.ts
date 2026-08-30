import type { AgentToolProvider } from './types.ts';
import {
  defineCapabilityManifest,
  type CapabilityManifestEntry,
  type CapabilityOAuthScope,
  type ConversationalCompletionMode,
} from './capabilityManifest.ts';
import { KWILT_TOOL_CONTRACTS } from './kwiltToolContracts.ts';
import { FOOD_OPERATION_CONTRACTS } from './foodOperationContracts.ts';
import { CONTROL_PARITY_OPERATION_CONTRACTS } from './controlParityOperationContracts.ts';

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
  | 'settings'
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
  settings: 'core',
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
  if (id.startsWith('navigation.')) return 'navigation';
  if (id.startsWith('channel.')) return 'channels';
  if (id.startsWith('receipt.')) return 'groceries';
  if (id.startsWith('food_budget.')) return 'savings';
  if (id.startsWith('food_stock.') || id.startsWith('store_opportunity.') || id.startsWith('food_scenario.')) return 'groceries';
  if (id.startsWith('cook_session.')) return 'recipes';
  const owner = id.split('.')[0];
  if (owner === 'general' || owner === 'relationships' || owner === 'household' || owner === 'profile' || owner === 'arcs' ||
      owner === 'goals' || owner === 'plan' || owner === 'chapters' || owner === 'money' || owner === 'explore' || owner === 'games' || owner === 'chores' || owner === 'account' || owner === 'settings' ||
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
const householdManagementProof = [
  'src/features/household/data/householdManagementActions.test.ts',
  'src/features/household/HouseholdMemberDetailScreen.test.tsx',
  'src/features/household/HouseholdDevicesScreen.test.tsx',
  'src/features/unifiedChat/householdToolProvider.test.ts',
  'src/features/unifiedChat/executeHouseholdProposalDecision.test.ts',
  'src/features/unifiedChat/executeHouseholdReceiptUndo.test.ts',
  'supabase/functions/_shared/__tests__/serverHouseholdTools.test.ts',
] as const;
const planAvailabilityProof = [
  'src/capabilities/plan/actions/planPreferenceActions.test.ts',
  'src/features/unifiedChat/deviceToolProvider.test.ts',
  'src/features/unifiedChat/clientActionNavigation.test.ts',
  'src/services/sync/agentProfileProjection.test.ts',
  'supabase/functions/_shared/__tests__/serverPlanAvailabilityTools.test.ts',
] as const;
const planCalendarPreferenceProof = [
  'src/capabilities/plan/actions/planCalendarPreferenceActions.test.ts',
  'src/features/unifiedChat/deviceToolProvider.test.ts',
  'src/features/unifiedChat/clientActionNavigation.test.ts',
  'supabase/functions/_shared/__tests__/serverPlanCalendarTools.test.ts',
] as const;

const PHONE_EXECUTION_OPERATION_IDS = new Set([
  'general.answer', 'general.answer_with_context',
  'arcs.list', 'arcs.get',
  'goals.list', 'goals.get',
  'activities.list', 'activities.get', 'activities.search', 'activities.capture',
  'chapters.list', 'chapters.get', 'chapters.reflect',
  'chapters.digest_settings.read', 'chapters.alignment.preview',
  'notifications.preferences.read',
  'account.show_up_status',
  'profile.read',
  'relationships.read', 'relationships.remember', 'relationships.correct', 'relationships.forget',
  'household.read', 'household.invitation.preview',
  'household.member.update', 'household.device.list', 'household.device.update',
  'household.device.revoke', 'household.device.reconcile',
  'screen_time.read',
  'screen_time.agreement.create', 'screen_time.agreement.update', 'screen_time.agreement.deactivate',
  'screen_time.override.block', 'screen_time.override.allow', 'screen_time.override.cancel',
  'screen_time.request.decide',
  'plan.availability.read',
  'plan.read_day_context', 'plan.recommend_day',
  'chores.list', 'chores.get', 'chores.reward.read',
  'recipes.search', 'recipes.read', 'recipes.scale.preview',
  'cook_session.read', 'cook_session.control',
  'meal_planning.preferences.read',
  'meal_planning.candidates.prepare',
  'food_budget.read', 'food_stock.read',
  'groceries.list.review',
  'channel.phone.continue_run',
]);

const PHONE_DEVICE_HANDOFF_OPERATION_IDS = new Set([
  'goals.check_in', 'goals.share',
  'activities.focus.open', 'activities.location.update', 'activities.attachments.update', 'activities.share',
  'plan.preferences.open', 'plan.availability.update', 'plan.calendars.read', 'plan.calendars.update',
  'screen_time.personal_rule.list', 'screen_time.personal_rule.get',
  'screen_time.personal_rule.update', 'screen_time.personal_rule.deactivate',
  'screen_time.personal_rule.delete', 'screen_time.personal.setup.open',
  'screen_time.personal.limit.open', 'screen_time.selection.open',
  'screen_time.device.setup.open', 'screen_time.device.release.open', 'screen_time.configure',
  'notifications.configure', 'notifications.preferences.update', 'search.open', 'navigation.open_capability',
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
  'account.settings.open', 'account.subscription.manage', 'account.delete',
  'money.budget.read', 'money.budget.update', 'money.transaction.get',
  'money.transaction.meaning.update', 'money.transaction.plan_treatment.update',
  'money.connection.disconnect', 'money.connection.repair.open',
  'money.transfer.list', 'money.transfer.get', 'money.transfer.review',
  'chores.evidence.add',
  'chores.open',
  'money.read', 'money.review_transaction', 'money.category.create', 'money.category.rename',
  'money.app_control.review', 'money.category.update', 'money.privacy.configure',
  'money.connection.connect', 'money.connection.sync',
  'recipes.import.prepare',
  'recipes.share_copy.prepare',
  'groceries.product_match.prepare', 'groceries.product_match.confirm',
  'groceries.handoff.prepare', 'groceries.handoff.open',
  'recipes.publication.prepare', 'recipes.publication.publish',
  'store_opportunity.capture', 'food_scenario.prepare', 'food_scenario.accept',
  'savings.review', 'savings.accept', 'savings.coupon.open',
  'receipt.extract', 'receipt.reconcile',
]);

const PHONE_MOBILE_PROPOSAL_OPERATION_IDS = new Set([
  'arcs.create', 'arcs.update', 'arcs.delete',
  'goals.create', 'goals.update', 'goals.delete',
  'activities.update', 'activities.complete', 'activities.delete',
  'activities.steps.create', 'activities.steps.update', 'activities.steps.complete',
  'activities.steps.delete', 'activities.steps.reorder', 'activities.repeat.update',
  'activities.reminder.update', 'activities.focus_today',
  'chapters.note.update', 'chapters.digest_settings.update', 'chapters.alignment.apply',
  'profile.update',
  'household.member.add_dependent', 'household.invitation.create', 'household.invitation.accept',
  'household.child_capability.update', 'household.caregiver_grant.update', 'household.member.remove',
  'activities.schedule', 'plan.schedule_activity', 'plan.schedule_chunks', 'plan.reschedule_activity', 'plan.remove_activity',
  'chores.definition.create', 'chores.definition.update', 'chores.definition.pause', 'chores.definition.delete',
  'chores.occurrence.complete', 'chores.review.approve', 'chores.review.return',
  'chores.occurrence.claim', 'chores.occurrence.release', 'chores.occurrence.reopen',
  'chores.occurrence.report_earlier', 'chores.review.leave_missed',
  'chores.reward.configure', 'chores.reward.reserve', 'chores.reward.cancel', 'chores.reward.settle',
  'recipes.create', 'recipes.update', 'recipes.delete', 'recipes.fork', 'recipes.collaborator.invite',
  'recipes.import.approve',
  'cook_session.start', 'cook_session.complete',
  'recipes.favorite.update', 'recipes.visibility.update', 'meal_planning.preferences.update',
  'meal_planning.plan.create', 'meal_planning.plan.update',
  'meal_planning.candidate.add', 'meal_planning.candidate.remove',
  'meal_planning.round.open', 'meal_planning.round.close',
  'meal_planning.response.submit', 'meal_planning.response.withdraw',
  'meal_planning.plan.finalize', 'meal_planning.plan.revise',
  'food_stock.observe', 'food_stock.deplete',
  'groceries.compile', 'groceries.item.add', 'groceries.item.update', 'groceries.item.set_state',
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
  'src/capabilities/life-structure/actions/chapterAlignmentActions.test.ts',
  'src/capabilities/life-structure/actions/chapterDigestSettingsActions.test.ts',
  'src/features/unifiedChat/unifiedChatToolProvider.test.ts',
  'src/features/unifiedChat/chapterProposalExecutor.test.ts',
  'src/features/unifiedChat/executeChapterProposalDecision.test.ts',
  'src/features/unifiedChat/recoverChapterMutations.test.ts',
  'src/features/unifiedChat/threadRepository.test.ts',
] as const;
const deviceHandoffProof = [
  'src/capabilities/notifications/actions/notificationPreferenceActions.test.ts',
  'src/features/unifiedChat/deviceToolProvider.test.ts',
  'src/features/unifiedChat/runUnifiedChatTurn.test.ts',
  'src/features/unifiedChat/executeClientActionDecision.test.ts',
  'src/features/unifiedChat/clientActionNavigation.test.ts',
  'src/features/unifiedChat/UnifiedChatScreen.test.tsx',
] as const;
const hapticsPreferenceProof = [
  'src/features/account/actions/hapticsPreferenceActions.test.ts',
  'src/features/account/HapticsSettingsScreen.tsx',
  'src/features/unifiedChat/deviceToolProvider.test.ts',
  'src/features/unifiedChat/executeClientActionDecision.test.ts',
  'supabase/functions/_shared/__tests__/serverAgentTools.test.ts',
] as const;
const widgetPreferenceProof = [
  'src/features/account/actions/widgetPreferenceActions.test.ts',
  'src/features/account/WidgetsSettingsScreen.tsx',
  'src/features/unifiedChat/deviceToolProvider.test.ts',
  'src/features/unifiedChat/clientActionNavigation.test.ts',
  'src/features/unifiedChat/executeClientActionDecision.test.ts',
  'supabase/functions/_shared/__tests__/serverAgentTools.test.ts',
] as const;
const appearancePreferenceProof = [
  'src/features/account/actions/appearancePreferenceActions.test.ts',
  'src/features/account/AppearanceSettingsScreen.tsx',
  'src/features/unifiedChat/deviceToolProvider.test.ts',
  'src/features/unifiedChat/executeClientActionDecision.test.ts',
  'supabase/functions/_shared/__tests__/serverAgentTools.test.ts',
] as const;
const connectedToolProof = [
  'src/features/account/actions/connectedToolActions.test.ts',
  'src/features/account/ConnectedToolsScreen.test.tsx',
  'src/features/unifiedChat/deviceToolProvider.test.ts',
  'src/features/unifiedChat/clientActionNavigation.test.ts',
  'src/features/unifiedChat/executeClientActionDecision.test.ts',
  'supabase/functions/_shared/__tests__/serverAgentTools.test.ts',
] as const;
const phoneAgentSettingsProof = [
  'src/features/account/actions/phoneAgentSettingsActions.test.ts',
  'src/features/account/PhoneAgentSettingsScreen.tsx',
  'src/features/unifiedChat/deviceToolProvider.test.ts',
  'src/features/unifiedChat/executeClientActionDecision.test.ts',
  'supabase/functions/_shared/__tests__/serverAgentTools.test.ts',
] as const;
const phoneAgentContinuationProof = [
  'supabase/functions/_shared/__tests__/phoneAgentContinuation.test.ts',
  'supabase/functions/_shared/__tests__/serverAgentTools.test.ts',
  'src/features/unifiedChat/deviceToolProvider.test.ts',
  'src/services/phoneAgent.test.ts',
] as const;
const aiModelPreferenceProof = [
  'src/features/account/actions/aiModelPreferenceActions.test.ts',
  'src/features/account/AiModelSettingsScreen.tsx',
  'src/features/unifiedChat/deviceToolProvider.test.ts',
  'src/features/unifiedChat/executeClientActionDecision.test.ts',
  'supabase/functions/_shared/__tests__/serverAgentTools.test.ts',
] as const;
const sharingSettingsProof = [
  'src/features/account/actions/sharingActions.test.ts',
  'src/features/friends/FriendshipSettingsSection.test.tsx',
  'src/features/goals/GoalSharingSettingsSection.test.tsx',
  'src/features/unifiedChat/deviceToolProvider.test.ts',
  'src/features/unifiedChat/executeClientActionDecision.test.ts',
  'supabase/functions/_shared/__tests__/serverAgentTools.test.ts',
] as const;
const executionTargetSettingsProof = [
  'src/features/account/actions/executionTargetActions.test.ts',
  'src/features/account/ExecutionTargetsSettingsScreen.tsx',
  'src/features/account/DestinationDetailScreen.tsx',
  'src/features/unifiedChat/deviceToolProvider.test.ts',
  'src/features/unifiedChat/executeClientActionDecision.test.ts',
  'supabase/functions/_shared/__tests__/serverAgentTools.test.ts',
] as const;
const destinationSettingsProof = [
  'src/features/account/actions/destinationActions.test.ts',
  'src/features/account/BuiltInDestinationDetailScreen.tsx',
  'src/features/unifiedChat/deviceToolProvider.test.ts',
  'src/features/unifiedChat/executeClientActionDecision.test.ts',
  'supabase/functions/_shared/__tests__/serverAgentTools.test.ts',
] as const;
const activityAreaSettingsProof = [
  'src/features/account/actions/activityAreaActions.test.ts',
  'src/features/account/ActivityAreasSettingsScreen.tsx',
  'src/features/unifiedChat/deviceToolProvider.test.ts',
  'src/features/unifiedChat/executeClientActionDecision.test.ts',
  'supabase/functions/_shared/__tests__/serverAgentTools.test.ts',
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
const moneyControlProof = [
  'src/capabilities/money/actions/moneyControlActions.test.ts',
  'src/features/unifiedChat/moneyToolProvider.test.ts',
  'src/features/unifiedChat/executeMoneyControlProposalDecision.test.ts',
  'src/features/unifiedChat/recoverMoneyControlMutations.test.ts',
  'src/features/unifiedChat/clientActionNavigation.test.ts',
  'supabase/functions/_shared/__tests__/serverMoneyTools.test.ts',
  'supabase/functions/disconnect-money-connection/__tests__/disconnectMoneyConnection_deno_test.ts',
] as const;
const choreControlProof = [
  'src/capabilities/chores/domain/choreActions.test.ts',
  'src/capabilities/chores/data/choreRepository.test.ts',
  'src/features/unifiedChat/choreToolProvider.test.ts',
  'src/features/unifiedChat/executeChoreProposalDecision.test.ts',
  'supabase/functions/_shared/__tests__/serverChoreTools_deno_test.ts',
  'supabase/migrations/20260827_activity_backed_chore_profiles.sql',
] as const;
const foodControlProof = [
  'src/capabilities/recipes/actions/recipeControlActions.test.ts',
  'src/capabilities/meal-planning/actions/mealPreferenceActions.test.ts',
  'src/features/unifiedChat/foodControlToolProvider.test.ts',
  'src/features/unifiedChat/executeRecipeProposalDecision.test.ts',
  'src/features/unifiedChat/executeMealPreferenceProposalDecision.test.ts',
  'supabase/functions/_shared/__tests__/serverFoodTools_deno_test.ts',
  'scripts/food-conversational-control-migration.test.mjs',
] as const;
const recipeReadProof = [
  'src/features/unifiedChat/unifiedChatToolProvider.recipe.test.ts',
  'supabase/functions/_shared/__tests__/serverFoodTools_deno_test.ts',
  'scripts/food-conversational-control-migration.test.mjs',
] as const;
const recipeMutationProof = [
  'src/features/unifiedChat/unifiedChatToolProvider.recipe.test.ts',
  'src/features/unifiedChat/executeRecipeProposalDecision.test.ts',
  'src/features/unifiedChat/threadRepository.test.ts',
  'supabase/functions/_shared/__tests__/serverFoodTools_deno_test.ts',
  'scripts/food-conversational-control-migration.test.mjs',
] as const;
const recipeImportProof = [
  'src/capabilities/recipes/data/recipeImportRepository.test.ts',
  'src/capabilities/food-ai/recipeImportProposalExecutor.test.ts',
  'src/features/unifiedChat/unifiedChatToolProvider.recipe.test.ts',
  'src/features/unifiedChat/executeRecipeProposalDecision.test.ts',
  'src/features/unifiedChat/clientActionNavigation.test.ts',
  'supabase/functions/_shared/__tests__/serverFoodTools_deno_test.ts',
  'scripts/food-conversational-control-migration.test.mjs',
] as const;
const recipeCookProof = [
  'src/capabilities/recipes/actions/recipeCookActions.test.ts',
  'src/features/unifiedChat/unifiedChatToolProvider.recipe.test.ts',
  'src/features/unifiedChat/executeRecipeProposalDecision.test.ts',
  'src/features/unifiedChat/threadRepository.test.ts',
  'src/features/unifiedChat/clientActionNavigation.test.ts',
  'supabase/functions/_shared/__tests__/serverFoodTools_deno_test.ts',
  'scripts/food-conversational-control-migration.test.mjs',
] as const;
const mealPlanProof = [
  'src/capabilities/meal-planning/actions/mealPlanActions.test.ts',
  'src/features/unifiedChat/unifiedChatToolProvider.mealPlan.test.ts',
  'src/features/unifiedChat/executeMealPlanProposalDecision.test.ts',
  'src/features/unifiedChat/threadRepository.test.ts',
  'supabase/functions/_shared/__tests__/serverFoodTools_deno_test.ts',
  'scripts/food-conversational-control-migration.test.mjs',
] as const;
const groceryReadProof = [
  'src/features/unifiedChat/groceryControlToolProvider.test.ts',
  'supabase/functions/_shared/__tests__/serverFoodTools_deno_test.ts',
  'scripts/food-conversational-control-migration.test.mjs',
] as const;
const groceryStockMutationProof = [
  'src/capabilities/groceries/actions/foodStockActions.test.ts',
  'src/features/unifiedChat/groceryControlToolProvider.test.ts',
  'src/features/unifiedChat/executeGroceryProposalDecision.test.ts',
  'src/features/unifiedChat/threadRepository.test.ts',
  'supabase/functions/_shared/__tests__/serverFoodTools_deno_test.ts',
  'scripts/food-conversational-control-migration.test.mjs',
] as const;
const groceryListProof = [
  'src/capabilities/groceries/actions/groceryListActions.test.ts',
  'src/features/unifiedChat/groceryControlToolProvider.test.ts',
  'src/features/unifiedChat/executeGroceryProposalDecision.test.ts',
  'src/features/unifiedChat/threadRepository.test.ts',
  'supabase/functions/_shared/__tests__/serverFoodTools_deno_test.ts',
  'scripts/food-conversational-control-migration.test.mjs',
] as const;
const groceryRetailerHandoffProof = [
  'src/features/unifiedChat/groceryControlToolProvider.test.ts',
  'src/features/unifiedChat/clientActionNavigation.test.ts',
  'supabase/functions/_shared/__tests__/serverFoodTools_deno_test.ts',
  'scripts/food-conversational-control-migration.test.mjs',
] as const;
const advancedFoodHandoffProof = [
  'src/features/unifiedChat/deviceToolProvider.test.ts',
  'src/features/unifiedChat/clientActionNavigation.test.ts',
  'src/features/unifiedChat/mobileToolProviderRegistry.test.ts',
  'supabase/functions/_shared/__tests__/serverFoodTools_deno_test.ts',
  'supabase/functions/_shared/__tests__/serverToolProviderRegistry.test.ts',
] as const;
const ADVANCED_FOOD_HANDOFF_IDS = new Set([
  'recipes.publication.prepare',
  'recipes.publication.publish',
  'store_opportunity.capture',
  'food_scenario.prepare',
  'food_scenario.accept',
  'savings.review',
  'savings.accept',
  'savings.coupon.open',
  'receipt.extract',
  'receipt.reconcile',
]);
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
  'src/features/unifiedChat/screenTimeProposalExecutor.test.ts',
  'src/features/unifiedChat/executeScreenTimeProposalDecision.test.ts',
  'supabase/functions/_shared/__tests__/serverScreenTimeTools.test.ts',
  'supabase/functions/_shared/__tests__/serviceAgentRunPersistence.test.ts',
] as const;
const supportedBoundaryProof = [
  'packages/kwilt-agent-runtime/src/capabilityManifest.test.ts',
  'src/features/unifiedChat/conversationalParity.test.ts',
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
  if (contract.id === 'recipes.search' || contract.id === 'recipes.read' || contract.id === 'recipes.scale.preview') {
    return live(row, recipeReadProof);
  }
  if (contract.id === 'recipes.create' || contract.id === 'recipes.update' || contract.id === 'recipes.delete' || contract.id === 'recipes.fork' || contract.id === 'recipes.collaborator.invite') {
    return live(row, recipeMutationProof);
  }
  if (contract.id === 'recipes.share_copy.prepare') return live(row, recipeImportProof);
  if (contract.id === 'recipes.import.prepare' || contract.id === 'recipes.import.approve') {
    return live(row, recipeImportProof);
  }
  if (contract.id.startsWith('cook_session.')) {
    return live(row, recipeCookProof);
  }
  if (contract.id === 'meal_planning.plan.create' || contract.id === 'meal_planning.plan.update'
    || contract.id === 'meal_planning.candidate.add' || contract.id === 'meal_planning.candidate.remove'
    || contract.id === 'meal_planning.round.open' || contract.id === 'meal_planning.round.close'
    || contract.id === 'meal_planning.response.submit' || contract.id === 'meal_planning.response.withdraw'
    || contract.id === 'meal_planning.plan.finalize' || contract.id === 'meal_planning.plan.revise') {
    return live(row, mealPlanProof);
  }
  if (contract.id === 'meal_planning.candidates.prepare') return live(row, mealPlanProof);
  if (contract.id === 'food_budget.read' || contract.id === 'food_stock.read') return live(row, groceryReadProof);
  if (contract.id === 'food_stock.observe' || contract.id === 'food_stock.deplete') return live(row, groceryStockMutationProof);
  if (contract.id === 'groceries.compile' || contract.id === 'groceries.item.add'
    || contract.id === 'groceries.item.update' || contract.id === 'groceries.item.set_state'
    || contract.id === 'groceries.list.review') return live(row, groceryListProof);
  if (contract.id === 'groceries.product_match.prepare' || contract.id === 'groceries.product_match.confirm'
    || contract.id === 'groceries.handoff.prepare' || contract.id === 'groceries.handoff.open') {
    return bounded(
      'confirmation_only',
      row,
      'Chat resolves the exact Grocery target and stages native retailer review; retailer selection, substitution, slot, payment, and checkout remain explicitly unclaimed.',
      groceryRetailerHandoffProof,
    );
  }
  if (ADVANCED_FOOD_HANDOFF_IDS.has(contract.id)) {
    return bounded(
      'confirmation_only',
      row,
      'Chat resolves and validates the exact Food target, then stages a durable native review. Publication, scenario acceptance, coupon activation, receipt reconciliation, and other consequential outcomes remain unclaimed until the person completes that review.',
      advancedFoodHandoffProof,
    );
  }
  return bounded(
    contract.authority === 'excluded' ? 'excluded' : 'pending_provider',
    row,
    contract.boundaryReason,
    contract.authority === 'excluded' ? supportedBoundaryProof : [],
  );
}

function controlParityCapabilityRow(
  contract: typeof CONTROL_PARITY_OPERATION_CONTRACTS[number],
): ChatCapabilityCoverageRow {
  if (contract.id === 'navigation.open_capability') {
    return bounded('confirmation_only', {
      id: contract.id, providers: contract.providers, consequence: contract.consequence,
      confirmation: contract.confirmation, toolIds: [contract.id], sourceRefs: contract.sourceRefs,
    }, 'Chat validates an included capability or stable object destination and opens it natively without changing its contents.', deviceHandoffProof);
  }
  if (contract.id === 'settings.haptics.read' || contract.id === 'settings.haptics.update') {
    return live({
      id: contract.id, providers: contract.providers, consequence: contract.consequence,
      confirmation: contract.confirmation, toolIds: [contract.id], sourceRefs: contract.sourceRefs,
    }, hapticsPreferenceProof);
  }
  if (contract.id === 'settings.widgets.read' || contract.id === 'settings.widgets.configure') {
    return live({
      id: contract.id, providers: contract.providers, consequence: contract.consequence,
      confirmation: contract.confirmation, toolIds: [contract.id], sourceRefs: contract.sourceRefs,
    }, widgetPreferenceProof);
  }
  if (contract.id === 'settings.appearance.read' || contract.id === 'settings.appearance.update') {
    return live({
      id: contract.id, providers: contract.providers, consequence: contract.consequence,
      confirmation: contract.confirmation, toolIds: [contract.id], sourceRefs: contract.sourceRefs,
    }, appearancePreferenceProof);
  }
  if (contract.id.startsWith('settings.connected_tools.')) {
    return live({
      id: contract.id, providers: contract.providers, consequence: contract.consequence,
      confirmation: contract.confirmation, toolIds: [contract.id], sourceRefs: contract.sourceRefs,
    }, connectedToolProof);
  }
  if (contract.id === 'settings.phone_agent.read' || contract.id === 'settings.phone_agent.update') {
    return live({
      id: contract.id, providers: contract.providers, consequence: contract.consequence,
      confirmation: contract.confirmation, toolIds: [contract.id], sourceRefs: contract.sourceRefs,
    }, phoneAgentSettingsProof);
  }
  if (contract.id === 'settings.ai_model.read' || contract.id === 'settings.ai_model.update') {
    return live({
      id: contract.id, providers: contract.providers, consequence: contract.consequence,
      confirmation: contract.confirmation, toolIds: [contract.id], sourceRefs: contract.sourceRefs,
    }, aiModelPreferenceProof);
  }
  if (contract.id.startsWith('settings.sharing.')) {
    return live({
      id: contract.id, providers: contract.providers, consequence: contract.consequence,
      confirmation: contract.confirmation, toolIds: [contract.id], sourceRefs: contract.sourceRefs,
    }, sharingSettingsProof);
  }
  if (contract.id.startsWith('settings.execution_targets.')) {
    return live({
      id: contract.id, providers: contract.providers, consequence: contract.consequence,
      confirmation: contract.confirmation, toolIds: [contract.id], sourceRefs: contract.sourceRefs,
    }, executionTargetSettingsProof);
  }
  if (contract.id.startsWith('settings.destinations.')) {
    return live({
      id: contract.id, providers: contract.providers, consequence: contract.consequence,
      confirmation: contract.confirmation, toolIds: [contract.id], sourceRefs: contract.sourceRefs,
    }, destinationSettingsProof);
  }
  if (contract.id.startsWith('settings.activity_areas.')) {
    return live({
      id: contract.id, providers: contract.providers, consequence: contract.consequence,
      confirmation: contract.confirmation, toolIds: [contract.id], sourceRefs: contract.sourceRefs,
    }, activityAreaSettingsProof);
  }
  if (contract.id === 'plan.availability.read') {
    return live({
      id: contract.id,
      providers: contract.providers,
      consequence: contract.consequence,
      confirmation: contract.confirmation,
      toolIds: [contract.id],
      sourceRefs: contract.sourceRefs,
    }, planAvailabilityProof);
  }
  if (contract.id === 'plan.availability.update') {
    return bounded('confirmation_only', {
      id: contract.id,
      providers: contract.providers,
      consequence: contract.consequence,
      confirmation: contract.confirmation,
      toolIds: [contract.id],
      sourceRefs: contract.sourceRefs,
    }, 'Chat prepares the exact weekly diff and time zone, then the authoritative native Profile applies it after explicit review.', planAvailabilityProof);
  }
  if (contract.id === 'plan.calendars.read' || contract.id === 'plan.calendars.update') {
    return bounded('confirmation_only', {
      id: contract.id,
      providers: contract.providers,
      consequence: contract.consequence,
      confirmation: contract.confirmation,
      toolIds: [contract.id],
      sourceRefs: contract.sourceRefs,
    }, 'Calendar identity and selection are loaded on the authorized device; provider authorization and final selection remain in native review, and event contents are never returned externally.', planCalendarPreferenceProof);
  }
  if (contract.owner === 'chapters') {
    return live({
      id: contract.id,
      providers: contract.providers,
      consequence: contract.consequence,
      confirmation: contract.confirmation,
      toolIds: [contract.id],
      sourceRefs: contract.sourceRefs,
    }, chapterMutationProof);
  }
  if (contract.id === 'notifications.preferences.read') {
    return live({
      id: contract.id, providers: contract.providers, consequence: contract.consequence,
      confirmation: contract.confirmation, toolIds: [contract.id], sourceRefs: contract.sourceRefs,
    }, deviceHandoffProof);
  }
  if (contract.id === 'notifications.preferences.update') {
    return bounded('confirmation_only', {
      id: contract.id, providers: contract.providers, consequence: contract.consequence,
      confirmation: contract.confirmation, toolIds: [contract.id], sourceRefs: contract.sourceRefs,
    }, 'Chat carries the exact preference patch into native review; iOS permission and final scheduling remain device-owned.', deviceHandoffProof);
  }
  if (contract.owner === 'household') {
    return live({
      id: contract.id,
      providers: contract.providers,
      consequence: contract.consequence,
      confirmation: contract.confirmation,
      toolIds: [contract.id],
      sourceRefs: contract.sourceRefs,
    }, householdManagementProof);
  }
  if (contract.id.startsWith('screen_time.personal_rule.')) {
    return live({
      id: contract.id,
      providers: contract.providers,
      consequence: contract.consequence,
      confirmation: contract.confirmation,
      toolIds: [contract.id],
      sourceRefs: contract.sourceRefs,
    }, screenTimeWriteProof);
  }
  if (contract.owner === 'money') {
    return live({
      id: contract.id,
      providers: contract.providers,
      consequence: contract.consequence,
      confirmation: contract.confirmation,
      toolIds: [contract.id],
      sourceRefs: contract.sourceRefs,
    }, moneyControlProof);
  }
  if (contract.owner === 'chores') {
    return live({
      id: contract.id,
      providers: contract.providers,
      consequence: contract.consequence,
      confirmation: contract.confirmation,
      toolIds: [contract.id],
      sourceRefs: contract.sourceRefs,
    }, choreControlProof);
  }
  if (contract.owner === 'recipes' || contract.owner === 'meal_planning') {
    return live({
      id: contract.id,
      providers: contract.providers,
      consequence: contract.consequence,
      confirmation: contract.confirmation,
      toolIds: [contract.id],
      sourceRefs: contract.sourceRefs,
    }, foodControlProof);
  }
  return bounded('pending_provider', {
    id: contract.id,
    providers: contract.providers,
    consequence: contract.consequence,
    confirmation: contract.confirmation,
    toolIds: [contract.id],
    sourceRefs: contract.sourceRefs,
  }, `The ${contract.id} canonical contract is declared; capability-owned provider execution and channel proof remain pending.`);
}

const CAPABILITY_ROWS = [
  live({ id: 'general.answer', providers: ['server'], consequence: 'low', confirmation: 'none', toolIds: [], sourceRefs: [] }, readProof),
  live({ id: 'general.answer_with_context', providers: ['device', 'server'], consequence: 'low', confirmation: 'none', toolIds: ['goals.read', 'activities.read', 'plan.read_day_context', 'chapters.read'], sourceRefs: ['legacy:workspace_snapshots'] }, readProof),
  live({ id: 'relationships.read', providers: ['server'], consequence: 'low', confirmation: 'none', toolIds: ['relationships.read'], sourceRefs: ['service:phone_agent_relationship_memory'] }, relationshipProof),
  live({ id: 'relationships.remember', providers: ['server', 'channel'], consequence: 'low', confirmation: 'none', toolIds: ['relationships.remember'], sourceRefs: ['service:phone_agent_relationship_memory', 'legacy:phone_agent_fact_extractor'] }, relationshipProof),
  live({ id: 'relationships.correct', providers: ['server', 'channel'], consequence: 'low', confirmation: 'none', toolIds: ['relationships.read', 'relationships.correct'], sourceRefs: ['service:phone_agent_relationship_memory'] }, relationshipProof),
  live({ id: 'relationships.forget', providers: ['server', 'channel'], consequence: 'low', confirmation: 'none', toolIds: ['relationships.read', 'relationships.forget'], sourceRefs: ['service:phone_agent_relationship_memory'] }, relationshipProof),
  bounded('excluded', { id: 'relationships.forget_person', providers: ['server', 'channel'], consequence: 'consequential', confirmation: 'native', toolIds: [], sourceRefs: [] }, 'Whole-person forgetting is withheld until Kwilt can review and restore every dependent relationship record safely.', supportedBoundaryProof),
  live({ id: 'household.read', providers: ['device', 'server'], consequence: 'low', confirmation: 'none', toolIds: ['household.read'], sourceRefs: ['capability:household', 'action:relationshipActions'] }, householdReadProof),
  live({ id: 'household.member.add_dependent', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['household.member.add_dependent'], sourceRefs: ['capability:household', 'action:relationshipActions'] }, householdManagementProof),
  live({ id: 'household.invitation.create', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['household.invitation.create'], sourceRefs: ['capability:household', 'action:relationshipActions'] }, householdManagementProof),
  live({ id: 'household.invitation.preview', providers: ['device', 'server'], consequence: 'low', confirmation: 'none', toolIds: ['household.invitation.preview'], sourceRefs: ['capability:household', 'action:relationshipActions'] }, householdReadProof),
  live({ id: 'household.invitation.accept', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['household.invitation.accept'], sourceRefs: ['capability:household', 'action:relationshipActions'] }, householdManagementProof),
  live({ id: 'household.child_capability.update', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['household.child_capability.update'], sourceRefs: ['capability:household', 'action:relationshipActions'] }, householdManagementProof),
  live({ id: 'household.caregiver_grant.update', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['household.caregiver_grant.update'], sourceRefs: ['capability:household', 'action:relationshipActions'] }, householdManagementProof),
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
  live({ id: 'money.read', providers: ['device', 'server'], consequence: 'low', confirmation: 'none', toolIds: ['money.read'], sourceRefs: ['capability:money'] }, moneyReadProof),
  bounded('confirmation_only', { id: 'money.review_transaction', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'native', toolIds: ['money.review_transaction'], sourceRefs: [] }, 'Transaction category changes complete only after an explicit selection in native Money. Chat can open the exact review without exposing transaction details server-side.', moneyReviewProof),
  live({ id: 'money.category.create', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['money.category.create'], sourceRefs: [] }, moneyCategoryCreateProof),
  live({ id: 'money.category.rename', providers: ['device', 'server'], consequence: 'low', confirmation: 'explicit', toolIds: ['money.category.rename'], sourceRefs: [] }, moneyCategoryCreateProof),
  bounded('confirmation_only', { id: 'money.app_control.review', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'native', toolIds: ['money.app_control.review'], sourceRefs: ['capability:money', 'capability:screenTime'] }, 'Chat resolves the self subject and Money-owned condition, then opens the category-owned native editor. Apple app selection, permission, and policy persistence remain under explicit device review.', deviceHandoffProof),
  bounded('confirmation_only', { id: 'money.category.update', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'native', toolIds: ['money.category.update'], sourceRefs: [] }, 'Chat opens the exact category for native review; private plan values and final changes remain device-authenticated.', moneyCategoryCreateProof),
  bounded('confirmation_only', { id: 'money.privacy.configure', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'native', toolIds: ['money.privacy.configure'], sourceRefs: [] }, 'Money privacy lock changes require native device-authentication review. Chat cannot prompt for or bypass Face ID, Touch ID, or passcode.', moneyPrivacyProof),
  bounded('confirmation_only', { id: 'money.connection.connect', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'native', toolIds: ['money.connection.connect'], sourceRefs: [] }, 'Connecting a financial institution completes only in native Plaid Link after institution authentication and consent.', moneyConnectionProof),
  bounded('confirmation_only', { id: 'money.connection.sync', providers: ['device', 'server'], consequence: 'low', confirmation: 'native', toolIds: ['money.connection.sync'], sourceRefs: [] }, 'Chat opens native account controls for sync; Phone and Chat never receive provider credentials.', moneyConnectionProof),

  bounded('excluded', { id: 'explore.open', providers: ['device'], consequence: 'low', confirmation: 'native', toolIds: [], sourceRefs: ['capability:explore'] }, 'Explore and precise location-history control are explicitly outside this conversational-control program.'),
  bounded('excluded', { id: 'games.open', providers: ['device'], consequence: 'low', confirmation: 'native', toolIds: [], sourceRefs: ['capability:games'] }, 'Games, player seating, sessions, and game state are explicitly outside this conversational-control program.'),
  bounded('confirmation_only', { id: 'chores.open', providers: ['device', 'server'], consequence: 'low', confirmation: 'native', toolIds: ['chores.open'], sourceRefs: ['capability:chores'] }, 'Chat opens the native Activity-backed Chores surface; any following change remains capability-owned and separately reviewed.', deviceHandoffProof),

  ...FOOD_OPERATION_CONTRACTS.map(foodCapabilityRow),

  live({ id: 'screen_time.read', providers: ['device', 'server'], consequence: 'low', confirmation: 'none', toolIds: ['screen_time.read'], sourceRefs: ['capability:screenTime'] }, screenTimeReadProof),
  live({ id: 'screen_time.agreement.create', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['screen_time.agreement.create'], sourceRefs: [] }, screenTimeWriteProof),
  live({ id: 'screen_time.agreement.update', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['screen_time.agreement.update'], sourceRefs: [] }, screenTimeWriteProof),
  live({ id: 'screen_time.agreement.deactivate', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['screen_time.agreement.deactivate'], sourceRefs: [] }, screenTimeWriteProof),
  live({ id: 'screen_time.override.block', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['screen_time.override.block'], sourceRefs: [] }, screenTimeWriteProof),
  live({ id: 'screen_time.override.allow', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['screen_time.override.allow'], sourceRefs: [] }, screenTimeWriteProof),
  live({ id: 'screen_time.override.cancel', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['screen_time.override.cancel'], sourceRefs: [] }, screenTimeWriteProof),
  live({ id: 'screen_time.request.decide', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'explicit', toolIds: ['screen_time.request.decide'], sourceRefs: [] }, screenTimeWriteProof),
  bounded('confirmation_only', { id: 'screen_time.personal.setup.open', providers: ['device', 'server'], consequence: 'low', confirmation: 'native', toolIds: ['screen_time.personal.setup.open'], sourceRefs: ['capability:screenTime'] }, 'Chat resolves the signed-in person on the current device and opens the personal native setup flow. Apple authorization and app selection remain user-controlled.', deviceHandoffProof),
  bounded('confirmation_only', { id: 'screen_time.personal.limit.open', providers: ['device', 'server'], consequence: 'low', confirmation: 'native', toolIds: ['screen_time.personal.limit.open'], sourceRefs: ['capability:screenTime'] }, 'Chat carries a bounded self, app-label, and daily allowance intent into native review. Apple authorization, token selection, persistence, and signed-device enforcement remain capability-owned.', deviceHandoffProof),
  bounded('confirmation_only', { id: 'screen_time.selection.open', providers: ['device', 'server'], consequence: 'low', confirmation: 'native', toolIds: ['screen_time.selection.open'], sourceRefs: [] }, 'Chat routes an exact authorized-child native selection handoff. Completion remains device-receipt based.', deviceHandoffProof),
  bounded('confirmation_only', { id: 'screen_time.device.setup.open', providers: ['device', 'server'], consequence: 'low', confirmation: 'native', toolIds: ['screen_time.device.setup.open'], sourceRefs: [] }, 'Chat routes an exact authorized-child native device setup handoff. Completion remains device-receipt based.', deviceHandoffProof),
  bounded('confirmation_only', { id: 'screen_time.device.release.open', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'native', toolIds: ['screen_time.device.release.open'], sourceRefs: [] }, 'Chat routes an exact authorized-child native release handoff. Cleanup remains device-receipt based.', deviceHandoffProof),
  bounded('confirmation_only', { id: 'screen_time.configure', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'native', toolIds: ['screen_time.configure'], sourceRefs: [] }, 'Chat resolves the exact authorized child and carries the app label and allow-or-block intent into native Apple selection review. Completion remains device-receipt based.', deviceHandoffProof),
  bounded('confirmation_only', { id: 'notifications.configure', providers: ['device'], consequence: 'consequential', confirmation: 'native', toolIds: ['notifications.configure'], sourceRefs: [] }, 'Chat stages a durable handoff; notification permission and scheduling remain device-owned.', deviceHandoffProof),
  bounded('confirmation_only', { id: 'search.open', providers: ['device'], consequence: 'low', confirmation: 'native', toolIds: ['navigation.search.open'], sourceRefs: [] }, 'Chat stages and opens the native search surface; the user completes the search there.', deviceHandoffProof),
  bounded('confirmation_only', { id: 'account.settings.open', providers: ['device'], consequence: 'low', confirmation: 'native', toolIds: ['navigation.account_settings.open'], sourceRefs: [] }, 'Chat stages and opens native account settings; changes remain user-driven.', deviceHandoffProof),
  bounded('confirmation_only', { id: 'account.subscription.manage', providers: ['device'], consequence: 'consequential', confirmation: 'native', toolIds: ['account.subscription.open'], sourceRefs: [] }, 'Chat stages a durable handoff; subscription management completes only in the native App Store or RevenueCat surface.', deviceHandoffProof),
  bounded('confirmation_only', { id: 'account.delete', providers: ['device', 'server'], consequence: 'consequential', confirmation: 'native', toolIds: ['account.delete.open'], sourceRefs: [] }, 'Chat stages a durable handoff to the existing two-step native deletion confirmation and never deletes silently.', deviceHandoffProof),
  live({ id: 'channel.phone.continue_run', providers: ['device', 'channel', 'server'], consequence: 'low', confirmation: 'none', toolIds: ['channel.phone.continue_run'], sourceRefs: [] }, phoneAgentContinuationProof),

  ...CONTROL_PARITY_OPERATION_CONTRACTS.map(controlParityCapabilityRow),
] as const satisfies readonly ChatCapabilityCoverageRow[];

const EMPTY_SCHEMA = { type: 'object', properties: {}, additionalProperties: false } as const;
const TOOL_BY_ID = new Map(KWILT_TOOL_CONTRACTS.map((tool) => [tool.id, tool] as const));
const PURPOSE_BY_OPERATION: Readonly<Record<string, string>> = {
  'general.answer': 'Answer an ordinary question without retrieving private Kwilt context.',
  'general.answer_with_context': 'Answer a broader question with the minimum authorized Kwilt evidence that materially improves it.',
  'relationships.forget_person': 'Forget every retained record for one person only when the complete dependency set can be reviewed and restored safely.',
  'channel.phone.continue_run': 'Continue the current durable Kwilt conversation through the verified Phone Agent link.',
};
const CONTROL_PARITY_CONTRACT_BY_ID = new Map<string, (typeof CONTROL_PARITY_OPERATION_CONTRACTS)[number]>(
  CONTROL_PARITY_OPERATION_CONTRACTS.map((contract) => [contract.id, contract] as const),
);
const SUPPORTED_BOUNDARY_OPERATION_IDS = new Set([
  'relationships.forget_person',
  'recipes.publication.attest_rights',
  'groceries.checkout',
  'groceries.payment',
  'savings.coupon.apply_unsupported',
]);
const PROGRAM_EXCLUSION_OPERATION_IDS = new Set(['explore.open', 'games.open']);

function scopesForOperation(owner: KwiltOperationOwner, effect: CapabilityManifestEntry['effect']): CapabilityOAuthScope[] {
  if (owner === 'relationships' || owner === 'household' || owner === 'screenTime' || owner === 'chores') {
    return effect === 'read' ? ['household.read'] : ['household.read', 'household.write'];
  }
  if (owner === 'money') return effect === 'read' ? ['money.read'] : ['money.read', 'money.write'];
  if (owner === 'recipes' || owner === 'meal_planning' || owner === 'groceries' || owner === 'savings') {
    return effect === 'read' ? ['food.read'] : ['food.read', 'food.write'];
  }
  return effect === 'read' ? ['life.read'] : ['life.read', 'life.write'];
}

function completionModeForOperation(
  row: ChatCapabilityCoverageRow,
  effect: CapabilityManifestEntry['effect'],
): ConversationalCompletionMode {
  const declared = CONTROL_PARITY_CONTRACT_BY_ID.get(row.id)?.completionMode;
  if (declared) return declared;
  if (PROGRAM_EXCLUSION_OPERATION_IDS.has(row.id)) return 'excluded';
  if (SUPPORTED_BOUNDARY_OPERATION_IDS.has(row.id)) return 'supported_boundary';
  if (row.confirmation === 'native') return 'native_handoff';
  if (effect === 'write' && row.confirmation === 'explicit') return 'reviewed_proposal';
  return 'direct';
}

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
  const effect: CapabilityManifestEntry['effect'] = mutationTool ? 'write' : 'read';
  const reversible = mutationTool?.reversible ?? (row.id !== 'relationships.forget_person');
  const completionMode = completionModeForOperation(row, effect);
  const finalActOwner: CapabilityManifestEntry['supportedBoundary']['finalActOwner'] =
    completionMode === 'excluded' ? 'excluded'
      : completionMode === 'provider_handoff' ? 'provider'
        : completionMode === 'native_handoff' ? 'device'
          : completionMode === 'supported_boundary'
            ? row.id === 'relationships.forget_person' || row.id === 'recipes.publication.attest_rights'
              ? 'person'
              : 'provider'
            : 'kwilt';
  return {
    id: row.id,
    owner: row.owner,
    purpose: PURPOSE_BY_OPERATION[row.id] ?? schemaTool?.purpose ?? `Serve the ${row.id} Kwilt operation.`,
    effect,
    consequence: row.consequence,
    reversible,
    confirmation: row.confirmation,
    providerEligibility: row.providers,
    inputSchema: schemaTool?.inputSchema ?? EMPTY_SCHEMA,
    outputSchema: schemaTool?.outputSchema ?? EMPTY_SCHEMA,
    tools,
    sourceRefs: row.sourceRefs,
    returnBehavior,
    completionMode,
    requiredScopes: scopesForOperation(row.owner, effect),
    receipt: {
      required: true,
      resultRefKinds: [row.owner],
      reversible,
      undoOperationId: null,
    },
    supportedBoundary: {
      finalActOwner,
      reason: finalActOwner === 'kwilt'
        ? null
        : row.channels.mobile.boundaryReason ?? row.channels.phone.boundaryReason ?? `Final act remains owned by ${finalActOwner}.`,
    },
    channels: row.channels,
  };
}

export const KWILT_CAPABILITY_MANIFEST = defineCapabilityManifest(
  CAPABILITY_ROWS.map(manifestEntry),
);

export type KwiltCapabilityOperationId = typeof CAPABILITY_ROWS[number]['id'];
