import { projectAgentToolCatalog } from '../../../packages/kwilt-agent-runtime/src/capabilityManifest.ts';
import { KWILT_CAPABILITY_MANIFEST } from '../../../packages/kwilt-agent-runtime/src/kwiltCapabilityManifest.ts';
import type { ServerAgentToolDefinition } from './agentRuntime.ts';
import { SERVER_TOOL_IMPLEMENTATIONS } from './serverToolImplementations.ts';

export const SERVER_AGENT_TOOL_CATALOG: readonly ServerAgentToolDefinition[] =
  projectAgentToolCatalog(
    KWILT_CAPABILITY_MANIFEST,
    { runtime: 'server', implementations: SERVER_TOOL_IMPLEMENTATIONS },
  );
