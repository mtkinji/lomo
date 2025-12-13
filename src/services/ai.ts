import { Arc, GoalDraft, type AgeRange } from '../domain/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFocusAreaLabel } from '../domain/focusAreas';
import { listIdealArcTemplates } from '../domain/idealArcs';
import { mockGenerateArcs, mockGenerateGoals } from './mockAi';
import { getEnvVar } from '../utils/getEnv';
import { useAppStore, type LlmModel } from '../store/useAppStore';
import type { ChatMode } from '../features/ai/workflowRegistry';
import { buildCoachChatContext } from '../features/ai/agentRuntime';

type GenerateArcParams = {
  prompt: string;
  timeHorizon?: string;
  additionalContext?: string;
};

export type GeneratedArc = Pick<Arc, 'name' | 'narrative' | 'status'> & {
  suggestedForces?: string[];
};

const formatIdealArcExamplesForPrompt = (maxExamples = 4): string => {
  const templates = listIdealArcTemplates();
  const examples: string[] = [];

  templates.slice(0, Math.max(0, maxExamples)).forEach((template) => {
    const sentences = template.narrative
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 3);

    if (sentences.length >= 3) {
      const exampleNarrative = sentences.join('. ') + '.';
      examples.push(
        `Example - ${template.name}:`,
        `- name: "${template.name}"`,
        `- narrative: "${exampleNarrative}"`,
        '',
      );
    }
  });

  return examples.join('\n').trim();
};

const normalizeNarrative = (value: string): string =>
  value.replace(/\s+/g, ' ').replace(/\n+/g, ' ').trim();

const countWords = (value: string): number => {
  const tokens = value
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  return tokens.length;
};

const countSentences = (value: string): number => {
  const normalized = normalizeNarrative(value);
  const chunks = normalized
    // Split on sentence-ending punctuation followed by whitespace/end.
    .split(/[.!?]+(?:\s|$)+/g)
    .map((s) => s.trim())
    .filter(Boolean);
  return chunks.length;
};

const countMeaningfulNameWords = (name: string): number => {
  const tokens = name
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  // Count tokens that contain letters/numbers; ignore emoji/punctuation-only tokens.
  return tokens.filter((t) => /[\p{L}\p{N}]/u.test(t)).length;
};

const validateGeneratedArc = (arc: GeneratedArc): { ok: boolean; reasons: string[] } => {
  const reasons: string[] = [];
  const name = (arc.name ?? '').trim();
  const narrativeRaw = (arc.narrative ?? '').trim();
  const narrative = normalizeNarrative(narrativeRaw);

  if (!name) {
    reasons.push('missing_name');
  } else {
    const meaningfulWords = countMeaningfulNameWords(name);
    if (meaningfulWords < 1 || meaningfulWords > 3) {
      reasons.push('name_not_1_to_3_words');
    }
    if (name.length > 42) {
      reasons.push('name_too_long');
    }
  }

  if (!narrative) {
    reasons.push('missing_narrative');
  } else {
    if (!/^I want(?:\s|…)/.test(narrative)) {
      reasons.push('narrative_missing_I_want_prefix');
    }
    const wordCount = countWords(narrative);
    if (wordCount < 40 || wordCount > 120) {
      reasons.push('narrative_word_count_out_of_bounds');
    }
    const sentenceCount = countSentences(narrative);
    if (sentenceCount !== 3) {
      reasons.push('narrative_not_3_sentences');
    }
    if (/\n/.test(narrativeRaw)) {
      reasons.push('narrative_not_single_paragraph');
    }
  }

  if (!arc.status) {
    reasons.push('missing_status');
  }

  return { ok: reasons.length === 0, reasons };
};

const postProcessGeneratedArcs = (arcs: GeneratedArc[]) => {
  const cleaned: GeneratedArc[] = arcs
    .filter((arc) => arc && typeof arc === 'object')
    .map((arc) => ({
      ...arc,
      name: (arc.name ?? '').trim(),
      narrative: normalizeNarrative(String(arc.narrative ?? '')),
      status: (arc.status ?? 'active') as Arc['status'],
      suggestedForces: Array.isArray(arc.suggestedForces)
        ? arc.suggestedForces.map((f) => String(f).trim()).filter(Boolean).slice(0, 4)
        : arc.suggestedForces,
    }))
    .filter((arc) => arc.name.length > 0 && arc.narrative.length > 0);

  const results: Array<GeneratedArc & { _reasons?: string[] }> = [];
  cleaned.forEach((arc) => {
    const verdict = validateGeneratedArc(arc);
    if (verdict.ok) {
      results.push(arc);
    } else {
      results.push({ ...arc, _reasons: verdict.reasons });
    }
  });

  const valid = results.filter((arc) => !arc._reasons) as GeneratedArc[];
  const invalid = results.filter((arc) => arc._reasons) as Array<GeneratedArc & { _reasons: string[] }>;

  return { valid: valid.slice(0, 3), invalid };
};

type GenerateGoalParams = {
  arcName: string;
  arcNarrative?: string;
  prompt?: string;
  timeHorizon?: string;
  constraints?: string;
};

export type GenerateArcHeroImageParams = {
  arcName: string;
  arcNarrative?: string;
};

const OPENAI_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations';
// Default network timeout for lighter, one-off OpenAI requests (arcs, goals, images).
const OPENAI_TIMEOUT_MS = 15000;
// More generous timeout for conversational coach chat, which sends larger context
// payloads and can legitimately take longer to respond.
const OPENAI_CHAT_TIMEOUT_MS = 45000;
const LOG_PREFIX = '[ai]';

/**
 * Central dev logging helper for AI-related traces.
 *
 * By default this keeps logs **very** quiet so normal FTUE runs only surface
 * high-signal events (errors, summaries) instead of every network call.
 *
 * If you need to debug low-level chat/network behavior again, temporarily
 * flip `AI_DEBUG_VERBOSE` to `true` while working locally.
 */
const AI_DEBUG_VERBOSE = false;

const MUTED_CONTEXT_PREFIXES: string[] = [
  // Chat + workflow flows can be quite verbose; keep their dev logs muted
  // unless explicitly debugging.
  'coachChat:',
  'fetchWithTimeout:',
];

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

const calculateAgeFromBirthdate = (birthdate?: string): number | null => {
  if (!birthdate) return null;
  const date = new Date(birthdate);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }
  if (age < 0 || age > 120) {
    return null;
  }
  return age;
};

const describeKey = (key?: string) =>
  key ? { present: true, length: key.length } : { present: false };

const devLog = (context: string, details?: Record<string, unknown>) => {
  if (!__DEV__) return;

  if (!AI_DEBUG_VERBOSE) {
    // In non-verbose mode, drop known-noisy debug contexts so FTUE logs stay
    // focused on high-signal messages (like onboarding summaries and errors).
    const shouldMute = MUTED_CONTEXT_PREFIXES.some((prefix) => context.startsWith(prefix));
    if (shouldMute) {
      return;
    }
  }

  if (details) {
    // eslint-disable-next-line no-console
    console.log(`${LOG_PREFIX} ${context}`, details);
  } else {
    // eslint-disable-next-line no-console
    console.log(`${LOG_PREFIX} ${context}`);
  }
};

export const buildUserProfileSummary = (): string | undefined => {
  // Zustand store hook has a getState method we can use outside React components.
  const state = typeof useAppStore.getState === 'function' ? useAppStore.getState() : undefined;
  const profile = state?.userProfile;

  if (!profile) {
    return undefined;
  }

  const parts: string[] = [];

  // Core identity snapshot
  if (profile.fullName) {
    parts.push(`Name: ${profile.fullName}.`);
  }
  const derivedAge = calculateAgeFromBirthdate(profile.birthdate);
  if (typeof derivedAge === 'number') {
    parts.push(`Approximate age: ${derivedAge}.`);
  }
  if (profile.birthdate) {
    parts.push(`Birthdate: ${profile.birthdate}.`);
  }
  if (profile.ageRange) {
    parts.push(`Age range: ${profile.ageRange}.`);
  }
  if (profile.timezone) {
    parts.push(`Timezone: ${profile.timezone}.`);
  }
  if (profile.identitySummary) {
    parts.push(`Identity summary: ${profile.identitySummary}`);
  }
  if (profile.coachContextSummary) {
    parts.push(`Additional context: ${profile.coachContextSummary}`);
  }
  if (profile.focusAreas && profile.focusAreas.length > 0) {
    const labels = profile.focusAreas.map((area) => getFocusAreaLabel(area));
    parts.push(`Focus areas this season: ${labels.join(', ')}.`);
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
  const notifications = profile.notifications ?? {};
  if (typeof notifications.remindersEnabled === 'boolean') {
    parts.push(
      notifications.remindersEnabled
        ? 'Notifications/reminders are enabled.'
        : 'Notifications are currently off per the user.'
    );
  }

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

  const text = parts.join(' ');

  // Keep the final summary reasonably compact so prompts stay within bounds.
  const MAX_LENGTH = 600;
  if (text.length <= MAX_LENGTH) {
    return text;
  }

  return `${text.slice(0, MAX_LENGTH - 1)}…`;
};

export type CoachChatTurn = {
  role: 'assistant' | 'user' | 'system';
  content: string;
};

/**
 * Dev-only storage key for inspecting raw kwilt Coach conversations from the
 * in-app DevTools screen. This is intentionally not used for any production
 * features and is gated by `__DEV__` so we don't accumulate unbounded history
 * in release builds.
 */
export const DEV_COACH_CHAT_HISTORY_STORAGE_KEY = 'kwilt-dev-coach-history-v1';

export type DevCoachChatFeedback = {
  id: string;
  createdAt: string;
  note: string;
};

export type DevCoachChatLogEntry = {
  id: string;
  timestamp: string;
  mode?: ChatMode;
  /**
   * Optional workflow metadata for chats that are running under a concrete
   * WorkflowDefinition (for example, first-time onboarding v2).
   */
  workflowDefinitionId?: string;
  workflowInstanceId?: string;
  workflowStepId?: string;
  /**
   * Optional human-readable launch context summary string passed into the
   * chat as a hidden system message. This is useful when reviewing dev
   * history so we can see which screen/intent launched the coach.
   */
  launchContextSummary?: string;
  messages: CoachChatTurn[];
  /**
   * Optional dev feedback notes attached from the DevTools screen. These are
   * never sent to the model; they exist purely so we can aggregate workflow
   * edits from real conversations.
   */
  feedback?: DevCoachChatFeedback[];
};

const MAX_DEV_CHAT_HISTORY_ENTRIES = 50;

export type CoachChatOptions = {
  mode?: ChatMode;
  workflowDefinitionId?: string;
  workflowInstanceId?: string;
  workflowStepId?: string;
  launchContextSummary?: string;
};

const appendDevCoachChatHistory = async (
  snapshot: Omit<DevCoachChatLogEntry, 'id'>
): Promise<void> => {
  if (!__DEV__) return;

  try {
    const raw = await AsyncStorage.getItem(DEV_COACH_CHAT_HISTORY_STORAGE_KEY);
    const existing: DevCoachChatLogEntry[] = raw ? JSON.parse(raw) : [];
    const nextEntry: DevCoachChatLogEntry = {
      id: `${snapshot.timestamp}-${existing.length + 1}`,
      ...snapshot,
    };
    const next = [...existing, nextEntry];
    const trimmed =
      next.length > MAX_DEV_CHAT_HISTORY_ENTRIES
        ? next.slice(next.length - MAX_DEV_CHAT_HISTORY_ENTRIES)
        : next;
    await AsyncStorage.setItem(
      DEV_COACH_CHAT_HISTORY_STORAGE_KEY,
      JSON.stringify(trimmed)
    );
  } catch (err) {
    // Dev-only surface; avoid crashing if history logging fails.
    console.warn('Failed to append dev coach chat history', err);
  }
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
  // Profile tools are intentionally restricted to Arc creation. First-time
  // onboarding now collects identity data through workflow-driven cards
  // instead of allowing the model to freestyle reads/writes.
  const shouldExposeProfileTools = mode === 'arcCreation';
  if (!shouldExposeProfileTools) {
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
          'Update parts of the user profile such as name or age range. Use this only when the user has clearly provided or confirmed the information.',
        parameters: {
          type: 'object',
          properties: {
            ageRange: {
              type: 'string',
              enum: ageRangeEnum,
              description:
                'User age range bucket, used only to tune tone and examples, not to make assumptions.',
            },
            fullName: {
              type: 'string',
              description: 'Preferred name the user wants the coach to use in conversations.',
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
    const payload = (args as { ageRange?: AgeRange | null; fullName?: string | null }) ?? {};
    if (typeof payload.ageRange === 'string' || typeof payload.fullName === 'string') {
      state.updateUserProfile((current) => ({
        ...current,
        ageRange: typeof payload.ageRange === 'string' ? (payload.ageRange as AgeRange) : current.ageRange,
        fullName:
          typeof payload.fullName === 'string' && payload.fullName.trim().length > 0
            ? payload.fullName.trim()
            : current.fullName,
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
    const attempts: Array<{ attempt: number; arcs: GeneratedArc[]; invalidCount: number }> = [];
    let lastInvalidSummary: string | null = null;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const result = await requestOpenAiArcs(params, apiKey, {
        attempt,
        repairHint: lastInvalidSummary ?? undefined,
      });
      const { valid, invalid } = postProcessGeneratedArcs(result);
      attempts.push({ attempt, arcs: valid, invalidCount: invalid.length });

      if (valid.length >= 2 || (valid.length >= 1 && attempt === 2)) {
        devLog('generateArcs:success', {
          suggestionCount: valid.length,
          attempt,
          invalidCount: invalid.length,
        });
        return valid;
      }

      const invalidReasons = invalid
        .flatMap((arc) => arc._reasons ?? [])
        .reduce<Record<string, number>>((acc, reason) => {
          acc[reason] = (acc[reason] ?? 0) + 1;
          return acc;
        }, {});
      lastInvalidSummary = `Previous output violated constraints: ${Object.entries(invalidReasons)
        .map(([key, count]) => `${key}(${count})`)
        .join(', ')}. Regenerate with strict compliance.`;
      devLog('generateArcs:retry', { attempt, invalidReasons });
    }

    // Should not reach here; fallback to last attempt if it did.
    const last = attempts[attempts.length - 1];
    if (last?.arcs?.length) {
      return last.arcs;
    }
    return mockGenerateArcs(params);
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

export async function generateArcHeroImage(
  params: GenerateArcHeroImageParams
): Promise<string> {
  const apiKey = resolveOpenAiApiKey();
  devLog('heroImage:init', {
    arcName: params.arcName,
    narrativePreview: previewText(params.arcNarrative),
  });
  devLog('heroImage:apiKey', describeKey(apiKey));

  const fallbackUrl = `https://picsum.photos/seed/${encodeURIComponent(
    params.arcName || 'arc'
  )}/1200/800`;

  if (!apiKey) {
    console.warn('OPENAI_API_KEY missing – using placeholder hero image.');
    devLog('heroImage:fallback-no-key', { reason: 'missing_api_key' });
    return fallbackUrl;
  }

  try {
    const url = await requestOpenAiArcHeroImage(params, apiKey);
    devLog('heroImage:success', { urlPreview: previewText(url) });
    return url;
  } catch (err) {
    console.warn('OpenAI hero image request failed, using placeholder.', err);
    logNetworkErrorDetails('images', err);
    devLog('heroImage:error', {
      message: err instanceof Error ? err.message : String(err),
      name: err instanceof Error ? err.name : undefined,
    });
    return fallbackUrl;
  }
}

export type ArcBannerVibeQueryInput = {
  arcName: string;
  arcNarrative?: string;
  goalTitles?: string[];
};

/**
 * Generate a short, "vibe"-based Unsplash search query for an Arc.
 * Uses a cheap/fast chat model and returns a compact phrase (2–5 words).
 */
export async function generateArcBannerVibeQuery(
  input: ArcBannerVibeQueryInput
): Promise<string | null> {
  const apiKey = resolveOpenAiApiKey();
  const arcName = input.arcName?.trim() ?? '';
  const narrative = input.arcNarrative?.trim() ?? '';
  const goalTitles = (input.goalTitles ?? []).map((g) => g.trim()).filter(Boolean).slice(0, 8);

  devLog('bannerVibe:init', {
    arcName,
    narrativePreview: previewText(narrative),
    goalCount: goalTitles.length,
    apiKey: describeKey(apiKey),
  });

  if (!apiKey) {
    return null;
  }

  const model: LlmModel = 'gpt-4o-mini';
  const systemPrompt =
    'You generate short search queries for Unsplash images. ' +
    'Return a single line containing ONLY a compact search phrase (2–5 words). ' +
    'No quotes. No hashtags. No punctuation. No emojis. ' +
    'Prefer concrete visual nouns + adjectives (e.g., "misty alpine sunrise", "cozy reading nook").';

  const userPrompt = `
Arc name: ${arcName || '(missing)'}
Arc narrative: ${narrative || '(none)'}
Goal titles: ${goalTitles.length > 0 ? goalTitles.join(' | ') : '(none)'}

Return one Unsplash search phrase that matches the Arc's vibe.
`;

  const body = {
    model,
    temperature: 0.8,
    max_tokens: 24,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  };

  const requestStartedAt = Date.now();
  const response = await fetchWithTimeout(
    OPENAI_COMPLETIONS_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    },
    OPENAI_TIMEOUT_MS
  );

  devLog('bannerVibe:response', {
    status: response.status,
    ok: response.ok,
    durationMs: Date.now() - requestStartedAt,
  });

  if (!response.ok) {
    const errorText = await response.text();
    devLog('bannerVibe:response:error', { payloadPreview: previewText(errorText) });
    return null;
  }

  const data = await response.json();
  const content = (data?.choices?.[0]?.message?.content as string | undefined) ?? '';
  const firstLine = content.split('\n')[0]?.trim() ?? '';
  const cleaned = firstLine
    .replace(/^["'`]+/, '')
    .replace(/["'`]+$/, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return null;
  }

  // Keep it reasonably short for Unsplash search.
  return cleaned.split(' ').slice(0, 5).join(' ');
}

async function requestOpenAiArcs(
  params: GenerateArcParams,
  apiKey: string,
  meta?: { attempt?: number; repairHint?: string }
): Promise<GeneratedArc[]> {
  const model = resolveChatModel();
  const idealExamples = formatIdealArcExamplesForPrompt(4);
  const baseSystemPrompt = [
    'You are an identity-development coach inside the Kwilt app.',
    'You help users generate a long-term identity direction called an Arc.',
    '',
    'An Arc is:',
    '- a slow-changing identity arena where the user wants to grow,',
    '- a direction for who they want to become,',
    '- not a task list, not a project, not a personality label, and not corporate-speak.',
    '',
    'ARC NAME RULES:',
    '- 1–3 meaningful words (emoji/punctuation tokens are allowed but do not count as words),',
    '- stable over years (can hold many goals),',
    '- concrete identity direction, not a task.',
    '',
    'ARC NARRATIVE RULES (strict):',
    '- exactly 3 sentences in ONE paragraph (no newlines),',
    '- 40–120 words,',
    '- FIRST sentence must start with: "I want…",',
    '- grounded, plain language (ages 14–50+),',
    '- avoid guru-speak/cosmic language/therapy language/prescriptive "shoulds",',
    '- describe only who they want to become and why it matters now (not who they are today).',
    '',
    'Each Arc must include: name, narrative, status (default "active"), and suggestedForces (1–4 short strings).',
    'Always respond with JSON matching the provided schema. Do not include any extra keys.',
    '',
    idealExamples
      ? [
          'STYLE EXAMPLES (follow the feel; do not copy):',
          idealExamples,
        ].join('\n')
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const userProfileSummary = buildUserProfileSummary();
  const systemPrompt = userProfileSummary
    ? `${baseSystemPrompt} Here is relevant context about the user: ${userProfileSummary}`
    : baseSystemPrompt;

  const userPromptLines: string[] = [
    `User hunger for growth: ${params.prompt}`,
    `Time horizon: ${params.timeHorizon ?? 'not specified'}`,
    `Additional context / non-negotiables: ${params.additionalContext ?? 'none provided'}`,
    '',
    'Return 2–3 Arc suggestions that feel distinctive.',
    'Status should default to "active".',
  ];
  if (meta?.attempt && meta.attempt > 1) {
    userPromptLines.push('', `Repair note: ${meta.repairHint ?? 'Previous output had constraint violations.'}`);
  }
  const userPrompt = userPromptLines.join('\n');

  const body = {
    model,
    temperature: meta?.attempt && meta.attempt > 1 ? 0.2 : 0.3,
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
                  name: { type: 'string', minLength: 1, maxLength: 42 },
                  narrative: { type: 'string', minLength: 20, maxLength: 800 },
                  status: { type: 'string', enum: ['active', 'paused', 'archived'] },
                  suggestedForces: {
                    type: 'array',
                    items: { type: 'string' },
                    minItems: 1,
                    maxItems: 4,
                  },
                },
                required: ['name', 'narrative', 'status', 'suggestedForces'],
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

  const response = await fetchWithTimeout(
    OPENAI_COMPLETIONS_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    },
    OPENAI_CHAT_TIMEOUT_MS
  );
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
  const arcs = parsed?.arcs;
  if (!Array.isArray(arcs)) {
    throw new Error('OpenAI response schema mismatch');
  }
  return arcs as GeneratedArc[];
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
  const model = resolveChatModel();
  const baseSystemPrompt =
    'You are kwilt Coach, a life architecture coach who helps users translate Arcs into concrete Goals. ' +
    'Return thoughtful goal drafts with title, description, status, forceIntent (values 0-3 for each canonical force), and optional suggestedActivities.';

  const userProfileSummary = buildUserProfileSummary();
  const systemPrompt = userProfileSummary
    ? `${baseSystemPrompt} Here is relevant context about the user: ${userProfileSummary}`
    : baseSystemPrompt;

  const userPrompt = `
Arc name: ${params.arcName}
Arc narrative: ${params.arcNarrative ?? 'not provided'}
User focus: ${params.prompt ?? 'not provided'}
Time horizon: ${params.timeHorizon ?? 'not specified'}
Constraints: ${params.constraints ?? 'none'}
Return 2-3 distinctive goal drafts that respect the arc's heart.
For each goal:
- The title should be short and concrete.
- The description must be a single, clear sentence (no more than about 160 characters) that explains why this is a good next step for the user.
`;

  const body = {
    model,
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

async function requestOpenAiArcHeroImage(
  params: GenerateArcHeroImageParams,
  apiKey: string
): Promise<string> {
  const userProfileSummary = buildUserProfileSummary();
  const visualGuidanceParts: string[] = [];

  if (userProfileSummary) {
    visualGuidanceParts.push(`User profile hints: ${userProfileSummary}`);
  }

  visualGuidanceParts.push(
    'The image should be a tasteful, text-free hero image that could sit behind a title.',
    'Avoid faces or identifiable people; lean toward environments, objects, or abstractions that fit the arc.',
    'Keep the palette calm and readable behind dark text.'
  );

  const prompt = [
    `Arc name: ${params.arcName}`,
    `Narrative: ${params.arcNarrative ?? 'not provided'}`,
    '',
    visualGuidanceParts.join(' '),
  ].join('\n');

  const body = {
    model: 'gpt-image-1',
    prompt,
    n: 1,
    size: '1024x768',
    style: 'natural',
  };

  devLog('heroImage:request:prepared', {
    model: body.model,
    size: body.size,
    promptPreview: previewText(prompt),
  });

  const requestStartedAt = Date.now();

  const response = await fetchWithTimeout(OPENAI_IMAGES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  devLog('heroImage:response:ok', {
    status: response.status,
    ok: response.ok,
    durationMs: Date.now() - requestStartedAt,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI hero image error', errorText);
    devLog('heroImage:response:error', {
      status: response.status,
      statusText: response.statusText,
      payloadPreview: previewText(errorText),
    });
    throw new Error('Unable to generate hero image');
  }

  const data = await response.json();
  const url = data?.data?.[0]?.url;

  if (!url || typeof url !== 'string') {
    throw new Error('OpenAI hero image response malformed');
  }

  return url;
}

/**
 * Generic kwilt Coach chat endpoint backed by OpenAI's Chat Completions API.
 * This powers the free-form kwilt Coach conversation in the bottom sheet.
 */
export async function sendCoachChat(
  messages: CoachChatTurn[],
  options?: CoachChatOptions
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
    'You are kwilt Coach, a calm, practical life architecture coach. ' +
    'Help users clarify arcs (longer identity directions), goals, and today’s focus. ' +
    'Ask thoughtful follow-ups when helpful, keep answers grounded and concise, and avoid emoji unless the user uses them first.';

  const userProfileSummary = buildUserProfileSummary();
  const systemPrompt = userProfileSummary
    ? `${baseSystemPrompt} Here is relevant context about the user: ${userProfileSummary}`
    : baseSystemPrompt;

  const { openAiMessages: historyMessages } = buildCoachChatContext({
    mode: options?.mode,
    launchContextSummary: options?.launchContextSummary,
    workflowInstance: undefined,
    history: messages,
  });

  const openAiMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...historyMessages,
  ];
  const tools = buildCoachToolsForMode(options?.mode);

  const model = resolveChatModel();

  // Lower temperature for Arc generation to ensure more consistent, higher-quality output
  const arcGenerationModes: ChatMode[] = ['arcCreation', 'firstTimeOnboarding'];
  const temperature = arcGenerationModes.includes(options?.mode as ChatMode) ? 0.3 : 0.55;

  const body: Record<string, unknown> = {
    model,
    temperature,
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

  let response: Response;
  try {
    response = await fetchWithTimeout(
      OPENAI_COMPLETIONS_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      },
      OPENAI_CHAT_TIMEOUT_MS
    );
  } catch (err) {
    logNetworkErrorDetails('coachChat', err);
    throw err;
  }

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
    throw new Error('Unable to reach kwilt Coach');
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

    // In development builds, persist a snapshot of this turn so it can be
    // inspected from the DevTools screen. For non-tool calls we log the
    // direct assistant content here before returning.
    void appendDevCoachChatHistory({
      timestamp: new Date().toISOString(),
      mode: options?.mode,
      workflowDefinitionId: options?.workflowDefinitionId,
      workflowInstanceId: options?.workflowInstanceId,
      workflowStepId: options?.workflowStepId,
      launchContextSummary: options?.launchContextSummary,
      messages: [
        ...messages,
        {
          role: 'assistant',
          content: String(content),
        },
      ],
    });

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
    model,
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
  let followupResponse: Response;
  try {
    followupResponse = await fetchWithTimeout(
      OPENAI_COMPLETIONS_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(followupBody),
      },
      OPENAI_CHAT_TIMEOUT_MS
    );
  } catch (err) {
    logNetworkErrorDetails('coachChat', err);
    throw err;
  }

  devLog('coachChat:followup:response', {
    status: followupResponse.status,
    ok: followupResponse.ok,
    durationMs: Date.now() - followupStartedAt,
  });

  if (!followupResponse.ok) {
    const errorText = await followupResponse.text();
    console.error('OpenAI coach follow-up error', errorText);
    throw new Error('Unable to reach kwilt Coach (follow-up)');
  }

  const followupData = await followupResponse.json();
  const finalContent = followupData.choices?.[0]?.message?.content;
  if (!finalContent) {
    throw new Error('OpenAI coach chat follow-up response malformed');
  }
  devLog('coachChat:parsed:final', { contentPreview: previewText(finalContent) });

  // In development builds, persist a snapshot of this turn so it can be
  // inspected from the DevTools screen.
  void appendDevCoachChatHistory({
    timestamp: new Date().toISOString(),
    mode: options?.mode,
    workflowDefinitionId: options?.workflowDefinitionId,
    workflowInstanceId: options?.workflowInstanceId,
    workflowStepId: options?.workflowStepId,
    launchContextSummary: options?.launchContextSummary,
    messages: [
      ...messages,
      {
        role: 'assistant',
        content: String(finalContent),
      },
    ],
  });

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

function logNetworkErrorDetails(
  context: 'arcs' | 'goals' | 'images' | 'coachChat',
  err: unknown
) {
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

function resolveChatModel(): LlmModel {
  const state = typeof useAppStore.getState === 'function' ? useAppStore.getState() : undefined;
  const model = state?.llmModel;

  if (model === 'gpt-4o' || model === 'gpt-4o-mini' || model === 'gpt-5.1') {
    return model;
  }

  return 'gpt-4o-mini';
}


