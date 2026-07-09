import React, { useCallback, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { cardSurfaceStyle, colors, spacing, typography } from '../../theme';
import { HStack, Heading, Text, VStack } from '../../ui/primitives';
import { Button, IconButton } from '../../ui/Button';
import { GoalPill } from '../../ui/GoalPill';
import { formatTimeRange } from '../../services/plan/planDates';
import { useAppStore } from '../../store/useAppStore';
import { KeyActionsRow } from '../../ui/KeyActionsRow';
import { Icon } from '../../ui/Icon';
import { Badge } from '../../ui/Badge';
import { BottomDrawerScrollView } from '../../ui/BottomDrawer';
import { BottomDrawerHeader, BottomDrawerHeaderClose } from '../../ui/layout/BottomDrawerHeader';
import { ActivityPeekNotes, ActivityPeekSteps, ActivityPeekTags } from '../activities/ActivityPeekFields';
import { deriveStatusFromSteps } from '../activities/activityStepStatus';
import { HapticsService } from '../../services/HapticsService';
import { playActivityDoneSound } from '../../services/uiSounds';
import { AnalyticsEvent } from '../../services/analytics/events';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { recordShowUpWithCelebration } from '../../store/useCelebrationStore';
import { reconcileScreenTimeRestrictions } from '../../services/screenTimeProtectionRuntime';
import {
  applyPlanActivityCompletionAction,
  getPlanActivityCompletionAction,
} from './planActivityCompletion';

export type ActivityEventPeekModel = {
  activityId: string;
  start: Date;
  end: Date;
  conflict?: boolean;
  onOpenFocus: (activityId: string) => void;
  onOpenFullActivity: (activityId: string) => void;
  onMoveCommitment: (activityId: string, newStart: Date) => void;
  onUnscheduleCommitment: (activityId: string) => void;
  onRequestClose: () => void;
};

export function ActivityEventPeek({
  activityId,
  start,
  end,
  conflict,
  onOpenFocus,
  onOpenFullActivity,
  onMoveCommitment,
  onUnscheduleCommitment,
  onRequestClose,
}: ActivityEventPeekModel) {
  const activity = useAppStore((s) => s.activities.find((a) => a.id === activityId) ?? null);
  const goalTitle = useAppStore((s) => {
    const a = s.activities.find((x) => x.id === activityId) ?? null;
    const goalId = a?.goalId ?? null;
    return goalId ? s.goals.find((g) => g.id === goalId)?.title ?? null : null;
  });
  const updateActivity = useAppStore((s) => s.updateActivity);
  const activities = useAppStore((s) => s.activities);
  const recordScreenTimeQualifyingAction = useAppStore((s) => s.recordScreenTimeQualifyingAction);
  const { capture } = useAnalytics();

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pendingMoveDate, setPendingMoveDate] = useState<Date | null>(null);

  const timeText = useMemo(() => formatTimeRange(start, end), [start, end]);
  const completionAction = useMemo(
    () => (activity ? getPlanActivityCompletionAction(activity) : null),
    [activity],
  );

  const linkedActivityById = useMemo(() => {
    const byId: Record<string, (typeof activities)[number] | null> = {};
    // Only index what's needed (steps-linked activities) for this peek.
    const ids = new Set<string>();
    const steps = activity?.steps ?? [];
    steps.forEach((s: any) => {
      const id = s?.linkedActivityId;
      if (typeof id === 'string' && id) ids.add(id);
    });
    if (ids.size === 0) return byId;
    activities.forEach((a) => {
      if (ids.has(a.id)) byId[a.id] = a;
    });
    return byId;
  }, [activity?.steps, activities]);

  const handleMovePress = () => {
    // Toggle behavior: if the move picker is already open, tapping Move again closes it.
    if (pickerVisible) {
      setPickerVisible(false);
      setPendingMoveDate(null);
      return;
    }
    setPendingMoveDate(new Date(start));
    setPickerVisible(true);
  };

  const handleMoveChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (!date) return;
    if (!pendingMoveDate) return;
    const next = new Date(pendingMoveDate);
    next.setHours(date.getHours(), date.getMinutes(), 0, 0);
    setPendingMoveDate(next);

    // Android picker is a modal; apply immediately and close.
    if (Platform.OS !== 'ios') {
      setPickerVisible(false);
      onMoveCommitment(activityId, next);
    }
  };

  const handleMoveCancel = () => {
    setPickerVisible(false);
    setPendingMoveDate(null);
  };

  const handleMoveDone = () => {
    if (pendingMoveDate) {
      onMoveCommitment(activityId, pendingMoveDate);
    }
    setPickerVisible(false);
  };

  const handleToggleStepComplete = useCallback(
    (stepId: string) => {
      const timestamp = new Date().toISOString();
      updateActivity(activityId, (prev) => {
        const currentSteps = prev.steps ?? [];
        const existing: any = currentSteps.find((s: any) => s.id === stepId) ?? null;
        if (!existing) return prev;
        if (existing?.linkedActivityId) return prev;

        const nextSteps = currentSteps.map((s: any) =>
          s.id === stepId ? { ...s, completedAt: s.completedAt ? null : timestamp } : s,
        );
        const { nextStatus, nextCompletedAt } = deriveStatusFromSteps({
          prevStatus: prev.status,
          prevSteps: currentSteps as any,
          nextSteps: nextSteps as any,
          timestamp,
          prevCompletedAt: prev.completedAt,
        });

        return {
          ...prev,
          steps: nextSteps as any,
          status: nextStatus,
          completedAt: nextCompletedAt,
          updatedAt: timestamp,
        };
      });
    },
    [activityId, updateActivity],
  );

  const handlePlanCompletePress = useCallback(() => {
    if (!activity) return;
    const timestamp = new Date().toISOString();
    const wasDone = activity.status === 'done';
    let nextStatus = activity.status;
    updateActivity(activityId, (prev) => {
      const next = applyPlanActivityCompletionAction(prev, timestamp);
      nextStatus = next.status;
      return next;
    });

    const didCompleteNow = !wasDone && nextStatus === 'done';
    void HapticsService.trigger(didCompleteNow ? 'outcome.bigSuccess' : 'canvas.primary.confirm');
    if (didCompleteNow) {
      void playActivityDoneSound();
      recordShowUpWithCelebration();
      recordScreenTimeQualifyingAction({
        action: 'activity_completed',
        occurredAt: new Date(timestamp),
      });
      reconcileScreenTimeRestrictions({ focusSessionActive: false, now: new Date(timestamp) }).catch(() => undefined);
    }

    capture(AnalyticsEvent.ActivityCompletionToggled, {
      source: 'plan_event_peek',
      activity_id: activityId,
      goal_id: activity.goalId ?? null,
      next_status: nextStatus,
      had_steps: Boolean(activity.steps && activity.steps.length > 0),
    });
  }, [activity, activityId, capture, recordScreenTimeQualifyingAction, updateActivity]);

  if (!activity) {
    return (
      <View style={styles.container}>
        <BottomDrawerHeader
          title="Scheduled"
          rightAction={<BottomDrawerHeaderClose onPress={onRequestClose} />}
          titleStyle={styles.headerTitle}
        />
        <Text style={styles.bodyText}>This to-do can’t be found.</Text>
      </View>
    );
  }

  return (
    <BottomDrawerScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <BottomDrawerHeader
        title="Scheduled"
        rightAction={<BottomDrawerHeaderClose onPress={onRequestClose} />}
        titleStyle={styles.headerTitle}
      />

      <VStack space={spacing.md}>
        <View style={styles.summaryCard}>
          <VStack space={spacing.xs}>
            <Heading variant="md" style={styles.activityTitle}>
              {activity.title}
            </Heading>
            {goalTitle ? <GoalPill title={goalTitle} /> : null}
            <HStack space={spacing.sm} alignItems="center" style={{ flexWrap: 'wrap' }}>
              <Text style={styles.meta}>{timeText}</Text>
              {conflict ? (
                <Badge variant="outline" style={styles.conflictBadge} textStyle={styles.conflictBadgeText}>
                  Conflict
                </Badge>
              ) : null}
            </HStack>
            {conflict ? <Text style={styles.conflictHint}>Conflicts with your calendar.</Text> : null}
          </VStack>
        </View>

        <Button
          variant="primary"
          fullWidth
          onPress={() => {
            onRequestClose();
            onOpenFocus(activityId);
          }}
        >
          Start Focus
        </Button>

        {completionAction ? (
          <View style={styles.completionRow}>
            <HStack space={spacing.sm} alignItems="center" style={styles.completionTextWrap}>
              <View style={[styles.completionIcon, completionAction.isDone ? styles.completionIconDone : null]}>
                <Icon
                  name={completionAction.isDone ? 'checkCircle' : 'check'}
                  size={18}
                  color={completionAction.isDone ? colors.pine500 : colors.textPrimary}
                />
              </View>
              <VStack space={2} style={styles.completionTextColumn}>
                <Text style={styles.completionTitle}>
                  {completionAction.isDone ? 'Completed' : 'Close this block'}
                </Text>
                <Text style={styles.completionMeta}>{completionAction.meta}</Text>
              </VStack>
            </HStack>
            <Button
              variant={completionAction.isDone ? 'secondary' : 'outline'}
              size="sm"
              onPress={handlePlanCompletePress}
              accessibilityLabel={completionAction.label}
            >
              {completionAction.label}
            </Button>
          </View>
        ) : null}

        <KeyActionsRow
          size="md"
          items={[
            ...(conflict
              ? ([
                  {
                    id: 'move',
                    icon: 'moveTime',
                    label: 'Move',
                    onPress: handleMovePress,
                    accessibilityHint: 'Change the scheduled time for this to-do.',
                    tileBackgroundColor: colors.canvas,
                    tileBorderColor: colors.border,
                  },
                  {
                    id: 'unschedule',
                    icon: 'unschedule',
                    label: 'Unschedule',
                    onPress: () => onUnscheduleCommitment(activityId),
                    accessibilityHint: 'Remove this to-do from your plan.',
                    tileBackgroundColor: colors.canvas,
                    tileBorderColor: colors.border,
                  },
                  {
                    id: 'open',
                    icon: 'externalLink',
                    label: 'Open',
                    onPress: () => {
                      onRequestClose();
                      onOpenFullActivity(activityId);
                    },
                    accessibilityHint: 'Open the full to-do details.',
                    tileBackgroundColor: colors.canvas,
                    tileBorderColor: colors.border,
                  },
                ] as const)
              : ([
                  {
                    id: 'open',
                    icon: 'externalLink',
                    label: 'Open',
                    onPress: () => {
                      onRequestClose();
                      onOpenFullActivity(activityId);
                    },
                    accessibilityHint: 'Open the full to-do details.',
                    tileBackgroundColor: colors.canvas,
                    tileBorderColor: colors.border,
                  },
                  {
                    id: 'move',
                    icon: 'moveTime',
                    label: 'Move',
                    onPress: handleMovePress,
                    accessibilityHint: 'Change the scheduled time for this to-do.',
                    tileBackgroundColor: colors.canvas,
                    tileBorderColor: colors.border,
                  },
                  {
                    id: 'unschedule',
                    icon: 'unschedule',
                    label: 'Unschedule',
                    onPress: () => onUnscheduleCommitment(activityId),
                    accessibilityHint: 'Remove this to-do from your plan.',
                    tileBackgroundColor: colors.canvas,
                    tileBorderColor: colors.border,
                  },
                ] as const)),
          ]}
        />

        <ActivityPeekSteps
          activity={activity as any}
          linkedActivityById={linkedActivityById as any}
          onToggleStepComplete={handleToggleStepComplete}
          onOpenLinkedActivity={(linkedId) => {
            onRequestClose();
            onOpenFullActivity(linkedId);
          }}
        />

        <ActivityPeekNotes notes={activity.notes} />
        <ActivityPeekTags tags={activity.tags} />

        {pickerVisible && pendingMoveDate ? (
          <View style={styles.pickerContainer}>
            <HStack alignItems="center" justifyContent="space-between" style={styles.pickerHeaderRow}>
              <Text style={styles.pickerLabel}>Move to</Text>
              <IconButton
                accessibilityLabel="Close move picker"
                onPress={handleMoveCancel}
                variant="ghost"
              >
                <Icon name="close" size={18} color={colors.textPrimary} />
              </IconButton>
            </HStack>
            <DateTimePicker
              value={pendingMoveDate}
              mode="time"
              onChange={handleMoveChange}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            />
            {Platform.OS === 'ios' ? (
              <HStack space={spacing.sm} style={styles.pickerActions}>
                <Button variant="ghost" size="sm" onPress={handleMoveCancel}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onPress={handleMoveDone}>
                  Done
                </Button>
              </HStack>
            ) : null}
          </View>
        ) : null}
      </VStack>
    </BottomDrawerScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 0,
    paddingBottom: spacing.xl,
  },
  scrollContent: {
    paddingBottom: spacing['2xl'],
  },
  headerTitle: {
    textAlign: 'left',
  },
  summaryCard: {
    ...cardSurfaceStyle,
    padding: spacing.md,
    borderRadius: 18,
  },
  activityTitle: {
    marginBottom: 2,
  },
  meta: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  conflictBadge: {
    backgroundColor: colors.scheduleYellow,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  conflictBadgeText: {
    color: colors.warning,
  },
  conflictHint: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  completionRow: {
    ...cardSurfaceStyle,
    borderRadius: 18,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  completionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  completionTextColumn: {
    flex: 1,
    minWidth: 0,
  },
  completionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.shellAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  completionIconDone: {
    backgroundColor: colors.pine100,
    borderColor: colors.pine500,
  },
  completionTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  completionMeta: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  pickerContainer: {
    ...cardSurfaceStyle,
    padding: spacing.md,
    borderRadius: 18,
  },
  pickerLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  pickerHeaderRow: {
    marginBottom: spacing.xs,
  },
  pickerActions: {
    justifyContent: 'flex-end',
    paddingTop: spacing.sm,
  },
  bodyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
