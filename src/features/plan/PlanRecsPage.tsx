import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { EmptyState, HStack, Text, VStack } from '../../ui/primitives';
import { GoalPill } from '../../ui/GoalPill';
import { formatTimeRange } from '../../services/plan/planDates';

type PlanRecommendation = {
  activityId: string;
  title: string;
  goalTitle?: string | null;
  arcTitle?: string | null;
  proposal: {
    startDate: string;
    endDate: string;
  };
};

type PlanRecsPageProps = {
  targetDayLabel: string;
  recommendations: PlanRecommendation[];
  emptyState: { title: string; description: string } | null;
  isLoading?: boolean;
  showAlreadyPlanned: boolean;
  entryPoint: 'manual' | 'kickoff';
  calendarStatus: 'unknown' | 'connected' | 'missing';
  onOpenCalendarSettings: () => void;
  onReviewPlan: () => void;
  onRerun: () => void;
  onCommit: (activityId: string) => void;
  onMove: (activityId: string, newStart: Date) => void;
  onSkip: (activityId: string) => void;
  committingActivityId?: string | null;
  /**
   * Extra padding applied by the page itself. When hosted inside `BottomDrawer`,
   * the drawer already supplies a horizontal gutter, so this should be 0.
   */
  contentPadding?: number;
};

export function PlanRecsPage({
  targetDayLabel,
  recommendations,
  emptyState,
  isLoading = false,
  showAlreadyPlanned,
  entryPoint,
  calendarStatus,
  onOpenCalendarSettings,
  onReviewPlan,
  onRerun,
  onCommit,
  onMove,
  onSkip,
  committingActivityId = null,
  contentPadding = spacing.xl,
}: PlanRecsPageProps) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pendingMoveId, setPendingMoveId] = useState<string | null>(null);
  const [pendingMoveDate, setPendingMoveDate] = useState<Date | null>(null);
  const isCommittingAny = Boolean(committingActivityId);

  const handleMovePress = (activityId: string, start: Date) => {
    setPendingMoveId(activityId);
    setPendingMoveDate(start);
    setPickerVisible(true);
  };

  const normalizePickedTime = useCallback(
    (picked: Date) => {
      if (!pendingMoveDate) return picked;
      const next = new Date(pendingMoveDate);
      next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
      return next;
    },
    [pendingMoveDate],
  );

  const handleMoveChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (!date) return;
    const normalized = normalizePickedTime(date);
    setPendingMoveDate(normalized);

    // Android picker is a modal; apply immediately and close.
    if (Platform.OS !== 'ios') {
      setPickerVisible(false);
      if (pendingMoveId) onMove(pendingMoveId, normalized);
    }
  };

  const handleMoveCancel = () => {
    setPickerVisible(false);
    setPendingMoveId(null);
    setPendingMoveDate(null);
  };

  const handleMoveDone = () => {
    if (pendingMoveId && pendingMoveDate) {
      onMove(pendingMoveId, pendingMoveDate);
    }
    setPickerVisible(false);
  };

  if (calendarStatus === 'missing') {
    return (
      <View style={[styles.emptyContainer, { padding: contentPadding }]}>
        <View style={styles.emptyContent}>
          <EmptyState
            title="Connect calendars"
            instructions="Connect Google or Outlook calendars to plan your day and commit time blocks."
          />
          <Button variant="primary" fullWidth onPress={onOpenCalendarSettings} style={styles.cta}>
            Open Calendar Settings
          </Button>
        </View>
      </View>
    );
  }

  if (showAlreadyPlanned) {
    return (
      <View style={[styles.emptyContainer, { padding: contentPadding }]}>
        <View style={styles.emptyContent}>
          <EmptyState
            title="All set"
            instructions="No recommendations remain for this day. Review or adjust your blocks on the calendar."
          />
          <VStack space={spacing.sm} style={styles.emptyActions}>
            <Button variant="primary" fullWidth onPress={onReviewPlan}>
              Review plan
            </Button>
            {entryPoint === 'manual' ? (
              <Button variant="secondary" fullWidth onPress={onRerun}>
                Re-run recommendations
              </Button>
            ) : null}
          </VStack>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.emptyContainer, { padding: contentPadding }]}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="small" color={colors.textSecondary} />
          <Text style={styles.loadingText}>Loading your plan…</Text>
        </View>
      </View>
    );
  }

  if (recommendations.length === 0 && emptyState) {
    const showSettingsCta = emptyState.title === 'Choose a calendar';
    return (
      <View style={[styles.emptyContainer, { padding: contentPadding }]}>
        <View style={styles.emptyContent}>
          <EmptyState title={emptyState.title} instructions={emptyState.description} />
          {showSettingsCta ? (
            <Button variant="primary" fullWidth onPress={onOpenCalendarSettings} style={styles.cta}>
              Open Calendar Settings
            </Button>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          paddingHorizontal: contentPadding,
          paddingTop: spacing.sm,
          paddingBottom: spacing.xl * 4,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <VStack space={spacing.md}>
        <Text style={styles.subtitle}>Commit a few for {targetDayLabel}. Everything else stays deferred.</Text>

        <VStack space={spacing.sm}>
          {recommendations.map((rec) => {
            const start = new Date(rec.proposal.startDate);
            const end = new Date(rec.proposal.endDate);
            const isCommittingThis = committingActivityId === rec.activityId;
            return (
              <View key={rec.activityId} style={styles.recCard}>
                <VStack space={spacing.xs}>
                  <Text style={styles.recTitle}>{rec.title}</Text>
                  {rec.goalTitle ? <GoalPill title={rec.goalTitle} /> : null}
                  <Text style={styles.recMeta}>{formatTimeRange(start, end)}</Text>
                  <HStack space={spacing.sm} style={styles.recActions}>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isCommittingAny}
                        onPress={() => handleMovePress(rec.activityId, start)}
                      >
                      Move
                    </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isCommittingAny}
                        onPress={() => onSkip(rec.activityId)}
                      >
                      Skip
                    </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isCommittingAny}
                        onPress={() => onCommit(rec.activityId)}
                      >
                        {isCommittingThis ? 'Committing…' : 'Commit'}
                    </Button>
                  </HStack>
                </VStack>
              </View>
            );
          })}
        </VStack>

        <View style={styles.deferredCard}>
          <Text style={styles.deferredText}>Everything else stays deferred.</Text>
        </View>
      </VStack>

      {pickerVisible && pendingMoveDate ? (
        <View style={styles.pickerContainer}>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
    paddingBottom: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  loadingContent: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emptyContent: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    alignItems: 'center',
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  recCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  recMeta: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  recActions: {
    alignItems: 'center',
    marginTop: spacing.xs,
    justifyContent: 'flex-end',
    alignSelf: 'stretch',
  },
  deferredCard: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.shellAlt,
  },
  deferredText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyActions: {
    marginTop: spacing.md,
    width: '100%',
  },
  cta: {
    marginTop: spacing.md,
    width: '100%',
    maxWidth: 420,
  },
  pickerContainer: {
    paddingTop: spacing.md,
  },
  pickerActions: {
    justifyContent: 'flex-end',
    paddingTop: spacing.sm,
  },
});
