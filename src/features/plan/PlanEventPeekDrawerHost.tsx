import React, { useMemo } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';
import {
  BottomDrawer,
  BottomDrawerScrollView,
  type BottomDrawerSnapPoint,
} from '../../ui/BottomDrawer';
import { colors, spacing, typography } from '../../theme';
import { Text } from '../../ui/primitives';
import { PlanRecsPage } from './PlanRecsPage';
import { PlanSlotCapturePage, type PlanSlotCaptureModel } from './PlanSlotCapturePage';
import { ActivityEventPeek, type ActivityEventPeekModel } from './ActivityEventPeek';
import { ExternalEventPeek, type ExternalEventPeekModel } from './ExternalEventPeek';
import { BottomDrawerHeader } from '../../ui/layout/BottomDrawerHeader';
import type { QuickAddAiAction } from '../activities/useQuickAddDockController';

export type PlanDrawerMode = 'recs' | 'activity' | 'external' | 'slotCapture';

type PlanRecommendationsModel = {
  recommendationCount: number;
  targetDayLabel: string;
  quickAdd?: {
    value: string;
    onChangeText: (text: string) => void;
    inputRef: React.RefObject<TextInput | null>;
    isFocused: boolean;
    setIsFocused: (next: boolean) => void;
    onSubmit: (options?: { aiActions?: QuickAddAiAction[] }) => void;
    onCollapse: () => void;
    selectedAiActions: QuickAddAiAction[];
    onSelectedAiActionsChange: (actions: QuickAddAiAction[]) => void;
    lockedAiActions?: Partial<Record<QuickAddAiAction, string>>;
    onLockedAiActionPress?: (action: QuickAddAiAction) => void;
  };
  unscheduledCreated?: Array<{
    activityId: string;
    title: string;
    estimateMinutes?: number | null;
  }>;
  dueUnplaced?: Array<{
    activityId: string;
    title: string;
    goalTitle?: string | null;
    arcTitle?: string | null;
  }>;
  recommendations: Array<{
    activityId: string;
    title: string;
    goalTitle?: string | null;
    arcTitle?: string | null;
    proposal: { startDate: string; endDate: string };
    candidateStartDates?: string[] | null;
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
  onReconnectCalendarAccess?: () => void;
  calendarAccessProviderLabel?: string | null;
  onOpenCalendarSettings: () => void;
  onOpenAvailabilitySettings?: () => void;
  onFindActivities?: () => void;
  onPickTimeForCreated?: (activityId: string) => void;
  onSaveCreatedWithoutScheduling?: (activityId: string) => void;
  onDismissForToday?: (activityId: string) => void;
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
  slotCapture,
  activityPeek,
  externalPeek,
}: {
  visible: boolean;
  mode: PlanDrawerMode;
  onClose: () => void;
  recommendations?: PlanRecommendationsModel;
  slotCapture?: PlanSlotCaptureModel;
  activityPeek?: ActivityEventPeekModel;
  externalPeek?: ExternalEventPeekModel;
}) {
  const snapPoints = useMemo<BottomDrawerSnapPoint[]>(() => {
    if (mode === 'recs') return ['85%'];
    if (mode === 'slotCapture') return ['58%', '85%'];
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
          <BottomDrawerHeader
            title={
              <Text style={styles.sheetTitle}>Recommendations</Text>
            }
            variant="withClose"
            onClose={onClose}
          />

          <PlanRecsPage
            // BottomDrawer already provides the canonical gutter.
            contentPadding={0}
            targetDayLabel={recommendations.targetDayLabel}
            quickAdd={recommendations.quickAdd}
            unscheduledCreated={recommendations.unscheduledCreated ?? []}
            dueUnplaced={recommendations.dueUnplaced ?? []}
            recommendations={recommendations.recommendations}
            emptyState={recommendations.recommendations.length === 0 ? recommendations.emptyState : null}
            isLoading={recommendations.isLoading}
            showAlreadyPlanned={recommendations.showAlreadyPlanned}
            entryPoint={recommendations.entryPoint}
            calendarStatus={recommendations.calendarStatus}
            calendarAccessStatus={recommendations.calendarAccessStatus}
            onReconnectCalendarAccess={recommendations.onReconnectCalendarAccess}
            calendarAccessProviderLabel={recommendations.calendarAccessProviderLabel ?? null}
            onOpenCalendarSettings={recommendations.onOpenCalendarSettings}
            onOpenAvailabilitySettings={recommendations.onOpenAvailabilitySettings}
            onFindActivities={recommendations.onFindActivities}
            onPickTimeForCreated={recommendations.onPickTimeForCreated}
            onSaveCreatedWithoutScheduling={recommendations.onSaveCreatedWithoutScheduling}
            onDismissForToday={recommendations.onDismissForToday}
            onReviewPlan={recommendations.onReviewPlan}
            onRerun={recommendations.onRerun}
            onCommit={recommendations.onCommit}
            onMove={recommendations.onMove}
            onSkip={recommendations.onSkip}
            committingActivityId={recommendations.committingActivityId}
          />
        </View>
      ) : null}

      {mode === 'slotCapture' && slotCapture ? (
        <BottomDrawerScrollView>
          <BottomDrawerHeader
            title={<Text style={styles.sheetTitle}>Add to plan</Text>}
            variant="withClose"
            onClose={onClose}
          />
          <PlanSlotCapturePage {...slotCapture} />
        </BottomDrawerScrollView>
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
  sheetTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
});
