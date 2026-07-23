import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation, useRoute, type NavigationProp, type ParamListBase, type RouteProp } from '@react-navigation/native';
import {
  Alert,
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
import type { UnifiedChatThread, UnifiedChatThreadAggregate } from './types';
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

const activityStoreBoundary = {
  getActivities: () => useAppStore.getState().activities,
  getGoals: () => useAppStore.getState().goals,
  addActivity: (activity: Parameters<ReturnType<typeof useAppStore.getState>['addActivity']>[0]) =>
    useAppStore.getState().addActivity(activity),
  updateActivity: (id: string, updater: Parameters<ReturnType<typeof useAppStore.getState>['updateActivity']>[1]) =>
    useAppStore.getState().updateActivity(id, updater),
  removeActivity: (id: string) => useAppStore.getState().removeActivity(id),
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
    return recoverActivityMutations({
      aggregate: loaded,
      repository,
      store: activityStoreBoundary,
    });
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

  useEffect(() => () => {
    clearVoiceTimer();
    void cancelUnifiedChatVoiceRecording();
  }, [clearVoiceTimer]);

  useEffect(() => {
    if (surfaceReady && aggregate) postSnapshot(aggregate, 'host.snapshot');
  }, [aggregate, postSnapshot, surfaceReady]);

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
      if (command.type === 'proposal.decide' && aggregate) {
        const proposal = (aggregate.proposals ?? []).find((item) => item.id === command.proposalId);
        if (!proposal || proposal.version !== command.expectedVersion) return;
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
      if (command.type === 'receipt.undo' && aggregate) {
        const receipt = (aggregate.receipts ?? []).find((item) => item.id === command.receiptId);
        const proposal = receipt
          ? (aggregate.proposals ?? []).find((item) => item.id === receipt.proposalId)
          : undefined;
        if (!receipt || !proposal || !receipt.canUndo) return;
        setError(null);
        try {
          await executeReceiptUndo({ receipt, proposal, repository, store: activityStoreBoundary });
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
    [aggregate, attachments, clearVoiceTimer, createThread, loadThreadWithRecovery, menuOpen, postSnapshot, repository, voice.state],
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
});
