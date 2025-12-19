import { Arc, GoalDraft, type AgeRange, type ActivityDifficulty } from '../domain/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { getFocusAreaLabel } from '../domain/focusAreas';
import { listIdealArcTemplates } from '../domain/idealArcs';
import { buildHybridArcGuidelinesBlock } from '../domain/arcHybridPrompt';
import { mockGenerateArcs, mockGenerateGoals } from './mockAi';
import { getEnvVar } from '../utils/getEnv';
import { useAppStore, type LlmModel } from '../store/useAppStore';
import type { ChatMode } from '../features/ai/workflowRegistry';
import { buildCoachChatContext } from '../features/ai/agentRuntime';
import type { ActivityStep } from '../domain/types';
import { richTextToPlainText } from '../ui/richText';

export type ActivityAiEnrichment = {
  notes?: string;
  tags?: string[];
  steps?: Array<{ title: string }>;
  estimateMinutes?: number | null;
  priority?: 1 | 2 | 3 | null;
  difficulty?: ActivityDifficulty;
};

export type EnrichActivityWithAiParams = {
  title: string;
  goalId: string | null;
  existingNotes?: string;
  existingTags?: string[];
};

type GenerateArcParams = {
  prompt: string;
  timeHorizon?: string;
  additionalContext?: string;
  /**
   * Optional model override used by dev tooling (Arc testing) to compare outputs.
   * This bypasses the persisted model selection in the app store.
   */
  modelOverride?: string;
};

export type GeneratedArc = Pick<Arc, 'name' | 'narrative' | 'status'> & {
  suggestedForces?: string[];
};

export type ArcRubricJudgeResult = {
  // 0–10 scores
  identityCoherence: number;
  groundedness: number;
  distinctiveness: number;
  feltAccuracy: number; // does it "get" this user? feels personally relevant/true-to-inputs
  readingEase: number; // can the target age band read it smoothly?
  everydayConcreteness: number; // can you picture how it shows up day-to-day?
  clarity: number;
  constraintCompliance: number;
  adoptionLikelihood: number;
  confidence: number; // 0–1
  notes: string[];
};

export type ArcComparisonRubricJudgeResult = {
  results: Array<{
    paradigmId: string;
    paradigmName: string;
    bestArcIndex: number; // 0-based
    // 0–10 scores
    identityCoherence: number;
    groundedness: number;
    distinctiveness: number;
    feltAccuracy: number;
    readingEase: number;
    everydayConcreteness: number;
    clarity: number;
    constraintCompliance: number;
    adoptionLikelihood: number;
    nonParroting: number; // 0–10 (10 = transforms inputs; avoids copying)
    overallRank: number; // 1 = best
    confidence: number; // 0–1
    notes: string[];
  }>;
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

// If the OpenAI account is out of quota, avoid spamming repeated failing calls.
let OPENAI_QUOTA_EXCEEDED = false;
let OPENAI_QUOTA_WARNING_EMITTED = false; // For the detailed quota error log
let OPENAI_QUOTA_FALLBACK_WARNING_EMITTED = false; // For the "using mocks" fallback warning

/**
 * Reset the OpenAI quota exceeded flag (dev-only).
 * Useful for testing after fixing quota issues without restarting the app.
 */
export function resetOpenAiQuotaFlag(): void {
  if (!__DEV__) return;
  OPENAI_QUOTA_EXCEEDED = false;
  OPENAI_QUOTA_WARNING_EMITTED = false;
  OPENAI_QUOTA_FALLBACK_WARNING_EMITTED = false;
  console.log('[ai] OpenAI quota flag reset. New API calls will be attempted.');
}

/**
 * Check if OpenAI quota is currently marked as exceeded (dev-only).
 */
export function getOpenAiQuotaExceededStatus(): boolean {
  return OPENAI_QUOTA_EXCEEDED;
}

const isProductionEnvironment = (): boolean => {
  const appEnvironment =
    (Constants.expoConfig?.extra as { environment?: string } | undefined)?.environment ??
    (__DEV__ ? 'development' : 'production');
  return appEnvironment === 'production';
};

type OpenAiErrorDetails = {
  message: string;
  type?: string;
  code?: string;
  param?: string | null;
  raw: string;
};

const parseOpenAiError = (errorText: string): OpenAiErrorDetails => {
  try {
    const parsed = JSON.parse(errorText);
    const error = parsed?.error;
    if (error && typeof error === 'object') {
      return {
        message: error.message ?? 'Unknown error',
        type: error.type,
        code: error.code,
        param: error.param ?? null,
        raw: errorText,
      };
    }
  } catch {
    // Not JSON, return as-is
  }
  return {
    message: errorText || 'Unknown error',
    raw: errorText,
  };
};

const isOpenAiQuotaExceeded = (status: number, errorText: string): boolean => {
  // 429 can be either rate limit OR quota exceeded - need to check the error details
  if (status === 429) {
    const error = parseOpenAiError(errorText);
    const lowerMessage = error.message.toLowerCase();
    const lowerCode = (error.code ?? '').toLowerCase();
    // Quota exceeded has specific indicators
    return (
      lowerCode === 'insufficient_quota' ||
      lowerMessage.includes('insufficient_quota') ||
      lowerMessage.includes('exceeded your current quota') ||
      lowerMessage.includes('quota')
    );
  }
  // Non-429 errors can also indicate quota issues
  const lower = (errorText ?? '').toLowerCase();
  return lower.includes('insufficient_quota') || lower.includes('exceeded your current quota');
};

const isOpenAiRateLimited = (status: number, errorText: string): boolean => {
  if (status !== 429) return false;
  const error = parseOpenAiError(errorText);
  const lowerMessage = error.message.toLowerCase();
  const lowerCode = (error.code ?? '').toLowerCase();
  // Rate limit (not quota) - temporary, can retry
  return (
    lowerCode === 'rate_limit_exceeded' ||
    lowerMessage.includes('rate limit') ||
    (status === 429 && !isOpenAiQuotaExceeded(status, errorText))
  );
};

const markOpenAiQuotaExceeded = (
  context: string,
  status: number,
  errorText: string,
  apiKey?: string
): boolean => {
  if (!isOpenAiQuotaExceeded(status, errorText)) return false;
  OPENAI_QUOTA_EXCEEDED = true;
  const isProduction = isProductionEnvironment();
  const error = parseOpenAiError(errorText);
  
  // Extract key identifier for troubleshooting
  const keyInfo = apiKey ? describeKey(apiKey) : null;
  
  // Parse quota limit details from error message (e.g., "Rate limit reached for gpt-4o-mini... Limit: 10000 / min")
  const quotaDetails: Record<string, string> = {};
  const message = error.message;
  
  // Extract model name if mentioned
  const modelMatch = message.match(/for\s+([a-z0-9.-]+)\s+/i);
  if (modelMatch) quotaDetails.model = modelMatch[1]!;
  
  // Extract organization ID if mentioned
  const orgMatch = message.match(/organization\s+([a-z0-9-]+)/i);
  if (orgMatch) quotaDetails.organizationId = orgMatch[1]!;
  
  // Extract limit type and values (e.g., "Limit: 10000.000000 / min. Current: 10020.000000 / min")
  const limitMatch = message.match(/Limit:\s*([0-9.]+)\s*\/([^.]*)/i);
  if (limitMatch) {
    quotaDetails.limitValue = limitMatch[1]!;
    quotaDetails.limitUnit = limitMatch[2]!.trim();
  }
  
  const currentMatch = message.match(/Current:\s*([0-9.]+)\s*\/([^.]*)/i);
  if (currentMatch) {
    quotaDetails.currentValue = currentMatch[1]!;
    quotaDetails.currentUnit = currentMatch[2]!.trim();
  }
  
  // Extract limit type (tokens per min, requests per min, etc.)
  if (message.includes('tokens per min') || message.includes('TPM')) {
    quotaDetails.limitType = 'tokens_per_minute';
  } else if (message.includes('requests per min') || message.includes('RPM')) {
    quotaDetails.limitType = 'requests_per_minute';
  } else if (message.includes('tokens per day')) {
    quotaDetails.limitType = 'tokens_per_day';
  } else if (message.includes('requests per day')) {
    quotaDetails.limitType = 'requests_per_day';
  }
  
  if (!OPENAI_QUOTA_WARNING_EMITTED) {
    OPENAI_QUOTA_WARNING_EMITTED = true;
    if (isProduction) {
      // In production, this is a critical error - log it prominently with full details
      console.error(
        `[CRITICAL] OpenAI quota exceeded in production (${context}). ` +
          'This will cause user-facing failures. Check billing/quota immediately.'
      );
      console.error('[CRITICAL] OpenAI quota error details:', {
        apiKey: keyInfo?.present ? `present (length: ${keyInfo.length})` : 'unknown',
        message: error.message,
        type: error.type,
        code: error.code,
        status,
        context,
        quotaDetails: Object.keys(quotaDetails).length > 0 ? quotaDetails : undefined,
        fullResponse: error.raw,
      });
      // TODO: Add error reporting service integration here (e.g., Sentry, Bugsnag)
    } else {
      // In dev, provide helpful guidance with full error details
      console.warn(
        `\n${'='.repeat(80)}\n` +
        `[QUOTA EXCEEDED] OpenAI quota exceeded (${context})\n` +
        `${'='.repeat(80)}`
      );
      console.warn('API Key:', keyInfo?.present ? `present (length: ${keyInfo.length})` : 'unknown');
      console.warn('Error Message:', error.message);
      console.warn('Error Type:', error.type);
      console.warn('Error Code:', error.code);
      console.warn('HTTP Status:', status);
      if (Object.keys(quotaDetails).length > 0) {
        console.warn('\nQuota Limit Details:');
        Object.entries(quotaDetails).forEach(([key, value]) => {
          console.warn(`  ${key}: ${value}`);
        });
      }
      console.warn('\nFull Error Response:', error.raw);
      console.warn(
        `\nTo fix this:\n` +
        `1. Go to https://platform.openai.com/settings/organization/limits\n` +
        `2. Find your API key in settings (do not paste it into logs)\n` +
        `3. Check which limit was exceeded (see details above)\n` +
        `4. Request an increase for that specific limit\n` +
        `${'='.repeat(80)}\n`
      );
    }
  }
  return true;
};

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

const describeKey = (key?: string) => {
  if (!key) return { present: false };
  // Never log any portion of the key itself (even in dev). We only track presence + length.
  return { present: true, length: key.length };
};

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

export const COACH_CONVERSATION_SUMMARY_PREFIX = 'kwilt-coach-summary:v1:';

export type CoachConversationSummaryRecordV1 = {
  version: 1;
  updatedAt: string;
  summary: string;
  /**
   * How many "eligible" non-system turns have already been summarized.
   * Eligible turns are all non-system turns except the most recent window.
   */
  summarizedEligibleCount: number;
};

export const buildCoachConversationSummaryStorageKey = (opts?: CoachChatOptions): string => {
  const mode = opts?.mode ?? 'default';
  const workflowId = opts?.workflowInstanceId ?? opts?.workflowDefinitionId;
  if (workflowId) {
    return `${COACH_CONVERSATION_SUMMARY_PREFIX}${mode}:workflow:${workflowId}`;
  }
  const seed = (opts?.launchContextSummary ?? '').trim();
  if (!seed) {
    return `${COACH_CONVERSATION_SUMMARY_PREFIX}${mode}:anonymous`;
  }
  // Fast deterministic hash (djb2) to avoid huge keys.
  let hash = 5381;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 33) ^ seed.charCodeAt(i);
  }
  const hex = (hash >>> 0).toString(16);
  return `${COACH_CONVERSATION_SUMMARY_PREFIX}${mode}:launch:${hex}`;
};

export async function loadCoachConversationSummaryRecord(
  opts?: CoachChatOptions
): Promise<CoachConversationSummaryRecordV1 | null> {
  try {
    const key = buildCoachConversationSummaryStorageKey(opts);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CoachConversationSummaryRecordV1> | null;
    if (!parsed || parsed.version !== 1) return null;
    if (typeof parsed.summary !== 'string') return null;
    return {
      version: 1,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
      summary: parsed.summary,
      summarizedEligibleCount:
        typeof parsed.summarizedEligibleCount === 'number' ? parsed.summarizedEligibleCount : 0,
    };
  } catch {
    return null;
  }
}

export async function saveCoachConversationSummaryRecord(
  record: CoachConversationSummaryRecordV1,
  opts?: CoachChatOptions
): Promise<void> {
  try {
    const key = buildCoachConversationSummaryStorageKey(opts);
    await AsyncStorage.setItem(key, JSON.stringify(record));
  } catch {
    // Ignore persistence errors; chat should still work.
  }
}

export async function clearCoachConversationMemory(opts?: CoachChatOptions): Promise<void> {
  try {
    const key = buildCoachConversationSummaryStorageKey(opts);
    await AsyncStorage.removeItem(key);
  } catch {
    // Ignore; best-effort only.
  }
}

export async function listCoachConversationMemoryKeys(): Promise<string[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return keys.filter((k) => k.startsWith(COACH_CONVERSATION_SUMMARY_PREFIX)).sort();
  } catch {
    return [];
  }
}

export async function loadCoachConversationMemoryByKey(
  key: string
): Promise<CoachConversationSummaryRecordV1 | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CoachConversationSummaryRecordV1> | null;
    if (!parsed || parsed.version !== 1) return null;
    if (typeof parsed.summary !== 'string') return null;
    return {
      version: 1,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
      summary: parsed.summary,
      summarizedEligibleCount:
        typeof parsed.summarizedEligibleCount === 'number' ? parsed.summarizedEligibleCount : 0,
    };
  } catch {
    return null;
  }
}

export async function clearCoachConversationMemoryByKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // Ignore; best-effort only.
  }
}

export async function clearAllCoachConversationMemory(): Promise<void> {
  try {
    const keys = await listCoachConversationMemoryKeys();
    if (keys.length === 0) return;
    await AsyncStorage.multiRemove(keys);
  } catch {
    // Ignore; best-effort only.
  }
}

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

type CoachToolName =
  | 'get_user_profile'
  | 'set_user_profile'
  | 'enter_focus_mode'
  | 'schedule_activity_on_calendar'
  | 'schedule_activity_chunks_on_calendar'
  | 'activity_steps_edit';

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
  const shouldExposeActivityTools = mode === 'activityGuidance';
  if (!shouldExposeProfileTools && !shouldExposeActivityTools) {
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

  const tools: Array<Record<string, unknown>> = [];

  if (shouldExposeProfileTools) {
    tools.push(
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
      }
    );
  }

  if (shouldExposeActivityTools) {
    tools.push(
      {
        type: 'function',
        function: {
          name: 'enter_focus_mode' as CoachToolName,
          description:
            'Open Focus Mode for the currently focused activity. This will open the focus sheet in the UI; the user still confirms starting the timer.',
          parameters: {
            type: 'object',
            properties: {
              activityId: { type: 'string' },
              minutes: {
                type: 'number',
                description: 'Suggested focus duration in minutes (optional).',
              },
            },
            required: ['activityId'],
            additionalProperties: false,
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'schedule_activity_on_calendar' as CoachToolName,
          description:
            'Open the calendar scheduling sheet for the focused activity, optionally prefilled with a start time and duration. The user still confirms creating the calendar event.',
          parameters: {
            type: 'object',
            properties: {
              activityId: { type: 'string' },
              startAtISO: {
                type: 'string',
                description: 'Suggested ISO timestamp for the event start (optional).',
              },
              durationMinutes: {
                type: 'number',
                description: 'Suggested event duration in minutes (optional).',
              },
            },
            required: ['activityId'],
            additionalProperties: false,
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'schedule_activity_chunks_on_calendar' as CoachToolName,
          description:
            'Create multiple calendar events for the focused activity by splitting it into smaller time chunks. Use only after the user explicitly agrees to schedule chunks on their calendar.',
          parameters: {
            type: 'object',
            properties: {
              activityId: { type: 'string' },
              chunks: {
                type: 'array',
                minItems: 2,
                maxItems: 10,
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    startAtISO: { type: 'string' },
                    durationMinutes: { type: 'number' },
                  },
                  required: ['title', 'startAtISO', 'durationMinutes'],
                  additionalProperties: false,
                },
              },
            },
            required: ['activityId', 'chunks'],
            additionalProperties: false,
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'activity_steps_edit' as CoachToolName,
          description:
            'Add/modify/remove steps on an activity. Use replace to set the full list, append to add new ones, update to edit one step, remove to delete one by index.',
          parameters: {
            type: 'object',
            properties: {
              activityId: { type: 'string' },
              operation: {
                type: 'string',
                enum: ['replace', 'append', 'update', 'remove'],
              },
              steps: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    isOptional: { type: 'boolean' },
                  },
                  required: ['title'],
                  additionalProperties: false,
                },
              },
              index: { type: 'number', description: '0-based step index (for update/remove).' },
              step: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  isOptional: { type: 'boolean' },
                  completed: {
                    type: 'boolean',
                    description:
                      'Request to mark a step complete/incomplete. This will trigger a user confirmation in the UI before applying.',
                  },
                },
                additionalProperties: false,
              },
            },
            required: ['activityId', 'operation'],
            additionalProperties: false,
          },
        },
      }
    );
  }

  return tools;
};

const runCoachTool = async (tool: CoachToolCall) => {
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

  if (name === 'enter_focus_mode') {
    const payload = (args as { activityId?: string; minutes?: number }) ?? {};
    const activityId = typeof payload.activityId === 'string' ? payload.activityId : '';
    if (!activityId) return { ok: false, error: 'Missing activityId' };

    const activity = state.activities.find((a) => a.id === activityId) ?? null;
    if (!activity) return { ok: false, error: 'Activity not found' };

    const minutes =
      typeof payload.minutes === 'number' && Number.isFinite(payload.minutes)
        ? Math.max(1, Math.round(payload.minutes))
        : undefined;
    state.enqueueAgentHostAction({
      objectType: 'activity',
      objectId: activityId,
      type: 'openFocusMode',
      minutes,
    });
    return { ok: true, queued: 'openFocusMode', activityId, minutes };
  }

  if (name === 'schedule_activity_on_calendar') {
    const payload =
      (args as { activityId?: string; startAtISO?: string; durationMinutes?: number }) ?? {};
    const activityId = typeof payload.activityId === 'string' ? payload.activityId : '';
    if (!activityId) return { ok: false, error: 'Missing activityId' };

    const activity = state.activities.find((a) => a.id === activityId) ?? null;
    if (!activity) return { ok: false, error: 'Activity not found' };

    const startAtISO = typeof payload.startAtISO === 'string' ? payload.startAtISO : undefined;
    const durationMinutes =
      typeof payload.durationMinutes === 'number' && Number.isFinite(payload.durationMinutes)
        ? Math.max(5, Math.round(payload.durationMinutes))
        : undefined;
    state.enqueueAgentHostAction({
      objectType: 'activity',
      objectId: activityId,
      type: 'openCalendar',
      startAtISO,
      durationMinutes,
    });
    return { ok: true, queued: 'openCalendar', activityId, startAtISO, durationMinutes };
  }

  if (name === 'schedule_activity_chunks_on_calendar') {
    const payload =
      (args as {
        activityId?: string;
        chunks?: Array<{ title?: string; startAtISO?: string; durationMinutes?: number }>;
      }) ?? {};
    const activityId = typeof payload.activityId === 'string' ? payload.activityId : '';
    if (!activityId) return { ok: false, error: 'Missing activityId' };

    const activity = state.activities.find((a) => a.id === activityId) ?? null;
    if (!activity) return { ok: false, error: 'Activity not found' };

    if (Platform.OS === 'web') {
      return { ok: false, error: 'Calendar scheduling is not available on web.' };
    }

    const chunks = Array.isArray(payload.chunks) ? payload.chunks : [];
    const normalized = chunks
      .map((c) => ({
        title: typeof c.title === 'string' ? c.title.trim() : '',
        startAtISO: typeof c.startAtISO === 'string' ? c.startAtISO.trim() : '',
        durationMinutes:
          typeof c.durationMinutes === 'number' && Number.isFinite(c.durationMinutes)
            ? Math.max(5, Math.round(c.durationMinutes))
            : 0,
      }))
      .filter((c) => c.title.length > 0 && c.startAtISO.length > 0 && c.durationMinutes > 0)
      .slice(0, 10);

    if (normalized.length < 2) {
      return { ok: false, error: 'Need at least 2 valid chunks with title/startAtISO/durationMinutes.' };
    }

    try {
      const permissions = await Calendar.getCalendarPermissionsAsync();
      const hasPermission = permissions.status === 'granted';
      if (!hasPermission) {
        const requested = await Calendar.requestCalendarPermissionsAsync();
        if (requested.status !== 'granted') {
          return { ok: false, error: 'Calendar permission denied.' };
        }
      }

      let calendarId: string | null = null;
      try {
        const defaultCal = await Calendar.getDefaultCalendarAsync();
        calendarId = defaultCal?.id ?? null;
      } catch {
        calendarId = null;
      }
      if (!calendarId) {
        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        calendarId = calendars[0]?.id ?? null;
      }
      if (!calendarId) {
        return { ok: false, error: 'No writable calendar found.' };
      }

      const goalTitle =
        activity.goalId ? state.goals.find((g) => g.id === activity.goalId)?.title ?? null : null;
      const notesBase = [goalTitle ? `Goal: ${goalTitle}` : null, `Activity: ${activity.title}`]
        .filter(Boolean)
        .join('\n');

      const createdEventIds: string[] = [];
      for (const chunk of normalized) {
        const startAt = new Date(chunk.startAtISO);
        if (Number.isNaN(startAt.getTime())) continue;
        const endAt = new Date(startAt.getTime() + chunk.durationMinutes * 60_000);
        const eventId = await Calendar.createEventAsync(calendarId, {
          title: chunk.title,
          startDate: startAt,
          endDate: endAt,
          notes: notesBase,
        });
        if (typeof eventId === 'string') {
          createdEventIds.push(eventId);
        }
      }

      return {
        ok: true,
        calendarId,
        createdCount: createdEventIds.length,
        eventIds: createdEventIds,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'Failed to create calendar events.',
        details: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (name === 'activity_steps_edit') {
    const payload =
      (args as {
        activityId?: string;
        operation?: 'replace' | 'append' | 'update' | 'remove';
        steps?: Array<{ title: string; isOptional?: boolean }>;
        index?: number;
        step?: { title?: string; isOptional?: boolean; completed?: boolean };
      }) ?? {};

    const activityId = typeof payload.activityId === 'string' ? payload.activityId : '';
    if (!activityId) return { ok: false, error: 'Missing activityId' };
    const activity = state.activities.find((a) => a.id === activityId) ?? null;
    if (!activity) return { ok: false, error: 'Activity not found' };

    const operation = payload.operation;
    if (!operation) return { ok: false, error: 'Missing operation' };

    const createStep = (params: { title: string; isOptional?: boolean }): ActivityStep => {
      const title = String(params.title ?? '').trim();
      const isOptional = Boolean(params.isOptional);
      return {
        id: `step-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`,
        title,
        isOptional,
        completedAt: null,
        orderIndex: null,
      };
    };

    const normalizeOrder = (steps: ActivityStep[]): ActivityStep[] =>
      steps.map((s, idx) => ({ ...s, orderIndex: idx }));

    let updatedSteps: ActivityStep[] = Array.isArray(activity.steps) ? [...activity.steps] : [];

    if (operation === 'replace') {
      const incoming = Array.isArray(payload.steps) ? payload.steps : [];
      const next = incoming
        .map((s) => ({ title: String(s.title ?? '').trim(), isOptional: Boolean(s.isOptional) }))
        .filter((s) => s.title.length > 0)
        .slice(0, 24)
        .map((s) => createStep(s));
      updatedSteps = normalizeOrder(next);
    } else if (operation === 'append') {
      const incoming = Array.isArray(payload.steps) ? payload.steps : [];
      const additions = incoming
        .map((s) => ({ title: String(s.title ?? '').trim(), isOptional: Boolean(s.isOptional) }))
        .filter((s) => s.title.length > 0)
        .slice(0, 12)
        .map((s) => createStep(s));
      updatedSteps = normalizeOrder([...updatedSteps, ...additions]);
    } else if (operation === 'remove') {
      const index =
        typeof payload.index === 'number' && Number.isFinite(payload.index)
          ? Math.floor(payload.index)
          : -1;
      if (index < 0 || index >= updatedSteps.length) {
        return { ok: false, error: 'Invalid index for remove' };
      }
      updatedSteps = normalizeOrder(updatedSteps.filter((_, idx) => idx !== index));
    } else if (operation === 'update') {
      const index =
        typeof payload.index === 'number' && Number.isFinite(payload.index)
          ? Math.floor(payload.index)
          : -1;
      if (index < 0 || index >= updatedSteps.length) {
        return { ok: false, error: 'Invalid index for update' };
      }
      const patch = payload.step ?? {};

      // If the agent is requesting a completion toggle, require explicit user confirmation.
      if (typeof patch.completed === 'boolean') {
        state.enqueueAgentHostAction({
          objectType: 'activity',
          objectId: activityId,
          type: 'confirmStepCompletion',
          stepIndex: index,
          completed: patch.completed,
        });
        return {
          ok: true,
          queued: 'confirmStepCompletion',
          requiresUserConfirmation: true,
          applied: false,
          activityId,
          stepIndex: index,
          completed: patch.completed,
        };
      }

      updatedSteps = normalizeOrder(
        updatedSteps.map((s, idx) => {
          if (idx !== index) return s;
          const nextTitle =
            typeof patch.title === 'string' && patch.title.trim().length > 0
              ? patch.title.trim()
              : s.title;
          const nextOptional = typeof patch.isOptional === 'boolean' ? patch.isOptional : s.isOptional;
          return { ...s, title: nextTitle, isOptional: nextOptional };
        })
      );
    } else {
      return { ok: false, error: `Unknown operation: ${String(operation)}` };
    }

    state.updateActivity(activityId, (prev) => ({
      ...prev,
      steps: updatedSteps,
      updatedAt: new Date().toISOString(),
    }));

    return { ok: true, activityId, operation, stepCount: updatedSteps.length };
  }

  return { ok: false, error: `Unknown tool: ${name}` };
};

export async function generateArcs(params: GenerateArcParams): Promise<GeneratedArc[]> {
  if (OPENAI_QUOTA_EXCEEDED) {
    // In production, quota issues should fail loudly, not silently degrade to mocks
    if (isProductionEnvironment()) {
      throw new Error(
        'OpenAI API quota exceeded. Please check billing and quota limits. ' +
          'This is a critical production issue that requires immediate attention.'
      );
    }
    // In dev, fall back to mocks for easier testing, but log it so user knows what's happening
    if (__DEV__) {
      // Only log once per session to avoid spam, but make it visible
      if (!OPENAI_QUOTA_FALLBACK_WARNING_EMITTED) {
        console.warn(
          `\n${'='.repeat(80)}\n` +
          `[ai] ⚠️  OpenAI QUOTA EXCEEDED - Using MOCK responses\n` +
          `${'='.repeat(80)}\n` +
          `All Arc generation is falling back to mock arcs because the quota exceeded flag is set.\n` +
          `This flag persists until you restart the app or call resetOpenAiQuotaFlag().\n\n` +
          `To fix:\n` +
          `  1. Check terminal logs above for the original quota error details\n` +
          `  2. Fix the quota issue in OpenAI dashboard\n` +
          `  3. Restart the app OR call resetOpenAiQuotaFlag() in dev console\n` +
          `${'='.repeat(80)}\n`
        );
        OPENAI_QUOTA_FALLBACK_WARNING_EMITTED = true;
      }
      devLog('generateArcs:quota-exceeded-fallback', {
        usingMocks: true,
        reason: 'OPENAI_QUOTA_EXCEEDED flag is set from previous error',
        note: 'Restart app or fix quota to get real AI-generated arcs',
      });
    }
    return mockGenerateArcs(params);
  }
  const apiKey = resolveOpenAiApiKey();
  devLog('generateArcs:init', {
    promptPreview: previewText(params.prompt),
    timeHorizon: params.timeHorizon ?? 'unspecified',
    additionalContextPreview: previewText(params.additionalContext),
    modelOverride: params.modelOverride,
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
        modelOverride: params.modelOverride,
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

type JudgeArcRubricParams = {
  responseSummary: string;
  ageBand?: string;
  paradigmName: string;
  arc: Pick<GeneratedArc, 'name' | 'narrative'>;
  judgeModelOverride?: string;
};

/**
 * AI judge for rubric scoring. Uses a small/cheap model by default (unless overridden)
 * and returns strictly structured JSON scores.
 */
export async function judgeArcRubric(
  params: JudgeArcRubricParams
): Promise<ArcRubricJudgeResult | null> {
  // Judge functions are dev-only (Arc Testing), so returning null is acceptable
  if (OPENAI_QUOTA_EXCEEDED) {
    return null;
  }
  const apiKey = resolveOpenAiApiKey();
  if (!apiKey) {
    return null;
  }

  const model: string = params.judgeModelOverride ?? 'gpt-4o-mini';
  const systemPrompt =
    'You are a strict evaluator for Kwilt Identity Arcs. ' +
    'Score each dimension from 0 to 10, where 10 is excellent. ' +
    'Be consistent across candidates. ' +
    'Prefer grounded, concrete language; penalize cliché or generic self-help phrasing. ' +
    'If ageBand indicates a teen, be stricter about readability and concreteness.';

  const userPrompt = [
    'Evaluate this Arc candidate using the rubric below. Return JSON only.',
    '',
    `Age band: ${params.ageBand ?? 'unknown'}`,
    `Paradigm: ${params.paradigmName}`,
    '',
    'User signals summary:',
    params.responseSummary,
    '',
    'Arc candidate:',
    `- name: ${params.arc.name}`,
    `- narrative: ${richTextToPlainText(String(params.arc.narrative ?? ''))}`,
    '',
    'Rubric definitions:',
    '- identityCoherence: single clear identity spine; stable over years; not a trait salad.',
    '- groundedness: ordinary-life concrete scene; minimal abstraction; no guru/cosmic/corporate tone.',
    '- distinctiveness: feels specific to this user; not interchangeable across people.',
    '- feltAccuracy: feels true to the user signals; the user would say "yes, that’s me / that’s what I mean" (not generic).',
    '- readingEase: easy to read for this age band; short sentences; minimal jargon.',
    '- everydayConcreteness: you can picture it in daily life; specific verbs/contexts; not just abstractions.',
    '- clarity: precise wording; avoids vague terms; name is legible and identity-like.',
    '- constraintCompliance: obeys format constraints (name 1–3 words; narrative starts "I want"; exactly 3 sentences; 40–120 words; single paragraph).',
    '- adoptionLikelihood: how likely a real user would tap "Yes, I’d love to become like this".',
    '',
    'Notes:',
    '- Provide 2–5 short notes explaining major deductions (if any).',
    '- confidence: 0–1 (how confident you are in the scoring given the inputs).',
  ].join('\n');

  const body = {
    model,
    temperature: 0.1,
    max_tokens: 450,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'arc_rubric_scores',
        schema: {
          type: 'object',
          properties: {
            identityCoherence: { type: 'number', minimum: 0, maximum: 10 },
            groundedness: { type: 'number', minimum: 0, maximum: 10 },
            distinctiveness: { type: 'number', minimum: 0, maximum: 10 },
            feltAccuracy: { type: 'number', minimum: 0, maximum: 10 },
            readingEase: { type: 'number', minimum: 0, maximum: 10 },
            everydayConcreteness: { type: 'number', minimum: 0, maximum: 10 },
            clarity: { type: 'number', minimum: 0, maximum: 10 },
            constraintCompliance: { type: 'number', minimum: 0, maximum: 10 },
            adoptionLikelihood: { type: 'number', minimum: 0, maximum: 10 },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            notes: {
              type: 'array',
              items: { type: 'string' },
              minItems: 0,
              maxItems: 6,
            },
          },
          required: [
            'identityCoherence',
            'groundedness',
            'distinctiveness',
            'feltAccuracy',
            'readingEase',
            'everydayConcreteness',
            'clarity',
            'constraintCompliance',
            'adoptionLikelihood',
            'confidence',
            'notes',
          ],
          additionalProperties: false,
        },
      },
    },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  };
  
  // Check quota right before making the request (in case flag was set by parallel requests)
  if (OPENAI_QUOTA_EXCEEDED) {
    return null;
  }

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

  if (!response.ok) {
    const errorText = await response.text();
    const error = parseOpenAiError(errorText);
    
    if (!markOpenAiQuotaExceeded('arcRubricJudge', response.status, errorText, apiKey)) {
      const isRateLimit = isOpenAiRateLimited(response.status, errorText);
      if (isRateLimit) {
        console.warn('OpenAI rate limit (arcRubricJudge) - this is temporary:', {
          message: error.message,
          type: error.type,
          code: error.code,
          status: response.status,
        });
      } else {
        console.warn('OpenAI error (arcRubricJudge):', {
          message: error.message,
          type: error.type,
          code: error.code,
          status: response.status,
          fullResponse: error.raw,
        });
      }
    }
    return null;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    return null;
  }
  try {
    const parsed = JSON.parse(content);
    return parsed as ArcRubricJudgeResult;
  } catch {
    return null;
  }
}

type JudgeArcComparisonRubricParams = {
  responseSummary: string;
  ageBand?: string;
  candidates: Array<{
    paradigmId: string;
    paradigmName: string;
    arcs: Array<Pick<GeneratedArc, 'name' | 'narrative'>>;
  }>;
  judgeModelOverride?: string;
};

/**
 * Comparative AI judge for rubric scoring. Scores paradigms side-by-side to
 * encourage separation (avoid score compression) and returns a rank ordering.
 *
 * This is intentionally "one call per response" so full-suite runs are feasible.
 */
export async function judgeArcComparisonRubric(
  params: JudgeArcComparisonRubricParams
): Promise<ArcComparisonRubricJudgeResult | null> {
  // Judge functions are dev-only (Arc Testing), so returning null is acceptable
  if (OPENAI_QUOTA_EXCEEDED) {
    return null;
  }
  const apiKey = resolveOpenAiApiKey();
  if (!apiKey) {
    return null;
  }

  const model: string = params.judgeModelOverride ?? 'gpt-4o-mini';
  const systemPrompt =
    'You are a strict comparative evaluator for Kwilt Identity Arcs. ' +
    'You will evaluate multiple paradigms side-by-side for the SAME user signals. ' +
    'Important: avoid score compression. Use the full 0–10 range when warranted. ' +
    'Ties are rare: if two are similar, separate them by at least 0.5 on the most relevant dimensions. ' +
    'Prefer grounded, concrete, non-generic language. Penalize cliché and corporate-speak. ' +
    'If ageBand indicates a teen, be stricter about readability and concreteness.';

  const candidateBlock = params.candidates
    .map((c) => {
      const arcLines = c.arcs
        .map((a, idx) => `  Arc ${idx}:\n    - name: ${a.name}\n    - narrative: ${a.narrative}`)
        .join('\n');
      return [`Paradigm: ${c.paradigmName} (id=${c.paradigmId})`, arcLines].join('\n');
    })
    .join('\n\n');

  const userPrompt = [
    'You will score EACH paradigm by selecting its BEST arc and rating it.',
    '',
    `Age band: ${params.ageBand ?? 'unknown'}`,
    '',
    'User signals summary:',
    params.responseSummary,
    '',
    'Candidate arcs by paradigm:',
    candidateBlock,
    '',
    'Rubric definitions (0–10 each):',
    '- identityCoherence: one clear identity spine; stable over years; not a trait salad.',
    '- groundedness: ordinary-life concrete language; minimal abstraction; no guru/cosmic/corporate tone.',
    '- distinctiveness: feels specific to this user; not interchangeable.',
    '- feltAccuracy: feels true to the user signals; user would say "that’s me / that’s what I mean" (not generic).',
    '- readingEase: easy to understand for this age band; minimal jargon; not overly complex sentences.',
    '- everydayConcreteness: you can picture it in daily life; tangible verbs; some context/scene.',
    '- clarity: precise wording; avoids vague terms; name is legible and identity-like.',
    '- constraintCompliance: name 1–3 words; narrative starts "I want"; exactly 3 sentences; 40–120 words; one paragraph.',
    '- adoptionLikelihood: how likely a real user would tap "Yes, I’d love to become like this".',
    '- nonParroting: transforms inputs into identity language; does NOT copy the user’s dream or phrases verbatim.',
    '',
    'Instructions:',
    '- For each paradigm, choose bestArcIndex (0-based) among its arcs.',
    '- Provide overallRank across paradigms (1=best). No ties.',
    '- Notes: 2–6 short notes focusing on major deductions.',
    '- confidence: 0–1.',
    '',
    'Return JSON only.',
  ].join('\n');

  const body = {
    model,
    temperature: 0.1,
    max_tokens: 900,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'arc_comparison_rubric_scores',
        schema: {
          type: 'object',
          properties: {
            results: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                properties: {
                  paradigmId: { type: 'string', minLength: 1 },
                  paradigmName: { type: 'string', minLength: 1 },
                  bestArcIndex: { type: 'integer', minimum: 0, maximum: 10 },
                  identityCoherence: { type: 'number', minimum: 0, maximum: 10 },
                  groundedness: { type: 'number', minimum: 0, maximum: 10 },
                  distinctiveness: { type: 'number', minimum: 0, maximum: 10 },
                  feltAccuracy: { type: 'number', minimum: 0, maximum: 10 },
                  readingEase: { type: 'number', minimum: 0, maximum: 10 },
                  everydayConcreteness: { type: 'number', minimum: 0, maximum: 10 },
                  clarity: { type: 'number', minimum: 0, maximum: 10 },
                  constraintCompliance: { type: 'number', minimum: 0, maximum: 10 },
                  adoptionLikelihood: { type: 'number', minimum: 0, maximum: 10 },
                  nonParroting: { type: 'number', minimum: 0, maximum: 10 },
                  overallRank: { type: 'integer', minimum: 1, maximum: 50 },
                  confidence: { type: 'number', minimum: 0, maximum: 1 },
                  notes: {
                    type: 'array',
                    items: { type: 'string' },
                    minItems: 0,
                    maxItems: 8,
                  },
                },
                required: [
                  'paradigmId',
                  'paradigmName',
                  'bestArcIndex',
                  'identityCoherence',
                  'groundedness',
                  'distinctiveness',
                  'feltAccuracy',
                  'readingEase',
                  'everydayConcreteness',
                  'clarity',
                  'constraintCompliance',
                  'adoptionLikelihood',
                  'nonParroting',
                  'overallRank',
                  'confidence',
                  'notes',
                ],
                additionalProperties: false,
              },
            },
          },
          required: ['results'],
          additionalProperties: false,
        },
      },
    },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  };
  
  // Check quota right before making the request (in case flag was set by parallel requests)
  if (OPENAI_QUOTA_EXCEEDED) {
    return null;
  }

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

  if (!response.ok) {
    const errorText = await response.text();
    const error = parseOpenAiError(errorText);
    
    if (!markOpenAiQuotaExceeded('arcComparisonJudge', response.status, errorText, apiKey)) {
      const isRateLimit = isOpenAiRateLimited(response.status, errorText);
      if (isRateLimit) {
        console.warn('OpenAI rate limit (arcComparisonJudge) - this is temporary:', {
          message: error.message,
          type: error.type,
          code: error.code,
          status: response.status,
        });
      } else {
        console.warn('OpenAI error (arcComparisonJudge):', {
          message: error.message,
          type: error.type,
          code: error.code,
          status: response.status,
          fullResponse: error.raw,
        });
      }
    }
    return null;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    return null;
  }
  try {
    const parsed = JSON.parse(content);
    return parsed as ArcComparisonRubricJudgeResult;
  } catch {
    return null;
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
  const narrative = input.arcNarrative ? richTextToPlainText(input.arcNarrative).trim() : '';
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
    const error = parseOpenAiError(errorText);
    devLog('bannerVibe:response:error', {
      message: error.message,
      type: error.type,
      code: error.code,
      status: response.status,
      fullResponse: error.raw,
    });
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
  meta?: { attempt?: number; repairHint?: string; modelOverride?: string }
): Promise<GeneratedArc[]> {
  // Allow dev tooling to override the model for head-to-head comparisons.
  const model = meta?.modelOverride ?? resolveChatModel();
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
    // Hybrid paradigm: optimize specifically for felt accuracy + readability + everyday concreteness.
    // We keep this in a shared helper so FTUE + Arc Creation stay aligned.
    buildHybridArcGuidelinesBlock(),
    '',
    'Each Arc must include: name, narrative, status (default "active"), and suggestedForces (1–4 short strings).',
    'suggestedForces must be short, concrete phrases (not abstract virtues-only lists).',
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
    // Hybrid reminder: to get "felt accuracy" without extra questions in production,
    // we ask the model to infer an "admired qualities" cluster from the signals
    // and use it to sharpen the Arc voice—without name-dropping role models.
    'Before writing, silently infer 2–3 admired qualities this person seems drawn to.',
    'Use them to make the arcs feel specific and true-to-inputs (but do not list those qualities explicitly unless the user did).',
    '',
    'Return 2–3 Arc suggestions that feel genuinely different (not synonyms).',
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
  
  // Check quota right before making the request (in case flag was set by parallel requests)
  if (OPENAI_QUOTA_EXCEEDED) {
    throw new Error('OpenAI quota exceeded');
  }
  
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
    const error = parseOpenAiError(errorText);
    
    if (markOpenAiQuotaExceeded('arcs', response.status, errorText, apiKey)) {
      throw new Error(`OpenAI quota exceeded: ${error.message}`);
    }
    
    // Log full error details for debugging
    const isRateLimit = isOpenAiRateLimited(response.status, errorText);
    if (isRateLimit) {
      console.warn('OpenAI rate limit (arcs) - this is temporary, consider retrying:', {
        message: error.message,
        type: error.type,
        code: error.code,
        status: response.status,
      });
    } else {
      console.warn('OpenAI error (arcs):', {
        message: error.message,
        type: error.type,
        code: error.code,
        status: response.status,
        fullResponse: error.raw,
      });
    }
    
    devLog('arcs:response:error', {
      status: response.status,
      statusText: response.statusText,
      errorMessage: error.message,
      errorType: error.type,
      errorCode: error.code,
      fullResponse: error.raw,
    });
    throw new Error(`Unable to generate arcs: ${error.message}`);
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
  if (OPENAI_QUOTA_EXCEEDED) {
    // In production, quota issues should fail loudly, not silently degrade to mocks
    if (isProductionEnvironment()) {
      throw new Error(
        'OpenAI API quota exceeded. Please check billing and quota limits. ' +
          'This is a critical production issue that requires immediate attention.'
      );
    }
    // In dev, fall back to mocks for easier testing, but log it so user knows what's happening
    if (__DEV__) {
      console.warn(
        '[ai] generateGoals: Using MOCK goals because OpenAI quota exceeded flag is set.\n' +
        '  → Restart the app or fix quota to get real AI-generated goals\n' +
        '  → Check terminal logs for quota error details from when it was first detected'
      );
      devLog('generateGoals:quota-exceeded-fallback', {
        usingMocks: true,
        reason: 'OPENAI_QUOTA_EXCEEDED flag is set from previous error',
        note: 'Restart app or fix quota to get real AI-generated goals',
      });
    }
    return mockGenerateGoals(params);
  }
  
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
Arc narrative: ${params.arcNarrative ? richTextToPlainText(params.arcNarrative) : 'not provided'}
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
  
  // Check quota right before making the request (in case flag was set by parallel requests)
  if (OPENAI_QUOTA_EXCEEDED) {
    throw new Error('OpenAI quota exceeded');
  }
  
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
    const error = parseOpenAiError(errorText);
    
    if (markOpenAiQuotaExceeded('goals', response.status, errorText, apiKey)) {
      throw new Error(`OpenAI quota exceeded: ${error.message}`);
    }
    
    const isRateLimit = isOpenAiRateLimited(response.status, errorText);
    if (isRateLimit) {
      console.warn('OpenAI rate limit (goals) - this is temporary, consider retrying:', {
        message: error.message,
        type: error.type,
        code: error.code,
        status: response.status,
      });
    } else {
      console.warn('OpenAI error (goals):', {
        message: error.message,
        type: error.type,
        code: error.code,
        status: response.status,
        fullResponse: error.raw,
      });
    }
    
    devLog('goals:response:error', {
      status: response.status,
      statusText: response.statusText,
      errorMessage: error.message,
      errorType: error.type,
      errorCode: error.code,
      fullResponse: error.raw,
    });
    throw new Error(`Unable to generate goals: ${error.message}`);
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
    `Narrative: ${params.arcNarrative ? richTextToPlainText(params.arcNarrative) : 'not provided'}`,
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
  
  // Check quota right before making the request (in case flag was set by parallel requests)
  if (OPENAI_QUOTA_EXCEEDED) {
    throw new Error('OpenAI quota exceeded');
  }

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
    const error = parseOpenAiError(errorText);
    
    console.error('OpenAI hero image error:', {
      message: error.message,
      type: error.type,
      code: error.code,
      status: response.status,
      fullResponse: error.raw,
    });
    
    devLog('heroImage:response:error', {
      status: response.status,
      statusText: response.statusText,
      errorMessage: error.message,
      errorType: error.type,
      errorCode: error.code,
      fullResponse: error.raw,
    });
    throw new Error(`Unable to generate hero image: ${error.message}`);
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
  if (OPENAI_QUOTA_EXCEEDED) {
    // In production, quota issues should fail loudly
    if (isProductionEnvironment()) {
      throw new Error(
        'OpenAI API quota exceeded. Please check billing and quota limits. ' +
          'This is a critical production issue that requires immediate attention.'
      );
    }
    // In dev, provide a helpful error message
    throw new Error(
      'OpenAI quota exceeded. Switch Arc Testing scoring to Heuristic, or add billing / a key with quota.'
    );
  }
  
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

  const summarizeConversationChunk = async (params: {
    existingSummary?: string;
    newTurns: CoachChatTurn[];
  }): Promise<string> => {
    const { existingSummary, newTurns } = params;
    const transcript = newTurns
      .map((t) => {
        const roleLabel =
          t.role === 'user' ? 'User' : t.role === 'assistant' ? 'Assistant' : 'System';
        return `${roleLabel}: ${t.content}`;
      })
      .join('\n');

    const summarySystemPrompt =
      'You maintain a compact, durable "memory summary" for an ongoing coaching conversation.\n' +
      '- Focus on stable user facts, preferences, constraints, goals, decisions, and commitments.\n' +
      '- Avoid speculation; never infer health, political affiliation, religion, or other sensitive traits.\n' +
      '- Do not quote the transcript verbatim; rewrite in your own words.\n' +
      '- Output ONLY the updated memory summary as 8–16 short bullet points.\n' +
      '- Keep it under 1200 characters.';

    const summaryUserContent = [
      existingSummary?.trim()
        ? `Existing memory summary:\n${existingSummary.trim()}`
        : 'Existing memory summary: (none)',
      'New conversation turns to incorporate:',
      transcript,
    ].join('\n\n');

    const summaryBody: Record<string, unknown> = {
      model: resolveChatModel(),
      temperature: 0.2,
      messages: [
        { role: 'system' as const, content: summarySystemPrompt },
        { role: 'user' as const, content: summaryUserContent },
      ],
    };

    const summaryResponse = await fetchWithTimeout(
      OPENAI_COMPLETIONS_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(summaryBody),
      },
      OPENAI_TIMEOUT_MS
    );

    if (!summaryResponse.ok) {
      const errorText = await summaryResponse.text();
      markOpenAiQuotaExceeded('coachChat:summary', summaryResponse.status, errorText, apiKey);
      throw new Error('Unable to summarize conversation');
    }

    const summaryData = await summaryResponse.json();
    const summaryContent: string | undefined = summaryData?.choices?.[0]?.message?.content;
    const cleaned = (summaryContent ?? '').trim();
    if (!cleaned) {
      throw new Error('Empty summary');
    }
    return cleaned;
  };

  const summaryRecord = await loadCoachConversationSummaryRecord(options);

  const { openAiMessages: historyMessages } = buildCoachChatContext({
    mode: options?.mode,
    launchContextSummary: options?.launchContextSummary,
    conversationSummary: summaryRecord?.summary,
    workflowInstance: undefined,
    history: messages,
    recentTurnsMax: 16,
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
    const error = parseOpenAiError(errorText);
    
    if (markOpenAiQuotaExceeded('coachChat', response.status, errorText, apiKey)) {
      throw new Error(`OpenAI quota exceeded: ${error.message}`);
    }
    
    const isRateLimit = isOpenAiRateLimited(response.status, errorText);
    if (isRateLimit) {
      console.warn('OpenAI rate limit (coachChat) - this is temporary, consider retrying:', {
        message: error.message,
        type: error.type,
        code: error.code,
        status: response.status,
      });
    } else {
      console.warn('OpenAI error (coachChat):', {
        message: error.message,
        type: error.type,
        code: error.code,
        status: response.status,
        fullResponse: error.raw,
      });
    }
    
    devLog('coachChat:response:error', {
      status: response.status,
      statusText: response.statusText,
      errorMessage: error.message,
      errorType: error.type,
      errorCode: error.code,
      fullResponse: error.raw,
    });
    throw new Error(`Unable to reach kwilt Coach: ${error.message}`);
  }

  const data = await response.json();

  const firstChoice = data.choices?.[0]?.message as OpenAiToolMessage | undefined;
  if (!firstChoice) {
    throw new Error('OpenAI coach chat response malformed');
  }

  const scheduleConversationSummaryMaintenance = () => {
    void (async () => {
      try {
        const recentTurnsMax = 16;
        const nonSystemTurns = messages.filter((m) => m.role !== 'system');
        const eligibleTurns = nonSystemTurns.slice(
          0,
          Math.max(0, nonSystemTurns.length - recentTurnsMax)
        );

        // Only update if there's meaningfully new eligible content.
        const prevEligibleCount = summaryRecord?.summarizedEligibleCount ?? 0;
        const newEligibleTurns = eligibleTurns.slice(Math.max(0, prevEligibleCount));
        if (newEligibleTurns.length < 6) return;

        const updatedSummary = await summarizeConversationChunk({
          existingSummary: summaryRecord?.summary,
          newTurns: newEligibleTurns,
        });

        await saveCoachConversationSummaryRecord(
          {
            version: 1,
            updatedAt: new Date().toISOString(),
            summary: updatedSummary,
            summarizedEligibleCount: eligibleTurns.length,
          },
          options
        );
      } catch {
        // Ignore summary failures; they should never break chat.
      }
    })();
  };

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

    scheduleConversationSummaryMaintenance();
    return content as string;
  }

  // Execute requested tools locally, then send a follow-up request so the model
  // can incorporate tool results into a final assistant message.
  const toolCalls = firstChoice.tool_calls;
  devLog('coachChat:tool-calls', {
    count: toolCalls.length,
    names: toolCalls.map((t) => t.function.name),
  });

  const toolMessages = await Promise.all(
    toolCalls.map(async (toolCall) => {
      const result = await runCoachTool(toolCall);
      return {
        role: 'tool' as const,
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
        content: JSON.stringify(result),
      };
    })
  );

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
    const error = parseOpenAiError(errorText);
    
    if (markOpenAiQuotaExceeded('coachChat followup', followupResponse.status, errorText, apiKey)) {
      throw new Error(`OpenAI quota exceeded: ${error.message}`);
    }
    
    const isRateLimit = isOpenAiRateLimited(followupResponse.status, errorText);
    if (isRateLimit) {
      console.warn('OpenAI rate limit (coachChat followup) - this is temporary:', {
        message: error.message,
        type: error.type,
        code: error.code,
        status: followupResponse.status,
      });
    } else {
      console.warn('OpenAI error (coachChat followup):', {
        message: error.message,
        type: error.type,
        code: error.code,
        status: followupResponse.status,
        fullResponse: error.raw,
      });
    }
    throw new Error(`Unable to reach kwilt Coach (follow-up): ${error.message}`);
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

  scheduleConversationSummaryMaintenance();
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

let OPENAI_KEY_LOGGED = false;

function resolveOpenAiApiKey(): string | undefined {
  const key = getEnvVar<string>('openAiApiKey');
  // Log presence once at startup (for verification) WITHOUT revealing any portion of the key.
  if (__DEV__ && key && !OPENAI_KEY_LOGGED) {
    OPENAI_KEY_LOGGED = true;
    const keyInfo = describeKey(key);
    console.log(`[ai] OpenAI API key detected (length: ${keyInfo.length})`);
  }
  return key;
}

function resolveChatModel(): LlmModel {
  const state = typeof useAppStore.getState === 'function' ? useAppStore.getState() : undefined;
  const model = state?.llmModel;

  if (model === 'gpt-4o' || model === 'gpt-4o-mini' || model === 'gpt-5.1') {
    return model;
  }

  return 'gpt-4o-mini';
}

/**
 * Lightweight activity enrichment used by quick-add and manual creation flows.
 *
 * This is intentionally best-effort:
 * - returns null if OpenAI is unavailable (no key / quota exceeded / network error)
 * - callers only apply fields that the user hasn't already set
 */
export async function enrichActivityWithAI(
  params: EnrichActivityWithAiParams
): Promise<ActivityAiEnrichment | null> {
  try {
    if (OPENAI_QUOTA_EXCEEDED) return null;
    const apiKey = resolveOpenAiApiKey();
    if (!apiKey) return null;

    const title = params.title?.trim() ?? '';
    if (!title) return null;

    const state = typeof useAppStore.getState === 'function' ? useAppStore.getState() : undefined;
    const goalTitle =
      params.goalId && state?.goals
        ? state.goals.find((g) => g.id === params.goalId)?.title ?? null
        : null;
    const goalDescription =
      params.goalId && state?.goals
        ? state.goals.find((g) => g.id === params.goalId)?.description ?? null
        : null;
    const goalDescriptionPlain = goalDescription ? richTextToPlainText(goalDescription) : null;
    const existingNotesPlain = params.existingNotes ? richTextToPlainText(params.existingNotes).trim() : '';

    const systemPrompt =
      'You enrich a single task/activity with helpful supporting details.\n' +
      'Return JSON only, matching the schema.\n' +
      '- notes: 1–3 short sentences, practical and specific.\n' +
      '- tags: 0–5 simple lowercase-ish tags (no #), like "errands", "outdoors".\n' +
      '- steps: 0–6 short action steps.\n' +
      '- estimateMinutes: integer minutes (5–180) if reasonable.\n' +
      '- priority: 1 (highest) to 3 if obvious, otherwise omit.\n' +
      '- difficulty: one of very_easy|easy|medium|hard|very_hard if obvious.\n' +
      'Do not include any PII and do not invent constraints the user did not imply.';

    const userPrompt = [
      `Activity title: ${title}`,
      goalTitle ? `Goal: ${goalTitle}` : 'Goal: (none)',
      goalDescriptionPlain ? `Goal context: ${goalDescriptionPlain}` : 'Goal context: (none)',
      existingNotesPlain
        ? `Existing notes (do not repeat, only augment if useful): ${existingNotesPlain}`
        : 'Existing notes: (none)',
      Array.isArray(params.existingTags) && params.existingTags.length > 0
        ? `Existing tags (avoid duplicates): ${params.existingTags.join(', ')}`
        : 'Existing tags: (none)',
    ].join('\n');

    const body = {
      model: resolveChatModel(),
      temperature: 0.4,
      max_tokens: 350,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'activity_enrichment',
          schema: {
            type: 'object',
            properties: {
              notes: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' }, maxItems: 5 },
              steps: {
                type: 'array',
                maxItems: 6,
                items: {
                  type: 'object',
                  properties: { title: { type: 'string' } },
                  required: ['title'],
                  additionalProperties: false,
                },
              },
              estimateMinutes: { type: 'integer', minimum: 5, maximum: 180 },
              priority: { type: 'integer', enum: [1, 2, 3] },
              difficulty: {
                type: 'string',
                enum: ['very_easy', 'easy', 'medium', 'hard', 'very_hard'],
              },
            },
            additionalProperties: false,
          },
        },
      },
      messages: [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userPrompt },
      ],
    };

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

    if (!response.ok) {
      const errorText = await response.text();
      markOpenAiQuotaExceeded('activityEnrichment', response.status, errorText, apiKey);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as Partial<ActivityAiEnrichment> | null;
    if (!parsed || typeof parsed !== 'object') return null;

    const normalized: ActivityAiEnrichment = {};
    if (typeof parsed.notes === 'string' && parsed.notes.trim().length > 0) {
      normalized.notes = parsed.notes.trim();
    }
    if (Array.isArray(parsed.tags)) {
      const tags = parsed.tags
        .map((t) => String(t ?? '').trim())
        .filter(Boolean)
        .slice(0, 5);
      if (tags.length > 0) normalized.tags = tags;
    }
    if (Array.isArray(parsed.steps)) {
      const steps = parsed.steps
        .map((s) => ({ title: String((s as any)?.title ?? '').trim() }))
        .filter((s) => s.title.length > 0)
        .slice(0, 6);
      if (steps.length > 0) normalized.steps = steps;
    }
    if (typeof (parsed as any).estimateMinutes === 'number' && Number.isFinite((parsed as any).estimateMinutes)) {
      normalized.estimateMinutes = Math.max(5, Math.min(180, Math.round((parsed as any).estimateMinutes)));
    }
    if ((parsed as any).priority === 1 || (parsed as any).priority === 2 || (parsed as any).priority === 3) {
      normalized.priority = (parsed as any).priority;
    }
    if (
      (parsed as any).difficulty === 'very_easy' ||
      (parsed as any).difficulty === 'easy' ||
      (parsed as any).difficulty === 'medium' ||
      (parsed as any).difficulty === 'hard' ||
      (parsed as any).difficulty === 'very_hard'
    ) {
      normalized.difficulty = (parsed as any).difficulty;
    }

    return Object.keys(normalized).length > 0 ? normalized : null;
  } catch {
    return null;
  }
}

export type WritingRefinePreset =
  | 'fix'
  | 'simplify'
  | 'shorten'
  | 'expand'
  | 'bullets'
  | 'custom';

type RefineWritingParams = {
  text: string;
  preset: WritingRefinePreset;
  /**
   * Required for `custom`, optional for others (appended to preset instruction).
   */
  instruction?: string;
  /**
   * Optional, best-effort guardrail for very long inputs.
   */
  maxChars?: number;
};

/**
 * Lightweight writing refinement for inline field editors (LongTextField, etc).
 * Best-effort:
 * - returns null if OpenAI is unavailable (no key / quota exceeded / network error)
 * - does not touch Coach conversation memory
 */
export async function refineWritingWithAI(params: RefineWritingParams): Promise<string | null> {
  try {
    if (OPENAI_QUOTA_EXCEEDED) return null;
    const apiKey = resolveOpenAiApiKey();
    if (!apiKey) return null;

    const raw = params.text ?? '';
    const trimmed = raw.trim();
    if (!trimmed) return null;

    const maxChars = typeof params.maxChars === 'number' && params.maxChars > 0 ? params.maxChars : 6000;
    const safeText = trimmed.length > maxChars ? trimmed.slice(0, maxChars) : trimmed;

    const presetInstruction =
      params.preset === 'fix'
        ? 'Fix grammar and improve clarity while preserving the original meaning and voice.'
        : params.preset === 'simplify'
          ? 'Simplify the writing (clearer, fewer complex clauses) while preserving meaning and voice.'
          : params.preset === 'shorten'
            ? 'Make this shorter and tighter while preserving meaning and voice.'
            : params.preset === 'expand'
              ? 'Expand slightly with richer detail, but do not add new factual claims. Preserve meaning and voice.'
              : params.preset === 'bullets'
                ? 'Rewrite as concise bullet points (use "- " prefix). Preserve meaning and voice.'
                : 'Follow the user instruction to rewrite the text while preserving meaning and voice.';

    const userInstruction = (params.instruction ?? '').trim();
    const effectiveInstruction =
      params.preset === 'custom'
        ? userInstruction
        : userInstruction
          ? `${presetInstruction}\nAdditional instruction: ${userInstruction}`
          : presetInstruction;

    if (params.preset === 'custom' && !effectiveInstruction) {
      return null;
    }

    const systemPrompt =
      'You are a careful writing assistant.\n' +
      '- Preserve the user’s meaning and first-person voice.\n' +
      '- Do not invent facts.\n' +
      '- Keep paragraph breaks unless instructed otherwise.\n' +
      '- Output ONLY the rewritten text (no preface, no quotes).';

    const userPrompt = [
      `Instruction: ${effectiveInstruction}`,
      '',
      'Text to rewrite:',
      safeText,
    ].join('\n');

    const body = {
      model: resolveChatModel(),
      temperature: 0.35,
      max_tokens: 900,
      messages: [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userPrompt },
      ],
    };

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

    if (!response.ok) {
      const errorText = await response.text();
      markOpenAiQuotaExceeded('coachChat', response.status, errorText, apiKey);
      return null;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    const next = String(content ?? '').trim();
    if (!next) return null;
    return next;
  } catch {
    return null;
  }
}


