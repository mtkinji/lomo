import { Pressable } from '@/src/ui/HapticPressable';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation, useRoute, type NavigationProp, type ParamListBase, type RouteProp } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { Alert, AppState, FlatList, Keyboard, Linking, Modal, SafeAreaView, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppShell } from '../../ui/layout/AppShell';
import { Button, IconButton } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { Icon } from '../../ui/Icon';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Text } from '../../ui/Typography';
import { colors, spacing } from '../../theme';
import { buildFreshWorkbenchSnapshot, buildWorkbenchSnapshot } from './buildWorkbenchSnapshot';
import { createFreshEntryThreadGate } from './freshEntryThread';
import { createUnifiedChatRepository } from './threadRepository';
import { runUnifiedChatTurn } from './runUnifiedChatTurn';
import { prewarmOnDeviceChatModel } from './onDeviceChatProvider';
import type {
  UnifiedChatClientAction,
  UnifiedChatProposal,
  UnifiedChatThread,
  UnifiedChatThreadAggregate,
} from './types';
import {
  isDurableMobileChatEligible,
  runDurableMobileChatTurn,
  transitionDurableMobileChatRun,
} from './durableMobileChatTurn';
import {
  buildMobileTurnChannelContext,
  type FinalizedConversationUtterance,
} from './channelContext';
import { getUnifiedChatConfig } from './unifiedChatConfig';
import { makeAgentWorkbenchHostMessage, parseAgentWorkbenchSurfaceMessage } from './workbenchProtocol';
import {
  useCapabilityMenuActions,
  useCapabilityMenuOpen,
} from '../../navigation/CapabilityMenuStateContext';
import { navigateWhenReady } from '../../navigation/rootNavigationRef';
import { resolveUnifiedChatObjectReturn } from './capabilityAdapters';
import { useAppStore } from '../../store/useAppStore';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import { canUseProTools } from '../../store/proToolsAccess';
import { useActivityEnrichmentStore } from '../../store/useActivityEnrichmentStore';
import { inspectUnifiedChatAttachments } from '../../services/ai';
import { consumeQuickAddAiActionCredits } from '../activities/useQuickAddDockController';
import { parseActivityMutationPatch } from './activityProposal';
import { refreshCreatedActivityReceipt } from './activityProposalExecutor';
import { executeProposalDecision } from './executeProposalDecision';
import { executeReceiptUndo } from './executeReceiptUndo';
import { findAutoApplyCreateProposal } from './autoApplyCreatePolicy';
import {
  enrichCreatedActivityLikeQuickAdd,
  resolveChatQuickAddAiActions,
} from './enrichCreatedActivityLikeQuickAdd';
import {
  loadUnifiedChatLaunchAttachment,
  loadUnifiedChatAttachableContexts,
  type UnifiedChatAttachableContext,
  type UnifiedChatLaunchContext,
  type UnifiedChatRouteParams,
} from './launchContext';
import { recoverActivityMutations } from './recoverActivityMutations';
import {
  cancelUnifiedChatVoiceRecording,
  startUnifiedChatVoiceRecording,
  stopAndTranscribeUnifiedChatVoice,
} from './unifiedChatVoice';
import { pickUnifiedChatAttachment } from './unifiedChatAttachmentPicker';
import {
  validateUnifiedChatAttachmentDraftSet,
  isUnifiedChatAttachmentSetSendable,
  validateUnifiedChatAttachmentSet,
  type UnifiedChatAttachment,
} from './unifiedChatAttachmentPolicy';
import { applyUnifiedChatAttachmentInspection } from './unifiedChatAttachmentInspection';
import { HapticsService } from '../../services/HapticsService';
import { extractInspectableSourceUrls } from './webSearchResponse';
import { executePlanProposalDecision } from './executePlanProposalDecision';
import { executeGoalProposalDecision } from './executeGoalProposalDecision';
import { executeScreenTimeProposalDecision } from './executeScreenTimeProposalDecision';
import { createPersonalScreenTimeRuleActionBoundary } from '../screen-time/runtime/personalScreenTimeRuleActionBoundary';
import { recoverScreenTimeMutations } from './recoverScreenTimeMutations';
import { getSupabaseClient } from '../../services/backend/supabaseClient';
import { applyApprovedPlanProposal } from './planProposalExecutor';
import { executeProposalOutcomeBatch } from './executeProposalOutcomeBatch';
import { recoverPlanMutations } from './recoverPlanMutations';
import { recoverGoalMutations } from './recoverGoalMutations';
import { executeArcProposalDecision } from './executeArcProposalDecision';
import { recoverArcMutations } from './recoverArcMutations';
import { executeProfileProposalDecision } from './executeProfileProposalDecision';
import { recoverProfileMutations } from './recoverProfileMutations';
import { executeChapterProposalDecision } from './executeChapterProposalDecision';
import { recoverChapterMutations } from './recoverChapterMutations';
import { executeClientActionDecision } from './executeClientActionDecision';
import { resolveClientActionOpenInstruction } from './clientActionNavigation';
import { prepareClientActionNativeReview } from './prepareClientActionNativeReview';
import { useCheckinDraftStore } from '../../store/useCheckinDraftStore';
import { AnalyticsEvent } from '../../services/analytics/events';
import { createRelationshipMemoryToolProvider } from '../../services/relationshipMemoryToolProvider';
import { track } from '../../services/analytics/analytics';
import { posthogClient } from '../../services/analytics/posthogClient';
import {
  buildFamilyScreenTimeDecisionTelemetry,
  buildUnifiedChatConversationLatencyTelemetry,
  buildUnifiedChatFreshEntryTelemetry,
  buildUnifiedChatReconciliationTelemetry,
} from './unifiedChatTelemetry';
import { appendUnifiedChatVoiceLevel } from './unifiedChatVoiceMetering';
import { startLiveConversationSession, type LiveConversationConnection } from '../liveConversation/liveConversationSessionClient';
import { sweepLegacyCookVoiceCacheOnce } from '../../capabilities/recipes/voice/cookVoiceCacheCleanup';
import { conversationProgressSpeech, liveConversationSpeechFallback } from '../liveConversation/conversationSpeechRuntime';
import { conversationActivationFeedback } from '../liveConversation/conversationActivationFeedbackRuntime';
import type { ConversationProgressCueId } from '../liveConversation/conversationProgressCue';
import { createConversationLatencyTracker, type ActiveConversationLatency } from '../liveConversation/conversationLatency';
import { createConversationTurnFinalizer } from '../liveConversation/conversationTurnFinalizer';
import type {
  DurableRealtimeRunRequest,
  DurableRealtimeToolResult,
} from '../liveConversation/durableRealtimeTool';
import { runDurableRealtimeRequest } from './runDurableRealtimeRequest';
import {
  UnifiedChatCenteredState as CenteredState,
  unifiedChatScreenStyles as styles,
} from './UnifiedChatScreenPresentation';
import {
  insertUnifiedChatTranscriptAtSelection,
  type UnifiedChatVoiceInsertion,
} from './unifiedChatTranscriptInsertion';
import { buildUnifiedChatTranscript } from './chatTranscript';
import { createMoneyRepository } from '../../capabilities/money/data/moneyRepository';
import { executeMoneyCategoryProposalDecision } from './executeMoneyCategoryProposalDecision';
import { executeMoneyControlProposalDecision } from './executeMoneyControlProposalDecision';
import { createMoneyControlActions } from '../../capabilities/money/actions/moneyControlActions';
import { createMoneyControlActionBoundary } from '../../capabilities/money/actions/moneyControlActionBoundary';
import { executeRecipeProposalDecision } from './executeRecipeProposalDecision';
import { executeMealPreferenceProposalDecision } from './executeMealPreferenceProposalDecision';
import { executeMealPlanProposalDecision } from './executeMealPlanProposalDecision';
import { executeGroceryProposalDecision } from './executeGroceryProposalDecision';
import { executeHouseholdProposalDecision } from './executeHouseholdProposalDecision';
import { createHouseholdActionBoundary } from '../household/data/householdActionBoundary';
import { createChoreRepository } from '../../capabilities/chores/data/choreRepository';
import { createChoreActions } from '../../capabilities/chores/domain/choreActions';
import { executeChoreProposalDecision } from './executeChoreProposalDecision';
import { recoverMoneyCategoryMutations } from './recoverMoneyCategoryMutations';
import { recoverMoneyControlMutations } from './recoverMoneyControlMutations';
import { buildFreshDrawerContext, getFreshDrawerCopy, getFreshDrawerOffers } from './contextualChatPresentation';
import { UnifiedChatDrawerHeader } from './UnifiedChatDrawerHeader';
import type { UnifiedChatScreenProps } from './UnifiedChatScreenProps';
import {
  activityStoreBoundary,
  arcStoreBoundary,
  chapterStoreBoundary,
  goalStoreBoundary,
  isMealPlanProposal,
  isMealPreferenceProposal,
  isMoneyCategoryProposal,
  isMoneyControlProposal,
  planStoreBoundary,
  profileStoreBoundary,
  recipeMutationBoundary,
  resolveCookRecipe,
} from './proposalDecisionBoundaries';

export type { UnifiedChatScreenProps } from './UnifiedChatScreenProps';

const CHAT_RECOVERY_ILLUSTRATION = require('../../../assets/illustrations/recovery-broken-chain.png');

export function UnifiedChatScreen({
  presentation = 'screen',
  routeParams: routeParamsOverride,
  scopeLabel,
  collapseRequestId,
  onComposerFocusChange,
  onThreadIdChange,
}: UnifiedChatScreenProps = {}) {
  const route = useRoute<RouteProp<{ UnifiedChat: UnifiedChatRouteParams | undefined }, 'UnifiedChat'>>();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const routeParams = routeParamsOverride ?? route.params;
  const isDrawer = presentation === 'drawer';
  const requestedThreadId = routeParams?.threadId;
  const freshEntry = routeParams?.entry === 'fresh' && !requestedThreadId;
  const freshEntrySource = routeParams?.source;
  const widgetLaunchId = routeParams?.widgetLaunchId;
  const [freshLaunchContext, setFreshLaunchContext] = useState<UnifiedChatLaunchContext | null>(
    freshEntry ? routeParams?.launchContext ?? null : null,
  );
  const launchContext = freshEntry && isDrawer ? freshLaunchContext : routeParams?.launchContext;
  const freshDrawerTitle = isDrawer
    ? getFreshDrawerCopy(launchContext)?.title ?? 'Chat'
    : 'New chat';
  const insets = useSafeAreaInsets();
  const { openMenu } = useCapabilityMenuActions();
  const menuOpen = useCapabilityMenuOpen();
  const config = useMemo(getUnifiedChatConfig, []);
  const repository = useMemo(() => createUnifiedChatRepository(), []);
  const moneyRepository = useMemo(() => createMoneyRepository(), []);
  const webViewRef = useRef<WebView>(null);
  const handledRequestIds = useRef(new Set<string>());
  const freshFirstSendRequestIdRef = useRef<string | null>(null);
  const freshEntrySentRef = useRef(false);
  const freshThreadGateRef = useRef<{
    ensure: () => Promise<UnifiedChatThreadAggregate>;
  } | null>(null);
  const activeTurn = useRef<{
    runId: string | null;
    owner: 'local' | 'server';
    controller: AbortController;
    disposition: { type: 'stop' } | { type: 'steer'; prompt: string; requestId: string };
  } | null>(null);
  const consumedLaunchContext = useRef<string | null>(null);
  const voiceTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveConversation = useRef<LiveConversationConnection | null>(null);
  const conversationAutoStartRef = useRef(false);
  const conversationAssistantCountRef = useRef(0);
  const conversationLatencyRef = useRef<ActiveConversationLatency | null>(null);
  const conversationProgressHistoryRef = useRef<ConversationProgressCueId[]>([]);
  const conversationResponseGenerationRef = useRef(0);
  const conversationAssistantSpeechActiveRef = useRef(false);
  const conversationInterruptedRef = useRef(false);
  const conversationSpeechStoppedAtRef = useRef('');
  const finalizedConversationUtteranceRef = useRef<FinalizedConversationUtterance | null>(null);
  const durableRealtimeRunRef = useRef<(
    request: DurableRealtimeRunRequest,
  ) => Promise<DurableRealtimeToolResult>>(async () => ({
    status: 'needs_input', message: 'Kwilt Chat is not ready yet.',
  }));
  const [threads, setThreads] = useState<UnifiedChatThread[]>([]);
  const [aggregate, setAggregate] = useState<UnifiedChatThreadAggregate | null>(null);
  const [streamingResponse, setStreamingResponse] = useState<{ runId: string; text: string } | null>(null);
  const [processingNotice, setProcessingNotice] = useState<string | null>(null);
  const aggregateRef = useRef<UnifiedChatThreadAggregate | null>(null);
  const [prompt, setPrompt] = useState('');
  const voiceInsertionRef = useRef<UnifiedChatVoiceInsertion | null>(null);
  const [attachments, setAttachments] = useState<UnifiedChatAttachment[]>([]);
  const [surfaceReady, setSurfaceReady] = useState(false);
  const [contextPickerVisible, setContextPickerVisible] = useState(false);
  const [contextCandidates, setContextCandidates] = useState<UnifiedChatAttachableContext[]>([]);
  const [loading, setLoading] = useState(!freshEntry);
  const [error, setError] = useState<string | null>(null);
  const [surfaceLoadFailed, setSurfaceLoadFailed] = useState(false);
  const [clientActionInFlight, setClientActionInFlight] = useState(false);
  const [voice, setVoice] = useState<{
    state: 'idle' | 'recording' | 'transcribing' | 'connecting' | 'listening' | 'thinking' |
      'speaking' | 'interrupted' | 'recovering' | 'error';
    elapsedSeconds: number;
    levels: number[];
    provisionalTranscript?: string;
    finalizedUtterance?: FinalizedConversationUtterance;
    message?: string;
  }>({ state: 'idle', elapsedSeconds: 0, levels: [] });
  const conversationTurnFinalizerRef = useRef<ReturnType<typeof createConversationTurnFinalizer> | null>(null);
  if (!conversationTurnFinalizerRef.current) {
    conversationTurnFinalizerRef.current = createConversationTurnFinalizer({
      fallbackDelayMs: 2_000,
      onFinalized: ({ itemId, transcript, source }) => {
        const activeLatency = conversationLatencyRef.current;
        if (activeLatency && !activeLatency.published) {
          activeLatency.tracker.mark('transcript_final');
          if (source === 'frozen_provisional') activeLatency.fallbackUsed = true;
        }
        conversationAssistantCountRef.current = aggregateRef.current?.messages
          .filter((item) => item.role === 'assistant').length ?? 0;
        const finalizedUtterance = {
            id: itemId,
            text: transcript,
            sessionId: liveConversation.current?.sessionId ?? 'live-unavailable',
            source,
            locale: Intl.DateTimeFormat().resolvedOptions().locale || 'en-US',
            interrupted: conversationInterruptedRef.current,
            speechStoppedAt: conversationSpeechStoppedAtRef.current,
            finalizedAt: new Date().toISOString(),
          } as const;
        finalizedConversationUtteranceRef.current = finalizedUtterance;
        setVoice((current) => ({ ...current, state: 'thinking', provisionalTranscript: '',
          finalizedUtterance,
          message: 'Thinking…',
        }));
      },
    });
  }

  const clearVoiceTimer = useCallback(() => {
    if (voiceTimer.current) clearInterval(voiceTimer.current);
    voiceTimer.current = null;
  }, []);

  useEffect(() => {
    void prewarmOnDeviceChatModel();
  }, []);

  const publishConversationLatency = useCallback((
    outcome: 'completed' | 'interrupted' | 'failed',
    interrupted: boolean,
  ) => {
    const active = conversationLatencyRef.current;
    if (!active || active.published) return;
    active.published = true;
    track(
      posthogClient,
      AnalyticsEvent.UnifiedChatConversationLatency,
      buildUnifiedChatConversationLatencyTelemetry({
        outcome,
        planningStrategy: active.planningStrategy,
        requestClass: active.requestClass,
        timings: active.tracker.snapshot(),
        interrupted,
        fallbackUsed: active.fallbackUsed,
      }),
    );
  }, []);

  useEffect(() => { aggregateRef.current = aggregate; }, [aggregate]);

  const retrySurface = useCallback(() => {
    setError(null);
    setSurfaceLoadFailed(false);
    setSurfaceReady(false);
    webViewRef.current?.reload();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    Keyboard.dismiss();
    webViewRef.current?.injectJavaScript('document.activeElement?.blur(); true;');
  }, [menuOpen]);

  useEffect(() => {
    if (!isDrawer || !collapseRequestId) return;
    webViewRef.current?.injectJavaScript(
      'document.activeElement?.blur?.(); window.dispatchEvent(new Event("resize")); true;',
    );
  }, [collapseRequestId, isDrawer]);

  const loadThreadWithRecovery = useCallback(async (threadId: string) => {
    const loaded = await repository.loadThread(threadId);
    const activitiesRecovered = await recoverActivityMutations({
      aggregate: loaded,
      repository,
      store: activityStoreBoundary,
    });
    const plansRecovered = await recoverPlanMutations({
      aggregate: activitiesRecovered,
      repository,
      apply: (proposal, options) => applyApprovedPlanProposal({ proposal, store: planStoreBoundary, ...options }),
    });
    const goalsRecovered = await recoverGoalMutations({
      aggregate: plansRecovered, repository, store: goalStoreBoundary,
    });
    const arcsRecovered = await recoverArcMutations({
      aggregate: goalsRecovered, repository, store: arcStoreBoundary,
    });
    const profilesRecovered = await recoverProfileMutations({
      aggregate: arcsRecovered, repository, store: profileStoreBoundary,
    });
    const chaptersRecovered = await recoverChapterMutations({
      aggregate: profilesRecovered, repository, store: chapterStoreBoundary,
    });
    const moneyRecovered = await recoverMoneyCategoryMutations({
      aggregate: chaptersRecovered, repository, moneyRepository,
    });
    const moneyControlsRecovered = await recoverMoneyControlMutations({
      aggregate: moneyRecovered, repository,
      actions: createMoneyControlActions(createMoneyControlActionBoundary(moneyRepository)),
      loadSnapshot: moneyRepository.loadSnapshot,
    });
    const screenTimeRecovered = await recoverScreenTimeMutations({
      aggregate: moneyControlsRecovered, repository, client: getSupabaseClient(),
      personalBoundary: createPersonalScreenTimeRuleActionBoundary(),
    });
    for (const properties of buildUnifiedChatReconciliationTelemetry(loaded, screenTimeRecovered)) {
      track(posthogClient, AnalyticsEvent.UnifiedChatReconciled, properties);
    }
    return screenTimeRecovered;
  }, [moneyRepository, repository]);

  const postSnapshot = useCallback(
    (next: UnifiedChatThreadAggregate, type: 'host.initialize' | 'host.snapshot') => {
      const message = makeAgentWorkbenchHostMessage(
        type,
        buildWorkbenchSnapshot(next, prompt, {
          voice,
          attachments,
          ...(streamingResponse ? { streamingResponse } : {}),
        }),
      );
      webViewRef.current?.postMessage(JSON.stringify(message));
    },
    [attachments, prompt, streamingResponse, voice],
  );

  const freshWorkbenchContext = useMemo(
    () => (isDrawer ? buildFreshDrawerContext(launchContext, scopeLabel) : []),
    [isDrawer, launchContext, scopeLabel],
  );

  const postFreshSnapshot = useCallback(
    (type: 'host.initialize' | 'host.snapshot') => {
      const message = makeAgentWorkbenchHostMessage(
        type,
        buildFreshWorkbenchSnapshot(prompt, {
          voice,
          attachments,
          ...(isDrawer ? {
            placeholder: getFreshDrawerCopy(launchContext)?.placeholder ?? 'Ask, search or chat…',
            context: freshWorkbenchContext,
            offers: getFreshDrawerOffers(launchContext),
          } : {}),
        }),
      );
      webViewRef.current?.postMessage(JSON.stringify(message));
    },
    [attachments, freshWorkbenchContext, isDrawer, launchContext, prompt, voice],
  );

  const publishThreadId = useCallback((threadId: string) => {
    if (isDrawer) {
      onThreadIdChange?.(threadId);
      return;
    }
    navigation.setParams({ threadId });
  }, [isDrawer, navigation, onThreadIdChange]);

  const freshLaunchKey = launchContext ? JSON.stringify(launchContext) : 'no-launch-context';
  const freshThreadGateKeyRef = useRef<string | null>(null);
  if (!freshThreadGateRef.current || freshThreadGateKeyRef.current !== freshLaunchKey) {
    freshThreadGateKeyRef.current = freshLaunchKey;
    freshThreadGateRef.current = createFreshEntryThreadGate({
      create: () => repository.createThread(freshDrawerTitle),
      load: (thread) => loadThreadWithRecovery(thread.id),
      cleanup: (thread) => repository.deleteThread(thread.id),
      prepare: async (createdAggregate) => {
        if (!launchContext) return createdAggregate;
        const attachment = await loadUnifiedChatLaunchAttachment(launchContext);
        if (!attachment) throw new Error('That Kwilt context is no longer available.');
        await repository.attachContext({
          ...attachment,
          threadId: createdAggregate.thread.id,
          source: 'launch',
        });
        consumedLaunchContext.current = freshLaunchKey;
        return loadThreadWithRecovery(createdAggregate.thread.id);
      },
    });
  }

  const openThread = useCallback(
    async (threadId: string) => {
      setError(null);
      try {
        const next = await loadThreadWithRecovery(threadId);
        setAggregate(next);
        setPrompt('');
        setAttachments([]);
        publishThreadId(threadId);
        if (surfaceReady) postSnapshot(next, 'host.initialize');
      } catch {
        setError('Kwilt could not open that chat.');
      }
    },
    [loadThreadWithRecovery, postSnapshot, publishThreadId, surfaceReady],
  );

  const refreshThreads = useCallback(async () => {
    if (!freshEntry) setLoading(true);
    setError(null);
    try {
      const next = await repository.listThreads();
      setThreads(next);
      if (next.length > 0 && !aggregate && !freshEntry) {
        const requested = requestedThreadId && next.some((thread) => thread.id === requestedThreadId)
          ? requestedThreadId
          : next[0].id;
        await openThread(requested);
      }
      if (next.length === 0 && launchContext && !aggregate && !freshEntry) {
        const thread = await repository.createThread();
        setThreads([thread]);
        await openThread(thread.id);
      }
    } catch {
      setError('Sign in and try opening Chat again.');
    } finally {
      if (!freshEntry) setLoading(false);
    }
  }, [aggregate, freshEntry, launchContext, openThread, repository, requestedThreadId]);

  useEffect(() => {
    if (!config.enabled) {
      setLoading(false);
      return;
    }
    void refreshThreads();
    // Initial hydration only. Later refreshes are explicit after mutations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.enabled]);

  useEffect(() => {
    if (!requestedThreadId || !aggregate || aggregate.thread.id === requestedThreadId) return;
    void (async () => {
      setLoading(true);
      try {
        await openThread(requestedThreadId);
        setThreads(await repository.listThreads());
      } finally {
        setLoading(false);
      }
    })();
  }, [aggregate, openThread, repository, requestedThreadId]);

  useEffect(() => {
    if (requestedThreadId !== null) return;
    setAggregate(null);
    setThreads([]);
    setPrompt('');
    setAttachments([]);
  }, [requestedThreadId]);

  useEffect(() => {
    if (!freshEntry) return;
    setAggregate(null);
    setPrompt('');
    setAttachments([]);
  }, [freshEntry, widgetLaunchId]);

  useEffect(() => () => {
    clearVoiceTimer();
    void cancelUnifiedChatVoiceRecording();
    void liveConversation.current?.stop();
    liveConversation.current = null;
    conversationTurnFinalizerRef.current?.reset();
    conversationActivationFeedback.cancel();
    conversationProgressSpeech.stop();
    void liveConversationSpeechFallback.stop();
  }, [clearVoiceTimer]);

  const stopConversation = useCallback(async () => {
    conversationActivationFeedback.stop();
    clearVoiceTimer();
    const current = liveConversation.current;
    liveConversation.current = null;
    conversationTurnFinalizerRef.current?.reset();
    conversationResponseGenerationRef.current += 1;
    conversationProgressHistoryRef.current = [];
    conversationProgressSpeech.stop();
    publishConversationLatency('interrupted', true);
    await Promise.all([current?.stop(), liveConversationSpeechFallback.stop()]);
    setVoice({ state: 'idle', elapsedSeconds: 0, levels: [] });
  }, [clearVoiceTimer, publishConversationLatency]);

  const failConversation = useCallback((message = 'Conversation connection ended. Try again.') => {
    const failedConnection = liveConversation.current;
    liveConversation.current = null;
    clearVoiceTimer();
    conversationTurnFinalizerRef.current?.reset();
    conversationActivationFeedback.fail();
    conversationProgressSpeech.stop();
    void Promise.all([failedConnection?.stop(), liveConversationSpeechFallback.stop()]);
    setVoice({ state: 'error', elapsedSeconds: 0, levels: [], message });
  }, [clearVoiceTimer]);

  const startConversation = useCallback(async () => {
    if (liveConversation.current || voice.state === 'connecting') return;
    conversationActivationFeedback.begin();
    await cancelUnifiedChatVoiceRecording();
    await sweepLegacyCookVoiceCacheOnce();
    conversationProgressHistoryRef.current = [];
    conversationAssistantSpeechActiveRef.current = false;
    conversationInterruptedRef.current = false;
    conversationSpeechStoppedAtRef.current = '';
    finalizedConversationUtteranceRef.current = null;
    conversationTurnFinalizerRef.current?.reset();
    clearVoiceTimer();
    setVoice({ state: 'connecting', elapsedSeconds: 0, levels: [], message: 'Connecting…' });
    try {
      const connection = await startLiveConversationSession({
        onDurableRun: (request) => durableRealtimeRunRef.current(request),
        onConnected: (connection) => {
          liveConversation.current = connection;
          setVoice((current) => ({ ...current, state: 'listening', message: 'Listening' }));
          void conversationActivationFeedback.ready(connection);
          voiceTimer.current = setInterval(() => {
            setVoice((current) => current.state === 'idle' || current.state === 'error'
              ? current
              : { ...current, elapsedSeconds: current.elapsedSeconds + 1 });
          }, 1000);
        },
        onEvent: (event) => {
          conversationTurnFinalizerRef.current?.handle(event);
          if (event.type === 'speech_started') {
            const interruptedAssistantSpeech = conversationAssistantSpeechActiveRef.current;
            if (interruptedAssistantSpeech) liveConversation.current?.cancelResponse();
            conversationInterruptedRef.current = interruptedAssistantSpeech;
            conversationAssistantSpeechActiveRef.current = false;
            conversationResponseGenerationRef.current += 1;
            conversationProgressSpeech.stop();
            void liveConversationSpeechFallback.stop();
            conversationActivationFeedback.listening();
            publishConversationLatency('interrupted', true);
            setVoice((current) => ({ ...current, state: 'listening', provisionalTranscript: '',
              finalizedUtterance: undefined, message: 'Listening' }));
          } else if (event.type === 'speech_stopped') {
            conversationSpeechStoppedAtRef.current = new Date().toISOString();
            conversationResponseGenerationRef.current += 1;
            conversationActivationFeedback.thinking();
            const tracker = createConversationLatencyTracker();
            tracker.mark('speech_stopped');
            conversationLatencyRef.current = {
              tracker,
              planningStrategy: 'full',
              requestClass: 'general',
              fallbackUsed: false,
              published: false,
            };
            setVoice((current) => ({ ...current, state: 'thinking', message: 'Thinking…' }));
          } else if (event.type === 'transcript_delta') {
            setVoice((current) => ({ ...current,
              state: current.state === 'thinking' ? 'thinking' : 'listening',
              provisionalTranscript: `${current.provisionalTranscript ?? ''}${event.delta}` }));
          } else if (event.type === 'transcript_final') {
          } else if (event.type === 'tool_call') {
          } else if (event.type === 'assistant_audio_started') {
            conversationAssistantSpeechActiveRef.current = true;
            conversationLatencyRef.current?.tracker.mark('playback_started');
            conversationActivationFeedback.speaking();
            setVoice((current) => ({ ...current, state: 'speaking', message: 'Speaking' }));
            publishConversationLatency('completed', false);
          } else if (event.type === 'assistant_audio_stopped') {
            conversationAssistantSpeechActiveRef.current = false;
            if (liveConversation.current) conversationActivationFeedback.listening();
            setVoice((current) => liveConversation.current
              ? { ...current, state: 'listening', finalizedUtterance: undefined, message: 'Listening' }
              : current);
          } else if (event.type === 'provider_error') {
            console.warn('[live-conversation] Provider event failed', { message: event.message });
            failConversation();
          }
        },
        onFailure: (error) => {
          console.warn('[live-conversation] Connection failed', { message: error.message });
          failConversation();
        },
      });
      if (!liveConversation.current) liveConversation.current = connection;
    } catch (conversationError) {
      conversationActivationFeedback.fail();
      setVoice({ state: 'error', elapsedSeconds: 0, levels: [],
        message: conversationError instanceof Error ? conversationError.message : 'Conversation mode is unavailable.' });
    }
  }, [clearVoiceTimer, failConversation, publishConversationLatency, voice.state]);

  useEffect(() => {
    if (routeParams?.mode !== 'conversation' || !surfaceReady || conversationAutoStartRef.current) return;
    conversationAutoStartRef.current = true;
    void startConversation();
  }, [routeParams?.mode, startConversation, surfaceReady]);

  useEffect(() => {
    if (voice.state !== 'thinking' || !aggregate) return;
    if (liveConversation.current?.usesRealtimeSpeech) return;
    const assistantMessages = aggregate.messages.filter((item) => item.role === 'assistant');
    if (assistantMessages.length <= conversationAssistantCountRef.current) return;
    const responseMessage = assistantMessages.at(-1);
    const response = responseMessage?.body.trim();
    if (!responseMessage || !response) return;
    conversationAssistantCountRef.current = assistantMessages.length;
    const responseGeneration = conversationResponseGenerationRef.current;
    setVoice((current) => ({ ...current,
      state: 'thinking', finalizedUtterance: undefined, message: 'Preparing voice…' }));
    conversationLatencyRef.current?.tracker.mark('speech_request_started');
    void (async () => {
      await conversationProgressSpeech.finishBeforeFinalAnswer();
      if (responseGeneration !== conversationResponseGenerationRef.current || !liveConversation.current) return;
      await liveConversationSpeechFallback.speakMessage(responseMessage, {
      onFallback: () => {
        if (conversationLatencyRef.current) conversationLatencyRef.current.fallbackUsed = true;
      },
      onStart: () => {
        conversationAssistantSpeechActiveRef.current = true;
        conversationLatencyRef.current?.tracker.mark('playback_started');
        conversationActivationFeedback.speaking();
        setVoice((current) => ({ ...current, state: 'speaking', message: 'Speaking' }));
        publishConversationLatency('completed', false);
      },
      });
    })().catch(() => {
      publishConversationLatency('failed', false);
    }).finally(() => {
      conversationAssistantSpeechActiveRef.current = false;
      if (liveConversation.current) conversationActivationFeedback.listening();
      setVoice((current) => liveConversation.current
        ? { ...current, state: 'listening', message: 'Listening' }
        : current);
    });
  }, [aggregate, publishConversationLatency, voice.state]);

  useEffect(() => {
    if (!freshEntry || freshEntrySource !== 'widget') return undefined;
    freshEntrySentRef.current = false;
    freshFirstSendRequestIdRef.current = null;
    return () => {
      if (!freshEntrySentRef.current) {
        track(
          posthogClient,
          AnalyticsEvent.UnifiedChatFreshEntryOutcome,
          buildUnifiedChatFreshEntryTelemetry(freshEntrySource, 'abandoned'),
        );
      }
    };
  }, [freshEntry, freshEntrySource]);

  useEffect(() => {
    if (surfaceReady && aggregate && !freshEntry) postSnapshot(aggregate, 'host.snapshot');
    if (surfaceReady && freshEntry && !aggregate) postFreshSnapshot('host.snapshot');
  }, [aggregate, freshEntry, postFreshSnapshot, postSnapshot, surfaceReady]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' || !aggregate) return;
      const hasResumableAction = (aggregate.clientActions ?? []).some(
        (item) => item.status === 'pending_client_action' || item.status === 'presenting',
      );
      const hasServerOwnedRun = aggregate.runs.some((run) =>
        run.originChannel === 'mobile' && (run.status === 'queued' || run.status === 'active'));
      if (!hasResumableAction && !hasServerOwnedRun) return;
      const threadId = aggregate.thread.id;
      void loadThreadWithRecovery(threadId).then((next) => {
        setAggregate((current) => current?.thread.id === threadId ? next : current);
      }).catch(() => setError(hasServerOwnedRun
        ? 'Kwilt could not refresh the response yet.'
        : 'Kwilt could not refresh the pending device review.'));
    });
    return () => subscription.remove();
  }, [aggregate, loadThreadWithRecovery]);

  useEffect(() => {
    const threadId = aggregate?.thread.id;
    const hasServerOwnedRun = aggregate?.runs.some((run) =>
      run.originChannel === 'mobile' && (run.status === 'queued' || run.status === 'active'));
    if (!threadId || !hasServerOwnedRun) return undefined;
    let cancelled = false;
    const refreshTimer = setTimeout(() => {
      void loadThreadWithRecovery(threadId).then((next) => {
        if (!cancelled) setAggregate((current) => current?.thread.id === threadId ? next : current);
      }).catch(() => undefined);
    }, 1_000);
    return () => {
      cancelled = true;
      clearTimeout(refreshTimer);
    };
  }, [aggregate, loadThreadWithRecovery]);

  useEffect(() => {
    if (!launchContext || !aggregate) return;
    const launchKey = JSON.stringify(launchContext);
    if (consumedLaunchContext.current === launchKey) return;
    consumedLaunchContext.current = launchKey;
    const threadId = aggregate.thread.id;
    void (async () => {
      try {
        const attachment = await loadUnifiedChatLaunchAttachment(launchContext);
        if (!attachment) {
          setError('That Kwilt item is no longer available. Chat opened without it.');
          return;
        }
        await repository.attachContext({
          ...attachment,
          threadId,
          source: 'launch',
        });
        const next = await loadThreadWithRecovery(threadId);
        setAggregate((current) => current?.thread.id === threadId ? next : current);
      } catch {
        setError('Kwilt could not attach that context. Chat opened without it.');
      }
    })();
  }, [aggregate, launchContext, loadThreadWithRecovery, repository]);

  const createThread = useCallback(async () => {
    setError(null);
    try {
      const thread = await repository.createThread();
      const next = await loadThreadWithRecovery(thread.id);
      setThreads((current) => [thread, ...current.filter((item) => item.id !== thread.id)]);
      setAggregate(next);
      setPrompt('');
      setAttachments([]);
      publishThreadId(thread.id);
      if (surfaceReady) postSnapshot(next, 'host.initialize');
    } catch {
      setError('Kwilt could not create a new chat.');
    }
  }, [loadThreadWithRecovery, postSnapshot, publishThreadId, repository, surfaceReady]);

  const archiveThread = useCallback(
    async (thread: UnifiedChatThread) => {
      try {
        await repository.archiveThread(thread.id);
        const remaining = threads.filter((item) => item.id !== thread.id);
        setThreads(remaining);
        if (aggregate?.thread.id === thread.id) {
          setAggregate(null);
          if (remaining[0]) await openThread(remaining[0].id);
        }
      } catch {
        setError('Kwilt could not archive that chat.');
      }
    },
    [aggregate?.thread.id, openThread, repository, threads],
  );

  const renameThread = useCallback(
    (thread: UnifiedChatThread) => {
      Alert.prompt(
        'Rename chat',
        undefined,
        async (title) => {
          if (!title?.trim()) return;
          try {
            const updated = await repository.renameThread(thread.id, title);
            setThreads((current) =>
              current.map((item) => (item.id === updated.id ? updated : item)),
            );
            if (aggregate?.thread.id === updated.id) {
              setAggregate((current) =>
                current ? { ...current, thread: updated } : current,
              );
            }
          } catch {
            setError('Kwilt could not rename that chat.');
          }
        },
        'plain-text',
        thread.title,
      );
    },
    [aggregate?.thread.id, repository],
  );

  const copyThread = useCallback(async (threadAggregate: UnifiedChatThreadAggregate) => {
    try {
      await Clipboard.setStringAsync(buildUnifiedChatTranscript(threadAggregate));
      Alert.alert('Chat copied', 'The full conversation is ready to paste.');
    } catch {
      Alert.alert('Copy failed', 'Kwilt could not copy this chat on this device right now.');
    }
  }, []);

  const showThreadActions = useCallback(
    (threadAggregate: UnifiedChatThreadAggregate) => {
      Alert.alert(threadAggregate.thread.title, undefined, [
        { text: 'Rename', onPress: () => renameThread(threadAggregate.thread) },
        { text: 'Copy chat', onPress: () => void copyThread(threadAggregate) },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: () => void archiveThread(threadAggregate.thread),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [archiveThread, copyThread, renameThread],
  );

  const openNativeClientAction = useCallback((clientAction: UnifiedChatClientAction) => {
    const instruction = resolveClientActionOpenInstruction(clientAction);
    if (!instruction) throw new Error('This native review surface is unavailable.');
    prepareClientActionNativeReview(clientAction, useCheckinDraftStore.getState());
    if (instruction.kind === 'search') useAppStore.getState().openGlobalSearch();
    else navigateWhenReady(instruction.name, instruction.params);
  }, []);

  const decideClientAction = useCallback(async (
    clientAction: UnifiedChatClientAction,
    decision: 'continue' | 'decline',
  ) => {
    if (!aggregate || clientAction.threadId !== aggregate.thread.id || clientActionInFlight) return;
    setClientActionInFlight(true);
    setError(null);
    try {
      await executeClientActionDecision({
        clientAction,
        decision,
        repository,
        open: openNativeClientAction,
      });
      setAggregate(await loadThreadWithRecovery(aggregate.thread.id));
    } catch (clientActionError) {
      setAggregate(await loadThreadWithRecovery(aggregate.thread.id).catch(() => aggregate));
      setError(clientActionError instanceof Error
        ? clientActionError.message
        : 'Kwilt could not open that native review.');
    } finally {
      setClientActionInFlight(false);
    }
  }, [aggregate, clientActionInFlight, loadThreadWithRecovery, openNativeClientAction, repository]);

  const transitionServerOwnedRun = useCallback(async (
    runId: string,
    disposition: { type: 'stop' } | { type: 'steer'; prompt: string },
  ): Promise<UnifiedChatThreadAggregate | null> => {
    const threadId = aggregateRef.current?.thread.id;
    if (!threadId) return null;
    return transitionDurableMobileChatRun({
      threadId, runId, disposition, loadThread: loadThreadWithRecovery,
      transitionRunStatus: repository.transitionRunStatus,
    });
  }, [loadThreadWithRecovery, repository]);

  const handleSurfaceMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      const message = parseAgentWorkbenchSurfaceMessage(event.nativeEvent.data);
      if (!message) return;
      if (message.type === 'surface.ready') {
        setSurfaceReady(true);
        if (aggregate && !freshEntry) postSnapshot(aggregate, 'host.initialize');
        else if (freshEntry) postFreshSnapshot('host.initialize');
        return;
      }
      if (handledRequestIds.current.has(message.requestId)) return;
      handledRequestIds.current.add(message.requestId);
      if (handledRequestIds.current.size > 200) {
        const oldest = handledRequestIds.current.values().next().value;
        if (typeof oldest === 'string') handledRequestIds.current.delete(oldest);
      }
      const command = message.command;
      if (command.type === 'composer.focus.change') {
        onComposerFocusChange?.(command.focused);
        if (!menuOpen || command.focused) {
          void HapticsService.trigger(
            command.focused ? 'canvas.toggle.on' : 'canvas.toggle.off',
          );
        }
        return;
      }
      if (command.type === 'composer.change') {
        setPrompt(command.prompt);
        return;
      }
      if (command.type === 'timeline.jump.latest') {
        void HapticsService.trigger('canvas.selection');
        return;
      }
      if (command.type === 'attachment.pick') {
        try {
          const picked = await pickUnifiedChatAttachment();
          if (!picked) return;
          setAttachments((current) => validateUnifiedChatAttachmentDraftSet([...current, picked]));
          if (picked.status === 'inspecting') {
            try {
              const inspection = await inspectUnifiedChatAttachments([picked]);
              setAttachments((current) => current.some((item) => item.id === picked.id)
                ? current.map((item) => item.id === picked.id
                    ? applyUnifiedChatAttachmentInspection([item], inspection)[0]
                    : item)
                : current);
            } catch (inspectionError) {
              const reason = inspectionError instanceof Error
                ? inspectionError.message
                : 'Kwilt could not inspect that attachment.';
              setAttachments((current) => current.map((item) => item.id === picked.id
                ? { ...item, status: 'failed', content: '', failureReason: reason }
                : item));
            }
          }
        } catch (attachmentError) {
          setError(attachmentError instanceof Error ? attachmentError.message : 'Kwilt could not attach that document.');
        }
        return;
      }
      if (command.type === 'attachment.remove') {
        setAttachments((current) => current.filter((item) => item.id !== command.attachmentId));
        return;
      }
      if (command.type === 'conversation.start') {
        Keyboard.dismiss();
        await startConversation();
        return;
      }
      if (command.type === 'conversation.stop') {
        await stopConversation();
        return;
      }
      if (command.type === 'voice.toggle') {
        if ((!freshEntry && aggregate?.runs.some((run) => run.status === 'active' || run.status === 'queued')) || voice.state === 'transcribing') return;
        if (voice.state === 'recording') {
          clearVoiceTimer();
          void HapticsService.trigger('canvas.recording.stop');
          setVoice((current) => ({
            state: 'transcribing', elapsedSeconds: current.elapsedSeconds,
            levels: current.levels, message: 'Transcribing…',
          }));
          try {
            const transcript = await stopAndTranscribeUnifiedChatVoice();
            setPrompt((current) => insertUnifiedChatTranscriptAtSelection({
              currentPrompt: current,
              transcript,
              insertion: voiceInsertionRef.current,
            }));
            voiceInsertionRef.current = null;
            setVoice({ state: 'idle', elapsedSeconds: 0, levels: [] });
          } catch (voiceError) {
            voiceInsertionRef.current = null;
            setVoice({
              state: 'error', elapsedSeconds: 0, levels: [],
              message: voiceError instanceof Error ? voiceError.message : 'Voice input failed.',
            });
          }
          return;
        }
        voiceInsertionRef.current = command.prompt === undefined
          ? null
          : {
              prompt: command.prompt,
              selectionStart: command.selectionStart,
              selectionEnd: command.selectionEnd,
            };
        Keyboard.dismiss();
        webViewRef.current?.injectJavaScript('document.activeElement?.blur(); true;');
        try {
          await startUnifiedChatVoiceRecording((level) => {
            setVoice((current) => current.state === 'recording'
              ? { ...current, levels: appendUnifiedChatVoiceLevel(current.levels, level) }
              : current);
          });
          void HapticsService.trigger('canvas.recording.start');
          setVoice({ state: 'recording', elapsedSeconds: 0, levels: [], message: 'Tap again when you’re done.' });
          clearVoiceTimer();
          voiceTimer.current = setInterval(() => {
            setVoice((current) => current.state === 'recording'
              ? { ...current, elapsedSeconds: current.elapsedSeconds + 1 }
              : current);
          }, 1000);
        } catch (voiceError) {
          voiceInsertionRef.current = null;
          setVoice({
            state: 'error', elapsedSeconds: 0, levels: [],
            message: voiceError instanceof Error ? voiceError.message : 'Voice input failed.',
          });
        }
        return;
      }
      if (freshEntry && command.type === 'context.remove') {
        const context = freshWorkbenchContext[0];
        if (!context || command.contextId !== context.id || command.expectedVersion !== context.version) return;
        setFreshLaunchContext(null);
        return;
      }
      if (freshEntry && command.type !== 'run.send') return;
      if (command.type === 'context.add' && aggregate) {
        try {
          const activeIds = new Set((aggregate.contextRefs ?? []).filter((item) => item.active).map((item) => `${item.objectType}:${item.objectId}`));
          const candidates = await loadUnifiedChatAttachableContexts();
          setContextCandidates(candidates.filter((candidate) => !activeIds.has(`${candidate.objectType}:${candidate.objectId}`)));
          setContextPickerVisible(true);
        } catch {
          setError('Kwilt could not load context choices.');
        }
        return;
      }
      if (command.type === 'thread.create') {
        await createThread();
        return;
      }
      if (command.type === 'message.feedback') {
        if (!aggregate?.messages.some((item) => item.id === command.messageId)) return;
        try {
          const updated = await repository.setMessageFeedback(
            command.messageId,
            command.feedback,
            command.reason,
          );
          setAggregate((current) =>
            current
              ? {
                  ...current,
                  messages: current.messages.map((item) =>
                    item.id === updated.id ? updated : item,
                  ),
                }
              : current,
          );
        } catch {
          setError('Kwilt could not save that feedback.');
        }
        return;
      }
      if (command.type === 'source.open') {
        const inspectableUrls = new Set(
          (aggregate?.messages ?? [])
            .filter((item) => item.role === 'assistant')
            .flatMap((item) => extractInspectableSourceUrls(item.body)),
        );
        if (!inspectableUrls.has(command.url)) return;
        await Linking.openURL(command.url).catch(() => {
          setError('Kwilt could not open that source.');
        });
        return;
      }
      if (command.type === 'context.remove' && aggregate) {
        const context = (aggregate.contextRefs ?? []).find(
          (item) => item.id === command.contextId && item.active,
        );
        if (!context || context.version !== command.expectedVersion) return;
        try {
          await repository.removeContext(context.id, context.version);
          setAggregate(await loadThreadWithRecovery(aggregate.thread.id));
        } catch (contextError) {
          setAggregate(await loadThreadWithRecovery(aggregate.thread.id).catch(() => aggregate));
          setError(contextError instanceof Error ? contextError.message : 'Kwilt could not remove that context.');
        }
        return;
      }
      if (command.type === 'object.open' && aggregate) {
        const isInThread = (aggregate.evidence ?? []).some(
          (item) => item.objectType === command.object.type && item.objectId === command.object.id,
        ) || (aggregate.receipts ?? []).some(
          (item) => item.resultingObjectType === command.object.type && item.resultingObjectId === command.object.id,
        ) || (aggregate.contextRefs ?? []).some(
          (item) => item.active && item.objectType === command.object.type && item.objectId === command.object.id,
        );
        if (!isInThread) return;
        const target = resolveUnifiedChatObjectReturn(command.object);
        if (target && command.object.type === 'activity') {
          navigateWhenReady('MainTabs', {
            screen: 'ActivitiesTab',
            params: {
              screen: 'ActivityDetail',
              params: {
                activityId: command.object.id,
                returnToUnifiedChatThreadId: aggregate.thread.id,
              },
            },
          });
        } else if (target) {
          navigateWhenReady(target.route.name, target.route.params);
        }
        return;
      }
      if (command.type === 'client_action.decide' && aggregate) {
        const clientAction = (aggregate.clientActions ?? []).find((item) => item.id === command.actionId);
        if (!clientAction || clientAction.version !== command.expectedVersion) return;
        await decideClientAction(clientAction, command.action);
        return;
      }
      if (command.type === 'proposal.decide_many' && aggregate) {
        setError(null);
        try {
          const executeApprovedProposal = async (proposal: UnifiedChatProposal) => {
            if (proposal.capabilityId === 'recipes') {
              await executeRecipeProposalDecision({
                proposal, action: 'approve', repository, recipes: recipeMutationBoundary, resolveCookRecipe,
              });
            } else if (proposal.capabilityId === 'meal_planning') {
              if (isMealPlanProposal(proposal)) {
                await executeMealPlanProposalDecision({ proposal, action: 'approve', repository });
              } else if (isMealPreferenceProposal(proposal)) {
                await executeMealPreferenceProposalDecision({ proposal, action: 'approve', repository });
              }
            } else if (proposal.capabilityId === 'groceries') {
              await executeGroceryProposalDecision({ proposal, action: 'approve', repository });
            } else if (proposal.capabilityId === 'household') {
              await executeHouseholdProposalDecision({ proposal, action: 'approve', repository,
                boundary: createHouseholdActionBoundary(getSupabaseClient()) });
            } else if (proposal.capabilityId === 'money') {
              if (isMoneyCategoryProposal(proposal)) {
                await executeMoneyCategoryProposalDecision({ proposal, action: 'approve', repository, moneyRepository });
              } else if (isMoneyControlProposal(proposal)) {
                await executeMoneyControlProposalDecision({
                  proposal, action: 'approve', repository,
                  actions: createMoneyControlActions(createMoneyControlActionBoundary(moneyRepository)),
                });
              }
            } else if (proposal.capabilityId === 'chores') {
              await executeChoreProposalDecision({ proposal, action: 'approve', repository,
                actions: createChoreActions(createChoreRepository()) });
            } else if (proposal.capabilityId === 'screenTime') {
              await executeScreenTimeProposalDecision({
                proposal, action: 'approve', repository, client: getSupabaseClient(),
                personalBoundary: createPersonalScreenTimeRuleActionBoundary(),
              });
            } else if (proposal.capabilityId === 'plan') {
              await executePlanProposalDecision({
                proposal, action: 'approve', repository,
                apply: (approved) => applyApprovedPlanProposal({ proposal: approved, store: planStoreBoundary }),
              });
            } else if (proposal.capabilityId === 'arcs') {
              await executeArcProposalDecision({ proposal, action: 'approve', repository, store: arcStoreBoundary });
            } else if (proposal.capabilityId === 'goals') {
              await executeGoalProposalDecision({ proposal, action: 'approve', repository, store: goalStoreBoundary });
            } else if (proposal.capabilityId === 'profile') {
              await executeProfileProposalDecision({ proposal, action: 'approve', repository, store: profileStoreBoundary });
            } else if (proposal.capabilityId === 'chapters') {
              await executeChapterProposalDecision({ proposal, action: 'approve', repository, store: chapterStoreBoundary });
            } else if (proposal.capabilityId === 'todos') {
              await executeProposalDecision({
                proposal, action: 'approve', repository, store: activityStoreBoundary,
              });
            } else {
              throw new Error('This relationship change must be reviewed separately.');
            }
          };
          const result = await executeProposalOutcomeBatch({
            proposals: aggregate.proposals ?? [],
            items: command.items,
            execute: executeApprovedProposal,
          });
          setAggregate(await loadThreadWithRecovery(aggregate.thread.id));
          if (result.failed.length > 0 || result.skipped.length > 0) {
            setError(
              result.applied.length > 0
                ? `${result.applied.length} applied; ${result.failed.length} failed and ${result.skipped.length} skipped.`
                : result.failed[0]?.message ?? result.skipped[0]?.reason ?? 'Kwilt could not apply that outcome.',
            );
          }
        } catch (decisionError) {
          setAggregate(await loadThreadWithRecovery(aggregate.thread.id).catch(() => aggregate));
          setError(decisionError instanceof Error ? decisionError.message : 'Kwilt could not apply that outcome.');
        }
        return;
      }
      if (command.type === 'proposal.decide' && aggregate) {
        const proposal = (aggregate.proposals ?? []).find((item) => item.id === command.proposalId);
        if (!proposal || proposal.version !== command.expectedVersion) return;
        if (proposal.capabilityId === 'recipes') {
          if (command.action === 'edit') {
            setError('Ask Kwilt to prepare a revised Recipe change.');
            return;
          }
          setError(null);
          try {
            await executeRecipeProposalDecision({
              proposal, action: command.action, repository, recipes: recipeMutationBoundary, resolveCookRecipe,
            });
            setAggregate(await loadThreadWithRecovery(aggregate.thread.id));
          } catch (decisionError) {
            setAggregate(await loadThreadWithRecovery(aggregate.thread.id).catch(() => aggregate));
            setError(decisionError instanceof Error ? decisionError.message : 'Kwilt could not update that Recipe.');
          }
          return;
        }
        if (proposal.capabilityId === 'meal_planning') {
          if (command.action === 'edit') {
            setError(isMealPlanProposal(proposal)
              ? 'Ask Kwilt to prepare a revised Meal Plan change.'
              : 'Ask Kwilt to prepare revised meal preferences.');
            return;
          }
          setError(null);
          try {
            if (isMealPlanProposal(proposal)) {
              await executeMealPlanProposalDecision({ proposal, action: command.action, repository });
            } else if (isMealPreferenceProposal(proposal)) {
              await executeMealPreferenceProposalDecision({ proposal, action: command.action, repository });
            }
            setAggregate(await loadThreadWithRecovery(aggregate.thread.id));
          } catch (decisionError) {
            setAggregate(await loadThreadWithRecovery(aggregate.thread.id).catch(() => aggregate));
            setError(decisionError instanceof Error ? decisionError.message : 'Kwilt could not apply that Meal Plan change.');
          }
          return;
        }
        if (proposal.capabilityId === 'groceries') {
          if (command.action === 'edit') {
            setError('Ask Kwilt to prepare a revised Food Stock change.');
            return;
          }
          setError(null);
          try {
            await executeGroceryProposalDecision({ proposal, action: command.action, repository });
            setAggregate(await loadThreadWithRecovery(aggregate.thread.id));
          } catch (decisionError) {
            setAggregate(await loadThreadWithRecovery(aggregate.thread.id).catch(() => aggregate));
            setError(decisionError instanceof Error ? decisionError.message : 'Kwilt could not apply that Food Stock change.');
          }
          return;
        }
        if (proposal.capabilityId === 'household') {
          if (command.action === 'edit') {
            setError('Ask Kwilt to prepare a revised Household change.');
            return;
          }
          setError(null);
          try {
            const completion = await executeHouseholdProposalDecision({
              proposal, action: command.action, repository,
              boundary: createHouseholdActionBoundary(getSupabaseClient()),
            });
            setAggregate(await loadThreadWithRecovery(aggregate.thread.id));
            if (completion.status === 'pending_client_action') {
              setError('The Household record is reconciled. Finish device-local cleanup from Household Devices.');
            }
          } catch (decisionError) {
            setAggregate(await loadThreadWithRecovery(aggregate.thread.id).catch(() => aggregate));
            setError(decisionError instanceof Error ? decisionError.message : 'Kwilt could not apply that Household change.');
          }
          return;
        }
        if (proposal.capabilityId === 'money') {
          if (command.action === 'edit') {
            setError('Ask Kwilt to prepare a revised Money category change.');
            return;
          }
          setError(null);
          try {
            if (isMoneyCategoryProposal(proposal)) {
              await executeMoneyCategoryProposalDecision({
                proposal, action: command.action, repository, moneyRepository,
              });
            } else if (isMoneyControlProposal(proposal)) {
              await executeMoneyControlProposalDecision({
                proposal, action: command.action, repository,
                actions: createMoneyControlActions(createMoneyControlActionBoundary(moneyRepository)),
              });
            }
            setAggregate(await loadThreadWithRecovery(aggregate.thread.id));
          } catch (decisionError) {
            setAggregate(await loadThreadWithRecovery(aggregate.thread.id).catch(() => aggregate));
            setError(decisionError instanceof Error ? decisionError.message : 'Kwilt could not update that Money category.');
          }
          return;
        }
        if (proposal.capabilityId === 'chores') {
          if (command.action === 'edit') {
            setError('Ask Kwilt to prepare a revised Chore change.');
            return;
          }
          setError(null);
          try {
            await executeChoreProposalDecision({ proposal, action: command.action, repository,
              actions: createChoreActions(createChoreRepository()) });
            setAggregate(await loadThreadWithRecovery(aggregate.thread.id));
          } catch (decisionError) {
            setAggregate(await loadThreadWithRecovery(aggregate.thread.id).catch(() => aggregate));
            setError(decisionError instanceof Error ? decisionError.message : 'Kwilt could not apply that Chore change.');
          }
          return;
        }
        if (proposal.capabilityId === 'screenTime') {
          if (command.action === 'edit') {
            setError('Ask Kwilt to prepare a revised Screen Time change.');
            return;
          }
          setError(null);
          track(posthogClient, AnalyticsEvent.FamilyScreenTimeChatProposalDecided,
            buildFamilyScreenTimeDecisionTelemetry(proposal, command.action));
          try {
            await executeScreenTimeProposalDecision({
              proposal, action: command.action, repository, client: getSupabaseClient(),
              personalBoundary: createPersonalScreenTimeRuleActionBoundary(),
            });
            track(posthogClient, AnalyticsEvent.FamilyScreenTimeChatPolicyOutcome,
              buildFamilyScreenTimeDecisionTelemetry(
                proposal, command.action, command.action === 'approve' ? 'saved' : 'not_applied',
              ));
            setAggregate(await loadThreadWithRecovery(aggregate.thread.id));
          } catch (decisionError) {
            track(posthogClient, AnalyticsEvent.FamilyScreenTimeChatPolicyOutcome,
              buildFamilyScreenTimeDecisionTelemetry(proposal, command.action, 'failed'));
            setAggregate(await loadThreadWithRecovery(aggregate.thread.id).catch(() => aggregate));
            setError(decisionError instanceof Error
              ? decisionError.message
              : 'Kwilt could not save that Screen Time change.');
          }
          return;
        }
        if (proposal.capabilityId === 'plan') {
          if (command.action === 'edit') {
            setError('Change the timing in Plan after adding it.');
            return;
          }
          setError(null);
          try {
            await executePlanProposalDecision({
              proposal,
              action: command.action,
              repository,
              apply: (approved) => applyApprovedPlanProposal({
                proposal: approved,
                store: planStoreBoundary,
              }),
            });
            setAggregate(await loadThreadWithRecovery(aggregate.thread.id));
          } catch (decisionError) {
            setAggregate(await loadThreadWithRecovery(aggregate.thread.id).catch(() => aggregate));
            setError(decisionError instanceof Error ? decisionError.message : 'Kwilt could not add that Plan item.');
          }
          return;
        }
        if (proposal.capabilityId === 'arcs') {
          if (command.action === 'edit') {
            setError('Ask Kwilt to prepare a revised Arc change.');
            return;
          }
          setError(null);
          try {
            await executeArcProposalDecision({
              proposal, action: command.action, repository, store: arcStoreBoundary,
            });
            setAggregate(await loadThreadWithRecovery(aggregate.thread.id));
          } catch (decisionError) {
            setAggregate(await loadThreadWithRecovery(aggregate.thread.id).catch(() => aggregate));
            setError(decisionError instanceof Error ? decisionError.message : 'Kwilt could not update that Arc.');
          }
          return;
        }
        if (proposal.capabilityId === 'goals') {
          if (command.action === 'edit') {
            setError('Ask Kwilt to prepare a revised Goal change.');
            return;
          }
          setError(null);
          try {
            await executeGoalProposalDecision({
              proposal, action: command.action, repository, store: goalStoreBoundary,
            });
            setAggregate(await loadThreadWithRecovery(aggregate.thread.id));
          } catch (decisionError) {
            setAggregate(await loadThreadWithRecovery(aggregate.thread.id).catch(() => aggregate));
            setError(decisionError instanceof Error ? decisionError.message : 'Kwilt could not update that Goal.');
          }
          return;
        }
        if (proposal.capabilityId === 'profile') {
          if (command.action === 'edit') {
            setError('Ask Kwilt to prepare a revised Profile change.');
            return;
          }
          setError(null);
          try {
            await executeProfileProposalDecision({
              proposal, action: command.action, repository, store: profileStoreBoundary,
            });
            setAggregate(await loadThreadWithRecovery(aggregate.thread.id));
          } catch (decisionError) {
            setAggregate(await loadThreadWithRecovery(aggregate.thread.id).catch(() => aggregate));
            setError(decisionError instanceof Error ? decisionError.message : 'Kwilt could not update your Profile.');
          }
          return;
        }
        if (proposal.capabilityId === 'chapters') {
          if (command.action === 'edit') {
            setError('Ask Kwilt to prepare a revised Chapter note.');
            return;
          }
          setError(null);
          try {
            await executeChapterProposalDecision({
              proposal, action: command.action, repository, store: chapterStoreBoundary,
            });
            setAggregate(await loadThreadWithRecovery(aggregate.thread.id));
          } catch (decisionError) {
            setAggregate(await loadThreadWithRecovery(aggregate.thread.id).catch(() => aggregate));
            setError(decisionError instanceof Error ? decisionError.message : 'Kwilt could not update that Chapter.');
          }
          return;
        }
        const patch = command.action === 'edit'
          ? parseActivityMutationPatch(command.patch)
          : undefined;
        if (command.action === 'edit' && !patch) {
          setError('That proposal edit is not supported.');
          return;
        }
        setError(null);
        try {
          await executeProposalDecision({
            proposal,
            action: command.action,
            ...(patch ? { patch } : {}),
            repository,
            store: activityStoreBoundary,
          });
          setAggregate(await loadThreadWithRecovery(aggregate.thread.id));
        } catch (decisionError) {
          setAggregate(await loadThreadWithRecovery(aggregate.thread.id).catch(() => aggregate));
          setError(decisionError instanceof Error ? decisionError.message : 'Kwilt could not apply that decision.');
        }
        return;
      }
      if (command.type === 'receipt.open' && aggregate) {
        const receipt = (aggregate.receipts ?? []).find((item) => item.id === command.receiptId);
        const dateKey = receipt?.capabilityId === 'plan' && typeof receipt.resultState.targetDateKey === 'string'
          ? receipt.resultState.targetDateKey
          : null;
        if (!receipt || receipt.status !== 'applied') return;
        if (dateKey) {
          navigateWhenReady('MainTabs', { screen: 'PlanTab', params: { dateKey } });
          return;
        }
        if (!receipt.resultingObjectId || !receipt.resultingObjectType) return;
        const label = typeof receipt.resultState.title === 'string'
          ? receipt.resultState.title
          : typeof receipt.resultState.name === 'string'
            ? receipt.resultState.name
            : receipt.resultingObjectType === 'profile' ? 'Profile' : 'Kwilt item';
        const target = resolveUnifiedChatObjectReturn({
          type: receipt.resultingObjectType, id: receipt.resultingObjectId, label,
        });
        if (target) navigateWhenReady(target.route.name, target.route.params);
        return;
      }
      if ((command.type === 'receipt.undo' || command.type === 'receipt.undo_many') && aggregate) {
        const requestedReceiptIds = command.type === 'receipt.undo_many' ? command.receiptIds : [command.receiptId];
        const selectedReceipts = requestedReceiptIds.map((receiptId) =>
          (aggregate.receipts ?? []).find((item) => item.id === receiptId));
        if (selectedReceipts.some((receipt) => !receipt || !receipt.canUndo)) return;
        const selectedOutcomeRunIds = new Set(selectedReceipts.flatMap((receipt) => {
          const proposal = receipt
            ? (aggregate.proposals ?? []).find((item) => item.id === receipt.proposalId)
            : undefined;
          return proposal ? [proposal.runId] : [];
        }));
        if (selectedOutcomeRunIds.size !== 1) return;
        const orderedReceipts = selectedReceipts.flatMap((receipt) => receipt ? [receipt] : []).sort((left, right) => {
          const leftProposal = (aggregate.proposals ?? []).find((item) => item.id === left.proposalId);
          const rightProposal = (aggregate.proposals ?? []).find((item) => item.id === right.proposalId);
          return (rightProposal?.operation.outcomeStep?.sequence ?? 0) -
            (leftProposal?.operation.outcomeStep?.sequence ?? 0);
        });
        setError(null);
        try {
          for (const receipt of orderedReceipts) {
            const proposal = (aggregate.proposals ?? []).find((item) => item.id === receipt.proposalId);
            if (!proposal) throw new Error('The original change could not be found.');
            await executeReceiptUndo({
              receipt, proposal, repository, store: activityStoreBoundary, planStore: planStoreBoundary,
              goalStore: goalStoreBoundary, arcStore: arcStoreBoundary,
              profileStore: profileStoreBoundary,
              chapterStore: chapterStoreBoundary,
              relationshipUndo: receipt.capabilityId === 'relationships'
                ? createRelationshipMemoryToolProvider({}).undoReceipt
                : undefined,
              householdBoundary: receipt.capabilityId === 'household'
                ? createHouseholdActionBoundary(getSupabaseClient())
                : undefined,
              personalScreenTimeBoundary: receipt.capabilityId === 'screenTime'
                ? createPersonalScreenTimeRuleActionBoundary()
                : undefined,
              moneyRepository,
            });
          }
          setAggregate(await loadThreadWithRecovery(aggregate.thread.id));
        } catch (undoError) {
          setAggregate(await loadThreadWithRecovery(aggregate.thread.id).catch(() => aggregate));
          setError(undoError instanceof Error ? undoError.message : 'Kwilt could not undo that outcome.');
        }
        return;
      }
      if (command.type === 'artifact.update' && aggregate) {
        try {
          await repository.updateArtifact({
            artifactId: command.artifactId, expectedVersion: command.expectedVersion,
            title: command.title, content: command.content,
          });
          setAggregate(await loadThreadWithRecovery(aggregate.thread.id));
        } catch (artifactError) {
          setAggregate(await loadThreadWithRecovery(aggregate.thread.id).catch(() => aggregate));
          setError(artifactError instanceof Error ? artifactError.message : 'Kwilt could not save that draft.');
        }
        return;
      }
      if (command.type === 'run.stop' && aggregate) {
        const run = aggregate.runs.find((item) => item.id === command.runId);
        if (!run || (run.status !== 'active' && run.status !== 'queued')) return;
        if (activeTurn.current?.runId === command.runId) {
          const current = activeTurn.current;
          current.disposition = { type: 'stop' };
          if (current.owner === 'server') {
            try {
              const next = await transitionServerOwnedRun(command.runId, { type: 'stop' });
              if (next) setAggregate(next);
              current.controller.abort();
            } catch (stopError) {
              setAggregate(await loadThreadWithRecovery(aggregate.thread.id).catch(() => aggregate));
              setError(stopError instanceof Error ? stopError.message : 'Kwilt could not stop that response.');
            }
          } else {
            activeTurn.current.controller.abort();
          }
        }
        return;
      }
      if (command.type === 'run.steer' && aggregate) {
        const run = aggregate.runs.find((item) => item.id === command.runId);
        const current = activeTurn.current;
        if (!run || (run.status !== 'active' && run.status !== 'queued') || current?.runId !== run.id) return;
        current.disposition = { type: 'steer', prompt: command.prompt.trim(), requestId: message.requestId };
        if (current.owner === 'server') {
          try {
            const next = await transitionServerOwnedRun(run.id, { type: 'steer', prompt: command.prompt.trim() });
            if (next) setAggregate(next);
            current.controller.abort();
          } catch (steerError) {
            setAggregate(await loadThreadWithRecovery(aggregate.thread.id).catch(() => aggregate));
            setError(steerError instanceof Error ? steerError.message : 'Kwilt could not update that response.');
            return;
          }
        } else {
          current.controller.abort();
        }
        setPrompt('');
        return;
      }
      if (command.type !== 'run.send' && command.type !== 'run.retry') return;

      if (command.type === 'run.send' && !command.prompt.trim()) return;
      if (command.type === 'run.send' && !isUnifiedChatAttachmentSetSendable(attachments)) {
        setError(attachments.some((item) => item.status === 'inspecting')
          ? 'Wait for Kwilt to finish inspecting the attachment.'
          : 'Remove or retry the attachment Kwilt could not inspect.');
        return;
      }

      let turnAggregate = freshEntry ? null : aggregate;
      if (command.type === 'run.send' && !turnAggregate && freshEntry) {
        if (freshFirstSendRequestIdRef.current && freshFirstSendRequestIdRef.current !== message.requestId) return;
        freshFirstSendRequestIdRef.current = message.requestId;
        try {
          const created = await freshThreadGateRef.current!.ensure();
          turnAggregate = created;
          setThreads((current) => [
            created.thread,
            ...current.filter((thread) => thread.id !== created.thread.id),
          ]);
          aggregateRef.current = created;
          setAggregate(created);
          freshEntrySentRef.current = true;
          track(
            posthogClient,
            AnalyticsEvent.UnifiedChatFreshEntryOutcome,
            buildUnifiedChatFreshEntryTelemetry(freshEntrySource, 'first_send'),
          );
          if (isDrawer) onThreadIdChange?.(created.thread.id);
          else {
            navigation.setParams({
              threadId: created.thread.id,
              entry: undefined,
              source: undefined,
            });
          }
        } catch (creationError) {
          freshFirstSendRequestIdRef.current = null;
          track(
            posthogClient,
            AnalyticsEvent.UnifiedChatFreshEntryOutcome,
            buildUnifiedChatFreshEntryTelemetry(freshEntrySource, 'thread_creation_failed'),
          );
          setPrompt(command.prompt);
          setError(creationError instanceof Error
            ? creationError.message
            : 'Kwilt could not create a new chat.');
          return;
        }
      }
      if (!turnAggregate) return;

      const retryRun = command.type === 'run.retry'
        ? turnAggregate.runs.find((run) => run.id === command.runId && run.status === 'failed')
        : undefined;
      if (command.type === 'run.retry' && (!retryRun || (turnAggregate.proposals ?? []).some((proposal) => proposal.runId === retryRun.id))) return;
      const retryMessage = retryRun?.userMessageId
        ? turnAggregate.messages.find((item) => item.id === retryRun.userMessageId && item.role === 'user')
        : undefined;
      if (command.type === 'run.retry' && !retryMessage) return;

      if (command.type === 'run.send') setPrompt('');
      setError(null);
      let turnPrompt = command.type === 'run.send' ? command.prompt : retryMessage?.body ?? '';
      let turnRequestId = message.requestId;
      let retryRunId = retryRun?.id;
      let turnAttachments = command.type === 'run.send' ? attachments : retryMessage?.attachments ?? [];
      let parentRunId: string | null = retryRunId ?? null;
      while (turnPrompt.trim()) {
        setStreamingResponse(null);
        setProcessingNotice(null);
        const controller = new AbortController();
        const turnState = {
          runId: null as string | null,
          owner: 'local' as 'local' | 'server',
          controller,
          disposition: { type: 'stop' as const } as
            | { type: 'stop' }
            | { type: 'steer'; prompt: string; requestId: string },
        };
        activeTurn.current = turnState;
        let refreshedAggregate: UnifiedChatThreadAggregate | null = null;
        try {
          // Route against the durable conversation, not the render-time snapshot
          // captured when the workbench message handler was created. This keeps a
          // short answer attached to the assistant question that prompted it.
          turnAggregate = await loadThreadWithRecovery(turnAggregate.thread.id);
          const isConversationTurn = liveConversation.current !== null;
          const useDurableMobileRun = isDurableMobileChatEligible({
            aggregate: turnAggregate,
            attachmentCount: turnAttachments.length,
            interactionMode: isConversationTurn ? 'conversation' : 'text',
            isRetry: Boolean(retryRunId),
          });
          if (useDurableMobileRun) {
            turnState.owner = 'server';
            refreshedAggregate = await runDurableMobileChatTurn({
              threadId: turnAggregate.thread.id,
              prompt: turnPrompt,
              requestId: turnRequestId,
              channelContext: buildMobileTurnChannelContext({
                aggregate: turnAggregate, attachments: turnAttachments,
                locale: Intl.DateTimeFormat().resolvedOptions().locale || 'en-US', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
                appState: AppState.currentState,
                action: retryRunId ? 'run.retry' : parentRunId ? 'run.steer' : 'run.send',
                ...(isConversationTurn && finalizedConversationUtteranceRef.current ? {
                  voice: {
                    sessionId: finalizedConversationUtteranceRef.current.sessionId,
                    utteranceId: finalizedConversationUtteranceRef.current.id,
                    source: finalizedConversationUtteranceRef.current.source,
                    locale: finalizedConversationUtteranceRef.current.locale,
                    interrupted: finalizedConversationUtteranceRef.current.interrupted,
                    speechStoppedAt: finalizedConversationUtteranceRef.current.speechStoppedAt,
                    finalizedAt: finalizedConversationUtteranceRef.current.finalizedAt,
                  },
                } : {}),
              }),
              parentRunId,
              invoke: (functionName, options) => getSupabaseClient().functions.invoke(functionName, options),
              loadThread: loadThreadWithRecovery,
              signal: controller.signal,
              onProgress: (progressAggregate, runId) => {
                turnState.runId = runId;
                setAggregate(progressAggregate);
                setAttachments([]);
              },
            });
          } else {
            refreshedAggregate = await runUnifiedChatTurn({
            aggregate: turnAggregate,
            prompt: turnPrompt,
            interactionMode: isConversationTurn ? 'conversation' : 'text',
            recentProgressCueIds: isConversationTurn
              ? conversationProgressHistoryRef.current
              : undefined,
            onProgressCue: isConversationTurn
              ? (cueId) => {
                conversationProgressHistoryRef.current = [
                  ...conversationProgressHistoryRef.current,
                  cueId,
                ].slice(-16);
                void conversationProgressSpeech.start(cueId, () => {
                  conversationLatencyRef.current?.tracker.mark('progress_audio_started');
                });
              }
              : undefined,
            onLatencyMilestone: isConversationTurn
              ? (milestone) => conversationLatencyRef.current?.tracker.mark(milestone)
              : undefined,
            onConversationClassification: isConversationTurn
              ? (classification) => {
                const activeLatency = conversationLatencyRef.current;
                if (!activeLatency || activeLatency.published) return;
                activeLatency.planningStrategy = classification.planningStrategy;
                activeLatency.requestClass = classification.requestClass;
              }
              : undefined,
            clientRequestId: turnRequestId,
            signal: controller.signal,
            abortDisposition: () => turnState.disposition.type === 'steer'
              ? { type: 'steer', prompt: turnState.disposition.prompt }
              : { type: 'stop' },
            ...(retryRunId ? { retryRunId } : {}),
            ...(turnAttachments.length > 0 ? { attachments: turnAttachments } : {}),
            onRunStarted: (started) => {
              turnState.runId = started.runs.at(-1)?.id ?? null;
              setAggregate(started);
              if (!retryRunId) setAttachments([]);
            },
            onRunProgress: (progressAggregate) => {
              setAggregate(progressAggregate);
            },
            onResponseProgress: setStreamingResponse,
            onProviderFallback: () => {
              setProcessingNotice('On-device processing couldn’t complete this request, so this response is using cloud processing.');
            },
            onThreadTitleUpdated: (updatedThread) => {
              setAggregate((current) => current?.thread.id === updatedThread.id
                ? { ...current, thread: updatedThread }
                : current);
              setThreads((current) => current.map((thread) =>
                thread.id === updatedThread.id ? updatedThread : thread));
            },
            });
          }
          const completedRunId = refreshedAggregate.runs.at(-1)?.id;
          const autoApplyProposal = completedRunId
            ? findAutoApplyCreateProposal(refreshedAggregate, completedRunId)
            : undefined;
          if (autoApplyProposal) {
            await executeProposalDecision({
              proposal: autoApplyProposal,
              action: 'approve',
              repository,
              store: activityStoreBoundary,
              afterApply: async (receipt) => {
                const state = useAppStore.getState();
                const activity = state.activities.find((candidate) => candidate.id === receipt.resultingObjectId);
                if (!activity) return receipt;
                const canUseCoverImage = canUseProTools('unsplash_banners');
                const selectedActions = resolveChatQuickAddAiActions(canUseCoverImage);
                const canEnrich = consumeQuickAddAiActionCredits(selectedActions, {
                  tier: canUseProTools('saved_views') ? 'pro' : 'free',
                  tryConsumeGenerativeCredit: state.tryConsumeGenerativeCredit,
                });
                if (!canEnrich) return receipt;
                const locationTriggersEnabled = Boolean(state.locationOfferPreferences.enabled) &&
                  state.locationOfferPreferences.osPermissionStatus === 'authorized';
                useActivityEnrichmentStore.getState().markActivityEnrichment(activity.id, true);
                try {
                  const enriched = await enrichCreatedActivityLikeQuickAdd({
                    activity,
                    goals: state.goals,
                    arcs: state.arcs,
                    canUseCoverImage,
                    locationTriggersEnabled,
                  });
                  state.updateActivity(activity.id, () => enriched);
                  return refreshCreatedActivityReceipt(receipt, enriched);
                } catch {
                  return receipt;
                } finally {
                  useActivityEnrichmentStore.getState().markActivityEnrichment(activity.id, false);
                }
              },
            });
            refreshedAggregate = await loadThreadWithRecovery(turnAggregate.thread.id);
          }
          aggregateRef.current = refreshedAggregate;
          setAggregate(refreshedAggregate);
          setThreads(await repository.listThreads());
        } catch (turnError) {
          try {
            refreshedAggregate = await loadThreadWithRecovery(turnAggregate.thread.id);
            aggregateRef.current = refreshedAggregate;
            setAggregate(refreshedAggregate);
            setError(null);
          } catch {
            // Preserve the last visible transcript if refreshing the failed run also fails.
            setError(turnError instanceof Error ? turnError.message : 'Response interrupted.');
          }
        } finally {
          setStreamingResponse(null);
          if (activeTurn.current === turnState) activeTurn.current = null;
        }

        if (controller.signal.aborted && turnState.disposition.type === 'steer' && refreshedAggregate) {
          turnAggregate = refreshedAggregate;
          parentRunId = turnState.owner === 'server' ? turnState.runId : null;
          turnPrompt = turnState.disposition.prompt;
          turnRequestId = turnState.disposition.requestId;
          retryRunId = undefined;
          turnAttachments = [];
          continue;
        }
        break;
      }
    },
    [aggregate, attachments, clearVoiceTimer, createThread, decideClientAction, freshEntry, freshEntrySource, freshWorkbenchContext, isDrawer, loadThreadWithRecovery, menuOpen, moneyRepository, navigation, onComposerFocusChange, onThreadIdChange, postFreshSnapshot, postSnapshot, repository, startConversation, stopConversation, transitionServerOwnedRun, voice.state],
  );

  durableRealtimeRunRef.current = async (request) => {
    return runDurableRealtimeRequest({
      request, activeRun: activeTurn.current,
      send: (payload) => handleSurfaceMessage({ nativeEvent: { data: payload } } as WebViewMessageEvent),
      getThreadId: () => aggregateRef.current?.thread.id,
      loadThread: loadThreadWithRecovery,
      stopRun: (runId) => transitionServerOwnedRun(runId, { type: 'stop' }),
      onLoaded: (latest) => { aggregateRef.current = latest; },
    });
  };

  const pendingClientAction = useMemo(
    () => (aggregate?.clientActions ?? []).find(
      (item) => item.status === 'pending_client_action' || item.status === 'presenting',
    ) ?? null,
    [aggregate?.clientActions],
  );

  const allowedOrigin = useMemo(() => {
    if (!config.workbenchUrl) return null;
    try {
      return new URL(config.workbenchUrl).origin;
    } catch {
      return null;
    }
  }, [config.workbenchUrl]);
  const workbenchSurfaceUrl = useMemo(() => {
    if (!config.workbenchUrl) return '';
    if (!isDrawer) return config.workbenchUrl;
    const surfaceUrl = new URL(config.workbenchUrl);
    surfaceUrl.searchParams.set('presentation', 'drawer');
    return surfaceUrl.toString();
  }, [config.workbenchUrl, isDrawer]);

  const canNavigate = useCallback(
    ({ url }: { url: string }) => {
      if (url === 'about:blank') return true;
      if (!allowedOrigin) return false;
      try {
        return new URL(url).origin === allowedOrigin;
      } catch {
        return false;
      }
    },
    [allowedOrigin],
  );

  if (!config.enabled || !config.workbenchUrl) {
    const unavailableContent = (
      <CenteredState
        title="Chat isn’t enabled in this build"
        body="The existing Kwilt coach experiences are still available."
      />
    );
    return isDrawer
      ? <View style={styles.drawerRoot}>{unavailableContent}</View>
      : <AppShell>{unavailableContent}</AppShell>;
  }

  const drawerTitle = aggregate?.thread.title ?? freshDrawerTitle;

  const chatContent = (
    <>
      {isDrawer ? (
        <UnifiedChatDrawerHeader title={drawerTitle} />
      ) : (
        <PageHeader
          title={!freshEntry ? aggregate?.thread.title ?? 'Chat' : 'Chat'}
          variant="conversation"
          onPressMenu={openMenu}
          menuOpen={menuOpen}
          containerStyle={{
            paddingTop: insets.top + spacing.xs,
            paddingRight: spacing.sm,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border,
          }}
          moreMenu={aggregate && !freshEntry ? (
            <IconButton
              accessibilityLabel="Chat options"
              variant="ghost"
              onPress={() => showThreadActions(aggregate)}
            >
              <Icon name="more" size={18} color={colors.textPrimary} />
            </IconButton>
          ) : undefined}
        />
      )}

      {error && !surfaceLoadFailed ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setError(null)}
          style={styles.errorBar}
        >
          <Text style={styles.errorText}>{error}</Text>
        </Pressable>
      ) : null}

      {processingNotice ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss processing notice"
          onPress={() => setProcessingNotice(null)}
          style={styles.processingNoticeBar}
        >
          <Text style={styles.processingNoticeText}>{processingNotice}</Text>
        </Pressable>
      ) : null}

      {surfaceLoadFailed ? (
        <EmptyState
          variant="screen"
          illustration={CHAT_RECOVERY_ILLUSTRATION}
          title="Chat couldn’t open"
          instructions="Check your connection, then try again. Your conversation is still here."
          actions={<Button variant="primary" onPress={retrySurface}>Try again</Button>}
          style={styles.recoveryState}
        />
      ) : loading ? (
        <CenteredState title="Opening Chat…" />
      ) : (aggregate && !freshEntry) || freshEntry ? (
        <WebView
          ref={webViewRef}
          source={{ uri: workbenchSurfaceUrl }}
          originWhitelist={allowedOrigin ? [allowedOrigin] : []}
          onShouldStartLoadWithRequest={canNavigate}
          onMessage={(event) => void handleSurfaceMessage(event)}
          onError={() => {
            setSurfaceLoadFailed(true);
            setError('The Chat surface could not load. Tap here to retry.');
          }}
          javaScriptEnabled
          sharedCookiesEnabled={false}
          thirdPartyCookiesEnabled={false}
          setSupportMultipleWindows={false}
          allowsLinkPreview={false}
          hideKeyboardAccessoryView
          containerStyle={styles.webViewContainer}
          style={styles.webView}
        />
      ) : (
        <CenteredState
          title="Start a conversation"
          body="Your chats will appear here and stay available when you return."
          actionLabel="New chat"
          onAction={() => void createThread()}
        />
      )}

      <Modal visible={contextPickerVisible} animationType="slide" onRequestClose={() => setContextPickerVisible(false)}>
        <SafeAreaView style={styles.picker}>
          <View style={styles.pickerHeader}>
            <View>
              <Text style={styles.contextPickerTitle}>Add Kwilt context</Text>
              <Text style={styles.contextPickerSubtitle}>Choose what your next message can use.</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close context choices"
              onPress={() => setContextPickerVisible(false)}
              style={styles.iconButton}
            >
              <Icon name="close" size={22} color={colors.textPrimary} />
            </Pressable>
          </View>
          <FlatList
            data={contextCandidates}
            keyExtractor={(item) => `${item.objectType}:${item.objectId}`}
            contentContainerStyle={styles.threadList}
            ListEmptyComponent={<Text style={styles.emptyListText}>No more context is available.</Text>}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Add ${item.label} to context`}
                style={styles.contextChoice}
                onPress={() => void (async () => {
                  if (!aggregate) return;
                  try {
                    await repository.attachContext({
                      ...item,
                      threadId: aggregate.thread.id,
                      source: 'user_added',
                    });
                    setAggregate(await loadThreadWithRecovery(aggregate.thread.id));
                    setContextPickerVisible(false);
                  } catch {
                    setError('Kwilt could not add that context.');
                  }
                })()}
              >
                <View style={styles.contextChoiceText}>
                  <Text numberOfLines={1} style={styles.threadTitle}>{item.label}</Text>
                  <Text numberOfLines={1} style={styles.threadDate}>{item.secondaryLabel ?? item.capabilityId}</Text>
                </View>
                <Icon name="plus" size={18} color={colors.textSecondary} />
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>

      <Modal
        visible={Boolean(pendingClientAction)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (pendingClientAction) void decideClientAction(pendingClientAction, 'decline');
        }}
      >
        <View style={styles.clientActionScrim}>
          <View style={styles.clientActionSheet} accessibilityViewIsModal>
            <Text style={styles.clientActionEyebrow}>Review in Kwilt</Text>
            <Text style={styles.clientActionTitle}>{pendingClientAction?.title}</Text>
            <Text style={styles.clientActionSummary}>{pendingClientAction?.consequenceSummary}</Text>
            <View style={styles.clientActionButtons}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Not now"
                disabled={clientActionInFlight}
                onPress={() => {
                  if (pendingClientAction) void decideClientAction(pendingClientAction, 'decline');
                }}
                style={({ pressed }) => [styles.clientActionSecondaryButton, pressed && styles.buttonPressed]}
              >
                <Text style={styles.clientActionSecondaryLabel}>Not now</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Continue to ${pendingClientAction?.title ?? 'native review'}`}
                disabled={clientActionInFlight}
                onPress={() => {
                  if (pendingClientAction) void decideClientAction(pendingClientAction, 'continue');
                }}
                style={({ pressed }) => [styles.clientActionPrimaryButton, pressed && styles.buttonPressed]}
              >
                <Text style={styles.clientActionPrimaryLabel}>{clientActionInFlight ? 'Opening…' : 'Continue'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );

  return isDrawer
    ? <View style={styles.drawerRoot}>{chatContent}</View>
    : <AppShell fullBleedCanvas>{chatContent}</AppShell>;
}
