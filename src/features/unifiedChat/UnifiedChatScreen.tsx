import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation, useRoute, type NavigationProp, type ParamListBase, type RouteProp } from '@react-navigation/native';
import {
  Alert,
  AppState,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppShell } from '../../ui/layout/AppShell';
import { IconButton } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Text } from '../../ui/Typography';
import { colors, radii, spacing, typography } from '../../theme';
import { buildWorkbenchSnapshot } from './buildWorkbenchSnapshot';
import { createUnifiedChatRepository } from './threadRepository';
import { runUnifiedChatTurn } from './runUnifiedChatTurn';
import type {
  UnifiedChatClientAction,
  UnifiedChatThread,
  UnifiedChatThreadAggregate,
} from './types';
import { getUnifiedChatConfig } from './unifiedChatConfig';
import {
  makeAgentWorkbenchHostMessage,
  parseAgentWorkbenchSurfaceMessage,
} from './workbenchProtocol';
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
  type UnifiedChatRouteParams,
} from './launchContext';
import { recoverActivityMutations } from './recoverActivityMutations';
import {
  cancelUnifiedChatVoiceRecording,
  startUnifiedChatVoiceRecording,
  stopAndTranscribeUnifiedChatVoice,
} from './unifiedChatVoice';
import { pickUnifiedChatTextAttachment } from './unifiedChatAttachmentPicker';
import {
  validateUnifiedChatAttachmentSet,
  type UnifiedChatTextAttachment,
} from './unifiedChatAttachmentPolicy';
import { HapticsService } from '../../services/HapticsService';
import { executePlanProposalDecision } from './executePlanProposalDecision';
import { executeGoalProposalDecision } from './executeGoalProposalDecision';
import { applyApprovedPlanProposal } from './planProposalExecutor';
import { executePlanProposalBatch } from './executePlanProposalBatch';
import { recoverPlanMutations } from './recoverPlanMutations';
import { recoverGoalMutations } from './recoverGoalMutations';
import { executeArcProposalDecision } from './executeArcProposalDecision';
import { recoverArcMutations } from './recoverArcMutations';
import { executeProfileProposalDecision } from './executeProfileProposalDecision';
import { recoverProfileMutations } from './recoverProfileMutations';
import { executeChapterProposalDecision } from './executeChapterProposalDecision';
import { recoverChapterMutations } from './recoverChapterMutations';
import { fetchMyChapterById, updateChapterUserNote } from '../../services/chapters';
import { executeClientActionDecision } from './executeClientActionDecision';
import { resolveClientActionOpenInstruction } from './clientActionNavigation';
import { prepareClientActionNativeReview } from './prepareClientActionNativeReview';
import { useCheckinDraftStore } from '../../store/useCheckinDraftStore';
import { AnalyticsEvent } from '../../services/analytics/events';
import { createRelationshipMemoryToolProvider } from '../../services/relationshipMemoryToolProvider';
import { track } from '../../services/analytics/analytics';
import { posthogClient } from '../../services/analytics/posthogClient';
import { buildUnifiedChatReconciliationTelemetry } from './unifiedChatTelemetry';

const activityStoreBoundary = {
  getActivities: () => useAppStore.getState().activities,
  getGoals: () => useAppStore.getState().goals,
  addActivity: (activity: Parameters<ReturnType<typeof useAppStore.getState>['addActivity']>[0]) =>
    useAppStore.getState().addActivity(activity),
  updateActivity: (id: string, updater: Parameters<ReturnType<typeof useAppStore.getState>['updateActivity']>[1]) =>
    useAppStore.getState().updateActivity(id, updater),
  removeActivity: (id: string) => useAppStore.getState().removeActivity(id),
};

const planStoreBoundary = {
  getActivities: () => useAppStore.getState().activities,
  updateActivity: (id: string, updater: Parameters<ReturnType<typeof useAppStore.getState>['updateActivity']>[1]) =>
    useAppStore.getState().updateActivity(id, updater),
  addDailyPlanCommitment: (dateKey: string, activityId: string) =>
    useAppStore.getState().addDailyPlanCommitment(dateKey, activityId),
  removeDailyPlanCommitment: (dateKey: string, activityId: string) =>
    useAppStore.getState().removeDailyPlanCommitment(dateKey, activityId),
};

const goalStoreBoundary = {
  getGoals: () => useAppStore.getState().goals,
  getArcIds: () => useAppStore.getState().arcs.map((arc) => arc.id),
  getActivities: () => useAppStore.getState().activities,
  addGoal: (goal: Parameters<ReturnType<typeof useAppStore.getState>['addGoal']>[0]) =>
    useAppStore.getState().addGoal(goal),
  updateGoal: (id: string, updater: Parameters<ReturnType<typeof useAppStore.getState>['updateGoal']>[1]) =>
    useAppStore.getState().updateGoal(id, updater),
  removeGoal: (id: string) => useAppStore.getState().removeGoal(id),
  restoreRemovedGoal: (input: Parameters<ReturnType<typeof useAppStore.getState>['restoreRemovedGoal']>[0]) =>
    useAppStore.getState().restoreRemovedGoal(input),
};

const arcStoreBoundary = {
  getArcs: () => useAppStore.getState().arcs,
  getGoals: () => useAppStore.getState().goals,
  getActivities: () => useAppStore.getState().activities,
  getGoalRecommendations: (arcId: string) => useAppStore.getState().goalRecommendations[arcId] ?? [],
  getIsPro: () => useEntitlementsStore.getState().isPro,
  addArc: (arc: Parameters<ReturnType<typeof useAppStore.getState>['addArc']>[0]) =>
    useAppStore.getState().addArc(arc),
  updateArc: (id: string, updater: Parameters<ReturnType<typeof useAppStore.getState>['updateArc']>[1]) =>
    useAppStore.getState().updateArc(id, updater),
  removeArc: (id: string) => useAppStore.getState().removeArc(id),
  restoreRemovedArc: (input: Parameters<ReturnType<typeof useAppStore.getState>['restoreRemovedArc']>[0]) =>
    useAppStore.getState().restoreRemovedArc(input),
};

const profileStoreBoundary = {
  getProfile: () => useAppStore.getState().userProfile,
  updateProfileAt: (
    updater: Parameters<ReturnType<typeof useAppStore.getState>['updateUserProfileAt']>[0],
    updatedAt: string,
  ) => useAppStore.getState().updateUserProfileAt(updater, updatedAt),
};

const chapterStoreBoundary = {
  getChapter: (id: string) => fetchMyChapterById(id),
  updateNote: (id: string, note: string | null) => updateChapterUserNote({ chapterId: id, note }),
};

export function UnifiedChatScreen() {
  const route = useRoute<RouteProp<{ UnifiedChat: UnifiedChatRouteParams | undefined }, 'UnifiedChat'>>();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const launchContext = route.params?.launchContext;
  const requestedThreadId = route.params?.threadId;
  const insets = useSafeAreaInsets();
  const { openMenu } = useCapabilityMenuActions();
  const menuOpen = useCapabilityMenuOpen();
  const config = useMemo(getUnifiedChatConfig, []);
  const repository = useMemo(() => createUnifiedChatRepository(), []);
  const webViewRef = useRef<WebView>(null);
  const handledRequestIds = useRef(new Set<string>());
  const activeTurn = useRef<{
    runId: string | null;
    controller: AbortController;
    disposition: { type: 'stop' } | { type: 'steer'; prompt: string; requestId: string };
  } | null>(null);
  const consumedLaunchContext = useRef<string | null>(null);
  const voiceTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [threads, setThreads] = useState<UnifiedChatThread[]>([]);
  const [aggregate, setAggregate] = useState<UnifiedChatThreadAggregate | null>(null);
  const [prompt, setPrompt] = useState('');
  const [attachments, setAttachments] = useState<UnifiedChatTextAttachment[]>([]);
  const [surfaceReady, setSurfaceReady] = useState(false);
  const [contextPickerVisible, setContextPickerVisible] = useState(false);
  const [contextCandidates, setContextCandidates] = useState<UnifiedChatAttachableContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [surfaceLoadFailed, setSurfaceLoadFailed] = useState(false);
  const [clientActionInFlight, setClientActionInFlight] = useState(false);
  const [voice, setVoice] = useState<{
    state: 'idle' | 'recording' | 'transcribing' | 'error';
    elapsedSeconds: number;
    message?: string;
  }>({ state: 'idle', elapsedSeconds: 0 });

  const clearVoiceTimer = useCallback(() => {
    if (voiceTimer.current) clearInterval(voiceTimer.current);
    voiceTimer.current = null;
  }, []);

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
    for (const properties of buildUnifiedChatReconciliationTelemetry(loaded, chaptersRecovered)) {
      track(posthogClient, AnalyticsEvent.UnifiedChatReconciled, properties);
    }
    return chaptersRecovered;
  }, [repository]);

  const postSnapshot = useCallback(
    (next: UnifiedChatThreadAggregate, type: 'host.initialize' | 'host.snapshot') => {
      const message = makeAgentWorkbenchHostMessage(
        type,
        buildWorkbenchSnapshot(next, prompt, { voice, attachments }),
      );
      webViewRef.current?.postMessage(JSON.stringify(message));
    },
    [attachments, prompt, voice],
  );

  const openThread = useCallback(
    async (threadId: string) => {
      setError(null);
      try {
        const next = await loadThreadWithRecovery(threadId);
        setAggregate(next);
        setPrompt('');
        setAttachments([]);
        navigation.setParams({ threadId });
        if (surfaceReady) postSnapshot(next, 'host.initialize');
      } catch {
        setError('Kwilt could not open that chat.');
      }
    },
    [loadThreadWithRecovery, navigation, postSnapshot, surfaceReady],
  );

  const refreshThreads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await repository.listThreads();
      setThreads(next);
      if (next.length > 0 && !aggregate) {
        const requested = requestedThreadId && next.some((thread) => thread.id === requestedThreadId)
          ? requestedThreadId
          : next[0].id;
        await openThread(requested);
      }
      if (next.length === 0 && launchContext && !aggregate) {
        const thread = await repository.createThread();
        setThreads([thread]);
        await openThread(thread.id);
      }
    } catch {
      setError('Sign in and try opening Chat again.');
    } finally {
      setLoading(false);
    }
  }, [aggregate, launchContext, openThread, repository, requestedThreadId]);

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

  useEffect(() => () => {
    clearVoiceTimer();
    void cancelUnifiedChatVoiceRecording();
  }, [clearVoiceTimer]);

  useEffect(() => {
    if (surfaceReady && aggregate) postSnapshot(aggregate, 'host.snapshot');
  }, [aggregate, postSnapshot, surfaceReady]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' || !aggregate) return;
      const hasResumableAction = (aggregate.clientActions ?? []).some(
        (item) => item.status === 'pending_client_action' || item.status === 'presenting',
      );
      if (!hasResumableAction) return;
      const threadId = aggregate.thread.id;
      void loadThreadWithRecovery(threadId).then((next) => {
        setAggregate((current) => current?.thread.id === threadId ? next : current);
      }).catch(() => setError('Kwilt could not refresh the pending device review.'));
    });
    return () => subscription.remove();
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
      navigation.setParams({ threadId: thread.id });
      if (surfaceReady) postSnapshot(next, 'host.initialize');
    } catch {
      setError('Kwilt could not create a new chat.');
    }
  }, [loadThreadWithRecovery, navigation, postSnapshot, repository, surfaceReady]);

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

  const showThreadActions = useCallback(
    (thread: UnifiedChatThread) => {
      Alert.alert(thread.title, undefined, [
        { text: 'Rename', onPress: () => renameThread(thread) },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: () => void archiveThread(thread),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [archiveThread, renameThread],
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

  const handleSurfaceMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      const message = parseAgentWorkbenchSurfaceMessage(event.nativeEvent.data);
      if (!message) return;
      if (message.type === 'surface.ready') {
        setSurfaceReady(true);
        if (aggregate) postSnapshot(aggregate, 'host.initialize');
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
      if (command.type === 'attachment.pick') {
        try {
          const picked = await pickUnifiedChatTextAttachment();
          if (!picked) return;
          setAttachments((current) => validateUnifiedChatAttachmentSet([...current, picked]));
        } catch (attachmentError) {
          setError(attachmentError instanceof Error ? attachmentError.message : 'Kwilt could not attach that document.');
        }
        return;
      }
      if (command.type === 'attachment.remove') {
        setAttachments((current) => current.filter((item) => item.id !== command.attachmentId));
        return;
      }
      if (command.type === 'voice.toggle') {
        if (aggregate?.runs.some((run) => run.status === 'active' || run.status === 'queued') || voice.state === 'transcribing') return;
        if (voice.state === 'recording') {
          clearVoiceTimer();
          setVoice((current) => ({ state: 'transcribing', elapsedSeconds: current.elapsedSeconds, message: 'Transcribing…' }));
          try {
            const transcript = await stopAndTranscribeUnifiedChatVoice();
            setPrompt((current) => [current.trim(), transcript].filter(Boolean).join(current.trim() ? ' ' : ''));
            setVoice({ state: 'idle', elapsedSeconds: 0 });
          } catch (voiceError) {
            setVoice({
              state: 'error', elapsedSeconds: 0,
              message: voiceError instanceof Error ? voiceError.message : 'Voice input failed.',
            });
          }
          return;
        }
        try {
          await startUnifiedChatVoiceRecording();
          setVoice({ state: 'recording', elapsedSeconds: 0, message: 'Tap again when you’re done.' });
          clearVoiceTimer();
          voiceTimer.current = setInterval(() => {
            setVoice((current) => current.state === 'recording'
              ? { ...current, elapsedSeconds: current.elapsedSeconds + 1 }
              : current);
          }, 1000);
        } catch (voiceError) {
          setVoice({
            state: 'error', elapsedSeconds: 0,
            message: voiceError instanceof Error ? voiceError.message : 'Voice input failed.',
          });
        }
        return;
      }
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
          const result = await executePlanProposalBatch({
            proposals: aggregate.proposals ?? [],
            items: command.items,
            execute: (proposal) => executePlanProposalDecision({
              proposal,
              action: 'approve',
              repository,
              apply: (approved) => applyApprovedPlanProposal({
                proposal: approved,
                store: planStoreBoundary,
              }),
            }),
          });
          setAggregate(await loadThreadWithRecovery(aggregate.thread.id));
          if (result.failed.length > 0) {
            setError(
              result.applied.length > 0
                ? `${result.applied.length} added to Plan; ${result.failed.length} could not be added.`
                : result.failed[0].message,
            );
          }
        } catch (decisionError) {
          setAggregate(await loadThreadWithRecovery(aggregate.thread.id).catch(() => aggregate));
          setError(decisionError instanceof Error ? decisionError.message : 'Kwilt could not add those Plan items.');
        }
        return;
      }
      if (command.type === 'proposal.decide' && aggregate) {
        const proposal = (aggregate.proposals ?? []).find((item) => item.id === command.proposalId);
        if (!proposal || proposal.version !== command.expectedVersion) return;
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
      if (command.type === 'receipt.undo' && aggregate) {
        const receipt = (aggregate.receipts ?? []).find((item) => item.id === command.receiptId);
        const proposal = receipt
          ? (aggregate.proposals ?? []).find((item) => item.id === receipt.proposalId)
          : undefined;
        if (!receipt || !proposal || !receipt.canUndo) return;
        setError(null);
        try {
          await executeReceiptUndo({
            receipt, proposal, repository, store: activityStoreBoundary, planStore: planStoreBoundary,
            goalStore: goalStoreBoundary, arcStore: arcStoreBoundary,
            profileStore: profileStoreBoundary,
            chapterStore: chapterStoreBoundary,
            relationshipUndo: receipt.capabilityId === 'relationships'
              ? createRelationshipMemoryToolProvider({}).undoReceipt
              : undefined,
          });
          setAggregate(await loadThreadWithRecovery(aggregate.thread.id));
        } catch (undoError) {
          setAggregate(await loadThreadWithRecovery(aggregate.thread.id).catch(() => aggregate));
          setError(undoError instanceof Error ? undoError.message : 'Kwilt could not undo that change.');
        }
        return;
      }
      if (command.type === 'run.stop' && aggregate) {
        const run = aggregate.runs.find((item) => item.id === command.runId);
        if (!run || (run.status !== 'active' && run.status !== 'queued')) return;
        if (activeTurn.current?.runId === command.runId) {
          activeTurn.current.disposition = { type: 'stop' };
          activeTurn.current.controller.abort();
        }
        return;
      }
      if (command.type === 'run.steer' && aggregate) {
        const run = aggregate.runs.find((item) => item.id === command.runId);
        const current = activeTurn.current;
        if (!run || (run.status !== 'active' && run.status !== 'queued') || current?.runId !== run.id) return;
        current.disposition = { type: 'steer', prompt: command.prompt.trim(), requestId: message.requestId };
        current.controller.abort();
        setPrompt('');
        return;
      }
      if (command.type !== 'run.send' && command.type !== 'run.retry' || !aggregate) return;

      const retryRun = command.type === 'run.retry'
        ? aggregate.runs.find((run) => run.id === command.runId && run.status === 'failed')
        : undefined;
      if (command.type === 'run.retry' && (!retryRun || (aggregate.proposals ?? []).some((proposal) => proposal.runId === retryRun.id))) return;
      const retryMessage = retryRun?.userMessageId
        ? aggregate.messages.find((item) => item.id === retryRun.userMessageId && item.role === 'user')
        : undefined;
      if (command.type === 'run.retry' && !retryMessage) return;

      if (command.type === 'run.send') setPrompt('');
      setError(null);
      let turnAggregate = aggregate;
      let turnPrompt = command.type === 'run.send' ? command.prompt : retryMessage?.body ?? '';
      let turnRequestId = message.requestId;
      let retryRunId = retryRun?.id;
      let turnAttachments = command.type === 'run.send' ? attachments : [];
      while (turnPrompt.trim()) {
        const controller = new AbortController();
        const turnState = {
          runId: null as string | null,
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
          refreshedAggregate = await runUnifiedChatTurn({
            aggregate: turnAggregate,
            prompt: turnPrompt,
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
            onThreadTitleUpdated: (updatedThread) => {
              setAggregate((current) => current?.thread.id === updatedThread.id
                ? { ...current, thread: updatedThread }
                : current);
              setThreads((current) => current.map((thread) =>
                thread.id === updatedThread.id ? updatedThread : thread));
            },
          });
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
          setAggregate(refreshedAggregate);
          setThreads(await repository.listThreads());
        } catch (turnError) {
          try {
            refreshedAggregate = await loadThreadWithRecovery(turnAggregate.thread.id);
            setAggregate(refreshedAggregate);
            setError(null);
          } catch {
            // Preserve the last visible transcript if refreshing the failed run also fails.
            setError(turnError instanceof Error ? turnError.message : 'Response interrupted.');
          }
        } finally {
          if (activeTurn.current === turnState) activeTurn.current = null;
        }

        if (controller.signal.aborted && turnState.disposition.type === 'steer' && refreshedAggregate) {
          turnAggregate = refreshedAggregate;
          turnPrompt = turnState.disposition.prompt;
          turnRequestId = turnState.disposition.requestId;
          retryRunId = undefined;
          turnAttachments = [];
          continue;
        }
        break;
      }
    },
    [aggregate, attachments, clearVoiceTimer, createThread, decideClientAction, loadThreadWithRecovery, menuOpen, postSnapshot, repository, voice.state],
  );

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
    return (
      <AppShell>
        <CenteredState
          title="Chat isn’t enabled in this build"
          body="The existing Kwilt coach experiences are still available."
        />
      </AppShell>
    );
  }

  return (
    <AppShell fullBleedCanvas>
      <PageHeader
        title={aggregate?.thread.title ?? 'Chat'}
        onPressMenu={openMenu}
        menuOpen={menuOpen}
        containerStyle={{
          paddingTop: insets.top + spacing.xs,
          paddingRight: spacing.sm,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        }}
        moreMenu={aggregate ? (
          <IconButton
            accessibilityLabel="Chat options"
            variant="ghost"
            onPress={() => showThreadActions(aggregate.thread)}
          >
            <Icon name="more" size={18} color={colors.textPrimary} />
          </IconButton>
        ) : undefined}
      />

      {error ? (
        <Pressable
          accessibilityRole="button"
          onPress={surfaceLoadFailed ? retrySurface : () => setError(null)}
          style={styles.errorBar}
        >
          <Text style={styles.errorText}>{error}</Text>
        </Pressable>
      ) : null}

      {loading ? (
        <CenteredState title="Opening Chat…" />
      ) : aggregate ? (
        <WebView
          ref={webViewRef}
          source={{ uri: config.workbenchUrl }}
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
    </AppShell>
  );
}

function CenteredState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.centeredState}>
      <Text style={styles.stateTitle}>{title}</Text>
      {body ? <Text style={styles.stateBody}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  webViewContainer: { flex: 1, backgroundColor: colors.canvas },
  webView: { backgroundColor: colors.canvas },
  errorBar: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.scheduleYellow },
  errorText: { ...typography.bodySm, color: colors.textPrimary },
  centeredState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing['2xl'], gap: spacing.md },
  stateTitle: { ...typography.titleMd, color: colors.textPrimary, textAlign: 'center' },
  stateBody: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  primaryButton: { backgroundColor: colors.accent, borderRadius: radii.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  primaryButtonText: { ...typography.label, color: colors.primaryForeground },
  picker: { flex: 1, backgroundColor: colors.canvas },
  pickerHeader: { minHeight: 58, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  contextPickerTitle: { ...typography.titleSm, color: colors.textPrimary },
  contextPickerSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  contextChoice: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  contextChoiceText: { flex: 1, paddingVertical: spacing.sm },
  threadList: { padding: spacing.md, gap: spacing.xs },
  threadTitle: { ...typography.body, color: colors.textPrimary },
  threadDate: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  emptyListText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', paddingTop: spacing['2xl'] },
  clientActionScrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.scrimStrong,
  },
  clientActionSheet: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  clientActionEyebrow: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs },
  clientActionTitle: { ...typography.titleMd, color: colors.textPrimary },
  clientActionSummary: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  clientActionButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  clientActionSecondaryButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  clientActionPrimaryButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  clientActionSecondaryLabel: { ...typography.label, color: colors.textSecondary },
  clientActionPrimaryLabel: { ...typography.label, color: colors.primaryForeground },
  buttonPressed: { opacity: 0.72 },
});
