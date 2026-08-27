import {
  evaluateToolPolicy,
  executeActionEnvelope,
  toolResultFromActionReceipt,
  type ActionExecutionReceiptStore,
  type AgentToolCall,
  type AgentToolDefinition,
  type AgentToolExecutionResult,
  type KwiltActionExecutionEnvelope,
} from '@kwilt/agent-runtime';
import type { ActivityProposalOperation } from './activityProposal';
import { buildRecurringReminderFields, parseActivityMutationPatch } from './activityProposal';
import { projectMoneyPlanLimitForChat, type UnifiedChatCapabilitySnapshots } from './capabilityAdapters';
import type {
  PlanRemoveActivityPayload,
  PlanRescheduleActivityPayload,
  PlanScheduleActivityPayload,
  PlanScheduleChunkPayload,
} from './types';
import { toLocalDateKey } from '../../services/plan/planDates';
import { parseGoalCreateInput, parseGoalMutationPatch, type GoalProposalOperation } from './goalProposal';
import { parseArcCreateInput, parseArcMutationPatch, type ArcProposalOperation } from './arcProposal';
import { parseProfileMutationPatch, type ProfileProposalOperation } from './profileProposal';
import { parseChapterNotePatch, type ChapterProposalOperation } from './chapterProposal';
import { createDeviceToolProvider } from './deviceToolProvider';
import type { PlanPlacementConversationReferent } from './planConversationReferent';
import {
  parseScreenTimeAgreementMutationProposal,
  parseScreenTimeOverrideProposal,
  parseScreenTimeOverrideCancellationProposal,
  parseScreenTimePrerequisiteAgreementProposal,
  parseScreenTimeRequestDecisionProposal,
  parsePersonalScreenTimeRuleProposal,
  type ScreenTimeProposalOperation,
} from './screenTimeProposal';
import {
  buildReviewedRecipeCreate,
  buildReviewedRecipeUpdate,
  recipePatchFieldLabels,
  type RecipeProposalOperation,
} from './recipeProposal';
import type { StagedHouseholdToolProposal } from './householdToolProvider';
import { createMoneyControlActions } from '../../capabilities/money/actions/moneyControlActions';
import { createMoneyControlActionBoundary } from '../../capabilities/money/actions/moneyControlActionBoundary';
import { createMoneyToolProvider, type StagedMoneyToolProposal } from './moneyToolProvider';

export type StagedUnifiedChatToolProposal =
  | StagedHouseholdToolProposal
  | StagedMoneyToolProposal
  | {
      capabilityId: 'recipes';
      title: string;
      body: string;
      operation: RecipeProposalOperation;
    }
  | {
      capabilityId: 'money';
      title: string;
      body: string;
      operation:
        | { type: 'create_money_category'; targetId: null; payload: { name: string; budgetCents: number } }
        | { type: 'rename_money_category'; targetId: string; payload: { name: string; expectedName: string } };
    }
  | {
      capabilityId: 'chapters';
      title: string;
      body: string;
      operation: ChapterProposalOperation;
    }
  | {
      capabilityId: 'profile';
      title: string;
      body: string;
      operation: ProfileProposalOperation;
    }
  | {
      capabilityId: 'arcs';
      title: string;
      body: string;
      operation: ArcProposalOperation;
    }
  | {
      capabilityId: 'todos';
      title: string;
      body: string;
      operation: ActivityProposalOperation;
    }
  | {
      capabilityId: 'plan';
      title: string;
      body: string;
      operation:
        | { type: 'schedule_activity'; targetId: string; expectedUpdatedAt: string; payload: PlanScheduleActivityPayload }
        | { type: 'schedule_activity_chunk'; targetId: string; expectedUpdatedAt: string; payload: PlanScheduleChunkPayload }
        | { type: 'reschedule_activity'; targetId: string; expectedUpdatedAt: string; payload: PlanRescheduleActivityPayload }
        | { type: 'remove_activity_from_plan'; targetId: string; expectedUpdatedAt: string; payload: PlanRemoveActivityPayload };
    }
  | {
      capabilityId: 'goals';
      title: string;
      body: string;
      operation: GoalProposalOperation;
    }
  | {
      capabilityId: 'screenTime';
      title: string;
      body: string;
      operation: ScreenTimeProposalOperation;
    };

function projectScreenTimeAgreementRule(rule: Record<string, unknown>): Record<string, unknown> {
  const projected: Record<string, unknown> = {
    weekdays: rule.weekdays,
    startMinute: rule.startMinute,
    endMinute: rule.endMinute,
    dailyLimitMinutes: rule.dailyLimitMinutes,
  };
  const prerequisite = rule.prerequisiteActivity;
  if (prerequisite && typeof prerequisite === 'object' && !Array.isArray(prerequisite)) {
    const input = prerequisite as Record<string, unknown>;
    projected.prerequisiteActivity = {
      selectionId: input.selectionId,
      thresholdMinutes: input.thresholdMinutes,
      reset: input.reset,
    };
  }
  return projected;
}

function describeScreenTimeAgreementRule(
  rule: Record<string, unknown>,
  prerequisiteLabel?: string,
): string {
  const weekdays = Array.isArray(rule.weekdays) ? rule.weekdays as number[] : [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = weekdays.length === 7 ? 'daily' : weekdays.map((day) => dayNames[day]).filter(Boolean).join(', ');
  const minutes = typeof rule.dailyLimitMinutes === 'number' ? ` · ${rule.dailyLimitMinutes} minute daily limit` : '';
  const prerequisite = rule.prerequisiteActivity && typeof rule.prerequisiteActivity === 'object'
    ? rule.prerequisiteActivity as Record<string, unknown>
    : null;
  const requirement = prerequisite && prerequisiteLabel
    ? ` · requires ${prerequisiteLabel} for ${String(prerequisite.thresholdMinutes)} minutes first`
    : '';
  return `${days || 'selected days'} · ${String(rule.startMinute)}–${String(rule.endMinute)}${minutes}${requirement}`;
}

const failed = (code: string, message: string): AgentToolExecutionResult => ({
  status: 'failed', code, message, retryable: false,
});

export function createUnifiedChatToolProvider({
  snapshots,
  planConversationReferent,
  executeRelationshipTool,
  executeHouseholdTool,
  householdProposals,
  moneyActions,
  actionExecution,
  now = () => new Date(),
}: {
  snapshots: UnifiedChatCapabilitySnapshots;
  planConversationReferent?: PlanPlacementConversationReferent | null;
  executeRelationshipTool?: (
    call: AgentToolCall,
    tool: AgentToolDefinition,
  ) => Promise<AgentToolExecutionResult | null>;
  executeHouseholdTool?: (
    call: AgentToolCall,
    tool: AgentToolDefinition,
  ) => Promise<AgentToolExecutionResult | null>;
  householdProposals?: () => readonly StagedHouseholdToolProposal[];
  moneyActions?: ReturnType<typeof createMoneyControlActions>;
  actionExecution?: {
    envelope(call: AgentToolCall, tool: AgentToolDefinition): KwiltActionExecutionEnvelope;
    store: ActionExecutionReceiptStore;
    resolveTarget?: Parameters<typeof executeActionEnvelope>[0]['resolveTarget'];
    createReceiptId(): string;
    now(): string;
  };
  now?: () => Date;
}) {
  const staged: StagedUnifiedChatToolProposal[] = [];
  const deviceProvider = createDeviceToolProvider({ snapshots });
  const moneyProvider = createMoneyToolProvider({
    snapshot: snapshots.money ?? null,
    privacyLocked: snapshots.moneyPrivacyLocked === true,
    actions: moneyActions ?? createMoneyControlActions(createMoneyControlActionBoundary()),
  });
  const planReferentFailure = (activity: { id: string; title: string; updatedAt: string }) => {
    if (!planConversationReferent) return null;
    if (activity.id !== planConversationReferent.activityId) {
      return failed(
        'conversation_referent_mismatch',
        `This follow-up refers to ${planConversationReferent.title}, not ${activity.title}.`,
      );
    }
    if (activity.updatedAt !== planConversationReferent.expectedUpdatedAt) {
      return {
        status: 'failed' as const,
        code: 'conversation_referent_stale',
        message: `${activity.title} changed since Kwilt recommended it. Refresh Plan before scheduling.`,
        retryable: true,
      };
    }
    return null;
  };

  const executeRaw = async (
    call: AgentToolCall,
    tool: AgentToolDefinition,
  ): Promise<AgentToolExecutionResult> => {
    if (call.toolId !== tool.id) return failed('tool_mismatch', 'The discovered tool does not match this call.');
    if (tool.capabilityId === 'relationships') {
      const policy = evaluateToolPolicy(tool, {
        authorized: true,
        explicitRequest: true,
        providerAvailability: { server: true, device: true, channel: false, connector: true },
      });
      if (policy.decision !== 'execute') {
        return {
          status: 'needs_input',
          prompt: 'This relationship change needs review before Kwilt can apply it.',
          fields: ['confirmation'],
        };
      }
    }
    const relationshipResult = await executeRelationshipTool?.(call, tool);
    if (relationshipResult) return relationshipResult;
    const householdResult = await executeHouseholdTool?.(call, tool);
    if (householdResult) return householdResult;
    const moneyResult = await moneyProvider.execute(call, tool);
    if (moneyResult) return moneyResult;
    const deviceResult = await deviceProvider.execute(call, tool);
    if (deviceResult) return deviceResult;
    if (call.toolId === 'screen_time.read') {
      const requested = call.arguments.childMembershipIds;
      if (requested !== undefined && (
        !Array.isArray(requested) || requested.length > 20 ||
        requested.some((value) => typeof value !== 'string' || !value.trim())
      )) {
        return failed('invalid_screen_time_children', 'Choose up to 20 valid children to read.');
      }
      const requestedIds = requested === undefined
        ? null
        : [...new Set((requested as string[]).map((value) => value.trim()))];
      const authorized = snapshots.screenTime?.children.filter((child) => child.canManage) ?? [];
      if (requestedIds?.some((id) => !authorized.some((child) => child.membershipId === id))) {
        return failed(
          'screen_time_child_not_authorized',
          'One or more children are not available for Screen Time management.',
        );
      }
      const selected = requestedIds
        ? requestedIds.map((id) => authorized.find((child) => child.membershipId === id)!)
        : authorized;
      return {
        status: 'completed', receipt: null,
        output: {
          children: selected.map((child) => ({
            membershipId: child.membershipId,
            displayName: child.displayName,
            desiredPolicyVersion: child.policy.desiredPolicyVersion,
            selections: child.policy.selections.map(({ id, label, status }) => ({ id, label, status })),
            agreements: child.policy.agreements.map((agreement) => ({
              id: agreement.id,
              selectionId: agreement.selectionId,
              rule: projectScreenTimeAgreementRule(agreement.rule),
              active: agreement.active,
              version: agreement.version,
              updatedAt: agreement.updatedAt,
            })),
            activeOverrides: child.policy.activeOverrides,
            pendingRequests: child.policy.pendingRequests,
            devices: child.policy.devices.map(({ readiness, authorizationStatus, lastSeenAt, releasedAt }) => ({
              readiness, authorizationStatus, lastSeenAt, releasedAt,
            })),
            latestDeviceReceipt: child.policy.latestDeviceReceipt
              ? {
                  policyVersion: child.policy.latestDeviceReceipt.policyVersion,
                  outcome: child.policy.latestDeviceReceipt.outcome,
                  failureCode: child.policy.latestDeviceReceipt.failureCode,
                  occurredAt: child.policy.latestDeviceReceipt.occurredAt,
                }
              : null,
          })),
        },
      };
    }
    if (call.toolId === 'screen_time.personal_rule.list') {
      return { status: 'completed', receipt: null, output: { rules: snapshots.screenTime?.self?.personalRules ?? [] } };
    }
    if (call.toolId === 'screen_time.personal_rule.get') {
      const ruleId = typeof call.arguments.ruleId === 'string' ? call.arguments.ruleId.trim() : '';
      const rule = (snapshots.screenTime?.self?.personalRules ?? []).find((candidate) => candidate.id === ruleId);
      return rule
        ? { status: 'completed', receipt: null, output: { rule } }
        : failed('screen_time_rule_not_found', 'That personal Screen Time rule is no longer available.');
    }
    if (call.toolId === 'screen_time.personal_rule.update'
      || call.toolId === 'screen_time.personal_rule.deactivate'
      || call.toolId === 'screen_time.personal_rule.delete') {
      const operation = parsePersonalScreenTimeRuleProposal(call.toolId, call.arguments);
      if (!operation) return failed('invalid_personal_screen_time_rule_change', 'Choose a current personal rule and its exact updated timestamp.');
      const rule = (snapshots.screenTime?.self?.personalRules ?? []).find((candidate) => candidate.id === operation.targetId);
      if (!rule || rule.updatedAt !== operation.payload.expectedUpdatedAt) {
        return { status: 'failed', code: 'screen_time_rule_stale', message: 'That personal Screen Time rule changed. Refresh before continuing.', retryable: true };
      }
      const verb = operation.type === 'delete_personal_screen_time_rule' ? 'Delete'
        : operation.type === 'deactivate_personal_screen_time_rule' ? 'Turn off' : 'Update';
      const proposal: StagedUnifiedChatToolProposal = {
        capabilityId: 'screenTime', title: `${verb} ${rule.targetLabels.join(', ') || 'Screen Time rule'}`,
        body: operation.type === 'delete_personal_screen_time_rule'
          ? 'This removes the rule and its native enforcement after explicit approval.'
          : 'This updates native enforcement on this device after explicit approval.',
        operation,
      };
      staged.push(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    }
    if (call.toolId === 'recipes.create') {
      const reviewedData = buildReviewedRecipeCreate(call.arguments.recipe);
      if (!reviewedData) {
        return failed('invalid_recipe', 'Add a title, at least one ingredient, and at least one instruction before saving this Recipe.');
      }
      const proposal: StagedUnifiedChatToolProposal = {
        capabilityId: 'recipes', title: `Create ${reviewedData.title}`,
        body: `${reviewedData.ingredients.length} ingredient${reviewedData.ingredients.length === 1 ? '' : 's'} · ${reviewedData.instructions.length} step${reviewedData.instructions.length === 1 ? '' : 's'} · private Recipe`,
        operation: { type: 'create_recipe', targetId: null, expectedVersion: 0, payload: { reviewedData } },
      };
      staged.push(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    }
    if (call.toolId === 'recipes.update') {
      const recipeId = typeof call.arguments.recipeId === 'string' ? call.arguments.recipeId : '';
      const expectedVersion = call.arguments.expectedVersion;
      const projection = snapshots.recipes?.recipes.find((item) => item.recipe.id === recipeId);
      if (!projection || projection.recipe.lifecycle !== 'active') {
        return failed('recipe_not_found', 'That private Recipe is no longer available.');
      }
      if (projection.recipe.provenance.rightsBasis === 'kwilt_authored' || projection.recipe.provenance.method === 'catalog') {
        return failed('recipe_not_editable', 'Kwilt catalog Recipes cannot be changed in place. Save an independent copy first.');
      }
      if (!Number.isInteger(expectedVersion) || expectedVersion !== projection.currentVersion.version) {
        return { status: 'failed', code: 'recipe_version_stale', message: `${projection.currentVersion.title} changed. Review the current Recipe before updating it.`, retryable: true };
      }
      const reviewedData = buildReviewedRecipeUpdate(projection, call.arguments.reviewedVersion);
      if (!reviewedData) return failed('invalid_recipe_patch', 'Choose a supported Recipe field and keep at least one ingredient and instruction.');
      const changedFields = recipePatchFieldLabels(call.arguments.reviewedVersion);
      const proposal: StagedUnifiedChatToolProposal = {
        capabilityId: 'recipes', title: `Update ${projection.currentVersion.title}`,
        body: 'Creates a reviewed new version and preserves the current Recipe history.',
        operation: {
          type: 'update_recipe', targetId: projection.recipe.id,
          expectedVersion: projection.currentVersion.version, payload: { reviewedData, changedFields },
        },
      };
      staged.push(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    }
    if (call.toolId === 'recipes.delete') {
      const recipeId = typeof call.arguments.recipeId === 'string' ? call.arguments.recipeId : '';
      const expectedVersion = call.arguments.expectedVersion;
      const projection = snapshots.recipes?.recipes.find((item) => item.recipe.id === recipeId);
      if (!projection || projection.recipe.lifecycle !== 'active') {
        return failed('recipe_not_found', 'That private Recipe is no longer available.');
      }
      if (projection.recipe.provenance.rightsBasis === 'kwilt_authored' || projection.recipe.provenance.method === 'catalog') {
        return failed('recipe_not_deletable', 'Kwilt catalog Recipes can be hidden, but they cannot be deleted as private Recipes.');
      }
      if (!Number.isInteger(expectedVersion) || expectedVersion !== projection.currentVersion.version) {
        return { status: 'failed', code: 'recipe_version_stale', message: `${projection.currentVersion.title} changed. Review the current Recipe before deleting it.`, retryable: true };
      }
      const proposal: StagedUnifiedChatToolProposal = {
        capabilityId: 'recipes', title: `Delete ${projection.currentVersion.title}`,
        body: 'This removes this private Recipe from your library after explicit approval.',
        operation: {
          type: 'delete_recipe', targetId: projection.recipe.id,
          expectedVersion: projection.currentVersion.version, payload: {},
        },
      };
      staged.push(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    }
    if (call.toolId === 'recipes.read') {
      const recipeId = typeof call.arguments.recipeId === 'string' ? call.arguments.recipeId : '';
      const recipeVersionId = typeof call.arguments.recipeVersionId === 'string'
        ? call.arguments.recipeVersionId
        : null;
      const projection = snapshots.recipes?.recipes.find((item) => (
        item.recipe.id === recipeId
        && (!recipeVersionId || item.currentVersion.id === recipeVersionId)
      ));
      if (!projection) return failed('recipe_not_found', 'That recipe is no longer available.');
      return {
        status: 'completed',
        receipt: null,
        output: {
          recipe: projection.recipe,
          version: projection.currentVersion,
        },
      };
    }
    if (call.toolId === 'profile.read') {
      const profile = snapshots.profile?.profile;
      return {
        status: 'completed', receipt: null,
        output: profile ? {
          profile: {
            id: profile.id, fullName: profile.fullName ?? null,
            ageRange: profile.ageRange ?? null, updatedAt: profile.updatedAt,
          },
        } : { profile: null },
      };
    }

    if (call.toolId === 'account.show_up_status') {
      return {
        status: 'completed', receipt: null,
        output: { showUp: snapshots.account?.showUp ?? null },
      };
    }

    if (call.toolId === 'money.read') {
      const money = snapshots.money;
      return {
        status: 'completed', receipt: null,
        output: {
          money: money ? {
            periodLabel: money.periodLabel,
            lastSyncedAt: money.lastSyncedAt,
            totals: money.totals,
            forecast: money.forecast,
            outsidePlan: money.outsidePlan,
            categories: money.categories.map((category) => ({
              id: category.sourceId,
              name: category.name,
              plannedCents: category.plannedCents,
              spentCents: category.spentCents,
              remainingCents: category.remainingCents,
              percentUsed: category.percentUsed,
              transactionCount: category.transactionCount,
              forecast: category.forecast,
            })),
            accountCount: money.accounts.length,
            planLimit: projectMoneyPlanLimitForChat(money),
          } : null,
        },
      };
    }

    if (call.toolId === 'money.category.create') {
      const name = typeof call.arguments.name === 'string' ? call.arguments.name.trim() : '';
      const budgetCents = call.arguments.budgetCents;
      if (!name || !Number.isInteger(budgetCents) || Number(budgetCents) < 0) {
        return failed('invalid_money_category', 'Choose a category name and a non-negative monthly amount.');
      }
      const proposal: StagedUnifiedChatToolProposal = {
        capabilityId: 'money', title: `Create ${name}`,
        body: Number(budgetCents) === 0
          ? `${name} will be created with no monthly amount yet.`
          : `${name} will be created with a monthly amount of $${(Number(budgetCents) / 100).toFixed(2)}.`,
        operation: { type: 'create_money_category', targetId: null, payload: { name, budgetCents: Number(budgetCents) } },
      };
      staged.push(proposal);
      return { status: 'proposed', proposal };
    }

    if (call.toolId === 'money.category.rename') {
      const categoryId = typeof call.arguments.categoryId === 'string' ? call.arguments.categoryId.trim() : '';
      const name = typeof call.arguments.name === 'string' ? call.arguments.name.trim() : '';
      const category = snapshots.money?.categories.find((item) => item.sourceId === categoryId || item.id === categoryId);
      if (!category || !name) return failed('invalid_money_category', 'Choose an existing category and a new name.');
      if (category.name === name) return failed('money_category_unchanged', `${category.name} already has that name.`);
      const proposal: StagedUnifiedChatToolProposal = {
        capabilityId: 'money', title: `Rename ${category.name}`,
        body: `${category.name} will become ${name}.`,
        operation: {
          type: 'rename_money_category', targetId: category.sourceId,
          payload: { name, expectedName: category.name },
        },
      };
      staged.push(proposal);
      return { status: 'proposed', proposal };
    }

    if (call.toolId === 'screen_time.agreement.update' || call.toolId === 'screen_time.agreement.deactivate') {
      const operation = parseScreenTimeAgreementMutationProposal(call.toolId, call.arguments);
      if (!operation) return failed('invalid_screen_time_agreement', 'Choose one current agreement and a valid bounded rule.');
      const child = snapshots.screenTime?.children.find((candidate) => (
        candidate.canManage && candidate.membershipId === operation.payload.childMembershipId
      ));
      const agreement = child?.policy.agreements.find((candidate) => (
        candidate.id === operation.targetId && candidate.active
      ));
      const selection = child?.policy.selections.find((candidate) => (
        candidate.id === operation.payload.selectionId && candidate.status === 'active'
      ));
      const prerequisiteId = operation.payload.rule.prerequisiteActivity?.selectionId;
      const prerequisiteSelection = prerequisiteId
        ? child?.policy.selections.find((candidate) => (
            candidate.id === prerequisiteId && candidate.status === 'active'
          ))
        : undefined;
      const currentRuleMatches = operation.type !== 'deactivate_family_screen_time_agreement'
        || JSON.stringify(projectScreenTimeAgreementRule(agreement?.rule ?? {})) === JSON.stringify(operation.payload.rule);
      if (!child || !agreement || !selection || agreement.selectionId !== selection.id
        || (operation.type === 'update_family_screen_time_agreement'
          && prerequisiteId !== undefined
          && (!prerequisiteSelection || prerequisiteId === operation.payload.selectionId))
        || agreement.version !== operation.payload.expectedVersion || !currentRuleMatches) {
        return {
          status: 'failed', code: 'screen_time_target_stale',
          message: 'The child, agreement, saved selection, or version changed. Refresh before continuing.', retryable: true,
        };
      }
      const proposal: StagedUnifiedChatToolProposal = {
        capabilityId: 'screenTime',
        title: operation.type === 'update_family_screen_time_agreement'
          ? `Update ${selection.label} agreement`
          : `Turn off ${selection.label} agreement`,
        body: operation.type === 'update_family_screen_time_agreement'
          ? `${child.displayName} · ${describeScreenTimeAgreementRule(operation.payload.rule, prerequisiteSelection?.label)}`
          : `${child.displayName} · stop this standing agreement`,
        operation,
      };
      staged.push(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    }

    if (call.toolId === 'screen_time.override.cancel') {
      const operation = parseScreenTimeOverrideCancellationProposal(call.arguments);
      if (!operation) return failed('invalid_screen_time_override', 'Choose one current temporary Screen Time override.');
      const child = snapshots.screenTime?.children.find((candidate) => (
        candidate.canManage && candidate.membershipId === operation.payload.childMembershipId
      ));
      const override = child?.policy.activeOverrides.find((candidate) => candidate.id === operation.targetId);
      const selection = child?.policy.selections.find((candidate) => candidate.id === override?.selectionId);
      if (!child || !override || !selection || child.policy.desiredPolicyVersion !== operation.payload.expectedVersion) {
        return {
          status: 'failed', code: 'screen_time_target_stale',
          message: 'The child, temporary control, or Screen Time version changed. Refresh before continuing.', retryable: true,
        };
      }
      const proposal: StagedUnifiedChatToolProposal = {
        capabilityId: 'screenTime', title: `Cancel ${selection.label} ${override.action}`,
        body: `${child.displayName} · recompile the remaining Kwilt family restrictions`, operation,
      };
      staged.push(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    }

    if (call.toolId === 'screen_time.request.decide') {
      const operation = parseScreenTimeRequestDecisionProposal(call.arguments);
      if (!operation) return failed('invalid_screen_time_request_decision', 'Choose approve with bounded minutes, or deny without an allowance.');
      const child = snapshots.screenTime?.children.find((candidate) => (
        candidate.canManage && candidate.membershipId === operation.payload.childMembershipId
      ));
      const request = child?.policy.pendingRequests.find((candidate) => (
        candidate.id === operation.targetId && candidate.status === 'pending' && new Date(candidate.expiresAt) > now()
      ));
      const selection = child?.policy.selections.find((candidate) => candidate.id === request?.selectionId);
      if (!child || !request || !selection || child.policy.desiredPolicyVersion !== operation.payload.expectedVersion) {
        return {
          status: 'failed', code: 'screen_time_target_stale',
          message: 'The child request or Screen Time version changed. Refresh before continuing.', retryable: true,
        };
      }
      const proposal: StagedUnifiedChatToolProposal = {
        capabilityId: 'screenTime',
        title: `${operation.payload.decision === 'approved' ? 'Approve' : 'Deny'} ${selection.label} request`,
        body: operation.payload.decision === 'approved'
          ? `${child.displayName} · allow ${operation.payload.allowMinutes} minutes through Kwilt family restrictions`
          : `${child.displayName} · no temporary allowance`,
        operation,
      };
      staged.push(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    }

    if (call.toolId === 'screen_time.override.block' || call.toolId === 'screen_time.override.allow') {
      const action = call.toolId === 'screen_time.override.block' ? 'block' : 'allow';
      const operation = parseScreenTimeOverrideProposal({ ...call.arguments, action }, now());
      if (!operation) return failed('invalid_screen_time_override', 'Choose a bounded wall-clock duration and at least one child.');
      const children = snapshots.screenTime?.children.filter((child) => child.canManage) ?? [];
      const resolved = operation.payload.targets.map((target) => {
        const child = children.find((candidate) => candidate.membershipId === target.childMembershipId);
        const selection = child?.policy.selections.find((candidate) => (
          candidate.id === target.selectionId && candidate.status === 'active'
        ));
        return child && selection && child.policy.desiredPolicyVersion === target.expectedVersion
          ? { child, selection }
          : null;
      });
      if (resolved.some((target) => target === null)) {
        return {
          status: 'failed', code: 'screen_time_target_stale',
          message: 'A child, saved app selection, or Screen Time version changed. Refresh before continuing.', retryable: true,
        };
      }
      const authorized = resolved as Array<{
        child: NonNullable<typeof snapshots.screenTime>['children'][number];
        selection: NonNullable<typeof snapshots.screenTime>['children'][number]['policy']['selections'][number];
      }>;
      const selectionLabels = [...new Set(authorized.map((target) => target.selection.label))];
      const selectionLabel = selectionLabels.length === 1 ? selectionLabels[0] : 'selected apps';
      const childLabel = authorized.map((target) => target.child.displayName).join(', ');
      const expiryLabel = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric', minute: '2-digit',
      }).format(new Date(operation.payload.expiresAt));
      const proposal: StagedUnifiedChatToolProposal = {
        capabilityId: 'screenTime',
        title: `${action === 'block' ? 'Block' : 'Allow'} ${selectionLabel}`,
        body: action === 'allow'
          ? `${childLabel} · for Kwilt family restrictions · until ${expiryLabel}`
          : `${childLabel} · until ${expiryLabel}`,
        operation,
      };
      staged.push(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    }

    if (call.toolId === 'screen_time.agreement.create') {
      const operation = parseScreenTimePrerequisiteAgreementProposal(call.arguments);
      if (!operation) {
        return failed(
          'invalid_screen_time_agreement',
          'Choose one child, one required app, one target app group, and a daily foreground-minute threshold.',
        );
      }
      const child = snapshots.screenTime?.children.find((candidate) => (
        candidate.canManage && candidate.membershipId === operation.payload.childMembershipId
      ));
      const targetSelection = child?.policy.selections.find((selection) => (
        selection.status === 'active' && selection.id === operation.payload.targetSelectionId
      ));
      const prerequisiteSelection = child?.policy.selections.find((selection) => (
        selection.status === 'active'
        && selection.id === operation.payload.rule.prerequisiteActivity.selectionId
      ));
      if (!child || !targetSelection || !prerequisiteSelection
        || child.policy.desiredPolicyVersion !== operation.payload.expectedPolicyVersion) {
        return {
          status: 'failed', code: 'screen_time_target_stale',
          message: 'The child, saved app selection, or Screen Time version changed. Refresh before continuing.',
          retryable: true,
        };
      }
      const minutes = operation.payload.rule.prerequisiteActivity.thresholdMinutes;
      const proposal: StagedUnifiedChatToolProposal = {
        capabilityId: 'screenTime',
        title: `Use ${prerequisiteSelection.label} before ${targetSelection.label}`,
        body: `${child.displayName} uses ${prerequisiteSelection.label} for ${minutes} minute${minutes === 1 ? '' : 's'} before ${targetSelection.label} become available each day.`,
        operation,
      };
      staged.push(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    }

    if (call.toolId === 'profile.update') {
      const profile = snapshots.profile?.profile;
      if (!profile) return failed('profile_not_found', 'The coaching profile is not available.');
      const patch = parseProfileMutationPatch(call.arguments.fields);
      if (!patch) return failed('invalid_profile_patch', 'A supported display name or age range change is required.');
      const proposal: StagedUnifiedChatToolProposal = {
        capabilityId: 'profile', title: 'Update your profile',
        body: 'Reviews the requested profile change before applying it.',
        operation: {
          type: 'update_profile', targetId: profile.id,
          expectedUpdatedAt: profile.updatedAt, payload: patch,
        },
      };
      staged.push(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    }

    if (call.toolId === 'chapters.note.update') {
      const chapterId = typeof call.arguments.chapterId === 'string' ? call.arguments.chapterId : '';
      const chapter = snapshots.chapters.chapters.find((candidate) => candidate.id === chapterId);
      if (!chapter) return failed('chapter_not_found', 'The selected Chapter is no longer available.');
      const patch = parseChapterNotePatch({ note: call.arguments.note });
      if (!patch) return failed('invalid_chapter_note', 'The Chapter note must be 500 characters or fewer.');
      const proposal: StagedUnifiedChatToolProposal = {
        capabilityId: 'chapters', title: patch.note ? 'Add a line to your Chapter' : 'Clear your Chapter note',
        body: 'Reviews this personal Chapter note before saving it.',
        operation: {
          type: 'update_chapter_note', targetId: chapter.id,
          expectedUpdatedAt: chapter.user_note_updated_at ?? chapter.updated_at, payload: patch,
        },
      };
      staged.push(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    }

    if (call.toolId === 'arcs.read') {
      return {
        status: 'completed', receipt: null,
        output: {
          arcs: (snapshots.arcs?.arcs ?? []).slice(0, 20).map((arc) => ({
            id: arc.id, name: arc.name, narrative: arc.narrative ?? null,
            identityStatement: arc.identity?.statement ?? null,
            status: arc.status, updatedAt: arc.updatedAt,
          })),
        },
      };
    }

    if (call.toolId === 'arcs.create') {
      const input = parseArcCreateInput(call.arguments);
      if (!input) return failed('invalid_arc', 'A valid Arc name and supported fields are required.');
      const proposal: StagedUnifiedChatToolProposal = {
        capabilityId: 'arcs', title: `Create ${input.name}`,
        body: 'Creates this identity Arc after review. Kwilt will not adopt it until you approve.',
        operation: { type: 'create_arc', targetId: null, expectedUpdatedAt: null, payload: input },
      };
      staged.push(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    }

    if (call.toolId === 'arcs.update') {
      const arcId = typeof call.arguments.arcId === 'string' ? call.arguments.arcId : '';
      const arc = snapshots.arcs?.arcs.find((candidate) => candidate.id === arcId);
      if (!arc) return failed('arc_not_found', 'The selected Arc is no longer available.');
      const patch = parseArcMutationPatch(call.arguments.fields);
      if (!patch) return failed('invalid_arc_patch', 'No supported Arc fields were provided.');
      const proposal: StagedUnifiedChatToolProposal = {
        capabilityId: 'arcs', title: `Update ${arc.name}`,
        body: 'Reviews the requested identity change before applying it.',
        operation: { type: 'update_arc', targetId: arc.id, expectedUpdatedAt: arc.updatedAt, payload: patch },
      };
      staged.push(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    }

    if (call.toolId === 'arcs.delete') {
      const arcId = typeof call.arguments.arcId === 'string' ? call.arguments.arcId : '';
      const arc = snapshots.arcs?.arcs.find((candidate) => candidate.id === arcId);
      if (!arc) return failed('arc_not_found', 'The selected Arc is no longer available.');
      const linkedGoals = snapshots.goals.goals.filter((goal) => goal.arcId === arc.id);
      const linkedGoalIds = new Set(linkedGoals.map((goal) => goal.id));
      const activityCount = snapshots.todos.activities.filter((activity) => linkedGoalIds.has(activity.goalId ?? '')).length;
      const goalLabel = `${linkedGoals.length} linked ${linkedGoals.length === 1 ? 'Goal' : 'Goals'}`;
      const activityLabel = `${activityCount} linked ${activityCount === 1 ? 'Activity' : 'Activities'}`;
      const proposal: StagedUnifiedChatToolProposal = {
        capabilityId: 'arcs', title: `Delete ${arc.name}`,
        body: `Deletes this Arc, ${goalLabel}, and ${activityLabel} after review. Undo restores them.`,
        operation: { type: 'delete_arc', targetId: arc.id, expectedUpdatedAt: arc.updatedAt, payload: {} },
      };
      staged.push(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    }

    if (call.toolId === 'goals.read') {
      return {
        status: 'completed', receipt: null,
        output: {
          goals: snapshots.goals.goals.slice(0, 30).map((goal) => ({
            id: goal.id, title: goal.title, description: goal.description ?? null,
            status: goal.status, arcId: goal.arcId, priority: goal.priority ?? null,
            targetDate: goal.targetDate ?? null, updatedAt: goal.updatedAt,
          })),
        },
      };
    }

    if (call.toolId === 'activities.read') {
      return {
        status: 'completed', receipt: null,
        output: {
          activities: snapshots.todos.activities.slice(0, 40).map((activity) => ({
            id: activity.id, title: activity.title, status: activity.status,
            goalId: activity.goalId, updatedAt: activity.updatedAt,
            reminderAt: activity.reminderAt ?? null,
            repeatRule: activity.repeatRule ?? null,
            repeatCustom: activity.repeatCustom ?? null,
            repeatBasis: activity.repeatBasis ?? null,
            steps: (activity.steps ?? []).slice(0, 24).map((step, index) => ({
              id: step.id, title: step.title, completed: Boolean(step.completedAt),
              optional: Boolean(step.isOptional), order: step.orderIndex ?? index,
            })),
          })),
        },
      };
    }

    if (call.toolId === 'chapters.read') {
      return {
        status: 'completed', receipt: null,
        output: {
          chapters: snapshots.chapters.chapters.slice(0, 20).map((chapter) => ({
            id: chapter.id, periodKey: chapter.period_key, status: chapter.status,
            userNote: chapter.user_note ?? null, updatedAt: chapter.user_note_updated_at ?? chapter.updated_at,
          })),
        },
      };
    }

    if (call.toolId === 'goals.update') {
      const goalId = typeof call.arguments.goalId === 'string' ? call.arguments.goalId : '';
      const goal = snapshots.goals.goals.find((candidate) => candidate.id === goalId);
      if (!goal) return failed('goal_not_found', 'The selected Goal is no longer available.');
      const patch = parseGoalMutationPatch(call.arguments.fields);
      if (!patch) return failed('invalid_goal_patch', 'No supported Goal fields were provided.');
      if (patch.arcId && !snapshots.goals.arcIds?.includes(patch.arcId)) {
        return failed('arc_not_found', 'The selected Arc is no longer available.');
      }
      const proposal: StagedUnifiedChatToolProposal = {
        capabilityId: 'goals', title: `Update ${goal.title}`,
        body: 'Reviews the requested Goal changes before applying them.',
        operation: { type: 'update_goal', targetId: goal.id, expectedUpdatedAt: goal.updatedAt, payload: patch },
      };
      staged.push(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    }

    if (call.toolId === 'goals.create') {
      const input = parseGoalCreateInput(call.arguments);
      if (!input) return failed('invalid_goal', 'A valid Goal title and supported fields are required.');
      if (input.arcId && !snapshots.goals.arcIds?.includes(input.arcId)) {
        return failed('arc_not_found', 'The selected Arc is no longer available.');
      }
      const proposal: StagedUnifiedChatToolProposal = {
        capabilityId: 'goals', title: `Create ${input.title}`,
        body: input.arcId
          ? 'Creates this Goal draft in the selected Arc after review.'
          : 'Creates this unassigned Goal draft after review.',
        operation: { type: 'create_goal', targetId: null, expectedUpdatedAt: null, payload: input },
      };
      staged.push(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    }

    if (call.toolId === 'goals.delete') {
      const goalId = typeof call.arguments.goalId === 'string' ? call.arguments.goalId : '';
      const goal = snapshots.goals.goals.find((candidate) => candidate.id === goalId);
      if (!goal) return failed('goal_not_found', 'The selected Goal is no longer available.');
      const dependentCount = snapshots.todos.activities.filter((activity) => activity.goalId === goal.id).length;
      const proposal: StagedUnifiedChatToolProposal = {
        capabilityId: 'goals', title: `Delete ${goal.title}`,
        body: dependentCount > 0
          ? `Deletes this Goal and ${dependentCount} linked ${dependentCount === 1 ? 'Activity' : 'Activities'} after review. Undo restores them.`
          : 'Deletes this Goal after review. Undo restores it.',
        operation: { type: 'delete_goal', targetId: goal.id, expectedUpdatedAt: goal.updatedAt, payload: {} },
      };
      staged.push(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    }

    if (call.toolId === 'plan.read_day_context' || call.toolId === 'plan.recommend_day') {
      if (!snapshots.plan) return { status: 'unavailable', reason: 'Plan context is not loaded.', retryable: true };
      return {
        status: 'completed', receipt: null,
        output: {
          targetDate: snapshots.plan.targetDate,
          limitation: snapshots.plan.limitation,
          conversationReferent: planConversationReferent ?? null,
          scheduledItems: snapshots.plan.scheduledItems ?? [],
          recommendations: snapshots.plan.recommendations.slice(0, 8),
        },
      };
    }

    if (call.toolId === 'activities.capture') {
      const {
        reminderLocalTime,
        repeatWeekdays,
        ...durableArguments
      } = call.arguments;
      const recurringReminder = reminderLocalTime !== undefined || repeatWeekdays !== undefined
        ? buildRecurringReminderFields({ reminderLocalTime, repeatWeekdays, now: now() })
        : null;
      if ((reminderLocalTime !== undefined || repeatWeekdays !== undefined) && !recurringReminder) {
        return failed('invalid_recurring_reminder', 'A valid local reminder time and weekday are required.');
      }
      const patch = parseActivityMutationPatch({ ...durableArguments, ...(recurringReminder ?? {}) });
      if (!patch?.title) return failed('invalid_activity_patch', 'A valid Activity title is required.');
      const proposal: StagedUnifiedChatToolProposal = {
        capabilityId: 'todos',
        title: `Add ${patch.title}`,
        body: 'Creates this To-do through Kwilt.',
        operation: { type: 'create_activity', targetId: null, expectedUpdatedAt: null, payload: { ...patch, title: patch.title } },
      };
      staged.push(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    }

    if (call.toolId === 'activities.update') {
      const activityId = typeof call.arguments.activityId === 'string' ? call.arguments.activityId : '';
      const activity = snapshots.todos.activities.find((candidate) => candidate.id === activityId);
      if (!activity) return failed('activity_not_found', 'The selected Activity is no longer available.');
      const patch = parseActivityMutationPatch(call.arguments.fields);
      if (!patch) return failed('invalid_activity_patch', 'No supported Activity fields were provided.');
      const proposal: StagedUnifiedChatToolProposal = {
        capabilityId: 'todos',
        title: `Update ${activity.title}`,
        body: 'Reviews the requested To-do changes before applying them.',
        operation: { type: 'update_activity', targetId: activity.id, expectedUpdatedAt: activity.updatedAt, payload: patch },
      };
      staged.push(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    }

    if (call.toolId === 'activities.focus_today') {
      const activityId = typeof call.arguments.activityId === 'string' ? call.arguments.activityId : '';
      const activity = snapshots.todos.activities.find((candidate) => candidate.id === activityId);
      if (!activity) return failed('activity_not_found', 'The selected Activity is no longer available.');
      const proposal: StagedUnifiedChatToolProposal = {
        capabilityId: 'todos',
        title: `Focus on ${activity.title} today`,
        body: "Schedules this To-do for today's focus after review. It remains a soft Plan signal and can be undone.",
        operation: {
          type: 'update_activity', targetId: activity.id, expectedUpdatedAt: activity.updatedAt,
          payload: { scheduledDate: toLocalDateKey(new Date()) },
        },
      };
      staged.push(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    }

    if (call.toolId === 'activities.delete') {
      const activityId = typeof call.arguments.activityId === 'string' ? call.arguments.activityId : '';
      const activity = snapshots.todos.activities.find((candidate) => candidate.id === activityId);
      if (!activity) return failed('activity_not_found', 'The selected Activity is no longer available.');
      const proposal: StagedUnifiedChatToolProposal = {
        capabilityId: 'todos',
        title: `Delete ${activity.title}`,
        body: 'Deletes this To-do after review. The receipt can restore it unless another item takes its id.',
        operation: {
          type: 'delete_activity', targetId: activity.id,
          expectedUpdatedAt: activity.updatedAt, payload: {},
        },
      };
      staged.push(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    }

    if (call.toolId === 'activities.reminder.update' || call.toolId === 'activities.repeat.update') {
      const activityId = typeof call.arguments.activityId === 'string' ? call.arguments.activityId : '';
      const activity = snapshots.todos.activities.find((candidate) => candidate.id === activityId);
      if (!activity) return failed('activity_not_found', 'The selected Activity is no longer available.');
      const rawPatch = call.toolId === 'activities.reminder.update'
        ? { reminderAt: call.arguments.reminderAt }
        : {
            repeatRule: call.arguments.repeatRule,
            repeatCustom: call.arguments.repeatRule === 'custom' ? call.arguments.repeatCustom : null,
            ...(call.arguments.repeatBasis === 'scheduled' || call.arguments.repeatBasis === 'after_completion'
              ? { repeatBasis: call.arguments.repeatBasis }
              : {}),
          };
      const patch = parseActivityMutationPatch(rawPatch);
      if (!patch || (patch.repeatRule === 'custom' && !patch.repeatCustom)) {
        return failed('invalid_activity_schedule', 'A valid reminder or recurrence rule is required.');
      }
      const isReminder = call.toolId === 'activities.reminder.update';
      const proposal: StagedUnifiedChatToolProposal = {
        capabilityId: 'todos',
        title: `${isReminder ? 'Update reminder for' : 'Update repeat for'} ${activity.title}`,
        body: isReminder
          ? 'Reviews the reminder change before saving it. Device notification settings still apply.'
          : 'Reviews the repeat change before saving it.',
        operation: {
          type: 'update_activity', targetId: activity.id,
          expectedUpdatedAt: activity.updatedAt, payload: patch,
        },
      };
      staged.push(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    }

    if (call.toolId === 'plan.schedule_activity') {
      const activityId = typeof call.arguments.activityId === 'string' ? call.arguments.activityId : '';
      const activity = snapshots.todos.activities.find((candidate) => candidate.id === activityId);
      if (!activity) return failed('activity_not_found', 'The selected Activity is no longer available.');
      const referentFailure = planReferentFailure(activity);
      if (referentFailure) return referentFailure;
      if (activity.calendarBinding || activity.scheduledProviderEventId) {
        return failed('activity_already_scheduled', 'This Activity is already linked to a calendar block.');
      }
      if (!snapshots.plan?.writeCalendarRef) {
        return { status: 'unavailable', reason: 'A writable Plan calendar is not configured.', retryable: false };
      }
      const startDate = typeof call.arguments.startDate === 'string' ? call.arguments.startDate : '';
      const endDate = typeof call.arguments.endDate === 'string' ? call.arguments.endDate : '';
      const targetDateKey = typeof call.arguments.targetDateKey === 'string' ? call.arguments.targetDateKey : '';
      const startMs = Date.parse(startDate);
      const endMs = Date.parse(endDate);
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs ||
          !/^\d{4}-\d{2}-\d{2}$/.test(targetDateKey)) {
        return failed('invalid_plan_placement', 'A valid start, end, and Plan date are required.');
      }
      const payload: PlanScheduleActivityPayload = {
        activityId: activity.id,
        expectedUpdatedAt: activity.updatedAt,
        startDate,
        endDate,
        targetDateKey,
        writeCalendarRef: snapshots.plan.writeCalendarRef,
      };
      const proposal: StagedUnifiedChatToolProposal = {
        capabilityId: 'plan',
        title: `Schedule ${activity.title}`,
        body: 'Reviews the proposed calendar placement before creating it.',
        operation: {
          type: 'schedule_activity', targetId: activity.id,
          expectedUpdatedAt: activity.updatedAt, payload,
        },
      };
      staged.push(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    }

    if (call.toolId === 'plan.schedule_chunks') {
      const activityId = typeof call.arguments.activityId === 'string' ? call.arguments.activityId : '';
      const activity = snapshots.todos.activities.find((candidate) => candidate.id === activityId);
      if (!activity) return failed('activity_not_found', 'The selected Activity is no longer available.');
      const referentFailure = planReferentFailure(activity);
      if (referentFailure) return referentFailure;
      if (!snapshots.plan?.writeCalendarRef) {
        return { status: 'unavailable', reason: 'A writable Plan calendar is not configured.', retryable: false };
      }
      const rawChunks = Array.isArray(call.arguments.chunks) ? call.arguments.chunks : [];
      const chunks = rawChunks.map((value) => {
        const chunk = value && typeof value === 'object' && !Array.isArray(value)
          ? value as Record<string, unknown>
          : {};
        return {
          title: typeof chunk.title === 'string' ? chunk.title.trim() : '',
          startDate: typeof chunk.startDate === 'string' ? chunk.startDate : '',
          endDate: typeof chunk.endDate === 'string' ? chunk.endDate : '',
          targetDateKey: typeof chunk.targetDateKey === 'string' ? chunk.targetDateKey : '',
        };
      });
      const valid = chunks.length >= 2 && chunks.length <= 10 && chunks.every((chunk) =>
        chunk.title.length > 0 && chunk.title.length <= 160 &&
        Number.isFinite(Date.parse(chunk.startDate)) && Number.isFinite(Date.parse(chunk.endDate)) &&
        Date.parse(chunk.endDate) > Date.parse(chunk.startDate) &&
        /^\d{4}-\d{2}-\d{2}$/.test(chunk.targetDateKey));
      const sorted = [...chunks].sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate));
      const overlaps = sorted.some((chunk, index) => index > 0 &&
        Date.parse(chunk.startDate) < Date.parse(sorted[index - 1].endDate));
      if (!valid || overlaps) {
        return failed('invalid_plan_chunks', 'Provide two to ten valid, non-overlapping calendar chunks.');
      }
      const groupId = `plan-chunks:${call.id}`;
      chunks.forEach((chunk, index) => {
        const payload: PlanScheduleChunkPayload = {
          activityId: activity.id, expectedUpdatedAt: activity.updatedAt,
          groupId, chunkId: `chunk-${index + 1}`, title: chunk.title,
          startDate: chunk.startDate, endDate: chunk.endDate,
          targetDateKey: chunk.targetDateKey,
          writeCalendarRef: snapshots.plan!.writeCalendarRef!,
        };
        staged.push({
          capabilityId: 'plan', title: chunk.title,
          body: `Reviews chunk ${index + 1} of ${chunks.length} before creating its calendar event.`,
          operation: {
            type: 'schedule_activity_chunk', targetId: activity.id,
            expectedUpdatedAt: activity.updatedAt, payload,
          },
        });
      });
      return {
        status: 'proposed',
        proposal: { groupId, count: chunks.length, title: `Schedule ${activity.title} in ${chunks.length} chunks` },
      };
    }

    if (call.toolId === 'plan.reschedule_activity' || call.toolId === 'plan.remove_activity') {
      const activityId = typeof call.arguments.activityId === 'string' ? call.arguments.activityId : '';
      const activity = snapshots.todos.activities.find((candidate) => candidate.id === activityId);
      if (!activity) return failed('activity_not_found', 'The selected Activity is no longer available.');
      const referentFailure = planReferentFailure(activity);
      if (referentFailure) return referentFailure;
      if (!activity.scheduledAt || !activity.calendarBinding) {
        return failed('plan_binding_missing', 'This Activity is not linked to a calendar block Kwilt can manage.');
      }
      if (activity.calendarBinding.kind !== 'provider') {
        return { status: 'unavailable', reason: 'This device-calendar block must be changed in Plan.', retryable: false };
      }
      const previousStart = new Date(activity.scheduledAt);
      const previousEnd = new Date(previousStart.getTime() + Math.max(10, activity.estimateMinutes ?? 30) * 60_000);
      const previousTargetDateKey = toLocalDateKey(previousStart);
      let operation: Extract<StagedUnifiedChatToolProposal, { capabilityId: 'plan' }>['operation'];
      let title: string;
      let body: string;
      if (call.toolId === 'plan.reschedule_activity') {
        const startDate = typeof call.arguments.startDate === 'string' ? call.arguments.startDate : '';
        const endDate = typeof call.arguments.endDate === 'string' ? call.arguments.endDate : '';
        const targetDateKey = typeof call.arguments.targetDateKey === 'string' ? call.arguments.targetDateKey : '';
        if (!Number.isFinite(Date.parse(startDate)) || !Number.isFinite(Date.parse(endDate)) ||
            Date.parse(endDate) <= Date.parse(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(targetDateKey)) {
          return failed('invalid_plan_placement', 'A valid start, end, and Plan date are required.');
        }
        operation = {
          type: 'reschedule_activity', targetId: activity.id, expectedUpdatedAt: activity.updatedAt,
          payload: {
            activityId: activity.id, expectedUpdatedAt: activity.updatedAt, startDate, endDate,
            targetDateKey, previousStartDate: previousStart.toISOString(),
            previousEndDate: previousEnd.toISOString(), previousTargetDateKey,
          },
        };
        title = `Move ${activity.title}`;
        body = 'Reviews the new calendar placement before moving it.';
      } else {
        operation = {
          type: 'remove_activity_from_plan', targetId: activity.id, expectedUpdatedAt: activity.updatedAt,
          payload: {
            activityId: activity.id, expectedUpdatedAt: activity.updatedAt,
            previousStartDate: previousStart.toISOString(), previousEndDate: previousEnd.toISOString(),
            previousTargetDateKey, previousBinding: activity.calendarBinding,
          },
        };
        title = `Remove ${activity.title} from Plan`;
        body = 'Deletes the managed calendar block after review. Undo recreates it if calendar access remains available.';
      }
      const proposal: StagedUnifiedChatToolProposal = { capabilityId: 'plan', title, body, operation };
      staged.push(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    }

    if (call.toolId.startsWith('activities.steps.')) {
      const activityId = typeof call.arguments.activityId === 'string' ? call.arguments.activityId : '';
      const activity = snapshots.todos.activities.find((candidate) => candidate.id === activityId);
      if (!activity) return failed('activity_not_found', 'The selected Activity is no longer available.');
      const stepId = typeof call.arguments.stepId === 'string' ? call.arguments.stepId : '';
      const step = stepId ? (activity.steps ?? []).find((candidate) => candidate.id === stepId) : null;
      let operation: ActivityProposalOperation;
      let summary: string;

      if (call.toolId === 'activities.steps.create') {
        const title = typeof call.arguments.title === 'string' ? call.arguments.title.trim() : '';
        if (!title || title.length > 240) return failed('invalid_step', 'A valid step title is required.');
        operation = {
          type: 'create_activity_step', targetId: activity.id, expectedUpdatedAt: activity.updatedAt,
          payload: { title, isOptional: call.arguments.optional === true },
        };
        summary = `Add step ${title}`;
      } else if (call.toolId === 'activities.steps.reorder') {
        const requested = Array.isArray(call.arguments.stepIds)
          ? call.arguments.stepIds.filter((id): id is string => typeof id === 'string')
          : [];
        const existing = new Set((activity.steps ?? []).map((candidate) => candidate.id));
        if (requested.length === 0 || new Set(requested).size !== requested.length || requested.some((id) => !existing.has(id))) {
          return failed('invalid_step_order', 'Step order must contain unique existing step ids.');
        }
        operation = {
          type: 'reorder_activity_steps', targetId: activity.id, expectedUpdatedAt: activity.updatedAt,
          payload: { stepIds: requested },
        };
        summary = `Reorder steps in ${activity.title}`;
      } else if (!step) {
        return failed('step_not_found', 'The selected Activity step is no longer available.');
      } else if (call.toolId === 'activities.steps.update') {
        const title = typeof call.arguments.title === 'string' ? call.arguments.title.trim() : undefined;
        const hasOptional = typeof call.arguments.optional === 'boolean';
        if ((!title || title.length > 240) && !hasOptional) {
          return failed('invalid_step_patch', 'A title or optional-state change is required.');
        }
        operation = {
          type: 'update_activity_step', targetId: activity.id, expectedUpdatedAt: activity.updatedAt,
          payload: {
            stepId: step.id,
            ...(title ? { title } : {}),
            ...(hasOptional ? { isOptional: call.arguments.optional as boolean } : {}),
          },
        };
        summary = `Update step ${step.title}`;
      } else if (call.toolId === 'activities.steps.complete') {
        if (typeof call.arguments.completed !== 'boolean') {
          return failed('invalid_step_completion', 'A completed state is required.');
        }
        operation = {
          type: 'complete_activity_step', targetId: activity.id, expectedUpdatedAt: activity.updatedAt,
          payload: { stepId: step.id, completed: call.arguments.completed },
        };
        summary = `${call.arguments.completed ? 'Complete' : 'Reopen'} step ${step.title}`;
      } else if (call.toolId === 'activities.steps.delete') {
        operation = {
          type: 'delete_activity_step', targetId: activity.id, expectedUpdatedAt: activity.updatedAt,
          payload: { stepId: step.id },
        };
        summary = `Delete step ${step.title}`;
      } else {
        return { status: 'unavailable', reason: `No provider is registered for ${call.toolId}.`, retryable: false };
      }

      const proposal: StagedUnifiedChatToolProposal = {
        capabilityId: 'todos', title: summary, body: 'Reviews this step change before applying it.', operation,
      };
      staged.push(proposal);
      return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
    }

    return { status: 'unavailable', reason: `No provider is registered for ${call.toolId}.`, retryable: false };
  };

  const execute = actionExecution
    ? async (call: AgentToolCall, tool: AgentToolDefinition): Promise<AgentToolExecutionResult> => {
      const receipt = await executeActionEnvelope({
        envelope: actionExecution.envelope(call, tool),
        store: actionExecution.store,
        resolveTarget: actionExecution.resolveTarget,
        createReceiptId: actionExecution.createReceiptId,
        now: actionExecution.now,
        execute: () => executeRaw(call, tool),
      });
      return toolResultFromActionReceipt(receipt);
    }
    : executeRaw;

  return {
    execute,
    proposals: (): readonly StagedUnifiedChatToolProposal[] => [
      ...staged,
      ...moneyProvider.proposals(),
      ...(householdProposals?.() ?? []),
    ],
    clientActions: () => [...deviceProvider.actions(), ...moneyProvider.actions()],
  };
}
