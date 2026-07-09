import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { HStack, Text, VStack } from '../../ui/primitives';
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
  onSaveNewToTodos: () => void;
};

type SlotCaptureMode = 'new' | 'existing';

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
  onSaveNewToTodos,
}: PlanSlotCaptureModel) {
  const [mode, setMode] = useState<SlotCaptureMode>('new');
  const durationMinutes = useMemo(
    () => Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000)),
    [end, start],
  );
  const selectedExistingTitle =
    existingActivities.find((activity) => activity.activityId === selectedActivityId)?.title ?? null;
  const canCommitNew = Boolean(createdActivityId);
  const canCommitExisting = Boolean(selectedActivityId);
  const isCommitting = Boolean(committingActivityId);

  return (
    <VStack space={spacing.md} style={styles.container}>
      <VStack space={spacing.xs}>
        <Text style={styles.timeLabel}>{formatTimeRange(start, end)}</Text>
        <Text style={styles.durationLabel}>{formatMinutes(durationMinutes)}</Text>
      </VStack>

      <HStack style={styles.segmentedControl}>
        <SegmentButton selected={mode === 'new'} label="New to-do" onPress={() => setMode('new')} />
        <SegmentButton selected={mode === 'existing'} label="Existing" onPress={() => setMode('existing')} />
      </HStack>

      {mode === 'new' ? (
        <VStack space={spacing.sm}>
          <QuickAddDock
            placement="inline"
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
          />
          {createdActivityId ? (
            <Text style={styles.selectedCopy}>Ready to commit this to-do.</Text>
          ) : null}
          <HStack space={spacing.sm} style={styles.actionsRow}>
            <Button
              variant="ghost"
              size="sm"
              disabled={quickAdd.value.trim().length === 0 || isCommitting}
              onPress={onSaveNewToTodos}
            >
              Save to To-dos
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!canCommitNew || isCommitting}
              onPress={onCommitNew}
            >
              {isCommitting ? 'Committing...' : 'Commit to calendar'}
            </Button>
          </HStack>
        </VStack>
      ) : (
        <VStack space={spacing.sm}>
          <VStack space={spacing.xs}>
            {existingActivities.length > 0 ? (
              existingActivities.map((activity) => {
                const selected = selectedActivityId === activity.activityId;
                const meta = activity.estimateMinutes ? formatMinutes(activity.estimateMinutes) : null;
                return (
                  <Pressable
                    key={activity.activityId}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose ${activity.title}`}
                    accessibilityState={{ selected }}
                    onPress={() => onSelectActivity(activity.activityId)}
                    style={({ pressed }) => [
                      styles.activityRow,
                      selected ? styles.activityRowSelected : null,
                      pressed ? styles.activityRowPressed : null,
                    ]}
                  >
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    {meta ? <Text style={styles.activityMeta}>{meta}</Text> : null}
                  </Pressable>
                );
              })
            ) : (
              <View style={styles.emptyExisting}>
                <Text style={styles.emptyExistingText}>No unscheduled to-dos available.</Text>
              </View>
            )}
          </VStack>
          {selectedExistingTitle ? (
            <Text style={styles.selectedCopy}>Selected: {selectedExistingTitle}</Text>
          ) : null}
          <HStack space={spacing.sm} style={styles.actionsRow}>
            <Button
              variant="primary"
              size="sm"
              disabled={!canCommitExisting || isCommitting}
              onPress={onCommitExisting}
            >
              {isCommitting ? 'Committing...' : 'Commit to calendar'}
            </Button>
          </HStack>
        </VStack>
      )}
    </VStack>
  );
}

function SegmentButton({
  selected,
  label,
  onPress,
}: {
  selected: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.segmentButton,
        selected ? styles.segmentButtonSelected : null,
        pressed ? styles.segmentButtonPressed : null,
      ]}
    >
      <Text style={[styles.segmentButtonText, selected ? styles.segmentButtonTextSelected : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  timeLabel: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  durationLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  segmentedControl: {
    padding: 3,
    borderRadius: 12,
    backgroundColor: colors.shellAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonSelected: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentButtonPressed: {
    opacity: 0.9,
  },
  segmentButtonText: {
    ...typography.bodySm,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  segmentButtonTextSelected: {
    color: colors.textPrimary,
  },
  actionsRow: {
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  selectedCopy: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  activityRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  activityRowSelected: {
    borderColor: colors.pine500,
    backgroundColor: colors.pine100,
  },
  activityRowPressed: {
    opacity: 0.9,
  },
  activityTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  activityMeta: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 2,
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
