import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomDrawer, type BottomDrawerSnapPoint } from '../../ui/BottomDrawer';
import { colors, spacing, typography } from '../../theme';
import { Text } from '../../ui/primitives';
import { PlanRecsPage } from './PlanRecsPage';
import { BottomDrawerHeader } from '../../ui/layout/BottomDrawerHeader';

type PlanRecommendationsSheetProps = {
  visible: boolean;
  onClose: () => void;
  snapPoints?: Array<number | `${number}%`>;
  recommendationCount: number;

  // Pass-through props for the recommendations content.
  targetDayLabel: string;
  recommendations: Array<{
    activityId: string;
    title: string;
    goalTitle?: string | null;
    arcTitle?: string | null;
    proposal: { startDate: string; endDate: string };
  }>;
  emptyState:
    | {
        kind:
          | 'rest_day'
          | 'no_windows'
          | 'nothing_to_recommend'
          | 'choose_calendar'
          | 'day_full'
          | 'sign_in_required'
          | 'calendar_access_expired';
        title: string;
        description: string;
      }
    | null;
  isLoading?: boolean;
  showAlreadyPlanned: boolean;
  entryPoint: 'manual' | 'kickoff';
  calendarStatus: 'unknown' | 'connected' | 'missing';
  calendarAccessStatus?: 'idle' | 'refreshing' | 'expired' | 'ok';
  onOpenCalendarSettings: () => void;
  onReviewPlan: () => void;
  onRerun: () => void;
  onCommit: (activityId: string) => void;
  onMove: (activityId: string, newStart: Date) => void;
  onSkip: (activityId: string) => void;
  committingActivityId?: string | null;
};

export function PlanRecommendationsSheet({
  visible,
  onClose,
  snapPoints,
  recommendationCount,
  targetDayLabel,
  recommendations,
  emptyState,
  isLoading,
  showAlreadyPlanned,
  entryPoint,
  calendarStatus,
  onOpenCalendarSettings,
  onReviewPlan,
  onRerun,
  onCommit,
  onMove,
  onSkip,
  committingActivityId,
}: PlanRecommendationsSheetProps) {
  const effectiveSnapPoints = useMemo<BottomDrawerSnapPoint[]>(
    () => (snapPoints ?? (['85%' as const] satisfies BottomDrawerSnapPoint[])) as BottomDrawerSnapPoint[],
    [snapPoints],
  );

  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      snapPoints={effectiveSnapPoints}
      presentation="modal"
      dismissable
      dismissOnBackdropPress
      enableContentPanningGesture
      sheetStyle={styles.sheet}
      handleContainerStyle={styles.handleContainer}
      handleStyle={styles.handle}
    >
      <BottomDrawerHeader
        title={
          <Text style={styles.sheetTitle}>
            Recommendations
          </Text>
        }
        variant="withClose"
        onClose={onClose}
        showDivider
      />

      <PlanRecsPage
        // BottomDrawer already provides the canonical gutter.
        contentPadding={0}
        targetDayLabel={targetDayLabel}
        recommendations={recommendations}
        emptyState={recommendations.length === 0 ? emptyState : null}
        isLoading={isLoading}
        showAlreadyPlanned={showAlreadyPlanned}
        entryPoint={entryPoint}
        calendarStatus={calendarStatus}
        onOpenCalendarSettings={onOpenCalendarSettings}
        onReviewPlan={onReviewPlan}
        onRerun={onRerun}
        onCommit={onCommit}
        onMove={onMove}
        onSkip={onSkip}
        committingActivityId={committingActivityId}
      />
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.canvas,
    // Avoid extra horizontal inset; BottomDrawer already applies the standard gutter.
  },
  handleContainer: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  handle: {
    width: 56,
    height: 5,
    borderRadius: 999,
    alignSelf: 'center',
    backgroundColor: colors.border,
    opacity: 0.8,
  },
  sheetTitle: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontWeight: '700',
  },
});


