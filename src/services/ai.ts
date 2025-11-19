import { Arc, GoalDraft } from '../domain/types';
import { mockGenerateArcs, mockGenerateGoals } from './mockAi';
import { getEnvVar } from '../utils/getEnv';

type GenerateArcParams = {
  prompt: string;
  timeHorizon?: string;
  additionalContext?: string;
};

export type GeneratedArc = Pick<
  Arc,
  'name' | 'narrative' | 'northStar' | 'status'
> & { suggestedForces?: string[] };

type GenerateGoalParams = {
  arcName: string;
  arcNarrative?: string;
  arcNorthStar?: string;
  prompt?: string;
  timeHorizon?: string;
  constraints?: string;
};

const OPENAI_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_TIMEOUT_MS = 15000;
const LOG_PREFIX = '[ai]';

const previewText = (value?: string) => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length <= 80) {
    return trimmed;
  }
  return `${trimmed.slice(0, 77)}…`;
};

const describeKey = (key?: string) =>
  key ? { present: true, length: key.length } : { present: false };

const devLog = (context: string, details?: Record<string, unknown>) => {
  if (!__DEV__) {
    return;
  }
  if (details) {
    console.log(`${LOG_PREFIX} ${context}`, details);
  } else {
    console.log(`${LOG_PREFIX} ${context}`);
  }
};

export type CoachChatTurn = {
  role: 'assistant' | 'user' | 'system';
  content: string;
};

export async function generateArcs(params: GenerateArcParams): Promise<GeneratedArc[]> {
  const apiKey = resolveOpenAiApiKey();
  devLog('generateArcs:init', {
    promptPreview: previewText(params.prompt),
    timeHorizon: params.timeHorizon ?? 'unspecified',
    additionalContextPreview: previewText(params.additionalContext),
  });
  devLog('generateArcs:apiKey', describeKey(apiKey));
  if (!apiKey) {
    console.warn('OPENAI_API_KEY missing – using mock arc suggestions.');
    devLog('generateArcs:fallback-no-key', { reason: 'missing_api_key' });
    return mockGenerateArcs(params);
  }

  try {
    const result = await requestOpenAiArcs(params, apiKey);
    devLog('generateArcs:success', { suggestionCount: result.length });
    return result;
  } catch (err) {
    console.warn('OpenAI request failed, falling back to mock arcs.', err);
    logNetworkErrorDetails('arcs', err);
    devLog('generateArcs:error', {
      message: err instanceof Error ? err.message : String(err),
      name: err instanceof Error ? err.name : undefined,
    });
    return mockGenerateArcs(params);
  }
}

async function requestOpenAiArcs(
  params: GenerateArcParams,
  apiKey: string
): Promise<GeneratedArc[]> {
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
  devLog('arcs:request:prepared', {
    model: body.model,
    temperature: body.temperature,
    promptPreview: previewText(userPrompt),
  });
  const requestStartedAt = Date.now();

  const response = await fetchWithTimeout(OPENAI_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const responseRequestId =
    typeof response.headers?.get === 'function'
      ? response.headers.get('x-request-id')
      : undefined;
  devLog('arcs:response:ok', {
    status: response.status,
    ok: response.ok,
    durationMs: Date.now() - requestStartedAt,
    requestId: responseRequestId ?? undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI error', errorText);
    devLog('arcs:response:error', {
      status: response.status,
      statusText: response.statusText,
      payloadPreview: previewText(errorText),
    });
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
  devLog('arcs:parsed', { arcsReturned: parsed.arcs?.length ?? 0 });
  return parsed.arcs as GeneratedArc[];
}

export async function generateGoals(params: GenerateGoalParams): Promise<GoalDraft[]> {
  const apiKey = resolveOpenAiApiKey();
  devLog('generateGoals:init', {
    arcName: params.arcName,
    promptPreview: previewText(params.prompt),
    timeHorizon: params.timeHorizon ?? 'unspecified',
    constraintsPreview: previewText(params.constraints),
  });
  devLog('generateGoals:apiKey', describeKey(apiKey));
  if (!apiKey) {
    console.warn('OPENAI_API_KEY missing – using mock goal suggestions.');
    devLog('generateGoals:fallback-no-key', { reason: 'missing_api_key' });
    return mockGenerateGoals(params);
  }

  try {
    const results = await requestOpenAiGoals(params, apiKey);
    devLog('generateGoals:success', { suggestionCount: results.length });
    return results;
  } catch (err) {
    console.warn('OpenAI goal request failed, using mock goals.', err);
    logNetworkErrorDetails('goals', err);
    devLog('generateGoals:error', {
      message: err instanceof Error ? err.message : String(err),
      name: err instanceof Error ? err.name : undefined,
    });
    return mockGenerateGoals(params);
  }
}

async function requestOpenAiGoals(
  params: GenerateGoalParams,
  apiKey: string
): Promise<GoalDraft[]> {
  const systemPrompt =
    'You are LOMO, a life architecture coach who helps users translate Arcs into concrete Goals. ' +
    'Return thoughtful goal drafts with title, description, status, forceIntent (values 0-3 for each canonical force), and optional suggestedActivities.';

  const userPrompt = `
Arc name: ${params.arcName}
Arc north star: ${params.arcNorthStar ?? 'not specified'}
Arc narrative: ${params.arcNarrative ?? 'not provided'}
User focus: ${params.prompt ?? 'not provided'}
Time horizon: ${params.timeHorizon ?? 'not specified'}
Constraints: ${params.constraints ?? 'none'}
Return 2-3 distinctive goal drafts that respect the arc's heart.
`;

  const body = {
    model: 'gpt-4o-mini',
    temperature: 0.55,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'goal_suggestions',
        schema: {
          type: 'object',
          properties: {
            goals: {
              type: 'array',
              minItems: 1,
              maxItems: 3,
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  status: { type: 'string', enum: ['planned', 'in_progress', 'completed', 'archived'] },
                  forceIntent: {
                    type: 'object',
                    properties: {
                      'force-activity': { type: 'integer', minimum: 0, maximum: 3 },
                      'force-connection': { type: 'integer', minimum: 0, maximum: 3 },
                      'force-mastery': { type: 'integer', minimum: 0, maximum: 3 },
                      'force-spirituality': { type: 'integer', minimum: 0, maximum: 3 },
                    },
                    required: [
                      'force-activity',
                      'force-connection',
                      'force-mastery',
                      'force-spirituality',
                    ],
                    additionalProperties: false,
                  },
                  suggestedActivities: {
                    type: 'array',
                    items: { type: 'string' },
                    minItems: 0,
                    maxItems: 5,
                  },
                },
                required: ['title', 'description', 'status', 'forceIntent'],
                additionalProperties: false,
              },
            },
          },
          required: ['goals'],
          additionalProperties: false,
        },
      },
    },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  };
  devLog('goals:request:prepared', {
    model: body.model,
    temperature: body.temperature,
    promptPreview: previewText(userPrompt),
  });
  const requestStartedAt = Date.now();

  const response = await fetchWithTimeout(OPENAI_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const responseRequestId =
    typeof response.headers?.get === 'function'
      ? response.headers.get('x-request-id')
      : undefined;
  devLog('goals:response:ok', {
    status: response.status,
    ok: response.ok,
    durationMs: Date.now() - requestStartedAt,
    requestId: responseRequestId ?? undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI goal error', errorText);
    devLog('goals:response:error', {
      status: response.status,
      statusText: response.statusText,
      payloadPreview: previewText(errorText),
    });
    throw new Error('Unable to generate goals');
  }

  const data = await response.json();
  if (__DEV__) {
    console.log('OpenAI goal raw response', JSON.stringify(data, null, 2));
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI goal response malformed');
  }

  const parsed = JSON.parse(content);
  devLog('goals:parsed', { goalsReturned: parsed.goals?.length ?? 0 });
  return parsed.goals as GoalDraft[];
}

/**
 * Generic LOMO coach chat endpoint backed by OpenAI's Chat Completions API.
 * This powers the free-form Lomo Coach conversation in the bottom sheet.
 */
export async function sendCoachChat(messages: CoachChatTurn[]): Promise<string> {
  const apiKey = resolveOpenAiApiKey();
  devLog('coachChat:init', {
    messageCount: messages.length,
    lastUserPreview: previewText(
      [...messages].reverse().find((m) => m.role === 'user')?.content,
    ),
  });
  devLog('coachChat:apiKey', describeKey(apiKey));

  if (!apiKey) {
    console.warn('OPENAI_API_KEY missing – unable to call coach chat.');
    throw new Error('Missing OpenAI API key');
  }

  const systemPrompt =
    'You are Lomo Coach, a calm, practical life architecture coach. ' +
    'Help users clarify arcs (longer identity directions), goals, and today’s focus. ' +
    'Ask thoughtful follow-ups when helpful, keep answers grounded and concise, and avoid emoji unless the user uses them first.';

  const openAiMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role === 'system' ? 'system' : m.role,
      content: m.content,
    })),
  ];

  const body = {
    model: 'gpt-4o-mini',
    temperature: 0.55,
    messages: openAiMessages,
  };

  devLog('coachChat:request:prepared', {
    model: body.model,
    temperature: body.temperature,
    totalMessages: openAiMessages.length,
  });
  const requestStartedAt = Date.now();

  const response = await fetchWithTimeout(OPENAI_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const responseRequestId =
    typeof response.headers?.get === 'function'
      ? response.headers.get('x-request-id')
      : undefined;

  devLog('coachChat:response:ok', {
    status: response.status,
    ok: response.ok,
    durationMs: Date.now() - requestStartedAt,
    requestId: responseRequestId ?? undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI coach chat error', errorText);
    devLog('coachChat:response:error', {
      status: response.status,
      statusText: response.statusText,
      payloadPreview: previewText(errorText),
    });
    throw new Error('Unable to reach Lomo Coach');
  }

  const data = await response.json();
  if (__DEV__) {
    console.log('OpenAI coach chat raw response', JSON.stringify(data, null, 2));
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI coach chat response malformed');
  }

  devLog('coachChat:parsed', { contentPreview: previewText(content) });
  return content as string;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = OPENAI_TIMEOUT_MS
): Promise<Response> {
  if (typeof AbortController === 'undefined') {
    // Environment (like Expo Go) may not support AbortController yet.
    devLog('fetchWithTimeout:no-abort-controller', { url, timeoutMs });
    return fetch(url, options);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    devLog('fetchWithTimeout:aborting', { url, timeoutMs });
    controller.abort();
  }, timeoutMs);
  devLog('fetchWithTimeout:dispatch', {
    url,
    timeoutMs,
    method: options.method ?? 'GET',
    hasBody: Boolean(options.body),
  });

  try {
    const start = Date.now();
    const response = await fetch(url, { ...options, signal: controller.signal });
    devLog('fetchWithTimeout:response', {
      url,
      status: response.status,
      ok: response.ok,
      durationMs: Date.now() - start,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

function logNetworkErrorDetails(context: 'arcs' | 'goals', err: unknown) {
  if (!__DEV__) {
    return;
  }

  const details: Record<string, unknown> = { context };
  if (err instanceof Error) {
    details.name = err.name;
    details.message = err.message;
    details.stack = err.stack;
    const maybeExtendedError = err as Error & Record<string, unknown>;
    if (typeof maybeExtendedError.status !== 'undefined') {
      details.status = maybeExtendedError.status;
    }
    if (typeof maybeExtendedError.code !== 'undefined') {
      details.code = maybeExtendedError.code;
    }
    if (typeof maybeExtendedError.cause !== 'undefined') {
      details.cause = maybeExtendedError.cause;
    }
  } else if (err && typeof err === 'object') {
    Object.assign(details, err as Record<string, unknown>);
  } else {
    details.raw = err;
  }
  console.warn(`[debug:${context}] network error details`, details);
}

function resolveOpenAiApiKey(): string | undefined {
  return getEnvVar<string>('openAiApiKey');
}


