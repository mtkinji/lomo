import React from 'react';
import { View, Pressable } from 'react-native';
import { useAppStore, defaultForceLevels } from '../../store/useAppStore';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';
import { HapticsService } from '../../services/HapticsService';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { Dialog } from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { Text, KeyboardAwareScrollView } from '../../ui/primitives';
import { AgentModeHeader } from '../../ui/AgentModeHeader';
import { AgentWorkspace } from '../ai/AgentWorkspace';
import { ACTIVITY_CREATION_WORKFLOW_ID } from '../../domain/workflows';
import { buildActivityCoachLaunchContext } from '../ai/workspaceSnapshots';
import { ActivityDraftDetailFields, type ActivityDraft } from './ActivityDraftDetailFields';
import { suggestTagsFromText } from '../../utils/tags';
import { geocodePlaceBestEffort } from '../../services/locationOffers/geocodePlace';
import { openPaywallPurchaseEntry } from '../../services/paywall';
import { PaywallContent } from '../paywall/PaywallDrawer';
import {
  FREE_GENERATIVE_CREDITS_PER_MONTH,
  PRO_GENERATIVE_CREDITS_PER_MONTH,
  getMonthKey,
} from '../../domain/generativeCredits';
import { spacing } from '../../theme/spacing';
import { colors } from '../../theme/colors';
import { styles } from './activitiesScreenStyles';
import type { Activity, Arc, Goal } from '../../domain/types';

export type ActivityCoachDrawerProps = {
  visible: boolean;
  onClose: () => void;
  goals: Goal[];
  activities: Activity[];
  arcs: Arc[];
  addActivity: (activity: Activity) => void;
  showToast: (payload: { message: string; variant?: string; durationMs?: number }) => void;
  markActivityEnrichment: (activityId: string, isEnriching: boolean) => void;
  isActivityEnriching: (activityId: string) => boolean;
};

export function ActivityCoachDrawer({
  visible,
  onClose,
  goals,
  activities,
  arcs,
  addActivity,
  showToast,
  markActivityEnrichment,
  isActivityEnriching,
}: ActivityCoachDrawerProps) {
  const [activeTab, setActiveTab] = React.useState<'ai' | 'manual'>('ai');
  const { capture } = useAnalytics();
  const recordShowUp = useAppStore((state) => state.recordShowUp);
  const updateActivity = useAppStore((state) => state.updateActivity);
  const isPro = useEntitlementsStore((state) => state.isPro);
  const generativeCredits = useAppStore((state) => state.generativeCredits);
  const [isActivityAiInfoVisible, setIsActivityAiInfoVisible] = React.useState(false);

  const [manualDraft, setManualDraft] = React.useState<ActivityDraft>({
    title: '',
    type: 'task',
    notes: '',
    steps: [],
    tags: [],
    reminderAt: null,
    scheduledDate: null,
    repeatRule: undefined,
    estimateMinutes: null,
    difficulty: undefined,
  });

  const workspaceSnapshot = React.useMemo(
    () => buildActivityCoachLaunchContext(goals, activities, undefined, undefined, undefined, undefined),
    [goals, activities],
  );

  const launchContext = React.useMemo(
    () => ({
      source: 'activitiesList' as const,
      intent: 'activityCreation' as const,
    }),
    [],
  );

  const aiCreditsRemaining = React.useMemo(() => {
    const limit = isPro ? PRO_GENERATIVE_CREDITS_PER_MONTH : FREE_GENERATIVE_CREDITS_PER_MONTH;
    const currentKey = getMonthKey(new Date());
    const ledger =
      generativeCredits && generativeCredits.monthKey === currentKey
        ? generativeCredits
        : { monthKey: currentKey, usedThisMonth: 0 };
    const usedRaw = Number((ledger as any).usedThisMonth ?? 0);
    const used = Number.isFinite(usedRaw) ? Math.max(0, Math.floor(usedRaw)) : 0;
    return Math.max(0, limit - used);
  }, [generativeCredits, isPro]);

  const handleChangeMode = React.useCallback(
    (next: 'ai' | 'manual') => {
      // Allow switching into AI even when credits are exhausted; we show the paywall content inline.
      setActiveTab(next);
    },
    [],
  );

  React.useEffect(() => {
    if (!visible) {
      setActiveTab('ai');
      setIsActivityAiInfoVisible(false);
      setManualDraft({
        title: '',
        type: 'task',
        notes: '',
        steps: [],
        tags: [],
        reminderAt: null,
        scheduledDate: null,
        repeatRule: undefined,
        estimateMinutes: null,
        difficulty: undefined,
      });
    }
  }, [visible]);

  const handleConfirmManualActivity = React.useCallback(() => {
    const trimmedTitle = manualDraft.title.trim();
    if (!trimmedTitle) return;

    const timestamp = new Date().toISOString();
    const id = `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const tags = manualDraft.tags ?? [];
    const notes = (manualDraft.notes ?? '').trim();
    const steps = (manualDraft.steps ?? [])
      .map((s) => ({ title: (s.title ?? '').trim() }))
      .filter((s) => s.title.length > 0)
      .map((s, idx) => ({
        id: `step-${id}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        title: s.title,
        completedAt: null,
        isOptional: false,
        orderIndex: idx,
      }));

    const activity: Activity = {
      id,
      goalId: null,
      title: trimmedTitle,
      type: manualDraft.type ?? 'task',
      tags,
      notes: notes.length > 0 ? notes : undefined,
      steps,
      reminderAt: manualDraft.reminderAt ?? null,
      priority: undefined,
      estimateMinutes: manualDraft.estimateMinutes ?? null,
      creationSource: 'manual',
      planGroupId: null,
      scheduledDate: manualDraft.scheduledDate ?? null,
      repeatRule: manualDraft.repeatRule,
      orderIndex: (activities.length || 0) + 1,
      phase: null,
      status: 'planned',
      actualMinutes: null,
      startedAt: null,
      completedAt: null,
      forceActual: defaultForceLevels(0),
      difficulty: manualDraft.difficulty,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // Note: Creating activities no longer counts as "showing up" for streaks.
    // Streaks require completing activities/focus sessions.
    addActivity(activity);
    capture(AnalyticsEvent.ActivityCreated, {
      source: 'manual_drawer',
      activity_id: activity.id,
      goal_id: null,
    });
    showToast({ message: 'Activity created', variant: 'success', durationMs: 2200 });
    void HapticsService.trigger('outcome.success');
    onClose();
  }, [
    activities.length,
    addActivity,
    capture,
    manualDraft.difficulty,
    manualDraft.estimateMinutes,
    manualDraft.notes,
    manualDraft.reminderAt,
    manualDraft.repeatRule,
    manualDraft.scheduledDate,
    manualDraft.steps,
    manualDraft.tags,
    manualDraft.title,
    manualDraft.type,
    onClose,
    recordShowUp,
    showToast,
  ]);

  const handleSwitchToManual = React.useCallback(() => {
    setActiveTab('manual');
  }, []);

  const handleAiComplete = React.useCallback(
    (outcome: unknown) => {
      const adoptedTitles = Array.isArray((outcome as any)?.adoptedActivityTitles)
        ? (outcome as any).adoptedActivityTitles
        : [];

      if (!adoptedTitles || adoptedTitles.length === 0) {
        return;
      }

      const normalizeTitleKey = (value: string) =>
        value.trim().toLowerCase().replace(/\s+/g, ' ');

      const baseIndex = activities.length;
      let didAddAny = false;
      adoptedTitles.forEach((rawTitle: unknown, idx: number) => {
        if (typeof rawTitle !== 'string') return;
        const trimmedTitle = rawTitle.trim();
        if (!trimmedTitle) return;

        const titleKey = normalizeTitleKey(trimmedTitle);
        // Skip if an activity with this title already exists
        // (prevents duplicates when "accept all" triggers both onAdoptActivitySuggestion
        // and workflow completion)
        const alreadyExists = activities.some(
          (a) => normalizeTitleKey(a.title) === titleKey
        );
        if (alreadyExists) return;

        const timestamp = new Date().toISOString();
        const id = `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const activity: Activity = {
          id,
          goalId: null,
          title: trimmedTitle,
          type: 'task',
          tags: suggestTagsFromText(trimmedTitle),
          notes: undefined,
          steps: [],
          reminderAt: null,
          priority: undefined,
          estimateMinutes: null,
          creationSource: 'ai',
          planGroupId: null,
          scheduledDate: null,
          repeatRule: undefined,
          orderIndex: baseIndex + idx + 1,
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
        didAddAny = true;
        capture(AnalyticsEvent.ActivityCreated, {
          source: 'ai_workflow',
          activity_id: activity.id,
          goal_id: null,
        });
      });
      if (didAddAny) {
        void HapticsService.trigger('outcome.success');
      }
    },
    [activities, addActivity, capture],
  );

  const handleAdoptActivitySuggestion = React.useCallback(
    (suggestion: import('../ai/AiChatScreen').ActivitySuggestion) => {
      const timestamp = new Date().toISOString();
      const baseIndex = activities.length;
      const id = `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const steps =
        suggestion.steps?.map((step, index) => ({
          id: `step-${id}-${index}-${Math.random().toString(36).slice(2, 6)}`,
          title: step.title,
          isOptional: step.isOptional ?? false,
          completedAt: null,
          orderIndex: index,
        })) ?? [];

      const activity: Activity = {
        id,
        goalId: null,
        title: suggestion.title.trim(),
        type: suggestion.type ?? 'task',
        tags:
          Array.isArray(suggestion.tags) && suggestion.tags.length > 0
            ? suggestion.tags
            : suggestTagsFromText(suggestion.title, suggestion.why ?? null),
        notes: suggestion.why,
        steps,
        reminderAt: null,
        priority: undefined,
        estimateMinutes: suggestion.timeEstimateMinutes ?? null,
        creationSource: 'ai',
        planGroupId: null,
        scheduledDate: null,
        repeatRule: undefined,
        orderIndex: baseIndex + 1,
        phase: null,
        status: 'planned',
        actualMinutes: null,
        startedAt: null,
        completedAt: null,
        aiPlanning: suggestion.timeEstimateMinutes || suggestion.energyLevel
          ? {
              estimateMinutes: suggestion.timeEstimateMinutes ?? null,
              difficulty:
                suggestion.energyLevel === 'light'
                  ? 'easy'
                  : suggestion.energyLevel === 'focused'
                  ? 'hard'
                  : undefined,
              lastUpdatedAt: timestamp,
              source: 'full_context',
            }
          : undefined,
        forceActual: defaultForceLevels(0),
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      addActivity(activity);
      // Best-effort: if the model suggested a location offer, geocode and attach it asynchronously.
      // This keeps the "create" UX snappy and avoids blocking on network.
      const locOffer = suggestion.locationOffer;
      if (locOffer?.placeQuery && typeof locOffer.placeQuery === 'string') {
        const query = locOffer.placeQuery.trim();
        if (query.length > 0) {
          const trigger =
            locOffer.trigger === 'arrive' || locOffer.trigger === 'leave' ? locOffer.trigger : 'leave';
          const radiusM =
            typeof locOffer.radiusM === 'number' && Number.isFinite(locOffer.radiusM)
              ? locOffer.radiusM
              : undefined;
          void (async () => {
            const place = await geocodePlaceBestEffort({ query });
            if (!place) return;
            const nextAt = new Date().toISOString();
            updateActivity(id, (prev) => ({
              ...prev,
              location: {
                label:
                  typeof locOffer.label === 'string' && locOffer.label.trim().length > 0
                    ? locOffer.label.trim()
                    : place.label,
                latitude: place.latitude,
                longitude: place.longitude,
                trigger,
                ...(typeof radiusM === 'number' ? { radiusM } : null),
              },
              updatedAt: nextAt,
            }));
          })();
        }
      }
      void HapticsService.trigger('outcome.success');
      capture(AnalyticsEvent.ActivityCreated, {
        source: 'ai_suggestion',
        activity_id: activity.id,
        goal_id: null,
        has_steps: Boolean(activity.steps && activity.steps.length > 0),
        has_estimate: Boolean(activity.estimateMinutes),
      });
    },
    [activities.length, addActivity, capture, updateActivity],
  );

  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      snapPoints={['100%']}
      // AgentWorkspace/AiChatScreen implements its own keyboard strategy (padding + scroll-to-focus).
      // Avoid double offsets from BottomDrawer's default keyboard avoidance.
      keyboardAvoidanceEnabled={false}
    >
      <View style={styles.activityCoachContainer}>
        <AgentModeHeader
          activeMode={activeTab}
          onChangeMode={handleChangeMode}
          objectLabel="Activities"
          onPressInfo={() => setIsActivityAiInfoVisible(true)}
          infoAccessibilityLabel="Show context for Activities AI"
        />
        <Dialog
          visible={isActivityAiInfoVisible}
          onClose={() => setIsActivityAiInfoVisible(false)}
          title="Activities AI context"
          description="Activities AI proposes concrete activities using your existing goals and plans as context."
        >
          <Text style={styles.modalBody}>
            I'm using your existing goals and activities to keep suggestions realistic, aligned,
            and non-duplicative.
          </Text>
        </Dialog>
        {/* Keep both panes mounted so switching between AI and Manual preserves the AI thread state. */}
        <View
          style={[
            styles.activityCoachBody,
            activeTab !== 'ai' && { display: 'none' },
          ]}
        >
          {!isPro && aiCreditsRemaining <= 0 ? (
            <View style={styles.activityAiCreditsEmpty}>
              <PaywallContent
                reason="generative_quota_exceeded"
                source="activity_quick_add_ai"
                showHeader={false}
                onClose={() => setActiveTab('manual')}
                onUpgrade={() => {
                  onClose();
                  setTimeout(() => openPaywallPurchaseEntry(), 360);
                }}
              />
            </View>
          ) : (
            <AgentWorkspace
              mode="activityCreation"
              launchContext={launchContext}
              workspaceSnapshot={workspaceSnapshot}
              workflowDefinitionId={ACTIVITY_CREATION_WORKFLOW_ID}
              resumeDraft={false}
              hideBrandHeader
              hidePromptSuggestions
              hostBottomInsetAlreadyApplied
              onComplete={handleAiComplete}
              onTransportError={handleSwitchToManual}
              onAdoptActivitySuggestion={handleAdoptActivitySuggestion}
              onDismiss={onClose}
            />
          )}
        </View>

        <View style={[styles.activityCoachBody, activeTab !== 'manual' && { display: 'none' }]}>
          <KeyboardAwareScrollView
            style={styles.manualFormContainer}
            contentContainerStyle={{ paddingBottom: spacing['2xl'], gap: spacing.xs }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ width: '100%' }}>
              <ActivityDraftDetailFields
                draft={manualDraft}
                onChange={(updater) => setManualDraft((prev) => updater(prev))}
              />
              <Button
                style={{ marginTop: spacing.xs }}
                onPress={handleConfirmManualActivity}
                disabled={manualDraft.title.trim().length === 0}
              >
                <Text style={{ color: colors.canvas }}>Create activity</Text>
              </Button>
            </View>
          </KeyboardAwareScrollView>
        </View>
      </View>
    </BottomDrawer>
  );
}

type SheetOptionProps = {
  label: string;
  onPress: () => void;
};

export function SheetOption({ label, onPress }: SheetOptionProps) {
  return (
    <Pressable
      style={styles.sheetRow}
      onPress={() => {
        void HapticsService.trigger('canvas.selection');
        onPress();
      }}
    >
      <Text style={styles.sheetRowLabel}>{label}</Text>
    </Pressable>
  );
}

