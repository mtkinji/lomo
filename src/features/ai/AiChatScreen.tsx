import {
  forwardRef,
  Fragment,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  InteractionManager,
  Modal,
  NativeEventEmitter,
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  findNodeHandle,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cardElevation, spacing, typography, colors, fonts } from '../../theme';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Icon } from '../../ui/Icon';
import { BrandLockup } from '../../ui/BrandLockup';
import { EditorHeader, EditorSurface } from '../../ui/EditorSurface';
import { ObjectPicker, type ObjectPickerOption } from '../../ui/ObjectPicker';
import {
  CoachChatTurn,
  GeneratedArc,
  sendCoachChat,
  type CoachChatOptions,
} from '../../services/ai';
import { WORKFLOW_REGISTRY, type ChatMode } from './workflowRegistry';
import { useAppStore } from '../../store/useAppStore';
import { useWorkflowRuntime } from './WorkflowRuntimeContext';
import type { ReactNode, Ref } from 'react';
import type { AgentTimelineItem } from './agentRuntime';
import type {
  AgeRange,
  ArcProposalFeedback,
  ArcProposalFeedbackReason,
} from '../../domain/types';
import type { Activity, ActivityStep, ActivityType, Goal, GoalForceIntent } from '../../domain/types';
import { defaultForceLevels } from '../../store/useAppStore';
import { canCreateGoalInArc } from '../../domain/limits';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import { openPaywallInterstitial } from '../../services/paywall';
import { ButtonLabel, HStack, Text, VStack } from '../../ui/primitives';
import { Card } from '../../ui/Card';
import { QuestionCard } from '../../ui/QuestionCard';

type ChatMessageRole = 'assistant' | 'user' | 'system';

type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content: string;
};

type ChatDraft = {
  messages: ChatMessage[];
  input: string;
  updatedAt: string;
};

type DictationState = 'idle' | 'requesting' | 'starting' | 'recording' | 'stopping' | 'unavailable';

type SpeechAuthorizationResult = {
  speechAuthorization: 'authorized' | 'denied' | 'restricted' | 'notDetermined';
  microphonePermission: 'granted' | 'denied';
  onDeviceSupported: boolean;
};

type NativeSpeechTranscriptionModule = {
  requestAuthorization: () => Promise<SpeechAuthorizationResult>;
  start: (options?: { locale?: string }) => Promise<void>;
  stop: () => Promise<void>;
  cancel: () => Promise<void>;
};

type SpeechResultEvent = {
  text?: string;
  isFinal?: boolean;
};

type SpeechErrorEvent = {
  code?: string;
  message?: string;
};

type SpeechStateEvent = {
  state?: DictationState;
};

type SpeechAvailabilityEvent = {
  isAvailable?: boolean;
};

const iosSpeechModule: NativeSpeechTranscriptionModule | undefined =
  Platform.OS === 'ios'
    ? (NativeModules.SpeechTranscriptionModule as NativeSpeechTranscriptionModule | undefined)
    : undefined;

const iosSpeechEventEmitter = iosSpeechModule
  ? new NativeEventEmitter(NativeModules.SpeechTranscriptionModule)
  : null;

const mergeDictationText = (base: string, transcript: string) => {
  if (!base) {
    return transcript;
  }
  if (!transcript) {
    return base;
  }
  const needsSpace = !/\s$/.test(base);
  return `${needsSpace ? `${base} ` : base}${transcript}`;
};

const getPreferredLocale = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
  } catch {
    return 'en-US';
  }
};

const ARC_CREATION_DRAFT_STORAGE_KEY = 'kwilt-coach-draft:arcCreation:v1';

const ARC_FEEDBACK_REASONS: { value: ArcProposalFeedbackReason; label: string }[] = [
  { value: 'too_generic', label: 'Too generic or vague' },
  { value: 'project_not_identity', label: 'Feels like a project, not an identity' },
  { value: 'wrong_domain', label: 'Wrong domain of life' },
  { value: 'tone_off', label: 'Tone feels off for where I am right now' },
  { value: 'does_not_feel_like_me', label: 'Does not feel like me' },
];

async function loadArcCreationDraft(): Promise<ChatDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(ARC_CREATION_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChatDraft;
    if (!parsed || !Array.isArray(parsed.messages)) {
      return null;
    }
    return parsed;
  } catch (err) {
    console.warn('Failed to load kwilt Coach arc draft', err);
    return null;
  }
}

async function saveArcCreationDraft(draft: ChatDraft | null): Promise<void> {
  try {
    if (!draft || draft.messages.length === 0) {
      await AsyncStorage.removeItem(ARC_CREATION_DRAFT_STORAGE_KEY);
      return;
    }
    await AsyncStorage.setItem(ARC_CREATION_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch (err) {
    console.warn('Failed to save kwilt Coach arc draft', err);
  }
}

type ParsedAssistantReply = {
  /**
   * Content that should be rendered in the visible transcript.
   */
  displayContent: string;
  /**
   * Optional Arc proposal parsed from a hidden JSON handoff block.
   */
  arcProposal: GeneratedArc | null;
};

const ARC_PROPOSAL_MARKER = 'ARC_PROPOSAL_JSON:';
const ACTIVITY_SUGGESTIONS_MARKER = 'ACTIVITY_SUGGESTIONS_JSON:';
const ACTIVITY_PROPOSAL_MARKER = 'ACTIVITY_PROPOSAL_JSON:';
const GOAL_PROPOSAL_MARKER = 'GOAL_PROPOSAL_JSON:';
const AGENT_OFFERS_MARKER = 'AGENT_OFFERS_JSON:';

type AgentOffer = {
  id: string;
  title: string;
  userMessage: string;
};

type ParsedAgentOffers = {
  displayContent: string;
  offers: AgentOffer[] | null;
};

type ProposedGoalDraft = {
  title: string;
  description?: string;
  status?: Goal['status'];
  suggestedArcName?: string | null;
  forceIntent?: GoalForceIntent;
  timeHorizon?: string;
};

type ParsedGoalProposal = {
  displayContent: string;
  goalProposal: ProposedGoalDraft | null;
};

type GoalProposalTimelineItem = {
  id: string;
  anchorMessageId: string;
  proposal: ProposedGoalDraft;
  createdAt: string;
  isActive: boolean;
};

export type ActivitySuggestion = {
  id: string;
  title: string;
  /**
   * Optional hint for what *kind* of activity artifact this should be (task vs list vs recipe).
   * If omitted, the host will default to `task`.
   */
  type?: ActivityType;
  why?: string;
  timeEstimateMinutes?: number;
  energyLevel?: 'light' | 'focused';
  kind?: 'setup' | 'progress' | 'maintenance' | 'stretch';
  steps?: {
    title: string;
    isOptional?: boolean;
  }[];
};

type ParsedActivitySuggestions = {
  displayContent: string;
  suggestions: ActivitySuggestion[] | null;
};

type ParsedActivityProposal = {
  displayContent: string;
  suggestion: ActivitySuggestion | null;
};

function normalizeActivityType(raw: unknown): ActivityType | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;
  if (
    value === 'task' ||
    value === 'checklist' ||
    value === 'shopping_list' ||
    value === 'instructions' ||
    value === 'plan'
  ) {
    return value;
  }
  if (value.startsWith('custom:')) {
    const label = value.slice('custom:'.length).trim();
    if (label.length === 0) return null;
    return value as ActivityType;
  }
  return null;
}

function normalizeActivitySuggestion(raw: unknown): ActivitySuggestion | null {
  if (!raw || typeof raw !== 'object') return null;
  const maybe = raw as Partial<ActivitySuggestion> & Record<string, unknown>;

  if (typeof maybe.id !== 'string' || maybe.id.trim().length === 0) return null;
  if (typeof maybe.title !== 'string' || maybe.title.trim().length === 0) return null;

  const normalized: ActivitySuggestion = {
    id: maybe.id.trim(),
    title: maybe.title.trim(),
  };

  const normalizedType = normalizeActivityType((maybe as any).type);
  if (normalizedType) {
    normalized.type = normalizedType;
  }

  if (typeof maybe.why === 'string' && maybe.why.trim().length > 0) {
    normalized.why = maybe.why.trim();
  }

  if (typeof maybe.timeEstimateMinutes === 'number' && Number.isFinite(maybe.timeEstimateMinutes)) {
    normalized.timeEstimateMinutes = maybe.timeEstimateMinutes;
  }

  if (maybe.energyLevel === 'light' || maybe.energyLevel === 'focused') {
    normalized.energyLevel = maybe.energyLevel;
  }

  if (
    maybe.kind === 'setup' ||
    maybe.kind === 'progress' ||
    maybe.kind === 'maintenance' ||
    maybe.kind === 'stretch'
  ) {
    normalized.kind = maybe.kind;
  }

  if (Array.isArray(maybe.steps)) {
    const steps = maybe.steps
      .filter((step) => step && typeof step === 'object')
      .map((step) => step as { title?: unknown; isOptional?: unknown })
      .map((step) => {
        if (typeof step.title !== 'string') return null;
        const title = step.title.trim();
        if (!title) return null;
        const isOptional = typeof step.isOptional === 'boolean' ? step.isOptional : undefined;
        return { title, ...(typeof isOptional === 'boolean' ? { isOptional } : {}) };
      })
      .filter((step): step is { title: string; isOptional?: boolean } => Boolean(step));

    if (steps.length > 0) {
      normalized.steps = steps;
    }
  }

  return normalized;
}

function extractJsonCandidateFromHandoffBlock(raw: string): string | null {
  let text = raw.trim();
  if (!text) return null;

  // Strip a single outer code-fence wrapper if present.
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-zA-Z0-9]*\s*/, '').trim();
    text = text.replace(/```$/, '').trim();
  }

  // Prefer the first "paragraph" only to avoid trailing assistant commentary.
  const [firstBlock] = text.split(/\n\s*\n/);
  text = (firstBlock ?? '').trim();
  if (!text) return null;

  // If the model emitted prose before the JSON, try to skip forward to the first JSON token.
  const firstJsonIdx = text.search(/[\{\[]/);
  if (firstJsonIdx === -1) return null;
  text = text.slice(firstJsonIdx).trim();

  // If there is trailing prose after the JSON, trim to the last closing brace/bracket.
  const lastCloseIdx = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
  if (lastCloseIdx !== -1 && lastCloseIdx < text.length - 1) {
    text = text.slice(0, lastCloseIdx + 1).trim();
  }

  const looksLikeJsonObject = text.startsWith('{') && text.endsWith('}');
  const looksLikeJsonArray = text.startsWith('[') && text.endsWith(']');
  if (!looksLikeJsonObject && !looksLikeJsonArray) return null;

  return text;
}

function normalizeAgentOffer(raw: unknown, fallbackIndex: number): AgentOffer | null {
  if (!raw || typeof raw !== 'object') return null;
  const maybe = raw as Partial<AgentOffer> & Record<string, unknown>;
  const title = typeof maybe.title === 'string' ? maybe.title.trim() : '';
  const userMessage = typeof maybe.userMessage === 'string' ? maybe.userMessage.trim() : '';
  if (!title || !userMessage) return null;
  const id =
    typeof maybe.id === 'string' && maybe.id.trim().length > 0
      ? maybe.id.trim()
      : `offer-${fallbackIndex + 1}`;
  return { id, title, userMessage };
}

function extractAgentOffersFromAssistantMessage(content: string): ParsedAgentOffers {
  const markerIndex = content.indexOf(AGENT_OFFERS_MARKER);
  if (markerIndex === -1) {
    return { displayContent: content, offers: null };
  }

  const visiblePart = content.slice(0, markerIndex).trimEnd();
  const afterMarker = content.slice(markerIndex + AGENT_OFFERS_MARKER.length).trim();
  if (!afterMarker) {
    return { displayContent: visiblePart || content, offers: null };
  }

  const jsonText = extractJsonCandidateFromHandoffBlock(afterMarker);
  if (!jsonText) {
    return { displayContent: visiblePart || content, offers: null };
  }

  try {
    const parsed = JSON.parse(jsonText) as unknown;
    if (!Array.isArray(parsed)) {
      return { displayContent: visiblePart || content, offers: null };
    }
    const offers = parsed
      .map((entry, idx) => normalizeAgentOffer(entry, idx))
      .filter((entry): entry is AgentOffer => Boolean(entry))
      .slice(0, 5);
    return { displayContent: visiblePart || content, offers: offers.length > 0 ? offers : null };
  } catch {
    return { displayContent: visiblePart || content, offers: null };
  }
}

function extractFocusedActivityTitleFromLaunchContext(launchContext: string | undefined): string | null {
  if (!launchContext) return null;
  const match = launchContext.match(/FOCUSED ACTIVITY[\s\S]*?\n-\s*([^\n]+?)\s*\(status:/i);
  const title = match?.[1]?.trim();
  return title && title.length > 0 ? title : null;
}

function extractFocusedGoalTitleFromLaunchContext(launchContext: string | undefined): string | null {
  if (!launchContext) return null;
  const match = launchContext.match(/FOCUSED GOAL[\s\S]*?\n-\s*([^\n]+?)\s*\(status:/i);
  const title = match?.[1]?.trim();
  return title && title.length > 0 ? title : null;
}

function extractFocusedArcNameFromLaunchContext(launchContext: string | undefined): string | null {
  if (!launchContext) return null;
  const match = launchContext.match(/FOCUSED ARC[\s\S]*?\n-\s*([^\n]+?)\s*\(status:/i);
  const name = match?.[1]?.trim();
  return name && name.length > 0 ? name : null;
}

function extractArcProposalFromAssistantMessage(content: string): ParsedAssistantReply {
  const markerIndex = content.indexOf(ARC_PROPOSAL_MARKER);

  if (markerIndex === -1) {
    // Fallback: some prompts still instruct the model to return plain JSON
    // without the ARC_PROPOSAL_JSON marker. When we receive what looks like a
    // bare JSON object, treat it as a proposal and keep it out of the visible
    // transcript so the user only sees the structured Arc card.
    const trimmed = content.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed) as GeneratedArc;
        return {
          // Empty display content means we won't render a separate assistant
          // bubble for this turn; the "Proposed Arc" card becomes the visible
          // representation instead of a raw JSON blob.
          displayContent: '',
          arcProposal: parsed,
        };
      } catch (err) {
        console.warn('Failed to parse bare Arc proposal JSON from assistant message', err);
      }
    }

    return {
      displayContent: content,
      arcProposal: null,
    };
  }

  const visiblePart = content.slice(0, markerIndex).trimEnd();
  const afterMarker = content.slice(markerIndex + ARC_PROPOSAL_MARKER.length).trim();

  if (!afterMarker) {
    return {
      displayContent: content,
      arcProposal: null,
    };
  }

  // Instructed format is a single JSON object on the next line. We still
  // defensively stop at the first blank line or EOF.
  const [firstLine] = afterMarker.split(/\n\s*\n/);
  const jsonText = firstLine.trim();

  try {
    const parsed = JSON.parse(jsonText) as GeneratedArc;
    return {
      displayContent: visiblePart || content,
      arcProposal: parsed,
    };
  } catch (err) {
    console.warn('Failed to parse Arc proposal from assistant message', err);
    return {
      displayContent: content,
      arcProposal: null,
    };
  }
}

function extractFocusedArcIdFromLaunchContext(launchContext: string | undefined): string | null {
  if (!launchContext) return null;
  // Examples we emit today:
  // - "Focused entity: arc#<id>."
  // - "Object: arc#<id>."
  const focusedMatch = launchContext.match(/Focused entity:\s*arc#([^\s.]+)(?:\.|$)/i);
  if (focusedMatch?.[1]) return focusedMatch[1];
  const objectMatch = launchContext.match(/Object:\s*arc#([^\s.]+)(?:\.|$)/i);
  if (objectMatch?.[1]) return objectMatch[1];
  return null;
}

function extractGoalProposalFromAssistantMessage(content: string): ParsedGoalProposal {
  const markerIndex = content.indexOf(GOAL_PROPOSAL_MARKER);
  if (markerIndex === -1) {
    // Fallback: if the model returns a bare JSON object (without the marker),
    // treat it as a goal proposal so we can still render the proposal card.
    // This mirrors the Arc proposal fallback behavior.
    const trimmed = content.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed) as ProposedGoalDraft;
        if (parsed && typeof parsed === 'object' && typeof parsed.title === 'string' && parsed.title.trim()) {
          return {
            displayContent: '',
            goalProposal: parsed,
          };
        }
      } catch {
        // fall through
      }
    }

    // Fallback: sometimes the model replies with "Title: ..." / "Description: ..." prose.
    // Convert that into a proposal so we still render a card.
    const titleMatch = content.match(/(?:^|\n)\s*title\s*:\s*(.+)\s*$/im);
    const descriptionMatch = content.match(/(?:^|\n)\s*description\s*:\s*([\s\S]+)$/im);
    if (titleMatch?.[1]) {
      const rawTitle = titleMatch[1].trim();
      const rawDescription = descriptionMatch?.[1]?.trim() ?? '';
      const stripQuotes = (value: string) =>
        value.replace(/^[“"']+/, '').replace(/[”"']+$/, '').trim();
      const title = stripQuotes(rawTitle);
      const description = rawDescription ? stripQuotes(rawDescription) : '';
      if (title.length > 0) {
        const strippedLeadIn = content
          .split('\n')
          .filter((line) => !/^\s*(title|description|time\s*horizon)\s*:/i.test(line))
          .join('\n')
          .trim();
        return {
          displayContent: strippedLeadIn.length > 240 ? '' : strippedLeadIn,
          goalProposal: {
            title,
            description: description.length ? description : undefined,
          },
        };
      }
    }
    return { displayContent: content, goalProposal: null };
  }

  const visiblePart = content.slice(0, markerIndex).trimEnd();
  const afterMarker = content.slice(markerIndex + GOAL_PROPOSAL_MARKER.length).trim();
  if (!afterMarker) {
    return { displayContent: content, goalProposal: null };
  }

  const jsonText = extractJsonCandidateFromHandoffBlock(afterMarker);
  if (!jsonText) {
    return { displayContent: visiblePart || content, goalProposal: null };
  }

  try {
    const parsed = JSON.parse(jsonText) as ProposedGoalDraft;
    if (!parsed || typeof parsed !== 'object') {
      return { displayContent: visiblePart || content, goalProposal: null };
    }
    if (!parsed.title || typeof parsed.title !== 'string') {
      return { displayContent: visiblePart || content, goalProposal: null };
    }

    const rawSuggestedArcName = (parsed as any)?.suggestedArcName;
    const suggestedArcName =
      typeof rawSuggestedArcName === 'string' && rawSuggestedArcName.trim().length > 0
        ? rawSuggestedArcName.trim()
        : rawSuggestedArcName === null
          ? null
          : undefined;
    const goalProposalNormalized: ProposedGoalDraft = { ...parsed, suggestedArcName };
    // Avoid showing the goal twice (once in assistant prose, once in the proposal card).
    // Keep a short, non-duplicative lead-in only.
    const strippedLeadIn = visiblePart
      .split('\n')
      .filter((line) => !/^\s*(title|description|time\s*horizon)\s*:/i.test(line))
      .join('\n')
      .trim();
    const shouldSuppressLeadIn =
      /(title\s*:|description\s*:|time\s*horizon\s*:)/i.test(visiblePart) || strippedLeadIn.length > 240;
    return {
      displayContent: shouldSuppressLeadIn ? '' : strippedLeadIn,
      goalProposal: goalProposalNormalized,
    };
  } catch {
    return { displayContent: visiblePart || content, goalProposal: null };
  }
}

function extractActivityProposalFromAssistantMessage(content: string): ParsedActivityProposal {
  const markerIndex = content.indexOf(ACTIVITY_PROPOSAL_MARKER);
  if (markerIndex === -1) {
    return { displayContent: content, suggestion: null };
  }

  const visiblePart = content.slice(0, markerIndex).trimEnd();
  const afterMarker = content.slice(markerIndex + ACTIVITY_PROPOSAL_MARKER.length).trim();
  if (!afterMarker) {
    return { displayContent: content, suggestion: null };
  }

  const jsonText = extractJsonCandidateFromHandoffBlock(afterMarker);
  if (!jsonText) {
    return { displayContent: visiblePart || content, suggestion: null };
  }

  try {
    const parsed = JSON.parse(jsonText) as unknown;
    const suggestion = normalizeActivitySuggestion(parsed);
    return { displayContent: visiblePart || content, suggestion };
  } catch {
    return { displayContent: visiblePart || content, suggestion: null };
  }
}

function extractActivitySuggestionsFromAssistantMessage(
  content: string
): ParsedActivitySuggestions {
  const markerIndex = content.indexOf(ACTIVITY_SUGGESTIONS_MARKER);
  if (markerIndex === -1) {
    return {
      displayContent: content,
      suggestions: null,
    };
  }

  const visiblePart = content.slice(0, markerIndex).trimEnd();
  const afterMarker = content.slice(markerIndex + ACTIVITY_SUGGESTIONS_MARKER.length).trim();

  if (!afterMarker) {
    return {
      displayContent: content,
      suggestions: null,
    };
  }

  const jsonText = extractJsonCandidateFromHandoffBlock(afterMarker);
  if (!jsonText) {
    // Marker exists but the payload isn't usable JSON; fail quietly to avoid noisy warnings.
    return {
      displayContent: visiblePart || content,
      suggestions: null,
    };
  }

  try {
    const parsed = JSON.parse(jsonText) as { suggestions?: unknown };
    const rawSuggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions : null;
    const suggestions =
      rawSuggestions?.map(normalizeActivitySuggestion).filter((s): s is ActivitySuggestion => Boolean(s)) ??
      null;

    const resolved = suggestions && suggestions.length > 0 ? suggestions : null;
    return {
      displayContent: visiblePart || content,
      suggestions: resolved,
    };
  } catch (err) {
    return {
      displayContent: visiblePart || content,
      suggestions: null,
    };
  }
}

function buildArcFeedbackAddendum(
  entries: ArcProposalFeedback[] | undefined
): string | undefined {
  if (!entries || entries.length === 0) {
    return undefined;
  }

  const recent = entries.slice(-6); // up to the last 6 signals
  const recentDown = recent.filter((entry) => entry.decision === 'down');
  const recentUp = recent.filter((entry) => entry.decision === 'up');

  const lines: string[] = [];

  if (recentDown.length > 0) {
    lines.push(
      'Recent Arc proposals the user rejected and why. Do NOT repeat these patterns or names unless the user explicitly asks for them:'
    );
    recentDown.forEach((entry, index) => {
      const reasonSummary =
        entry.reasons && entry.reasons.length > 0
          ? entry.reasons.join(', ')
          : 'no structured reasons provided';
      const parts = [
        `Rejected Arc #${index + 1}: "${entry.arcName}"`,
        `reasons: ${reasonSummary}`,
      ];
      if (entry.note) {
        parts.push(`user note: ${entry.note}`);
      }
      lines.push(parts.join(' – '));
    });
  }

  if (recentUp.length > 0) {
    lines.push(
      '',
      'Recent Arc patterns the user liked. Use these as soft reference points for tone and shape, without copying them directly:'
    );
    recentUp.forEach((entry, index) => {
      const narrative = entry.arcNarrative ? ` – ${entry.arcNarrative}` : '';
      lines.push(`Liked Arc #${index + 1}: "${entry.arcName}"${narrative}`);
    });
  }

  if (lines.length === 0) {
    return undefined;
  }

  return lines.join('\n');
}

type ArcContextSummary = {
  totalArcs?: number;
  totalGoals?: number;
  arcs: { name: string }[];
  goals: { title: string; arcName?: string }[];
};

// Default assistant intro copy used when there is no mode-specific bootstrap.
// We stream this into the timeline so it always appears with the same typing
// animation as other assistant replies instead of popping in fully formed.
const COACH_INTRO_TEXT =
  "I'm your kwilt Agent. Think of me as a smart friend who can help you clarify goals, design arcs, and plan today's focus. What's the most important thing you want to move forward right now?";

const PROMPT_SUGGESTIONS = [
  'Best way to learn a new language',
  'Find a great Japanese architect',
  'Optimize onboarding flow',
];

const CHAT_COLORS = {
// When rendered inside BottomDrawer, the sheet surface
  // already uses `colors.canvas` and horizontal gutters. This palette assumes
  // that outer shell and keeps inner elements focused on content hierarchy.
  background: colors.canvas,
  surface: colors.canvas,
  assistantBubble: colors.card,
  userBubble: colors.accent,
  userBubbleText: colors.canvas,
  accent: colors.accent,
  textPrimary: colors.textPrimary,
  textSecondary: colors.textSecondary,
  border: colors.border,
  chipBorder: colors.border,
  chip: colors.card,
} as const;

const markdownStyles = StyleSheet.create({
  body: {
    ...typography.body,
    // Slightly larger than the base body size so long-form AI copy feels
    // like a native "article" body size on mobile (around iOS 17pt).
    fontSize: 17,
    lineHeight: 24,
    color: CHAT_COLORS.textPrimary,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: spacing.xs,
  },
  heading1: {
    ...typography.titleLg,
    color: CHAT_COLORS.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  heading2: {
    ...typography.titleSm,
    color: CHAT_COLORS.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  heading3: {
    ...typography.body,
    fontWeight: '600',
    color: CHAT_COLORS.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs / 2,
  },
  bullet_list: {
    marginVertical: spacing.xs,
  },
  ordered_list: {
    marginVertical: spacing.xs,
  },
  list_item: {
    flexDirection: 'row',
    marginBottom: spacing.xs / 2,
  },
  strong: {
    // Make bold text in Markdown clearly stand out inside assistant bubbles
    // without looking like a clickable affordance.
    ...typography.body,
    fontFamily: fonts.semibold,
    fontWeight: '600',
    color: CHAT_COLORS.textPrimary,
  },
  em: {
    // We treat emphasis as "highlight" (bold) rather than italics so copy can
    // safely use `*emphasis*` / `<em>` without shrinking or looking like a
    // side-note.
    ...typography.body,
    fontFamily: fonts.semibold,
    fontWeight: '600',
    color: CHAT_COLORS.textPrimary,
  },
  link: {
    color: CHAT_COLORS.accent,
    textDecorationLine: 'underline',
  },
  code_inline: {
    ...typography.bodySm,
    backgroundColor: CHAT_COLORS.assistantBubble,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  code_block: {
    ...typography.bodySm,
    backgroundColor: CHAT_COLORS.assistantBubble,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  blockquote: {
    borderLeftWidth: 2,
    borderLeftColor: CHAT_COLORS.border,
    paddingLeft: spacing.md,
    marginVertical: spacing.xs,
    color: CHAT_COLORS.textPrimary,
  },
});

// Agent Workspace composer: start at a single line of body text and
// grow up to ~10 lines before switching to internal scrolling.
const INPUT_MIN_HEIGHT = typography.body.lineHeight * 1;
const INPUT_MAX_HEIGHT = typography.body.lineHeight * 10;

const AGE_RANGE_OPTIONS: { value: AgeRange; label: string }[] = [
  { value: 'under-18', label: 'Under 18' },
  { value: '18-24', label: '18–24' },
  { value: '25-34', label: '25–34' },
  { value: '35-44', label: '35–44' },
  { value: '45-54', label: '45–54' },
  { value: '55-64', label: '55–64' },
  { value: '65-plus', label: '65+' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

function parseArcContextFromLaunchContext(raw: string): ArcContextSummary | undefined {
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return undefined;
  }

  let totalArcs: number | undefined;
  let totalGoals: number | undefined;
  const arcs: { name: string }[] = [];
  const goals: { title: string; arcName?: string }[] = [];

  let currentArcName: string | undefined;
  let inGoalsForCurrentArc = false;

  lines.forEach((line) => {
    if (line.startsWith('Total arcs:')) {
      const match = line.match(/^Total arcs:\s*(\d+)\.\s*Total goals:\s*(\d+)\./);
      if (match) {
        totalArcs = Number(match[1]);
        totalGoals = Number(match[2]);
      }
      return;
    }

    if (line.startsWith('Arc:')) {
      const match = line.match(/^Arc:\s*(.+?)\s*\(status:\s*([^)]+)\)\./);
      currentArcName = match ? match[1] : line.replace(/^Arc:\s*/, '');
      arcs.push({ name: currentArcName });
      inGoalsForCurrentArc = false;
      return;
    }

    if (line === 'Goals in this arc:') {
      inGoalsForCurrentArc = true;
      return;
    }

    if (inGoalsForCurrentArc && line.startsWith('- ')) {
      const match = line.match(/^- (.+?)\s*\(status:\s*([^)]+)\)/);
      const title = match ? match[1] : line.replace(/^- /, '');
      goals.push({
        title,
        arcName: currentArcName,
      });
      return;
    }

    if (line === '') {
      inGoalsForCurrentArc = false;
    }
  });

  if (
    typeof totalArcs === 'undefined' &&
    typeof totalGoals === 'undefined' &&
    arcs.length === 0 &&
    goals.length === 0
  ) {
    return undefined;
  }

  return { totalArcs, totalGoals, arcs, goals };
}

export type AiChatPaneProps = {
  /**
   * Optional high-level mode describing what job the coach is doing.
   * For example, ArcsScreen passes "arcCreation" when launching from the
   * new Arc flow so the coach can lean into that context.
   */
  mode?: ChatMode;
  /**
   * Optional launch context summarizing the workspace (arcs, goals, etc.).
   * When provided, this is injected as a hidden "system" message so that
   * every turn of the conversation has access to it without cluttering the UI.
   */
  launchContext?: string;
  /**
   * When true (the default), arcCreation mode will attempt to hydrate any
   * saved draft for this thread so the user can resume where they left off.
   * When false, a new, clean conversation is started even if a draft exists.
   */
  resumeDraft?: boolean;
  /**
   * Optional callback fired when the user confirms an Arc proposal inside
   * the chat canvas. When omitted, the proposal card still lets the user
   * edit the name and narrative but does not persist the Arc.
   */
  onConfirmArc?: (proposal: GeneratedArc) => void;
  /**
   * Optional callback fired when the user adopts a Goal proposal inside
   * goalCreation mode. Hosts can close the sheet or navigate to Goal detail.
   */
  onGoalCreated?: (goalId: string) => void;
  /**
   * Optional callback fired when a hosted flow (such as first-time onboarding)
   * completes inside the chat surface.
   */
  onComplete?: (outcome?: unknown) => void;
  /**
   * Optional slot for rendering a workflow- or mode-specific step card
   * beneath the transcript. For example, first-time onboarding can render
   * its guided cards here while the shared chat surface stays consistent.
   */
  stepCard?: ReactNode;
  /**
   * Optional hook so hosts can react when the underlying network transport
   * fails (for example, to surface a manual-creation fallback).
   */
  onTransportError?: () => void;
  /**
   * Optional hook so hosts can respond when the user taps a manual fallback
   * card (for example, by switching to a manual creation tab).
   */
  onManualFallbackRequested?: () => void;
  /**
   * When true, hide the kwilt brand header row so hosts (like BottomDrawer
   * sheets) can render their own mode header outside the chat timeline.
   */
  hideBrandHeader?: boolean;
  /**
   * When true, hide the default prompt suggestion chips that sit above the
   * chat composer. This is useful for focused creation workflows where we
   * want the surface to stay on-task without generic prompts.
   */
  hidePromptSuggestions?: boolean;
  /**
   * When true, the host surface already includes bottom safe-area padding
   * (e.g. BottomDrawer sheets which pad their sheet by `insets.bottom`).
   *
   * In that case, iOS keyboard heights (which often include the home-indicator
   * area) must subtract `insets.bottom` to avoid double-offsetting.
   *
   * Default: false (full-screen surfaces like AppShell do not pad bottom).
   */
  hostBottomInsetAlreadyApplied?: boolean;
  /**
   * Optional hook fired when the user taps "Accept" on an AI-generated
   * activity suggestion card in activityCreation mode.
   */
  onAdoptActivitySuggestion?: (suggestion: ActivitySuggestion) => void;
  /**
   * Optional hook allowing the pane to request that its host close the
   * surrounding shell (for example, the Activities AI bottom sheet) when
   * the user is done adopting suggestions.
   */
  onDismiss?: () => void;
};

export type AiChatPaneController = {
  /**
   * Append a synthetic user message into the visible transcript. Used by
   * structured flows (like onboarding) so answers collected via cards also
   * appear as chat bubbles.
   */
  appendUserMessage: (content: string) => void;
  /**
   * Stream an assistant reply into the transcript using the same animation
   * behavior as normal chat turns.
   */
  streamAssistantReplyFromWorkflow: (
    fullText: string,
    baseId?: string,
    opts?: { onDone?: () => void }
  ) => void;
  /**
   * Snapshot the current chat history (including hidden system messages) so
   * workflow presenters can call `sendCoachChat` with full context.
   */
  getHistory: () => CoachChatTurn[];
  /**
   * Snapshot the current visible timeline (messages + inline cards) in a
   * normalized form. This is primarily intended for workflow presenters and
   * future runtime layers that want to reason about the thread structure
   * without coupling to AiChatPane's internal state.
   */
  getTimeline: () => AgentTimelineItem[];
};

/**
 * Minimal controller contract that workflow presenters depend on.
 *
 * This abstracts the chat timeline API away from the full AiChatPane
 * implementation so that flows like onboarding, Arc creation, and Goal
 * creation can be written against a single, documented interface.
 */
export type ChatTimelineController = Pick<
  AiChatPaneController,
  'appendUserMessage' | 'streamAssistantReplyFromWorkflow' | 'getHistory' | 'getTimeline'
>;

/**
 * Core chat canvas for the agent: a single "thread + cards" surface that all
 * AI workflows render into. AiChatPane owns the visible timeline (messages,
 * cards, status) while hosts like AgentWorkspace choose the ChatMode and
 * inject workflow-driven cards via the `stepCard` slot.
 *
 * Important policy: the `mode` / ChatMode is chosen at launch and this pane
 * does not support mid-flight mode switching. Flows that need a different
 * mode should close their AgentWorkspace host and launch a new one instead.
 *
 * This component intentionally does NOT own global app padding or navigation
 * chrome – the sheet + AppShell handle those layers.
 */
export const AiChatPane = forwardRef(function AiChatPane(
  {
    mode,
    launchContext,
    resumeDraft = true,
    onConfirmArc,
    onGoalCreated,
    onComplete,
    stepCard,
    hideBrandHeader = false,
    hidePromptSuggestions = false,
    hostBottomInsetAlreadyApplied = false,
    onTransportError,
    onManualFallbackRequested,
    onAdoptActivitySuggestion,
    onDismiss,
  }: AiChatPaneProps,
  ref: Ref<AiChatPaneController>
) {
  const insets = useSafeAreaInsets();
  const isArcCreationMode = mode === 'arcCreation';
  const isOnboardingMode = mode === 'firstTimeOnboarding';
  const hasStepCard = Boolean(stepCard);

  const workflowRuntime = useWorkflowRuntime();
  const currentWorkflowStepId = workflowRuntime?.instance?.currentStepId;
  const currentWorkflowStep = workflowRuntime?.definition?.steps.find(
    (step) => step.id === currentWorkflowStepId
  );

  const shouldHideComposerForWorkflowStep =
    Boolean(workflowRuntime && currentWorkflowStep?.hideFreeformChatInput);

  // During first-time onboarding, all user input is collected via structured
  // step cards (tap-only questions plus one inline free-response field), so
  // the global chat composer should remain hidden for the entire workflow.
  const shouldShowComposer =
    !shouldHideComposerForWorkflowStep && mode !== 'activityCreation' && !isOnboardingMode;

  const composerPlaceholder =
    mode === 'goalCreation' ? 'Your goal (and when)…' : 'Ask, Search or Chat…';

  const modeConfig = mode ? WORKFLOW_REGISTRY[mode] : undefined;
  const modeSystemPrompt = modeConfig?.systemPrompt;
  const shouldBootstrapAssistant = Boolean(modeConfig?.autoBootstrapFirstMessage);
  const [isWorkflowInfoVisible, setIsWorkflowInfoVisible] = useState(false);
  // Clearance between the focused input and the keyboard.
  //
  // For inline step-card forms (Arc creation / onboarding), we want enough room for
  // the card’s bottom CTA row, but not so much that a tall card gets shoved off the
  // top of the viewport when focusing the field.
  // NOTE: When the composer is hidden, step cards often include their own primary CTA
  // below the focused input (e.g. onboarding "Continue"). If clearance is 0, the
  // focused input may be visible but the CTA row will be covered by the keyboard.
  // Use a moderate, step-card-specific clearance to keep the entire card actionable.
  // For onboarding, the first step-card contains a multiline textarea. We bias a bit more
  // clearance so the entire card (including footer / CTA row) stays in-frame when the
  // keyboard is up.
  const STEP_CARD_KEYBOARD_CLEARANCE = isOnboardingMode ? 104 : 104;
  const keyboardClearance =
    !shouldShowComposer && hasStepCard ? STEP_CARD_KEYBOARD_CLEARANCE : spacing.lg;

  const draftSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userProfile = useAppStore((state) => state.userProfile);
  const updateUserProfile = useAppStore((state) => state.updateUserProfile);
  const arcFeedbackEntries = useAppStore((state) => state.arcFeedback);
  const addArcFeedback = useAppStore((state) => state.addArcFeedback);
  const addGoal = useAppStore((state) => state.addGoal);
  const addActivity = useAppStore((state) => state.addActivity);
  const activities = useAppStore((state) => state.activities);
  const arcs = useAppStore((state) => state.arcs);
  const goals = useAppStore((state) => state.goals);
  const hasAgeRange = Boolean(userProfile?.ageRange);
  // Arc creation previously asked for an age range inline, but this felt
  // intrusive and overlapped with onboarding responsibilities. We now keep
  // age handling in dedicated flows (like FTUE) and never surface the age
  // question card in Arc AI.
  const shouldShowAgeQuestion = false;

  const buildInitialMessages = (): ChatMessage[] => {
    // When there is no explicit mode or launch context and we are not
    // auto-bootstrapping an LLM reply, we start with an empty visible
    // transcript and stream the default intro copy separately so it appears
    // with the normal typing animation.
    if (!launchContext && !modeSystemPrompt && !shouldBootstrapAssistant) {
      return [];
    }

    const blocks: string[] = [];

    if (modeSystemPrompt) {
      blocks.push(modeSystemPrompt.trim());
    }

    if (isArcCreationMode) {
      const feedbackAddendum = buildArcFeedbackAddendum(arcFeedbackEntries);
      if (feedbackAddendum) {
        blocks.push(
          '---',
          'Feedback on previous Arc suggestions from this user. Use this to avoid repeating past mistakes and to lean toward what has resonated:',
          feedbackAddendum
        );
      }
    }

    if (launchContext) {
      blocks.push(
        '---',
        'Launch context + workspace snapshot (may include focused arcs/goals/activities). Use this to stay grounded, avoid duplicates, and tailor guidance to what the user is currently looking at.',
        launchContext.trim()
      );
    }

    const contextContent = blocks.join('\n\n');

    const systemMessage: ChatMessage = {
      id: 'system-launch-context',
      role: 'system',
      content: contextContent,
    };

    // For first-time onboarding, we want the visible assistant copy to be
    // orchestrated per workflow step (via workflow presenters) instead of a
    // generic intro. We still keep the system message hidden in history so
    // the model has full context.
    if (isOnboardingMode) {
      return [systemMessage];
    }

    // For modes that bootstrap their first assistant reply automatically, we
    // do not seed any visible intro so the response comes directly from the
    // mode-specific system prompt.
    if (shouldBootstrapAssistant) {
      return [systemMessage];
    }

    // For non-bootstrap modes with a launch context or system prompt, we keep
    // the contextual system message hidden in history and stream the visible
    // intro separately so it still animates into the thread.
    return [systemMessage];
  };

  const initialMessages = buildInitialMessages();

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [composerHeight, setComposerHeight] = useState(0);
  const [composerInputHeight, setComposerInputHeight] = useState(INPUT_MIN_HEIGHT);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [arcProposal, setArcProposal] = useState<GeneratedArc | null>(null);
  const [goalProposal, setGoalProposal] = useState<ProposedGoalDraft | null>(null);
  const [goalDraftTitle, setGoalDraftTitle] = useState('');
  const [goalDraftDescription, setGoalDraftDescription] = useState('');
  const [goalProposalPostNote, setGoalProposalPostNote] = useState('');
  const [goalProposalTimeline, setGoalProposalTimeline] = useState<GoalProposalTimelineItem[]>([]);
  const [activeGoalProposalId, setActiveGoalProposalId] = useState<string | null>(null);
  const [goalDraftTitleWrapWidth, setGoalDraftTitleWrapWidth] = useState<number>(0);
  const [shouldTitleBeMultiline, setShouldTitleBeMultiline] = useState(false);
  const [selectedGoalArcId, setSelectedGoalArcId] = useState<string | null>(null);
  const [activitySuggestions, setActivitySuggestions] = useState<ActivitySuggestion[] | null>(
    null
  );
  const [arcDraftName, setArcDraftName] = useState('');
  const [arcDraftNarrative, setArcDraftNarrative] = useState('');
  const [isFeedbackInlineVisible, setIsFeedbackInlineVisible] = useState(false);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const [feedbackReasons, setFeedbackReasons] = useState<ArcProposalFeedbackReason[]>([]);
  const [feedbackNote, setFeedbackNote] = useState('');
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollOffsetRef = useRef(0);
  const keyboardRawHeightRef = useRef(0);
  const messagesRef = useRef<ChatMessage[]>(initialMessages);
  const inputRef = useRef<TextInput | null>(null);
  const expandedInputRef = useRef<TextInput | null>(null);
  const dictationBaseRef = useRef('');
  const typingControllerRef = useRef<{ skip: () => void } | null>(null);
  const goalProposalPostNoteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasShownGoalProposalRef = useRef(false);
  const [dictationState, setDictationState] = useState<DictationState>(
    iosSpeechModule ? 'idle' : 'unavailable'
  );
  const [dictationError, setDictationError] = useState<string | null>(null);
  const [isDictationAvailable, setIsDictationAvailable] = useState(Boolean(iosSpeechModule));
  const [hasTransportError, setHasTransportError] = useState(false);
  const [agentOffers, setAgentOffers] = useState<AgentOffer[] | null>(null);
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);

  const hasVisibleMessages = (messages ?? []).some((message) => message.role !== 'system');

  const hasInput = input.trim().length > 0;
  const canSend = hasInput && !sending;
  const composerLineHeight = typography.body.lineHeight;
  const composerExplicitLineCount = input.length === 0 ? 1 : input.split('\n').length;
  const shouldShowComposerExpand =
    // Hide the expand affordance until we have ~3 lines of text. We consider both
    // explicit newlines and soft-wrapping (measured height).
    composerExplicitLineCount >= 3 || composerInputHeight > composerLineHeight * 2.6;
  const isComposerSingleLine =
    composerExplicitLineCount <= 1 && composerInputHeight <= composerLineHeight * 1.6;
  const hasUserMessages = messages.some((m) => m.role === 'user');
  const hasContextMeta = Boolean(launchContext || modeSystemPrompt);
  const shouldShowSuggestionsRail =
    // The prompt suggestions are only for the generic entry point.
    // In dedicated coach modes they read as off-topic.
    !hidePromptSuggestions && !hasUserMessages && !isOnboardingMode && !mode;
  const hasWorkflowContextMeta = Boolean(mode || workflowRuntime?.definition || hasContextMeta);
  const modeLabel = modeConfig?.label;
  const workflowLabel = workflowRuntime?.definition?.label;
  const contextPillLabel = hasWorkflowContextMeta ? 'Context' : null;
  // For first-time onboarding, we want the surface to feel like a focused,
  // narrative-led chat without extra chrome. Hide the contextual mode pill so
  // the greeting copy can stand on its own.
  const shouldShowContextPill =
    !isOnboardingMode && hasWorkflowContextMeta && Boolean(contextPillLabel);

  const hostBottomInset = hostBottomInsetAlreadyApplied ? 0 : insets.bottom;
  const composerRestingBottom = hostBottomInset + spacing.sm;
  // Keep a small gap between the composer and the keyboard so it reads like a floating surface.
  const composerKeyboardGap = spacing.sm;
  // AiChatPane can be hosted either:
  // - Full screen inside AppShell (canvas has ~spacing.sm horizontal padding)
  // - Inside BottomDrawer (sheet has spacing.lg horizontal padding)
  //
  // When hosted inside BottomDrawer, we want the composer gutter to match the
  // keyboard gap, not "sheet padding + gutter". We use the existing
  // `hostBottomInsetAlreadyApplied` as a reliable signal that we're inside BottomDrawer.
  const hostHorizontalPadding = hostBottomInsetAlreadyApplied ? spacing.lg : spacing.sm;
  const composerHorizontalInsetCompensation = Math.max(0, hostHorizontalPadding - composerKeyboardGap);
  const composerBottom =
    keyboardHeight > 0 ? keyboardHeight + composerKeyboardGap : composerRestingBottom;
  const resolvedPaddingBottom = useMemo(() => {
    const base = spacing['2xl'];
    const composerContribution = shouldShowComposer ? composerHeight : 0;
    const restingBottomForPadding = shouldShowComposer ? composerRestingBottom : hostBottomInset;
    const bottomInsetForPadding =
      keyboardHeight > 0
        ? keyboardHeight + composerKeyboardGap + keyboardClearance
        : restingBottomForPadding;
    return base + bottomInsetForPadding + composerContribution;
  }, [
    composerHeight,
    composerKeyboardGap,
    composerRestingBottom,
    hostBottomInset,
    keyboardClearance,
    keyboardHeight,
    shouldShowComposer,
  ]);

  const pendingRevealRef = useRef(false);

  const focusedArcIdForGoal = useMemo(
    () => extractFocusedArcIdFromLaunchContext(launchContext),
    [launchContext],
  );
  const selectedGoalArc = useMemo(() => {
    if (!selectedGoalArcId) return null;
    return arcs.find((arc) => arc.id === selectedGoalArcId) ?? null;
  }, [arcs, selectedGoalArcId]);
  // Goal arc attachment is optional at adoption time; users can link/unlink later.
  // We may still default to a focused or suggested Arc when available.
  const shouldRequireGoalArcPick = false;

  const arcPickerOptions: ObjectPickerOption[] = useMemo(() => {
    return (arcs ?? [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((arc) => ({
        value: arc.id,
        label: arc.name,
        keywords: [arc.name],
      }));
  }, [arcs]);

  useEffect(() => {
    if (!goalProposal) {
      setSelectedGoalArcId(null);
      return;
    }
    // Prefer the focused arc (Arc detail launch). Otherwise:
    // - If exactly one Arc exists, default to it (no extra step).
    // - If multiple Arcs exist, only preselect when the model suggests a matching Arc name.
    setSelectedGoalArcId((current) => {
      if (focusedArcIdForGoal) return focusedArcIdForGoal;
      if (arcs.length === 1) return arcs[0]?.id ?? null;
      const suggested = goalProposal.suggestedArcName;
      if (typeof suggested === 'string' && suggested.trim().length > 0) {
        const match = arcs.find(
          (arc) => arc.name.trim().toLowerCase() === suggested.trim().toLowerCase()
        );
        if (match) return match.id;
      }
      return null;
    });
  }, [arcs, focusedArcIdForGoal, goalProposal]);

  const scheduleDraftSave = (nextMessages: ChatMessage[], nextInput: string) => {
    if (!isArcCreationMode) return;
    if (draftSaveTimeoutRef.current) {
      clearTimeout(draftSaveTimeoutRef.current);
    }
    draftSaveTimeoutRef.current = setTimeout(() => {
      void saveArcCreationDraft({
        messages: nextMessages,
        input: nextInput,
        updatedAt: new Date().toISOString(),
      });
    }, 750);
  };
  const parsedContext = launchContext ? parseArcContextFromLaunchContext(launchContext) : undefined;
  const focusedActivityTitle = extractFocusedActivityTitleFromLaunchContext(launchContext);
  const focusedGoalTitle = extractFocusedGoalTitleFromLaunchContext(launchContext);
  const focusedArcName = extractFocusedArcNameFromLaunchContext(launchContext);

  const goalCreationDefaultLeadIn = useMemo(() => {
    if (mode !== 'goalCreation') {
      return "Here’s a goal based on what you shared.";
    }
    if (focusedArcName) {
      return `Here’s a starter goal for your ${focusedArcName} Arc — a concrete step toward realizing that identity direction.`;
    }
    return "Here’s a starter goal to help you make progress.";
  }, [focusedArcName, mode]);

  const isDictationActive = dictationState === 'recording' || dictationState === 'starting';
  const voiceButtonLabel = isDictationActive ? 'Stop voice input' : 'Start voice input';
  const isDictationBusy = dictationState === 'requesting' || dictationState === 'stopping';
  const voiceButtonIconColor = isDictationActive ? CHAT_COLORS.userBubbleText : colors.canvas;
  const shouldShowDictationStatus = Boolean(dictationError || isDictationActive);
  const dictationStatusMessage = dictationError ?? 'Listening… tap the mic to stop';

  useEffect(() => {
    if (!iosSpeechModule || !iosSpeechEventEmitter) {
      return;
    }

    const resultSub = iosSpeechEventEmitter.addListener(
      'SpeechTranscriptionResult',
      (event: SpeechResultEvent) => {
        const transcript = event?.text ?? '';
        setInput(mergeDictationText(dictationBaseRef.current, transcript));
        if (event?.isFinal) {
          dictationBaseRef.current = '';
          setDictationState('idle');
        }
      }
    );

    const errorSub = iosSpeechEventEmitter.addListener(
      'SpeechTranscriptionError',
      (event: SpeechErrorEvent) => {
        setDictationError(event?.message ?? 'Dictation stopped unexpectedly.');
        dictationBaseRef.current = '';
        setDictationState('idle');
      }
    );

    const availabilitySub = iosSpeechEventEmitter.addListener(
      'SpeechTranscriptionAvailability',
      (event: SpeechAvailabilityEvent) => {
        if (typeof event?.isAvailable === 'boolean') {
          setIsDictationAvailable(event.isAvailable);
        }
      }
    );

    const stateSub = iosSpeechEventEmitter.addListener(
      'SpeechTranscriptionState',
      (event: SpeechStateEvent) => {
        if (!event?.state) {
          return;
        }
        setDictationState(event.state);
        if (event.state === 'idle') {
          dictationBaseRef.current = '';
        }
      }
    );

    return () => {
      resultSub.remove();
      errorSub.remove();
      availabilitySub.remove();
      stateSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!goalProposal) {
      if (goalProposalPostNoteTimeoutRef.current) {
        clearTimeout(goalProposalPostNoteTimeoutRef.current);
        goalProposalPostNoteTimeoutRef.current = null;
      }
      setGoalProposalPostNote('');
      return;
    }

    const fullText = "Want any tweaks? Just tell me what to change.";
    setGoalProposalPostNote('');
    let index = 0;

    const step = () => {
      index = Math.min(index + 2, fullText.length);
      setGoalProposalPostNote(fullText.slice(0, index));
      if (index < fullText.length) {
        goalProposalPostNoteTimeoutRef.current = setTimeout(step, 20);
      } else {
        goalProposalPostNoteTimeoutRef.current = null;
      }
    };

    goalProposalPostNoteTimeoutRef.current = setTimeout(step, 180);

    return () => {
      if (goalProposalPostNoteTimeoutRef.current) {
        clearTimeout(goalProposalPostNoteTimeoutRef.current);
        goalProposalPostNoteTimeoutRef.current = null;
      }
    };
  }, [goalProposal]);

  useEffect(() => {
    if (!dictationError) {
      return;
    }
    const timeout = setTimeout(() => setDictationError(null), 5000);
    return () => clearTimeout(timeout);
  }, [dictationError]);

  useEffect(() => {
    return () => {
      if (!iosSpeechModule?.cancel) {
        return;
      }
      iosSpeechModule.cancel().catch(() => undefined);
    };
  }, []);

  const stopDictation = async () => {
    if (!iosSpeechModule) {
      return;
    }
    setDictationState('stopping');
    try {
      await iosSpeechModule.stop();
    } catch (err) {
      console.warn('Failed to stop dictation', err);
      setDictationState('idle');
      dictationBaseRef.current = '';
    }
  };

  const handleStartDictation = async () => {
    if (!iosSpeechModule || dictationState === 'unavailable' || !isDictationAvailable) {
      inputRef.current?.focus();
      return;
    }

    if (dictationState === 'recording' || dictationState === 'starting' || dictationState === 'requesting') {
      await stopDictation();
      return;
    }

    dictationBaseRef.current = input.trimEnd();
    setDictationError(null);

    try {
      setDictationState('requesting');
      const permissions = await iosSpeechModule.requestAuthorization();

      if (permissions.speechAuthorization !== 'authorized') {
        setDictationError('Enable speech recognition in Settings to use dictation.');
        setDictationState('idle');
        return;
      }

      if (permissions.microphonePermission !== 'granted') {
        setDictationError('Microphone access is required for dictation.');
        setDictationState('idle');
        return;
      }

      if (!permissions.onDeviceSupported) {
        setDictationError('On-device transcription is not supported on this device.');
        setDictationState('idle');
        return;
      }

      Keyboard.dismiss();
      await iosSpeechModule.start({ locale: getPreferredLocale() });
      setDictationState('starting');
    } catch (err) {
      console.warn('Failed to start dictation', err);
      setDictationError(
        err instanceof Error ? err.message : 'Unable to start dictation. Try again in a moment.'
      );
      setDictationState('idle');
    }
  };

  const handleSelectAgeRange = (range: AgeRange) => {
    const option = AGE_RANGE_OPTIONS.find((entry) => entry.value === range);
    const humanLabel = option?.label ?? range;

    const ageMessage: ChatMessage = {
      id: `user-age-${Date.now()}`,
      role: 'user',
      content: `I'm ${humanLabel}`,
    };

    setMessages((prev) => {
      const next = [...prev, ageMessage];
      messagesRef.current = next;
      scheduleDraftSave(next, input);
      return next;
    });

    updateUserProfile((current) => ({
      ...current,
      ageRange: range,
    }));
  };

  const streamAssistantReply = (
    fullText: string,
    baseId: string,
    opts?: { onDone?: () => void }
  ): string | null => {
    // Don't create blank assistant bubbles; just treat as an immediate completion.
    if (!fullText || fullText.trim().length === 0) {
      opts?.onDone?.();
      return null;
    }

    const messageId = `${baseId}-${Date.now()}`;

    let finished = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const finish = () => {
      if (finished) return;
      finished = true;
      typingControllerRef.current = null;
      setIsAssistantTyping(false);
      opts?.onDone?.();
    };

    const revealFullMessage = () => {
      setMessages((prev) => {
        const next = prev.map((message) =>
          message.id === messageId ? { ...message, content: fullText } : message
        );
        messagesRef.current = next;
        scheduleDraftSave(next, input);
        return next;
      });
    };

    // Seed an empty assistant message so the user sees something appear
    // immediately, then gradually reveal the full content.
    setIsAssistantTyping(true);
    setMessages((prev) => {
      const next: ChatMessage[] = [
        ...prev,
        {
          id: messageId,
          role: 'assistant',
          content: '',
        },
      ];
      messagesRef.current = next;
      scheduleDraftSave(next, input);
      return next;
    });

    const totalLength = fullText.length;
    if (totalLength === 0) {
      finish();
      return messageId;
    }

    let index = 0;
    const paragraphPausePoints: number[] = [];
    const paragraphBreakRegex = /(?:\r?\n)\s*(?:\r?\n)/g;
    let match: RegExpExecArray | null;
    while ((match = paragraphBreakRegex.exec(fullText)) !== null) {
      const pauseIndex = match.index + match[0].length;
      if (pauseIndex < totalLength) {
        paragraphPausePoints.push(pauseIndex);
      }
    }
    paragraphPausePoints.sort((a, b) => a - b);
    let nextPauseIdx = 0;
    typingControllerRef.current = {
      skip: () => {
        if (finished) return;
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        revealFullMessage();
        finish();
      },
    };

    const step = () => {
      if (finished) {
        return;
      }

      const previousIndex = index;

      // Propose the next index based on the typing speed. Slightly slower so
      // longer replies feel more readable without dragging.
      let nextIndex = Math.min(index + 2, totalLength);

      // Skip over any pause points we've already passed.
      while (
        nextPauseIdx < paragraphPausePoints.length &&
        paragraphPausePoints[nextPauseIdx] <= previousIndex
      ) {
        nextPauseIdx += 1;
      }

      let crossedPause = false;
      if (nextPauseIdx < paragraphPausePoints.length) {
        const pausePoint = paragraphPausePoints[nextPauseIdx];
        // If the next typing step would jump over a paragraph boundary,
        // clamp to the boundary so we pause before revealing the next
        // paragraph’s first characters.
        if (pausePoint > previousIndex && pausePoint <= nextIndex) {
          nextIndex = pausePoint;
          crossedPause = true;
          nextPauseIdx += 1;
        }
      }

      index = nextIndex;
      const nextContent = fullText.slice(0, index);

      setMessages((prev) => {
        const next = prev.map((message) =>
          message.id === messageId ? { ...message, content: nextContent } : message
        );
        messagesRef.current = next;
        scheduleDraftSave(next, input);
        return next;
      });

      if (index < totalLength) {
        const delay = crossedPause ? 800 : 40;
        timeoutId = setTimeout(step, delay);
      } else {
        finish();
      }
    };

    // Kick off the first animation frame.
    timeoutId = setTimeout(step, 20);
    return messageId;
  };

  const appendGoalProposalTimelineItem = useCallback(
    (proposal: ProposedGoalDraft, anchorMessageId: string) => {
      const id = `goal-proposal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const createdAt = new Date().toISOString();
      setGoalProposalTimeline((prev) => [
        ...prev.map((item) => ({ ...item, isActive: false })),
        {
          id,
          anchorMessageId,
          proposal,
          createdAt,
          isActive: true,
        },
      ]);
      setActiveGoalProposalId(id);
      setGoalProposal(proposal);
      setGoalDraftTitle(proposal.title ?? '');
      setGoalDraftDescription(proposal.description ?? '');
    },
    [],
  );

  const dismissActiveGoalProposal = useCallback(() => {
    if (!activeGoalProposalId) return;
    setGoalProposalTimeline((prev) => prev.filter((item) => item.id !== activeGoalProposalId));
    setActiveGoalProposalId(null);
    setGoalProposal(null);
    setGoalDraftTitle('');
    setGoalDraftDescription('');
  }, [activeGoalProposalId]);

  const dismissGoalProposalById = useCallback(
    (id: string) => {
      setGoalProposalTimeline((prev) => prev.filter((item) => item.id !== id));
      if (id === activeGoalProposalId) {
        setActiveGoalProposalId(null);
        setGoalProposal(null);
        setGoalDraftTitle('');
        setGoalDraftDescription('');
      }
    },
    [activeGoalProposalId],
  );

  const renderGoalProposalCard = useCallback(
    (item: GoalProposalTimelineItem) => {
      const isActive = item.id === activeGoalProposalId && Boolean(goalProposal);
      const proposal = isActive && goalProposal ? goalProposal : item.proposal;
      const titleValue = isActive ? goalDraftTitle : proposal.title ?? '';
      const descriptionValue = isActive ? goalDraftDescription : proposal.description ?? '';

      return (
        <Fragment key={item.id}>
          <View style={styles.goalDraftCard}>
            <View style={styles.goalDraftLabelRow}>
              <Icon name="sparkles" size={14} color={CHAT_COLORS.textSecondary} />
              <Text style={styles.goalDraftLabel}>AI Goal Proposal</Text>
            </View>

            <Text style={styles.goalDraftFieldLabel}>TITLE</Text>
            {isActive ? (
              <View
                onLayout={(event) => {
                  const nextWidth = event.nativeEvent.layout.width;
                  if (nextWidth > 0 && nextWidth !== goalDraftTitleWrapWidth) {
                    setGoalDraftTitleWrapWidth(nextWidth);
                  }
                }}
              >
                {/* Hidden measurement text: enables "single line unless wrapped" behavior. */}
                {goalDraftTitleWrapWidth > 0 ? (
                  <Text
                    style={[styles.goalDraftTitleMeasure, { width: goalDraftTitleWrapWidth }]}
                    onTextLayout={(event) => {
                      const lineCount = event.nativeEvent.lines?.length ?? 1;
                      setShouldTitleBeMultiline(lineCount > 1);
                    }}
                  >
                    {titleValue || 'Ship the Kwilt App MVP'}
                  </Text>
                ) : null}
                <Input
                  value={titleValue}
                  onChangeText={setGoalDraftTitle}
                  placeholder="Ship the Kwilt App MVP"
                  multiline={shouldTitleBeMultiline}
                  multilineMinHeight={44}
                  multilineMaxHeight={64}
                  size="sm"
                  inputStyle={styles.goalDraftTitleInputText}
                  containerStyle={styles.goalDraftInputContainer}
                />
              </View>
            ) : (
              <Input
                value={titleValue}
                editable={false}
                placeholder="Ship the Kwilt App MVP"
                multiline={false}
                size="sm"
                inputStyle={styles.goalDraftTitleInputText}
                containerStyle={styles.goalDraftInputContainer}
              />
            )}

            <Text style={styles.goalDraftFieldLabel}>DESCRIPTION</Text>
            <Input
              value={descriptionValue}
              onChangeText={isActive ? setGoalDraftDescription : undefined}
              editable={isActive}
              placeholder="…"
              multiline
              multilineMinHeight={112}
              multilineMaxHeight={220}
              size="sm"
              inputStyle={styles.goalDraftDescriptionInputText}
              containerStyle={styles.goalDraftInputContainer}
            />

            {isActive && !focusedArcIdForGoal && arcs.length > 0 && (
                <View style={styles.goalDraftArcRow}>
                  <Text style={styles.goalDraftArcLabel}>Arc</Text>
                  <ObjectPicker
                    options={arcPickerOptions}
                    value={selectedGoalArcId ?? ''}
                    onValueChange={(next) => setSelectedGoalArcId(next || null)}
                    placeholder="Choose an Arc…"
                    searchPlaceholder="Search Arcs…"
                    emptyText="No matching Arcs."
                    accessibilityLabel="Choose an Arc for this goal"
                    allowDeselect
                    presentation="drawer"
                  />
                </View>
              )}

            {isActive ? (
              <View style={styles.goalDraftButtonsRow}>
                <Button
                  variant="outline"
                  onPress={() => {
                    dismissActiveGoalProposal();
                  }}
                >
                  <Text style={styles.goalDraftSecondaryButtonText}>Not now</Text>
                </Button>
                <Button
                  variant="ai"
                  onPress={() => {
                    const trimmedTitle = (goalDraftTitle || proposal.title || '').trim();
                    if (!trimmedTitle) return;
                    const trimmedDescription = (goalDraftDescription || proposal.description || '').trim();

                    const arcId = focusedArcIdForGoal ?? selectedGoalArcId ?? null;
                    if (arcId) {
                      const isPro = useEntitlementsStore.getState().isPro;
                      const canCreate = canCreateGoalInArc({ isPro, goals, arcId });
                      if (!canCreate.ok) {
                        Alert.alert(
                          'Goal limit reached',
                          `Free tier supports up to ${canCreate.limit} active goals per Arc. Archive a goal to make room, or upgrade to Pro.`,
                          [
                            { text: 'Not now', style: 'cancel' },
                            {
                              text: 'Upgrade',
                              onPress: () =>
                                openPaywallInterstitial({
                                  reason: 'limit_goals_per_arc',
                                  source: 'ai_chat_goal_adopt',
                                }),
                            },
                          ],
                        );
                        return;
                      }
                    }
                    const timestamp = new Date().toISOString();
                    const mergedForceIntent = {
                      ...defaultForceLevels(0),
                      ...(proposal.forceIntent ?? {}),
                    };

                    const goal: Goal = {
                      id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                      arcId,
                      title: trimmedTitle,
                      description: trimmedDescription.length ? trimmedDescription : undefined,
                      status: proposal.status ?? 'planned',
                      startDate: timestamp,
                      targetDate: undefined,
                      forceIntent: mergedForceIntent,
                      metrics: [],
                      createdAt: timestamp,
                      updatedAt: timestamp,
                    };

                    // Creating a Goal counts as showing up.
                    useAppStore.getState().recordShowUp();
                    addGoal(goal);
                    onGoalCreated?.(goal.id);
                    dismissActiveGoalProposal();

                    if (workflowRuntime?.definition?.chatMode === 'goalCreation') {
                      workflowRuntime.completeStep('agent_generate_goals', {
                        title: goal.title,
                        description: goal.description ?? null,
                        status: goal.status,
                        forceIntent: goal.forceIntent,
                      });
                    }
                  }}
                  disabled={shouldRequireGoalArcPick && !selectedGoalArcId}
                >
                  <Text style={styles.goalDraftConfirmText}>Adopt Goal</Text>
                </Button>
              </View>
            ) : (
              <View style={styles.goalDraftButtonsRow}>
                <Button variant="outline" onPress={() => dismissGoalProposalById(item.id)}>
                  <Text style={styles.goalDraftSecondaryButtonText}>Dismiss</Text>
                </Button>
              </View>
            )}
          </View>

          {isActive && goalProposalPostNote.trim().length > 0 && (
            <View style={styles.assistantMessage} pointerEvents="none">
              <Markdown style={markdownStyles}>{goalProposalPostNote}</Markdown>
            </View>
          )}
        </Fragment>
      );
    },
    [
      activeGoalProposalId,
      addGoal,
      goals,
      arcs.length,
      dismissActiveGoalProposal,
      dismissGoalProposalById,
      focusedArcIdForGoal,
      goalDraftDescription,
      goalDraftTitle,
      goalDraftTitleWrapWidth,
      goalProposal,
      goalProposalPostNote,
      onGoalCreated,
      selectedGoalArcId,
      shouldRequireGoalArcPick,
      shouldTitleBeMultiline,
      workflowRuntime,
      arcPickerOptions,
    ],
  );

  const commitGoalProposal = useCallback((proposal: ProposedGoalDraft | null) => {
    if (goalProposalPostNoteTimeoutRef.current) {
      clearTimeout(goalProposalPostNoteTimeoutRef.current);
      goalProposalPostNoteTimeoutRef.current = null;
    }
    if (proposal) {
      setGoalProposal(proposal);
      setGoalDraftTitle(proposal.title ?? '');
      setGoalDraftDescription(proposal.description ?? '');
      setGoalProposalPostNote('');
      hasShownGoalProposalRef.current = true;
      return;
    }
    setGoalProposal(null);
    setGoalDraftTitle('');
    setGoalDraftDescription('');
    setGoalProposalPostNote('');
  }, []);

  useImperativeHandle(
    ref,
    (): AiChatPaneController => ({
      appendUserMessage: (content: string) => {
        const userMessage: ChatMessage = {
          id: `user-external-${Date.now()}`,
          role: 'user',
          content,
        };
        setMessages((prev) => {
          const next = [...prev, userMessage];
          messagesRef.current = next;
          scheduleDraftSave(next, input);
          return next;
        });
      },
      streamAssistantReplyFromWorkflow: (
        fullText: string,
        baseId = 'assistant-workflow',
        opts,
      ) => {
        // When a workflow presenter streams an assistant reply while the Goal
        // Creation workflow is on its generation step, mark that step as
        // completed but keep the workflow pinned to the same step so multiple
        // generations remain possible.
        if (
          workflowRuntime?.definition?.chatMode === 'goalCreation' &&
          workflowRuntime.instance?.currentStepId === 'agent_generate_goals'
        ) {
          workflowRuntime.completeStep(
            'agent_generate_goals',
            undefined,
            'agent_generate_goals'
          );
        }

        if (mode === 'activityCreation') {
          const proposalParsed = extractActivityProposalFromAssistantMessage(fullText);
          const parsed = extractActivitySuggestionsFromAssistantMessage(proposalParsed.displayContent);
          const suggestions = proposalParsed.suggestion
            ? [proposalParsed.suggestion]
            : parsed.suggestions;
          if (suggestions && suggestions.length > 0) {
            setActivitySuggestions(suggestions);
            setAdoptedActivityCount(0);
            setShowActivitySummary(false);
          } else {
            setActivitySuggestions(null);
          }
          streamAssistantReply(parsed.displayContent, baseId, opts);
        } else if (mode === 'goalCreation') {
          const parsed = extractGoalProposalFromAssistantMessage(fullText);
          // Defer proposal card rendering until after the typed assistant message finishes.
          const nextProposal = parsed.goalProposal ?? null;
          const leadIn =
            nextProposal && (!parsed.displayContent || parsed.displayContent.trim().length === 0)
              ? hasShownGoalProposalRef.current
                ? 'Here’s an updated goal based on your feedback.'
                : goalCreationDefaultLeadIn
              : parsed.displayContent;
          const leadInMessageId = streamAssistantReply(leadIn, baseId, {
            ...opts,
            onDone: () => {
              if (nextProposal) {
                // Anchor this card to the assistant message that introduced it so it "stays put"
                // above any future user messages (e.g. tweak requests).
                if (leadInMessageId) {
                  appendGoalProposalTimelineItem(nextProposal, leadInMessageId);
                } else {
                  // Fallback: still show the proposal, but it may not anchor correctly.
                  commitGoalProposal(nextProposal);
                }
              }
              opts?.onDone?.();
            },
          });
        } else if (mode === 'arcCreation') {
          const parsed = extractArcProposalFromAssistantMessage(fullText);
          if (parsed.arcProposal) {
            setArcProposal(parsed.arcProposal);
            setArcDraftName(parsed.arcProposal.name ?? '');
            setArcDraftNarrative(parsed.arcProposal.narrative ?? '');
          }
          streamAssistantReply(parsed.displayContent, baseId, opts);
        } else if (mode === 'activityGuidance') {
          const offersParsed = extractAgentOffersFromAssistantMessage(fullText);
          setAgentOffers(offersParsed.offers);
          streamAssistantReply(offersParsed.displayContent, baseId, opts);
        } else {
          streamAssistantReply(fullText, baseId, opts);
        }
      },
      getHistory: () => {
        return messagesRef.current.map((m) => ({
          role: m.role,
          content: m.content,
        }));
      },
      getTimeline: () => {
        // For now we expose the visible text transcript as timeline items.
        // Workflow- and card-specific items can be layered in over time as
        // we formalize the AgentTimelineItem model.
        const baseTimestamp = Date.now();
        return messagesRef.current
          .filter((m) => m.role !== 'system')
          .map<AgentTimelineItem>((m, index) => ({
            id: m.id,
            createdAt: new Date(baseTimestamp + index).toISOString(),
            kind: m.role === 'assistant' ? 'assistantMessage' : 'userMessage',
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          }));
      },
    }),
    [input, mode, workflowRuntime]
  );

  // For arcCreation mode, automatically ask the model for an initial
  // assistant message on mount so the conversation opens with guidance
  // that respects the Arc Creation Agent system prompt (including age
  // awareness) instead of a static placeholder.
  useEffect(() => {
    if (!shouldBootstrapAssistant || bootstrapped) {
      return;
    }

    // Activities AI bootstraps via a dedicated effect that streams local copy
    // immediately while fetching suggestions in parallel.
    if (mode === 'activityCreation') {
      return;
    }

    let cancelled = false;

    const bootstrapConversation = async () => {
      try {
        setHasTransportError(false);

        setThinking(true);
        const history: CoachChatTurn[] = messagesRef.current.map((m) => ({
          role: m.role,
          content: m.content,
        }));
        const coachOptions: CoachChatOptions = buildCoachOptions();
        const reply = await sendCoachChat(history, coachOptions);

        const offersParsed = extractAgentOffersFromAssistantMessage(reply);
        setAgentOffers(offersParsed.offers);
        const baseContent = offersParsed.displayContent;

        const arcParsed = extractArcProposalFromAssistantMessage(baseContent);
        if (arcParsed.arcProposal) {
          setArcProposal(arcParsed.arcProposal);
          setArcDraftName(arcParsed.arcProposal.name ?? '');
          setArcDraftNarrative(arcParsed.arcProposal.narrative ?? '');
        }

        const goalParsed = extractGoalProposalFromAssistantMessage(arcParsed.displayContent);
        const bootGoalProposal = goalParsed.goalProposal ?? null;
        if (cancelled) return;
        const bootLeadIn =
          bootGoalProposal && (!goalParsed.displayContent || goalParsed.displayContent.trim().length === 0)
            ? goalCreationDefaultLeadIn
            : goalParsed.displayContent;
        const bootMessageId = streamAssistantReply(bootLeadIn, 'assistant-bootstrap', {
          onDone: () => {
            if (bootGoalProposal) {
              if (bootMessageId) {
                appendGoalProposalTimelineItem(bootGoalProposal, bootMessageId);
              } else {
                commitGoalProposal(bootGoalProposal);
              }
            }
            if (!cancelled) {
              setBootstrapped(true);
              setThinking(false);
            }
          },
        });
      } catch (err) {
        // Any failure bootstrapping the initial reply should surface a friendly
        // error message so the canvas is never left blank.
        console.error('kwilt Coach initial chat failed', err);
        if (!cancelled) {
          setHasTransportError(true);
          const errorMessage: ChatMessage = {
            id: `assistant-error-bootstrap-${Date.now()}`,
            role: 'assistant',
            content:
              'kwilt is having trouble loading right now. Try again in a moment, and if it keeps happening you can check your connection in Settings.',
          };
          setMessages((prev) => {
            const next = [...prev, errorMessage];
            messagesRef.current = next;
            return next;
          });
          onTransportError?.();
        }
      } finally {
        if (!cancelled) {
          // In error cases we still mark as bootstrapped so we don’t loop.
          setBootstrapped(true);
          setThinking(false);
        }
      }
    };

    bootstrapConversation();

    return () => {
      cancelled = true;
    };
  }, [
    mode,
    bootstrapped,
    shouldBootstrapAssistant,
    workflowRuntime,
    launchContext,
    appendGoalProposalTimelineItem,
  ]);

  // When the user re-opens Arc Creation coach, restore any saved draft so they
  // can pick up where they left off instead of starting a fresh thread.
  useEffect(() => {
    if (!isArcCreationMode || !resumeDraft) return;

    let cancelled = false;
    const hydrateDraft = async () => {
      const draft = await loadArcCreationDraft();
      if (cancelled || !draft) return;

      const hasNonSystemMessages = draft.messages.some(
        (message) => message.role !== 'system'
      );
      const hasInput = Boolean(draft.input && draft.input.trim().length > 0);

      // If the persisted draft has no visible conversation or input, treat it
      // as empty so the Arc Creation Agent can still bootstrap a fresh first
      // reply instead of leaving the canvas blank.
      if (!hasNonSystemMessages && !hasInput) {
        await saveArcCreationDraft(null);
        return;
      }

      setMessages(draft.messages);
      messagesRef.current = draft.messages;
      setInput(draft.input ?? '');
      // Mark as bootstrapped so we don't trigger the automatic "first reply"
      // bootstrap when restoring an in-progress Arc conversation with real
      // content.
      setBootstrapped(true);
      setThinking(false);
    };

    void hydrateDraft();

    return () => {
      cancelled = true;
    };
  }, [isArcCreationMode, resumeDraft]);

  const buildCoachOptions = useCallback((): CoachChatOptions => {
    return {
      mode,
      workflowDefinitionId: workflowRuntime?.definition?.id,
      workflowInstanceId: workflowRuntime?.instance?.id,
      workflowStepId: workflowRuntime?.instance?.currentStepId,
      launchContextSummary: launchContext,
    };
  }, [launchContext, mode, workflowRuntime]);

  const sendMessageWithContent = async (rawContent: string) => {
    const trimmed = rawContent.trim();
    setAgentOffers(null);
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    setSending(true);
    setThinking(true);
    // IMPORTANT: some workflow branches immediately invoke an agent step (e.g. goalCreation).
    // Those steps snapshot the chat history synchronously via `getHistory()`. If we only
    // append via a React state updater, the snapshot can race ahead of the state commit and
    // miss the user's latest message. Update the ref synchronously first, then render.
    const nextMessages = [...messagesRef.current, userMessage];
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
    scheduleDraftSave(nextMessages, '');

    const isOnboardingWorkflow =
      workflowRuntime?.definition?.chatMode === 'firstTimeOnboarding';
    const currentWorkflowStepId = workflowRuntime?.instance?.currentStepId;

    // For activity creation, treat the first free-form message as satisfying the
    // initial context collection step. We capture the user's description as
    // the primary prompt and let the model infer finer-grained details.
    if (
      workflowRuntime?.definition?.chatMode === 'activityCreation' &&
      currentWorkflowStepId === 'context_collect'
    ) {
      workflowRuntime.completeStep('context_collect', {
        prompt: trimmed,
      });
    }

    // For goal creation:
    // - The first free-form message satisfies the context collection step.
    // - Subsequent messages are tweak/refine requests; we still route through the same
    //   agent_generate step so the model keeps emitting GOAL_PROPOSAL_JSON reliably.
    if (
      workflowRuntime?.definition?.chatMode === 'goalCreation' &&
      currentWorkflowStepId === 'context_collect'
    ) {
      workflowRuntime.completeStep('context_collect', {
        prompt: trimmed,
      });
      try {
        await workflowRuntime.invokeAgentStep?.({ stepId: 'agent_generate_goals' });
      } finally {
        setSending(false);
        setThinking(false);
      }
      return;
    }

    if (
      workflowRuntime?.definition?.chatMode === 'goalCreation' &&
      currentWorkflowStepId === 'agent_generate_goals'
    ) {
      try {
        await workflowRuntime.invokeAgentStep?.({ stepId: 'agent_generate_goals' });
      } finally {
        setSending(false);
        setThinking(false);
      }
      return;
    }

    // In first-time onboarding, some steps (like desire_clarify) use the user's
    // free-form answer purely as structured workflow data that feeds the next
    // agent_generate step. For these, we complete the workflow step but do NOT
    // trigger an immediate coach chat turn, so we don't end up with two
    // overlapping assistant messages on screen.
    if (isOnboardingWorkflow && currentWorkflowStepId === 'goal_draft') {
      // Treat any reply here as the user's reaction to the draft goal. We
      // advance through goal_draft -> goal_confirm -> arc_introduce without
      // triggering an extra generic coach reply, so the next assistant message
      // they see is the Arc introduction instead of a redundant confirmation.
        workflowRuntime.completeStep('goal_draft');
      workflowRuntime.completeStep('goal_confirm', {
        goalConfirmed: trimmed,
      });
      setSending(false);
      setThinking(false);
      return;
    }

    try {
      const history: CoachChatTurn[] = messagesRef.current.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const coachOptions: CoachChatOptions = buildCoachOptions();
      const reply = await sendCoachChat(history, coachOptions);

      // Parse structured proposal payloads (Arc / Goal) so we can render
      // confirm/apply cards instead of exposing raw JSON in the transcript.
      const offersParsed = extractAgentOffersFromAssistantMessage(reply);
      setAgentOffers(offersParsed.offers);
      const arcParsed = extractArcProposalFromAssistantMessage(offersParsed.displayContent);
      if (arcParsed.arcProposal) {
        setArcProposal(arcParsed.arcProposal);
        setArcDraftName(arcParsed.arcProposal.name ?? '');
        setArcDraftNarrative(arcParsed.arcProposal.narrative ?? '');
      }

      const goalParsed = extractGoalProposalFromAssistantMessage(arcParsed.displayContent);
      const nextGoalProposal = goalParsed.goalProposal ?? null;
      // In goalCreation, proposals are rendered as timeline-anchored cards (and should not
      // replace prior proposals). Do not clear anything here.
      if (mode !== 'goalCreation') {
        commitGoalProposal(null);
      }

      if (mode === 'activityCreation') {
        const proposalParsed = extractActivityProposalFromAssistantMessage(goalParsed.displayContent);
        const activityParsed = extractActivitySuggestionsFromAssistantMessage(proposalParsed.displayContent);
        const suggestions = proposalParsed.suggestion
          ? [proposalParsed.suggestion]
          : activityParsed.suggestions;
        if (suggestions && suggestions.length > 0) {
          setActivitySuggestions(suggestions);
          setAdoptedActivityCount(0);
          setShowActivitySummary(false);
        } else {
          setActivitySuggestions(null);
        }

        if (workflowRuntime?.definition?.chatMode === 'activityCreation') {
          const adoptedCount = activityParsed.suggestions?.length ?? 0;
          workflowRuntime.completeStep(
            'agent_generate_activities',
            { suggestedCount: adoptedCount },
            'agent_generate_activities'
          );
        }

        setHasTransportError(false);
        streamAssistantReply(activityParsed.displayContent, 'assistant', {
          onDone: () => {
            setSending(false);
            setThinking(false);
          },
        });
        return;
      }

      const leadIn =
        nextGoalProposal && (!goalParsed.displayContent || goalParsed.displayContent.trim().length === 0)
          ? hasShownGoalProposalRef.current
            ? 'Here’s an updated goal based on your feedback.'
            : goalCreationDefaultLeadIn
          : goalParsed.displayContent;
      const leadInMessageId = streamAssistantReply(leadIn, 'assistant', {
        onDone: () => {
          if (nextGoalProposal) {
            if (mode === 'goalCreation' && leadInMessageId) {
              appendGoalProposalTimelineItem(nextGoalProposal, leadInMessageId);
            } else {
              commitGoalProposal(nextGoalProposal);
            }
          }
          setSending(false);
          setThinking(false);
        },
      });
    } catch (err) {
      console.error('kwilt Coach chat failed', err);
      const errorMessage: ChatMessage = {
        id: `assistant-error-${Date.now() + 2}`,
        role: 'assistant',
        content:
          'kwilt is having trouble responding right now. Try again in a moment, and if it keeps happening you can check your connection in Settings.',
      };
      setMessages((prev) => {
        const next = [...prev, errorMessage];
        messagesRef.current = next;
        return next;
      });
      setHasTransportError(true);
      onTransportError?.();
    } finally {
      // If the happy-path streaming already cleared `sending`, don’t
      // override it here; this mainly protects the error path.
      setSending((current) => (current ? false : current));
      setThinking(false);
    }
  };

  const handleSend = async () => {
    if (!canSend) {
      return;
    }
    // After the user submits, remove focus from the composer so it doesn't
    // keep the keyboard anchored (especially important inside the agent workspace sheet).
    expandedInputRef.current?.blur?.();
    inputRef.current?.blur?.();
    await sendMessageWithContent(input);
    setInput('');
  };

  const openExpandedComposer = useCallback(() => {
    setIsComposerExpanded(true);
    requestAnimationFrame(() => {
      expandedInputRef.current?.focus?.();
    });
  }, []);

  const closeExpandedComposer = useCallback(() => {
    setIsComposerExpanded(false);
    requestAnimationFrame(() => {
      inputRef.current?.focus?.();
    });
  }, []);

  const [adoptedActivityCount, setAdoptedActivityCount] = useState(0);
  const [showActivitySummary, setShowActivitySummary] = useState(false);
  const [isGeneratingActivitySuggestions, setIsGeneratingActivitySuggestions] = useState(false);
  const [selectedActivityTypes, setSelectedActivityTypes] = useState<ActivityType[]>(() => ['task']);
  const [shouldShowActivityTypeQuestion, setShouldShowActivityTypeQuestion] = useState(false);
  const [activitySuggestionEdits, setActivitySuggestionEdits] = useState<Record<string, string>>(
    {},
  );
  const [editingActivitySuggestionId, setEditingActivitySuggestionId] = useState<string | null>(
    null,
  );
  const activitySuggestionInputRefs = useRef<Record<string, TextInput | null>>({});

  const buildActivityCreationBootstrapCopy = useCallback((): string => {
    const focusedGoalTitle = extractFocusedGoalTitleFromLaunchContext(launchContext);
    if (focusedGoalTitle) {
      return [
        `You're currently working on a goal called **${focusedGoalTitle}.**`,
        "What kinds of activities would you like suggestions for? Pick any types below, and I’ll generate a short set for this week.",
      ].join(' ');
    }
    return "What kinds of activities would you like suggestions for? Pick any types below, and I’ll generate a short set for this week.";
  }, [launchContext]);

  const fetchActivitySuggestionsOnly = useCallback(
    async (params?: { reason?: 'bootstrap' | 'regenerate' }) => {
      const reason = params?.reason ?? 'bootstrap';
      setIsGeneratingActivitySuggestions(true);
      setHasTransportError(false);

      try {
        const canonicalSelectedTypes = (selectedActivityTypes ?? []).filter(
          (value) => typeof value === 'string' && !value.startsWith('custom:'),
        ) as Array<Exclude<ActivityType, `custom:${string}`>>;
        const selectedTypesGuidance =
          canonicalSelectedTypes.length > 0
            ? [
                `The user selected these activity types: ${canonicalSelectedTypes.join(', ')}.`,
                'Rules:',
                '- Use ONLY these canonical types (do not emit any "custom:*" types).',
                '- Every suggestion MUST include a `type` field.',
                '- If exactly 1 type is selected, ALL suggestions should use that type.',
                '- If multiple types are selected, diversify across them and try to include at least 1 suggestion per selected type (up to 5 suggestions total).',
                '- For "shopping_list" and "checklist", express the content as steps (each step is one item).',
                '- For "instructions", include steps that read like a short recipe / how-to.',
                '- For "plan", include steps that read like a simple timeline or sequence.',
              ].join('\n')
            : null;

        const enforceSelectedTypesOnSuggestions = (
          suggestions: ActivitySuggestion[],
          selectedTypes: Array<Exclude<ActivityType, `custom:${string}`>>,
        ): ActivitySuggestion[] => {
          const desired = (selectedTypes ?? []).filter(
            (t) => t === 'task' || t === 'checklist' || t === 'shopping_list' || t === 'instructions' || t === 'plan',
          );
          if (desired.length === 0) return suggestions;
          if (suggestions.length === 0) return suggestions;

          // Clone defensively so we don't mutate parsed objects in place.
          const next = suggestions.map((s) => ({ ...s }));

          if (desired.length === 1) {
            const only = desired[0];
            return next.map((s) => ({ ...s, type: only }));
          }

          // 1) Normalize: if a suggestion has an invalid/missing type, clear it so we can fill it.
          for (let i = 0; i < next.length; i++) {
            const t = next[i].type;
            if (!t || !desired.includes(t as any)) {
              next[i] = { ...next[i], type: undefined };
            }
          }

          // 2) Ensure at least one suggestion per desired type (as long as we have enough suggestions).
          const maxCover = Math.min(next.length, desired.length);
          for (let i = 0; i < maxCover; i++) {
            next[i] = { ...next[i], type: desired[i] };
          }

          // 3) Fill any remaining missing types by cycling through the desired list.
          let cursor = 0;
          for (let i = 0; i < next.length; i++) {
            if (!next[i].type) {
              next[i] = { ...next[i], type: desired[cursor % desired.length] };
              cursor += 1;
            }
          }

          return next;
        };

        const history: CoachChatTurn[] = messagesRef.current.map((m) => ({
          role: m.role,
          content: m.content,
        }));
        history.push({
          role: 'system',
          content:
            'Return ONLY an ACTIVITY_SUGGESTIONS_JSON payload and nothing else.\n' +
            'Format:\n' +
            'ACTIVITY_SUGGESTIONS_JSON: {"suggestions":[{...}]}\n' +
            'Each suggestion MUST include: id (string), title (string), why (string), timeEstimateMinutes (number), type ("task"|"checklist"|"shopping_list"|"instructions"|"plan").\n' +
            'Each suggestion MAY include: type ("task"|"checklist"|"shopping_list"|"instructions"|"plan"), steps (array of {title,isOptional}), energyLevel ("light"|"focused"), kind ("setup"|"progress"|"maintenance"|"stretch").\n' +
            'If the user request implies a checklist-style output (for example, a shopping list, a packing list, or a meal-prep plan), express it via `steps` and set type appropriately ("shopping_list", "checklist", or "instructions").\n' +
            (selectedTypesGuidance ? `${selectedTypesGuidance}\n` : '') +
            'Do not include markdown fences. Do not include prose before or after.',
        });

        const coachOptions: CoachChatOptions = buildCoachOptions();
        const reply = await sendCoachChat(history, coachOptions);
        const proposalParsed = extractActivityProposalFromAssistantMessage(reply);
        const activityParsed = extractActivitySuggestionsFromAssistantMessage(
          proposalParsed.displayContent,
        );
        const suggestions = proposalParsed.suggestion
          ? [proposalParsed.suggestion]
          : activityParsed.suggestions;

        const nextSuggestionsRaw = suggestions && suggestions.length > 0 ? suggestions : null;
        const nextSuggestions = nextSuggestionsRaw
          ? enforceSelectedTypesOnSuggestions(nextSuggestionsRaw, canonicalSelectedTypes)
          : null;
        setActivitySuggestions(nextSuggestions);
        setEditingActivitySuggestionId(null);
        setActivitySuggestionEdits({});

        if (nextSuggestions) {
          setAdoptedActivityCount(0);
          setShowActivitySummary(false);
        }

        if (workflowRuntime?.definition?.chatMode === 'activityCreation') {
          workflowRuntime.completeStep(
            'agent_generate_activities',
            { suggestedCount: nextSuggestions?.length ?? 0, reason },
            'agent_generate_activities',
          );
        }
      } catch (err) {
        console.error('kwilt Activities AI suggestions-only fetch failed', err);
        setHasTransportError(true);
        setActivitySuggestions(null);
        onTransportError?.();
      } finally {
        setIsGeneratingActivitySuggestions(false);
      }
    },
    [buildCoachOptions, onTransportError, selectedActivityTypes, workflowRuntime],
  );

  useEffect(() => {
    if (!shouldBootstrapAssistant) return;
    if (bootstrapped) return;
    if (mode !== 'activityCreation') return;

    setThinking(false);
    setBootstrapped(true);
    setActivitySuggestions(null);
    setAdoptedActivityCount(0);
    setShowActivitySummary(false);
    setShouldShowActivityTypeQuestion(true);
    streamAssistantReply(buildActivityCreationBootstrapCopy(), 'assistant-bootstrap');
  }, [
    bootstrapped,
    buildActivityCreationBootstrapCopy,
    fetchActivitySuggestionsOnly,
    mode,
    shouldBootstrapAssistant,
  ]);

  const handleRegenerateActivitySuggestions = async () => {
    if (mode === 'activityCreation') {
      await fetchActivitySuggestionsOnly({ reason: 'regenerate' });
      return;
    }
    await sendMessageWithContent(
      'Let’s try a fresh set of concrete activity suggestions for this goal.'
    );
  };

  const getEffectiveActivitySuggestionTitle = useCallback(
    (suggestion: ActivitySuggestion) => {
      const edited = activitySuggestionEdits[suggestion.id];
      const candidate = (edited ?? suggestion.title).trim();
      return candidate || suggestion.title;
    },
    [activitySuggestionEdits],
  );

  // For non-bootstrap modes (like free-form coaching and Arc AI), stream a
  // short assistant intro into the thread so the Agent always "arrives" via
  // the same typing animation as other replies instead of popping in fully
  // formed. We only do this when there are no existing non-system messages,
  // when onboarding presenters are not in control of the opening copy, and
  // when there is no dedicated stepCard mounted (for example, Arc / Goal
  // creation context collectors). This ensures we never surface a global
  // intro message at the same moment as a structured step card.
  useEffect(() => {
    if (shouldBootstrapAssistant) return;
    if (isOnboardingMode) return;
    if (bootstrapped) return;
    if (hasStepCard) return;

    const hasNonSystemMessages = messagesRef.current.some((m) => m.role !== 'system');
    if (hasNonSystemMessages) return;

    let cancelled = false;

    streamAssistantReply(COACH_INTRO_TEXT, 'assistant-bootstrap', {
      onDone: () => {
        if (!cancelled) {
          setBootstrapped(true);
          setThinking(false);
        }
      },
    });

    return () => {
      cancelled = true;
    };
  }, [bootstrapped, hasStepCard, isOnboardingMode, shouldBootstrapAssistant]);

  const handleAcceptSuggestion = useCallback(
    (suggestion: ActivitySuggestion, titleOverride?: string) => {
      const resolvedTitle = (titleOverride ?? suggestion.title).trim() || suggestion.title;
      const resolvedSuggestion =
        resolvedTitle === suggestion.title ? suggestion : { ...suggestion, title: resolvedTitle };
      if (onAdoptActivitySuggestion) {
        onAdoptActivitySuggestion(resolvedSuggestion);
      }
      // Mark the confirm step as completed the first time the user adopts an
      // suggestion, so the workflow instance reflects that at least one
      // activity was chosen.
      if (workflowRuntime?.definition?.chatMode === 'activityCreation') {
        workflowRuntime.completeStep('confirm_activities', {
          adoptedActivityTitles: [resolvedTitle],
        });
      }
      setAdoptedActivityCount((count) => count + 1);
      setEditingActivitySuggestionId((current) => (current === suggestion.id ? null : current));
      setActivitySuggestionEdits((current) => {
        if (!Object.prototype.hasOwnProperty.call(current, suggestion.id)) return current;
        const { [suggestion.id]: _removed, ...rest } = current;
        return rest;
      });
      setActivitySuggestions((current) => {
        if (!current) return current;
        const next = current.filter((entry) => entry.id !== suggestion.id);
        return next.length === 0 ? null : next;
      });
      // When suggestions run out after adopting one, surface a short
      // inline summary so the user has clear closure on what was added.
      setShowActivitySummary((current) =>
        activitySuggestions && activitySuggestions.length > 1 ? current : true
      );
    },
    [onAdoptActivitySuggestion, activitySuggestions, workflowRuntime]
  );

  const handleAcceptAllSuggestions = useCallback(() => {
    if (activitySuggestions && activitySuggestions.length > 0) {
      if (onAdoptActivitySuggestion) {
        activitySuggestions.forEach((suggestion) => {
          const resolvedTitle = getEffectiveActivitySuggestionTitle(suggestion);
          onAdoptActivitySuggestion(
            resolvedTitle === suggestion.title ? suggestion : { ...suggestion, title: resolvedTitle },
          );
        });
        setAdoptedActivityCount((count) => count + activitySuggestions.length);
      }

      if (workflowRuntime?.definition?.chatMode === 'activityCreation') {
        const adoptedActivityTitles = activitySuggestions.map(getEffectiveActivitySuggestionTitle);
        workflowRuntime.completeStep('confirm_activities', {
          adoptedActivityTitles,
        });
      }
    }
    // Clear the suggestion rail and show the confirmation summary once
    // everything has been adopted.
    setActivitySuggestions(null);
    setShowActivitySummary(true);
    setEditingActivitySuggestionId(null);
    setActivitySuggestionEdits({});
  }, [activitySuggestions, getEffectiveActivitySuggestionTitle, onAdoptActivitySuggestion, workflowRuntime]);

  const scrollToLatest = () => {
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  const scrollToFocusedInput = useCallback(
    (extraOffset: number = spacing.lg) => {
      // Ensures inline TextInputs inside the timeline (e.g. onboarding cards,
      // arc/goal drafts) scroll into view when the keyboard opens. This is more
      // reliable than KeyboardAvoidingView when hosted inside transformed sheets.
      const getter = (TextInput.State as any)?.currentlyFocusedInput;
      const focused = typeof getter === 'function' ? getter() : null;

      const nodeHandle =
        typeof focused === 'number' ? focused : focused ? findNodeHandle(focused) : null;

      if (!nodeHandle || !scrollRef.current) return;

      try {
        (scrollRef.current as any).scrollResponderScrollNativeHandleToKeyboard(
          nodeHandle,
          extraOffset,
          true,
        );
      } catch {
        // Best-effort: if the responder API isn't available, do nothing.
      }
    },
    [scrollRef],
  );

  const alignFocusedInputToKeyboard = useCallback(
    (gapPx: number = 0) => {
      // Align the *bottom* of the focused input to sit `gapPx` above the keyboard top.
      // This is more reliable (and less jumpy) than `scrollResponderScrollNativeHandleToKeyboard`
      // when the chat is hosted inside transformed surfaces (e.g., BottomDrawer).
      const rawKeyboardHeight = keyboardRawHeightRef.current;
      if (!rawKeyboardHeight || !scrollRef.current) return;

      const getter = (TextInput.State as any)?.currentlyFocusedInput;
      const focused = typeof getter === 'function' ? getter() : null;
      const nodeHandle =
        typeof focused === 'number' ? focused : focused ? findNodeHandle(focused) : null;
      if (!nodeHandle) return;

      const windowHeight = Dimensions.get('window').height;
      const keyboardTopY = windowHeight - rawKeyboardHeight;
      const desiredBottomY = keyboardTopY - gapPx;

      UIManager.measureInWindow(nodeHandle, (_x, y, _w, h) => {
        const bottomY = y + h;
        const delta = bottomY - desiredBottomY;
        // If we're within a couple pixels, avoid jitter.
        if (Math.abs(delta) < 2) return;
        // Positive delta => input is too low (covered); increase scroll offset.
        // Negative delta => input is too high; decrease scroll offset.
        const targetY = Math.max(0, scrollOffsetRef.current + delta);
        scrollRef.current?.scrollTo({ y: targetY, animated: true });
      });
    },
    [scrollRef],
  );

  useEffect(() => {
    scrollToLatest();
  }, [messages.length]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Persist any in-progress input so a user can be interrupted mid-sentence and
  // still have their draft waiting when they return to Arc creation.
  useEffect(() => {
    if (!isArcCreationMode) return;
    scheduleDraftSave(messagesRef.current, input);
  }, [input, isArcCreationMode]);

  // Keep the composer and submit button fully visible by lifting them above
  // the software keyboard. Because the chat lives inside a custom bottom sheet
  // (with its own transforms), the standard KeyboardAvoidingView behavior
  // isn’t enough, so we adjust the bottom margin manually.
  //
  // Keyboard strategy reference:
  // - `docs/keyboard-input-safety-implementation.md`
  useEffect(() => {
    const setTo = (rawHeight: number) => {
      keyboardRawHeightRef.current = rawHeight;
      // iOS keyboard heights often include the home-indicator safe area.
      // If the host already pads its surface by `insets.bottom` (e.g. BottomDrawer),
      // subtract it to avoid double-offsetting. Full-screen hosts should use the raw height.
      const safeAreaToSubtract =
        Platform.OS === 'ios' && hostBottomInsetAlreadyApplied ? insets.bottom : 0;
      const adjusted = Math.max(0, rawHeight - safeAreaToSubtract);
      setKeyboardHeight(adjusted);

      if (adjusted > 0) {
        // Defer the reveal until after the ScrollView padding + composer positioning
        // updates have been committed to layout.
        pendingRevealRef.current = true;
      }
    };

    // iOS: keyboard height can change without hide/show (QuickType bar, emoji keyboard,
    // dictation, etc). Track frame changes so our padding/margins don’t go stale.
    if (Platform.OS === 'ios') {
      const showSub = Keyboard.addListener('keyboardWillShow', (e: any) => {
        const next = e?.endCoordinates?.height ?? 0;
        setTo(next);
      });
      const frameSub = Keyboard.addListener('keyboardWillChangeFrame', (e: any) => {
        const next = e?.endCoordinates?.height ?? 0;
        setTo(next);
      });
      const hideSub = Keyboard.addListener('keyboardWillHide', () => {
        pendingRevealRef.current = false;
        setTo(0);
      });

      return () => {
        showSub.remove();
        frameSub.remove();
        hideSub.remove();
        if (draftSaveTimeoutRef.current) {
          clearTimeout(draftSaveTimeoutRef.current);
        }
      };
    }

    // Android: events arrive after animations; DidShow/DidHide is fine.
    const showSub = Keyboard.addListener('keyboardDidShow', (e: any) => {
      const next = e?.endCoordinates?.height ?? 0;
      setTo(next);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      pendingRevealRef.current = false;
      setTo(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }
    };
  }, [
    alignFocusedInputToKeyboard,
    hostBottomInsetAlreadyApplied,
    insets.bottom,
    keyboardClearance,
  ]);

  // Run the reveal after the keyboard-driven layout update has been applied.
  // This avoids the “scroll to correct spot, then settle to a wrong spot” behavior
  // that happens when we measure/scroll during the keyboard animation.
  useLayoutEffect(() => {
    if (keyboardHeight <= 0) return;
    if (!pendingRevealRef.current) return;
    pendingRevealRef.current = false;

    // At this point our keyboard-driven padding + composer positioning has been
    // applied; do a single measurement-based alignment pass.
    requestAnimationFrame(() => {
      alignFocusedInputToKeyboard(keyboardClearance);
    });
  }, [alignFocusedInputToKeyboard, keyboardClearance, keyboardHeight, resolvedPaddingBottom]);

  const workflowInfoTitle = modeLabel ?? workflowLabel ?? 'AI coach';
  const workflowInfoSubtitle =
    mode === 'goalCreation'
      ? 'This coach helps you shape one clear 30–90 day goal inside your life architecture, using any Arc and Goal context the app has already collected.'
      : mode === 'activityCreation'
      ? 'This coach helps you turn your current goals and arcs into small, concrete activities you can actually do in the near term.'
      : mode === 'firstTimeOnboarding'
      ? 'This guide helps you define an initial identity direction and aspiration using quick, tap-first inputs.'
      : isArcCreationMode
      ? 'This coach helps you design one long‑term Arc for your life — not manage tasks or habits.'
      : 'This coach adapts to the current workflow and context on this screen so you can move forward with less typing.';


  return (
    <>
      <View style={styles.flex}>
        <View
          style={styles.body}
          onTouchEnd={() => {
            // Only allow "tap anywhere to skip typing" when the composer is hidden.
            // When the composer is visible, the user's tap (e.g. Send / focus input)
            // can inadvertently skip the very next assistant message, making it look
            // like typing never happened.
            if (!shouldShowComposer) {
              // Avoid skipping while the user is actively interacting with an input
              // (e.g. onboarding textarea). Otherwise, focusing/tapping can instantly
              // "fast-forward" the next assistant message and break gradual disclosure.
              const getter = (TextInput.State as any)?.currentlyFocusedInput;
              const focused = typeof getter === 'function' ? getter() : null;
              const hasFocusedInput = Boolean(focused);
              const isKeyboardOpen = keyboardHeight > 0;
              if (!hasFocusedInput && !isKeyboardOpen) {
                typingControllerRef.current?.skip();
              }
            }
            // In workflows that collect input inside the timeline (e.g. FTUE),
            // a user may focus an input while the keyboard is already open.
            // Nudge the ScrollView to reveal the focused field on every tap.
            // Important: prefer the measure-based alignment (less "jumpy" than
            // scrollResponderScrollNativeHandleToKeyboard) so repeated taps don't
            // subtly change the card's resting position.
            if (!shouldShowComposer) {
              requestAnimationFrame(() => {
                alignFocusedInputToKeyboard(keyboardClearance);
              });
            }
          }}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: resolvedPaddingBottom }]}
            showsVerticalScrollIndicator={false}
            // AiChatScreen already manages keyboard-safe layout (keyboard height padding + scroll-to-focus).
            // Leaving RN's automatic keyboard inset adjustment on can double-apply offsets,
            // especially when hosted inside BottomDrawer or other transformed surfaces.
            automaticallyAdjustKeyboardInsets={false}
            keyboardShouldPersistTaps="handled"
            onScroll={(event) => {
              scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            onContentSizeChange={scrollToLatest}
          >
              <View style={styles.timeline}>
              {!hideBrandHeader && (
                <View style={styles.headerRow}>
                  <BrandLockup logoSize={32} wordmarkSize="sm" />
                  {shouldShowContextPill && contextPillLabel && (
                    <Pressable
                      style={styles.modePill}
                      onPress={() => setIsWorkflowInfoVisible(true)}
                      accessibilityRole="button"
                      accessibilityLabel="View context"
                    >
                      <Text style={styles.modePillText}>Context</Text>
                      <Icon
                        name="info"
                        size={16}
                        color={CHAT_COLORS.textSecondary}
                        style={styles.modePillInfoIcon}
                      />
                    </Pressable>
                  )}
                </View>
              )}
              <View
                style={[
                  styles.messagesStack,
                  hideBrandHeader && !hasVisibleMessages && styles.messagesStackCompact,
                ]}
              >
                {messages
                  .filter((message) => message.role !== 'system')
                  .map((message) => {
                    const anchoredProposals = goalProposalTimeline.filter(
                      (item) => item.anchorMessageId === message.id
                    );
                    return (
                      <Fragment key={message.id}>
                        {message.role === 'assistant' ? (
                          <Pressable
                            style={styles.assistantMessage}
                            onPress={() => typingControllerRef.current?.skip()}
                            accessibilityRole="button"
                            accessibilityLabel="Skip assistant typing and show full message"
                          >
                            <Markdown style={markdownStyles}>{message.content}</Markdown>
                          </Pressable>
                        ) : (
                          <UserMessageBubble content={message.content} />
                        )}
                        {mode === 'goalCreation'
                          ? anchoredProposals.map((item) => renderGoalProposalCard(item))
                          : null}
                      </Fragment>
                    );
                  })}

                {mode === 'activityCreation' &&
                  bootstrapped &&
                  shouldShowActivityTypeQuestion &&
                  !activitySuggestions &&
                  !isGeneratingActivitySuggestions &&
                  !showActivitySummary && (
                    <QuestionCard title="What kinds of activities do you want? (Pick any)">
                      <View style={styles.activityTypeFullWidthList}>
                        {(
                          [
                            {
                              value: 'task',
                              label: 'Tasks',
                            },
                            {
                              value: 'checklist',
                              label: 'Checklist',
                            },
                            {
                              value: 'shopping_list',
                              label: 'Shopping list',
                            },
                            {
                              value: 'instructions',
                              label: 'Instructions',
                            },
                            {
                              value: 'plan',
                              label: 'Plan',
                            },
                          ] as const
                        ).map((option) => {
                          const selected = selectedActivityTypes.includes(option.value);
                          return (
                            <Pressable
                              key={option.value}
                              style={[
                                styles.activityTypeFullWidthOption,
                                selected && styles.activityTypeFullWidthOptionSelected,
                              ]}
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: selected }}
                              accessibilityLabel={`Toggle activity type: ${option.label}`}
                              onPress={() => {
                                setSelectedActivityTypes((current) => {
                                  const exists = current.includes(option.value);
                                  if (exists) {
                                    return current.filter((value) => value !== option.value);
                                  }
                                  return [...current, option.value];
                                });
                              }}
                            >
                              <View style={styles.activityTypeFullWidthOptionContent}>
                                <View
                                  style={[
                                    styles.activityTypeCheckboxOuter,
                                    selected && styles.activityTypeCheckboxOuterSelected,
                                  ]}
                                >
                                  {selected ? (
                                    <Icon name="check" size={14} color={colors.canvas} />
                                  ) : null}
                                </View>
                                <Text
                                  style={[
                                    styles.activityTypeFullWidthOptionLabel,
                                    selected && styles.activityTypeFullWidthOptionLabelSelected,
                                  ]}
                                >
                                  {option.label}
                                </Text>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>

                      <View style={styles.activityTypeQuestionFooterRow}>
                        <Button
                          variant="outline"
                          size="md"
                          onPress={() => {
                            setSelectedActivityTypes([
                              'task',
                              'checklist',
                              'shopping_list',
                              'instructions',
                              'plan',
                            ]);
                          }}
                        >
                          <Text style={styles.activityTypeQuestionSecondaryCta}>Select all</Text>
                        </Button>
                        <Button
                          variant="accent"
                          size="md"
                          disabled={selectedActivityTypes.length === 0}
                          onPress={async () => {
                            setShouldShowActivityTypeQuestion(false);
                            await fetchActivitySuggestionsOnly({ reason: 'bootstrap' });
                          }}
                        >
                          <Text style={styles.activityTypeQuestionPrimaryCta}>Continue</Text>
                        </Button>
                      </View>
                    </QuestionCard>
                  )}

                {mode === 'activityCreation' &&
                  (activitySuggestions || isGeneratingActivitySuggestions) &&
                  bootstrapped &&
                  !showActivitySummary && (
                    <View style={styles.activitySuggestionsStack}>
                      <Text style={styles.activitySuggestionsLabel}>Suggested activities</Text>
                      {adoptedActivityCount > 0 && (
                        <View style={styles.activityInlineConfirmationRow}>
                          <Text style={styles.activityInlineConfirmationText}>
                            {adoptedActivityCount === 1
                              ? 'Added to Activities.'
                              : `${adoptedActivityCount} activities added so far.`}
                          </Text>
                          {onDismiss && (
                            <Button
                              variant="ghost"
                              size="small"
                              onPress={onDismiss}
                            >
                              <Text style={styles.activityInlineConfirmationDismissLabel}>
                                Close Activities AI
                              </Text>
                            </Button>
                          )}
                        </View>
                      )}
                      <VStack space="xs">
                        {activitySuggestions
                          ? activitySuggestions.map((suggestion) => (
                              <Card
                                key={suggestion.id}
                                padding="none"
                                style={styles.activitySuggestionCard}
                              >
                                <HStack
                                  space="sm"
                                  alignItems="center"
                                  justifyContent="space-between"
                                  style={styles.activitySuggestionRow}
                                >
                                  {editingActivitySuggestionId === suggestion.id ? (
                                    <View style={styles.activitySuggestionTitlePressable}>
                                      <TextInput
                                        ref={(node) => {
                                          activitySuggestionInputRefs.current[suggestion.id] = node;
                                        }}
                                        style={styles.activitySuggestionTitleInput}
                                        value={
                                          activitySuggestionEdits[suggestion.id] ?? suggestion.title
                                        }
                                        onChangeText={(text) => {
                                          setActivitySuggestionEdits((current) => ({
                                            ...current,
                                            [suggestion.id]: text,
                                          }));
                                        }}
                                        placeholder="Edit activity"
                                        placeholderTextColor={CHAT_COLORS.textSecondary}
                                        multiline={false}
                                        numberOfLines={1}
                                        returnKeyType="done"
                                        blurOnSubmit
                                        onSubmitEditing={() => {
                                          activitySuggestionInputRefs.current[suggestion.id]?.blur();
                                        }}
                                        onBlur={() => {
                                          setEditingActivitySuggestionId((current) =>
                                            current === suggestion.id ? null : current,
                                          );
                                        }}
                                        accessibilityLabel={`Activity title input for ${suggestion.title}`}
                                      />
                                    </View>
                                  ) : (
                                    <Pressable
                                      style={styles.activitySuggestionTitlePressable}
                                      accessibilityRole="button"
                                      accessibilityLabel={`Edit suggested activity: ${suggestion.title}`}
                                      onPress={() => {
                                        setActivitySuggestionEdits((current) => {
                                          if (
                                            Object.prototype.hasOwnProperty.call(
                                              current,
                                              suggestion.id,
                                            )
                                          ) {
                                            return current;
                                          }
                                          return { ...current, [suggestion.id]: suggestion.title };
                                        });
                                        setEditingActivitySuggestionId(suggestion.id);
                                        requestAnimationFrame(() => {
                                          activitySuggestionInputRefs.current[suggestion.id]?.focus();
                                        });
                                      }}
                                      hitSlop={8}
                                    >
                                      <Text
                                        style={styles.activitySuggestionTitle}
                                        numberOfLines={2}
                                        ellipsizeMode="tail"
                                      >
                                        {getEffectiveActivitySuggestionTitle(suggestion)}
                                      </Text>
                                    </Pressable>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="small"
                                    onPress={() => {
                                      handleAcceptSuggestion(
                                        suggestion,
                                        getEffectiveActivitySuggestionTitle(suggestion),
                                      );
                                    }}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Add activity: ${getEffectiveActivitySuggestionTitle(
                                      suggestion,
                                    )}`}
                                  >
                                    <HStack space="xs" alignItems="center">
                                      <Icon name="plus" color={CHAT_COLORS.textPrimary} size={14} />
                                      <ButtonLabel size="sm">Add</ButtonLabel>
                                    </HStack>
                                  </Button>
                                </HStack>
                              </Card>
                            ))
                          : Array.from({ length: 3 }).map((_, idx) => (
                              <Card
                                key={`activity-skeleton-${idx}`}
                                padding="none"
                                style={styles.activitySuggestionCard}
                              >
                                <HStack
                                  space="sm"
                                  alignItems="center"
                                  justifyContent="space-between"
                                  style={styles.activitySuggestionRow}
                                >
                                  <View style={styles.activitySuggestionTitlePressable}>
                                    <View
                                      style={[
                                        styles.activitySuggestionSkeletonBlock,
                                        styles.activitySuggestionSkeletonTitle,
                                      ]}
                                    />
                                  </View>
                                  <Button variant="outline" size="small" disabled>
                                    <HStack space="xs" alignItems="center">
                                      <Icon
                                        name="plus"
                                        color={CHAT_COLORS.textSecondary}
                                        size={14}
                                      />
                                      <ButtonLabel size="sm">Add</ButtonLabel>
                                    </HStack>
                                  </Button>
                                </HStack>
                              </Card>
                            ))}
                      </VStack>
                      <View style={styles.activitySuggestionsFooterRow}>
                        <View style={styles.activitySuggestionsButtonGroup}>
                          <Button
                            variant="outline"
                            size="md"
                            onPress={handleRegenerateActivitySuggestions}
                            disabled={isGeneratingActivitySuggestions}
                          >
                            <HStack space="xs" alignItems="center">
                              <Icon name="refresh" size={14} color={CHAT_COLORS.textPrimary} />
                              <ButtonLabel size="md">Generate again</ButtonLabel>
                            </HStack>
                          </Button>
                          <Button
                            variant="primary"
                            size="md"
                            onPress={handleAcceptAllSuggestions}
                            disabled={!activitySuggestions || activitySuggestions.length === 0}
                          >
                            <ButtonLabel size="md" tone="inverse">
                              Add all
                            </ButtonLabel>
                          </Button>
                        </View>
                      </View>
                    </View>
                  )}

                {mode === 'activityCreation' &&
                  showActivitySummary &&
                  adoptedActivityCount > 0 && (
                    <View style={styles.activitySummaryCard}>
                      <Text style={styles.activitySummaryTitle}>Activities added</Text>
                      <Text style={styles.activitySummaryBody}>
                        {adoptedActivityCount === 1
                          ? '1 activity was added to your list.'
                          : `${adoptedActivityCount} activities were added to your list.`}
                      </Text>
                      <View style={styles.activitySummaryActionsRow}>
                        <Button
                          variant="outline"
                          size="small"
                          onPress={() => {
                            setShowActivitySummary(false);
                            void handleRegenerateActivitySuggestions();
                          }}
                        >
                          <Text style={styles.activitySuggestionRegenerateLabel}>
                            Get more ideas
                          </Text>
                        </Button>
                        {onDismiss && (
                          <Button
                            variant="primary"
                            size="small"
                            onPress={onDismiss}
                          >
                            <ButtonLabel size="sm" tone="inverse">
                              Done for now
                            </ButtonLabel>
                          </Button>
                        )}
                      </View>
                    </View>
                  )}

                {mode === 'activityCreation' && hasTransportError && (
                  <View style={styles.manualFallbackCard}>
                    <Text style={styles.manualFallbackTitle}>Add an activity manually</Text>
                    <Text style={styles.manualFallbackBody}>
                      If AI is having trouble loading, you can still add an activity yourself.
                    </Text>
                    <Button
                      variant="outline"
                      onPress={() => {
                        onManualFallbackRequested?.();
                      }}
                    >
                      <Text style={styles.manualFallbackButtonText}>Create manually instead</Text>
                    </Button>
                  </View>
                )}

                {isArcCreationMode && arcProposal && (
                  <View style={styles.arcDraftCard}>
                    <Text style={styles.arcDraftLabel}>Proposed Arc</Text>
                    <TextInput
                      style={styles.arcDraftNameInput}
                      value={arcDraftName}
                      onChangeText={setArcDraftName}
                      placeholder="Arc name"
                      placeholderTextColor={CHAT_COLORS.textSecondary}
                    />
                    <TextInput
                      style={styles.arcDraftNarrativeInput}
                      value={arcDraftNarrative}
                      onChangeText={setArcDraftNarrative}
                      placeholder="Arc narrative"
                      placeholderTextColor={CHAT_COLORS.textSecondary}
                      multiline
                    />
                    <View style={styles.arcDraftButtonsRow}>
                      <Button
                        variant="outline"
                        onPress={() => {
                          setArcProposal(null);
                          setArcDraftName('');
                          setArcDraftNarrative('');
                          setIsFeedbackInlineVisible(false);
                        }}
                      >
                        <Text style={styles.arcDraftSecondaryButtonText}>Not now</Text>
                      </Button>
                      <Button
                        variant="ghost"
                        onPress={() => {
                          setFeedbackReasons([]);
                          setFeedbackNote('');
                          setIsFeedbackInlineVisible((current) => !current);
                        }}
                      >
                        <Text style={styles.arcDraftSecondaryButtonText}>Not quite</Text>
                      </Button>
                      <Button
                        variant="ai"
                        onPress={async () => {
                          if (!arcProposal) return;
                          const name = (arcDraftName || arcProposal.name || '').trim();
                          const narrative = (arcDraftNarrative || arcProposal.narrative || '').trim();
                          if (!name) {
                            return;
                          }

                          const finalized: GeneratedArc = {
                            ...arcProposal,
                            name,
                            narrative,
                          };

                          setArcProposal(finalized);
                          setIsFeedbackInlineVisible(false);
                          await saveArcCreationDraft(null);
                          if (workflowRuntime?.definition?.chatMode === 'arcCreation') {
                            workflowRuntime.completeStep('confirm_arc');
                          }
                          if (onConfirmArc) {
                            onConfirmArc(finalized);
                          }
                        }}
                      >
                        <Text style={styles.arcDraftConfirmText}>Adopt Arc</Text>
                      </Button>
                    </View>
                    {isFeedbackInlineVisible ? (
                      <View style={styles.arcDraftInlineFeedback}>
                        <Text style={styles.feedbackTitle}>Help refine this Arc</Text>
                        <Text style={styles.feedbackBody}>
                          What feels off about this suggestion? Pick any that apply and add a short note if
                          helpful.
                        </Text>
                        <View style={styles.feedbackChipsRow}>
                          {ARC_FEEDBACK_REASONS.map((reason) => {
                            const selected = feedbackReasons.includes(reason.value);
                            return (
                              <Button
                                key={reason.value}
                                variant={selected ? 'secondary' : 'outline'}
                                size="small"
                                style={styles.feedbackChip}
                                onPress={() => {
                                  setFeedbackReasons((current) =>
                                    current.includes(reason.value)
                                      ? current.filter((value) => value !== reason.value)
                                      : [...current, reason.value],
                                  );
                                }}
                              >
                                <Text
                                  style={
                                    selected
                                      ? styles.feedbackChipTextSelected
                                      : styles.feedbackChipTextUnselected
                                  }
                                >
                                  {reason.label}
                                </Text>
                              </Button>
                            );
                          })}
                        </View>
                        <View style={styles.feedbackNoteContainer}>
                          <Text style={styles.feedbackNoteLabel}>In your own words</Text>
                          <TextInput
                            style={styles.feedbackNoteInput}
                            value={feedbackNote}
                            onChangeText={setFeedbackNote}
                            placeholder="e.g. This sounds like a short project, I wanted a longer storyline."
                            placeholderTextColor={CHAT_COLORS.textSecondary}
                            multiline
                          />
                        </View>
                        <View style={styles.feedbackButtonsRow}>
                          <Button
                            variant="outline"
                            onPress={() => {
                              setIsFeedbackInlineVisible(false);
                              setFeedbackReasons([]);
                              setFeedbackNote('');
                            }}
                          >
                            <Text style={styles.arcDraftSecondaryButtonText}>Cancel</Text>
                          </Button>
                          <Button
                            variant="ai"
                            onPress={() => {
                              if (!arcProposal) {
                                setIsFeedbackInlineVisible(false);
                                return;
                              }
                              const payload: ArcProposalFeedback = {
                                id: `arc-feedback-${Date.now()}`,
                                arcName: arcProposal.name,
                                arcNarrative: arcProposal.narrative,
                                decision: 'down',
                                reasons: feedbackReasons,
                                note: feedbackNote.trim() || undefined,
                                createdAt: new Date().toISOString(),
                              };
                              addArcFeedback(payload);
                              setIsFeedbackInlineVisible(false);
                              setFeedbackReasons([]);
                              setFeedbackNote('');
                            }}
                          >
                            <Text style={styles.arcDraftConfirmText}>Save feedback</Text>
                          </Button>
                        </View>
                      </View>
                    ) : null}
                  </View>
                )}

                {thinking && (
                  <View style={styles.assistantMessage}>
                    <ThinkingBubble />
                  </View>
                )}
              </View>

              {shouldShowAgeQuestion && (
                <View style={styles.ageQuestionCard}>
                  <Text style={styles.ageQuestionTitle}>What’s your age range?</Text>
                  <View style={styles.ageChipsRow}>
                    {AGE_RANGE_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        variant="outline"
                        style={styles.ageChip}
                        onPress={() => handleSelectAgeRange(option.value)}
                      >
                        <Text style={styles.ageChipLabel}>{option.label}</Text>
                      </Button>
                    ))}
                  </View>
                </View>
              )}

              {/* Workflow-specific UI enters the chat as an inline card. The
                  `stepCard` prop is a generic React node (often composed from
                  Card, QuestionCard, etc.), not a special StepCard class. */}
              {mode === 'activityGuidance' && agentOffers && agentOffers.length > 0 && (
                <View style={styles.stepCardHost}>
                  <QuestionCard title="How can I help?">
                    <VStack space="xs">
                      {agentOffers.map((offer) => (
                        <Button
                          key={offer.id}
                          variant="outline"
                          onPress={() => {
                            setAgentOffers(null);
                            void sendMessageWithContent(offer.userMessage);
                          }}
                        >
                          <Text>{offer.title}</Text>
                        </Button>
                      ))}
                    </VStack>
                  </QuestionCard>
                </View>
              )}
              {stepCard ? (
                <View
                  style={[
                    styles.stepCardHost,
                    // Hard rule: step cards should not be visible until after any assistant
                    // typing animation finishes. Important: keep them mounted so their
                    // internal state/effects don't restart (which can cause streaming loops).
                    isAssistantTyping ? styles.stepCardHostHiddenWhileTyping : null,
                  ]}
                  pointerEvents={isAssistantTyping ? 'none' : 'auto'}
                >
                  {stepCard}
                </View>
              ) : null}
            </View>
          </ScrollView>

          {shouldShowComposer && (
            <View
              style={[
                styles.composerFence,
                {
                  bottom: composerBottom,
                  left: -composerHorizontalInsetCompensation,
                  right: -composerHorizontalInsetCompensation,
                },
              ]}
              onLayout={(event) => {
                const next = Math.round(event.nativeEvent.layout.height);
                if (next > 0 && next !== composerHeight) {
                  setComposerHeight(next);
                }
              }}
            >
              {shouldShowSuggestionsRail && (
                <View style={styles.suggestionsFence}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.suggestionRow}
                  >
                    {PROMPT_SUGGESTIONS.map((prompt) => (
                      <Button
                        key={prompt}
                        variant="ghost"
                        style={styles.suggestionChip}
                        onPress={() => setInput(prompt)}
                      >
                        <Text style={styles.suggestionText}>{prompt}</Text>
                      </Button>
                    ))}
                  </ScrollView>
                </View>
              )}
              <View style={styles.composerSection}>
                <View style={styles.composerRow}>
                  <View style={styles.inputShellShadow}>
                    <Pressable style={styles.inputShell} onPress={() => inputRef.current?.focus()}>
                      {shouldShowComposerExpand && (
                        <TouchableOpacity
                          style={styles.expandAffordance}
                          onPress={openExpandedComposer}
                          accessibilityRole="button"
                          accessibilityLabel="Expand composer"
                          activeOpacity={0.85}
                          hitSlop={10}
                        >
                          <Icon name="expand" color={CHAT_COLORS.textSecondary} size={16} />
                        </TouchableOpacity>
                      )}

                      <View
                        style={[
                          styles.composerMainRow,
                          isComposerSingleLine && styles.composerMainRowSingle,
                        ]}
                      >
                        <View style={styles.inputField}>
                          <TextInput
                            ref={inputRef}
                            style={[styles.input, !hasInput && styles.inputPlaceholderSmaller]}
                            placeholder={composerPlaceholder}
                            placeholderTextColor={colors.muted}
                            value={input}
                            onChangeText={setInput}
                            onContentSizeChange={(event) => {
                              const next = Math.max(
                                INPUT_MIN_HEIGHT,
                                Math.round(event.nativeEvent.contentSize.height),
                              );
                              setComposerInputHeight((current) => (current === next ? current : next));
                            }}
                            multiline
                            textAlignVertical={isComposerSingleLine ? 'center' : 'top'}
                            returnKeyType="send"
                            onSubmitEditing={handleSend}
                          />
                        </View>

                        {hasInput ? (
                          <TouchableOpacity
                            style={[
                              styles.sendButton,
                              (sending || !canSend) && styles.sendButtonInactive,
                            ]}
                            onPress={handleSend}
                            accessibilityRole="button"
                            accessibilityLabel="Send message"
                            disabled={sending || !canSend}
                            activeOpacity={0.85}
                          >
                            {sending ? (
                              <ActivityIndicator color={colors.canvas} />
                            ) : (
                              <Icon name="arrowUp" color={colors.canvas} size={16} />
                            )}
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[styles.voiceButton, isDictationActive && styles.voiceButtonActive]}
                            onPress={handleStartDictation}
                            accessibilityLabel={voiceButtonLabel}
                            accessibilityHint="Uses on-device transcription to capture your voice"
                            accessibilityState={{ busy: isDictationActive }}
                            disabled={isDictationBusy}
                            activeOpacity={0.85}
                          >
                            {isDictationBusy ? (
                              <ActivityIndicator color={voiceButtonIconColor} size="small" />
                            ) : (
                              <Icon name="mic" color={voiceButtonIconColor} size={16} />
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                      {shouldShowDictationStatus && (
                        <View style={styles.dictationStatusRow}>
                          <View
                            style={[
                              styles.dictationStatusDot,
                              dictationError
                                ? styles.dictationStatusDotError
                                : styles.dictationStatusDotActive,
                            ]}
                          />
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.dictationStatusLabel,
                              dictationError && styles.dictationStatusLabelError,
                            ]}
                          >
                            {dictationStatusMessage}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>

      {hasWorkflowContextMeta && (
        <Modal
          visible={isWorkflowInfoVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsWorkflowInfoVisible(false)}
        >
          <View style={styles.arcInfoOverlay}>
            <View style={styles.arcInfoCard}>
              <View style={styles.arcInfoHeaderRow}>
                <Text style={styles.arcInfoTitle}>{workflowInfoTitle}</Text>
                <Button
                  variant="ghost"
                  size="icon"
                  onPress={() => setIsWorkflowInfoVisible(false)}
                  accessibilityLabel="Close workflow context info"
                  style={styles.arcInfoCloseButton}
                >
                  <Icon name="close" size={18} color={CHAT_COLORS.textSecondary} />
                </Button>
              </View>

              <ScrollView
                style={styles.arcInfoScroll}
                contentContainerStyle={styles.arcInfoContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.arcInfoHeader}>
                  <Text style={styles.arcInfoSubtitle}>{workflowInfoSubtitle}</Text>
                </View>

                {isArcCreationMode && (
                  <View style={styles.arcInfoSection}>
                    <Text style={styles.arcInfoSectionLabel}>What’s an Arc?</Text>
                    <Text style={styles.arcInfoBody}>
                      An Arc is a long‑term identity direction in a part of your life — a stable
                      storyline you can hang future goals and activities on.
                    </Text>
                  </View>
                )}

                {hasContextMeta && launchContext && (
                  <View style={styles.arcInfoSection}>
                    <Text style={styles.arcInfoSectionLabel}>Context for this chat</Text>

                    {mode === 'activityGuidance' && (
                      <View style={styles.arcInfoSubSection}>
                        <View style={styles.arcInfoContextCard}>
                          <Text style={styles.arcInfoGoalsLabel}>Focused Activity</Text>
                          <Text style={styles.arcInfoContextTitle}>
                            {focusedActivityTitle ?? 'This activity'}
                          </Text>
                        </View>

                        {focusedGoalTitle ? (
                          <View style={styles.arcInfoContextCard}>
                            <Text style={styles.arcInfoGoalsLabel}>Linked Goal</Text>
                            <Text style={styles.arcInfoContextTitle}>{focusedGoalTitle}</Text>
                          </View>
                        ) : null}

                        {focusedArcName ? (
                          <View style={styles.arcInfoContextCard}>
                            <Text style={styles.arcInfoGoalsLabel}>Parent Arc</Text>
                            <Text style={styles.arcInfoContextTitle}>{focusedArcName}</Text>
                          </View>
                        ) : null}
                      </View>
                    )}

                    {parsedContext?.arcs && parsedContext.arcs.length > 0 && (
                      <View style={styles.arcInfoSubSection}>
                        {parsedContext.arcs.map((arc) => {
                          const arcGoals = (parsedContext.goals ?? []).filter(
                            (goal) => goal.arcName === arc.name,
                          );
                          return (
                            <View key={arc.name} style={styles.arcInfoContextCard}>
                              <Text style={styles.arcInfoContextTitle}>{arc.name}</Text>
                              {arcGoals.length > 0 && (
                                <View style={styles.arcInfoGoalList}>
                                  <Text style={styles.arcInfoGoalsLabel}>Goals in this Arc</Text>
                                  {arcGoals.map((goal) => (
                                    <Text key={goal.title} style={styles.arcInfoGoalText}>
                                      • {goal.title}
                                    </Text>
                                  ))}
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>

              <View style={styles.arcInfoFooter}>
                <Button
                  variant="ghost"
                  onPress={() => setIsWorkflowInfoVisible(false)}
                  accessibilityLabel="Close workflow context info"
                >
                  <Text style={styles.arcInfoCloseLabel}>Got it</Text>
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      )}

      <Modal visible={isComposerExpanded} animationType="slide" onRequestClose={closeExpandedComposer}>
        <EditorSurface
          header={
            <EditorHeader
              left={
                <Button
                  variant="ghost"
                  size="icon"
                  onPress={closeExpandedComposer}
                  accessibilityLabel="Close expanded composer"
                >
                  <Icon name="close" size={18} color={CHAT_COLORS.textSecondary} />
                </Button>
              }
              center={<Text style={styles.expandedHeaderTitle}>Message</Text>}
              right={
                <Button
                  variant="ghost"
                  onPress={handleSend}
                  accessibilityLabel="Send message"
                  disabled={sending || !canSend}
                >
                  <Text style={styles.expandedHeaderAction}>Send</Text>
                </Button>
              }
            />
          }
          bodyTopPadding={spacing.lg}
          bodyBottomPadding={spacing.lg}
        >
          <View style={styles.expandedBody}>
            <TextInput
              ref={expandedInputRef}
              style={styles.expandedInput}
              placeholder={composerPlaceholder}
              placeholderTextColor={colors.muted}
              value={input}
              onChangeText={setInput}
              multiline
              textAlignVertical="top"
              autoFocus
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
          </View>
        </EditorSurface>
      </Modal>

  </>
  );
});

function ThinkingBubble() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createLoop = (value: Animated.Value, delay: number) => {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
      return animation;
    };

    const anim1 = createLoop(dot1, 0);
    const anim2 = createLoop(dot2, 120);
    const anim3 = createLoop(dot3, 240);

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);

  const renderDot = (value: Animated.Value, index: number) => {
    const translateY = value.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -2],
    });
    const opacity = value.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    });

    return (
      <Animated.View
        key={index}
        style={[
          styles.thinkingDot,
          {
            transform: [{ translateY }],
            opacity,
          },
        ]}
      />
    );
  };

  return (
    <View style={styles.thinkingDotsRow}>
      {renderDot(dot1, 1)}
      {renderDot(dot2, 2)}
      {renderDot(dot3, 3)}
    </View>
  );
}

/**
 * Convenience wrapper when the chat is used as a full-screen screen instead of
 * inside a bottom sheet. This preserves the existing AppShell-based layout
 * while letting BottomDrawer embed `AiChatPane` directly.
 */
export function AiChatScreen() {
  // Lazy-load AppShell and AgentWorkspace here to avoid coupling the pane
  // itself to app chrome or workflow orchestration.
  const { AppShell } = require('../../ui/layout/AppShell') as typeof import('../../ui/layout/AppShell');
  const { AgentWorkspace } = require('./AgentWorkspace') as typeof import('./AgentWorkspace');

  return (
    <AppShell>
      <AgentWorkspace
        // Standalone coach screen defaults to free-form coaching without a
        // specific workflow attached.
        mode={undefined}
        launchContext={{
          source: 'standaloneCoach',
          intent: 'freeCoach',
        }}
      />
    </AppShell>
  );
}

function UserMessageBubble({ content }: { content: string }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
      }}
    >
      <View style={[styles.messageBubble, styles.userBubble]}>
        <Text style={styles.userText}>{content}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  body: {
    flex: 1,
    backgroundColor: colors.shell,
    position: 'relative',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing['2xl'],
    gap: spacing.lg,
  },
  composerFence: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  timeline: {
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modelLabel: {
    ...typography.titleLg,
    color: CHAT_COLORS.textPrimary,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CHAT_COLORS.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: CHAT_COLORS.surface,
    alignSelf: 'flex-end',
  },
  modePillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  modePillInfoIcon: {
    marginLeft: spacing.sm,
  },
  modePillText: {
    ...typography.bodySm,
    color: CHAT_COLORS.textSecondary,
  },
  presenceText: {
    ...typography.body,
    color: CHAT_COLORS.textPrimary,
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  suggestionChip: {
    // ShadCN secondary-style prompt chip: soft gray surface, no border,
    // rectangular with gentle corner radius.
    borderRadius: 12,
    backgroundColor: '#F4F4F5',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 0,
  },
  suggestionText: {
    ...typography.bodySm,
    color: CHAT_COLORS.textPrimary,
  },
  messagesStack: {
    gap: spacing.md,
    // Add extra breathing room between the brand lockup at the top of the
    // sheet and the first coach response so the conversation feels more
    // like a distinct thread starting below the header.
    marginTop: spacing['2xl'],
  },
  messagesStackCompact: {
    // When there is no brand header and no visible messages yet (for example,
    // a workflow-only QuestionCard on first open), keep the stack closer to
    // the top so it doesn't feel like space is being reserved for a hidden
    // chat bubble.
    marginTop: spacing.lg,
  },
  activitySuggestionsCard: {
    borderRadius: 20,
    backgroundColor: CHAT_COLORS.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  activitySuggestionsLabel: {
    ...typography.label,
    color: CHAT_COLORS.textSecondary,
  },
  activitySuggestionsStack: {
    gap: spacing.sm,
  },
  activityTypeFullWidthList: {
    flexDirection: 'column',
    gap: spacing.xs,
  },
  activityTypeFullWidthOption: {
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.shell,
  },
  activityTypeFullWidthOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: '#DCFCE7',
  },
  activityTypeFullWidthOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  activityTypeCheckboxOuter: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTypeCheckboxOuterSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  activityTypeFullWidthOptionLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  activityTypeFullWidthOptionLabelSelected: {
    color: colors.accent,
    fontFamily: fonts.semibold,
  },
  activityTypeQuestionFooterRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: spacing.xs,
  },
  activityTypeQuestionSecondaryCta: {
    ...typography.bodySm,
    color: CHAT_COLORS.textPrimary,
  },
  activityTypeQuestionPrimaryCta: {
    ...typography.bodySm,
    color: colors.canvas,
    fontFamily: fonts.semibold,
  },
  activitySuggestionCard: {
    marginHorizontal: 0,
    marginVertical: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  activitySuggestionRow: {
    flex: 1,
    alignItems: 'center',
    minHeight: 36,
  },
  activitySuggestionTitle: {
    // Match ActivityListItem title hierarchy (15pt semibold).
    ...typography.body,
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 22,
    color: CHAT_COLORS.textPrimary,
    flex: 1,
  },
  activitySuggestionTitlePressable: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 36,
  },
  activitySuggestionTitleInput: {
    // Match the non-editing title style, but behave like an inline field.
    ...typography.body,
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 22,
    color: CHAT_COLORS.textPrimary,
    paddingVertical: 0,
    paddingHorizontal: 0,
    includeFontPadding: false,
  },
  activitySuggestionsFooterRow: {
    marginTop: spacing.sm,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    columnGap: spacing.xs,
  },
  activitySuggestionsButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
  },
  activitySuggestionSkeletonBlock: {
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
  },
  activitySuggestionSkeletonTitle: {
    width: '82%',
    height: 12,
  },
  activitySuggestionRegenerateLabel: {
    ...typography.bodySm,
    color: CHAT_COLORS.textPrimary,
  },
  activityInlineConfirmationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  activityInlineConfirmationText: {
    ...typography.bodySm,
    color: CHAT_COLORS.textSecondary,
    flexShrink: 1,
    marginRight: spacing.sm,
  },
  activityInlineConfirmationDismissLabel: {
    ...typography.bodySm,
    color: CHAT_COLORS.textPrimary,
  },
  activitySummaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CHAT_COLORS.border,
    backgroundColor: CHAT_COLORS.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  activitySummaryTitle: {
    ...typography.body,
    color: CHAT_COLORS.textPrimary,
  },
  activitySummaryBody: {
    ...typography.bodySm,
    color: CHAT_COLORS.textSecondary,
  },
  activitySummaryActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    columnGap: spacing.xs,
    marginTop: spacing.sm,
  },
  manualFallbackCard: {
    borderRadius: 20,
    backgroundColor: CHAT_COLORS.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  manualFallbackTitle: {
    ...typography.label,
    color: CHAT_COLORS.textSecondary,
  },
  manualFallbackBody: {
    ...typography.bodySm,
    color: CHAT_COLORS.textSecondary,
  },
  manualFallbackButtonText: {
    ...typography.bodySm,
    color: CHAT_COLORS.textPrimary,
  },
  assistantMessage: {
    // Align assistant replies like a chat bubble on the left and prevent
    // them from stretching full-width so they read more like a message
    // thread instead of a full-width document.
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  assistantMeta: {
    ...typography.bodySm,
    color: CHAT_COLORS.textSecondary,
  },
  assistantText: {
    ...typography.body,
    color: CHAT_COLORS.textPrimary,
  },
  thinkingBubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: CHAT_COLORS.assistantBubble,
    borderWidth: 1,
    borderColor: CHAT_COLORS.border,
    alignSelf: 'flex-start',
  },
  thinkingDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  thinkingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: CHAT_COLORS.textSecondary,
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
    maxWidth: '82%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: CHAT_COLORS.userBubble,
  },
  userMeta: {
    ...typography.bodySm,
    color: CHAT_COLORS.textSecondary,
  },
  userText: {
    ...typography.body,
    color: CHAT_COLORS.userBubbleText,
  },
  suggestionsFence: {
    paddingBottom: spacing.sm,
  },
  stepCardHost: {
    // Let workflow cards (like onboarding identity) sit directly in the chat
    // canvas without being clipped. We keep only a top margin so horizontal
    // shadows can render fully to the sheet gutters.
    alignSelf: 'stretch',
  },
  stepCardHostHiddenWhileTyping: {
    opacity: 0,
    height: 0,
    overflow: 'hidden',
  },
  composerSection: {
    gap: spacing.sm,
    // Let the input pill "float" against the bottom of the chat area without a
    // hard divider line, similar to Cursor's chat. We keep a small margin so it
    // doesn't collide with the suggested prompts rail.
    marginTop: spacing.sm,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  inputShellShadow: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: CHAT_COLORS.surface,
    ...cardElevation.composer,
  },
  inputShell: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: spacing.sm,
    // ShadCN textarea–like: rectangular surface with gentle radius.
    backgroundColor: CHAT_COLORS.surface,
    borderRadius: 18,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: CHAT_COLORS.border,
    overflow: 'hidden',
  },
  composerMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  composerMainRowSingle: {
    alignItems: 'center',
  },
  inputField: {
    justifyContent: 'flex-start',
    flex: 1,
  },
  input: {
    // Slightly larger text than the rest of the chat body so
    // composing feels comfortable and legible.
    ...typography.body,
    color: CHAT_COLORS.textPrimary,
    lineHeight: typography.body.lineHeight,
    paddingTop: 0,
    paddingBottom: 0,
    textAlignVertical: 'top',
    // Let the input grow naturally up to a comfortable height before it
    // begins scrolling internally.
    minHeight: INPUT_MIN_HEIGHT,
    maxHeight: INPUT_MAX_HEIGHT,
  },
  inputPlaceholderSmaller: {
    fontSize: 15,
    lineHeight: 20,
  },
  trailingIcon: {
    paddingHorizontal: spacing.sm,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandAffordance: {
    position: 'absolute',
    top: 6,
    right: 6,
    padding: 6,
    zIndex: 2,
  },
  sendButton: {
    backgroundColor: '#18181B',
    borderColor: '#18181B',
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButton: {
    backgroundColor: '#18181B',
    borderRadius: 999,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButtonActive: {
    backgroundColor: CHAT_COLORS.accent,
  },
  dictationStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  dictationStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: CHAT_COLORS.textSecondary,
  },
  dictationStatusDotActive: {
    backgroundColor: CHAT_COLORS.accent,
  },
  dictationStatusDotError: {
    backgroundColor: '#F87171',
  },
  dictationStatusLabel: {
    ...typography.bodySm,
    fontSize: 12,
    lineHeight: 16,
    color: CHAT_COLORS.textSecondary,
  },
  dictationStatusLabelError: {
    color: '#F87171',
  },
  expandedHeaderTitle: {
    ...typography.body,
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
  },
  expandedHeaderAction: {
    ...typography.body,
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
  },
  expandedBody: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  expandedInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: typography.body.lineHeight,
    textAlignVertical: 'top',
  },
  sendButtonInactive: {
    opacity: 0.4,
  },
  sendingButton: {
    opacity: 0.7,
  },
  disclaimer: {
    ...typography.bodySm,
    color: CHAT_COLORS.textSecondary,
    textAlign: 'center',
  },
  arcInfoOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    // Match the pine-tinted scrim used by the primary bottom sheet so
    // modals feel part of the same system.
    backgroundColor: 'rgba(6,24,13,0.85)',
  },
  arcInfoCard: {
    width: '100%',
    maxHeight: '75%',
    borderRadius: 24,
    backgroundColor: CHAT_COLORS.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  arcInfoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CHAT_COLORS.border,
  },
  arcInfoHeader: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  arcInfoTitle: {
    ...typography.titleSm,
    color: CHAT_COLORS.textPrimary,
  },
  arcInfoSubtitle: {
    ...typography.bodySm,
    color: CHAT_COLORS.textSecondary,
  },
  arcInfoSection: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  arcInfoSectionLabel: {
    ...typography.bodySm,
    color: CHAT_COLORS.textSecondary,
  },
  arcInfoBody: {
    ...typography.bodySm,
    color: CHAT_COLORS.textPrimary,
  },
  arcInfoBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  arcInfoBulletGlyph: {
    ...typography.bodySm,
    color: CHAT_COLORS.textSecondary,
    marginTop: 1,
  },
  arcInfoScroll: {
    flexGrow: 0,
  },
  arcInfoContent: {
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  arcInfoContextCard: {
    marginTop: spacing.sm,
    borderRadius: spacing.lg,
    borderWidth: 1,
    borderColor: CHAT_COLORS.border,
    backgroundColor: CHAT_COLORS.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  arcInfoMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  arcInfoMetric: {
    flex: 1,
  },
  arcInfoMetricValue: {
    ...typography.titleLg,
    color: CHAT_COLORS.textPrimary,
  },
  arcInfoMetricLabel: {
    ...typography.bodySm,
    color: CHAT_COLORS.textSecondary,
  },
  arcInfoSubSection: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  arcInfoGoalList: {
    marginTop: spacing.xs,
    gap: spacing.xs / 2,
  },
  arcInfoGoalsLabel: {
    ...typography.bodySm,
    color: CHAT_COLORS.textSecondary,
  },
  arcInfoGoalText: {
    ...typography.bodySm,
    color: CHAT_COLORS.textPrimary,
  },
  arcInfoContextTitle: {
    ...typography.bodySm,
    color: CHAT_COLORS.textSecondary,
  },
  arcInfoFooter: {
    marginTop: spacing.lg,
    alignItems: 'flex-end',
  },
  arcInfoCloseButton: {
    marginLeft: spacing.sm,
  },
  arcInfoCloseLabel: {
    ...typography.bodySm,
    color: CHAT_COLORS.textPrimary,
  },
  primaryButtonLabel: {
    // Use full-size body text inside primary buttons so they feel like
    // platform-standard CTAs (roughly 17pt on iOS).
    ...typography.body,
    color: colors.canvas,
    fontWeight: '600',
  },
  ageQuestionCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CHAT_COLORS.border,
    backgroundColor: CHAT_COLORS.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  ageQuestionTitle: {
    ...typography.body,
    color: CHAT_COLORS.textPrimary,
  },
  ageQuestionBody: {
    ...typography.bodySm,
    color: CHAT_COLORS.textSecondary,
  },
  ageChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  ageChip: {
    borderRadius: 999,
    borderColor: CHAT_COLORS.chipBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 0,
  },
  ageChipLabel: {
    ...typography.bodySm,
    color: CHAT_COLORS.textPrimary,
  },
  arcDraftCard: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 16,
    backgroundColor: CHAT_COLORS.assistantBubble,
    borderWidth: 1,
    borderColor: CHAT_COLORS.border,
    gap: spacing.sm,
  },
  arcDraftLabel: {
    ...typography.bodySm,
    color: CHAT_COLORS.textSecondary,
  },
  arcDraftNameInput: {
    ...typography.titleSm,
    color: CHAT_COLORS.textPrimary,
    paddingVertical: spacing.xs,
  },
  arcDraftNarrativeInput: {
    ...typography.bodySm,
    color: CHAT_COLORS.textPrimary,
    paddingVertical: spacing.xs,
    textAlignVertical: 'top',
    minHeight: typography.bodySm.lineHeight * 3,
  },
  arcDraftButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  arcDraftInlineFeedback: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: CHAT_COLORS.border,
  },
  arcDraftSecondaryButtonText: {
    ...typography.bodySm,
    color: CHAT_COLORS.textSecondary,
  },
  arcDraftConfirmText: {
    ...typography.bodySm,
    color: CHAT_COLORS.userBubbleText,
  },
  goalDraftCard: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 16,
    backgroundColor: CHAT_COLORS.assistantBubble,
    borderWidth: 1,
    borderColor: CHAT_COLORS.border,
    gap: spacing.sm,
  },
  goalDraftArcRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  goalDraftArcLabel: {
    ...typography.bodySm,
    color: CHAT_COLORS.textSecondary,
  },
  goalDraftLabel: {
    ...typography.bodySm,
    color: CHAT_COLORS.textSecondary,
    marginBottom: spacing.xs,
  },
  goalDraftLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
  },
  goalDraftFieldLabel: {
    ...typography.label,
    color: CHAT_COLORS.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    paddingLeft: spacing.xs,
  },
  goalDraftInputContainer: {
    backgroundColor: CHAT_COLORS.surface,
  },
  goalDraftTitleInputText: {
    ...typography.titleSm,
    color: CHAT_COLORS.textPrimary,
    // Override Input's single-line platform metrics (tuned for bodySm) so title text
    // stays visually centered and doesn't look like a 2-line field when it's not.
    lineHeight: typography.titleSm.lineHeight,
    marginTop: 0,
  },
  goalDraftTitleMeasure: {
    ...typography.titleSm,
    color: 'transparent',
    position: 'absolute',
    left: 0,
    top: -9999,
  },
  goalDraftDescriptionInputText: {
    ...typography.bodySm,
    color: CHAT_COLORS.textPrimary,
  },
  goalDraftButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  goalDraftSecondaryButtonText: {
    ...typography.bodySm,
    color: CHAT_COLORS.textSecondary,
  },
  goalDraftConfirmText: {
    ...typography.bodySm,
    color: CHAT_COLORS.userBubbleText,
  },
  // Inline feedback panel reuses the feedback typography + chip styles below.
  feedbackTitle: {
    ...typography.titleSm,
    color: CHAT_COLORS.textPrimary,
  },
  feedbackBody: {
    ...typography.bodySm,
    color: CHAT_COLORS.textSecondary,
    marginBottom: spacing.md,
  },
  feedbackChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  feedbackChip: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 0,
  },
  feedbackChipTextSelected: {
    ...typography.bodySm,
    color: CHAT_COLORS.textPrimary,
  },
  feedbackChipTextUnselected: {
    ...typography.bodySm,
    color: CHAT_COLORS.textSecondary,
  },
  feedbackNoteContainer: {
    marginBottom: spacing.md,
  },
  feedbackNoteLabel: {
    ...typography.bodySm,
    color: CHAT_COLORS.textSecondary,
    marginBottom: spacing.xs,
  },
  feedbackNoteInput: {
    ...typography.bodySm,
    color: CHAT_COLORS.textPrimary,
    borderWidth: 1,
    borderColor: CHAT_COLORS.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: typography.bodySm.lineHeight * 3,
    textAlignVertical: 'top',
  },
  feedbackButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});

