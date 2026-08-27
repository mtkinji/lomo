import type { CapabilityManifestEntry } from './capabilityManifest';
import {
  EXTERNAL_ACTION_REGISTRATIONS,
  projectExternalControlCoverage,
  projectExternalActionCatalog,
  type ExternalActionRegistration,
} from './externalActionCatalog';

const EMPTY_SCHEMA = { type: 'object', properties: {}, additionalProperties: false } as const;

function operation(overrides: Partial<CapabilityManifestEntry> = {}): CapabilityManifestEntry {
  return {
    id: 'todos.list', owner: 'todos', purpose: 'List todos.', effect: 'read', consequence: 'low',
    reversible: true, confirmation: 'none', providerEligibility: ['server'],
    inputSchema: EMPTY_SCHEMA, outputSchema: EMPTY_SCHEMA,
    tools: [{ id: 'todos.read', version: 1, inputSchema: EMPTY_SCHEMA, outputSchema: EMPTY_SCHEMA, canDeferToClient: false }],
    sourceRefs: [], returnBehavior: 'answer',
    channels: {
      mobile: { state: 'live', outcome: 'answer', proofPaths: [], boundaryReason: null },
      phone: { state: 'live', outcome: 'server_execution', proofPaths: [], boundaryReason: null },
    },
    ...overrides,
  };
}

const registration: ExternalActionRegistration = {
  operationId: 'todos.list', toolId: 'todos.read', canonicalName: 'kwilt_todos_list',
  title: 'List To-dos', exposure: 'exposed', requiredScopes: ['life.read'], consequence: 'low',
  confirmation: 'none', redactionPolicy: 'bounded_summary',
  compatibilityAliases: [{ name: 'list_todos', version: 1 }],
};

describe('projectExternalActionCatalog', () => {
  test('projects only externally exposed operations backed by a registered server handler and satisfiable scopes', () => {
    const catalog = projectExternalActionCatalog({
      manifest: [operation(), operation({ id: 'manifest.only' })],
      serverRegistrations: [{ toolId: 'todos.read' }],
      externalRegistrations: [
        registration,
        { ...registration, operationId: 'todos.list', canonicalName: 'kwilt_hidden', exposure: 'hidden', compatibilityAliases: [] },
        { ...registration, operationId: 'todos.list', canonicalName: 'kwilt_admin', requiredScopes: ['admin'], compatibilityAliases: [] },
      ],
      availableScopes: ['life.read', 'life.write'],
    });

    expect(catalog.map((action) => action.canonicalName)).toEqual(['kwilt_todos_list']);
    expect(catalog[0]).toMatchObject({
      operationId: 'todos.list', toolId: 'todos.read', requiredScopes: ['life.read'],
      inputSchema: EMPTY_SCHEMA,
      annotations: {
        title: 'List To-dos', readOnlyHint: true, destructiveHint: false,
        idempotentHint: true, openWorldHint: false,
      },
      compatibilityAliases: [{ name: 'list_todos', version: 1 }],
    });
  });

  test('never projects a device-only write and allows only explicitly registered status reads', () => {
    const write = operation({
      id: 'todos.open', effect: 'write', consequence: 'consequential', confirmation: 'native',
      providerEligibility: ['device'], returnBehavior: 'native_handoff',
      tools: [{ id: 'todos.open', version: 1, inputSchema: EMPTY_SCHEMA, outputSchema: EMPTY_SCHEMA, canDeferToClient: true }],
    });
    const catalog = projectExternalActionCatalog({
      manifest: [write], serverRegistrations: [],
      externalRegistrations: [{
        ...registration, operationId: 'todos.open', toolId: 'todos.open', canonicalName: 'kwilt_todos_open',
        exposure: 'status_only', requiredScopes: ['life.write'], consequence: 'consequential', confirmation: 'native',
        compatibilityAliases: [],
      }],
      availableScopes: ['life.read', 'life.write'],
    });
    expect(catalog).toEqual([]);
  });

  test('rejects metadata drift and duplicate names instead of silently weakening policy', () => {
    expect(() => projectExternalActionCatalog({
      manifest: [operation()], serverRegistrations: [{ toolId: 'todos.read' }],
      externalRegistrations: [{ ...registration, consequence: 'consequential' }], availableScopes: ['life.read'],
    })).toThrow('External consequence does not match operation todos.list');

    expect(() => projectExternalActionCatalog({
      manifest: [operation()], serverRegistrations: [{ toolId: 'todos.read' }],
      externalRegistrations: [registration, { ...registration, operationId: 'todos.list' }], availableScopes: ['life.read'],
    })).toThrow('Duplicate external action name: kwilt_todos_list');
  });
});

describe('projectExternalControlCoverage', () => {
  test('classifies exposed, registration, provider, and excluded operations without silent gaps', () => {
    const exposed = operation();
    const needsRegistration = operation({ id: 'todos.get' });
    const needsProvider = operation({
      id: 'money.read', owner: 'money', providerEligibility: ['device'],
      tools: [{ ...operation().tools[0], id: 'money.read' }],
    });
    const excluded = operation({ id: 'games.open', owner: 'games', tools: [] });

    expect(projectExternalControlCoverage({
      manifest: [exposed, needsRegistration, needsProvider, excluded],
      serverRegistrations: [{ toolId: 'todos.read' }],
      externalRegistrations: [registration],
      scopeByOwner: { todos: 'core', money: 'core', games: 'excluded' },
      nonApplicableOperationIds: [],
    })).toEqual([
      expect.objectContaining({ operationId: 'todos.list', state: 'exposed' }),
      expect.objectContaining({ operationId: 'todos.get', state: 'pending_registration' }),
      expect.objectContaining({ operationId: 'money.read', state: 'pending_provider' }),
      expect.objectContaining({ operationId: 'games.open', state: 'excluded' }),
    ]);
  });
});

describe('EXTERNAL_ACTION_REGISTRATIONS', () => {
  test('projects already executable Plan and Relationships operations with least-privilege scopes', () => {
    const byOperation = Object.fromEntries(EXTERNAL_ACTION_REGISTRATIONS.map((item) => [item.operationId, item]));

    expect(byOperation['plan.read_day_context']).toMatchObject({
      canonicalName: 'kwilt_plan_read_day_context', requiredScopes: ['life.read'],
    });
    expect(byOperation['plan.schedule_activity']).toMatchObject({
      canonicalName: 'kwilt_plan_schedule_activity', requiredScopes: ['life.read', 'life.write'],
    });
    expect(byOperation['relationships.read']).toMatchObject({
      canonicalName: 'kwilt_relationships_read', requiredScopes: ['household.read'],
    });
    expect(byOperation['relationships.remember']).toMatchObject({
      canonicalName: 'kwilt_relationships_remember', requiredScopes: ['household.read', 'household.write'],
    });
    expect(byOperation['household.read']).toMatchObject({
      canonicalName: 'kwilt_household_read', requiredScopes: ['household.read'],
    });
    expect(byOperation['household.invitation.preview']).toMatchObject({
      canonicalName: 'kwilt_household_invitation_preview', requiredScopes: ['household.read'],
    });
    expect(byOperation['screen_time.read']).toMatchObject({
      canonicalName: 'kwilt_screen_time_read', requiredScopes: ['household.read'],
      redactionPolicy: 'screen_time_summary',
    });
    for (const operationId of [
      'screen_time.agreement.create', 'screen_time.override.block', 'screen_time.override.allow',
    ]) {
      expect(byOperation[operationId]).toMatchObject({
        requiredScopes: ['household.read', 'household.write'], confirmation: 'explicit',
        consequence: 'consequential', redactionPolicy: 'mutation_receipt',
      });
    }
  });

  test('projects server-backed native handoffs instead of hiding device-owned actions', () => {
    const byOperation = Object.fromEntries(EXTERNAL_ACTION_REGISTRATIONS.map((item) => [item.operationId, item]));

    expect(byOperation['profile.update']).toMatchObject({
      canonicalName: 'kwilt_profile_update', requiredScopes: ['life.read', 'life.write'], confirmation: 'explicit',
    });
    expect(byOperation['goals.check_in']).toMatchObject({
      canonicalName: 'kwilt_goals_check_in', confirmation: 'native',
    });
    expect(byOperation['activities.focus.open']).toMatchObject({
      canonicalName: 'kwilt_activities_focus_open', confirmation: 'native',
    });
    expect(byOperation['screen_time.configure']).toMatchObject({
      canonicalName: 'kwilt_screen_time_configure', requiredScopes: ['household.read', 'household.write'], confirmation: 'native',
    });
    expect(byOperation['account.delete']).toMatchObject({
      canonicalName: 'kwilt_account_delete_open', confirmation: 'native',
    });
  });

  test('snapshots the compatibility surface and explicit policy metadata', () => {
    expect(EXTERNAL_ACTION_REGISTRATIONS.map((registration) => ({
      operationId: registration.operationId,
      toolId: registration.toolId,
      canonicalName: registration.canonicalName,
      exposure: registration.exposure,
      scopes: registration.requiredScopes,
      consequence: registration.consequence,
      confirmation: registration.confirmation,
      redaction: registration.redactionPolicy,
      aliases: registration.compatibilityAliases,
    }))).toMatchSnapshot();
  });
});
