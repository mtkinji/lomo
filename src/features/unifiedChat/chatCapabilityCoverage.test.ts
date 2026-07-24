import fs from 'node:fs';
import path from 'node:path';
import { KWILT_OPERATION_REGISTRY } from '../../capabilities/operations';
import { CAPABILITY_REGISTRY } from '../../capabilities/registry';
import { CHAT_CAPABILITY_COVERAGE } from './chatCapabilityCoverage';
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

function serverAgentToolNames(): string[] {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'supabase/functions/_shared/serverAgentCatalog.ts'),
    'utf8',
  );
  return [...source.matchAll(/^\s{4}id: '([^']+)'/gm)].map((match) => match[1]);
}

describe('CHAT_CAPABILITY_COVERAGE', () => {
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
    for (const capability of CAPABILITY_REGISTRY) {
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
    const serverTools = new Set(serverAgentToolNames());
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
        if (channel === 'phone' && coverage.outcome !== 'honest_boundary') {
          for (const toolId of row.toolIds) expect(serverTools).toContain(toolId);
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
});
