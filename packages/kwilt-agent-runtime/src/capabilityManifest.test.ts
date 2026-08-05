import { discoverAgentTools } from './discovery';
import { evaluateToolPolicy } from './policy';
import {
  defineCapabilityManifest,
  projectAgentToolCatalog,
  projectOperationCoverage,
  type CapabilityManifestEntry,
  type RuntimeToolImplementation,
} from './capabilityManifest';
import { KWILT_CAPABILITY_MANIFEST } from './kwiltCapabilityManifest';

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
