import type { KwiltToolNamespaceId } from '../../../packages/kwilt-agent-runtime/src/toolNamespaces.ts';
import type { ServerTurnJudgment } from './serverTurnPlanning.ts';

// Compatibility entrypoint for deployed callers. The server agent now uses the
// Responses API exclusively; Chat Completions translation intentionally no
// longer exists here.
export {
  parseServerAgentResponse,
  requestServerAgentResponse as requestServerAgentModel,
  serverResponsesToolCatalogHash,
  toServerResponsesInput,
  toServerResponsesTools,
} from './serverAgentResponses.ts';

const SERVER_TURN_JUDGMENT_FORMAT = {
  type: 'json_schema',
  name: 'kwilt_agent_judgment',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['selectedNamespaces', 'confidence', 'reason'],
    properties: {
      selectedNamespaces: {
        type: 'array', minItems: 1, maxItems: 3,
        items: {
          type: 'string',
          enum: [
            'life_structure', 'tasks_plan', 'household', 'money', 'food',
            'device_wellbeing', 'account_navigation',
          ],
        },
      },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      reason: { type: 'string', minLength: 1, maxLength: 240 },
    },
  },
} as const;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function parseJudgmentOutput(raw: unknown): ServerTurnJudgment | null {
  const body = record(raw);
  if (!Array.isArray(body.output)) return null;
  const outputText = body.output.flatMap((item) => {
    const message = record(item);
    return Array.isArray(message.content)
      ? message.content.flatMap((part) => {
        const content = record(part);
        return content.type === 'output_text' && typeof content.text === 'string' ? [content.text] : [];
      })
      : [];
  }).join('');
  let parsed: Record<string, unknown>;
  try { parsed = record(JSON.parse(outputText)); } catch { return null; }
  const selectedNamespaces = Array.isArray(parsed.selectedNamespaces)
    ? parsed.selectedNamespaces.filter((value): value is KwiltToolNamespaceId =>
      typeof value === 'string' && SERVER_TURN_JUDGMENT_FORMAT.schema.properties
        .selectedNamespaces.items.enum.includes(value as KwiltToolNamespaceId))
    : [];
  if (selectedNamespaces.length < 1 || selectedNamespaces.length > 3 ||
    typeof parsed.confidence !== 'number' || typeof parsed.reason !== 'string') return null;
  return {
    selectedNamespaces: [...new Set(selectedNamespaces)],
    confidence: parsed.confidence,
    reason: parsed.reason,
  };
}

export async function requestServerTurnJudgment({
  supabaseUrl,
  anonKey,
  serviceRoleToken,
  quotaIdentity,
  isPro,
  prompt,
  namespaces,
  fetcher = fetch,
}: {
  supabaseUrl: string;
  anonKey: string;
  serviceRoleToken: string;
  quotaIdentity: string;
  isPro: boolean;
  prompt: string;
  namespaces: readonly { id: KwiltToolNamespaceId; description: string }[];
  fetcher?: typeof fetch;
}): Promise<ServerTurnJudgment | null> {
  const namespaceSummary = namespaces
    .map((namespace) => `- ${namespace.id}: ${namespace.description}`)
    .join('\n');
  const response = await fetcher(`${supabaseUrl}/functions/v1/ai-chat/v1/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', apikey: anonKey,
      Authorization: `Bearer ${serviceRoleToken}`,
      'x-kwilt-install-id': `agent-plan:${quotaIdentity}`,
      'x-kwilt-is-pro': String(isPro),
      'x-kwilt-client': 'kwilt-agent-run',
      'x-kwilt-ai-job': 'agent_judgment',
    },
    body: JSON.stringify({
      model: 'gpt-5.6-luna',
      store: false,
      reasoning: { effort: 'low' },
      max_output_tokens: 400,
      input: [{
        role: 'user',
        content: [
          'Choose one to three Kwilt tool namespaces relevant to this request.',
          'This is advisory planning only and grants no action authority.',
          `Request: ${prompt.trim().slice(0, 1_500)}`,
          `Namespaces:\n${namespaceSummary}`,
        ].join('\n\n'),
      }],
      text: { format: SERVER_TURN_JUDGMENT_FORMAT },
    }),
  });
  if (!response.ok) throw new Error(`turn_judgment_failed:${response.status}`);
  let data: unknown;
  try { data = JSON.parse(await response.text()); } catch { return null; }
  return parseJudgmentOutput(data);
}
