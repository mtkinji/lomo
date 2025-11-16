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

export async function generateArcs(params: GenerateArcParams): Promise<GeneratedArc[]> {
  if (!OPENAI_API_KEY) {
    return mockGenerateArcs(params);
  }

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

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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

  try {
    const parsed = JSON.parse(content);
    return parsed.arcs as GeneratedArc[];
  } catch (err) {
    console.error('Failed to parse OpenAI response', err);
    throw new Error('Unable to parse AI suggestions');
  }
}


