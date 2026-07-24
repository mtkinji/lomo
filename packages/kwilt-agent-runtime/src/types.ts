export type AgentToolProvider = 'server' | 'device' | 'channel' | 'connector';

export type ToolProviderAvailability = Record<AgentToolProvider, boolean>;

export type AgentToolDefinition = {
  id: string;
  version: number;
  capabilityId: string;
  purpose: string;
  providers: readonly AgentToolProvider[];
  effect: 'read' | 'write';
  consequence: 'low' | 'consequential';
  reversible: boolean;
  confirmation: 'none' | 'explicit';
  canDeferToClient: boolean;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
};

export type AgentToolExecutionResult =
  | {
      status: 'completed';
      output: Record<string, unknown>;
      receipt: Record<string, unknown> | null;
    }
  | {
      status: 'proposed';
      proposal: Record<string, unknown>;
    }
  | {
      status: 'pending_client_action';
      provider: 'device';
      request: Record<string, unknown>;
    }
  | {
      status: 'needs_input';
      prompt: string;
      fields: string[];
    }
  | {
      status: 'unavailable';
      reason: string;
      retryable: boolean;
    }
  | {
      status: 'failed';
      code: string;
      message: string;
      retryable: boolean;
    };

export type AgentToolCall = {
  id: string;
  toolId: string;
  arguments: Record<string, unknown>;
};

export type AgentLoopMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; toolCalls?: readonly AgentToolCall[] }
  | { role: 'tool'; toolCallId: string; toolId: string; content: string };

export type AgentModelStep = {
  content: string | null;
  toolCalls: AgentToolCall[];
};

export type AgentToolLoopEvent = {
  sequence: number;
  type: 'model_step' | 'tool_completed' | 'unknown_tool' | 'repeated_tool_call' | 'stopped';
  round: number;
  toolCallId?: string;
  toolId?: string;
  resultStatus?: AgentToolExecutionResult['status'];
};

export type AgentToolLoopResult =
  | { status: 'completed'; content: string; messages: AgentLoopMessage[]; events: AgentToolLoopEvent[] }
  | { status: 'stopped'; content: null; messages: AgentLoopMessage[]; events: AgentToolLoopEvent[] }
  | { status: 'partial' | 'failed'; content: string | null; errorCode: string; messages: AgentLoopMessage[]; events: AgentToolLoopEvent[] };

export type AgentToolPolicyContext = {
  authorized: boolean;
  explicitRequest: boolean;
  providerAvailability: ToolProviderAvailability;
};

export type AgentToolPolicyDecision =
  | { decision: 'execute' | 'propose' | 'require_confirmation'; provider: AgentToolProvider }
  | { decision: 'pending_client_action'; provider: 'device' }
  | { decision: 'unavailable'; providers: readonly AgentToolProvider[] };
