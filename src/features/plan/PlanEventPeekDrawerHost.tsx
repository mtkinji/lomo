import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomDrawer, type BottomDrawerSnapPoint } from '../../ui/BottomDrawer';
import { colors, spacing, typography } from '../../theme';
import { HStack, Text } from '../../ui/primitives';
import { Button } from '../../ui/Button';
import { PlanRecsPage } from './PlanRecsPage';
import { ActivityEventPeek, type ActivityEventPeekModel } from './ActivityEventPeek';
import { ExternalEventPeek, type ExternalEventPeekModel } from './ExternalEventPeek';

export type PlanDrawerMode = 'recs' | 'activity' | 'external';

type PlanRecommendationsModel = {
  recommendationCount: number;
  targetDayLabel: string;
  recommendations: Array<{
    activityId: string;
    title: string;
    goalTitle?: string | null;
    arcTitle?: string | null;
    proposal: { startDate: string; endDate: string };
  }>;
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
};

export function PlanEventPeekDrawerHost({
  visible,
  mode,
  onClose,
  recommendations,
  activityPeek,
  externalPeek,
}: {
  visible: boolean;
  mode: PlanDrawerMode;
  onClose: () => void;
  recommendations?: PlanRecommendationsModel;
  activityPeek?: ActivityEventPeekModel;
  externalPeek?: ExternalEventPeekModel;
}) {
  const snapPoints = useMemo<BottomDrawerSnapPoint[]>(() => {
    if (mode === 'recs') return ['85%'];
    return ['42%', '85%'];
  }, [mode]);

  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      snapPoints={snapPoints}
      presentation="modal"
      dismissable
      dismissOnBackdropPress
      enableContentPanningGesture
      sheetStyle={styles.sheet}
      handleContainerStyle={styles.handleContainer}
      handleStyle={styles.handle}
    >
      {mode === 'recs' && recommendations ? (
        <View>
          <View style={styles.headerRow}>
            <HStack alignItems="center" justifyContent="space-between">
              <Text style={styles.sheetTitle}>
                Recommendations
                {Number.isFinite(recommendations.recommendationCount) ? ` (${recommendations.recommendationCount})` : ''}
              </Text>
              <Button variant="ghost" size="sm" onPress={onClose}>
                Close
              </Button>
            </HStack>
          </View>

          <PlanRecsPage
            // BottomDrawer already provides the canonical gutter.
            contentPadding={0}
            targetDayLabel={recommendations.targetDayLabel}
            recommendations={recommendations.recommendations}
            emptyState={recommendations.recommendations.length === 0 ? recommendations.emptyState : null}
            isLoading={recommendations.isLoading}
            showAlreadyPlanned={recommendations.showAlreadyPlanned}
            entryPoint={recommendations.entryPoint}
            calendarStatus={recommendations.calendarStatus}
            onOpenCalendarSettings={recommendations.onOpenCalendarSettings}
            onReviewPlan={recommendations.onReviewPlan}
            onRerun={recommendations.onRerun}
            onCommit={recommendations.onCommit}
            onMove={recommendations.onMove}
            onSkip={recommendations.onSkip}
            committingActivityId={recommendations.committingActivityId}
          />
        </View>
      ) : null}

      {mode === 'activity' && activityPeek ? <ActivityEventPeek {...activityPeek} /> : null}
      {mode === 'external' && externalPeek ? <ExternalEventPeek {...externalPeek} /> : null}
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.canvas,
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
  headerRow: {
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontWeight: '700',
  },
});


