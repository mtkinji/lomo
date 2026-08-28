import { discoverAgentTools } from './discovery';
import { evaluateToolPolicy } from './policy';
import {
  defineCapabilityManifest,
  projectAgentToolCatalog,
  projectOperationCoverage,
  type CapabilityManifestEntry,
  type RuntimeToolImplementation,
} from './capabilityManifest';
import { KWILT_CAPABILITY_MANIFEST, KWILT_EXTERNAL_CONTROL_SCOPE } from './kwiltCapabilityManifest';
import type { RuntimeToolProviderRegistration } from './providerRegistry';

const EMPTY_SCHEMA = { type: 'object', properties: {}, additionalProperties: false } as const;

function inspectOperation(
  overrides: Partial<CapabilityManifestEntry> = {},
): CapabilityManifestEntry {
  return {
    id: 'test.inspect',
    owner: 'test',
    purpose: 'Inspect one bounded test record.',
    effect: 'read',
    consequence: 'low',
    reversible: true,
    confirmation: 'none',
    providerEligibility: ['device', 'server'],
    inputSchema: EMPTY_SCHEMA,
    outputSchema: EMPTY_SCHEMA,
    tools: [{
      id: 'test.inspect',
      version: 1,
      inputSchema: EMPTY_SCHEMA,
      outputSchema: EMPTY_SCHEMA,
      canDeferToClient: false,
    }],
    sourceRefs: ['capability:test'],
    returnBehavior: 'answer',
    completionMode: 'direct',
    requiredScopes: ['life.read'],
    receipt: {
      required: true, resultRefKinds: ['test'], reversible: true, undoOperationId: null,
    },
    supportedBoundary: { finalActOwner: 'kwilt', reason: null },
    channels: {
      mobile: {
        state: 'live', outcome: 'answer', proofPaths: ['test/mobile.test.ts'], boundaryReason: null,
      },
      phone: {
        state: 'live', outcome: 'server_execution', proofPaths: ['test/phone.test.ts'], boundaryReason: null,
      },
    },
    ...overrides,
  };
}

describe('canonical capability manifest', () => {
  test('classifies every operation owner and excludes only Games and Explore from external control', () => {
    const owners = new Set(KWILT_CAPABILITY_MANIFEST.map((operation) => operation.owner));
    for (const owner of owners) expect(KWILT_EXTERNAL_CONTROL_SCOPE[owner as keyof typeof KWILT_EXTERNAL_CONTROL_SCOPE]).toBeDefined();
    expect(Object.entries(KWILT_EXTERNAL_CONTROL_SCOPE)
      .filter(([, scope]) => scope === 'excluded')
      .map(([owner]) => owner)).toEqual(['explore', 'games']);
  });

  test('requires completion, scope, receipt, and boundary policy on every operation', () => {
    for (const operation of KWILT_CAPABILITY_MANIFEST) {
      expect(['direct', 'reviewed_proposal', 'native_handoff', 'provider_handoff', 'supported_boundary', 'excluded'])
        .toContain(operation.completionMode);
      expect(operation.requiredScopes.length).toBeGreaterThan(0);
      expect(operation.receipt).toEqual(expect.objectContaining({
        required: true,
        reversible: operation.reversible,
      }));
      expect(operation.supportedBoundary).toEqual(expect.objectContaining({
        finalActOwner: expect.anything(),
      }));
    }
    expect(KWILT_CAPABILITY_MANIFEST
      .filter((operation) => operation.completionMode === 'excluded')
      .map((operation) => operation.id)).toEqual(['explore.open', 'games.open']);
    expect(KWILT_EXTERNAL_CONTROL_SCOPE.settings).toBe('core');
  });

  test('marks bounded Household reads live only after their server projection exists', () => {
    for (const operationId of ['household.read', 'household.invitation.preview']) {
      const operation = KWILT_CAPABILITY_MANIFEST.find((candidate) => candidate.id === operationId);
      expect(operation?.channels.mobile.state).toBe('live');
      expect(operation?.channels.phone).toMatchObject({ state: 'live', outcome: 'server_execution' });
    }
  });

  test('projects only tool providers backed by executable registrations', () => {
    const manifest = defineCapabilityManifest([inspectOperation({
      tools: [
        inspectOperation().tools[0],
        { ...inspectOperation().tools[0], id: 'test.unregistered' },
      ],
    })]);
    const registrations: RuntimeToolProviderRegistration<Record<string, never>>[] = [{
      toolId: 'test.inspect',
      provider: 'device',
      execute: async () => ({ status: 'completed', output: {}, receipt: null }),
    }];

    expect(projectAgentToolCatalog(manifest, {
      runtime: 'mobile', registrations,
    }).map((tool) => ({ id: tool.id, providers: tool.providers }))).toEqual([
      { id: 'test.inspect', providers: ['device'] },
    ]);
  });

  test('registering one operation projects the same tool contract into eligible runtimes', () => {
    const manifest = defineCapabilityManifest([inspectOperation()]);
    const implementations: RuntimeToolImplementation[] = [
      { runtime: 'mobile', toolId: 'test.inspect', providers: ['device'] },
      { runtime: 'server', toolId: 'test.inspect', providers: ['server'] },
    ];

    const mobile = projectAgentToolCatalog(manifest, { runtime: 'mobile', implementations });
    const server = projectAgentToolCatalog(manifest, { runtime: 'server', implementations });

    expect(mobile).toEqual([expect.objectContaining({
      id: 'test.inspect', capabilityId: 'test', providers: ['device'], inputSchema: EMPTY_SCHEMA,
    })]);
    expect(server).toEqual([expect.objectContaining({
      id: 'test.inspect', capabilityId: 'test', providers: ['server'], inputSchema: EMPTY_SCHEMA,
    })]);
    expect(discoverAgentTools(mobile, {
      capabilityIds: ['test'],
      providerAvailability: { device: true, server: false, channel: false, connector: false },
    })).toHaveLength(1);
    expect(discoverAgentTools(server, {
      capabilityIds: ['test'],
      providerAvailability: { device: false, server: true, channel: false, connector: false },
    })).toHaveLength(1);
  });

  test('derives coverage from the same operation instead of a second registry', () => {
    const manifest = defineCapabilityManifest([inspectOperation()]);

    expect(projectOperationCoverage(manifest)).toEqual([{
      id: 'test.inspect',
      owner: 'test',
      providers: ['device', 'server'],
      consequence: 'low',
      confirmation: 'none',
      toolIds: ['test.inspect'],
      sourceRefs: ['capability:test'],
      returnBehavior: 'answer',
      completionMode: 'direct',
      requiredScopes: ['life.read'],
      receipt: inspectOperation().receipt,
      supportedBoundary: inspectOperation().supportedBoundary,
      channels: inspectOperation().channels,
    }]);
  });

  test('does not require a separate bulk-action registry', () => {
    const rename = KWILT_CAPABILITY_MANIFEST.find((operation) => operation.id === 'money.category.rename');

    expect(rename).not.toHaveProperty('actionResolution');
    expect(projectOperationCoverage(KWILT_CAPABILITY_MANIFEST)
      .find((operation) => operation.id === 'money.category.rename'))
      .not.toHaveProperty('actionResolution');
  });

  test('projects every tool needed by a multi-tool operation without a second operation entry', () => {
    const manifest = defineCapabilityManifest([inspectOperation({
      id: 'test.answer_with_context',
      purpose: 'Answer with two bounded evidence sources.',
      tools: [
        inspectOperation().tools[0],
        { ...inspectOperation().tools[0], id: 'test.read_related' },
      ],
    })]);
    const catalog = projectAgentToolCatalog(manifest, {
      runtime: 'mobile',
      implementations: [
        { runtime: 'mobile', toolId: 'test.inspect', providers: ['device'] },
        { runtime: 'mobile', toolId: 'test.read_related', providers: ['device'] },
      ],
    });

    expect(catalog.map((tool) => tool.id)).toEqual(['test.inspect', 'test.read_related']);
    expect(projectOperationCoverage(manifest)[0].toolIds).toEqual(['test.inspect', 'test.read_related']);
  });

  test('uses provider declaration order for a stable runtime tool catalog', () => {
    const manifest = defineCapabilityManifest([inspectOperation({
      tools: [
        inspectOperation().tools[0],
        { ...inspectOperation().tools[0], id: 'test.read_related' },
      ],
    })]);

    expect(projectAgentToolCatalog(manifest, {
      runtime: 'mobile',
      implementations: [
        { runtime: 'mobile', toolId: 'test.read_related', providers: ['device'] },
        { runtime: 'mobile', toolId: 'test.inspect', providers: ['device'] },
      ],
    }).map((tool) => tool.id)).toEqual(['test.read_related', 'test.inspect']);
  });

  test('retains operation schemas for an answer that has no callable tool', () => {
    const answer = defineCapabilityManifest([inspectOperation({
      id: 'test.answer',
      purpose: 'Answer one ordinary question.',
      providerEligibility: ['server'],
      tools: [],
    })])[0];

    expect(answer.inputSchema).toBe(EMPTY_SCHEMA);
    expect(answer.outputSchema).toBe(EMPTY_SCHEMA);
    expect(projectAgentToolCatalog([answer], {
      runtime: 'server', implementations: [],
    })).toEqual([]);
  });

  test('rejects duplicate operation identity and consequential work without confirmation', () => {
    expect(() => defineCapabilityManifest([
      inspectOperation(),
      inspectOperation({ purpose: 'A duplicate definition.' }),
    ])).toThrow('Duplicate capability operation: test.inspect');

    expect(() => defineCapabilityManifest([inspectOperation({
      id: 'test.delete',
      purpose: 'Delete a test record.',
      effect: 'write',
      consequence: 'consequential',
      confirmation: 'none',
    })])).toThrow('Consequential capability operation requires confirmation: test.delete');
  });

  test('makes missing providers unavailable and deferred device work pending instead of successful', () => {
    const unavailableManifest = defineCapabilityManifest([inspectOperation({
      providerEligibility: ['connector'],
    })]);
    const unavailableTool = projectAgentToolCatalog(unavailableManifest, {
      runtime: 'mobile',
      implementations: [{ runtime: 'mobile', toolId: 'test.inspect', providers: ['connector'] }],
    })[0];

    expect(evaluateToolPolicy(unavailableTool, {
      authorized: true,
      explicitRequest: true,
      providerAvailability: { device: false, server: false, channel: false, connector: false },
    })).toEqual({ decision: 'unavailable', providers: ['connector'] });

    const deferredManifest = defineCapabilityManifest([inspectOperation({
      id: 'test.open_native',
      purpose: 'Open native review for one test record.',
      effect: 'write',
      confirmation: 'explicit',
      providerEligibility: ['device'],
      tools: [{
        id: 'test.open_native', version: 1, inputSchema: EMPTY_SCHEMA,
        outputSchema: EMPTY_SCHEMA, canDeferToClient: true,
      }],
      returnBehavior: 'native_handoff',
      channels: {
        mobile: {
          state: 'confirmation_only', outcome: 'native_review',
          proofPaths: ['test/mobile.test.ts'], boundaryReason: 'Native review owns the effect.',
        },
        phone: {
          state: 'confirmation_only', outcome: 'device_handoff',
          proofPaths: ['test/phone.test.ts'], boundaryReason: 'Phone can only stage the native review.',
        },
      },
    })]);
    const deferredTool = projectAgentToolCatalog(deferredManifest, {
      runtime: 'server',
      implementations: [{ runtime: 'server', toolId: 'test.open_native', providers: ['device'] }],
    })[0];

    expect(evaluateToolPolicy(deferredTool, {
      authorized: true,
      explicitRequest: true,
      providerAvailability: { device: false, server: true, channel: true, connector: true },
    })).toEqual({ decision: 'pending_client_action', provider: 'device' });
  });
});
