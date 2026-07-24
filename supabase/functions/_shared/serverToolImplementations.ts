import type { RuntimeToolImplementation } from '../../../packages/kwilt-agent-runtime/src/capabilityManifest.ts';
import { KWILT_TOOL_CONTRACTS } from '../../../packages/kwilt-agent-runtime/src/kwiltToolContracts.ts';

/** Server declares execution or device-defer availability without copying schemas or policy. */
export const SERVER_TOOL_IMPLEMENTATIONS: readonly RuntimeToolImplementation[] =
  KWILT_TOOL_CONTRACTS
    .filter((tool) => tool.id !== 'channel.phone.continue_run')
    .map((tool) => ({
      runtime: 'server' as const,
      toolId: tool.id,
      providers: tool.providers.includes('server')
        ? ['server'] as const
        : ['device'] as const,
    }));
