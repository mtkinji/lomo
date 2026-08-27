import fs from 'node:fs';
import path from 'node:path';
import { KWILT_CAPABILITY_MANIFEST } from '@kwilt/agent-runtime';
import { KWILT_OPERATION_REGISTRY } from '../../capabilities/operations';
import { CAPABILITY_REGISTRY } from '../../capabilities/registry';
import {
  assertCompleteConversationalCoverage,
  buildChatCapabilityCoverage,
  CHAT_CAPABILITY_COVERAGE,
} from './chatCapabilityCoverage';
import { LEGACY_AGENT_CAPABILITY_INVENTORY } from './legacyAgentCapabilityInventory';
import { UNIFIED_CHAT_TOOL_CATALOG } from './toolCatalog';

function externalMcpToolNames(): string[] {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'supabase/functions/_shared/externalMcp.ts'),
    'utf8',
  );
  const definitions = source.slice(
    source.indexOf('export const EXTERNAL_MCP_READ_TOOLS'),
    source.indexOf('function asRecord'),
  );
  return [...definitions.matchAll(/^\s{4}name: '([^']+)'/gm)].map((match) => match[1]);
}

describe('CHAT_CAPABILITY_COVERAGE', () => {
  it('keeps a declared UI operation pending when its manifest tool has no handler', () => {
    const manifestEntry = {
      ...KWILT_CAPABILITY_MANIFEST.find((operation) => operation.tools.length > 0)!,
      id: 'test.ui_action',
      owner: 'test',
      tools: [{
        id: 'test.ui_action', version: 1, inputSchema: {}, outputSchema: {}, canDeferToClient: false,
      }],
      channels: {
        mobile: { state: 'live' as const, outcome: 'answer', proofPaths: ['ui.ts'], boundaryReason: null },
        phone: { state: 'live' as const, outcome: 'server_execution', proofPaths: ['server.ts'], boundaryReason: null },
      },
    };
    const [row] = buildChatCapabilityCoverage({
      operations: [{ id: 'test.ui_action', owner: 'test' }],
      manifest: [manifestEntry],
      mobileRegistrations: [],
      serverRegistrations: [],
    });

    expect(row.id).toBe('test.ui_action');
    expect(row.channels.mobile).toEqual(expect.objectContaining({
      state: 'pending_provider', outcome: 'honest_boundary',
      boundaryReason: 'Missing executable mobile handler: test.ui_action',
    }));
    expect(row.channels.phone).toEqual(expect.objectContaining({
      state: 'pending_provider', outcome: 'honest_boundary',
      boundaryReason: 'Missing executable server handler: test.ui_action',
    }));
  });

  it('fails registration with the exact operation id when conversational coverage is missing', () => {
    expect(() => assertCompleteConversationalCoverage(
      [{ id: 'future.capability.do_the_thing' }],
      [],
    )).toThrow('Missing conversational coverage for Kwilt operation: future.capability.do_the_thing');
  });

  it('has one unique row for every required native intent', () => {
    const ids = CHAT_CAPABILITY_COVERAGE.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(KWILT_OPERATION_REGISTRY.map((operation) => operation.id).sort());
    expect(CHAT_CAPABILITY_COVERAGE.map(({ id, owner }) => ({ id, owner })).sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      KWILT_OPERATION_REGISTRY.map(({ id, owner }) => ({ id, owner })).sort((a, b) => a.id.localeCompare(b.id)),
    );
  });

  it('accounts for every active capability, external MCP tool, and legacy agent asset', () => {
    const refs = new Set(CHAT_CAPABILITY_COVERAGE.flatMap((row) => row.sourceRefs));
    for (const capability of CAPABILITY_REGISTRY.filter(({ availability }) => availability === 'active')) {
      expect(refs).toContain(`capability:${capability.id}`);
    }
    for (const toolName of externalMcpToolNames()) {
      expect(refs).toContain(`mcp:${toolName}`);
    }
    for (const legacy of LEGACY_AGENT_CAPABILITY_INVENTORY) {
      expect(refs).toContain(`legacy:${legacy.legacyId}`);
    }
  });

  it('requires separate executable truth for mobile and Phone', () => {
    const registeredTools = new Set(UNIFIED_CHAT_TOOL_CATALOG.map((tool) => tool.id));
    for (const row of CHAT_CAPABILITY_COVERAGE) {
      expect(row.providers.length).toBeGreaterThan(0);
      expect(Object.keys(row.channels).sort()).toEqual(['mobile', 'phone']);
      for (const [channel, coverage] of Object.entries(row.channels)) {
        if (coverage.state === 'live') {
          expect(coverage.proofPaths.length).toBeGreaterThan(0);
        } else {
          expect(coverage.boundaryReason?.length).toBeGreaterThan(0);
        }
        if (coverage.state === 'confirmation_only') {
          expect(coverage.proofPaths.length).toBeGreaterThan(0);
        }
        if (channel === 'mobile' && (coverage.state === 'live' || coverage.state === 'confirmation_only')) {
          for (const toolId of row.toolIds) expect(registeredTools).toContain(toolId);
        }
      }
    }
  });

  it('records whole-person forgetting as excluded on both channels', () => {
    const row = CHAT_CAPABILITY_COVERAGE.find((candidate) => candidate.id === 'relationships.forget_person');

    expect(row?.channels.mobile).toEqual(expect.objectContaining({
      state: 'excluded',
      outcome: 'honest_boundary',
    }));
    expect(row?.channels.phone).toEqual(expect.objectContaining({
      state: 'excluded',
      outcome: 'honest_boundary',
    }));
    expect(row?.toolIds).toEqual([]);
  });

  it('opens only the production Activity-backed Chores surface through a reviewed handoff', () => {
    const row = CHAT_CAPABILITY_COVERAGE.find((candidate) => candidate.id === 'chores.open');

    expect(row).toEqual(expect.objectContaining({
      owner: 'chores',
      toolIds: ['chores.open'],
      sourceRefs: ['capability:chores'],
    }));
    expect(row?.channels.mobile).toEqual(expect.objectContaining({
      state: 'confirmation_only',
      outcome: 'native_review',
    }));
    expect(row?.channels.phone).toEqual(expect.objectContaining({
      state: 'confirmation_only',
      outcome: 'device_handoff',
    }));
  });
});
