
import type { AgentToolDefinition, AgentToolProvider } from './types.ts';
import type {
  CapabilityConfirmation,
  ConversationalCompletionMode,
} from './capabilityManifest.ts';

const STRING_ID = { type: 'string', minLength: 1, maxLength: 200 } as const;
const VERSION = { type: 'integer', minimum: 0 } as const;
const UPDATED_AT = { type: 'string', format: 'date-time' } as const;
const EMPTY_SCHEMA = { type: 'object', properties: {}, additionalProperties: false } as const;

function objectSchema(
  properties: Record<string, unknown>,
  required: readonly string[] = Object.keys(properties),
): Record<string, unknown> {
  return { type: 'object', properties, required, additionalProperties: false };
}

function targetSchema(idName: string): Record<string, unknown> {
  return objectSchema({ [idName]: STRING_ID });
}

function versionedTargetSchema(idName: string, properties: Record<string, unknown> = {}): Record<string, unknown> {
  return objectSchema({ [idName]: STRING_ID, expectedVersion: VERSION, ...properties });
}

function timestampedTargetSchema(idName: string, properties: Record<string, unknown> = {}): Record<string, unknown> {
  return objectSchema({ [idName]: STRING_ID, expectedUpdatedAt: UPDATED_AT, ...properties });
}

const FIELDS = {
  type: 'array',
  minItems: 1,
  maxItems: 100,
  items: objectSchema({
    key: { type: 'string', minLength: 1, maxLength: 100 },
    value: { type: ['string', 'number', 'boolean', 'null'] },
  }),
} as const;
const STRING_LIST = {
  type: 'array',
  maxItems: 100,
  items: { type: 'string', minLength: 1, maxLength: 200 },
} as const;

export type ControlParityOperationContract = {
  id: string;
  owner: string;
  purpose: string;
  providers: readonly AgentToolProvider[];
  effect: AgentToolDefinition['effect'];
  consequence: AgentToolDefinition['consequence'];
  reversible: boolean;
  confirmation: CapabilityConfirmation;
  completionMode: ConversationalCompletionMode;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  sourceRefs: readonly string[];
};

function operation<const Contract extends ControlParityOperationContract>(contract: Contract): Contract {
  return contract;
}

const read = <const Contract extends Omit<
  ControlParityOperationContract,
  'effect' | 'consequence' | 'reversible' | 'confirmation' | 'completionMode' | 'outputSchema'
>>(contract: Contract) => operation({
  ...contract,
  effect: 'read' as const,
  consequence: 'low' as const,
  reversible: true,
  confirmation: 'none' as const,
  completionMode: 'direct' as const,
  outputSchema: EMPTY_SCHEMA,
});

const write = <const Contract extends Omit<
  ControlParityOperationContract,
  'effect' | 'outputSchema'
>>(contract: Contract) => operation({
  ...contract,
  effect: 'write' as const,
  outputSchema: EMPTY_SCHEMA,
});

const householdRefs = ['capability:household', 'action:householdManagementActions'] as const;
const planRefs = ['capability:plan', 'action:planPreferenceActions'] as const;
const chapterRefs = ['capability:chapters', 'action:chapterAlignmentActions'] as const;
const settingsRefs = ['capability:account', 'action:settingsActions'] as const;
const moneyRefs = ['capability:money', 'action:moneyControlActions'] as const;
const choreRefs = ['capability:chores', 'action:choreActions'] as const;
const recipeRefs = ['capability:recipes', 'action:recipeControlActions'] as const;
const mealRefs = ['capability:meal_planning', 'action:mealPreferenceActions'] as const;
const screenTimeRefs = ['capability:screenTime', 'action:personalScreenTimeRuleActions'] as const;
const notificationRefs = ['capability:notifications', 'action:notificationPreferenceActions'] as const;
const navigationRefs = ['capability:navigation', 'action:capabilityNavigationAction'] as const;

export const CONTROL_PARITY_OPERATION_CONTRACTS = [
  write({
    id: 'household.member.update', owner: 'household',
    purpose: 'Update explicitly reviewed fields on one household membership.',
    providers: ['device', 'server'], consequence: 'consequential', reversible: true,
    confirmation: 'explicit', completionMode: 'reviewed_proposal',
    inputSchema: timestampedTargetSchema('membershipId', {
      householdId: STRING_ID,
      fields: {
        type: 'object', minProperties: 1, additionalProperties: false,
        properties: {
          displayName: { type: 'string', minLength: 1, maxLength: 80 },
          role: { type: 'string', enum: ['caregiver', 'child'] },
        },
      },
    }), sourceRefs: householdRefs,
  }),
  write({
    id: 'household.member.remove', owner: 'household',
    purpose: 'Remove one household member only after reviewing affected authority, devices, and shared records.',
    providers: ['device', 'server'], consequence: 'consequential', reversible: false,
    confirmation: 'explicit', completionMode: 'reviewed_proposal',
    inputSchema: timestampedTargetSchema('membershipId', { householdId: STRING_ID }), sourceRefs: householdRefs,
  }),
  read({
    id: 'household.device.list', owner: 'household',
    purpose: 'List devices participating in the current household and their bounded status.',
    providers: ['device', 'server'], inputSchema: objectSchema({ householdId: STRING_ID }), sourceRefs: householdRefs,
  }),
  write({
    id: 'household.device.update', owner: 'household',
    purpose: 'Update the user-visible name or bounded settings of one household device.',
    providers: ['device', 'server'], consequence: 'low', reversible: true,
    confirmation: 'explicit', completionMode: 'reviewed_proposal',
    inputSchema: {
      type: 'object', minProperties: 4, additionalProperties: false,
      properties: {
        deviceId: STRING_ID, expectedUpdatedAt: UPDATED_AT, householdId: STRING_ID,
        displayName: { type: 'string', minLength: 1, maxLength: 80 },
        memberIds: { type: 'array', maxItems: 50, uniqueItems: true, items: STRING_ID },
      },
      required: ['deviceId', 'expectedUpdatedAt', 'householdId'],
    }, sourceRefs: householdRefs,
  }),
  write({
    id: 'household.device.revoke', owner: 'household',
    purpose: 'Revoke one household device after reviewing its actor and capability participation.',
    providers: ['device', 'server'], consequence: 'consequential', reversible: false,
    confirmation: 'explicit', completionMode: 'reviewed_proposal',
    inputSchema: timestampedTargetSchema('deviceId', { householdId: STRING_ID }), sourceRefs: householdRefs,
  }),
  write({
    id: 'household.device.reconcile', owner: 'household',
    purpose: 'Reconcile one device participation record with its current authoritative household assignment.',
    providers: ['device', 'server'], consequence: 'consequential', reversible: false,
    confirmation: 'explicit', completionMode: 'reviewed_proposal',
    inputSchema: timestampedTargetSchema('deviceId', { householdId: STRING_ID }), sourceRefs: householdRefs,
  }),

  read({
    id: 'plan.availability.read', owner: 'plan',
    purpose: 'Read the current weekly availability windows and time zone.',
    providers: ['device', 'server'], inputSchema: EMPTY_SCHEMA, sourceRefs: planRefs,
  }),
  write({
    id: 'plan.availability.update', owner: 'plan',
    purpose: 'Apply an explicitly reviewed weekly availability diff in one time zone.',
    providers: ['device', 'server'], consequence: 'low', reversible: true,
    confirmation: 'explicit', completionMode: 'reviewed_proposal',
    inputSchema: objectSchema({
      expectedVersion: VERSION,
      timeZone: { type: 'string', minLength: 1, maxLength: 100 },
      windows: {
        type: 'array',
        maxItems: 28,
        items: objectSchema({
          weekday: { type: 'integer', minimum: 1, maximum: 7 },
          startLocalTime: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
          endLocalTime: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
        }),
      },
    }), sourceRefs: planRefs,
  }),
  read({
    id: 'plan.calendars.read', owner: 'plan',
    purpose: 'Read the calendars currently available to and selected by Plan without exposing event contents.',
    providers: ['device'], inputSchema: EMPTY_SCHEMA, sourceRefs: planRefs,
  }),
  write({
    id: 'plan.calendars.update', owner: 'plan',
    purpose: 'Update selected Plan calendars after native calendar authorization and exact calendar review.',
    providers: ['device'], consequence: 'consequential', reversible: true,
    confirmation: 'native', completionMode: 'native_handoff',
    inputSchema: objectSchema({ expectedVersion: VERSION, calendarIds: STRING_LIST }), sourceRefs: planRefs,
  }),

  read({
    id: 'chapters.digest_settings.read', owner: 'chapters',
    purpose: 'Read current weekly Chapter generation and delivery preferences.',
    providers: ['device', 'server'], inputSchema: EMPTY_SCHEMA, sourceRefs: chapterRefs,
  }),
  write({
    id: 'chapters.digest_settings.update', owner: 'chapters',
    purpose: 'Update explicitly reviewed weekly Chapter generation and delivery preferences.',
    providers: ['device', 'server'], consequence: 'low', reversible: true,
    confirmation: 'explicit', completionMode: 'reviewed_proposal',
    inputSchema: objectSchema({ expectedVersion: VERSION, fields: FIELDS }), sourceRefs: chapterRefs,
  }),
  read({
    id: 'chapters.alignment.preview', owner: 'chapters',
    purpose: 'Preview the exact Activity changes in one Chapter alignment recommendation.',
    providers: ['device', 'server'], inputSchema: targetSchema('chapterId'), sourceRefs: chapterRefs,
  }),
  write({
    id: 'chapters.alignment.apply', owner: 'chapters',
    purpose: 'Apply one reviewed Chapter alignment proposal to the exact affected Activities.',
    providers: ['device', 'server'], consequence: 'consequential', reversible: true,
    confirmation: 'explicit', completionMode: 'reviewed_proposal',
    inputSchema: versionedTargetSchema('chapterId', { activityIds: STRING_LIST }), sourceRefs: chapterRefs,
  }),

  read({ id: 'settings.appearance.read', owner: 'settings', purpose: 'Read device appearance preferences.', providers: ['device'], inputSchema: EMPTY_SCHEMA, sourceRefs: settingsRefs }),
  write({ id: 'settings.appearance.update', owner: 'settings', purpose: 'Update device appearance preferences.', providers: ['device'], consequence: 'low', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: objectSchema({ fields: FIELDS }), sourceRefs: settingsRefs }),
  read({ id: 'settings.ai_model.read', owner: 'settings', purpose: 'Read the preferred AI model and bounded behavior policy.', providers: ['device', 'server'], inputSchema: EMPTY_SCHEMA, sourceRefs: settingsRefs }),
  write({ id: 'settings.ai_model.update', owner: 'settings', purpose: 'Update the preferred AI model after reviewing cost and behavior impact.', providers: ['device', 'server'], consequence: 'consequential', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: objectSchema({ expectedVersion: VERSION, modelId: STRING_ID }), sourceRefs: settingsRefs }),
  read({ id: 'settings.phone_agent.read', owner: 'settings', purpose: 'Read bounded Phone Agent enrollment and preference status.', providers: ['device', 'server'], inputSchema: EMPTY_SCHEMA, sourceRefs: settingsRefs }),
  write({ id: 'settings.phone_agent.update', owner: 'settings', purpose: 'Update Phone Agent preferences without collecting provider credentials.', providers: ['device', 'server'], consequence: 'consequential', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: objectSchema({ expectedVersion: VERSION, fields: FIELDS }), sourceRefs: settingsRefs }),
  read({ id: 'settings.connected_tools.list', owner: 'settings', purpose: 'List connected external tools and their bounded authorization status.', providers: ['device', 'server'], inputSchema: EMPTY_SCHEMA, sourceRefs: settingsRefs }),
  read({ id: 'settings.connected_tools.get', owner: 'settings', purpose: 'Inspect one connected tool without exposing credentials or tokens.', providers: ['device', 'server'], inputSchema: targetSchema('connectionId'), sourceRefs: settingsRefs }),
  write({ id: 'settings.connected_tools.connect.open', owner: 'settings', purpose: 'Open provider-owned OAuth connection for one supported tool.', providers: ['device', 'server'], consequence: 'consequential', reversible: true, confirmation: 'native', completionMode: 'provider_handoff', inputSchema: objectSchema({ providerId: STRING_ID }), sourceRefs: settingsRefs }),
  write({ id: 'settings.connected_tools.revoke', owner: 'settings', purpose: 'Revoke one connected tool after reviewing affected capability behavior.', providers: ['device', 'server'], consequence: 'consequential', reversible: false, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: versionedTargetSchema('connectionId'), sourceRefs: settingsRefs }),
  read({ id: 'settings.sharing.list', owner: 'settings', purpose: 'List bounded sharing connections and pending invitations.', providers: ['device', 'server'], inputSchema: EMPTY_SCHEMA, sourceRefs: settingsRefs }),
  write({ id: 'settings.sharing.invitation.prepare', owner: 'settings', purpose: 'Prepare a sharing invitation for exact native audience and delivery review.', providers: ['device', 'server'], consequence: 'consequential', reversible: true, confirmation: 'native', completionMode: 'native_handoff', inputSchema: objectSchema({ personId: STRING_ID, capabilityIds: STRING_LIST }), sourceRefs: settingsRefs }),
  write({ id: 'settings.sharing.connection.revoke', owner: 'settings', purpose: 'Revoke one sharing connection after reviewing what access will end.', providers: ['device', 'server'], consequence: 'consequential', reversible: false, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: versionedTargetSchema('connectionId'), sourceRefs: settingsRefs }),
  read({ id: 'settings.haptics.read', owner: 'settings', purpose: 'Read device haptic preferences.', providers: ['device'], inputSchema: EMPTY_SCHEMA, sourceRefs: settingsRefs }),
  write({ id: 'settings.haptics.update', owner: 'settings', purpose: 'Update device haptic preferences.', providers: ['device'], consequence: 'low', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: objectSchema({ fields: FIELDS }), sourceRefs: settingsRefs }),
  read({ id: 'settings.widgets.read', owner: 'settings', purpose: 'Read Kwilt widget preferences and installation guidance status.', providers: ['device'], inputSchema: EMPTY_SCHEMA, sourceRefs: settingsRefs }),
  write({ id: 'settings.widgets.configure', owner: 'settings', purpose: 'Configure Kwilt widget preferences and open OS-owned placement guidance.', providers: ['device'], consequence: 'low', reversible: true, confirmation: 'native', completionMode: 'native_handoff', inputSchema: objectSchema({ fields: FIELDS }), sourceRefs: settingsRefs }),
  read({ id: 'settings.execution_targets.list', owner: 'settings', purpose: 'List bounded execution targets without exposing provider credentials.', providers: ['device', 'server'], inputSchema: EMPTY_SCHEMA, sourceRefs: settingsRefs }),
  read({ id: 'settings.execution_targets.get', owner: 'settings', purpose: 'Inspect one bounded execution target.', providers: ['device', 'server'], inputSchema: targetSchema('targetId'), sourceRefs: settingsRefs }),
  write({ id: 'settings.execution_targets.create', owner: 'settings', purpose: 'Create one reviewed execution target from a supported provider type.', providers: ['device', 'server'], consequence: 'consequential', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: objectSchema({ providerId: STRING_ID, fields: FIELDS }), sourceRefs: settingsRefs }),
  write({ id: 'settings.execution_targets.update', owner: 'settings', purpose: 'Update one reviewed execution target without accepting arbitrary commands.', providers: ['device', 'server'], consequence: 'consequential', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: versionedTargetSchema('targetId', { fields: FIELDS }), sourceRefs: settingsRefs }),
  write({ id: 'settings.execution_targets.delete', owner: 'settings', purpose: 'Delete one execution target after reviewing affected behavior.', providers: ['device', 'server'], consequence: 'consequential', reversible: false, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: versionedTargetSchema('targetId'), sourceRefs: settingsRefs }),
  read({ id: 'settings.destinations.list', owner: 'settings', purpose: 'List user-defined supported destinations.', providers: ['device', 'server'], inputSchema: EMPTY_SCHEMA, sourceRefs: settingsRefs }),
  read({ id: 'settings.destinations.get', owner: 'settings', purpose: 'Inspect one user-defined supported destination.', providers: ['device', 'server'], inputSchema: targetSchema('destinationId'), sourceRefs: settingsRefs }),
  write({ id: 'settings.destinations.create', owner: 'settings', purpose: 'Create one destination using a supported destination type.', providers: ['device', 'server'], consequence: 'low', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: objectSchema({ kind: STRING_ID, fields: FIELDS }), sourceRefs: settingsRefs }),
  write({ id: 'settings.destinations.update', owner: 'settings', purpose: 'Update one destination without accepting arbitrary executable URLs.', providers: ['device', 'server'], consequence: 'low', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: versionedTargetSchema('destinationId', { fields: FIELDS }), sourceRefs: settingsRefs }),
  write({ id: 'settings.destinations.delete', owner: 'settings', purpose: 'Delete one user-defined destination.', providers: ['device', 'server'], consequence: 'consequential', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: versionedTargetSchema('destinationId'), sourceRefs: settingsRefs }),
  read({ id: 'settings.activity_areas.list', owner: 'settings', purpose: 'List configured Activity areas.', providers: ['device', 'server'], inputSchema: EMPTY_SCHEMA, sourceRefs: settingsRefs }),
  read({ id: 'settings.activity_areas.get', owner: 'settings', purpose: 'Inspect one configured Activity area.', providers: ['device', 'server'], inputSchema: targetSchema('areaId'), sourceRefs: settingsRefs }),
  write({ id: 'settings.activity_areas.create', owner: 'settings', purpose: 'Create one reviewed Activity area.', providers: ['device', 'server'], consequence: 'low', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: objectSchema({ fields: FIELDS }), sourceRefs: settingsRefs }),
  write({ id: 'settings.activity_areas.update', owner: 'settings', purpose: 'Update one reviewed Activity area.', providers: ['device', 'server'], consequence: 'low', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: versionedTargetSchema('areaId', { fields: FIELDS }), sourceRefs: settingsRefs }),
  write({ id: 'settings.activity_areas.delete', owner: 'settings', purpose: 'Delete one Activity area after reviewing affected Activities.', providers: ['device', 'server'], consequence: 'consequential', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: versionedTargetSchema('areaId'), sourceRefs: settingsRefs }),

  read({ id: 'money.budget.read', owner: 'money', purpose: 'Read the explicit monthly Money plan without calling it income or cash flow.', providers: ['device', 'server'], inputSchema: EMPTY_SCHEMA, sourceRefs: moneyRefs }),
  write({ id: 'money.budget.update', owner: 'money', purpose: 'Apply one reviewed monthly Money plan diff.', providers: ['device', 'server'], consequence: 'consequential', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: objectSchema({ expectedVersion: VERSION, month: { type: 'string', pattern: '^\\d{4}-\\d{2}$' }, fields: FIELDS }), sourceRefs: moneyRefs }),
  read({ id: 'money.transaction.get', owner: 'money', purpose: 'Read one authorized transaction and its explicit Money meaning and plan treatment.', providers: ['device', 'server'], inputSchema: targetSchema('transactionId'), sourceRefs: moneyRefs }),
  write({ id: 'money.transaction.meaning.update', owner: 'money', purpose: 'Correct the explicit meaning of one transaction without changing its plan treatment.', providers: ['device', 'server'], consequence: 'consequential', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: versionedTargetSchema('transactionId', { meaning: STRING_ID }), sourceRefs: moneyRefs }),
  write({ id: 'money.transaction.plan_treatment.update', owner: 'money', purpose: 'Correct one transaction planning treatment without changing provider classification.', providers: ['device', 'server'], consequence: 'consequential', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: versionedTargetSchema('transactionId', { treatment: STRING_ID }), sourceRefs: moneyRefs }),
  write({ id: 'money.connection.disconnect', owner: 'money', purpose: 'Disconnect one financial connection after reviewing affected accounts and sync behavior.', providers: ['device', 'server'], consequence: 'consequential', reversible: false, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: versionedTargetSchema('connectionId'), sourceRefs: moneyRefs }),
  write({ id: 'money.connection.repair.open', owner: 'money', purpose: 'Open provider-owned financial connection repair without collecting credentials.', providers: ['device', 'server'], consequence: 'consequential', reversible: true, confirmation: 'native', completionMode: 'provider_handoff', inputSchema: targetSchema('connectionId'), sourceRefs: moneyRefs }),
  read({ id: 'money.transfer.list', owner: 'money', purpose: 'List bounded transfer pairs without counting them as spending or income.', providers: ['device', 'server'], inputSchema: EMPTY_SCHEMA, sourceRefs: moneyRefs }),
  read({ id: 'money.transfer.get', owner: 'money', purpose: 'Inspect one bounded transfer pair and its linked evidence.', providers: ['device', 'server'], inputSchema: targetSchema('transferId'), sourceRefs: moneyRefs }),
  write({ id: 'money.transfer.review', owner: 'money', purpose: 'Apply one reviewed transfer pairing or correction.', providers: ['device', 'server'], consequence: 'consequential', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: versionedTargetSchema('transferId', { fields: FIELDS }), sourceRefs: moneyRefs }),

  read({ id: 'chores.list', owner: 'chores', purpose: 'List authorized Activity-backed Chore definitions, occurrences, reviews, and reward status.', providers: ['device', 'server'], inputSchema: EMPTY_SCHEMA, sourceRefs: choreRefs }),
  read({ id: 'chores.get', owner: 'chores', purpose: 'Inspect one authorized Activity-backed Chore definition or occurrence.', providers: ['device', 'server'], inputSchema: objectSchema({ choreId: STRING_ID, occurrenceId: { type: ['string', 'null'], maxLength: 200 } }), sourceRefs: choreRefs }),
  write({ id: 'chores.definition.create', owner: 'chores', purpose: 'Create one reviewed Activity-backed Chore definition.', providers: ['device', 'server'], consequence: 'consequential', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: objectSchema({ fields: FIELDS }), sourceRefs: choreRefs }),
  write({ id: 'chores.definition.update', owner: 'chores', purpose: 'Update one reviewed Chore definition without rewriting completed occurrence receipts.', providers: ['device', 'server'], consequence: 'consequential', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: versionedTargetSchema('choreId', { fields: FIELDS, scope: { type: 'string', enum: ['today', 'this_and_future'] } }), sourceRefs: choreRefs }),
  write({ id: 'chores.definition.pause', owner: 'chores', purpose: 'Pause one Chore definition without completing future occurrences.', providers: ['device', 'server'], consequence: 'consequential', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: versionedTargetSchema('choreId'), sourceRefs: choreRefs }),
  write({ id: 'chores.definition.delete', owner: 'chores', purpose: 'Delete one Chore definition while preserving historical receipts.', providers: ['device', 'server'], consequence: 'consequential', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: versionedTargetSchema('choreId'), sourceRefs: choreRefs }),
  write({ id: 'chores.occurrence.complete', owner: 'chores', purpose: 'Complete or submit one exact Chore occurrence under its evidence and approval policy.', providers: ['device', 'server'], consequence: 'consequential', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: versionedTargetSchema('occurrenceId', { evidenceRefIds: STRING_LIST }), sourceRefs: choreRefs }),
  write({ id: 'chores.evidence.add', owner: 'chores', purpose: 'Open native camera or photo-library selection for one Chore occurrence.', providers: ['device'], consequence: 'low', reversible: true, confirmation: 'native', completionMode: 'native_handoff', inputSchema: targetSchema('occurrenceId'), sourceRefs: choreRefs }),
  write({ id: 'chores.review.approve', owner: 'chores', purpose: 'Approve one submitted Chore occurrence as an authorized caregiver.', providers: ['device', 'server'], consequence: 'consequential', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: versionedTargetSchema('occurrenceId'), sourceRefs: choreRefs }),
  write({ id: 'chores.review.return', owner: 'chores', purpose: 'Return one submitted Chore occurrence as Needs another pass.', providers: ['device', 'server'], consequence: 'consequential', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: versionedTargetSchema('occurrenceId', { note: { type: ['string', 'null'], maxLength: 500 } }), sourceRefs: choreRefs }),
  read({ id: 'chores.reward.read', owner: 'chores', purpose: 'Read authorized token settings, balances, reservations, and payout receipts.', providers: ['device', 'server'], inputSchema: objectSchema({ membershipId: STRING_ID }), sourceRefs: choreRefs }),
  write({ id: 'chores.reward.configure', owner: 'chores', purpose: 'Configure the household digital-reward program and token rate.', providers: ['device', 'server'], consequence: 'consequential', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: objectSchema({ expectedVersion: VERSION, enabled: { type: 'boolean' }, centsPerToken: { type: 'integer', minimum: 1, maximum: 100000 } }), sourceRefs: choreRefs }),
  write({ id: 'chores.reward.reserve', owner: 'chores', purpose: 'Reserve available tokens at the current household rate for an outside-app payout.', providers: ['device', 'server'], consequence: 'consequential', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: objectSchema({ membershipId: STRING_ID, tokenCount: { type: 'integer', minimum: 1 }, expectedVersion: VERSION }), sourceRefs: choreRefs }),
  write({ id: 'chores.reward.cancel', owner: 'chores', purpose: 'Cancel one unpaid token reservation.', providers: ['device', 'server'], consequence: 'low', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: versionedTargetSchema('reservationId'), sourceRefs: choreRefs }),
  write({ id: 'chores.reward.settle', owner: 'chores', purpose: 'Record that one outside-app reward payout was completed without moving money in Kwilt.', providers: ['device', 'server'], consequence: 'consequential', reversible: false, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: versionedTargetSchema('reservationId'), sourceRefs: choreRefs }),

  write({ id: 'recipes.favorite.update', owner: 'recipes', purpose: 'Favorite or unfavorite one recipe.', providers: ['device', 'server'], consequence: 'low', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: versionedTargetSchema('recipeId', { favorite: { type: 'boolean' } }), sourceRefs: recipeRefs }),
  write({ id: 'recipes.visibility.update', owner: 'recipes', purpose: 'Hide or restore one recipe without deleting it.', providers: ['device', 'server'], consequence: 'low', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: versionedTargetSchema('recipeId', { visibility: { type: 'string', enum: ['visible', 'hidden'] } }), sourceRefs: recipeRefs }),
  read({ id: 'meal_planning.preferences.read', owner: 'meal_planning', purpose: 'Read bounded household meal preferences and constraints.', providers: ['device', 'server'], inputSchema: EMPTY_SCHEMA, sourceRefs: mealRefs }),
  write({ id: 'meal_planning.preferences.update', owner: 'meal_planning', purpose: 'Update explicitly reviewed household meal preferences and constraints.', providers: ['device', 'server'], consequence: 'consequential', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: objectSchema({ expectedVersion: VERSION, fields: FIELDS }), sourceRefs: mealRefs }),

  read({ id: 'screen_time.personal_rule.list', owner: 'screenTime', purpose: 'List personal Screen Time rules using opaque rule IDs and human-readable labels.', providers: ['device', 'server'], inputSchema: EMPTY_SCHEMA, sourceRefs: screenTimeRefs }),
  read({ id: 'screen_time.personal_rule.get', owner: 'screenTime', purpose: 'Inspect one personal Screen Time rule without exposing FamilyControls tokens.', providers: ['device', 'server'], inputSchema: targetSchema('ruleId'), sourceRefs: screenTimeRefs }),
  write({ id: 'screen_time.personal_rule.update', owner: 'screenTime', purpose: 'Update one personal Screen Time rule while keeping Apple selection device-owned.', providers: ['device', 'server'], consequence: 'consequential', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: timestampedTargetSchema('ruleId', { fields: {
    type: 'object', minProperties: 1, additionalProperties: false,
    properties: {
      enabled: { type: 'boolean' },
      kind: { type: 'string', enum: ['real_step', 'focus', 'daily_limit'] },
      limitMinutes: { type: 'integer', minimum: 1, maximum: 1440 },
    },
  } }), sourceRefs: screenTimeRefs }),
  write({ id: 'screen_time.personal_rule.deactivate', owner: 'screenTime', purpose: 'Deactivate one personal Screen Time rule and remove its active enforcement.', providers: ['device', 'server'], consequence: 'consequential', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: timestampedTargetSchema('ruleId'), sourceRefs: screenTimeRefs }),
  write({ id: 'screen_time.personal_rule.delete', owner: 'screenTime', purpose: 'Delete one personal Screen Time rule after native enforcement cleanup.', providers: ['device', 'server'], consequence: 'consequential', reversible: false, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: timestampedTargetSchema('ruleId'), sourceRefs: screenTimeRefs }),

  read({ id: 'notifications.preferences.read', owner: 'notifications', purpose: 'Read individual Kwilt notification preferences without changing OS permission.', providers: ['device'], inputSchema: EMPTY_SCHEMA, sourceRefs: notificationRefs }),
  write({ id: 'notifications.preferences.update', owner: 'notifications', purpose: 'Update individual Kwilt notification preferences; OS permission remains native-owned.', providers: ['device'], consequence: 'low', reversible: true, confirmation: 'explicit', completionMode: 'reviewed_proposal', inputSchema: objectSchema({ fields: FIELDS }), sourceRefs: notificationRefs }),
  write({ id: 'navigation.open_capability', owner: 'navigation', purpose: 'Open one allow-listed Kwilt capability or stable object destination.', providers: ['device'], consequence: 'low', reversible: true, confirmation: 'native', completionMode: 'native_handoff', inputSchema: objectSchema({ capabilityId: STRING_ID, objectRef: { type: ['object', 'null'], properties: { objectType: STRING_ID, objectId: STRING_ID }, required: ['objectType', 'objectId'], additionalProperties: false } }), sourceRefs: navigationRefs }),
] as const satisfies readonly ControlParityOperationContract[];

export const CONTROL_PARITY_OPERATION_IDS = CONTROL_PARITY_OPERATION_CONTRACTS.map(({ id }) => id);

export const CONTROL_PARITY_TOOL_CONTRACTS: readonly AgentToolDefinition[] =
  CONTROL_PARITY_OPERATION_CONTRACTS.map((contract) => ({
    id: contract.id,
    version: 1,
    capabilityId: contract.owner,
    purpose: contract.purpose,
    providers: contract.providers,
    effect: contract.effect,
    consequence: contract.consequence,
    reversible: contract.reversible,
    confirmation: contract.confirmation,
    canDeferToClient: true,
    inputSchema: contract.inputSchema,
    outputSchema: contract.outputSchema,
  }));
