import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppShell } from '../../ui/layout/AppShell';
import { BrandLockup } from '../../ui/BrandLockup';
import { Icon } from '../../ui/Icon';
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

export function UnifiedChatScreen() {
  const insets = useSafeAreaInsets();
  const config = useMemo(getUnifiedChatConfig, []);
  const repository = useMemo(() => createUnifiedChatRepository(), []);
  const webViewRef = useRef<WebView>(null);
  const [threads, setThreads] = useState<UnifiedChatThread[]>([]);
  const [aggregate, setAggregate] = useState<UnifiedChatThreadAggregate | null>(null);
  const [prompt, setPrompt] = useState('');
  const [surfaceReady, setSurfaceReady] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const postSnapshot = useCallback(
    (next: UnifiedChatThreadAggregate, type: 'host.initialize' | 'host.snapshot') => {
      const message = makeAgentWorkbenchHostMessage(
        type,
        buildWorkbenchSnapshot(next, prompt),
      );
      webViewRef.current?.postMessage(JSON.stringify(message));
    },
    [prompt],
  );

  const openThread = useCallback(
    async (threadId: string) => {
      setError(null);
      try {
        const next = await repository.loadThread(threadId);
        setAggregate(next);
        setPrompt('');
        setPickerVisible(false);
        if (surfaceReady) postSnapshot(next, 'host.initialize');
      } catch {
        setError('Kwilt could not open that chat.');
      }
    },
    [postSnapshot, repository, surfaceReady],
  );

  const refreshThreads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await repository.listThreads();
      setThreads(next);
      if (next.length > 0 && !aggregate) await openThread(next[0].id);
    } catch {
      setError('Sign in and try opening Chat again.');
    } finally {
      setLoading(false);
    }
  }, [aggregate, openThread, repository]);

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
    if (surfaceReady && aggregate) postSnapshot(aggregate, 'host.snapshot');
  }, [aggregate, postSnapshot, surfaceReady]);

  const createThread = useCallback(async () => {
    setError(null);
    try {
      const thread = await repository.createThread();
      const next = await repository.loadThread(thread.id);
      setThreads((current) => [thread, ...current.filter((item) => item.id !== thread.id)]);
      setAggregate(next);
      setPrompt('');
      setPickerVisible(false);
      if (surfaceReady) postSnapshot(next, 'host.initialize');
    } catch {
      setError('Kwilt could not create a new chat.');
    }
  }, [postSnapshot, repository, surfaceReady]);

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
      const command = message.command;
      if (command.type === 'composer.change') {
        setPrompt(command.prompt);
        return;
      }
      if (command.type === 'thread.create') {
        await createThread();
        return;
      }
      if (command.type !== 'run.send' || !aggregate) return;

      setPrompt('');
      setError(null);
      try {
        const next = await runUnifiedChatTurn({
          aggregate,
          prompt: command.prompt,
          clientRequestId: message.requestId,
        });
        setAggregate(next);
        const refreshed = await repository.listThreads();
        setThreads(refreshed);
      } catch (turnError) {
        try {
          setAggregate(await repository.loadThread(aggregate.thread.id));
        } catch {
          // Preserve the last visible transcript if refreshing the failed run also fails.
        }
        setError(turnError instanceof Error ? turnError.message : 'Response interrupted.');
      }
    },
    [aggregate, createThread, postSnapshot, repository],
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
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}> 
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open chats"
          onPress={() => setPickerVisible(true)}
          style={styles.headerTitleButton}
        >
          <Icon name="menu" size={20} color={colors.textPrimary} />
          <Text numberOfLines={1} style={styles.headerTitle}>
            {aggregate?.thread.title ?? 'Chat'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New chat"
          onPress={() => void createThread()}
          style={styles.iconButton}
        >
          <Icon name="plus" size={21} color={colors.textPrimary} />
        </Pressable>
      </View>

      {error ? (
        <Pressable accessibilityRole="button" onPress={() => setError(null)} style={styles.errorBar}>
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
          onError={() => setError('The Chat surface could not load. Tap here to dismiss and retry.')}
          javaScriptEnabled
          sharedCookiesEnabled={false}
          thirdPartyCookiesEnabled={false}
          setSupportMultipleWindows={false}
          allowsLinkPreview={false}
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

      <Modal visible={pickerVisible} animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <SafeAreaView style={styles.picker}>
          <View style={styles.pickerHeader}>
            <BrandLockup logoSize={28} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close chats"
              onPress={() => setPickerVisible(false)}
              style={styles.iconButton}
            >
              <Icon name="close" size={22} color={colors.textPrimary} />
            </Pressable>
          </View>
          <Pressable onPress={() => void createThread()} style={styles.newChatRow}>
            <Icon name="plus" size={18} color={colors.textPrimary} />
            <Text style={styles.newChatText}>New chat</Text>
          </Pressable>
          <FlatList
            data={threads}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.threadList}
            ListEmptyComponent={<Text style={styles.emptyListText}>No chats yet.</Text>}
            renderItem={({ item }) => (
              <View style={styles.threadRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void openThread(item.id)}
                  style={styles.threadMain}
                >
                  <Text numberOfLines={1} style={styles.threadTitle}>{item.title}</Text>
                  <Text style={styles.threadDate}>{formatThreadDate(item.updatedAt)}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`More options for ${item.title}`}
                  onPress={() => showThreadActions(item)}
                  style={styles.iconButton}
                >
                  <Icon name="more" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>
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

function formatThreadDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  header: {
    minHeight: 58,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.shell,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitleButton: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { ...typography.titleSm, flex: 1, color: colors.textPrimary },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  webView: { flex: 1, backgroundColor: colors.canvas },
  errorBar: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.scheduleYellow },
  errorText: { ...typography.bodySm, color: colors.textPrimary },
  centeredState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing['2xl'], gap: spacing.md },
  stateTitle: { ...typography.titleMd, color: colors.textPrimary, textAlign: 'center' },
  stateBody: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  primaryButton: { backgroundColor: colors.accent, borderRadius: radii.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  primaryButtonText: { ...typography.label, color: colors.primaryForeground },
  picker: { flex: 1, backgroundColor: colors.canvas },
  pickerHeader: { minHeight: 58, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  newChatRow: { marginHorizontal: spacing.md, marginTop: spacing.sm, padding: spacing.md, borderRadius: radii.card, backgroundColor: colors.cardMuted, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  newChatText: { ...typography.label, color: colors.textPrimary },
  threadList: { padding: spacing.md, gap: spacing.xs },
  threadRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  threadMain: { flex: 1, paddingVertical: spacing.sm },
  threadTitle: { ...typography.body, color: colors.textPrimary },
  threadDate: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  emptyListText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', paddingTop: spacing['2xl'] },
});
