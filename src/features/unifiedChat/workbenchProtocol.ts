export const AGENT_WORKBENCH_PROTOCOL_VERSION = 1 as const;

export type AgentWorkbenchObjectRef = {
  id: string;
  type: string;
  label: string;
  secondaryLabel?: string;
  thumbnailUrl?: string;
};

export type AgentWorkbenchMessage = {
  id: string;
  threadId: string;
  role: 'user' | 'assistant';
  body: string;
  createdAt: string;
  feedback?: 'positive' | 'negative' | null;
};

export type AgentWorkbenchRun = {
  id: string;
  threadId: string;
  assistantMessageId?: string;
  status: 'queued' | 'active' | 'complete' | 'partial' | 'stopped' | 'steered' | 'failed';
  events: Array<{
    id: string;
    sequence: number;
    type: string;
    status: 'active' | 'complete' | 'warning' | 'failed';
    label: string;
    detail?: string;
  }>;
};

export type AgentWorkbenchSnapshot = {
  product: {
    id: string;
    assistantName: string;
    placeholder: string;
    features: {
      attachments: boolean;
      mentions: boolean;
      modelControl: boolean;
      runDepthControl: boolean;
      runModeControl: boolean;
      voice: boolean;
      webSearchControl: boolean;
    };
  };
  thread?: { id: string; title: string; status: 'active' | 'archived' };
  context: AgentWorkbenchObjectRef[];
  messages: AgentWorkbenchMessage[];
  runs: AgentWorkbenchRun[];
  proposals: [];
  composer: {
    prompt: string;
    state: 'ready' | 'working' | 'complete';
    attachments: [];
    voice: { state: 'idle' | 'unsupported'; elapsedSeconds: number; message?: string };
  };
};

export type SupportedAgentWorkbenchCommand =
  | { type: 'composer.change'; prompt: string }
  | { type: 'run.send'; prompt: string }
  | { type: 'run.stop'; runId: string }
  | { type: 'run.steer'; runId: string; prompt: string }
  | {
      type: 'message.feedback';
      messageId: string;
      feedback: 'positive' | 'negative';
      reason?: string;
    }
  | { type: 'object.open'; object: AgentWorkbenchObjectRef }
  | { type: 'thread.create' };

export type AgentWorkbenchSurfaceMessage =
  | {
      protocolVersion: typeof AGENT_WORKBENCH_PROTOCOL_VERSION;
      type: 'surface.ready';
      requestId: string;
    }
  | {
      protocolVersion: typeof AGENT_WORKBENCH_PROTOCOL_VERSION;
      type: 'surface.command';
      requestId: string;
      command: SupportedAgentWorkbenchCommand;
    };

export type AgentWorkbenchHostMessage =
  | {
      protocolVersion: typeof AGENT_WORKBENCH_PROTOCOL_VERSION;
      type: 'host.initialize' | 'host.snapshot';
      requestId: string;
      snapshot: AgentWorkbenchSnapshot;
    }
  | {
      protocolVersion: typeof AGENT_WORKBENCH_PROTOCOL_VERSION;
      type: 'host.error';
      requestId: string;
      message: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasText(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === 'string' && String(value[key]).trim().length > 0;
}

function isObjectRef(value: unknown): value is AgentWorkbenchObjectRef {
  return isRecord(value) && hasText(value, 'id') && hasText(value, 'type') && hasText(value, 'label');
}

function parseCommand(value: unknown): SupportedAgentWorkbenchCommand | null {
  if (!isRecord(value) || !hasText(value, 'type')) return null;
  switch (value.type) {
    case 'composer.change':
    case 'run.send':
      return typeof value.prompt === 'string'
        ? ({ type: value.type, prompt: value.prompt } as SupportedAgentWorkbenchCommand)
        : null;
    case 'run.stop':
      return hasText(value, 'runId')
        ? { type: 'run.stop', runId: String(value.runId) }
        : null;
    case 'run.steer':
      return hasText(value, 'runId') && hasText(value, 'prompt')
        ? { type: 'run.steer', runId: String(value.runId), prompt: String(value.prompt) }
        : null;
    case 'message.feedback':
      return hasText(value, 'messageId') &&
        (value.feedback === 'positive' || value.feedback === 'negative')
        ? {
            type: 'message.feedback',
            messageId: String(value.messageId),
            feedback: value.feedback,
            ...(typeof value.reason === 'string' ? { reason: value.reason } : {}),
          }
        : null;
    case 'object.open':
      return isObjectRef(value.object) ? { type: 'object.open', object: value.object } : null;
    case 'thread.create':
      return { type: 'thread.create' };
    default:
      return null;
  }
}

export function parseAgentWorkbenchSurfaceMessage(
  raw: string,
): AgentWorkbenchSurfaceMessage | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !isRecord(value) ||
      value.protocolVersion !== AGENT_WORKBENCH_PROTOCOL_VERSION ||
      !hasText(value, 'requestId')
    ) {
      return null;
    }
    if (value.type === 'surface.ready') {
      return {
        protocolVersion: AGENT_WORKBENCH_PROTOCOL_VERSION,
        type: 'surface.ready',
        requestId: String(value.requestId),
      };
    }
    if (value.type !== 'surface.command') return null;
    const command = parseCommand(value.command);
    if (!command) return null;
    return {
      protocolVersion: AGENT_WORKBENCH_PROTOCOL_VERSION,
      type: 'surface.command',
      requestId: String(value.requestId),
      command,
    };
  } catch {
    return null;
  }
}

export function makeAgentWorkbenchHostMessage(
  type: 'host.initialize' | 'host.snapshot',
  snapshot: AgentWorkbenchSnapshot,
): AgentWorkbenchHostMessage {
  return {
    protocolVersion: AGENT_WORKBENCH_PROTOCOL_VERSION,
    type,
    requestId: `kwilt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    snapshot,
  };
}
