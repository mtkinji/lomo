import {
  KWILT_TOOL_CONTRACTS,
  type RuntimeToolImplementation,
} from '@kwilt/agent-runtime';

/** Mobile declares implemented providers; operation semantics stay in the canonical manifest. */
export const MOBILE_TOOL_IMPLEMENTATIONS: readonly RuntimeToolImplementation[] =
  KWILT_TOOL_CONTRACTS
    .filter((tool) => tool.id !== 'channel.phone.continue_run')
    .map((tool) => ({
      runtime: 'mobile' as const,
      toolId: tool.id,
      providers: tool.providers,
    }));
