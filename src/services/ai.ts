import { Arc, GoalDraft, type AgeRange } from '../domain/types';
import { mockGenerateArcs, mockGenerateGoals } from './mockAi';
import { getEnvVar } from '../utils/getEnv';
import { useAppStore } from '../store/useAppStore';
import type { ChatMode } from '../features/ai/chatRegistry';

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

const buildUserProfileSummary = (): string | undefined => {
  // Zustand store hook has a getState method we can use outside React components.
  const state = typeof useAppStore.getState === 'function' ? useAppStore.getState() : undefined;
  const profile = state?.userProfile;

  if (!profile) {
    return undefined;
  }

  const parts: string[] = [];

  if (profile.ageRange) {
    parts.push(`Age range: ${profile.ageRange}.`);
  }
  if (profile.timezone) {
    parts.push(`Timezone: ${profile.timezone}.`);
  }

  const communication = profile.communication ?? {};
  if (communication.tone) {
    parts.push(`Prefers ${communication.tone} tone.`);
  }
  if (communication.detailLevel) {
    parts.push(`Prefers ${communication.detailLevel} level of detail.`);
  }
  if (typeof communication.askBeforePushing === 'boolean') {
    parts.push(
      communication.askBeforePushing
        ? 'Ask permission before offering strong challenges.'
        : 'Can handle direct challenges without much preface.'
    );
  }
  if (typeof communication.emojiAllowed === 'boolean') {
    parts.push(
      communication.emojiAllowed
        ? 'Emoji are welcome if they help.'
        : 'Avoid using emoji unless the user uses them first.'
    );
  }
  if (communication.spiritualLanguage) {
    parts.push(`Spiritual language preference: ${communication.spiritualLanguage}.`);
  }

  const visuals = profile.visuals ?? {};
  if (visuals.style) {
    parts.push(`Visual style preference: ${visuals.style}.`);
  }
  if (visuals.palette) {
    parts.push(`Color palette preference: ${visuals.palette}.`);
  }
  if (typeof visuals.prefersPhotography === 'boolean') {
    parts.push(
      visuals.prefersPhotography
        ? 'Prefers photographic imagery when possible.'
        : 'Prefers non-photographic or illustrative imagery.'
    );
  }
  if (typeof visuals.prefersIcons === 'boolean') {
    parts.push('Likes clear, simple iconography in visuals.');
  }

  const accessibility = profile.accessibility ?? {};
  if (typeof accessibility.prefersLargeText === 'boolean' && accessibility.prefersLargeText) {
    parts.push('Prefers larger text and higher readability.');
  }
  if (typeof accessibility.highContrastMode === 'boolean' && accessibility.highContrastMode) {
    parts.push('Prefers high-contrast visuals.');
  }
  if (typeof accessibility.reduceMotion === 'boolean' && accessibility.reduceMotion) {
    parts.push('Prefers reduced motion / fewer animations.');
  }

  const consent = profile.consent ?? {};
  if (typeof consent.personalizedSuggestionsEnabled === 'boolean') {
    parts.push(
      consent.personalizedSuggestionsEnabled
        ? 'User has enabled personalized suggestions.'
        : 'User prefers less personalized, more generic suggestions.'
    );
  }
  if (typeof consent.useHistoryForCoaching === 'boolean') {
    parts.push(
      consent.useHistoryForCoaching
        ? 'You may use past arcs, goals, and activities to tailor guidance.'
        : 'Avoid making inferences from detailed historical behavior.'
    );
  }

  if (parts.length === 0) {
    return undefined;
  }

  return parts.join(' ');
};

export type CoachChatTurn = {
  role: 'assistant' | 'user' | 'system';
  content: string;
};

type CoachToolName = 'get_user_profile' | 'set_user_profile';

type CoachToolCall = {
  id: string;
  function: {
    name: CoachToolName;
    arguments: string;
  };
};

type OpenAiToolMessage = {
  role: 'assistant';
  tool_calls?: CoachToolCall[];
  content?: string | null;
};

const buildCoachToolsForMode = (mode?: ChatMode) => {
  if (mode !== 'arcCreation') {
    return undefined;
  }

  const ageRangeEnum: AgeRange[] = [
    'under-18',
    '18-24',
    '25-34',
    '35-44',
    '45-54',
    '55-64',
    '65-plus',
    'prefer-not-to-say',
  ];

  return [
    {
      type: 'function',
      function: {
        name: 'get_user_profile' as CoachToolName,
        description:
          'Read the user profile fields that are relevant for coaching tone and examples, such as age range.',
        parameters: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'set_user_profile' as CoachToolName,
        description:
          'Update parts of the user profile such as age range. Use this only when the user has clearly provided or confirmed the information.',
        parameters: {
          type: 'object',
          properties: {
            ageRange: {
              type: 'string',
              enum: ageRangeEnum,
              description:
                'User age range bucket, used only to tune tone and examples, not to make assumptions.',
            },
          },
          additionalProperties: false,
        },
      },
    },
  ];
};

const runCoachTool = (tool: CoachToolCall) => {
  const name = tool.function.name;
  let args: unknown;
  try {
    args = tool.function.arguments ? JSON.parse(tool.function.arguments) : {};
  } catch (err) {
    devLog('coachTool:args-parse-error', {
      name,
      raw: tool.function.arguments,
      error: err instanceof Error ? err.message : String(err),
    });
    args = {};
  }

  const state = typeof useAppStore.getState === 'function' ? useAppStore.getState() : undefined;

  if (!state) {
    return { ok: false, error: 'Store unavailable' };
  }

  if (name === 'get_user_profile') {
    const profile = state.userProfile ?? null;
    return {
      ok: true,
      profile,
    };
  }

  if (name === 'set_user_profile') {
    const payload = (args as { ageRange?: AgeRange | null }) ?? {};
    if (typeof payload.ageRange === 'string') {
      state.updateUserProfile((current) => ({
        ...current,
        ageRange: payload.ageRange as AgeRange,
      }));
    }
    const updated = typeof useAppStore.getState === 'function' ? useAppStore.getState() : state;
    return {
      ok: true,
      profile: updated.userProfile ?? null,
    };
  }

  return { ok: false, error: `Unknown tool: ${name}` };
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
  const baseSystemPrompt =
    'You are LOMO, a life architecture coach helping users define identity Arcs (long-term directions). ' +
    'Always respond in JSON matching the provided schema. Each Arc must include name, northStar, narrative, status, and suggestedForces array.';

  const userProfileSummary = buildUserProfileSummary();
  const systemPrompt = userProfileSummary
    ? `${baseSystemPrompt} Here is relevant context about the user: ${userProfileSummary}`
    : baseSystemPrompt;

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
  const baseSystemPrompt =
    'You are LOMO, a life architecture coach who helps users translate Arcs into concrete Goals. ' +
    'Return thoughtful goal drafts with title, description, status, forceIntent (values 0-3 for each canonical force), and optional suggestedActivities.';

  const userProfileSummary = buildUserProfileSummary();
  const systemPrompt = userProfileSummary
    ? `${baseSystemPrompt} Here is relevant context about the user: ${userProfileSummary}`
    : baseSystemPrompt;

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
export async function sendCoachChat(
  messages: CoachChatTurn[],
  options?: { mode?: ChatMode }
): Promise<string> {
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

  const baseSystemPrompt =
    'You are Lomo Coach, a calm, practical life architecture coach. ' +
    'Help users clarify arcs (longer identity directions), goals, and today’s focus. ' +
    'Ask thoughtful follow-ups when helpful, keep answers grounded and concise, and avoid emoji unless the user uses them first.';

  const userProfileSummary = buildUserProfileSummary();
  const systemPrompt = userProfileSummary
    ? `${baseSystemPrompt} Here is relevant context about the user: ${userProfileSummary}`
    : baseSystemPrompt;

  const openAiMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role === 'system' ? 'system' : m.role,
      content: m.content,
    })),
  ];
  const tools = buildCoachToolsForMode(options?.mode);

  const body: Record<string, unknown> = {
    model: 'gpt-4o-mini',
    temperature: 0.55,
    messages: openAiMessages,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

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

  const firstChoice = data.choices?.[0]?.message as OpenAiToolMessage | undefined;
  if (!firstChoice) {
    throw new Error('OpenAI coach chat response malformed');
  }

  // If the model did not request any tools, return the content as before.
  if (!firstChoice.tool_calls || firstChoice.tool_calls.length === 0) {
    const content = firstChoice.content;
    if (!content) {
      throw new Error('OpenAI coach chat response missing content');
    }
    devLog('coachChat:parsed', { contentPreview: previewText(content) });
    return content as string;
  }

  // Execute requested tools locally, then send a follow-up request so the model
  // can incorporate tool results into a final assistant message.
  const toolCalls = firstChoice.tool_calls;
  devLog('coachChat:tool-calls', {
    count: toolCalls.length,
    names: toolCalls.map((t) => t.function.name),
  });

  const toolMessages = toolCalls.map((toolCall) => {
    const result = runCoachTool(toolCall);
    return {
      role: 'tool' as const,
      tool_call_id: toolCall.id,
      name: toolCall.function.name,
      content: JSON.stringify(result),
    };
  });

  const followupBody: Record<string, unknown> = {
    model: 'gpt-4o-mini',
    temperature: 0.55,
    messages: [
      ...openAiMessages,
      {
        role: 'assistant',
        tool_calls: toolCalls,
      },
      ...toolMessages,
    ],
  };

  if (tools && tools.length > 0) {
    followupBody.tools = tools;
  }

  const followupStartedAt = Date.now();
  const followupResponse = await fetchWithTimeout(OPENAI_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(followupBody),
  });

  devLog('coachChat:followup:response', {
    status: followupResponse.status,
    ok: followupResponse.ok,
    durationMs: Date.now() - followupStartedAt,
  });

  if (!followupResponse.ok) {
    const errorText = await followupResponse.text();
    console.error('OpenAI coach follow-up error', errorText);
    throw new Error('Unable to reach Lomo Coach (follow-up)');
  }

  const followupData = await followupResponse.json();
  const finalContent = followupData.choices?.[0]?.message?.content;
  if (!finalContent) {
    throw new Error('OpenAI coach chat follow-up response malformed');
  }

  devLog('coachChat:parsed:final', { contentPreview: previewText(finalContent) });
  return finalContent as string;
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


