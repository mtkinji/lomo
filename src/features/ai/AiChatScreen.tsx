import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  NativeEventEmitter,
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { spacing, typography, colors, fonts } from '../../theme';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Icon } from '../../ui/Icon';
import { Logo } from '../../ui/Logo';
import { CoachChatTurn, GeneratedArc, sendCoachChat, type CoachChatOptions } from '../../services/ai';
import { CHAT_MODE_REGISTRY, type ChatMode } from './chatRegistry';
import { useAppStore } from '../../store/useAppStore';
import { useWorkflowRuntime } from './WorkflowRuntimeContext';
import type { ReactNode, Ref } from 'react';
import type {
  AgeRange,
  ArcProposalFeedback,
  ArcProposalFeedbackReason,
} from '../../domain/types';
import { Text } from '../../ui/primitives';

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

function extractArcProposalFromAssistantMessage(content: string): ParsedAssistantReply {
  const markerIndex = content.indexOf(ARC_PROPOSAL_MARKER);
  if (markerIndex === -1) {
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

// Default visual state: the user has not said anything yet, but the coach can
// open with guidance. This lets us show initial instructions while still
// treating the canvas as "no user messages yet" for UI behaviors.
const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'coach-intro-1',
    role: 'assistant',
    content:
      "I'm your kwilt Agent. Think of me as a smart friend who can help you clarify goals, design arcs, and plan today's focus. What's the most important thing you want to move forward right now?",
  },
];

const PROMPT_SUGGESTIONS = [
  'Best way to learn a new language',
  'Find a great Japanese architect',
  'Optimize onboarding flow',
];

const CHAT_COLORS = {
// When rendered inside the BottomDrawer or KwiltBottomSheet, the sheet surface
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
    fontFamily: fonts.semibold,
    fontWeight: '600',
    color: CHAT_COLORS.textPrimary,
  },
  em: {
    fontStyle: 'italic',
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

const INPUT_MIN_HEIGHT = typography.bodySm.lineHeight * 4;
const INPUT_MAX_HEIGHT = typography.bodySm.lineHeight * 8;

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
};

/**
 * Core chat pane to be rendered inside the coach bottom sheet.
 * This component intentionally does NOT own global app padding or navigation
 * chrome – the sheet + AppShell handle those layers.
 */
export const AiChatPane = forwardRef(function AiChatPane(
  {
    mode,
    launchContext,
    resumeDraft = true,
    onConfirmArc,
    onComplete,
    stepCard,
    hideBrandHeader = false,
    hidePromptSuggestions = false,
  }: AiChatPaneProps,
  ref: Ref<AiChatPaneController>
) {
  const isArcCreationMode = mode === 'arcCreation';
  const isOnboardingMode = mode === 'firstTimeOnboarding';

  const workflowRuntime = useWorkflowRuntime();
  const currentWorkflowStepId = workflowRuntime?.instance?.currentStepId;
  const currentWorkflowStep = workflowRuntime?.definition?.steps.find(
    (step) => step.id === currentWorkflowStepId
  );

  const shouldHideComposerForWorkflowStep =
    Boolean(
      workflowRuntime &&
        workflowRuntime.definition?.chatMode === 'firstTimeOnboarding' &&
        currentWorkflowStep?.hideFreeformChatInput
    );

  const shouldShowComposer = !shouldHideComposerForWorkflowStep;

  const modeConfig = mode ? CHAT_MODE_REGISTRY[mode] : undefined;
  const modeSystemPrompt = modeConfig?.systemPrompt;
  const shouldBootstrapAssistant = Boolean(modeConfig?.autoBootstrapFirstMessage);
  const [isArcInfoVisible, setIsArcInfoVisible] = useState(false);
  const draftSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userProfile = useAppStore((state) => state.userProfile);
  const updateUserProfile = useAppStore((state) => state.updateUserProfile);
  const arcFeedbackEntries = useAppStore((state) => state.arcFeedback);
  const addArcFeedback = useAppStore((state) => state.addArcFeedback);
  const hasAgeRange = Boolean(userProfile?.ageRange);
  const shouldShowAgeQuestion = isArcCreationMode && !hasAgeRange;

  const buildInitialMessages = (): ChatMessage[] => {
    if (!launchContext && !modeSystemPrompt && !shouldBootstrapAssistant) {
      return INITIAL_MESSAGES;
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
        'Workspace snapshot: existing arcs and goals. Use this to avoid duplicating identity directions and to keep new Arc suggestions complementary to what already exists.',
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
    // do not show the default intro message so the response comes directly
    // from the mode-specific system prompt.
    if (shouldBootstrapAssistant) {
      return [systemMessage];
    }

    return [systemMessage, ...INITIAL_MESSAGES];
  };

  const initialMessages = buildInitialMessages();

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [inputHeight, setInputHeight] = useState(INPUT_MIN_HEIGHT);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [arcProposal, setArcProposal] = useState<GeneratedArc | null>(null);
  const [arcDraftName, setArcDraftName] = useState('');
  const [arcDraftNarrative, setArcDraftNarrative] = useState('');
  const [isFeedbackModalVisible, setIsFeedbackModalVisible] = useState(false);
  const [feedbackReasons, setFeedbackReasons] = useState<ArcProposalFeedbackReason[]>([]);
  const [feedbackNote, setFeedbackNote] = useState('');
  const scrollRef = useRef<ScrollView | null>(null);
  const messagesRef = useRef<ChatMessage[]>(initialMessages);
  const inputRef = useRef<TextInput | null>(null);
  const dictationBaseRef = useRef('');
  const [dictationState, setDictationState] = useState<DictationState>(
    iosSpeechModule ? 'idle' : 'unavailable'
  );
  const [dictationError, setDictationError] = useState<string | null>(null);
  const [isDictationAvailable, setIsDictationAvailable] = useState(Boolean(iosSpeechModule));

  const hasInput = input.trim().length > 0;
  const canSend = hasInput && !sending;
  const hasUserMessages = messages.some((m) => m.role === 'user');
  const hasContextMeta = Boolean(launchContext || modeSystemPrompt);
  const shouldShowSuggestionsRail =
    !hidePromptSuggestions && !hasUserMessages && !isOnboardingMode;

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
  const parsedContext = launchContext
    ? parseArcContextFromLaunchContext(launchContext)
    : undefined;

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
  ) => {
    const messageId = `${baseId}-${Date.now()}`;

    // Seed an empty assistant message so the user sees something appear
    // immediately, then gradually reveal the full content.
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
      opts?.onDone?.();
      return;
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
    const step = () => {
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
        setTimeout(step, delay);
      } else {
        opts?.onDone?.();
      }
    };

    // Kick off the first animation frame.
    setTimeout(step, 20);
  };

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
      streamAssistantReplyFromWorkflow: (fullText: string, baseId = 'assistant-workflow', opts) => {
        streamAssistantReply(fullText, baseId, opts);
      },
      getHistory: () => {
        return messagesRef.current.map((m) => ({
          role: m.role,
          content: m.content,
        }));
      },
    }),
    [input]
  );

  // For arcCreation mode, automatically ask the model for an initial
  // assistant message on mount so the conversation opens with guidance
  // that respects the Arc Creation Agent system prompt (including age
  // awareness) instead of a static placeholder.
  useEffect(() => {
    if (!shouldBootstrapAssistant || bootstrapped) {
      return;
    }

    let cancelled = false;

    const bootstrapConversation = async () => {
      try {
        setThinking(true);
        const history: CoachChatTurn[] = messagesRef.current.map((m) => ({
          role: m.role,
          content: m.content,
        }));
        const coachOptions: CoachChatOptions = {
          mode,
          workflowDefinitionId: workflowRuntime?.definition?.id,
          workflowInstanceId: workflowRuntime?.instance?.id,
          workflowStepId: workflowRuntime?.instance?.currentStepId,
          launchContextSummary: launchContext,
        };
        const reply = await sendCoachChat(history, coachOptions);
        const { displayContent, arcProposal } = extractArcProposalFromAssistantMessage(reply);
        if (arcProposal) {
          setArcProposal(arcProposal);
          setArcDraftName(arcProposal.name ?? '');
          setArcDraftNarrative(arcProposal.narrative ?? '');
        }
        if (cancelled) return;
        streamAssistantReply(displayContent, 'assistant-bootstrap', {
          onDone: () => {
            if (!cancelled) {
              setBootstrapped(true);
              setThinking(false);
            }
          },
        });
      } catch (err) {
        console.error('kwilt Coach initial chat failed', err);
        if (cancelled) return;
        const errorMessage: ChatMessage = {
          id: `assistant-error-bootstrap-${Date.now()}`,
          role: 'assistant',
          content:
            "I'm having trouble reaching kwilt Coach right now. Check your connection or API key configuration, then try again.",
        };
        setMessages((prev) => {
          const next = [...prev, errorMessage];
          messagesRef.current = next;
          return next;
        });
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
  }, [mode, bootstrapped, shouldBootstrapAssistant, workflowRuntime, launchContext]);

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

  const handleSend = async () => {
    if (!canSend) {
      return;
    }

    const trimmed = input.trim();
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    setSending(true);
    setThinking(true);
    setMessages((prev) => {
      const next = [...prev, userMessage];
      messagesRef.current = next;
      scheduleDraftSave(next, '');
      return next;
    });
    setInput('');

    const isOnboardingWorkflow =
      workflowRuntime?.definition?.chatMode === 'firstTimeOnboarding';
    const currentWorkflowStepId = workflowRuntime?.instance?.currentStepId;

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
      const coachOptions: CoachChatOptions = {
        mode,
        workflowDefinitionId: workflowRuntime?.definition?.id,
        workflowInstanceId: workflowRuntime?.instance?.id,
        workflowStepId: workflowRuntime?.instance?.currentStepId,
        launchContextSummary: launchContext,
      };
      const reply = await sendCoachChat(history, coachOptions);
      const { displayContent, arcProposal } = extractArcProposalFromAssistantMessage(reply);
      if (arcProposal) {
        setArcProposal(arcProposal);
        setArcDraftName(arcProposal.name ?? '');
        setArcDraftNarrative(arcProposal.narrative ?? '');
      }
      streamAssistantReply(displayContent, 'assistant', {
        onDone: () => {
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
          "I'm having trouble reaching kwilt Coach right now. Try again in a moment, or adjust your connection.",
      };
      setMessages((prev) => {
        const next = [...prev, errorMessage];
        messagesRef.current = next;
        return next;
      });
    } finally {
      // If the happy-path streaming already cleared `sending`, don’t
      // override it here; this mainly protects the error path.
      setSending((current) => (current ? false : current));
      setThinking(false);
    }
  };

  const scrollToLatest = () => {
    scrollRef.current?.scrollToEnd({ animated: true });
  };

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
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: any) => {
      setKeyboardHeight(e?.endCoordinates?.height ?? 0);
    };
    const onHide = () => {
      setKeyboardHeight(0);
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <KeyboardAvoidingView style={styles.flex}>
        <View style={styles.body}>
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={scrollToLatest}
          >
              <View style={styles.timeline}>
              {!hideBrandHeader && (
                <View style={styles.brandHeaderRow}>
                  <View style={styles.brandLockup}>
                    <Logo size={32} />
                    <View style={styles.brandTextBlock}>
                      <Text style={styles.brandWordmark}>kwilt</Text>
                    </View>
                  </View>
                  {isArcCreationMode && (
                    <Pressable
                      style={styles.modePill}
                      onPress={() => setIsArcInfoVisible(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Learn about Arc creation and see context"
                    >
                      <View style={styles.modePillLeft}>
                        <Icon
                          name="arcs"
                          size={14}
                          color={CHAT_COLORS.textSecondary}
                          style={styles.modePillIcon}
                        />
                        <Text style={styles.modePillText}>Arc creation</Text>
                      </View>
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
              <View style={styles.messagesStack}>
                {messages
                  .filter((message) => message.role !== 'system')
                  .map((message) =>
                    message.role === 'assistant' ? (
                      <View key={message.id} style={styles.assistantMessage}>
                        <Markdown style={markdownStyles}>{message.content}</Markdown>
                      </View>
                    ) : (
                      <UserMessageBubble key={message.id} content={message.content} />
                    ),
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
                        }}
                      >
                        <Text style={styles.arcDraftSecondaryButtonText}>Not now</Text>
                      </Button>
                      <Button
                        variant="ghost"
                        onPress={() => {
                          setFeedbackReasons([]);
                          setFeedbackNote('');
                          setIsFeedbackModalVisible(true);
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
                          await saveArcCreationDraft(null);
                          if (onConfirmArc) {
                            onConfirmArc(finalized);
                          }
                        }}
                      >
                        <Text style={styles.arcDraftConfirmText}>Adopt Arc</Text>
                      </Button>
                    </View>
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

              {stepCard && <View style={styles.stepCardHost}>{stepCard}</View>}
            </View>
          </ScrollView>

          {shouldShowComposer && (
            <View
              style={[
                styles.composerFence,
                {
                  marginBottom:
                    keyboardHeight > 0 ? keyboardHeight - spacing.lg : -spacing.md,
                },
              ]}
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
                  <Pressable
                    style={[
                      styles.inputShell,
                      keyboardHeight > 0 && styles.inputShellRaised,
                    ]}
                    onPress={() => inputRef.current?.focus()}
                  >
                    <View style={styles.inputField}>
                      <TextInput
                        ref={inputRef}
                        style={[styles.input, { height: inputHeight }]}
                        placeholder="Ask anything"
                        placeholderTextColor={CHAT_COLORS.textSecondary}
                        value={input}
                        onChangeText={setInput}
                        multiline
                        textAlignVertical="top"
                        scrollEnabled={inputHeight >= INPUT_MAX_HEIGHT}
                        returnKeyType="send"
                        onSubmitEditing={handleSend}
                        onContentSizeChange={(event) => {
                          const nextHeight = event.nativeEvent.contentSize.height;
                          setInputHeight((current) => {
                            const clamped = Math.min(
                              INPUT_MAX_HEIGHT,
                              Math.max(INPUT_MIN_HEIGHT, nextHeight)
                            );
                            return clamped === current ? current : clamped;
                          });
                        }}
                      />
                    </View>
                    <View style={styles.inputFooterRow}>
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
                          style={[
                            styles.voiceButton,
                            isDictationActive && styles.voiceButtonActive,
                          ]}
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
          )}
        </View>
      </KeyboardAvoidingView>

    {isArcCreationMode && (
      <Modal
        visible={isArcInfoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsArcInfoVisible(false)}
      >
        <View style={styles.arcInfoOverlay}>
          <View style={styles.arcInfoCard}>
            <View style={styles.arcInfoHeaderRow}>
              <Text style={styles.arcInfoTitle}>Arc creation coach</Text>
              <Button
                variant="ghost"
                size="icon"
                onPress={() => setIsArcInfoVisible(false)}
                accessibilityLabel="Close Arc creation info"
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
                <Text style={styles.arcInfoSubtitle}>
                  This coach helps you design one long‑term Arc for your life — not manage tasks or
                  habits.
                </Text>
              </View>

              <View style={styles.arcInfoSection}>
                <Text style={styles.arcInfoSectionLabel}>What’s an Arc?</Text>
                <Text style={styles.arcInfoBody}>
                  An Arc is a long‑term identity direction in a part of your life — a stable
                  storyline you can hang future goals and activities on.
                </Text>
              </View>

              {hasContextMeta && launchContext && parsedContext && (
                <View style={styles.arcInfoSection}>
                  <Text style={styles.arcInfoSectionLabel}>Context for this chat</Text>

                  {parsedContext.arcs.length > 0 && (
                    <View style={styles.arcInfoSubSection}>
                      {parsedContext.arcs.map((arc) => {
                        const arcGoals = parsedContext.goals.filter(
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
                onPress={() => setIsArcInfoVisible(false)}
                accessibilityLabel="Close Arc creation info"
              >
                <Text style={styles.arcInfoCloseLabel}>Got it</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    )}

    {isArcCreationMode && arcProposal && (
      <Modal
        visible={isFeedbackModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFeedbackModalVisible(false)}
      >
        <View style={styles.feedbackOverlay}>
          <View style={styles.feedbackCard}>
            <View style={styles.feedbackHeaderRow}>
              <Text style={styles.feedbackTitle}>Help refine this Arc</Text>
              <Button
                variant="ghost"
                size="icon"
                onPress={() => setIsFeedbackModalVisible(false)}
                accessibilityLabel="Close feedback"
                style={styles.arcInfoCloseButton}
              >
                <Icon name="close" size={18} color={CHAT_COLORS.textSecondary} />
              </Button>
            </View>
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
                  setIsFeedbackModalVisible(false);
                }}
              >
                <Text style={styles.arcDraftSecondaryButtonText}>Cancel</Text>
              </Button>
              <Button
                variant="ai"
                onPress={() => {
                  if (!arcProposal) {
                    setIsFeedbackModalVisible(false);
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
                  setIsFeedbackModalVisible(false);
                  setFeedbackReasons([]);
                  setFeedbackNote('');
                }}
              >
                <Text style={styles.arcDraftConfirmText}>Save feedback</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    )}
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
 * while letting BottomDrawer / KwiltBottomSheet embed `AiChatPane` directly.
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
    marginTop: 'auto',
  },
  timeline: {
    gap: spacing.lg,
  },
  brandHeaderRow: {
    // Treat the logo + wordmark as a single lockup, with any mode pill
    // sitting directly underneath as a second row so the whole unit reads
    // as one cohesive header.
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  brandTextBlock: {
    flexDirection: 'column',
  },
  brandWordmark: {
    ...typography.titleMd,
    fontFamily: fonts.logo,
    color: CHAT_COLORS.textPrimary,
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
    marginTop: spacing.lg,
    alignSelf: 'center',
  },
  modePillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  modePillIcon: {
    marginRight: spacing.xs,
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
    marginTop: spacing.lg,
    alignSelf: 'stretch',
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
  inputShell: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: spacing.sm,
    // ShadCN textarea–like: rectangular surface with gentle radius.
    backgroundColor: CHAT_COLORS.surface,
    borderRadius: spacing.lg,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderWidth: 1,
    borderColor: CHAT_COLORS.border,
  },
  inputShellRaised: {
    // When the keyboard is visible we tuck the composer closer to it and
    // reduce the exaggerated bottom radius so it visually docks to the top
    // of the keyboard, similar to ChatGPT.
    borderBottomLeftRadius: spacing.lg,
    borderBottomRightRadius: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  inputField: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  input: {
    ...typography.bodySm,
    color: CHAT_COLORS.textPrimary,
    lineHeight: typography.bodySm.lineHeight,
    paddingTop: 0,
    paddingBottom: spacing.xs,
    textAlignVertical: 'top',
  },
  inputFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  trailingIcon: {
    paddingHorizontal: spacing.sm,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
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
  ageQuestionCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CHAT_COLORS.border,
    backgroundColor: CHAT_COLORS.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.lg,
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
    marginTop: spacing.lg,
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
  arcDraftSecondaryButtonText: {
    ...typography.bodySm,
    color: CHAT_COLORS.textSecondary,
  },
  arcDraftConfirmText: {
    ...typography.bodySm,
    color: CHAT_COLORS.userBubbleText,
  },
  feedbackOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  feedbackCard: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: CHAT_COLORS.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  feedbackHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
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

