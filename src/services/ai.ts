import { Arc } from '../domain/types';
import { getEnvVar } from '../utils/getEnv';
import { mockGenerateArcs } from './mockAi';

type GenerateArcParams = {
  prompt: string;
  timeHorizon?: string;
  additionalContext?: string;
};

export type GeneratedArc = Pick<
  Arc,
  'name' | 'narrative' | 'northStar' | 'status'
> & { suggestedForces?: string[] };

const OPENAI_API_KEY = getEnvVar<string>('openAiApiKey');
const OPENAI_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_TIMEOUT_MS = 15000;

export async function generateArcs(params: GenerateArcParams): Promise<GeneratedArc[]> {
  if (!OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY missing – using mock arc suggestions.');
    return mockGenerateArcs(params);
  }

  try {
    return await requestOpenAiArcs(params);
  } catch (err) {
    console.warn('OpenAI request failed, falling back to mock arcs.', err);
    return mockGenerateArcs(params);
  }
}

async function requestOpenAiArcs(params: GenerateArcParams): Promise<GeneratedArc[]> {
  const systemPrompt =
    'You are LOMO, a life architecture coach helping users define identity Arcs (long-term directions). ' +
    'Always respond in JSON matching the provided schema. Each Arc must include name, northStar, narrative, status, and suggestedForces array.';

  const userPrompt = `
User hunger for growth: ${params.prompt}
Time horizon: ${params.timeHorizon ?? 'not specified'}
Additional context / non-negotiables: ${params.additionalContext ?? 'none provided'}
Return 2-3 Arc suggestions that feel distinctive. Status should default to "active".
`;

  const body = {
    model: 'gpt-4o-mini',
    temperature: 0.6,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'arc_suggestions',
        schema: {
          type: 'object',
          properties: {
            arcs: {
              type: 'array',
              minItems: 1,
              maxItems: 3,
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  northStar: { type: 'string' },
                  narrative: { type: 'string' },
                  status: { type: 'string', enum: ['active', 'paused', 'archived'] },
                  suggestedForces: {
                    type: 'array',
                    items: { type: 'string' },
                    minItems: 1,
                    maxItems: 4,
                  },
                },
                required: ['name', 'northStar', 'narrative', 'status'],
                additionalProperties: false,
              },
            },
          },
          required: ['arcs'],
          additionalProperties: false,
        },
      },
    },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  };

  const response = await fetchWithTimeout(OPENAI_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI error', errorText);
    throw new Error('Unable to generate arcs');
  }

  const data = await response.json();
  if (__DEV__) {
    console.log('OpenAI raw response', JSON.stringify(data, null, 2));
  }
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('OpenAI response malformed');
  }

  const parsed = JSON.parse(content);
  return parsed.arcs as GeneratedArc[];
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = OPENAI_TIMEOUT_MS
): Promise<Response> {
  if (typeof AbortController === 'undefined') {
    // Environment (like Expo Go) may not support AbortController yet.
    return fetch(url, options);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}


