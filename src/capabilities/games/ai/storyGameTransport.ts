import { useEntitlementsStore } from '@/src/store/useEntitlementsStore';
import { getInstallId } from '@/src/services/installId';
import { getEnvVar } from '@/src/utils/getEnv';

export type StoryGameAiRequest = {
  schemaName: string;
  schema: Record<string, unknown>;
  systemPrompt: string;
  userPrompt: string;
  timeoutMs: number;
};

export type StoryGameAiTransport = (request: StoryGameAiRequest) => Promise<unknown | null>;

function getStoryGameEndpoint() {
  const base = getEnvVar<string>('aiProxyBaseUrl')?.trim().replace(/\/+$/, '');
  return base ? `${base}/v1/chat/completions` : null;
}

export async function requestStoryGameJson(request: StoryGameAiRequest): Promise<unknown | null> {
  const endpoint = getStoryGameEndpoint();
  if (!endpoint) return null;

  const controller = typeof AbortController === 'undefined' ? null : new AbortController();
  const timeoutId = setTimeout(() => controller?.abort(), request.timeoutMs);

  try {
    const installId = await getInstallId();
    const headers = new Headers({
      'Content-Type': 'application/json',
      'x-kwilt-ai-job': 'story_game',
      'x-kwilt-install-id': installId,
      'x-kwilt-is-pro': useEntitlementsStore.getState().isPro ? 'true' : 'false',
      'x-kwilt-client': 'kwilt-mobile',
    });
    const publishableKey = getEnvVar<string>('supabasePublishableKey')?.trim();
    if (publishableKey) headers.set('apikey', publishableKey);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      signal: controller?.signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.65,
        max_tokens: 700,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: request.schemaName,
            strict: true,
            schema: request.schema,
          },
        },
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userPrompt },
        ],
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) return null;
    return JSON.parse(content);
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
