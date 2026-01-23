import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, LayoutAnimation, Platform, Pressable, StyleSheet, UIManager, View } from 'react-native';
import { colors, fonts, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { BottomDrawerScrollView } from '../../ui/BottomDrawer';
import { EmptyState, HStack, Text, VStack } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';
import { formatTimeRange } from '../../services/plan/planDates';
import { formatMinutes } from '../../utils/formatMinutes';

type PlanRecommendation = {
  activityId: string;
  title: string;
  goalTitle?: string | null;
  arcTitle?: string | null;
  proposal: {
    startDate: string;
    endDate: string;
  };
  candidateStartDates?: string[] | null;
};

type PlanRecsPageProps = {
  targetDayLabel: string;
  dueUnplaced?: Array<{
    activityId: string;
    title: string;
    goalTitle?: string | null;
    arcTitle?: string | null;
  }>;
  recommendations: PlanRecommendation[];
  emptyState: { title: string; description: string } | null;
  isLoading?: boolean;
  showAlreadyPlanned: boolean;
  entryPoint: 'manual' | 'kickoff';
  calendarStatus: 'unknown' | 'connected' | 'missing';
  onOpenCalendarSettings: () => void;
  onOpenAvailabilitySettings?: () => void;
  onDismissForToday?: (activityId: string) => void;
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
  dueUnplaced = [],
  recommendations,
  emptyState,
  isLoading = false,
  showAlreadyPlanned,
  entryPoint,
  calendarStatus,
  onOpenCalendarSettings,
  onOpenAvailabilitySettings,
  onDismissForToday,
  onReviewPlan,
  onRerun,
  onCommit,
  onMove,
  onSkip,
  committingActivityId = null,
  contentPadding = spacing.xl,
}: PlanRecsPageProps) {
  const [expandedMoveActivityId, setExpandedMoveActivityId] = useState<string | null>(null);
  const isCommittingAny = Boolean(committingActivityId);

  function parseDateSafe(iso: string): Date | null {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const animateExpandCollapse = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, []);

  const toggleMovePickerFor = useCallback(
    (activityId: string, start: Date) => {
      if (isCommittingAny) return;
      const isExpanded = expandedMoveActivityId === activityId;
      animateExpandCollapse();
      if (isExpanded) {
        setExpandedMoveActivityId(null);
        return;
      }
      setExpandedMoveActivityId(activityId);
    },
    [animateExpandCollapse, expandedMoveActivityId, isCommittingAny],
  );

  const handleMoveCancel = () => {
    animateExpandCollapse();
    setExpandedMoveActivityId(null);
  };

  const handleSelectSlot = useCallback(
    (activityId: string, newStart: Date) => {
      onMove(activityId, newStart);
      animateExpandCollapse();
      setExpandedMoveActivityId(null);
    },
    [animateExpandCollapse, onMove],
  );

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
    <BottomDrawerScrollView
      style={styles.scrollView}
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
        {dueUnplaced.length > 0 ? (
          <View style={styles.warningCard}>
            <VStack space={spacing.sm}>
              <VStack space={spacing.xs}>
                <Text style={styles.warningTitle}>Due today didn’t fit</Text>
                <Text style={styles.warningBody}>
                  {dueUnplaced.length === 1
                    ? 'One due-today activity couldn’t be scheduled within your availability and conflicts.'
                    : `${dueUnplaced.length} due-today activities couldn’t be scheduled within your availability and conflicts.`}
                </Text>
              </VStack>

              <VStack space={spacing.xs}>
                {dueUnplaced.slice(0, 5).map((a) => (
                  <HStack key={a.activityId} alignItems="center" justifyContent="space-between">
                    <Text style={styles.warningItemTitle}>{a.title}</Text>
                    {onDismissForToday ? (
                      <Button variant="ghost" size="sm" onPress={() => onDismissForToday(a.activityId)}>
                        Dismiss for today
                      </Button>
                    ) : null}
                  </HStack>
                ))}
                {dueUnplaced.length > 5 ? (
                  <Text style={styles.warningMore}>+{dueUnplaced.length - 5} more</Text>
                ) : null}
              </VStack>

              <HStack space={spacing.sm} style={{ justifyContent: 'flex-end' }}>
                {onOpenAvailabilitySettings ? (
                  <Button variant="secondary" size="sm" onPress={onOpenAvailabilitySettings}>
                    Adjust availability
                  </Button>
                ) : null}
                <Button variant="ghost" size="sm" onPress={onOpenCalendarSettings}>
                  Calendars
                </Button>
              </HStack>
            </VStack>
          </View>
        ) : null}

        <Text style={styles.subtitle}>Commit a few for {targetDayLabel}.</Text>

        <VStack space={spacing.sm}>
          {recommendations.map((rec) => {
            const start = parseDateSafe(rec.proposal.startDate);
            const end = parseDateSafe(rec.proposal.endDate);
            const isCommittingThis = committingActivityId === rec.activityId;
            const isExpanded = expandedMoveActivityId === rec.activityId;
            const durationMinutes =
              start && end ? Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000)) : null;
            const metaParts: string[] = [];
            if (durationMinutes && durationMinutes > 0) metaParts.push(formatMinutes(durationMinutes));
            if (rec.goalTitle) metaParts.push(rec.goalTitle);
            const meta = metaParts.length > 0 ? metaParts.join(' · ') : null;
            const candidateStarts =
              (rec.candidateStartDates ?? [])
                .map(parseDateSafe)
                .filter((d): d is Date => Boolean(d)) ?? [];
            return (
              <View key={rec.activityId} style={styles.recCard}>
                <VStack space={spacing.xs}>
                  <Text style={styles.recTitle}>{rec.title}</Text>
                  {meta ? (
                    <Text style={styles.recMetaText} numberOfLines={1} ellipsizeMode="tail">
                      {meta}
                    </Text>
                  ) : null}
                  <HStack style={styles.recActionsRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Change time for ${rec.title}`}
                      disabled={isCommittingAny || !start || !end}
                      onPress={() => {
                        if (start) toggleMovePickerFor(rec.activityId, start);
                      }}
                      style={({ pressed }) => [
                        styles.timeControl,
                        (isCommittingAny || !start || !end) && styles.timeControlDisabled,
                        pressed && !(isCommittingAny || !start || !end) ? styles.timeControlPressed : null,
                      ]}
                    >
                      <HStack alignItems="center" space={spacing.xs} style={styles.timeControlRow}>
                        <Text style={styles.timeBadgeText}>
                          {start && end ? formatTimeRange(start, end) : 'Time unavailable'}
                        </Text>
                        <Icon
                          name={isExpanded ? 'chevronUp' : 'chevronDown'}
                          size={14}
                          color={colors.textSecondary}
                        />
                      </HStack>
                    </Pressable>
                    <HStack space={spacing.sm} style={styles.recActions}>
                    <Button
                        variant="ghost"
                        size="xs"
                      style={styles.recActionButton}
                        disabled={isCommittingAny}
                        onPress={() => onSkip(rec.activityId)}
                      >
                        Skip
                      </Button>
                      <Button
                        variant="primary"
                        size="xs"
                      style={styles.recActionButton}
                        disabled={isCommittingAny}
                        onPress={() => onCommit(rec.activityId)}
                      >
                        {isCommittingThis ? 'Committing…' : 'Commit'}
                      </Button>
                    </HStack>
                  </HStack>

                  {isExpanded ? (
                    <View style={styles.inlinePickerContainer}>
                      <Text style={styles.slotListLabel}>Pick a time</Text>
                      <VStack space={spacing.xs} style={styles.slotList}>
                        {candidateStarts.length > 0 && durationMinutes ? (
                          candidateStarts.map((slotStart) => {
                            const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);
                            const label = formatTimeRange(slotStart, slotEnd);
                            const isSelected = start ? slotStart.getTime() === start.getTime() : false;
                            return (
                              <Pressable
                                key={slotStart.toISOString()}
                                accessibilityRole="button"
                                accessibilityLabel={`Move to ${label}`}
                                disabled={isCommittingAny}
                                onPress={() => handleSelectSlot(rec.activityId, slotStart)}
                                style={({ pressed }) => [
                                  styles.slotRow,
                                  isSelected ? styles.slotRowSelected : null,
                                  pressed ? styles.slotRowPressed : null,
                                  isCommittingAny ? styles.slotRowDisabled : null,
                                ]}
                              >
                                <HStack alignItems="center" justifyContent="space-between" style={styles.slotRowInner}>
                                  <Text style={styles.slotRowText}>{label}</Text>
                                  {isSelected ? (
                                    <Icon name="check" size={16} color={colors.textPrimary} />
                                  ) : null}
                                </HStack>
                              </Pressable>
                            );
                          })
                        ) : (
                          <Text style={styles.slotEmptyText}>
                            No open slots found within your availability and conflicts.
                          </Text>
                        )}
                      </VStack>
                      <HStack space={spacing.sm} style={styles.slotActions}>
                        <Button variant="ghost" size="sm" onPress={handleMoveCancel}>
                          Close
                        </Button>
                      </HStack>
                    </View>
                  ) : null}
                </VStack>
              </View>
            );
          })}
        </VStack>
      </VStack>
    </BottomDrawerScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
    paddingBottom: 0,
    overflow: 'visible',
  },
  scrollView: {
    overflow: 'visible',
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
  warningCard: {
    backgroundColor: colors.shellAlt,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  warningTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  warningBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  warningItemTitle: {
    ...typography.bodySm,
    color: colors.textPrimary,
    flex: 1,
    paddingRight: spacing.sm,
  },
  warningMore: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  recCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  recTitle: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
  recMetaText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  recActionsRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  recMeta: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  timeControl: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeControlRow: {
    minWidth: 0,
  },
  timeControlPressed: {
    opacity: 0.92,
  },
  timeControlDisabled: {
    opacity: 0.55,
  },
  timeBadgeText: {
    // ...typography.mono,
    fontSize: 14,
    fontWeight: '400',
    color: colors.textPrimary,
    letterSpacing: -0.25,
  },
  recActions: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    alignSelf: 'stretch',
  },
  recActionButton: {
    paddingHorizontal: spacing.sm,
    height: 30,
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
  inlinePickerContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  slotListLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  slotList: {
    alignSelf: 'stretch',
  },
  slotRow: {
    borderRadius: 10,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  slotRowInner: {
    minWidth: 0,
  },
  slotRowText: {
    ...typography.bodySm,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  slotRowSelected: {
    borderColor: colors.textPrimary,
  },
  slotRowPressed: {
    opacity: 0.92,
  },
  slotRowDisabled: {
    opacity: 0.55,
  },
  slotEmptyText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  slotActions: {
    justifyContent: 'flex-end',
    paddingTop: spacing.sm,
  },
});
