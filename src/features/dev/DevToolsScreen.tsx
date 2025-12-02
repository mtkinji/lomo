import { Alert, ScrollView, StyleSheet, View, Pressable, TextInput } from 'react-native';
import { useEffect, useState } from 'react';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useDrawerStatus } from '@react-navigation/drawer';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { colors, spacing, typography, fonts } from '../../theme';
import { Button, IconButton } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { Card } from '../../ui/Card';
import { Icon } from '../../ui/Icon';
import { VStack, HStack, Text, Heading, Textarea } from '../../ui/primitives';
import { Dialog } from '../../ui/Dialog';
import { KwiltBottomSheet } from '../../ui/BottomSheet';
import type { RootDrawerParamList } from '../../navigation/RootNavigator';
import { useFirstTimeUxStore } from '../../store/useFirstTimeUxStore';
import { useAppStore } from '../../store/useAppStore';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEV_COACH_CHAT_HISTORY_STORAGE_KEY,
  type CoachChatTurn,
  type DevCoachChatLogEntry,
  type DevCoachChatFeedback,
} from '../../services/ai';

export function DevToolsScreen() {
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const drawerStatus = useDrawerStatus();
  const menuOpen = drawerStatus === 'open';
  const isFlowActive = useFirstTimeUxStore((state) => state.isFlowActive);
  const triggerCount = useFirstTimeUxStore((state) => state.triggerCount);
  const lastTriggeredAt = useFirstTimeUxStore((state) => state.lastTriggeredAt);
  const startFlow = useFirstTimeUxStore((state) => state.startFlow);
  const dismissFlow = useFirstTimeUxStore((state) => state.dismissFlow);
  const resetOnboardingAnswers = useAppStore((state) => state.resetOnboardingAnswers);
  const goals = useAppStore((state) => state.goals);
  const lastOnboardingGoalId = useAppStore((state) => state.lastOnboardingGoalId);
  const setLastOnboardingGoalId = useAppStore((state) => state.setLastOnboardingGoalId);
  const setHasSeenFirstGoalCelebration = useAppStore(
    (state) => state.setHasSeenFirstGoalCelebration
  );

  const [chatHistory, setChatHistory] = useState<DevCoachChatLogEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [feedbackSummary, setFeedbackSummary] = useState<string>('');
  const [viewMode, setViewMode] = useState<'tools' | 'gallery'>('tools');
  const [demoDialogVisible, setDemoDialogVisible] = useState(false);
  const [demoSheetVisible, setDemoSheetVisible] = useState(false);

  const loadChatHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const raw = await AsyncStorage.getItem(DEV_COACH_CHAT_HISTORY_STORAGE_KEY);
      if (!raw) {
        setChatHistory([]);
        return;
      }
      const parsed = JSON.parse(raw) as DevCoachChatLogEntry[];
      setChatHistory(Array.isArray(parsed) ? parsed.slice().reverse() : []);
    } catch (err) {
      console.warn('Failed to load dev coach chat history', err);
      setChatHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    void loadChatHistory();
  }, []);

  const handleTriggerFirstTimeUx = () => {
    resetOnboardingAnswers();
    startFlow();
  };

  const handleShowFirstGoalCelebration = () => {
    // Prefer the explicit onboarding-created goal when available so the
    // celebration mirrors the real first-time flow. Otherwise, fall back to
    // the most recently created goal so the overlay can still be exercised in
    // dev even without running onboarding first.
    const targetGoalId =
      lastOnboardingGoalId || (goals.length > 0 ? goals[goals.length - 1].id : null);

    if (!targetGoalId) {
      Alert.alert(
        'No goals available',
        'Create a goal first (or run onboarding) before testing the celebration overlay.'
      );
      return;
    }

    // Ensure the GoalDetail screen recognizes this goal as the onboarding
    // target and that the one-time flag does not suppress the overlay.
    setLastOnboardingGoalId(targetGoalId);
    setHasSeenFirstGoalCelebration(false);

    navigation.navigate('ArcsStack', {
      screen: 'GoalDetail',
      params: { goalId: targetGoalId, entryPoint: 'arcsStack' },
    });
  };

  const lastTriggeredLabel = lastTriggeredAt
    ? new Date(lastTriggeredAt).toLocaleString()
    : 'Never';

  const handleClearChatHistory = async () => {
    Alert.alert(
      'Clear chat history?',
      'This will remove all locally stored kwilt Coach dev history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(DEV_COACH_CHAT_HISTORY_STORAGE_KEY);
              setChatHistory([]);
            } catch (err) {
              console.warn('Failed to clear dev coach chat history', err);
            }
          },
        },
      ]
    );
  };

  const formatTimestamp = (value: string) => {
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  const previewLastUserMessage = (messages: CoachChatTurn[]) => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return 'No user messages';
    const trimmed = lastUser.content.trim();
    if (trimmed.length <= 80) return trimmed;
    return `${trimmed.slice(0, 77)}…`;
  };

  const prettyRole = (role: CoachChatTurn['role']) => {
    switch (role) {
      case 'user':
        return 'You';
      case 'assistant':
        return 'Coach';
      case 'system':
        return 'System';
      default:
        return role;
    }
  };

  const handleSaveFeedback = async (entryId: string) => {
    const draft = (feedbackDrafts[entryId] ?? '').trim();
    if (!draft) return;

    try {
      const raw = await AsyncStorage.getItem(DEV_COACH_CHAT_HISTORY_STORAGE_KEY);
      const existing: DevCoachChatLogEntry[] = raw ? JSON.parse(raw) : [];
      const now = new Date().toISOString();
      const nextFeedback: DevCoachChatFeedback = {
        id: `feedback-${now}`,
        createdAt: now,
        note: draft,
      };
      const updated = existing.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              feedback: [...(entry.feedback ?? []), nextFeedback],
            }
          : entry
      );
      await AsyncStorage.setItem(DEV_COACH_CHAT_HISTORY_STORAGE_KEY, JSON.stringify(updated));
      setFeedbackDrafts((current) => {
        const next = { ...current };
        delete next[entryId];
        return next;
      });
      // Refresh visible list to pick up new feedback and keep newest-first ordering.
      void loadChatHistory();
    } catch (err) {
      console.warn('Failed to save dev coach chat feedback', err);
    }
  };

  const handleGenerateSummary = () => {
    const entriesWithFeedback = chatHistory.filter(
      (entry) => entry.feedback && entry.feedback.length > 0
    );
    if (entriesWithFeedback.length === 0) {
      setFeedbackSummary(
        'No feedback recorded yet. Add notes on individual chats to generate a workflow change summary.'
      );
      return;
    }

    const lines: string[] = [];
    lines.push(`Workflow feedback summary (${entriesWithFeedback.length} chats with feedback)`);
    lines.push('');

    const grouped = new Map<string, DevCoachChatLogEntry[]>();
    for (const entry of entriesWithFeedback) {
      const key = entry.workflowDefinitionId || `mode:${entry.mode ?? 'unscoped'}`;
      const bucket = grouped.get(key);
      if (bucket) {
        bucket.push(entry);
      } else {
        grouped.set(key, [entry]);
      }
    }

    for (const [key, entries] of grouped) {
      const isModeKey = key.startsWith('mode:');
      const label = isModeKey ? `Mode: ${key.slice('mode:'.length)}` : `Workflow: ${key}`;
      lines.push(`- ${label}`);

      const sorted = [...entries].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      for (const entry of sorted) {
        const metaParts: string[] = [`  - Chat at ${formatTimestamp(entry.timestamp)}`];
        if (entry.workflowStepId) {
          metaParts.push(`step=${entry.workflowStepId}`);
        }
        if (entry.launchContextSummary) {
          metaParts.push(`context="${entry.launchContextSummary}"`);
        }
        lines.push(metaParts.join(' '));

        for (const fb of entry.feedback ?? []) {
          lines.push(`    - Feedback (${formatTimestamp(fb.createdAt)}): ${fb.note}`);
        }
      }

      lines.push('');
    }

    setFeedbackSummary(lines.join('\n'));
  };

  const isGallery = viewMode === 'gallery';

  const renderComponentGallery = () => {
    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stack}>
          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>Buttons</Text>
            <Text style={styles.gallerySectionDescription}>
              Variants and sizes from the shared `Button` adapter.
            </Text>
            <VStack space="sm">
              <HStack space="sm">
                <Button variant="accent">
                  <Text style={styles.primaryButtonLabel}>Primary</Text>
                </Button>
                <Button variant="secondary">
                  <Text style={styles.secondaryButtonLabel}>Secondary</Text>
                </Button>
                <Button variant="outline">
                  <Text style={styles.secondaryButtonLabel}>Outline</Text>
                </Button>
              </HStack>
              <HStack space="sm">
                <Button variant="destructive">
                  <Text style={styles.primaryButtonLabel}>Destructive</Text>
                </Button>
                <Button variant="ghost">
                  <Text style={styles.secondaryButtonLabel}>Ghost</Text>
                </Button>
              </HStack>
              <View style={styles.gallerySubsectionHeader}>
                <Text style={styles.galleryFieldLabel}>Size variants</Text>
              </View>
              <HStack space="sm">
                <Button variant="accent">
                  <Text style={styles.primaryButtonLabel}>Default</Text>
                </Button>
                <Button variant="accent" size="small">
                  <Text style={styles.primaryButtonLabel}>Small</Text>
                </Button>
                <IconButton accessibilityLabel="Icon button example">
                  <Icon name="more" size={18} color={colors.canvas} />
                </IconButton>
              </HStack>
            </VStack>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>Inputs</Text>
            <Text style={styles.gallerySectionDescription}>
              Labeled inputs with helper and error text states.
            </Text>
            <VStack space="sm">
              <Input label="Surface input" placeholder="Type something" />
              <Input
                label="Outline input"
                variant="outline"
                placeholder="Search"
                leadingIcon="search"
              />
              <Input
                label="With helper text"
                helperText="Explain what belongs here."
                placeholder="Add details"
              />
              <View style={styles.gallerySubsectionHeader}>
                <Text style={styles.galleryFieldLabel}>Textarea</Text>
              </View>
              <Textarea
                label="Notes"
                placeholder="Long-form copy or notes across multiple lines."
                multiline
                numberOfLines={4}
              />
              <Input
                label="Error state"
                errorText="Something went wrong"
                placeholder="Try again"
              />
            </VStack>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>Badges</Text>
            <Text style={styles.gallerySectionDescription}>
              Status and meta labels using the shared `Badge` adapter.
            </Text>
            <HStack space="sm">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </HStack>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>Cards</Text>
            <Text style={styles.gallerySectionDescription}>
              Surface container from the `Card` adapter.
            </Text>
            <Card style={{ padding: spacing.md }}>
              <VStack space="xs">
                <Heading variant="sm">Card title</Heading>
                <Text>
                  Use cards to group related content on the main canvas without changing the shell
                  background.
                </Text>
                <Button size="small">
                  <Text style={styles.primaryButtonLabel}>Primary action</Text>
                </Button>
              </VStack>
            </Card>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>Typography</Text>
            <Text style={styles.gallerySectionDescription}>
              Heading and text primitives with tone variants.
            </Text>
            <VStack space="sm">
              <Heading variant="xl">Heading XL</Heading>
              <Heading variant="lg">Heading LG</Heading>
              <Heading variant="md">Heading MD</Heading>
              <Heading variant="sm">Heading SM</Heading>
              <Text>Body (default)</Text>
              <Text variant="body">Body (body)</Text>
              <Text variant="bodySm">Body (bodySm)</Text>
              <Text variant="label">Label</Text>
              <HStack space="sm" style={{ marginTop: spacing.sm }}>
                <Text tone="secondary">Secondary tone</Text>
                <Text tone="muted">Muted tone</Text>
                <Text tone="accent">Accent tone</Text>
                <Text tone="destructive">Destructive tone</Text>
              </HStack>
            </VStack>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>Dialog</Text>
            <Text style={styles.gallerySectionDescription}>
              Modal confirmation dialog using the shared `Dialog` adapter.
            </Text>
            <Button variant="accent" onPress={() => setDemoDialogVisible(true)}>
              <Text style={styles.primaryButtonLabel}>Open dialog</Text>
            </Button>
            <Dialog
              visible={demoDialogVisible}
              onClose={() => setDemoDialogVisible(false)}
              title="Example dialog"
              description="Use dialogs for confirmations or focused decisions."
              footer={
                <HStack space="sm" style={{ justifyContent: 'flex-end' }}>
                  <Button variant="outline" size="small" onPress={() => setDemoDialogVisible(false)}>
                    <Text style={styles.secondaryButtonLabel}>Cancel</Text>
                  </Button>
                  <Button size="small" onPress={() => setDemoDialogVisible(false)}>
                    <Text style={styles.primaryButtonLabel}>Confirm</Text>
                  </Button>
                </HStack>
              }
            >
              <Text>
                This is a live dialog preview. In real flows, you’d wire the actions to your feature
                logic.
              </Text>
            </Dialog>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>Bottom sheet</Text>
            <Text style={styles.gallerySectionDescription}>
              Sliding panel built on the shared `KwiltBottomSheet` adapter.
            </Text>
            <Button variant="accent" onPress={() => setDemoSheetVisible(true)}>
              <Text style={styles.primaryButtonLabel}>Open bottom sheet</Text>
            </Button>
            <Text style={styles.galleryHelperText}>
              On device, swipe down or tap the scrim to dismiss.
            </Text>
          </View>
        </View>

        <KwiltBottomSheet
          visible={demoSheetVisible}
          onClose={() => setDemoSheetVisible(false)}
          snapPoints={['40%']}
        >
          <View style={styles.sheetContent}>
            <Heading variant="sm">Bottom sheet preview</Heading>
            <Text style={styles.sheetBody}>
              Use sheets for secondary flows and filters that should feel attached to the current
              canvas.
            </Text>
            <Button variant="accent" size="small" onPress={() => setDemoSheetVisible(false)}>
              <Text style={styles.primaryButtonLabel}>Close sheet</Text>
            </Button>
          </View>
        </KwiltBottomSheet>
      </ScrollView>
    );
  };

  return (
    <AppShell>
      <PageHeader
        title="Dev mode"
        iconName="dev"
        menuOpen={menuOpen}
        onPressMenu={() => navigation.dispatch(DrawerActions.openDrawer())}
      >
        <Text style={[styles.screenSubtitle, { paddingTop: spacing.lg }]}>
          {isGallery
            ? 'Preview shared UI primitives live on-device. Only visible in development builds.'
            : 'Utilities for testing and development. Only visible in development builds.'}
        </Text>
        <View style={styles.tabSwitcher}>
          <Pressable
            style={[styles.tab, !isGallery && styles.tabActive]}
            onPress={() => setViewMode('tools')}
          >
            <Text
              style={[
                styles.tabLabel,
                !isGallery && styles.tabLabelActive,
              ]}
            >
              Tools
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, isGallery && styles.tabActive]}
            onPress={() => setViewMode('gallery')}
          >
            <Text
              style={[
                styles.tabLabel,
                isGallery && styles.tabLabelActive,
              ]}
            >
              Components
            </Text>
          </Pressable>
        </View>
      </PageHeader>
      {isGallery ? (
        renderComponentGallery()
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stack}>
            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>First-time UX</Text>
              {/* <Heading style={styles.cardTitle}>Trigger onboarding flow</Heading> */}
              {/* <Text style={styles.cardBody}>
                Launches the first-time experience overlay immediately, even if it was already
                completed.
              </Text> */}
              <Button onPress={handleTriggerFirstTimeUx}>
                <Text style={styles.primaryButtonLabel}>Trigger first-time UX</Text>
              </Button>
              {isFlowActive && (
                <Button variant="secondary" onPress={dismissFlow}>
                  <Text style={styles.secondaryButtonLabel}>Force dismiss</Text>
                </Button>
              )}
              <Button variant="secondary" onPress={handleShowFirstGoalCelebration}>
                <Text style={styles.secondaryButtonLabel}>Show first-goal celebration</Text>
              </Button>
              <Text style={styles.meta}>
                Triggered {triggerCount} {triggerCount === 1 ? 'time' : 'times'} • Last:{' '}
                {lastTriggeredLabel}
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardEyebrow}>Agent chat history</Text>
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => {
                    void loadChatHistory();
                  }}
                >
                  <Text style={styles.secondaryButtonLabel}>
                    {isLoadingHistory ? 'Refreshing…' : 'Refresh'}
                  </Text>
                </Button>
              </View>
              <Text style={styles.cardBody}>
                Inspect recent kwilt Coach conversations captured from this device. History is
                stored locally and only in development builds.
              </Text>
              {chatHistory.length === 0 ? (
                <Text style={styles.meta}>
                  No chat history captured yet. Start a conversation with the coach and then refresh.
                </Text>
              ) : (
                <View style={styles.historyList}>
                  {chatHistory.map((entry) => {
                    const isExpanded = expandedEntryId === entry.id;
                    return (
                      <View key={entry.id} style={styles.historyItem}>
                        <Pressable
                          onPress={() =>
                            setExpandedEntryId((current) =>
                              current === entry.id ? null : entry.id,
                            )
                          }
                          style={styles.historyHeaderRow}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.historyTitle}>
                              {entry.mode ? `Mode: ${entry.mode}` : 'Untyped conversation'}
                            </Text>
                            <Text style={styles.historySubtitle}>
                              {previewLastUserMessage(entry.messages)}
                            </Text>
                          </View>
                          <Text style={styles.historyTimestamp}>
                            {formatTimestamp(entry.timestamp)}
                          </Text>
                        </Pressable>
                        {isExpanded && (
                          <View style={styles.historyTranscript}>
                            {entry.workflowDefinitionId && (
                              <Text style={styles.historyMetaLine}>
                                Workflow: {entry.workflowDefinitionId}
                                {entry.workflowStepId ? ` • Step: ${entry.workflowStepId}` : ''}
                              </Text>
                            )}
                            {!entry.workflowDefinitionId && entry.mode && (
                              <Text style={styles.historyMetaLine}>Mode: {entry.mode}</Text>
                            )}
                            {entry.launchContextSummary && (
                              <Text style={styles.historyMetaLine} numberOfLines={3}>
                                {entry.launchContextSummary}
                              </Text>
                            )}
                            {entry.messages.map((message, index) => (
                              <View key={`${entry.id}-${index}`} style={styles.historyMessageRow}>
                                <Text style={styles.historyMessageRole}>
                                  {prettyRole(message.role)}
                                </Text>
                                <Text style={styles.historyMessageContent}>
                                  {message.content}
                                </Text>
                              </View>
                            ))}
                            {entry.feedback && entry.feedback.length > 0 && (
                              <View style={styles.feedbackList}>
                                {entry.feedback.map((fb) => (
                                  <View key={fb.id} style={styles.feedbackItem}>
                                    <Text style={styles.feedbackMeta}>
                                      {formatTimestamp(fb.createdAt)}
                                    </Text>
                                    <Text style={styles.feedbackNote}>{fb.note}</Text>
                                  </View>
                                ))}
                              </View>
                            )}
                            <View style={styles.feedbackEditor}>
                              <Text style={styles.feedbackLabel}>
                                Add workflow feedback for this chat
                              </Text>
                              <TextInput
                                style={styles.feedbackInput}
                                multiline
                                placeholder="e.g., Offer a confirm option earlier when the user says they’re ready."
                                placeholderTextColor={colors.textSecondary}
                                value={feedbackDrafts[entry.id] ?? ''}
                                onChangeText={(text) =>
                                  setFeedbackDrafts((current) => ({
                                    ...current,
                                    [entry.id]: text,
                                  }))
                                }
                              />
                              <View style={styles.feedbackActionsRow}>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onPress={() => handleSaveFeedback(entry.id)}
                                >
                                  <Text style={styles.secondaryButtonLabel}>Save feedback</Text>
                                </Button>
                              </View>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
              {chatHistory.length > 0 && (
                <>
                  <View style={styles.historyFooterRow}>
                    <Button variant="secondary" size="sm" onPress={handleGenerateSummary}>
                      <Text style={styles.secondaryButtonLabel}>Generate workflow summary</Text>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={handleClearChatHistory}
                      style={{ marginLeft: spacing.sm }}
                    >
                      <Text style={styles.secondaryButtonLabel}>Clear history</Text>
                    </Button>
                  </View>
                  {feedbackSummary.length > 0 && (
                    <View style={styles.summaryContainer}>
                      <Text style={styles.summaryLabel}>Summary (copy/paste into Cursor)</Text>
                      <ScrollView
                        style={styles.summaryScroll}
                        contentContainerStyle={styles.summaryContent}
                        nestedScrollEnabled
                      >
                        <Text style={styles.summaryText} selectable>
                          {feedbackSummary}
                        </Text>
                      </ScrollView>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  stack: {
    gap: spacing.lg,
  },
  tabSwitcher: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.shellAlt,
    alignSelf: 'center',
    marginTop: spacing.lg,
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  tabActive: {
    backgroundColor: colors.canvas,
  },
  tabLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
  screenSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.canvas,
    borderRadius: 28,
    padding: spacing.xl,
    gap: spacing.md,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardEyebrow: {
    ...typography.label,
    color: colors.muted,
  },
  cardTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  cardBody: {
    ...typography.body,
    color: colors.textSecondary,
  },
  primaryButtonLabel: {
    ...typography.body,
    color: colors.canvas,
    fontFamily: fonts.semibold,
  },
  secondaryButtonLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
  meta: {
    ...typography.bodySm,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  historyList: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  historyItem: {
    borderRadius: 16,
    backgroundColor: colors.shell,
    padding: spacing.md,
    gap: spacing.sm,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  historyTitle: {
    ...typography.bodySm,
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  historySubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  historyTimestamp: {
    ...typography.caption,
    color: colors.muted,
  },
  historyTranscript: {
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  historyMessageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  historyMessageRole: {
    ...typography.bodySm,
    color: colors.muted,
    width: 72,
  },
  historyMessageContent: {
    ...typography.bodySm,
    color: colors.textPrimary,
    flex: 1,
  },
  historyFooterRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  historyMetaLine: {
    ...typography.bodySm,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  feedbackEditor: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  feedbackLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  feedbackInput: {
    minHeight: 64,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    ...typography.bodySm,
    color: colors.textPrimary,
    backgroundColor: colors.canvas,
  },
  feedbackActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  feedbackList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  feedbackItem: {
    borderRadius: 10,
    backgroundColor: colors.canvas,
    padding: spacing.sm,
    gap: spacing.xs / 2,
  },
  feedbackMeta: {
    ...typography.caption,
    color: colors.muted,
  },
  feedbackNote: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  summaryContainer: {
    marginTop: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.shell,
    padding: spacing.md,
    gap: spacing.sm,
  },
  summaryLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  summaryScroll: {
    maxHeight: 200,
  },
  summaryContent: {
    paddingBottom: spacing.xs,
  },
  summaryText: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  gallerySectionDescription: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  gallerySubsectionHeader: {
    marginTop: spacing.sm,
  },
  galleryFieldLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  galleryHelperText: {
    ...typography.bodySm,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  sheetContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  sheetBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});


