import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { ActivityListItem } from '../../ui/ActivityListItem';
import { BottomDrawerFlatList } from '../../ui/BottomDrawer';
import { Icon } from '../../ui/Icon';
import { HStack, Text } from '../../ui/primitives';
import { QuickAddDock } from '../activities/QuickAddDock';
import { formatTimeRange } from '../../services/plan/planDates';
import { formatMinutes } from '../../utils/formatMinutes';
import type { PlanRecommendationsQuickAddModel } from './usePlanRecommendationsQuickAdd';

export type PlanSlotCaptureActivityOption = {
  activityId: string;
  title: string;
  estimateMinutes?: number | null;
};

export type PlanSlotCaptureModel = {
  start: Date;
  end: Date;
  quickAdd: PlanRecommendationsQuickAddModel;
  existingActivities: PlanSlotCaptureActivityOption[];
  selectedActivityId: string | null;
  createdActivityId?: string | null;
  committingActivityId?: string | null;
  onSelectActivity: (activityId: string) => void;
  onCommitNew: () => void;
  onCommitExisting: () => void;
};

export function PlanSlotCapturePage({
  start,
  end,
  quickAdd,
  existingActivities,
  selectedActivityId,
  createdActivityId,
  committingActivityId,
  onSelectActivity,
  onCommitNew,
  onCommitExisting,
}: PlanSlotCaptureModel) {
  const insets = useSafeAreaInsets();
  const [dockReservedHeight, setDockReservedHeight] = useState(64);
  const durationMinutes = useMemo(
    () => Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000)),
    [end, start],
  );
  const canCommit = Boolean(selectedActivityId);
  const selectedCreatedActivity = Boolean(
    createdActivityId && selectedActivityId === createdActivityId,
  );
  const selectedExistingTitle = selectedCreatedActivity
    ? null
    : existingActivities.find((activity) => activity.activityId === selectedActivityId)?.title ?? null;
  const isCommitting = Boolean(committingActivityId);
  const selectedLabel = selectedCreatedActivity
    ? 'New to-do ready'
    : selectedExistingTitle
      ? `Selected: ${selectedExistingTitle}`
      : null;
  const dockBottomOffset = Math.max(insets.bottom, spacing.sm);

  return (
    <View style={styles.container}>
      <HStack space={spacing.sm} style={styles.timeRow}>
        <Text style={styles.timeLabel}>{formatTimeRange(start, end)}</Text>
        <Text style={styles.durationLabel}>{formatMinutes(durationMinutes)}</Text>
      </HStack>

      {selectedLabel ? (
        <HStack space={spacing.sm} style={styles.selectionRow}>
          <Text numberOfLines={1} style={styles.selectedCopy}>{selectedLabel}</Text>
          <Button
            variant="primary"
            size="sm"
            disabled={!canCommit || isCommitting}
            onPress={selectedCreatedActivity ? onCommitNew : onCommitExisting}
          >
            {isCommitting ? 'Adding...' : 'Add to calendar'}
          </Button>
        </HStack>
      ) : null}

      <BottomDrawerFlatList
        style={styles.inventory}
        contentContainerStyle={[
          styles.inventoryContent,
          { paddingBottom: dockReservedHeight + dockBottomOffset + spacing.md },
        ]}
        data={existingActivities}
        keyExtractor={(activity) => activity.activityId}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderItem={({ item: activity }) => {
          const selected = selectedActivityId === activity.activityId;
          return (
            <View style={styles.activityRowWrap}>
              <ActivityListItem
                title={activity.title}
                estimateMeta={activity.estimateMinutes ? formatMinutes(activity.estimateMinutes) : undefined}
                showCheckbox={false}
                showPriorityControl={false}
                rightAccessory={
                  selected ? (
                    <View accessible accessibilityLabel="Selected" style={styles.selectedAccessory}>
                      <Icon name="check" size={16} color={colors.pine700} />
                    </View>
                  ) : undefined
                }
                onPress={() => onSelectActivity(activity.activityId)}
              />
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyExisting}>
            <Text style={styles.emptyExistingText}>No unscheduled to-dos available.</Text>
          </View>
        }
      />

      <QuickAddDock
        placement="bottomDock"
        placeholder="Add a new to-do"
        value={quickAdd.value}
        onChangeText={quickAdd.onChangeText}
        inputRef={quickAdd.inputRef}
        isFocused={quickAdd.isFocused}
        setIsFocused={quickAdd.setIsFocused}
        onSubmit={quickAdd.onSubmit}
        onCollapse={quickAdd.onCollapse}
        selectedAiActions={quickAdd.selectedAiActions}
        onSelectedAiActionsChange={quickAdd.onSelectedAiActionsChange}
        lockedAiActions={quickAdd.lockedAiActions}
        onLockedAiActionPress={quickAdd.onLockedAiActionPress}
        collapsedBottomOffsetPx={dockBottomOffset}
        floatingHorizontalInsetPx={0}
        onReservedHeightChange={setDockReservedHeight}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
  },
  timeLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
    flex: 1,
  },
  durationLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  timeRow: {
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  selectionRow: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  selectedCopy: {
    ...typography.bodySm,
    color: colors.textSecondary,
    flex: 1,
  },
  inventory: {
    flex: 1,
    minHeight: 0,
  },
  inventoryContent: {
    paddingTop: spacing.xs,
  },
  activityRowWrap: {
    paddingBottom: spacing.xs,
  },
  selectedAccessory: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pine100,
  },
  emptyExisting: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.shellAlt,
    padding: spacing.md,
  },
  emptyExistingText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});
