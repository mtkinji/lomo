import type { AgentToolDefinition, AgentToolProvider } from './types.ts';
import type { RuntimeToolProviderRegistration } from './providerRegistry.ts';

export type CapabilityConfirmation = 'none' | 'explicit' | 'native';
export type CapabilityCoverageState = 'live' | 'pending_provider' | 'confirmation_only' | 'excluded';
export type CapabilityReturnBehavior =
  | 'answer'
  | 'proposal_or_receipt'
  | 'native_handoff'
  | 'honest_boundary';

export type ConversationalCompletionMode =
  | 'direct'
  | 'reviewed_proposal'
  | 'native_handoff'
  | 'provider_handoff'
  | 'supported_boundary'
  | 'excluded';

export type CapabilityOAuthScope =
  | 'life.read'
  | 'life.write'
  | 'household.read'
  | 'household.write'
  | 'money.read'
  | 'money.write'
  | 'food.read'
  | 'food.write';

export type CapabilityReceiptRequirement = {
  required: true;
  resultRefKinds: readonly string[];
  reversible: boolean;
  undoOperationId: string | null;
};

export type CapabilitySupportedBoundary = {
  finalActOwner: 'kwilt' | 'device' | 'provider' | 'person' | 'excluded';
  reason: string | null;
};

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
  completionMode: ConversationalCompletionMode;
  requiredScopes: readonly CapabilityOAuthScope[];
  receipt: CapabilityReceiptRequirement;
  supportedBoundary: CapabilitySupportedBoundary;
  channels: {
    mobile: CapabilityChannelCoverage;
    phone: CapabilityChannelCoverage;
  };
};

/** @deprecated Migrate callers to executable RuntimeToolProviderRegistration values. */
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
  completionMode: ConversationalCompletionMode;
  requiredScopes: readonly CapabilityOAuthScope[];
  receipt: CapabilityReceiptRequirement;
  supportedBoundary: CapabilitySupportedBoundary;
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
    if (entry.requiredScopes.length === 0) {
      throw new Error(`Capability operation requires at least one OAuth scope: ${entry.id}`);
    }
    if (entry.receipt.reversible !== entry.reversible) {
      throw new Error(`Capability receipt reversibility mismatch: ${entry.id}`);
    }
    if (entry.completionMode === 'excluded' && entry.supportedBoundary.finalActOwner !== 'excluded') {
      throw new Error(`Excluded capability operation requires excluded boundary ownership: ${entry.id}`);
    }
  }
  return entries;
}

export function projectAgentToolCatalog<Context = unknown>(
  manifest: readonly CapabilityManifestEntry[],
  input: { runtime: RuntimeToolImplementation['runtime']; registrations: readonly RuntimeToolProviderRegistration<Context>[] }
    | { runtime: RuntimeToolImplementation['runtime']; implementations: readonly RuntimeToolImplementation[] },
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
  const providerPairs: { toolId: string; provider: AgentToolProvider }[] = [];
  if ('registrations' in input) {
    providerPairs.push(...input.registrations.map(({ toolId, provider }) => ({ toolId, provider })));
  } else {
    const seenLegacyTools = new Set<string>();
    for (const implementation of input.implementations) {
      if (implementation.runtime !== input.runtime) continue;
      if (seenLegacyTools.has(implementation.toolId)) {
        throw new Error(`Duplicate runtime tool implementation: ${input.runtime}:${implementation.toolId}`);
      }
      seenLegacyTools.add(implementation.toolId);
      providerPairs.push(...implementation.providers.map((provider) => ({
        toolId: implementation.toolId, provider,
      })));
    }
  }

  const seenPairs = new Set<string>();
  const providersByTool = new Map<string, AgentToolProvider[]>();
  for (const pair of providerPairs) {
    const key = `${pair.toolId}:${pair.provider}`;
    if (seenPairs.has(key)) throw new Error(`Duplicate tool/provider registration: ${key}`);
    seenPairs.add(key);
    const match = operationByTool.get(pair.toolId);
    if (!match) throw new Error(`Runtime registers unknown canonical tool: ${pair.toolId}`);
    if (!match.operation.providerEligibility.includes(pair.provider)) {
      throw new Error(`Runtime registration uses ineligible provider for ${pair.toolId}: ${pair.provider}`);
    }
    providersByTool.set(pair.toolId, [...(providersByTool.get(pair.toolId) ?? []), pair.provider]);
  }

  return [...providersByTool.entries()].map(([toolId, providers]) => {
    const match = operationByTool.get(toolId);
    if (!match) throw new Error(`Runtime registers unknown canonical tool: ${toolId}`);
    const { operation, contract } = match;
    return {
        id: contract.id,
        version: contract.version,
        capabilityId: contract.capabilityId ?? operation.owner,
        purpose: contract.purpose ?? operation.purpose,
        providers,
        effect: operation.effect,
        consequence: operation.consequence,
        reversible: operation.reversible,
        confirmation: operation.confirmation,
        canDeferToClient: input.runtime === 'server' && providers.includes('server')
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
    completionMode: operation.completionMode,
    requiredScopes: operation.requiredScopes,
    receipt: operation.receipt,
    supportedBoundary: operation.supportedBoundary,
    channels: operation.channels,
  }));
}
