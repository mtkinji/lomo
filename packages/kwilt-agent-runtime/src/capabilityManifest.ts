import type { AgentToolDefinition, AgentToolProvider } from './types.ts';

export type CapabilityConfirmation = 'none' | 'explicit' | 'native';
export type CapabilityCoverageState = 'live' | 'pending_provider' | 'confirmation_only' | 'excluded';
export type CapabilityReturnBehavior =
  | 'answer'
  | 'proposal_or_receipt'
  | 'native_handoff'
  | 'honest_boundary';

export type CapabilityChannelCoverage = {
  state: CapabilityCoverageState;
  outcome: string;
  proofPaths: readonly string[];
  boundaryReason: string | null;
};

export type CapabilityToolContract = {
  id: string;
  version: number;
  capabilityId?: string;
  purpose?: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  canDeferToClient: boolean;
};

export type CapabilityManifestEntry = {
  id: string;
  owner: string;
  purpose: string;
  effect: AgentToolDefinition['effect'];
  consequence: AgentToolDefinition['consequence'];
  reversible: boolean;
  confirmation: CapabilityConfirmation;
  providerEligibility: readonly AgentToolProvider[];
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  tools: readonly CapabilityToolContract[];
  sourceRefs: readonly string[];
  returnBehavior: CapabilityReturnBehavior;
  channels: {
    mobile: CapabilityChannelCoverage;
    phone: CapabilityChannelCoverage;
  };
};

export type RuntimeToolImplementation = {
  runtime: 'mobile' | 'server';
  toolId: string;
  providers: readonly AgentToolProvider[];
};

export type OperationCoverageProjection = {
  id: string;
  owner: string;
  providers: readonly AgentToolProvider[];
  consequence: AgentToolDefinition['consequence'];
  confirmation: CapabilityConfirmation;
  toolIds: readonly string[];
  sourceRefs: readonly string[];
  returnBehavior: CapabilityReturnBehavior;
  channels: CapabilityManifestEntry['channels'];
};

export function defineCapabilityManifest<const Entries extends readonly CapabilityManifestEntry[]>(
  entries: Entries,
): Entries {
  const operationIds = new Set<string>();
  for (const entry of entries) {
    if (operationIds.has(entry.id)) {
      throw new Error(`Duplicate capability operation: ${entry.id}`);
    }
    operationIds.add(entry.id);
    if (entry.consequence === 'consequential' && entry.confirmation === 'none') {
      throw new Error(`Consequential capability operation requires confirmation: ${entry.id}`);
    }
    if (entry.providerEligibility.length === 0) {
      throw new Error(`Capability operation requires provider eligibility: ${entry.id}`);
    }
  }
  return entries;
}

export function projectAgentToolCatalog(
  manifest: readonly CapabilityManifestEntry[],
  input: {
    runtime: RuntimeToolImplementation['runtime'];
    implementations: readonly RuntimeToolImplementation[];
  },
): AgentToolDefinition[] {
  const operationByTool = new Map<string, {
    operation: CapabilityManifestEntry;
    contract: CapabilityToolContract;
  }>();
  for (const operation of manifest) {
    for (const contract of operation.tools) {
      if (!operationByTool.has(contract.id)) operationByTool.set(contract.id, { operation, contract });
    }
  }
  const seen = new Set<string>();
  return input.implementations
    .filter((implementation) => implementation.runtime === input.runtime)
    .map((implementation) => {
      if (seen.has(implementation.toolId)) {
        throw new Error(`Duplicate runtime tool implementation: ${input.runtime}:${implementation.toolId}`);
      }
      seen.add(implementation.toolId);
      const match = operationByTool.get(implementation.toolId);
      if (!match) throw new Error(`Runtime implements unknown canonical tool: ${implementation.toolId}`);
      const { operation, contract } = match;
      const ineligible = implementation.providers.filter(
        (provider) => !operation.providerEligibility.includes(provider),
      );
      if (ineligible.length > 0) {
        throw new Error(
          `Runtime implementation uses ineligible provider for ${contract.id}: ${ineligible.join(', ')}`,
        );
      }
      return {
        id: contract.id,
        version: contract.version,
        capabilityId: contract.capabilityId ?? operation.owner,
        purpose: contract.purpose ?? operation.purpose,
        providers: implementation.providers,
        effect: operation.effect,
        consequence: operation.consequence,
        reversible: operation.reversible,
        confirmation: operation.confirmation === 'none' ? 'none' : 'explicit',
        canDeferToClient: input.runtime === 'server' && implementation.providers.includes('server')
          ? false
          : contract.canDeferToClient,
        inputSchema: contract.inputSchema,
        outputSchema: contract.outputSchema,
      } satisfies AgentToolDefinition;
    });
}

export function projectOperationCoverage(
  manifest: readonly CapabilityManifestEntry[],
): OperationCoverageProjection[] {
  return manifest.map((operation) => ({
    id: operation.id,
    owner: operation.owner,
    providers: operation.providerEligibility,
    consequence: operation.consequence,
    confirmation: operation.confirmation,
    toolIds: operation.tools.map((tool) => tool.id),
    sourceRefs: operation.sourceRefs,
    returnBehavior: operation.returnBehavior,
    channels: operation.channels,
  }));
}
