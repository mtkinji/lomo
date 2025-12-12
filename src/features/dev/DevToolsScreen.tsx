import { Alert, ScrollView, StyleSheet, View, Pressable, TextInput } from 'react-native';
import { useEffect, useState } from 'react';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useDrawerStatus } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { colors, spacing, typography, fonts } from '../../theme';
import { Button, IconButton } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { Card } from '../../ui/Card';
import { Icon } from '../../ui/Icon';
import { VStack, HStack, Text, Heading, Textarea, ButtonLabel } from '../../ui/primitives';
import { Dialog } from '../../ui/Dialog';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { FullScreenInterstitial } from '../../ui/FullScreenInterstitial';
import { Logo } from '../../ui/Logo';
import type { RootDrawerParamList } from '../../navigation/RootNavigator';
import { useFirstTimeUxStore } from '../../store/useFirstTimeUxStore';
import { useAppStore } from '../../store/useAppStore';
import { ensureArcBannerPrefill } from '../arcs/arcBannerPrefill';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEV_COACH_CHAT_HISTORY_STORAGE_KEY,
  type CoachChatTurn,
  type DevCoachChatLogEntry,
  type DevCoachChatFeedback,
} from '../../services/ai';
import { NotificationService } from '../../services/NotificationService';

type InterstitialVariant = 'launch' | 'auth' | 'streak';

export function DevToolsScreen() {
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const drawerStatus = useDrawerStatus();
  const insets = useSafeAreaInsets();
  const menuOpen = drawerStatus === 'open';
  const isFlowActive = useFirstTimeUxStore((state) => state.isFlowActive);
  const triggerCount = useFirstTimeUxStore((state) => state.triggerCount);
  const lastTriggeredAt = useFirstTimeUxStore((state) => state.lastTriggeredAt);
  const arcs = useAppStore((state) => state.arcs);
  const addArc = useAppStore((state) => state.addArc);
  const startFlow = useFirstTimeUxStore((state) => state.startFlow);
  const dismissFlow = useFirstTimeUxStore((state) => state.dismissFlow);
  const resetOnboardingAnswers = useAppStore((state) => state.resetOnboardingAnswers);
  const goals = useAppStore((state) => state.goals);
  const lastOnboardingArcId = useAppStore((state) => state.lastOnboardingArcId);
  const lastOnboardingGoalId = useAppStore((state) => state.lastOnboardingGoalId);
  const setLastOnboardingArcId = useAppStore((state) => state.setLastOnboardingArcId);
  const setHasSeenFirstArcCelebration = useAppStore(
    (state) => state.setHasSeenFirstArcCelebration
  );
  const setHasDismissedOnboardingGoalGuide = useAppStore(
    (state) => state.setHasDismissedOnboardingGoalGuide
  );
  const setLastOnboardingGoalId = useAppStore((state) => state.setLastOnboardingGoalId);
  const setHasSeenFirstGoalCelebration = useAppStore(
    (state) => state.setHasSeenFirstGoalCelebration
  );

  const [chatHistory, setChatHistory] = useState<DevCoachChatLogEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [feedbackSummary, setFeedbackSummary] = useState<string>('');
  const [viewMode, setViewMode] = useState<'tools' | 'gallery' | 'typeColor'>('tools');
  const [demoDialogVisible, setDemoDialogVisible] = useState(false);
  const [demoSheetVisible, setDemoSheetVisible] = useState(false);
  const [interstitialVariant, setInterstitialVariant] = useState<InterstitialVariant>('launch');
  const [isInterstitialFullScreenVisible, setIsInterstitialFullScreenVisible] = useState(false);
  const [launchBody, setLaunchBody] = useState('Grow into the person you want to be.');
  const [authBody, setAuthBody] = useState(
    'Save your arcs and sync your progress across devices.'
  );
  const [streakDays, setStreakDays] = useState('21');
  const [streakBody, setStreakBody] = useState(
    'You’ve shown up 21 days in a row. Keep the thread going with one small action.'
  );

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

  const handleDebugDailyShowUpNotification = () => {
    void NotificationService.debugFireNotification('dailyShowUp');
  };

  const handleDebugStreakNotification = () => {
    void NotificationService.debugFireNotification('streak');
  };

  const handleDebugReactivationNotification = () => {
    void NotificationService.debugFireNotification('reactivation');
  };

  const handleShowFirstArcCelebration = () => {
    // Fast path for testing the "Arc just created" landing moment:
    // create a fresh Arc in the store, mark it as the onboarding Arc,
    // and navigate directly to its detail screen.
    const nowIso = new Date().toISOString();
    const targetArcId = `dev-onboarding-arc-${Date.now()}`;
    const arc = {
      id: targetArcId,
      name: '🚀 Dev: First Arc',
      narrative:
        'This Arc exists to help test the onboarding Arc handoff UI without running the full flow.',
      status: 'active',
      startDate: nowIso,
      endDate: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    } as const;
    addArc(arc);
    void ensureArcBannerPrefill(arc);

    // Ensure ArcDetail recognizes this Arc as the onboarding-created Arc and
    // that the one-time flags do not suppress the handoff/guide UI.
    setLastOnboardingArcId(targetArcId);
    setHasSeenFirstArcCelebration(false);
    setHasDismissedOnboardingGoalGuide(false);

    navigation.navigate('ArcsStack', {
      screen: 'ArcDetail',
      params: { arcId: targetArcId, openGoalCreation: false },
    });
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
  const isTypeAndColor = viewMode === 'typeColor';

  const interstitialSegmentOptions: { value: InterstitialVariant; label: string }[] = [
    { value: 'launch', label: 'Launch' },
    { value: 'auth', label: 'Auth' },
    { value: 'streak', label: 'Streak' },
  ];

  const renderInterstitialPreview = (options?: { fullScreen?: boolean }) => {
    const fullScreen = options?.fullScreen ?? false;

    switch (interstitialVariant) {
      case 'auth':
        return (
          <View style={styles.interstitialContent}>
            {fullScreen && __DEV__ && (
              <View style={[styles.devExitRow, { top: insets.top + 8 }]}>
                <Button
                  variant="accent"
                  size="icon"
                  iconButtonSize={28}
                  onPress={() => setIsInterstitialFullScreenVisible(false)}
                  accessibilityLabel="Close interstitial and return to Dev tools"
                  style={styles.devExitButton}
                >
                  <Icon name="dev" color={colors.canvas} size={16} />
                </Button>
              </View>
            )}
            <View style={styles.interstitialHeroBlock}>
              <Text style={styles.interstitialTitle}>Sign in to continue</Text>
              <Text style={styles.interstitialBody}>{authBody}</Text>
            </View>
            <View style={styles.interstitialAuthCard}>
              <Input label="Email" placeholder="you@example.com" />
              <Input label="Password" placeholder="••••••••" />
              <Button variant="accent" fullWidth>
                <ButtonLabel size="md" tone="inverse">
                  Continue
                </ButtonLabel>
              </Button>
              <Button variant="ghost" fullWidth>
                <ButtonLabel size="md">Create an account</ButtonLabel>
              </Button>
            </View>
          </View>
        );
      case 'streak':
        return (
          <View style={styles.interstitialContent}>
            {fullScreen && __DEV__ && (
              <View style={[styles.devExitRow, { top: insets.top + 8 }]}>
                <Button
                  variant="accent"
                  size="icon"
                  iconButtonSize={28}
                  onPress={() => setIsInterstitialFullScreenVisible(false)}
                  accessibilityLabel="Close interstitial and return to Dev tools"
                  style={styles.devExitButton}
                >
                  <Icon name="dev" color={colors.canvas} size={16} />
                </Button>
              </View>
            )}
            <View style={styles.streakHeroBlock}>
              <Text style={styles.streakLabel}>Current streak</Text>
              <Text style={styles.streakNumber}>{streakDays}</Text>
              <Text style={styles.streakBody}>{streakBody}</Text>
            </View>
            <View style={styles.interstitialFooterBlock}>
              <Button variant="accent" fullWidth>
                <ButtonLabel size="md" tone="inverse">
                  Plan today’s step
                </ButtonLabel>
              </Button>
            </View>
          </View>
        );
      case 'launch':
      default:
        return (
          <View style={styles.interstitialContent}>
            {fullScreen && __DEV__ && (
              <View style={[styles.devExitRow, { top: insets.top + 8 }]}>
                <Button
                  variant="accent"
                  size="icon"
                  iconButtonSize={28}
                  onPress={() => setIsInterstitialFullScreenVisible(false)}
                  accessibilityLabel="Close interstitial and return to Dev tools"
                  style={styles.devExitButton}
                >
                  <Icon name="dev" color={colors.canvas} size={16} />
                </Button>
              </View>
            )}
            <View style={styles.interstitialHeroBlock}>
              <View style={styles.launchBrandLockup}>
                <Logo size={72} />
                <Text style={styles.launchWordmark}>kwilt</Text>
              </View>
            </View>
          </View>
        );
    }
  };

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
                  <ButtonLabel size="md" tone="inverse">
                    Primary
                  </ButtonLabel>
                </Button>
                <Button variant="secondary">
                  <ButtonLabel size="md">Secondary</ButtonLabel>
                </Button>
                <Button variant="outline">
                  <ButtonLabel size="md">Outline</ButtonLabel>
                </Button>
              </HStack>
              <HStack space="sm">
                <Button variant="destructive">
                  <ButtonLabel size="md" tone="inverse">
                    Destructive
                  </ButtonLabel>
                </Button>
                <Button variant="ghost">
                  <ButtonLabel size="md">Ghost</ButtonLabel>
                </Button>
              </HStack>
              <View style={styles.gallerySubsectionHeader}>
                <Text style={styles.galleryFieldLabel}>Size variants</Text>
              </View>
              <HStack space="sm" alignItems="flex-start">
                <Button variant="accent" size="lg">
                  <ButtonLabel size="lg" tone="inverse">
                    Large
                  </ButtonLabel>
                </Button>
                <Button variant="accent">
                  <ButtonLabel size="md" tone="inverse">
                    Medium
                  </ButtonLabel>
                </Button>
                <Button variant="accent" size="small">
                  <ButtonLabel size="sm" tone="inverse">
                    Small
                  </ButtonLabel>
                </Button>
                <IconButton accessibilityLabel="Icon button example">
                  <Icon name="more" size={18} color={colors.canvas} />
                </IconButton>
              </HStack>
              <View style={styles.gallerySubsectionHeader}>
                <Text style={styles.galleryFieldLabel}>Full-width</Text>
              </View>
              <Button variant="accent" fullWidth>
                <ButtonLabel size="md" tone="inverse">
                  Full width action
                </ButtonLabel>
              </Button>
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
              Sliding panel built on the shared `BottomDrawer` primitive.
            </Text>
            <Button variant="accent" onPress={() => setDemoSheetVisible(true)}>
              <Text style={styles.primaryButtonLabel}>Open bottom sheet</Text>
            </Button>
            <Text style={styles.galleryHelperText}>
              On device, swipe down or tap the scrim to dismiss.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>Interstitials</Text>
            <Text style={styles.gallerySectionDescription}>
              Full-screen guidance and celebration layouts that sit on top of the app shell.
            </Text>
            <SegmentedControl
              style={styles.interstitialVariantTabs}
              value={interstitialVariant}
              onChange={(next) => setInterstitialVariant(next as InterstitialVariant)}
              options={interstitialSegmentOptions}
            />

            {interstitialVariant === 'auth' && (
              <VStack space="sm" style={styles.interstitialControls}>
                <Textarea
                  label="Supporting copy"
                  placeholder="Explain why signing in matters"
                  value={authBody}
                  onChangeText={setAuthBody}
                  numberOfLines={3}
                />
              </VStack>
            )}

            {interstitialVariant === 'streak' && (
              <VStack space="sm" style={styles.interstitialControls}>
                <Input
                  label="Streak days"
                  value={streakDays}
                  keyboardType="number-pad"
                  onChangeText={setStreakDays}
                />
                <Textarea
                  label="Supporting copy"
                  value={streakBody}
                  onChangeText={setStreakBody}
                  numberOfLines={3}
                />
              </VStack>
            )}

            <View style={styles.interstitialPreviewSurface}>{renderInterstitialPreview()}</View>

            <Button
              variant="accent"
              fullWidth
              style={styles.interstitialLaunchButton}
              onPress={() => setIsInterstitialFullScreenVisible(true)}
            >
              <ButtonLabel size="md" tone="inverse">
                Launch full-screen
              </ButtonLabel>
            </Button>
          </View>
        </View>

        <BottomDrawer
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
        </BottomDrawer>
      </ScrollView>
    );
  };

  const renderTypeAndColorGallery = () => {
    const pineScale = [
      { token: 'pine50', label: 'Pine 50', value: colors.pine50 },
      { token: 'pine100', label: 'Pine 100', value: colors.pine100 },
      { token: 'pine200', label: 'Pine 200', value: colors.pine200 },
      { token: 'pine300', label: 'Pine 300', value: colors.pine300 },
      { token: 'pine400', label: 'Pine 400', value: colors.pine400 },
      { token: 'pine500', label: 'Pine 500', value: colors.pine500 },
      { token: 'pine600', label: 'Pine 600', value: colors.pine600 },
      { token: 'pine700', label: 'Pine 700', value: colors.pine700 },
      { token: 'pine800', label: 'Pine 800', value: colors.pine800 },
      { token: 'pine900', label: 'Pine 900', value: colors.pine900 },
    ];

    const grayScale = [
      { token: 'gray50', label: 'Gray 50', value: colors.gray50 },
      { token: 'gray100', label: 'Gray 100', value: colors.gray100 },
      { token: 'gray200', label: 'Gray 200', value: colors.gray200 },
      { token: 'gray300', label: 'Gray 300', value: colors.gray300 },
      { token: 'gray400', label: 'Gray 400', value: colors.gray400 },
      { token: 'gray500', label: 'Gray 500', value: colors.gray500 },
      { token: 'gray600', label: 'Gray 600', value: colors.gray600 },
      { token: 'gray700', label: 'Gray 700', value: colors.gray700 },
      { token: 'gray800', label: 'Gray 800', value: colors.gray800 },
      { token: 'gray900', label: 'Gray 900', value: colors.gray900 },
    ];

    const brandPalette = [
      { token: 'accent', label: 'Accent', value: colors.accent },
      { token: 'accentMuted', label: 'Accent muted', value: colors.accentMuted },
      { token: 'accentRose', label: 'Accent rose', value: colors.accentRose },
      {
        token: 'accentRoseStrong',
        label: 'Accent rose (strong)',
        value: colors.accentRoseStrong,
      },
      { token: 'indigo', label: 'Indigo', value: colors.indigo },
      { token: 'turmeric', label: 'Turmeric', value: colors.turmeric },
      { token: 'madder', label: 'Madder', value: colors.madder },
      { token: 'quiltBlue', label: 'Quilt blue', value: colors.quiltBlue },
      { token: 'clay', label: 'Clay', value: colors.clay },
      { token: 'moss', label: 'Moss', value: colors.moss },
      { token: 'sumi', label: 'Sumi', value: colors.sumi },
    ];

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stack}>
          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>Typography tokens</Text>
            <Text style={styles.gallerySectionDescription}>
              Inspect the base type ramp used across headings, body copy, and labels.
            </Text>
            <View style={styles.typeTokenRow}>
              <Text style={styles.typeTokenName}>Brand</Text>
              <Text style={typography.brand}>kwilt</Text>
            </View>
            <View style={styles.typeTokenRow}>
              <Text style={styles.typeTokenName}>Title / MD</Text>
              <Text style={typography.titleMd}>Architect your next arc</Text>
            </View>
            <View style={styles.typeTokenRow}>
              <Text style={styles.typeTokenName}>Body</Text>
              <Text style={styles.typeTokenSample}>Gentle guidance and daily steps.</Text>
            </View>
            <View style={styles.typeTokenRow}>
              <Text style={styles.typeTokenName}>Label</Text>
              <Text style={typography.label}>Label</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>Pine scale</Text>
            <Text style={styles.gallerySectionDescription}>
              Primary brand green scale used by kwilt, aligned with the logo accent.
            </Text>
            <View style={styles.colorList}>
              {pineScale.map((swatch) => (
                <View key={swatch.token} style={styles.colorRow}>
                  <View style={[styles.colorSwatch, { backgroundColor: swatch.value }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.colorLabel}>{swatch.label}</Text>
                    <Text style={styles.colorToken}>{swatch.value.toUpperCase()}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>Gray scale</Text>
            <Text style={styles.gallerySectionDescription}>
              Neutral ramp used for canvas, borders, and text contrast.
            </Text>
            <View style={styles.colorList}>
              {grayScale.map((swatch) => (
                <View key={swatch.token} style={styles.colorRow}>
                  <View style={[styles.colorSwatch, { backgroundColor: swatch.value }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.colorLabel}>{swatch.label}</Text>
                    <Text style={styles.colorToken}>{swatch.value.toUpperCase()}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>Brand accents</Text>
            <Text style={styles.gallerySectionDescription}>
              Hero brand hues used for illustration, emphasis, and celebration moments.
            </Text>
            <View style={styles.colorList}>
              {brandPalette.map((swatch) => (
                <View key={swatch.token} style={styles.colorRow}>
                  <View style={[styles.colorSwatch, { backgroundColor: swatch.value }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.colorLabel}>{swatch.label}</Text>
                    <Text style={styles.colorToken}>{swatch.value.toUpperCase()}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
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
            : isTypeAndColor
            ? 'Inspect base typography and color tokens that underpin the shared UI system.'
            : 'Utilities for testing and development. Only visible in development builds.'}
        </Text>
        <SegmentedControl
          style={styles.tabSwitcher}
          value={viewMode}
          onChange={(next) => setViewMode(next)}
          options={[
            { value: 'tools', label: 'Tools' },
            { value: 'gallery', label: 'Components' },
            { value: 'typeColor', label: 'Type & Color' },
          ]}
        />
      </PageHeader>
      {isGallery ? (
        <>
          {renderComponentGallery()}
          <FullScreenInterstitial
            visible={isInterstitialFullScreenVisible}
            onDismiss={() => setIsInterstitialFullScreenVisible(false)}
            progression={interstitialVariant === 'launch' ? 1500 : 'button'}
            backgroundColor={
              interstitialVariant === 'launch'
                ? 'pine300'
                : interstitialVariant === 'streak'
                ? 'indigo'
                : 'shell'
            }
          >
            {renderInterstitialPreview({ fullScreen: true })}
          </FullScreenInterstitial>
        </>
      ) : isTypeAndColor ? (
        renderTypeAndColorGallery()
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
              <Button variant="accent" onPress={handleTriggerFirstTimeUx} style={styles.cardAction}>
                <ButtonLabel size="md" tone="inverse">
                  Trigger first-time UX
                </ButtonLabel>
              </Button>
              {isFlowActive && (
                <Button variant="secondary" onPress={dismissFlow} style={styles.cardAction}>
                  <ButtonLabel size="md">Force dismiss</ButtonLabel>
                </Button>
              )}
              <Button variant="secondary" onPress={handleShowFirstArcCelebration} style={styles.cardAction}>
                <ButtonLabel size="md">Show first-Arc celebration</ButtonLabel>
              </Button>
              <Button variant="secondary" onPress={handleShowFirstGoalCelebration} style={styles.cardAction}>
                <ButtonLabel size="md">Show first-goal celebration</ButtonLabel>
              </Button>
              <Text style={styles.meta}>
                Triggered {triggerCount} {triggerCount === 1 ? 'time' : 'times'} • Last:{' '}
                {lastTriggeredLabel}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>Notifications (dev)</Text>
              <Text style={styles.cardBody}>
                Fire different notification types after a short delay to test deep links and OS
                behavior. Make sure notifications are enabled in Settings → Notifications and in
                system settings.
              </Text>
              <Button variant="secondary" onPress={handleDebugDailyShowUpNotification} style={styles.cardAction}>
                <ButtonLabel size="md">Fire daily show-up (dev)</ButtonLabel>
              </Button>
              <Button variant="secondary" onPress={handleDebugStreakNotification} style={styles.cardAction}>
                <ButtonLabel size="md">Fire streak nudge (dev)</ButtonLabel>
              </Button>
              <Button variant="secondary" onPress={handleDebugReactivationNotification} style={styles.cardAction}>
                <ButtonLabel size="md">Fire reactivation (dev)</ButtonLabel>
              </Button>
              <Text style={styles.meta}>
                Each button schedules a local notification to fire in ~2 seconds using the same
                deep-link routing as the real system.
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
    gap: spacing.sm,
  },
  tabSwitcher: {
    alignSelf: 'flex-start',
    marginTop: spacing.lg,
  },
  screenSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.canvas,
    borderRadius: 28,
    padding: spacing.xl,
    gap: spacing.sm,
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
    gap: spacing.sm,
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
  cardAction: {
    alignSelf: 'flex-start',
    marginTop: 0,
  },
  historyList: {
    marginTop: spacing.md,
    gap: spacing.sm,
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
    ...typography.bodySm,
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
    ...typography.bodySm,
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
  typeTokenRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  typeTokenName: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginRight: spacing.md,
    minWidth: 96,
  },
  typeTokenSample: {
    ...typography.bodySm,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 18,
    backgroundColor: colors.canvas,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  colorList: {
    gap: spacing.xs,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  colorLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  colorToken: {
    ...typography.bodySm,
    color: colors.muted,
    marginTop: spacing.xs / 4,
  },
  interstitialTabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  interstitialPreviewSurface: {
    borderRadius: 24,
    backgroundColor: colors.pine100,
    padding: spacing.lg,
  },
  interstitialContent: {
    flex: 1,
    flexDirection: 'column',
    rowGap: spacing['2xl'],
  },
  interstitialHeroBlock: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: spacing.lg,
  },
  interstitialFooterBlock: {
    marginTop: 'auto',
    rowGap: spacing.md,
  },
  interstitialTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  interstitialBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  interstitialAuthCard: {
    borderRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.canvas,
    rowGap: spacing.md,
  },
  streakHeroBlock: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: spacing.md,
  },
  streakLabel: {
    ...typography.bodySm,
    color: colors.canvas,
  },
  streakNumber: {
    ...typography.titleXl,
    fontSize: 56,
    lineHeight: 60,
    color: colors.canvas,
  },
  streakBody: {
    ...typography.bodySm,
    color: colors.canvas,
    textAlign: 'center',
    maxWidth: 280,
  },
  interstitialVariantTabs: {
    marginTop: spacing.sm,
  },
  interstitialControls: {
    marginTop: spacing.md,
  },
  interstitialLaunchButton: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
  },
  launchBrandLockup: {
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: spacing.sm,
  },
  launchWordmark: {
    ...typography.brand,
    color: colors.pine700,
    fontSize: 36,
    lineHeight: 42,
    textShadowColor: colors.pine800,
    textShadowOffset: { width: 0.4, height: 0.4 },
    textShadowRadius: 1,
  },
  launchTagline: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    maxWidth: 280,
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
  devExitRow: {
    position: 'absolute',
    right: 12,
    zIndex: 2,
  },
  devExitButton: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
    justifyContent: 'center',
    alignItems: 'center',
  },
});


