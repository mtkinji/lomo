import { Alert, ScrollView, StyleSheet, View, Pressable, TextInput, Switch } from 'react-native';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { CanvasScrollView } from '../../ui/layout/CanvasScrollView';
import { colors, spacing, typography, fonts } from '../../theme';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { HStack, Text, ButtonLabel } from '../../ui/primitives';
import { SegmentedControl } from '../../ui/SegmentedControl';
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
  type CoachChatTurn,
  type DevCoachChatLogEntry,
  type DevCoachChatFeedback,
} from '../../services/ai';
import { resetOpenAiQuotaFlag } from '../../services/ai';
import { NotificationService } from '../../services/NotificationService';
import type { Activity } from '../../domain/types';
import { installScreenshotSeedPack, removeScreenshotSeedPack, SCREENSHOT_PACK_ARC_IDS } from './screenshotSeedPack';
import { queueCheckinDraftFromProgress } from '../../services/checkinNudgeDrafts';
import { makeDraftItem } from '../../services/checkinDrafts';
import { useCheckinDraftStore } from '../../store/useCheckinDraftStore';
import {
  useCelebrationStore,
  celebrateGoalCompleted,
  celebrateActivityCompleted,
  celebrateFirstActivity,
  celebrateWeeklyStreak,
  celebrateDailyStreak,
  celebrateAllActivitiesDone,
  celebrateStreakSaved,
} from '../../store/useCelebrationStore';

type DevToolSectionId = 'seed' | 'preview' | 'simulate' | 'experiments' | 'diagnostics';

export function DevToolsScreen() {
  if (!__DEV__) return null;

  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const insets = useSafeAreaInsets();
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
  const setActivityDetailPlanExpanded = useAppStore((state) => state.setActivityDetailPlanExpanded);
  const setActivityDetailDetailsExpanded = useAppStore((state) => state.setActivityDetailDetailsExpanded);
  const setHasDismissedOnboardingPlanReadyGuide = useAppStore(
    (state) => state.setHasDismissedOnboardingPlanReadyGuide,
  );
  const setLastOnboardingGoalId = useAppStore((state) => state.setLastOnboardingGoalId);
  const setHasSeenFirstGoalCelebration = useAppStore(
    (state) => state.setHasSeenFirstGoalCelebration
  );
  const setPendingGoalCelebrationId = useAppStore((state) => state.setPendingGoalCelebrationId);
  const setPendingPostGoalPlanGuideGoalId = useAppStore((state) => state.setPendingPostGoalPlanGuideGoalId);
  const devBreadcrumbsEnabled = useAppStore((state) => state.devBreadcrumbsEnabled);
  const setDevBreadcrumbsEnabled = useAppStore((state) => state.setDevBreadcrumbsEnabled);
  const devObjectDetailHeaderV2Enabled = useAppStore((state) => state.devObjectDetailHeaderV2Enabled);
  const setDevObjectDetailHeaderV2Enabled = useAppStore((state) => state.setDevObjectDetailHeaderV2Enabled);
  const devArcDetailDebugLoggingEnabled = useAppStore((state) => state.devArcDetailDebugLoggingEnabled);
  const setDevArcDetailDebugLoggingEnabled = useAppStore(
    (state) => state.setDevArcDetailDebugLoggingEnabled
  );
  const devNavDrawerMenuEnabled = useAppStore((state) => state.devNavDrawerMenuEnabled);
  const setDevNavDrawerMenuEnabled = useAppStore((state) => state.setDevNavDrawerMenuEnabled);
  const devResetGenerativeCredits = useAppStore((state) => state.devResetGenerativeCredits);
  const devSetGenerativeCreditsUsedThisMonth = useAppStore((state) => state.devSetGenerativeCreditsUsedThisMonth);
  const generativeCredits = useAppStore((state) => state.generativeCredits);
  const isPro = useEntitlementsStore((state) => state.isPro);
  const devOverrideIsPro = useEntitlementsStore((state) => state.devOverrideIsPro);
  const devSetIsPro = useEntitlementsStore((state) => state.devSetIsPro);
  const devClearProOverride = useEntitlementsStore((state) => state.devClearProOverride);

  const [chatHistory, setChatHistory] = useState<DevCoachChatLogEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [feedbackSummary, setFeedbackSummary] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<Record<DevToolSectionId, boolean>>({
    seed: true,
    preview: true,
    simulate: false,
    experiments: false,
    diagnostics: false,
  });

  const [devToastMessage, setDevToastMessage] = useState('');
  const [devToastVariant, setDevToastVariant] = useState<ToastVariant>('default');
  const showDevToast = useCallback((message: string, variant: ToastVariant = 'default') => {
    setDevToastVariant(variant);
    setDevToastMessage(message);
  }, []);
  const [screenshotSeeding, setScreenshotSeeding] = useState(false);
  const screenshotPackInstalled = useAppStore((state) =>
    SCREENSHOT_PACK_ARC_IDS.some((id) => state.arcs.some((a) => a.id === id))
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

  const ensureDevActivityId = () => {
    const existing = activities.length > 0 ? activities[activities.length - 1] : null;
    if (existing) return existing.id;

    const timestamp = new Date().toISOString();
    const id = `dev-activity-${Date.now()}`;
    const activity: Activity = {
      id,
      goalId: null,
      title: '🧪 Dev: To-do guide test',
      type: 'task',
      tags: [],
      notes: 'This To-do exists to test ActivityDetail coachmarks from DevTools.',
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

  const ensureDevCheckinTarget = ({ alwaysCreate = false }: { alwaysCreate?: boolean } = {}) => {
    if (!alwaysCreate) {
      const existing = [...activities].reverse().find((activity) => {
        if (!activity.goalId) return false;
        return goals.some((goal) => goal.id === activity.goalId);
      });
      if (existing?.goalId) {
        return { goalId: existing.goalId, activity: existing };
      }
    }

    const nowIso = new Date().toISOString();
    let targetArcId = arcs.length > 0 ? arcs[arcs.length - 1].id : null;
    if (!targetArcId) {
      targetArcId = `dev-checkin-arc-${Date.now()}`;
      const arc = {
        id: targetArcId,
        name: 'Dev: Check-in testing',
        narrative: 'Local dev Arc for testing check-in approval surfaces.',
        status: 'active',
        startDate: nowIso,
        endDate: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      } as const;
      addArc(arc);
      void ensureArcBannerPrefill(arc);
    }

    const goalId = `dev-checkin-goal-${Date.now()}`;
    addGoal({
      id: goalId,
      arcId: targetArcId,
      title: 'Dev: Shared check-in test',
      description: 'Local dev goal for testing check-in approval.',
      status: 'planned',
      startDate: nowIso,
      targetDate: undefined,
      forceIntent: {},
      metrics: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    const activity: Activity = {
      id: `dev-checkin-activity-${Date.now()}`,
      goalId,
      title: 'Draft the weekly update',
      type: 'task',
      tags: [],
      notes: '',
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
      status: 'done',
      actualMinutes: null,
      startedAt: null,
      completedAt: nowIso,
      forceActual: defaultForceLevels(0),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    addActivity(activity);

    return { goalId, activity };
  };

  const navigateToCheckinApproval = (goalId: string) => {
    navigation.navigate('MainTabs', {
      screen: 'MoreTab',
      params: {
        screen: 'MoreArcs',
        params: {
          screen: 'GoalDetail',
          params: {
            goalId,
            entryPoint: 'arcsStack',
            openCheckinApprovalSheet: true,
          },
        },
      },
    });
  };

  const handleTriggerRealCheckinNudge = () => {
    const target = ensureDevCheckinTarget();
    void (async () => {
      const result = await queueCheckinDraftFromProgress({
        goalId: target.goalId,
        trigger: 'activity_complete',
        source: 'dev_tools',
        sourceType: 'activity',
        sourceId: target.activity.id,
        title: target.activity.title,
        completedAt: target.activity.completedAt ?? new Date().toISOString(),
        openPromptDelayMs: 350,
      });

      if (result.status === 'skipped') {
        const reason =
          result.eligibilityReason === 'no_partners'
            ? 'No active partners on this goal.'
            : result.eligibilityReason === 'signed_out'
              ? 'Sign in first.'
              : result.eligibilityReason === 'not_a_member'
                ? 'Current user is not an active member of this goal.'
                : result.reason === 'missing_title'
                  ? 'The test to-do needs a title.'
                  : 'Unable to confirm check-in audience.';
        showDevToast(`Check-in nudge skipped: ${reason}`, 'warning');
        return;
      }

      if (result.status === 'created' && !result.promptOpened) {
        showDevToast('Draft created, but the real nudge gate suppressed the prompt.', 'warning');
        return;
      }

      showDevToast('Opening real check-in approval flow.', 'success');
    })();
  };

  const handleOpenLocalCheckinSheetDemo = () => {
    const nowIso = new Date().toISOString();
    const target = ensureDevCheckinTarget({ alwaysCreate: true });
    useCheckinDraftStore.getState().ensureDraft({
      goalId: target.goalId,
      partnerCircleKey: 'dev-current-user|dev-partner',
      initialItem: makeDraftItem(
        {
          sourceType: 'activity',
          sourceId: `dev-local-checkin-${Date.now()}`,
          title: target.activity.title || 'Draft the weekly update',
          completedAt: nowIso,
        },
        new Date(nowIso),
      ),
    });
    navigateToCheckinApproval(target.goalId);
  };

  const handleShowActivitiesListGuide = () => {
    setHasDismissedActivitiesListGuide(false);
    navigation.navigate('MainTabs', {
      screen: 'ActivitiesTab',
      params: { screen: 'ActivitiesList' },
    });
  };

  const handleShowActivityDetailGuide = () => {
    const activityId = ensureDevActivityId();
    setHasDismissedActivityDetailGuide(false);
    // Make the guide + e2e seed deterministic: open both collapsible sections so
    // key fields are visible without extra taps.
    setActivityDetailPlanExpanded(true);
    setActivityDetailDetailsExpanded(true);
    navigation.navigate('MainTabs', {
      screen: 'ActivitiesTab',
      params: { screen: 'ActivityDetail', params: { activityId } },
    });
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

  const handleNavigateBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('Settings', { screen: 'SettingsHome' });
  }, [navigation]);

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

    navigation.navigate('MainTabs', {
      screen: 'MoreTab',
      params: {
        screen: 'MoreArcs',
        params: { screen: 'ArcDetail', params: { arcId: targetArcId, openGoalCreation: false } },
      },
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
    setPendingGoalCelebrationId(targetGoalId);
    setPendingPostGoalPlanGuideGoalId(targetGoalId);
    setHasDismissedOnboardingPlanReadyGuide(false);

    navigation.navigate('MainTabs', {
      screen: 'MoreTab',
      params: {
        screen: 'MoreArcs',
        params: { screen: 'GoalDetail', params: { goalId: targetGoalId, entryPoint: 'arcsStack' } },
      },
    });
  };

  const handleShowOnboardingPlanReadyHandoff = () => {
    const nowIso = new Date().toISOString();

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
          'This Arc exists to help test the onboarding plan-ready handoff without running the full flow.',
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
      title: '🎯 Dev: Plan-ready Goal',
      description: 'Goal with seeded to-dos for testing the plan-ready → to-do detail handoff.',
      status: 'planned',
      startDate: nowIso,
      targetDate: undefined,
      forceIntent: {},
      metrics: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    const activityIds: string[] = [];
    for (let i = 0; i < 2; i++) {
      const actId = `dev-plan-ready-activity-${Date.now()}-${i}`;
      const activity: Activity = {
        id: actId,
        goalId,
        title: i === 0 ? '🧪 Dev: First plan to-do' : '🧪 Dev: Second plan to-do',
        type: 'task',
        tags: [],
        notes: '',
        steps: [],
        reminderAt: null,
        priority: undefined,
        estimateMinutes: null,
        creationSource: 'manual',
        planGroupId: null,
        scheduledDate: null,
        repeatRule: undefined,
        repeatCustom: undefined,
        orderIndex: (activities.length || 0) + i + 1,
        phase: null,
        status: 'planned',
        actualMinutes: null,
        startedAt: null,
        completedAt: null,
        forceActual: defaultForceLevels(0),
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      addActivity(activity);
      activityIds.push(actId);
    }

    setLastOnboardingGoalId(goalId);
    setHasSeenFirstGoalCelebration(true);
    setPendingGoalCelebrationId(null);
    setPendingPostGoalPlanGuideGoalId(null);
    setHasDismissedOnboardingPlanReadyGuide(false);

    navigation.navigate('MainTabs', {
      screen: 'MoreTab',
      params: {
        screen: 'MoreArcs',
        params: { screen: 'GoalDetail', params: { goalId, entryPoint: 'arcsStack' } },
      },
    });
  };

  const lastTriggeredLabel = lastTriggeredAt
    ? new Date(lastTriggeredAt).toLocaleString()
    : 'Never';

  const handleClearChatHistory = async () => {
    Alert.alert(
      'Clear chat history?',
      'This will remove all locally stored Kwilt Coach dev history.',
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

  const toggleSection = useCallback((sectionId: DevToolSectionId) => {
    setExpandedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  }, []);

  return (
    <AppShell>
      <PageHeader title="Dev tools" onPressBack={handleNavigateBack}>
        <Text style={[styles.screenSubtitle, { paddingTop: spacing.sm }]}>
          Utilities for testing and development. Only visible in development builds.
        </Text>
      </PageHeader>
      <CanvasScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.stack}>
            {devOverrideIsPro != null ? (
              <View style={styles.devOverrideBanner}>
                <HStack space="sm" style={styles.devOverrideBannerHeader}>
                  <Icon name="warning" size={20} color={colors.warning} />
                  <Text style={styles.devOverrideBannerTitle}>
                    Simulated tier: {devOverrideIsPro ? 'Pro' : 'Free'}
                  </Text>
                </HStack>
                <Text style={styles.devOverrideBannerBody}>
                  Your real server entitlement is being overridden in this dev build.
                  Every entitlement refresh will reassert this value, so Restore Purchases and
                  sign-out/in will not change the tier until you clear the override.
                </Text>
                <Button
                  variant="accent"
                  onPress={() => devClearProOverride()}
                  style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}
                >
                  <ButtonLabel size="md">Clear override (use real tier)</ButtonLabel>
                </Button>
              </View>
            ) : null}
          <DevToolSection
            title="Seed & reset"
            description="Install demo data and replay onboarding handoffs."
            count={8}
            expanded={expandedSections.seed}
            onToggle={() => toggleSection('seed')}
          >
            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>Screenshot demo pack (dev)</Text>
              <Text style={styles.cardBody}>
                Installs a deterministic set of realistic Arcs/Goals/To-dos locally (no backend writes) so you can
                screenshot real screens instantly.
              </Text>
              <HStack space="sm" style={{ marginTop: spacing.md, flexWrap: 'wrap' }}>
                <Button
                  variant={screenshotPackInstalled ? 'secondary' : 'accent'}
                  onPress={() => {
                    if (screenshotSeeding) return;
                    void (async () => {
                      try {
                        setScreenshotSeeding(true);
                        const result = await installScreenshotSeedPack(new Date());
                        if (result.status === 'installed') {
                          showDevToast(
                            `Installed screenshot pack (${result.added.arcs} arcs, ${result.added.goals} goals, ${result.added.activities} activities).`,
                            'success'
                          );
                          return;
                        }
                        if (result.status === 'already_installed') {
                          showDevToast('Screenshot pack already installed.', 'warning');
                          return;
                        }
                        if (result.status === 'ai_unavailable') {
                          showDevToast(
                            `Installed fallback pack (AI unavailable).`,
                            'warning'
                          );
                          return;
                        }
                        showDevToast('Screenshot pack is only available in dev builds.', 'warning');
                      } finally {
                        setScreenshotSeeding(false);
                      }
                    })();
                  }}
                  disabled={screenshotSeeding}
                  style={styles.cardAction}
                >
                  <ButtonLabel size="md" tone={screenshotPackInstalled ? undefined : 'inverse'}>
                    {screenshotSeeding
                      ? 'Generating…'
                      : screenshotPackInstalled
                        ? 'Reinstall (idempotent)'
                        : 'Install Screenshot Pack'}
                  </ButtonLabel>
                </Button>
                <Button
                  variant="outline"
                  onPress={() => {
                    if (!screenshotPackInstalled) {
                      showDevToast('Screenshot pack is not installed.', 'warning');
                      return;
                    }
                    const result = removeScreenshotSeedPack();
                    if (result.status === 'removed') {
                      showDevToast(`Removed screenshot pack (${result.removed.arcs} arcs).`, 'success');
                      return;
                    }
                    if (result.status === 'not_installed') {
                      showDevToast('Screenshot pack is not installed.', 'warning');
                      return;
                    }
                    showDevToast('Screenshot pack is only available in dev builds.', 'warning');
                  }}
                  style={styles.cardAction}
                >
                  <ButtonLabel size="md">Remove Screenshot Pack</ButtonLabel>
                </Button>
              </HStack>
              <Text style={styles.meta}>
                Status: {screenshotPackInstalled ? 'Installed' : 'Not installed'}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>First-time UX</Text>
              <Button testID="e2e.seed.triggerFirstTimeUx" variant="accent" onPress={handleTriggerFirstTimeUx} style={styles.cardAction}>
                <ButtonLabel size="md" tone="inverse">
                  Trigger first-time UX
                </ButtonLabel>
              </Button>
              <Button testID="e2e.seed.showActivitiesListGuide" variant="secondary" onPress={handleShowActivitiesListGuide} style={styles.cardAction}>
                <ButtonLabel size="md">Show To-dos list guide</ButtonLabel>
              </Button>
              <Button testID="e2e.seed.showActivityDetailGuide" variant="secondary" onPress={handleShowActivityDetailGuide} style={styles.cardAction}>
                <ButtonLabel size="md">Show To-do detail guide</ButtonLabel>
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
              <Button testID="e2e.seed.showOnboardingPlanReadyHandoff" variant="secondary" onPress={handleShowOnboardingPlanReadyHandoff} style={styles.cardAction}>
                <ButtonLabel size="md">Show plan-ready → to-do handoff</ButtonLabel>
              </Button>
              <Text style={styles.meta}>
                Triggered {triggerCount} {triggerCount === 1 ? 'time' : 'times'} • Last:{' '}
                {lastTriggeredLabel}
              </Text>
            </View>
          </DevToolSection>

          <DevToolSection
            title="Preview flows"
            description="Fire user-facing moments without walking the full app path."
            count={21}
            expanded={expandedSections.preview}
            onToggle={() => toggleSection('preview')}
          >
            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>Check-in nudges (dev)</Text>
              <Text style={styles.cardBody}>
                Preview the check-in invitation sheet after a completed to-do. Uses a fictional partner
                when you do not have a backend shared goal ready.
              </Text>
              <Button
                testID="devtools.checkin.openLocalSheet"
                variant="accent"
                onPress={handleOpenLocalCheckinSheetDemo}
                style={styles.cardAction}
              >
                <ButtonLabel size="md" tone="inverse">Trigger check-in invitation</ButtonLabel>
              </Button>
              <Button
                testID="devtools.checkin.triggerRealNudge"
                variant="secondary"
                onPress={handleTriggerRealCheckinNudge}
                style={styles.cardAction}
              >
                <ButtonLabel size="md">Test real partner gate</ButtonLabel>
              </Button>
              <Text style={styles.meta}>
                Invitation preview is for visual QA. Real partner gate requires an active backend partner.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>Celebration Interstitials</Text>
              <Text style={styles.cardBody}>
                Full-screen GIPHY-powered celebration moments that appear at key milestones (goal completion, to-do completion, streaks).
              </Text>
              <Button variant="secondary" onPress={() => celebrateGoalCompleted('Test Goal')} style={styles.cardAction}>
                <ButtonLabel size="md">Goal Completed 🏆</ButtonLabel>
              </Button>
              <Button variant="secondary" onPress={() => celebrateActivityCompleted('Test To-do')} style={styles.cardAction}>
                <ButtonLabel size="md">To-do Completed ✨</ButtonLabel>
              </Button>
              <Button variant="secondary" onPress={() => celebrateFirstActivity()} style={styles.cardAction}>
                <ButtonLabel size="md">First To-do 🎯</ButtonLabel>
              </Button>
              <Button variant="secondary" onPress={() => celebrateWeeklyStreak(3)} style={styles.cardAction}>
                <ButtonLabel size="md">Weekly Streak 🔥</ButtonLabel>
              </Button>
              <Button variant="secondary" onPress={() => celebrateDailyStreak(1)} style={styles.cardAction}>
                <ButtonLabel size="md">Day 1 (quick) ✨</ButtonLabel>
              </Button>
              <Button variant="secondary" onPress={() => celebrateDailyStreak(2)} style={styles.cardAction}>
                <ButtonLabel size="md">Day 2 (quick) 💫</ButtonLabel>
              </Button>
              <Button variant="secondary" onPress={() => celebrateDailyStreak(3)} style={styles.cardAction}>
                <ButtonLabel size="md">Day 3 (milestone) 🌱</ButtonLabel>
              </Button>
              <Button variant="secondary" onPress={() => celebrateDailyStreak(7)} style={styles.cardAction}>
                <ButtonLabel size="md">Day 7 (milestone) 🔥</ButtonLabel>
              </Button>
              <Button variant="secondary" onPress={() => celebrateDailyStreak(30)} style={styles.cardAction}>
                <ButtonLabel size="md">Day 30 (milestone) 🏆</ButtonLabel>
              </Button>
              <Button variant="secondary" onPress={() => celebrateDailyStreak(365)} style={styles.cardAction}>
                <ButtonLabel size="md">1-Year (milestone) 🎉</ButtonLabel>
              </Button>
              <Button variant="secondary" onPress={() => celebrateAllActivitiesDone()} style={styles.cardAction}>
                <ButtonLabel size="md">All Clear 🎉</ButtonLabel>
              </Button>
              <Button variant="secondary" onPress={() => celebrateStreakSaved(15, 1, 0, 1)} style={styles.cardAction}>
                <ButtonLabel size="md">Streak Saved 🛡️</ButtonLabel>
              </Button>
              <Button
                variant="outline"
                onPress={() => useCelebrationStore.getState().resetShownIds()}
                style={styles.cardAction}
              >
                <ButtonLabel size="md">Reset Shown IDs</ButtonLabel>
              </Button>
              <Text style={styles.meta}>
                Celebrations use GIPHY for animated GIFs. Some are auto-dismiss, others require a tap.
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
          </DevToolSection>

          <DevToolSection
            title="Simulate state"
            description="Override tier, paywalls, and AI credit states."
            count={9}
            expanded={expandedSections.simulate}
            onToggle={() => toggleSection('simulate')}
          >
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
                <Button
                  variant="secondary"
                  onPress={() => {
                    devResetGenerativeCredits();
                    resetOpenAiQuotaFlag();
                  }}
                  style={styles.cardAction}
                >
                  <ButtonLabel size="md">Reset AI credits</ButtonLabel>
                </Button>
                <Button
                  variant="secondary"
                  onPress={() => devSetGenerativeCreditsUsedThisMonth(45)}
                  style={styles.cardAction}
                >
                  <ButtonLabel size="md">Set credits to “warning” (5 left)</ButtonLabel>
                </Button>
                <Button
                  variant="secondary"
                  onPress={() => devSetGenerativeCreditsUsedThisMonth(50)}
                  style={styles.cardAction}
                >
                  <ButtonLabel size="md">Set credits to exhausted</ButtonLabel>
                </Button>
              </HStack>
            </View>
          </DevToolSection>

          <DevToolSection
            title="Experiments"
            description="Toggle dev-only navigation and object-detail flags."
            count={4}
            expanded={expandedSections.experiments}
            onToggle={() => toggleSection('experiments')}
          >
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
                When enabled, Arc → Goal → To-do will render as a tappable breadcrumb path.
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
                <Text style={styles.switchLabel}>Arc detail debug logs</Text>
                <Switch
                  value={devArcDetailDebugLoggingEnabled}
                  onValueChange={(next) => setDevArcDetailDebugLoggingEnabled(next)}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={colors.canvas}
                  ios_backgroundColor={colors.border}
                  accessibilityLabel="Toggle Arc detail debug logs"
                />
              </View>
              <Text style={styles.meta}>
                When enabled, Arc detail screens will emit verbose debug logs (e.g. onboarding handoff state) to the console.
              </Text>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Show left-rail menu button (hamburger) in primary headers</Text>
                <Switch
                  value={devNavDrawerMenuEnabled}
                  onValueChange={(next) => setDevNavDrawerMenuEnabled(next)}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={colors.canvas}
                  ios_backgroundColor={colors.border}
                  accessibilityLabel="Toggle left-rail menu button in headers"
                />
              </View>
              <Text style={styles.meta}>
                When enabled, top-level canvases (Goals/To-dos/Plan/More/Arcs) show a menu button that opens the navigation drawer.
              </Text>

            </View>
          </DevToolSection>

          <DevToolSection
            title="Diagnostics"
            description="Inspect local agent history and workflow feedback."
            count={1}
            expanded={expandedSections.diagnostics}
            onToggle={() => toggleSection('diagnostics')}
          >
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
                Inspect recent Kwilt Coach conversations captured from this device. History is
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
          </DevToolSection>
        </View>
      </CanvasScrollView>
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

function DevToolSection({
  title,
  description,
  count,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  description: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={({ pressed }) => [styles.sectionHeader, pressed && styles.sectionHeaderPressed]}
      >
        <View style={styles.sectionTitleBlock}>
          <HStack space="sm" alignItems="center">
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.sectionCountPill}>
              <Text style={styles.sectionCountText}>{count}</Text>
            </View>
          </HStack>
          <Text style={styles.sectionDescription}>{description}</Text>
        </View>
        <Icon
          name={expanded ? 'chevronUp' : 'chevronDown'}
          size={22}
          color={colors.textSecondary}
        />
      </Pressable>
      {expanded ? <View style={styles.sectionContent}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  stack: {
    gap: spacing.sm,
  },
  screenSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  section: {
    borderRadius: 22,
    backgroundColor: colors.shellAlt,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  sectionHeader: {
    minHeight: 84,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionHeaderPressed: {
    opacity: 0.72,
  },
  sectionTitleBlock: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  sectionTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  sectionDescription: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  sectionCountPill: {
    minWidth: 28,
    height: 24,
    borderRadius: 999,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  sectionCountText: {
    ...typography.bodySm,
    color: colors.muted,
    fontFamily: fonts.semibold,
  },
  sectionContent: {
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.canvas,
    borderRadius: 18,
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  devOverrideBanner: {
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.warning,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  devOverrideBannerHeader: {
    alignItems: 'center',
  },
  devOverrideBannerTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  devOverrideBannerBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
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
});
