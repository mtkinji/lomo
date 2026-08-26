import type {
  AgentToolCall,
  AgentToolDefinition,
  AgentToolExecutionResult,
  AgentToolProvider,
} from './types.ts';

export type RuntimeToolHandler<Context> = (args: {
  context: Context;
  call: AgentToolCall;
  tool: AgentToolDefinition;
}) => Promise<AgentToolExecutionResult>;

export type RuntimeToolProviderRegistration<Context> = {
  toolId: string;
  provider: AgentToolProvider;
  execute: RuntimeToolHandler<Context>;
};

export type RuntimeToolProviderRegistry<Context> = {
  registrations: readonly RuntimeToolProviderRegistration<Context>[];
  has(toolId: string, provider: AgentToolProvider): boolean;
  execute(
    toolId: string,
    provider: AgentToolProvider,
    context: Context,
    call: AgentToolCall,
  ): Promise<AgentToolExecutionResult>;
};

function registrationKey(toolId: string, provider: AgentToolProvider): string {
  return `${toolId}:${provider}`;
}

export function createRuntimeToolProviderRegistry<Context>(args: {
  tools: readonly AgentToolDefinition[];
  registrations: readonly RuntimeToolProviderRegistration<Context>[];
}): RuntimeToolProviderRegistry<Context> {
  const toolById = new Map<string, AgentToolDefinition>();
  for (const tool of args.tools) {
    if (toolById.has(tool.id)) throw new Error(`Duplicate tool definition: ${tool.id}`);
    toolById.set(tool.id, tool);
  }

  const registrationByKey = new Map<string, RuntimeToolProviderRegistration<Context>>();
  for (const registration of args.registrations) {
    const tool = toolById.get(registration.toolId);
    if (!tool) throw new Error(`Registration references unknown tool: ${registration.toolId}`);
    if (!tool.providers.includes(registration.provider)) {
      throw new Error(
        `Tool does not advertise registered provider: ${registrationKey(registration.toolId, registration.provider)}`,
      );
    }
    const key = registrationKey(registration.toolId, registration.provider);
    if (registrationByKey.has(key)) throw new Error(`Duplicate tool/provider registration: ${key}`);
    registrationByKey.set(key, registration);
  }

  for (const tool of args.tools) {
    const providers = new Set<AgentToolProvider>();
    for (const provider of tool.providers) {
      if (providers.has(provider)) {
        throw new Error(`Tool advertises duplicate provider: ${registrationKey(tool.id, provider)}`);
      }
      providers.add(provider);
      const key = registrationKey(tool.id, provider);
      if (!registrationByKey.has(key)) throw new Error(`Advertised provider has no handler: ${key}`);
    }
  }

  const registrations = Object.freeze([...args.registrations]);
  return Object.freeze({
    registrations,
    has(toolId: string, provider: AgentToolProvider): boolean {
      return registrationByKey.has(registrationKey(toolId, provider));
    },
    async execute(
      toolId: string,
      provider: AgentToolProvider,
      context: Context,
      call: AgentToolCall,
    ): Promise<AgentToolExecutionResult> {
      if (call.toolId !== toolId) throw new Error(`Tool call identity mismatch: ${toolId}:${call.toolId}`);
      const registration = registrationByKey.get(registrationKey(toolId, provider));
      if (!registration) throw new Error(`Tool/provider handler is not registered: ${registrationKey(toolId, provider)}`);
      const tool = toolById.get(toolId);
      if (!tool) throw new Error(`Unknown tool: ${toolId}`);
      return registration.execute({ context, call, tool });
    },
  });
}
