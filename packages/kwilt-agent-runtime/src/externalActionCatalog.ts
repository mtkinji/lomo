import type {
  CapabilityConfirmation,
  CapabilityManifestEntry,
  CapabilityOAuthScope,
} from './capabilityManifest.ts';

export type ExternalExposureState = 'exposed' | 'status_only' | 'hidden';
export type ExternalRedactionPolicy =
  | 'bounded_summary'
  | 'account_identity'
  | 'identity_summary'
  | 'goal_summary'
  | 'activity_summary'
  | 'chapter_summary'
  | 'streak_summary'
  | 'relationship_summary'
  | 'household_summary'
  | 'chore_summary'
  | 'screen_time_summary'
  | 'money_summary'
  | 'plan_summary'
  | 'mutation_receipt';

export type ExternalCompatibilityAlias = {
  name: string;
  version: 1;
};

export type ExternalActionRegistration = {
  operationId: string;
  toolId: string;
  canonicalName: string;
  title: string;
  exposure: ExternalExposureState;
  requiredScopes: readonly CapabilityOAuthScope[];
  consequence: CapabilityManifestEntry['consequence'];
  confirmation: CapabilityConfirmation;
  redactionPolicy: ExternalRedactionPolicy;
  compatibilityAliases: readonly ExternalCompatibilityAlias[];
};

export type ExternalActionAnnotations = {
  title: string;
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint?: boolean;
  openWorldHint: boolean;
};

export type ExternalActionCatalogEntry = ExternalActionRegistration & {
  description: string;
  effect: CapabilityManifestEntry['effect'];
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  annotations: ExternalActionAnnotations;
};

type ServerRegistration = { toolId: string };

export type ExternalControlCoverageState =
  | 'exposed'
  | 'not_applicable'
  | 'explicit_boundary'
  | 'pending_registration'
  | 'pending_provider'
  | 'excluded';

export type ExternalControlCoverageRow = {
  operationId: string;
  owner: string;
  state: ExternalControlCoverageState;
  toolIds: readonly string[];
  reason: string;
};

function isDestructive(operationId: string): boolean {
  return /(^|\.)(delete|forget|remove|revoke|deactivate)(\.|$)/.test(operationId);
}

function assertUniqueExternalNames(registrations: readonly ExternalActionRegistration[]): void {
  const names = new Set<string>();
  for (const registration of registrations) {
    const registrationNames = [registration.canonicalName, ...registration.compatibilityAliases.map((alias) => alias.name)];
    for (const name of registrationNames) {
      if (names.has(name)) throw new Error(`Duplicate external action name: ${name}`);
      names.add(name);
    }
  }
}

export function projectExternalActionCatalog(input: {
  manifest: readonly CapabilityManifestEntry[];
  serverRegistrations: readonly ServerRegistration[];
  externalRegistrations: readonly ExternalActionRegistration[];
  availableScopes: readonly string[];
}): ExternalActionCatalogEntry[] {
  assertUniqueExternalNames(input.externalRegistrations);
  const operationById = new Map(input.manifest.map((operation) => [operation.id, operation]));
  const serverToolIds = new Set(input.serverRegistrations.map((registration) => registration.toolId));
  const availableScopes = new Set(input.availableScopes);

  return input.externalRegistrations.flatMap((registration) => {
    if (registration.exposure === 'hidden') return [];
    const operation = operationById.get(registration.operationId);
    if (!operation) return [];
    const contract = operation.tools.find((tool) => tool.id === registration.toolId);
    if (!contract || !serverToolIds.has(registration.toolId)) return [];
    if (registration.requiredScopes.some((scope) => !availableScopes.has(scope))) return [];
    if (registration.exposure === 'status_only' && operation.effect !== 'read') return [];
    if (registration.consequence !== operation.consequence) {
      throw new Error(`External consequence does not match operation ${operation.id}`);
    }
    if (registration.confirmation !== operation.confirmation) {
      throw new Error(`External confirmation does not match operation ${operation.id}`);
    }
    const operationScopes = new Set(operation.requiredScopes);
    if (registration.requiredScopes.length !== operationScopes.size
      || registration.requiredScopes.some((scope) => !operationScopes.has(scope))) {
      throw new Error(`External scopes do not match operation ${operation.id}`);
    }
    if (operation.effect === 'write' && !registration.requiredScopes.some((scope) => scope.endsWith('.write'))) {
      throw new Error(`External write requires write scope: ${operation.id}`);
    }

    const readOnly = operation.effect === 'read';
    return [{
      ...registration,
      description: operation.purpose,
      effect: operation.effect,
      inputSchema: contract.inputSchema,
      outputSchema: contract.outputSchema,
      annotations: {
        title: registration.title,
        readOnlyHint: readOnly,
        destructiveHint: !readOnly && isDestructive(operation.id),
        ...(readOnly ? { idempotentHint: true } : {}),
        openWorldHint: false,
      },
    }];
  });
}

export function projectExternalControlCoverage(input: {
  manifest: readonly CapabilityManifestEntry[];
  serverRegistrations: readonly ServerRegistration[];
  externalRegistrations: readonly ExternalActionRegistration[];
  scopeByOwner: Readonly<Record<string, 'core' | 'supporting' | 'excluded'>>;
  nonApplicableOperationIds?: readonly string[];
}): ExternalControlCoverageRow[] {
  const serverToolIds = new Set(input.serverRegistrations.map((registration) => registration.toolId));
  const exposedOperationIds = new Set(input.externalRegistrations
    .filter((registration) => registration.exposure === 'exposed' && serverToolIds.has(registration.toolId))
    .map((registration) => registration.operationId));
  const notApplicableOperationIds = new Set(input.nonApplicableOperationIds ?? []);

  return input.manifest.map((operation) => {
    const scope = input.scopeByOwner[operation.owner];
    if (!scope) throw new Error(`Missing external control scope for owner: ${operation.owner}`);
    if (scope === 'excluded') {
      return {
        operationId: operation.id, owner: operation.owner, state: 'excluded' as const,
        toolIds: operation.tools.map((tool) => tool.id), reason: 'Capability is explicitly outside external conversational control.',
      };
    }
    if (notApplicableOperationIds.has(operation.id)) {
      return {
        operationId: operation.id, owner: operation.owner, state: 'not_applicable' as const,
        toolIds: operation.tools.map((tool) => tool.id), reason: 'This is an internal orchestration operation rather than a user-callable external action.',
      };
    }
    if (operation.channels.phone.state === 'excluded') {
      return {
        operationId: operation.id, owner: operation.owner, state: 'explicit_boundary' as const,
        toolIds: operation.tools.map((tool) => tool.id),
        reason: operation.channels.phone.boundaryReason ?? 'This operation is explicitly withheld from external control.',
      };
    }
    if (exposedOperationIds.has(operation.id)) {
      return {
        operationId: operation.id, owner: operation.owner, state: 'exposed' as const,
        toolIds: operation.tools.map((tool) => tool.id), reason: 'A scoped external action is backed by the canonical server dispatcher.',
      };
    }
    if (operation.tools.some((tool) => serverToolIds.has(tool.id))) {
      return {
        operationId: operation.id, owner: operation.owner, state: 'pending_registration' as const,
        toolIds: operation.tools.map((tool) => tool.id), reason: 'The server dispatcher is available, but the operation is not yet registered externally.',
      };
    }
    return {
      operationId: operation.id, owner: operation.owner, state: 'pending_provider' as const,
      toolIds: operation.tools.map((tool) => tool.id), reason: 'No server or durable device-handoff provider is registered for external control yet.',
    };
  });
}

const alias = (name: string): readonly ExternalCompatibilityAlias[] => [{ name, version: 1 }];
const read = (
  operationId: string,
  toolId: string,
  canonicalName: string,
  title: string,
  legacyName: string,
  redactionPolicy: Exclude<ExternalRedactionPolicy, 'mutation_receipt'>,
): ExternalActionRegistration => ({
  operationId, toolId, canonicalName, title, exposure: 'exposed', requiredScopes: ['life.read'],
  consequence: 'low', confirmation: 'none', redactionPolicy, compatibilityAliases: alias(legacyName),
});
const write = (
  operationId: string,
  toolId: string,
  canonicalName: string,
  title: string,
  legacyName: string,
  consequence: ExternalActionRegistration['consequence'],
  confirmation: CapabilityConfirmation,
): ExternalActionRegistration => ({
  operationId, toolId, canonicalName, title, exposure: 'exposed', requiredScopes: ['life.read', 'life.write'],
  consequence, confirmation, redactionPolicy: 'mutation_receipt', compatibilityAliases: alias(legacyName),
});

const canonicalRead = (
  operationId: string,
  toolId: string,
  canonicalName: string,
  title: string,
  requiredScopes: readonly CapabilityOAuthScope[],
  redactionPolicy: Exclude<ExternalRedactionPolicy, 'mutation_receipt'>,
): ExternalActionRegistration => ({
  operationId, toolId, canonicalName, title, exposure: 'exposed', requiredScopes,
  consequence: 'low', confirmation: 'none', redactionPolicy, compatibilityAliases: [],
});

const canonicalWrite = (
  operationId: string,
  toolId: string,
  canonicalName: string,
  title: string,
  requiredScopes: readonly CapabilityOAuthScope[],
  consequence: ExternalActionRegistration['consequence'],
  confirmation: CapabilityConfirmation,
): ExternalActionRegistration => ({
  operationId, toolId, canonicalName, title, exposure: 'exposed', requiredScopes,
  consequence, confirmation, redactionPolicy: 'mutation_receipt', compatibilityAliases: [],
});

/**
 * External exposure is opt-in. Compatibility aliases expire after connector contract v1;
 * canonical names are stable projections of operation identities.
 */
export const EXTERNAL_ACTION_REGISTRATIONS: readonly ExternalActionRegistration[] = [
  read('profile.read', 'profile.read', 'kwilt_profile_read', 'Get Current Account', 'get_current_account', 'account_identity'),
  read('arcs.list', 'arcs.read', 'kwilt_arcs_list', 'List Arcs', 'list_arcs', 'identity_summary'),
  read('arcs.get', 'arcs.read', 'kwilt_arcs_get', 'Get Arc', 'get_arc', 'identity_summary'),
  read('goals.list', 'goals.read', 'kwilt_goals_list', 'List Goals', 'list_goals', 'goal_summary'),
  read('goals.get', 'goals.read', 'kwilt_goals_get', 'Get Goal', 'get_goal', 'goal_summary'),
  read('activities.list', 'activities.read', 'kwilt_activities_list', 'List Recent To-dos', 'list_recent_activities', 'activity_summary'),
  read('chapters.get', 'chapters.read', 'kwilt_chapters_get_current', 'Get Current Chapter', 'get_current_chapter', 'chapter_summary'),
  read('account.show_up_status', 'account.show_up_status', 'kwilt_account_show_up_status', 'Get Show-up Status', 'get_show_up_status', 'streak_summary'),
  write('arcs.create', 'arcs.create', 'kwilt_arcs_create', 'Create Arc', 'create_arc', 'consequential', 'explicit'),
  write('arcs.update', 'arcs.update', 'kwilt_arcs_update', 'Update Arc', 'update_arc', 'consequential', 'explicit'),
  write('arcs.delete', 'arcs.delete', 'kwilt_arcs_delete', 'Delete Arc', 'delete_arc', 'consequential', 'explicit'),
  write('goals.create', 'goals.create', 'kwilt_goals_create', 'Create Goal', 'create_goal', 'consequential', 'explicit'),
  write('goals.update', 'goals.update', 'kwilt_goals_update', 'Update Goal', 'update_goal', 'low', 'explicit'),
  write('goals.delete', 'goals.delete', 'kwilt_goals_delete', 'Delete Goal', 'delete_goal', 'consequential', 'explicit'),
  write('goals.check_in', 'goals.check_in', 'kwilt_goals_check_in', 'Add Goal Check-in', 'add_goal_checkin', 'low', 'native'),
  write('activities.capture', 'activities.capture', 'kwilt_activities_capture', 'Capture To-do', 'capture_activity', 'low', 'none'),
  write('activities.update', 'activities.update', 'kwilt_activities_update', 'Update To-do', 'update_activity', 'low', 'explicit'),
  write('activities.steps.create', 'activities.steps.create', 'kwilt_activity_steps_create', 'Create To-do Step', 'create_activity_step', 'low', 'explicit'),
  write('activities.steps.update', 'activities.steps.update', 'kwilt_activity_steps_update', 'Update To-do Step', 'update_activity_step', 'low', 'explicit'),
  write('activities.steps.complete', 'activities.steps.complete', 'kwilt_activity_steps_complete', 'Mark To-do Step Done', 'mark_activity_step_done', 'low', 'explicit'),
  write('activities.steps.delete', 'activities.steps.delete', 'kwilt_activity_steps_delete', 'Delete To-do Step', 'delete_activity_step', 'low', 'explicit'),
  write('activities.steps.reorder', 'activities.steps.reorder', 'kwilt_activity_steps_reorder', 'Reorder To-do Steps', 'reorder_activity_steps', 'low', 'explicit'),
  write('activities.complete', 'activities.update', 'kwilt_activities_complete', 'Mark To-do Done', 'mark_activity_done', 'low', 'explicit'),
  write('activities.focus_today', 'activities.focus_today', 'kwilt_activities_focus_today', 'Set Focus Today', 'set_focus_today', 'low', 'explicit'),
  write('activities.delete', 'activities.delete', 'kwilt_activities_delete', 'Delete To-do', 'delete_activity', 'consequential', 'explicit'),
  write('chapters.note.update', 'chapters.note.update', 'kwilt_chapters_note_update', 'Update Chapter Note', 'update_chapter_user_note', 'low', 'explicit'),
  canonicalRead('chapters.digest_settings.read', 'chapters.digest_settings.read', 'kwilt_chapters_digest_settings_read', 'Read Weekly Chapter Settings', ['life.read'], 'chapter_summary'),
  canonicalWrite('chapters.digest_settings.update', 'chapters.digest_settings.update', 'kwilt_chapters_digest_settings_update', 'Update Weekly Chapter Settings', ['life.read', 'life.write'], 'low', 'explicit'),
  canonicalRead('chapters.alignment.preview', 'chapters.alignment.preview', 'kwilt_chapters_alignment_preview', 'Preview Chapter Alignment', ['life.read'], 'chapter_summary'),
  canonicalWrite('chapters.alignment.apply', 'chapters.alignment.apply', 'kwilt_chapters_alignment_apply', 'Apply Chapter Alignment', ['life.read', 'life.write'], 'consequential', 'explicit'),
  canonicalWrite('notifications.preferences.update', 'notifications.preferences.update', 'kwilt_notifications_preferences_update', 'Review Notification Preferences', ['life.read', 'life.write'], 'low', 'native'),
  canonicalRead('notifications.preferences.read', 'notifications.preferences.read', 'kwilt_notifications_preferences_read', 'Read Notification Preferences', ['life.read'], 'bounded_summary'),

  canonicalRead('plan.read_day_context', 'plan.read_day_context', 'kwilt_plan_read_day_context', 'Read Plan Day', ['life.read'], 'plan_summary'),
  canonicalRead('plan.recommend_day', 'plan.recommend_day', 'kwilt_plan_recommend_day', 'Recommend Plan Day', ['life.read'], 'plan_summary'),
  canonicalRead('plan.availability.read', 'plan.availability.read', 'kwilt_plan_availability_read', 'Read Plan Availability', ['life.read'], 'plan_summary'),
  canonicalWrite('plan.availability.update', 'plan.availability.update', 'kwilt_plan_availability_update', 'Review Plan Availability', ['life.read', 'life.write'], 'low', 'explicit'),
  canonicalRead('plan.calendars.read', 'plan.calendars.read', 'kwilt_plan_calendars_read', 'Review Plan Calendars', ['life.read'], 'plan_summary'),
  canonicalWrite('plan.calendars.update', 'plan.calendars.update', 'kwilt_plan_calendars_update', 'Update Plan Calendars', ['life.read', 'life.write'], 'consequential', 'native'),
  canonicalRead('activities.get', 'activities.read', 'kwilt_activities_get', 'Get To-do', ['life.read'], 'activity_summary'),
  canonicalRead('activities.search', 'activities.read', 'kwilt_activities_search', 'Search To-dos', ['life.read'], 'activity_summary'),
  canonicalWrite('plan.schedule_activity', 'plan.schedule_activity', 'kwilt_plan_schedule_activity', 'Schedule To-do in Plan', ['life.read', 'life.write'], 'low', 'explicit'),
  canonicalWrite('plan.reschedule_activity', 'plan.reschedule_activity', 'kwilt_plan_reschedule_activity', 'Move Planned To-do', ['life.read', 'life.write'], 'low', 'explicit'),
  canonicalWrite('plan.remove_activity', 'plan.remove_activity', 'kwilt_plan_remove_activity', 'Remove To-do from Plan', ['life.read', 'life.write'], 'consequential', 'explicit'),
  canonicalWrite('activities.schedule', 'plan.schedule_activity', 'kwilt_activities_schedule', 'Schedule To-do', ['life.read', 'life.write'], 'low', 'explicit'),
  canonicalWrite('plan.schedule_chunks', 'plan.schedule_chunks', 'kwilt_plan_schedule_chunks', 'Schedule To-do Chunks', ['life.read', 'life.write'], 'low', 'explicit'),
  canonicalWrite('activities.reminder.update', 'activities.reminder.update', 'kwilt_activities_reminder_update', 'Update To-do Reminder', ['life.read', 'life.write'], 'low', 'explicit'),
  canonicalWrite('activities.repeat.update', 'activities.repeat.update', 'kwilt_activities_repeat_update', 'Update To-do Repeat', ['life.read', 'life.write'], 'low', 'explicit'),

  canonicalRead('relationships.read', 'relationships.read', 'kwilt_relationships_read', 'Read Relationships', ['household.read'], 'relationship_summary'),
  canonicalWrite('relationships.remember', 'relationships.remember', 'kwilt_relationships_remember', 'Remember Relationship Detail', ['household.read', 'household.write'], 'low', 'none'),
  canonicalWrite('relationships.correct', 'relationships.correct', 'kwilt_relationships_correct', 'Correct Relationship Detail', ['household.read', 'household.write'], 'low', 'none'),
  canonicalWrite('relationships.forget', 'relationships.forget', 'kwilt_relationships_forget', 'Forget Relationship Detail', ['household.read', 'household.write'], 'low', 'none'),

  canonicalRead('household.read', 'household.read', 'kwilt_household_read', 'Read Household', ['household.read'], 'household_summary'),
  canonicalWrite('household.member.add_dependent', 'household.member.add_dependent', 'kwilt_household_member_add_dependent', 'Add Household Dependent', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalWrite('household.invitation.create', 'household.invitation.create', 'kwilt_household_invitation_create', 'Create Household Invitation', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalRead('household.invitation.preview', 'household.invitation.preview', 'kwilt_household_invitation_preview', 'Preview Household Invitation', ['household.read'], 'household_summary'),
  canonicalWrite('household.invitation.accept', 'household.invitation.accept', 'kwilt_household_invitation_accept', 'Accept Household Invitation', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalWrite('household.child_capability.update', 'household.child_capability.update', 'kwilt_household_child_capability_update', 'Update Child Capability', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalWrite('household.caregiver_grant.update', 'household.caregiver_grant.update', 'kwilt_household_caregiver_grant_update', 'Update Caregiver Authority', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalWrite('household.member.update', 'household.member.update', 'kwilt_household_member_update', 'Update Household Member', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalWrite('household.member.remove', 'household.member.remove', 'kwilt_household_member_remove', 'Remove Household Member', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalRead('household.device.list', 'household.device.list', 'kwilt_household_devices_list', 'List Household Devices', ['household.read'], 'household_summary'),
  canonicalWrite('household.device.update', 'household.device.update', 'kwilt_household_device_update', 'Update Household Device', ['household.read', 'household.write'], 'low', 'explicit'),
  canonicalWrite('household.device.revoke', 'household.device.revoke', 'kwilt_household_device_revoke', 'Revoke Household Device', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalWrite('household.device.reconcile', 'household.device.reconcile', 'kwilt_household_device_reconcile', 'Reconcile Household Device', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalRead('chores.list', 'chores.list', 'kwilt_chores_list', 'List Chores', ['household.read'], 'chore_summary'),
  canonicalWrite('chores.open', 'chores.open', 'kwilt_chores_open', 'Open Chores', ['household.read', 'household.write'], 'low', 'native'),
  canonicalRead('chores.get', 'chores.get', 'kwilt_chores_get', 'Get Chore', ['household.read'], 'chore_summary'),
  canonicalWrite('chores.definition.create', 'chores.definition.create', 'kwilt_chores_definition_create', 'Create Chore', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalWrite('chores.definition.update', 'chores.definition.update', 'kwilt_chores_definition_update', 'Update Chore', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalWrite('chores.definition.pause', 'chores.definition.pause', 'kwilt_chores_definition_pause', 'Pause Chore', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalWrite('chores.definition.delete', 'chores.definition.delete', 'kwilt_chores_definition_delete', 'Delete Chore', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalWrite('chores.occurrence.complete', 'chores.occurrence.complete', 'kwilt_chores_occurrence_complete', 'Complete Chore Occurrence', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalWrite('chores.occurrence.claim', 'chores.occurrence.claim', 'kwilt_chores_occurrence_claim', 'Claim Chore Occurrence', ['household.read', 'household.write'], 'low', 'explicit'),
  canonicalWrite('chores.occurrence.release', 'chores.occurrence.release', 'kwilt_chores_occurrence_release', 'Release Chore Occurrence', ['household.read', 'household.write'], 'low', 'explicit'),
  canonicalWrite('chores.occurrence.reopen', 'chores.occurrence.reopen', 'kwilt_chores_occurrence_reopen', 'Reopen Chore Occurrence', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalWrite('chores.occurrence.report_earlier', 'chores.occurrence.report_earlier', 'kwilt_chores_occurrence_report_earlier', 'Report Earlier Chore Occurrences', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalWrite('chores.evidence.add', 'chores.evidence.add', 'kwilt_chores_evidence_add', 'Add Chore Photo', ['household.read', 'household.write'], 'low', 'native'),
  canonicalWrite('chores.review.approve', 'chores.review.approve', 'kwilt_chores_review_approve', 'Approve Chore', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalWrite('chores.review.return', 'chores.review.return', 'kwilt_chores_review_return', 'Return Chore', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalWrite('chores.review.leave_missed', 'chores.review.leave_missed', 'kwilt_chores_review_leave_missed', 'Leave Chore Missed', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalRead('chores.reward.read', 'chores.reward.read', 'kwilt_chores_reward_read', 'Read Chore Rewards', ['household.read'], 'chore_summary'),
  canonicalWrite('chores.reward.configure', 'chores.reward.configure', 'kwilt_chores_reward_configure', 'Configure Chore Rewards', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalWrite('chores.reward.reserve', 'chores.reward.reserve', 'kwilt_chores_reward_reserve', 'Reserve Chore Tokens', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalWrite('chores.reward.cancel', 'chores.reward.cancel', 'kwilt_chores_reward_cancel', 'Cancel Chore Reward Reservation', ['household.read', 'household.write'], 'low', 'explicit'),
  canonicalWrite('chores.reward.settle', 'chores.reward.settle', 'kwilt_chores_reward_settle', 'Record Chore Reward Payout', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalRead('recipes.search', 'recipes.search', 'kwilt_recipes_search', 'Search Recipes', ['food.read'], 'bounded_summary'),
  canonicalRead('recipes.read', 'recipes.read', 'kwilt_recipes_read', 'Read Recipe', ['food.read'], 'bounded_summary'),
  canonicalWrite('recipes.create', 'recipes.create', 'kwilt_recipes_create', 'Create Recipe', ['food.read', 'food.write'], 'low', 'explicit'),
  canonicalWrite('recipes.import.prepare', 'recipes.import.prepare', 'kwilt_recipes_import_prepare', 'Prepare Recipe Import', ['food.read', 'food.write'], 'low', 'none'),
  canonicalWrite('recipes.import.approve', 'recipes.import.approve', 'kwilt_recipes_import_approve', 'Approve Recipe Import', ['food.read', 'food.write'], 'low', 'explicit'),
  canonicalWrite('recipes.update', 'recipes.update', 'kwilt_recipes_update', 'Update Recipe', ['food.read', 'food.write'], 'low', 'explicit'),
  canonicalWrite('recipes.delete', 'recipes.delete', 'kwilt_recipes_delete', 'Delete Recipe', ['food.read', 'food.write'], 'consequential', 'explicit'),
  canonicalRead('recipes.scale.preview', 'recipes.scale.preview', 'kwilt_recipes_scale_preview', 'Preview Recipe Scaling', ['food.read'], 'bounded_summary'),
  canonicalWrite('recipes.favorite.update', 'recipes.favorite.update', 'kwilt_recipes_favorite_update', 'Update Recipe Favorite', ['food.read', 'food.write'], 'low', 'explicit'),
  canonicalWrite('recipes.visibility.update', 'recipes.visibility.update', 'kwilt_recipes_visibility_update', 'Hide or Restore Recipe', ['food.read', 'food.write'], 'low', 'explicit'),
  canonicalWrite('recipes.fork', 'recipes.fork', 'kwilt_recipes_fork', 'Save Independent Recipe Copy', ['food.read', 'food.write'], 'low', 'explicit'),
  canonicalWrite('recipes.share_copy.prepare', 'recipes.share_copy.prepare', 'kwilt_recipes_share_copy_prepare', 'Prepare Recipe Copy Sharing', ['food.read', 'food.write'], 'low', 'explicit'),
  canonicalWrite('recipes.collaborator.invite', 'recipes.collaborator.invite', 'kwilt_recipes_collaborator_invite', 'Invite Recipe Collaborator', ['food.read', 'food.write'], 'consequential', 'explicit'),
  canonicalRead('cook_session.read', 'cook_session.read', 'kwilt_cook_session_read', 'Read Cook Session', ['food.read'], 'bounded_summary'),
  canonicalWrite('cook_session.start', 'cook_session.start', 'kwilt_cook_session_start', 'Start Cook Session', ['food.read', 'food.write'], 'low', 'explicit'),
  canonicalWrite('cook_session.control', 'cook_session.control', 'kwilt_cook_session_control', 'Control Cook Session', ['food.read', 'food.write'], 'low', 'none'),
  canonicalWrite('cook_session.complete', 'cook_session.complete', 'kwilt_cook_session_complete', 'Complete Cook Session', ['food.read', 'food.write'], 'low', 'explicit'),
  canonicalRead('meal_planning.preferences.read', 'meal_planning.preferences.read', 'kwilt_meal_preferences_read', 'Read Meal Preferences', ['food.read'], 'bounded_summary'),
  canonicalWrite('meal_planning.preferences.update', 'meal_planning.preferences.update', 'kwilt_meal_preferences_update', 'Update Meal Preferences', ['food.read', 'food.write'], 'consequential', 'explicit'),
  canonicalWrite('meal_planning.plan.create', 'meal_planning.plan.create', 'kwilt_meal_plan_create', 'Create Meal Plan', ['food.read', 'food.write'], 'low', 'explicit'),
  canonicalWrite('meal_planning.plan.update', 'meal_planning.plan.update', 'kwilt_meal_plan_update', 'Update Meal Plan', ['food.read', 'food.write'], 'low', 'explicit'),
  canonicalWrite('meal_planning.candidate.add', 'meal_planning.candidate.add', 'kwilt_meal_plan_candidate_add', 'Add Meal Candidate', ['food.read', 'food.write'], 'low', 'explicit'),
  canonicalWrite('meal_planning.candidate.remove', 'meal_planning.candidate.remove', 'kwilt_meal_plan_candidate_remove', 'Remove Meal Candidate', ['food.read', 'food.write'], 'low', 'explicit'),
  canonicalWrite('meal_planning.round.open', 'meal_planning.round.open', 'kwilt_meal_choice_round_open', 'Open Meal Choice Round', ['food.read', 'food.write'], 'consequential', 'explicit'),
  canonicalWrite('meal_planning.round.close', 'meal_planning.round.close', 'kwilt_meal_choice_round_close', 'Close Meal Choice Round', ['food.read', 'food.write'], 'consequential', 'explicit'),
  canonicalWrite('meal_planning.response.submit', 'meal_planning.response.submit', 'kwilt_meal_choice_response_submit', 'Submit Meal Choices', ['food.read', 'food.write'], 'low', 'explicit'),
  canonicalWrite('meal_planning.response.withdraw', 'meal_planning.response.withdraw', 'kwilt_meal_choice_response_withdraw', 'Withdraw Meal Choices', ['food.read', 'food.write'], 'low', 'explicit'),
  canonicalWrite('meal_planning.plan.finalize', 'meal_planning.plan.finalize', 'kwilt_meal_plan_finalize', 'Finalize Meal Plan', ['food.read', 'food.write'], 'low', 'explicit'),
  canonicalWrite('meal_planning.plan.revise', 'meal_planning.plan.revise', 'kwilt_meal_plan_revise', 'Revise Meal Plan', ['food.read', 'food.write'], 'low', 'explicit'),
  canonicalRead('meal_planning.candidates.prepare', 'meal_planning.candidates.prepare', 'kwilt_meal_candidates_prepare', 'Prepare Meal Candidates', ['food.read'], 'bounded_summary'),
  canonicalRead('food_budget.read', 'food_budget.read', 'kwilt_food_budget_read', 'Read Food Budget', ['food.read'], 'bounded_summary'),
  canonicalRead('food_stock.read', 'food_stock.read', 'kwilt_food_stock_read', 'Read Food Stock', ['food.read'], 'bounded_summary'),
  canonicalWrite('food_stock.observe', 'food_stock.observe', 'kwilt_food_stock_observe', 'Update Food Stock', ['food.read', 'food.write'], 'low', 'explicit'),
  canonicalWrite('food_stock.deplete', 'food_stock.deplete', 'kwilt_food_stock_deplete', 'Mark Food Stock Depleted', ['food.read', 'food.write'], 'low', 'explicit'),
  canonicalWrite('groceries.compile', 'groceries.compile', 'kwilt_groceries_compile', 'Compile Grocery List', ['food.read', 'food.write'], 'low', 'explicit'),
  canonicalWrite('groceries.item.add', 'groceries.item.add', 'kwilt_groceries_item_add', 'Add Grocery Item', ['food.read', 'food.write'], 'low', 'explicit'),
  canonicalWrite('groceries.item.update', 'groceries.item.update', 'kwilt_groceries_item_update', 'Update Grocery Item', ['food.read', 'food.write'], 'low', 'explicit'),
  canonicalWrite('groceries.item.set_state', 'groceries.item.set_state', 'kwilt_groceries_item_set_state', 'Set Grocery Item State', ['food.read', 'food.write'], 'low', 'explicit'),
  canonicalRead('groceries.list.review', 'groceries.list.review', 'kwilt_groceries_list_review', 'Review Grocery List', ['food.read'], 'bounded_summary'),
  canonicalRead('groceries.product_match.prepare', 'groceries.product_match.prepare', 'kwilt_groceries_product_match_prepare', 'Prepare Retailer Product Matches', ['food.read'], 'bounded_summary'),
  canonicalWrite('groceries.product_match.confirm', 'groceries.product_match.confirm', 'kwilt_groceries_product_match_confirm', 'Confirm Retailer Product Match', ['food.read', 'food.write'], 'consequential', 'explicit'),
  canonicalWrite('groceries.handoff.prepare', 'groceries.handoff.prepare', 'kwilt_groceries_handoff_prepare', 'Prepare Grocery Retailer Handoff', ['food.read', 'food.write'], 'low', 'explicit'),
  canonicalWrite('groceries.handoff.open', 'groceries.handoff.open', 'kwilt_groceries_handoff_open', 'Open Grocery Retailer Handoff', ['food.read', 'food.write'], 'consequential', 'native'),
  canonicalWrite('recipes.publication.prepare', 'recipes.publication.prepare', 'kwilt_recipes_publication_prepare', 'Prepare Recipe Publication Review', ['food.read', 'food.write'], 'low', 'explicit'),
  canonicalWrite('recipes.publication.publish', 'recipes.publication.publish', 'kwilt_recipes_publication_publish', 'Review Recipe Publication', ['food.read', 'food.write'], 'consequential', 'explicit'),
  canonicalWrite('store_opportunity.capture', 'store_opportunity.capture', 'kwilt_store_opportunity_capture', 'Review Store Opportunity', ['food.read', 'food.write'], 'low', 'explicit'),
  canonicalRead('food_scenario.prepare', 'food_scenario.prepare', 'kwilt_food_scenario_prepare', 'Prepare Food Scenario Review', ['food.read'], 'bounded_summary'),
  canonicalWrite('food_scenario.accept', 'food_scenario.accept', 'kwilt_food_scenario_accept', 'Review Food Scenario Acceptance', ['food.read', 'food.write'], 'consequential', 'explicit'),
  canonicalRead('savings.review', 'savings.review', 'kwilt_savings_review', 'Review Grocery Savings', ['food.read'], 'bounded_summary'),
  canonicalWrite('savings.accept', 'savings.accept', 'kwilt_savings_accept', 'Review Savings Plan Acceptance', ['food.read', 'food.write'], 'consequential', 'explicit'),
  canonicalWrite('savings.coupon.open', 'savings.coupon.open', 'kwilt_savings_coupon_open', 'Open Coupon Activation Review', ['food.read', 'food.write'], 'consequential', 'native'),
  canonicalWrite('receipt.extract', 'receipt.extract', 'kwilt_receipt_extract', 'Review Receipt Extraction', ['food.read', 'food.write'], 'low', 'none'),
  canonicalWrite('receipt.reconcile', 'receipt.reconcile', 'kwilt_receipt_reconcile', 'Review Receipt Reconciliation', ['food.read', 'food.write'], 'low', 'explicit'),
  canonicalRead('screen_time.read', 'screen_time.read', 'kwilt_screen_time_read', 'Read Screen Time', ['household.read'], 'screen_time_summary'),
  canonicalWrite('screen_time.agreement.create', 'screen_time.agreement.create', 'kwilt_screen_time_create_prerequisite_agreement', 'Create Screen Time Prerequisite', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalWrite('screen_time.agreement.update', 'screen_time.agreement.update', 'kwilt_screen_time_update_agreement', 'Update Screen Time Agreement', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalWrite('screen_time.agreement.deactivate', 'screen_time.agreement.deactivate', 'kwilt_screen_time_deactivate_agreement', 'Deactivate Screen Time Agreement', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalWrite('screen_time.override.block', 'screen_time.override.block', 'kwilt_screen_time_block', 'Block Saved Apps Temporarily', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalWrite('screen_time.override.allow', 'screen_time.override.allow', 'kwilt_screen_time_allow', 'Allow Saved Apps Temporarily', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalWrite('screen_time.override.cancel', 'screen_time.override.cancel', 'kwilt_screen_time_cancel_override', 'Cancel Screen Time Override', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalWrite('screen_time.request.decide', 'screen_time.request.decide', 'kwilt_screen_time_decide_request', 'Decide Screen Time Request', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalRead('screen_time.personal_rule.list', 'screen_time.personal_rule.list', 'kwilt_screen_time_personal_rules_list', 'List My Screen Time Rules', ['household.read'], 'screen_time_summary'),
  canonicalRead('screen_time.personal_rule.get', 'screen_time.personal_rule.get', 'kwilt_screen_time_personal_rule_get', 'Get My Screen Time Rule', ['household.read'], 'screen_time_summary'),
  canonicalWrite('screen_time.personal_rule.update', 'screen_time.personal_rule.update', 'kwilt_screen_time_personal_rule_update', 'Update My Screen Time Rule', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalWrite('screen_time.personal_rule.deactivate', 'screen_time.personal_rule.deactivate', 'kwilt_screen_time_personal_rule_deactivate', 'Deactivate My Screen Time Rule', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalWrite('screen_time.personal_rule.delete', 'screen_time.personal_rule.delete', 'kwilt_screen_time_personal_rule_delete', 'Delete My Screen Time Rule', ['household.read', 'household.write'], 'consequential', 'explicit'),
  canonicalWrite('screen_time.personal.setup.open', 'screen_time.personal.setup.open', 'kwilt_screen_time_personal_setup_open', 'Set Up My Screen Time', ['household.read', 'household.write'], 'low', 'native'),
  canonicalWrite('screen_time.personal.limit.open', 'screen_time.personal.limit.open', 'kwilt_screen_time_personal_limit_open', 'Review My App Limit', ['household.read', 'household.write'], 'low', 'native'),
  canonicalWrite('screen_time.selection.open', 'screen_time.selection.open', 'kwilt_screen_time_selection_open', 'Choose Child Apps', ['household.read', 'household.write'], 'low', 'native'),
  canonicalWrite('screen_time.device.setup.open', 'screen_time.device.setup.open', 'kwilt_screen_time_device_setup_open', 'Set Up Child Device', ['household.read', 'household.write'], 'low', 'native'),
  canonicalWrite('screen_time.device.release.open', 'screen_time.device.release.open', 'kwilt_screen_time_device_release_open', 'Release Child Device', ['household.read', 'household.write'], 'consequential', 'native'),

  canonicalRead('money.budget.read', 'money.budget.read', 'kwilt_money_budget_read', 'Review Money Plan', ['money.read'], 'money_summary'),
  canonicalWrite('money.budget.update', 'money.budget.update', 'kwilt_money_budget_update', 'Update Money Plan', ['money.read', 'money.write'], 'consequential', 'explicit'),
  canonicalRead('money.transaction.get', 'money.transaction.get', 'kwilt_money_transaction_get', 'Review Money Transaction', ['money.read'], 'money_summary'),
  canonicalWrite('money.transaction.meaning.update', 'money.transaction.meaning.update', 'kwilt_money_transaction_meaning_update', 'Update Transaction Meaning', ['money.read', 'money.write'], 'consequential', 'explicit'),
  canonicalWrite('money.transaction.plan_treatment.update', 'money.transaction.plan_treatment.update', 'kwilt_money_transaction_plan_treatment_update', 'Update Transaction Plan Treatment', ['money.read', 'money.write'], 'consequential', 'explicit'),
  canonicalWrite('money.connection.disconnect', 'money.connection.disconnect', 'kwilt_money_connection_disconnect', 'Disconnect Money Connection', ['money.read', 'money.write'], 'consequential', 'explicit'),
  canonicalWrite('money.connection.repair.open', 'money.connection.repair.open', 'kwilt_money_connection_repair_open', 'Repair Money Connection', ['money.read', 'money.write'], 'consequential', 'native'),
  canonicalRead('money.transfer.list', 'money.transfer.list', 'kwilt_money_transfer_list', 'List Money Transfers', ['money.read'], 'money_summary'),
  canonicalRead('money.transfer.get', 'money.transfer.get', 'kwilt_money_transfer_get', 'Review Money Transfer', ['money.read'], 'money_summary'),
  canonicalWrite('money.transfer.review', 'money.transfer.review', 'kwilt_money_transfer_review', 'Review Money Transfer Pair', ['money.read', 'money.write'], 'consequential', 'explicit'),

  canonicalRead('chapters.list', 'chapters.read', 'kwilt_chapters_list', 'List Chapters', ['life.read'], 'chapter_summary'),
  canonicalRead('chapters.reflect', 'chapters.read', 'kwilt_chapters_reflect', 'Reflect on Chapters', ['life.read'], 'chapter_summary'),

  canonicalWrite('profile.update', 'profile.update', 'kwilt_profile_update', 'Update Profile', ['life.read', 'life.write'], 'low', 'explicit'),
  canonicalWrite('goals.share', 'goals.share.open', 'kwilt_goals_share_open', 'Open Goal Sharing', ['life.read', 'life.write'], 'consequential', 'native'),
  canonicalWrite('activities.focus.open', 'activities.open_focus', 'kwilt_activities_focus_open', 'Open Focus', ['life.read', 'life.write'], 'low', 'native'),
  canonicalWrite('activities.location.update', 'activities.location.update', 'kwilt_activities_location_update', 'Review To-do Location', ['life.read', 'life.write'], 'consequential', 'native'),
  canonicalWrite('activities.attachments.update', 'activities.attachments.open', 'kwilt_activities_attachments_open', 'Open To-do Attachments', ['life.read', 'life.write'], 'consequential', 'native'),
  canonicalWrite('activities.share', 'activities.share.open', 'kwilt_activities_share_open', 'Open To-do Sharing', ['life.read', 'life.write'], 'consequential', 'native'),
  canonicalWrite('plan.preferences.open', 'plan.preferences.open', 'kwilt_plan_preferences_open', 'Open Plan Preferences', ['life.read', 'life.write'], 'low', 'native'),
  canonicalWrite('notifications.configure', 'notifications.configure', 'kwilt_notifications_configure', 'Open Notification Settings', ['life.read', 'life.write'], 'consequential', 'native'),
  canonicalWrite('search.open', 'navigation.search.open', 'kwilt_search_open', 'Open Kwilt Search', ['life.read', 'life.write'], 'low', 'native'),
  canonicalWrite('account.settings.open', 'navigation.account_settings.open', 'kwilt_account_settings_open', 'Open Account Settings', ['life.read', 'life.write'], 'low', 'native'),
  canonicalWrite('account.subscription.manage', 'account.subscription.open', 'kwilt_account_subscription_open', 'Open Subscription Management', ['life.read', 'life.write'], 'consequential', 'native'),
  canonicalWrite('account.delete', 'account.delete.open', 'kwilt_account_delete_open', 'Open Account Deletion', ['life.read', 'life.write'], 'consequential', 'native'),
  canonicalWrite('screen_time.configure', 'screen_time.configure', 'kwilt_screen_time_configure', 'Review Screen Time Control', ['household.read', 'household.write'], 'consequential', 'native'),
] as const;
