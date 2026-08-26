import type { CapabilityConfirmation, CapabilityManifestEntry } from './capabilityManifest.ts';

export type ExternalExposureState = 'exposed' | 'status_only' | 'hidden';
export type ExternalRedactionPolicy =
  | 'account_identity'
  | 'identity_summary'
  | 'goal_summary'
  | 'activity_summary'
  | 'chapter_summary'
  | 'streak_summary'
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
  requiredScopes: readonly string[];
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

function isDestructive(operationId: string): boolean {
  return /(^|\.)(delete|forget|remove|deactivate)(\.|$)/.test(operationId);
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
] as const;
