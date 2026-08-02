import { requestUnifiedChatAgentJudgment } from '../../services/ai';
import {
  AGENT_JUDGMENT_RESPONSE_FORMAT,
  parseAgentJudgment,
  type AgentJudgment,
} from './agentJudgment';

export type RequestAgentJudgmentInput = {
  prompt: string;
  allowedToolIds: ReadonlySet<string>;
  signal?: AbortSignal;
};

export type RequestAgentJudgmentDependencies = {
  requestResponse: (
    request: Record<string, unknown>,
    signal?: AbortSignal,
  ) => Promise<unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractOutputText(response: unknown): string | null {
  if (!isRecord(response) || !Array.isArray(response.output)) return null;
  for (const item of response.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (isRecord(content) && content.type === 'output_text' && typeof content.text === 'string') {
        return content.text;
      }
    }
  }
  return null;
}

export async function requestAgentJudgment(
  input: RequestAgentJudgmentInput,
  dependencies?: RequestAgentJudgmentDependencies,
): Promise<AgentJudgment | null> {
  const requestResponse = dependencies?.requestResponse ?? requestUnifiedChatAgentJudgment;
  const request = {
    model: 'gpt-5.6-luna',
    store: false,
    reasoning: { effort: 'low' },
    max_output_tokens: 800,
    input: [{ role: 'user', content: input.prompt }],
    text: { format: AGENT_JUDGMENT_RESPONSE_FORMAT },
  };

  try {
    const response = await requestResponse(request, input.signal);
    const outputText = extractOutputText(response);
    return outputText ? parseAgentJudgment(outputText, input.allowedToolIds) : null;
  } catch (error) {
    if (input.signal?.aborted) throw error;
    return null;
  }
}
