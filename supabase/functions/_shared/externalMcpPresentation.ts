import type { ServerAgentToolResult } from './agentRuntime.ts';

export function externalMcpRunPrompt(toolTitle: string): string {
  return `Requested in ChatGPT: ${toolTitle}.`;
}

export function externalMcpRunSummary(
  toolTitle: string,
  result: ServerAgentToolResult,
): string {
  if (result.status === 'completed') return `${toolTitle} completed.`;
  if (result.status === 'proposed') return `${toolTitle} is ready for your review in Kwilt.`;
  if (result.status === 'pending_client_action') {
    const actionTitle = typeof result.request.title === 'string' && result.request.title.trim()
      ? result.request.title.trim()
      : toolTitle;
    return `${actionTitle} is ready in Kwilt.`;
  }
  if (result.status === 'needs_input') return result.prompt;
  if (result.status === 'unavailable') return result.reason;
  if (result.status === 'refused') return result.reason;
  return result.message;
}
