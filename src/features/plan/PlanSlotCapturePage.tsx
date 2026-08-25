import { Pressable } from '@/src/ui/HapticPressable';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { ActivityListItem } from '../../ui/ActivityListItem';
import { BottomDrawerFlatList } from '../../ui/BottomDrawer';
import { FilterDrawer } from '../../ui/FilterDrawer';
import { Icon } from '../../ui/Icon';
import { Input } from '../../ui/Input';
import {
  INVENTORY_CONTROL_HEIGHT_PX,
  InventoryControlGroup,
  InventoryControlSurface,
} from '../../ui/InventoryControlGroup';
import { SortDrawer } from '../../ui/SortDrawer';
import { HStack, Text, VStack } from '../../ui/primitives';
import { QuickAddDock } from '../activities/QuickAddDock';
import { GroupingDrawer } from '../activities/GroupingDrawer';
import { buildPriorityIndicator } from '../activities/activityPriorityIndicator';
import { formatTimeRange } from '../../services/plan/planDates';
import { formatMinutes } from '../../utils/formatMinutes';
import { buildActivityListMeta } from '../../utils/activityListMeta';
import type {
  Activity,
  ActivityViewGrouping,
  FilterGroup,
  FilterGroupLogic,
  Goal,
  SortCondition,
} from '../../domain/types';
import type { PlanRecommendationsQuickAddModel } from './usePlanRecommendationsQuickAdd';
import { buildPlanSlotInventory } from './planSlotInventory';
import { getActivityScheduleSessionCount } from '../../services/plan/activityScheduleSessions';

export type PlanSlotCaptureModel = {
  start: Date;
  end: Date;
  quickAdd: PlanRecommendationsQuickAddModel;
  activities: Activity[];
  goals: Goal[];
  scheduledProposalIds: string[];
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
  activities,
  goals,
  scheduledProposalIds,
  selectedActivityId,
  createdActivityId,
  committingActivityId,
  onSelectActivity,
  onCommitNew,
  onCommitExisting,
}: PlanSlotCaptureModel) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [dockReservedHeight, setDockReservedHeight] = useState(64);
  const [filters, setFilters] = useState<FilterGroup[]>([]);
  const [filterGroupLogic, setFilterGroupLogic] = useState<FilterGroupLogic>('or');
  const [sorts, setSorts] = useState<SortCondition[]>([]);
  const [grouping, setGrouping] = useState<ActivityViewGrouping>({ field: 'none' });
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [groupingDrawerVisible, setGroupingDrawerVisible] = useState(false);
  const [sortDrawerVisible, setSortDrawerVisible] = useState(false);
  const durationMinutes = useMemo(
    () => Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000)),
    [end, start],
  );
  const canCommit = Boolean(selectedActivityId);
  const selectedCreatedActivity = Boolean(createdActivityId && selectedActivityId === createdActivityId);
  const selectedActivity = activities.find((activity) => activity.id === selectedActivityId) ?? null;
  const selectedSessionCount = selectedActivity ? getActivityScheduleSessionCount(selectedActivity) : 0;
  const isCommitting = Boolean(committingActivityId);
  const selectedStatus = selectedCreatedActivity
    ? 'Created'
    : selectedSessionCount > 0
      ? `${selectedSessionCount} ${selectedSessionCount === 1 ? 'session' : 'sessions'}`
      : selectedActivity
        ? 'Selected'
        : null;
  const commitLabel = selectedSessionCount > 0 ? 'Add another session' : 'Add to calendar';
  const dockBottomOffset = Math.max(insets.bottom, spacing.sm);
  const filterCount = filters.reduce((count, group) => count + group.conditions.length, 0);
  const groupingCount = grouping.field === 'none' ? 0 : 1;
  const inventory = useMemo(
    () => buildPlanSlotInventory({
      activities,
      goals,
      scheduledProposalIds: new Set(scheduledProposalIds),
      filters,
      filterGroupLogic,
      sorts,
      grouping,
      query: searchQuery,
    }),
    [activities, filterGroupLogic, filters, goals, grouping, scheduledProposalIds, searchQuery, sorts],
  );
  const listRows = useMemo(() => {
    if (grouping.field === 'none') {
      return inventory.items.map((activity) => ({ kind: 'activity' as const, activity }));
    }
    return inventory.groups.flatMap((group) => [
      { kind: 'group' as const, key: group.key, label: group.label },
      ...group.activities.map((activity) => ({ kind: 'activity' as const, activity })),
    ]);
  }, [grouping.field, inventory.groups, inventory.items]);

  return (
    <View style={styles.container}>
      <HStack space={spacing.sm} style={styles.timeRow}>
        <Text style={styles.timeLabel}>{formatTimeRange(start, end)}</Text>
        <Text style={styles.durationLabel}>{formatMinutes(durationMinutes)}</Text>
      </HStack>

      <HStack alignItems="center" space={spacing.sm} style={styles.inventoryToolbar}>
        <View style={styles.searchInputFlex}>
          <Input
            accessibilityLabel="Search to-dos"
            placeholder="Search to-dos"
            leadingIcon="search"
            trailingIcon={searchQuery ? 'close' : undefined}
            trailingIconAccessibilityLabel="Clear search"
            onPressTrailingIcon={() => setSearchQuery('')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            size="sm"
            variant="outline"
            elevation="flat"
            containerStyle={styles.searchInput}
          />
        </View>

        <InventoryControlGroup testID="plan-slot-inventory-controls">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={filterCount > 0 ? `Filter to-dos (${filterCount})` : 'Filter to-dos'}
            hitSlop={5}
            onPress={() => setFilterDrawerVisible(true)}
          >
            <InventoryControlSurface active={filterCount > 0} count={filterCount} iconName="funnel" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={groupingCount > 0 ? 'Change to-do grouping' : 'Group to-dos'}
            hitSlop={5}
            onPress={() => setGroupingDrawerVisible(true)}
          >
            <InventoryControlSurface active={groupingCount > 0} count={groupingCount} iconName="layers" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={sorts.length > 0 ? `Sort to-dos (${sorts.length})` : 'Sort to-dos'}
            hitSlop={5}
            onPress={() => setSortDrawerVisible(true)}
          >
            <InventoryControlSurface active={sorts.length > 0} count={sorts.length} iconName="sort" />
          </Pressable>
        </InventoryControlGroup>
      </HStack>

      {selectedStatus && selectedActivity ? (
        <HStack space={spacing.sm} style={styles.selectionRow}>
          {selectedCreatedActivity ? (
            <View accessible={false} style={styles.createdIcon}>
              <Icon name="check" size={15} color={colors.textSecondary} />
            </View>
          ) : null}
          <VStack space={2} style={styles.selectionIdentity}>
            <Text style={styles.selectionStatus}>{selectedStatus}</Text>
            <Text numberOfLines={2} style={styles.selectedCopy}>{selectedActivity.title}</Text>
          </VStack>
          <Button
            variant="primary"
            size="sm"
            disabled={!canCommit || isCommitting}
            onPress={selectedCreatedActivity ? onCommitNew : onCommitExisting}
          >
            {isCommitting ? 'Adding...' : commitLabel}
          </Button>
        </HStack>
      ) : null}

      <BottomDrawerFlatList
        style={styles.inventory}
        contentContainerStyle={[
          styles.inventoryContent,
          { paddingBottom: dockReservedHeight + dockBottomOffset + spacing.md },
        ]}
        data={listRows}
        keyExtractor={(row) => row.kind === 'group' ? row.key : row.activity.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          inventory.mode === 'inventory'
            ? <Text style={styles.inventoryModeLabel}>All to-dos</Text>
            : null
        }
        renderItem={({ item: row }) => {
          if (row.kind === 'group') {
            return <Text style={styles.groupLabel}>{row.label}</Text>;
          }
          const activity = row.activity;
          const selected = selectedActivityId === activity.id;
          const sessionCount = getActivityScheduleSessionCount(activity);
          const meta = buildActivityListMeta({ activity });
          const priorityRank = inventory.priorityRankByActivityId.get(activity.id);
          return (
            <View style={styles.activityRowWrap}>
              <ActivityListItem
                title={activity.title}
                meta={meta.meta}
                metaTone={meta.metaTone}
                estimateMeta={meta.estimateMeta}
                priorityIndicator={priorityRank
                  ? buildPriorityIndicator(priorityRank) ?? undefined
                  : undefined}
                showCheckbox={false}
                showPriorityControl={false}
                rightAccessory={
                  selected ? (
                    <View accessible accessibilityLabel="Selected" style={styles.selectedAccessory}>
                      <Icon name="check" size={16} color={colors.pine700} />
                    </View>
                  ) : sessionCount > 0 ? (
                    <Text style={styles.sessionCount}>
                      {sessionCount} {sessionCount === 1 ? 'session' : 'sessions'}
                    </Text>
                  ) : undefined
                }
                onPress={() => onSelectActivity(activity.id)}
              />
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyExisting}>
            <Text style={styles.emptyExistingText}>
              {inventory.mode === 'recommended'
                ? 'No recommendations available.'
                : searchQuery.trim() || filterCount > 0
                ? 'No matching to-dos.'
                : 'No unscheduled to-dos available.'}
            </Text>
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

      <FilterDrawer
        visible={filterDrawerVisible}
        onClose={() => setFilterDrawerVisible(false)}
        filters={filters}
        groupLogic={filterGroupLogic}
        onApply={(nextFilters, nextLogic) => {
          setFilters(nextFilters);
          setFilterGroupLogic(nextLogic);
        }}
      />
      <GroupingDrawer
        visible={groupingDrawerVisible}
        onClose={() => setGroupingDrawerVisible(false)}
        grouping={grouping}
        onApply={setGrouping}
      />
      <SortDrawer
        visible={sortDrawerVisible}
        onClose={() => setSortDrawerVisible(false)}
        sorts={sorts}
        defaultSortMode="manual"
        onApply={setSorts}
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
  selectionIdentity: {
    flex: 1,
    minWidth: 0,
  },
  selectionStatus: {
    ...typography.label,
    color: colors.textSecondary,
  },
  selectedCopy: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  createdIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.shellAlt,
  },
  sessionCount: {
    ...typography.label,
    color: colors.textSecondary,
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
  inventoryModeLabel: {
    ...typography.label,
    color: colors.textSecondary,
    paddingBottom: spacing.xs,
  },
  groupLabel: {
    ...typography.label,
    color: colors.textSecondary,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  inventoryToolbar: {
    marginBottom: spacing.sm,
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
  searchInputFlex: {
    flex: 1,
  },
  searchInput: {
    height: INVENTORY_CONTROL_HEIGHT_PX + 2,
    minHeight: INVENTORY_CONTROL_HEIGHT_PX + 2,
    paddingVertical: 0,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.canvas,
  },
});
