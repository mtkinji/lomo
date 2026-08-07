import { getInstallId } from '../../../services/installId';
import { useEntitlementsStore } from '../../../store/useEntitlementsStore';
import { getEnvVar } from '../../../utils/getEnv';
import type { RecipeVersion } from '../domain/recipeContracts';
import type { RecipeUpdateDraft } from '../domain/recipeUpdateDraft';
import {
  buildRecipeUpdatePrompt,
  parseRecipeUpdateSuggestion,
  RecipeUpdateSuggestionError,
} from '../domain/recipeUpdateSuggestion';

export type RecipeUpdateAiRequest = {
  schemaName: string;
  schema: Record<string, unknown>;
  systemPrompt: string;
  userPrompt: string;
  timeoutMs: number;
};

export type RecipeUpdateAiTransport = (request: RecipeUpdateAiRequest) => Promise<unknown | null>;

function endpoint(): string | null {
  const base = getEnvVar<string>('aiProxyBaseUrl')?.trim().replace(/\/+$/, '');
  return base ? `${base}/v1/chat/completions` : null;
}

export async function requestRecipeUpdateJson(request: RecipeUpdateAiRequest): Promise<unknown | null> {
  const url = endpoint();
  if (!url) return null;
  const controller = typeof AbortController === 'undefined' ? null : new AbortController();
  const timeoutId = setTimeout(() => controller?.abort(), request.timeoutMs);
  try {
    const headers = new Headers({
      'Content-Type': 'application/json',
      'x-kwilt-ai-job': 'recipe_update_suggestion',
      'x-kwilt-install-id': await getInstallId(),
      'x-kwilt-is-pro': useEntitlementsStore.getState().isPro ? 'true' : 'false',
      'x-kwilt-client': 'kwilt-mobile',
    });
    const publishableKey = getEnvVar<string>('supabasePublishableKey')?.trim();
    if (publishableKey) headers.set('apikey', publishableKey);
    const response = await fetch(url, {
      method: 'POST', headers, signal: controller?.signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini', temperature: 0.1, max_tokens: 1_400,
        response_format: { type: 'json_schema', json_schema: { name: request.schemaName, strict: true, schema: request.schema } },
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userPrompt },
        ],
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    return typeof content === 'string' && content.trim() ? JSON.parse(content) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function createRecipeUpdateSuggestionRepository(transport: RecipeUpdateAiTransport = requestRecipeUpdateJson) {
  return {
    async suggest(input: { version: RecipeVersion; draft: RecipeUpdateDraft; instruction: string }) {
      const prompt = buildRecipeUpdatePrompt({ version: input.version, instruction: input.instruction });
      const response = await transport({
        schemaName: 'recipe_update_suggestion_v1',
        schema: prompt.schema as unknown as Record<string, unknown>,
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.userPrompt,
        timeoutMs: 8_000,
      });
      if (response === null) {
        throw new RecipeUpdateSuggestionError('recipe_update.ai_unavailable', 'AI help is unavailable. You can still edit every field directly.');
      }
      return parseRecipeUpdateSuggestion(response, input.draft);
    },
  };
}

export type RecipeUpdateSuggestionRepository = ReturnType<typeof createRecipeUpdateSuggestionRepository>;
