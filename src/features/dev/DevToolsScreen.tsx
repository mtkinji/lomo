import { Alert, ScrollView, StyleSheet, View, Pressable, TextInput, Switch } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DrawerActions, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useDrawerStatus } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { CanvasScrollView } from '../../ui/layout/CanvasScrollView';
import { colors, spacing, typography, fonts } from '../../theme';
import { Button, IconButton } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { Card } from '../../ui/Card';
import { Icon } from '../../ui/Icon';
import { VStack, HStack, Text, Heading, Textarea, ButtonLabel, KeyboardAwareScrollView } from '../../ui/primitives';
import { Dialog } from '../../ui/Dialog';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { FullScreenInterstitial } from '../../ui/FullScreenInterstitial';
import { Logo } from '../../ui/Logo';
import { Toast, type ToastVariant } from '../../ui/Toast';
import type { RootDrawerParamList } from '../../navigation/RootNavigator';
import { useFirstTimeUxStore } from '../../store/useFirstTimeUxStore';
import { useAppStore, defaultForceLevels } from '../../store/useAppStore';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import { ensureArcBannerPrefill } from '../arcs/arcBannerPrefill';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { openPaywallInterstitial, openPaywallPurchaseEntry } from '../../services/paywall';
import {
  DEV_COACH_CHAT_HISTORY_STORAGE_KEY,
  clearAllCoachConversationMemory,
  clearCoachConversationMemoryByKey,
  type CoachChatTurn,
  type CoachConversationSummaryRecordV1,
  type DevCoachChatLogEntry,
  type DevCoachChatFeedback,
  listCoachConversationMemoryKeys,
  loadCoachConversationMemoryByKey,
} from '../../services/ai';
import { NotificationService } from '../../services/NotificationService';
import { ArcTestingLauncher } from './ArcTestingLauncher';
import type { Activity } from '../../domain/types';
import { AgentWorkspace } from '../ai/AgentWorkspace';
import { buildActivityCoachLaunchContext } from '../ai/workspaceSnapshots';
import type { LaunchContext } from '../../domain/workflows';

type InterstitialVariant = 'launch' | 'auth' | 'streak';
type DevToolsRoute = RouteProp<RootDrawerParamList, 'DevTools'>;

export function DevToolsScreen() {
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const route = useRoute<DevToolsRoute>();
  const drawerStatus = useDrawerStatus();
  const insets = useSafeAreaInsets();
  const menuOpen = drawerStatus === 'open';
  const isFlowActive = useFirstTimeUxStore((state) => state.isFlowActive);
  const triggerCount = useFirstTimeUxStore((state) => state.triggerCount);
  const lastTriggeredAt = useFirstTimeUxStore((state) => state.lastTriggeredAt);
  const arcs = useAppStore((state) => state.arcs);
  const addArc = useAppStore((state) => state.addArc);
  const addGoal = useAppStore((state) => state.addGoal);
  const activities = useAppStore((state) => state.activities);
  const addActivity = useAppStore((state) => state.addActivity);
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
  const setHasDismissedActivitiesListGuide = useAppStore(
    (state) => state.setHasDismissedActivitiesListGuide,
  );
  const setHasDismissedActivityDetailGuide = useAppStore(
    (state) => state.setHasDismissedActivityDetailGuide,
  );
  const setHasDismissedOnboardingActivitiesGuide = useAppStore(
    (state) => state.setHasDismissedOnboardingActivitiesGuide,
  );
  const setHasDismissedOnboardingPlanReadyGuide = useAppStore(
    (state) => state.setHasDismissedOnboardingPlanReadyGuide,
  );
  const setLastOnboardingGoalId = useAppStore((state) => state.setLastOnboardingGoalId);
  const setHasSeenFirstGoalCelebration = useAppStore(
    (state) => state.setHasSeenFirstGoalCelebration
  );
  const devBreadcrumbsEnabled = useAppStore((state) => state.devBreadcrumbsEnabled);
  const setDevBreadcrumbsEnabled = useAppStore((state) => state.setDevBreadcrumbsEnabled);
  const devObjectDetailHeaderV2Enabled = useAppStore((state) => state.devObjectDetailHeaderV2Enabled);
  const setDevObjectDetailHeaderV2Enabled = useAppStore((state) => state.setDevObjectDetailHeaderV2Enabled);
  const devActivityDetailJtbdRefreshEnabled = useAppStore(
    (state) => state.devActivityDetailJtbdRefreshEnabled,
  );
  const setDevActivityDetailJtbdRefreshEnabled = useAppStore(
    (state) => state.setDevActivityDetailJtbdRefreshEnabled,
  );
  const devResetGenerativeCredits = useAppStore((state) => state.devResetGenerativeCredits);
  const devSetGenerativeCreditsUsedThisMonth = useAppStore((state) => state.devSetGenerativeCreditsUsedThisMonth);
  const generativeCredits = useAppStore((state) => state.generativeCredits);
  const isPro = useEntitlementsStore((state) => state.isPro);
  const devOverrideIsPro = useEntitlementsStore((state) => state.devOverrideIsPro);
  const devSetIsPro = useEntitlementsStore((state) => state.devSetIsPro);
  const devClearProOverride = useEntitlementsStore((state) => state.devClearProOverride);

  const initialTab = route.params?.initialTab ?? 'tools';
  const [chatHistory, setChatHistory] = useState<DevCoachChatLogEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [feedbackSummary, setFeedbackSummary] = useState<string>('');
  const [viewMode, setViewMode] = useState<
    'tools' | 'gallery' | 'typeColor' | 'arcTesting' | 'memory' | 'e2e'
  >(initialTab);
  const [demoDialogVisible, setDemoDialogVisible] = useState(false);
  const [demoSheetVisible, setDemoSheetVisible] = useState(false);
  const [interactionTapCount, setInteractionTapCount] = useState(0);
  const [keyboardTapCount, setKeyboardTapCount] = useState(0);
  const [keyboardSubmitCount, setKeyboardSubmitCount] = useState(0);
  const [keyboardHarnessValues, setKeyboardHarnessValues] = useState<Record<string, string>>({
    field1: '',
    field2: '',
    field3: '',
    field4: '',
    field5: '',
    field6: '',
    field7: '',
    last: '',
  });
  const [keyboardSheetVisible, setKeyboardSheetVisible] = useState(false);
  const [keyboardSheetValue, setKeyboardSheetValue] = useState('');
  const [agentHarnessVisible, setAgentHarnessVisible] = useState(false);
  const [interstitialVariant, setInterstitialVariant] = useState<InterstitialVariant>('launch');
  const [isInterstitialFullScreenVisible, setIsInterstitialFullScreenVisible] = useState(false);
  const [memoryKeys, setMemoryKeys] = useState<string[]>([]);
  const [memoryRecords, setMemoryRecords] = useState<Record<string, CoachConversationSummaryRecordV1 | null>>(
    {}
  );
  const [memoryExpandedKey, setMemoryExpandedKey] = useState<string | null>(null);
  const [isLoadingMemory, setIsLoadingMemory] = useState(false);

  const [launchBody, setLaunchBody] = useState('Grow into the person you want to be.');
  const [authBody, setAuthBody] = useState(
    'Save your arcs and sync your progress across devices.'
  );

  const [devToastMessage, setDevToastMessage] = useState('');
  const [devToastVariant, setDevToastVariant] = useState<ToastVariant>('default');
  const showDevToast = useCallback((message: string, variant: ToastVariant = 'default') => {
    setDevToastVariant(variant);
    setDevToastMessage(message);
  }, []);
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

  const loadMemory = async () => {
    try {
      setIsLoadingMemory(true);
      const keys = await listCoachConversationMemoryKeys();
      setMemoryKeys(keys);
      const nextRecords: Record<string, CoachConversationSummaryRecordV1 | null> = {};
      await Promise.all(
        keys.map(async (key) => {
          nextRecords[key] = await loadCoachConversationMemoryByKey(key);
        })
      );
      setMemoryRecords(nextRecords);
    } finally {
      setIsLoadingMemory(false);
    }
  };

  useEffect(() => {
    if (route.params?.initialTab) {
      setViewMode(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

  const handleTriggerFirstTimeUx = () => {
    resetOnboardingAnswers();
    startFlow();
  };

  const ensureDevActivityId = () => {
    const existing = activities.length > 0 ? activities[activities.length - 1] : null;
    if (existing) return existing.id;

    const timestamp = new Date().toISOString();
    const id = `dev-activity-${Date.now()}`;
    const activity: Activity = {
      id,
      goalId: null,
      title: '🧪 Dev: Activity guide test',
      type: 'task',
      tags: [],
      notes: 'This Activity exists to test ActivityDetail coachmarks from DevTools.',
      steps: [],
      reminderAt: null,
      priority: undefined,
      estimateMinutes: null,
      creationSource: 'manual',
      planGroupId: null,
      scheduledDate: null,
      repeatRule: undefined,
      repeatCustom: undefined,
      orderIndex: (activities.length || 0) + 1,
      phase: null,
      status: 'planned',
      actualMinutes: null,
      startedAt: null,
      completedAt: null,
      forceActual: defaultForceLevels(0),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    addActivity(activity);
    return id;
  };

  const handleShowActivitiesListGuide = () => {
    setHasDismissedActivitiesListGuide(false);
    navigation.navigate('Activities', { screen: 'ActivitiesList' });
  };

  const handleShowActivityDetailGuide = () => {
    const activityId = ensureDevActivityId();
    setHasDismissedActivityDetailGuide(false);
    navigation.navigate('Activities', { screen: 'ActivityDetail', params: { activityId } });
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
    // celebration mirrors the real first-time flow.
    //
    // IMPORTANT: `lastOnboardingGoalId` can become stale if the user clears
    // goals (or restores a different store snapshot). Validate it exists in the
    // current store before navigating, otherwise fall back or create a dev goal.
    const activityCountByGoalId = activities.reduce<Record<string, number>>((acc, activity) => {
      const gid = activity.goalId;
      if (!gid) return acc;
      acc[gid] = (acc[gid] ?? 0) + 1;
      return acc;
    }, {});
    const isGoalEmpty = (goalId: string) => (activityCountByGoalId[goalId] ?? 0) === 0;

    const onboardingGoal =
      lastOnboardingGoalId ? goals.find((g) => g.id === lastOnboardingGoalId) : undefined;

    // Prefer an empty goal so this dev trigger reliably replays the
    // "celebration → goal details → add activities" onboarding handoff.
    let targetGoalId: string | null = onboardingGoal?.id ?? null;
    if (targetGoalId && !isGoalEmpty(targetGoalId)) {
      targetGoalId = null;
    }
    if (!targetGoalId) {
      const emptyGoal = [...goals].reverse().find((g) => isGoalEmpty(g.id));
      targetGoalId = emptyGoal?.id ?? null;
    }

    if (!targetGoalId) {
      // Nothing to show yet: create a safe dev goal so this button always works.
      const nowIso = new Date().toISOString();

      // Attach the goal to an existing Arc when possible so the Goal detail
      // screen has context, otherwise create a dev Arc.
      let targetArcId =
        lastOnboardingArcId && arcs.some((a) => a.id === lastOnboardingArcId)
          ? lastOnboardingArcId
          : arcs.length > 0
            ? arcs[arcs.length - 1].id
            : null;

      if (!targetArcId) {
        targetArcId = `dev-onboarding-arc-${Date.now()}`;
        const arc = {
          id: targetArcId,
          name: '🚀 Dev: First Arc',
          narrative:
            'This Arc exists to help test the onboarding Goal handoff UI without running the full flow.',
          status: 'active',
          startDate: nowIso,
          endDate: null,
          createdAt: nowIso,
          updatedAt: nowIso,
        } as const;
        addArc(arc);
        void ensureArcBannerPrefill(arc);
      }

      const goalId = `dev-onboarding-goal-${Date.now()}`;
      addGoal({
        id: goalId,
        arcId: targetArcId,
        title: '🎉 Dev: First Goal',
        description:
          'This goal exists to test the "Goal created" celebration overlay without running onboarding.',
        status: 'planned',
        startDate: nowIso,
        targetDate: undefined,
        forceIntent: {},
        metrics: [],
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      targetGoalId = goalId;
    }

    // Ensure the GoalDetail screen recognizes this goal as the onboarding
    // target and that the one-time flags do not suppress the overlay/guides.
    setLastOnboardingGoalId(targetGoalId);
    setHasSeenFirstGoalCelebration(false);
    setHasDismissedOnboardingActivitiesGuide(false);
    setHasDismissedOnboardingPlanReadyGuide(false);

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
  const isArcTesting = viewMode === 'arcTesting';
  const isMemory = viewMode === 'memory';
  const isE2E = viewMode === 'e2e';

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
      <CanvasScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
            <Button testID="e2e.openBottomDrawer" variant="accent" onPress={() => setDemoSheetVisible(true)}>
              <Text style={styles.primaryButtonLabel}>Open bottom sheet</Text>
            </Button>
            <Text style={styles.galleryHelperText}>
              On device, swipe down or tap the scrim to dismiss.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>E2E: touchability harness</Text>
            <Text style={styles.gallerySectionDescription}>
              Catches a regression where closing a bottom drawer leaves an invisible overlay that
              blocks taps on the underlying canvas.
            </Text>
            <Button
              testID="e2e.tapTarget"
              variant="outline"
              onPress={() => setInteractionTapCount((prev) => prev + 1)}
            >
              <Text style={styles.secondaryButtonLabel}>Tap target ({interactionTapCount})</Text>
            </Button>
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
            <Button
              testID="e2e.closeBottomDrawer"
              variant="accent"
              size="small"
              onPress={() => setDemoSheetVisible(false)}
            >
              <Text style={styles.primaryButtonLabel}>Close sheet</Text>
            </Button>
          </View>
        </BottomDrawer>
      </CanvasScrollView>
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
      <CanvasScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
      </CanvasScrollView>
    );
  };

  const renderE2EHarness = () => {
    const devActivityIdForAgent = ensureDevActivityId();
    const agentLaunchContext: LaunchContext = {
      source: 'devTools',
      intent: 'freeCoach',
      objectType: 'activity',
      objectId: devActivityIdForAgent,
    };
    const agentWorkspaceSnapshot = buildActivityCoachLaunchContext(
      goals,
      activities,
      undefined,
      arcs,
      devActivityIdForAgent,
    );

    return (
      <>
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={false}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stack}>
            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>E2E harness</Text>
              <Text style={styles.cardBody}>
                Deterministic surfaces for native regressions (keyboard avoidance, tap-through, and
                bottom drawers). Maestro should prefer these over “real data” flows when possible.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>Keyboard: long form</Text>
              <Text style={styles.cardBody}>
                Focus the last field, type, and confirm you can still tap actions while the keyboard
                is open.
              </Text>
              <VStack space="sm" style={{ marginTop: spacing.md }}>
                <Input
                  label="Field 1"
                  value={keyboardHarnessValues.field1}
                  onChangeText={(t) => setKeyboardHarnessValues((p) => ({ ...p, field1: t }))}
                  returnKeyType="next"
                />
                <Input
                  label="Field 2"
                  value={keyboardHarnessValues.field2}
                  onChangeText={(t) => setKeyboardHarnessValues((p) => ({ ...p, field2: t }))}
                  returnKeyType="next"
                />
                <Input
                  label="Field 3"
                  value={keyboardHarnessValues.field3}
                  onChangeText={(t) => setKeyboardHarnessValues((p) => ({ ...p, field3: t }))}
                  returnKeyType="next"
                />
                <Input
                  label="Field 4"
                  value={keyboardHarnessValues.field4}
                  onChangeText={(t) => setKeyboardHarnessValues((p) => ({ ...p, field4: t }))}
                  returnKeyType="next"
                />
                <Input
                  label="Field 5"
                  value={keyboardHarnessValues.field5}
                  onChangeText={(t) => setKeyboardHarnessValues((p) => ({ ...p, field5: t }))}
                  returnKeyType="next"
                />
                <Input
                  label="Field 6"
                  value={keyboardHarnessValues.field6}
                  onChangeText={(t) => setKeyboardHarnessValues((p) => ({ ...p, field6: t }))}
                  returnKeyType="next"
                />
                <Input
                  label="Field 7"
                  value={keyboardHarnessValues.field7}
                  onChangeText={(t) => setKeyboardHarnessValues((p) => ({ ...p, field7: t }))}
                  returnKeyType="next"
                />
                <Input
                  testID="e2e.keyboard.lastInput"
                  label="Last field"
                  value={keyboardHarnessValues.last}
                  onChangeText={(t) => setKeyboardHarnessValues((p) => ({ ...p, last: t }))}
                  returnKeyType="done"
                />
              </VStack>

              <HStack space="sm" style={{ marginTop: spacing.md }}>
                <Button
                  testID="e2e.keyboard.tapWhileOpen"
                  variant="outline"
                  onPress={() => setKeyboardTapCount((prev) => prev + 1)}
                >
                  <Text style={styles.secondaryButtonLabel}>Tap while open ({keyboardTapCount})</Text>
                </Button>
                <Button
                  testID="e2e.keyboard.submit"
                  variant="accent"
                  onPress={() => setKeyboardSubmitCount((prev) => prev + 1)}
                >
                  <Text style={styles.primaryButtonLabel}>Submit ({keyboardSubmitCount})</Text>
                </Button>
              </HStack>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>Keyboard: inside a bottom drawer</Text>
              <Text style={styles.cardBody}>
                Opens a bottom drawer with an input. Tests keyboard lifting inside modal overlays +
                “close → taps still work”.
              </Text>
              <HStack space="sm" style={{ marginTop: spacing.md }}>
                <Button
                  testID="e2e.keyboard.openSheet"
                  variant="accent"
                  onPress={() => setKeyboardSheetVisible(true)}
                >
                  <Text style={styles.primaryButtonLabel}>Open keyboard sheet</Text>
                </Button>
                <Button
                  testID="e2e.keyboard.reset"
                  variant="outline"
                  onPress={() => {
                    setKeyboardHarnessValues({
                      field1: '',
                      field2: '',
                      field3: '',
                      field4: '',
                      field5: '',
                      field6: '',
                      field7: '',
                      last: '',
                    });
                    setKeyboardSheetValue('');
                    setKeyboardTapCount(0);
                    setKeyboardSubmitCount(0);
                  }}
                >
                  <Text style={styles.secondaryButtonLabel}>Reset</Text>
                </Button>
              </HStack>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>Agent workspace: smoke</Text>
              <Text style={styles.cardBody}>
                Opens a real AgentWorkspace surface. For deterministic tests, validate interaction
                basics (composer focus + send button visibility) without relying on network replies.
              </Text>
              <HStack space="sm" style={{ marginTop: spacing.md }}>
                <Button
                  testID="e2e.agent.open"
                  variant="accent"
                  onPress={() => setAgentHarnessVisible(true)}
                >
                  <Text style={styles.primaryButtonLabel}>Open agent workspace</Text>
                </Button>
                <Button
                  testID="e2e.agent.close"
                  variant="outline"
                  onPress={() => setAgentHarnessVisible(false)}
                >
                  <Text style={styles.secondaryButtonLabel}>Close</Text>
                </Button>
              </HStack>
            </View>
          </View>
        </KeyboardAwareScrollView>

        <BottomDrawer
          visible={keyboardSheetVisible}
          onClose={() => setKeyboardSheetVisible(false)}
          snapPoints={['55%']}
        >
          <KeyboardAwareScrollView
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={false}
            contentContainerStyle={{ paddingBottom: spacing.lg }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ gap: spacing.md }}>
              <Heading variant="sm">Keyboard sheet</Heading>
              <Text style={styles.sheetBody}>
                Focus the field, type, then submit and close. After close, the underlying DevTools
                canvas should remain tappable.
              </Text>
              <Input
                testID="e2e.keyboard.sheetInput"
                label="Sheet input"
                value={keyboardSheetValue}
                onChangeText={setKeyboardSheetValue}
              />
              <HStack space="sm" style={{ justifyContent: 'flex-end' }}>
                <Button
                  testID="e2e.keyboard.closeSheet"
                  variant="outline"
                  size="small"
                  onPress={() => setKeyboardSheetVisible(false)}
                >
                  <Text style={styles.secondaryButtonLabel}>Close</Text>
                </Button>
                <Button
                  testID="e2e.keyboard.sheetSubmit"
                  variant="accent"
                  size="small"
                  onPress={() => setKeyboardSubmitCount((prev) => prev + 1)}
                >
                  <Text style={styles.primaryButtonLabel}>Submit</Text>
                </Button>
              </HStack>
            </View>
          </KeyboardAwareScrollView>
        </BottomDrawer>

        <BottomDrawer
          visible={agentHarnessVisible}
          onClose={() => setAgentHarnessVisible(false)}
          snapPoints={['92%']}
          // Agent chat manages its own keyboard math; avoid double offsets.
          keyboardAvoidanceEnabled={false}
        >
          <View style={{ gap: spacing.md }}>
            <HStack justifyContent="space-between" alignItems="center">
              <Heading variant="sm">Agent workspace</Heading>
              <Button
                testID="e2e.agent.sheetClose"
                variant="outline"
                size="small"
                onPress={() => setAgentHarnessVisible(false)}
              >
                <Text style={styles.secondaryButtonLabel}>Close</Text>
              </Button>
            </HStack>
            <AgentWorkspace
              mode={undefined}
              launchContext={agentLaunchContext}
              workspaceSnapshot={agentWorkspaceSnapshot}
              workflowDefinitionId={undefined}
              resumeDraft={false}
              // BottomDrawer pads by safe-area; AiChatPane should subtract it.
              hostBottomInsetAlreadyApplied
              hidePromptSuggestions={false}
              hideBrandHeader={false}
            />
          </View>
        </BottomDrawer>
      </>
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
            : isE2E
            ? 'Deterministic harness surfaces for end-to-end testing. Only visible in development builds.'
            : isTypeAndColor
            ? 'Inspect base typography and color tokens that underpin the shared UI system.'
            : 'Utilities for testing and development. Only visible in development builds.'}
        </Text>
        <SegmentedControl
          style={styles.tabSwitcher}
          value={viewMode}
          onChange={(next) => setViewMode(next)}
          testIDPrefix="devtools.tab"
          options={[
            { value: 'tools', label: 'Tools' },
            { value: 'memory', label: 'Memory' },
            { value: 'gallery', label: 'Components' },
            { value: 'typeColor', label: 'Type & Color' },
            { value: 'arcTesting', label: 'Arc Testing' },
            { value: 'e2e', label: 'E2E' },
          ]}
        />
      </PageHeader>
      {isArcTesting ? (
        <ArcTestingLauncher />
      ) : isE2E ? (
        renderE2EHarness()
      ) : isMemory ? (
        <CanvasScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stack}>
            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>Coach memory (device)</Text>
              <Text style={styles.cardBody}>
                These are the persisted “conversation memory summaries” used to keep the coach
                consistent over time without sending the full transcript every turn.
              </Text>
              <HStack space="sm" style={{ marginTop: spacing.md }}>
                <Button variant="accent" onPress={() => void loadMemory()}>
                  <Text style={styles.primaryButtonLabel}>
                    {isLoadingMemory ? 'Loading…' : 'Refresh'}
                  </Text>
                </Button>
                <Button
                  variant="outline"
                  onPress={() => {
                    Alert.alert(
                      'Clear all memory?',
                      'This removes all persisted coach memory summaries on this device.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Clear all',
                          style: 'destructive',
                          onPress: () => {
                            void clearAllCoachConversationMemory().then(loadMemory);
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Text style={styles.secondaryButtonLabel}>Clear all</Text>
                </Button>
              </HStack>
              <Text style={styles.meta}>
                {memoryKeys.length} {memoryKeys.length === 1 ? 'record' : 'records'}
              </Text>
            </View>

            {memoryKeys.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.cardBody}>
                  No memory summaries stored yet. Have a longer chat, then come back and refresh.
                </Text>
              </View>
            ) : (
              memoryKeys.map((key) => {
                const record = memoryRecords[key];
                const isExpanded = memoryExpandedKey === key;
                const preview = (record?.summary ?? '').trim();
                return (
                  <View key={key} style={styles.card}>
                    <HStack justifyContent="space-between" alignItems="center">
                      <Text style={styles.memoryKey} numberOfLines={2}>
                        {key.replace('kwilt-coach-summary:v1:', '')}
                      </Text>
                      <Button
                        variant="ghost"
                        size="small"
                        onPress={() => setMemoryExpandedKey(isExpanded ? null : key)}
                      >
                        <Text style={styles.memoryLinkText}>{isExpanded ? 'Hide' : 'View'}</Text>
                      </Button>
                    </HStack>

                    {record ? (
                      <>
                        <Text style={styles.meta}>
                          Updated {record.updatedAt} • summarized={record.summarizedEligibleCount}
                        </Text>
                        <Text style={styles.memoryPreview} numberOfLines={isExpanded ? 0 : 6}>
                          {preview.length > 0 ? preview : '(empty)'}
                        </Text>
                        {isExpanded && (
                          <HStack space="sm" style={{ marginTop: spacing.md }}>
                            <Button
                              variant="outline"
                              onPress={() => {
                                Alert.alert(
                                  'Clear memory?',
                                  'This removes this one memory summary.',
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                      text: 'Clear',
                                      style: 'destructive',
                                      onPress: () => {
                                        void clearCoachConversationMemoryByKey(key).then(loadMemory);
                                      },
                                    },
                                  ]
                                );
                              }}
                            >
                              <Text style={styles.secondaryButtonLabel}>Clear</Text>
                            </Button>
                          </HStack>
                        )}
                      </>
                    ) : (
                      <Text style={styles.cardBody}>Unable to load record.</Text>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </CanvasScrollView>
      ) : isGallery ? (
        <>
          {renderComponentGallery()}
          <FullScreenInterstitial
            visible={isInterstitialFullScreenVisible}
            onDismiss={() => setIsInterstitialFullScreenVisible(false)}
            progression={interstitialVariant === 'launch' ? 1500 : 'button'}
            transition={interstitialVariant === 'launch' ? 'launch' : 'fade'}
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
        <CanvasScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.stack}>
            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>First-time UX</Text>
              {/* <Heading style={styles.cardTitle}>Trigger onboarding flow</Heading> */}
              {/* <Text style={styles.cardBody}>
                Launches the first-time experience overlay immediately, even if it was already
                completed.
              </Text> */}
              <Button testID="e2e.seed.triggerFirstTimeUx" variant="accent" onPress={handleTriggerFirstTimeUx} style={styles.cardAction}>
                <ButtonLabel size="md" tone="inverse">
                  Trigger first-time UX
                </ButtonLabel>
              </Button>
              <Button testID="e2e.seed.showActivitiesListGuide" variant="secondary" onPress={handleShowActivitiesListGuide} style={styles.cardAction}>
                <ButtonLabel size="md">Show Activities list guide</ButtonLabel>
              </Button>
              <Button testID="e2e.seed.showActivityDetailGuide" variant="secondary" onPress={handleShowActivityDetailGuide} style={styles.cardAction}>
                <ButtonLabel size="md">Show Activity detail guide</ButtonLabel>
              </Button>
              {isFlowActive && (
                <Button variant="secondary" onPress={dismissFlow} style={styles.cardAction}>
                  <ButtonLabel size="md">Force dismiss</ButtonLabel>
                </Button>
              )}
              <Button testID="e2e.seed.showFirstArcCelebration" variant="secondary" onPress={handleShowFirstArcCelebration} style={styles.cardAction}>
                <ButtonLabel size="md">Show first-Arc celebration</ButtonLabel>
              </Button>
              <Button testID="e2e.seed.showFirstGoalCelebration" variant="secondary" onPress={handleShowFirstGoalCelebration} style={styles.cardAction}>
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
              <Text style={styles.cardEyebrow}>Monetization (dev)</Text>
              <Text style={styles.cardBody}>
                Force paywall moments, simulate Pro, and set AI credits so you can verify upgrade prompts + the credits toast quickly.
              </Text>
              <Text style={styles.meta}>
                Tier: {isPro ? 'Pro' : 'Free'}
                {devOverrideIsPro == null ? ' (real)' : ' (simulated)'} • Credits:{' '}
                {generativeCredits?.usedThisMonth ?? 0} used ({generativeCredits?.monthKey ?? 'unknown'})
              </Text>

              <SegmentedControl<'real' | 'free' | 'pro'>
                value={devOverrideIsPro == null ? 'real' : devOverrideIsPro ? 'pro' : 'free'}
                onChange={(next) => {
                  if (next === 'real') {
                    devClearProOverride();
                    return;
                  }
                  devSetIsPro(next === 'pro');
                }}
                size="compact"
                testIDPrefix="devtools.monetizationTier"
                options={[
                  { value: 'real', label: 'Real' },
                  { value: 'free', label: 'Free' },
                  { value: 'pro', label: 'Pro' },
                ]}
                style={{ marginTop: spacing.md }}
              />

              <HStack space="sm" style={{ marginTop: spacing.md, flexWrap: 'wrap' }}>
                <Button
                  variant="secondary"
                  onPress={() => openPaywallPurchaseEntry()}
                  style={styles.cardAction}
                >
                  <ButtonLabel size="md">Open Subscriptions screen</ButtonLabel>
                </Button>
              </HStack>

              <HStack space="sm" style={{ marginTop: spacing.md, flexWrap: 'wrap' }}>
                <Button
                  variant="secondary"
                  onPress={() =>
                    openPaywallInterstitial({ reason: 'limit_arcs_total', source: 'arcs_create' })
                  }
                  style={styles.cardAction}
                >
                  <ButtonLabel size="md">Paywall: Arc limit</ButtonLabel>
                </Button>
                <Button
                  variant="secondary"
                  onPress={() =>
                    openPaywallInterstitial({ reason: 'limit_goals_per_arc', source: 'goals_create_manual' })
                  }
                  style={styles.cardAction}
                >
                  <ButtonLabel size="md">Paywall: Goal limit</ButtonLabel>
                </Button>
                <Button
                  variant="secondary"
                  onPress={() =>
                    openPaywallInterstitial({ reason: 'generative_quota_exceeded', source: 'activity_tags_ai' })
                  }
                  style={styles.cardAction}
                >
                  <ButtonLabel size="md">Paywall: AI quota</ButtonLabel>
                </Button>
                <Button
                  variant="secondary"
                  onPress={() =>
                    openPaywallInterstitial({ reason: 'pro_only_unsplash_banners', source: 'arc_banner_sheet' })
                  }
                  style={styles.cardAction}
                >
                  <ButtonLabel size="md">Paywall: Image library</ButtonLabel>
                </Button>
              </HStack>

              <HStack space="sm" style={{ marginTop: spacing.md, flexWrap: 'wrap' }}>
                <Button variant="secondary" onPress={devResetGenerativeCredits} style={styles.cardAction}>
                  <ButtonLabel size="md">Reset AI credits</ButtonLabel>
                </Button>
                <Button
                  variant="secondary"
                  onPress={() => devSetGenerativeCreditsUsedThisMonth(20)}
                  style={styles.cardAction}
                >
                  <ButtonLabel size="md">Set credits to “warning” (5 left)</ButtonLabel>
                </Button>
                <Button
                  variant="secondary"
                  onPress={() => devSetGenerativeCreditsUsedThisMonth(25)}
                  style={styles.cardAction}
                >
                  <ButtonLabel size="md">Set credits to exhausted</ButtonLabel>
                </Button>
              </HStack>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>Toast (dev)</Text>
              <Text style={styles.cardBody}>
                Fire an in-app toast on demand to verify the UI and safe-area positioning.
              </Text>
              <HStack space="sm" style={{ marginTop: spacing.md, flexWrap: 'wrap' }}>
                <Button
                  variant="secondary"
                  onPress={() => showDevToast('This is a test toast.')}
                  style={styles.cardAction}
                >
                  <ButtonLabel size="md">Show toast</ButtonLabel>
                </Button>
                <Button
                  variant="secondary"
                  onPress={() => showDevToast('Saved successfully.', 'success')}
                  style={styles.cardAction}
                >
                  <ButtonLabel size="md">Success</ButtonLabel>
                </Button>
                <Button
                  variant="secondary"
                  onPress={() => showDevToast('Warning: you are nearing a limit.', 'warning')}
                  style={styles.cardAction}
                >
                  <ButtonLabel size="md">Warning</ButtonLabel>
                </Button>
              </HStack>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardEyebrow}>Navigation experiments</Text>
              </View>
              <Text style={styles.cardBody}>
                Toggle experimental navigation affordances in object detail headers (dev-only).
              </Text>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Breadcrumbs instead of green back button</Text>
                <Switch
                  value={devBreadcrumbsEnabled}
                  onValueChange={(next) => setDevBreadcrumbsEnabled(next)}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={colors.canvas}
                  ios_backgroundColor={colors.border}
                  accessibilityLabel="Toggle breadcrumbs navigation experiment"
                />
              </View>
              <Text style={styles.meta}>
                When enabled, Arc → Goal → Activity will render as a tappable breadcrumb path.
              </Text>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Object detail header v2 (share + simplified back)</Text>
                <Switch
                  value={devObjectDetailHeaderV2Enabled}
                  onValueChange={(next) => setDevObjectDetailHeaderV2Enabled(next)}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={colors.canvas}
                  ios_backgroundColor={colors.border}
                  accessibilityLabel="Toggle object detail header v2 experiment"
                />
              </View>
              <Text style={styles.meta}>
                When enabled, object detail headers use a chevron back button, move the object type to the left,
                and add a share affordance on the right.
              </Text>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Activity detail: JTBD refresh layout</Text>
                <Switch
                  value={devActivityDetailJtbdRefreshEnabled}
                  onValueChange={(next) => setDevActivityDetailJtbdRefreshEnabled(next)}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={colors.canvas}
                  ios_backgroundColor={colors.border}
                  accessibilityLabel="Toggle activity detail JTBD refresh layout"
                />
              </View>
              <Text style={styles.meta}>
                When enabled, Activity detail uses the narrative title + collapsible Plan/Details sections (dev-only override).
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
        </CanvasScrollView>
      )}
      <Toast
        visible={devToastMessage.length > 0}
        message={devToastMessage}
        variant={devToastVariant}
        bottomOffset={insets.bottom + spacing.lg}
        durationMs={3000}
        onDismiss={() => setDevToastMessage('')}
      />
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  switchLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
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
  memoryKey: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
    flex: 1,
    paddingRight: spacing.sm,
  },
  memoryLinkText: {
    ...typography.bodySm,
    color: colors.accent,
    fontFamily: fonts.semibold,
  },
  memoryPreview: {
    ...typography.bodySm,
    color: colors.textSecondary,
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


