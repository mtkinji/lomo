import { Pressable } from '@/src/ui/HapticPressable';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';
import { HapticsService } from '../../../services/HapticsService';
import { colors, fonts, spacing } from '../../../theme';
import { BottomDrawer } from '../../../ui/BottomDrawer';
import { Icon } from '../../../ui/Icon';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { SegmentedControl } from '../../../ui/SegmentedControl';
import {
  mergeMoneyCategoryGroupOrder,
  moneyCategoryOrderChanged,
  moveMoneyCategory,
  splitMoneyCategoriesByPlanRole,
} from '../domain/moneyCategoryOrder';

type ReorderCategory = {
  sourceId: string;
  name: string;
  planRole?: 'protected' | 'flexible';
};

type CategoryGroup = 'flexible' | 'committed';

export function MoneyCategoryReorderDrawer({
  categories,
  onClose,
  onSave,
  saving,
  visible,
}: {
  categories: readonly ReorderCategory[];
  onClose: () => void;
  onSave: (categoryIds: string[]) => Promise<void>;
  saving: boolean;
  visible: boolean;
}) {
  const initialGroups = splitMoneyCategoriesByPlanRole(categories);
  const [flexibleCategories, setFlexibleCategories] = useState<readonly ReorderCategory[]>(initialGroups.flexible);
  const [committedCategories, setCommittedCategories] = useState<readonly ReorderCategory[]>(initialGroups.committed);
  const [activeGroup, setActiveGroup] = useState<CategoryGroup>('flexible');
  const [error, setError] = useState<string | null>(null);
  const wasVisibleRef = useRef(false);

  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      const groups = splitMoneyCategoriesByPlanRole(categories);
      setFlexibleCategories(groups.flexible);
      setCommittedCategories(groups.committed);
      setActiveGroup(groups.flexible.length > 0 ? 'flexible' : 'committed');
      setError(null);
    }
    wasVisibleRef.current = visible;
  }, [categories, visible]);

  const saveOrder = async (
    nextFlexible: readonly ReorderCategory[],
    nextCommitted: readonly ReorderCategory[],
  ) => {
    setError(null);
    try {
      const completeOrder = mergeMoneyCategoryGroupOrder(categories, nextFlexible, nextCommitted);
      await onSave(completeOrder.map((category) => category.sourceId));
      void HapticsService.trigger('outcome.success');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The category order could not be saved.');
    }
  };

  const moveCategory = (group: CategoryGroup, sourceId: string, offset: -1 | 1) => {
    if (saving) return;
    const current = group === 'flexible' ? flexibleCategories : committedCategories;
    const next = moveMoneyCategory(current, sourceId, offset);
    if (next === current) return;

    if (group === 'flexible') setFlexibleCategories(next);
    else setCommittedCategories(next);
    void HapticsService.trigger('canvas.selection');
    void saveOrder(
      group === 'flexible' ? next : flexibleCategories,
      group === 'committed' ? next : committedCategories,
    );
  };
  const activeCategories = activeGroup === 'flexible' ? flexibleCategories : committedCategories;
  const setActiveCategories = activeGroup === 'flexible' ? setFlexibleCategories : setCommittedCategories;
  const activeGroupLabel = activeGroup === 'flexible' ? 'Flexible spending' : 'Committed spending';
  const reorderActiveCategories = (next: readonly ReorderCategory[]) => {
    if (saving || !moneyCategoryOrderChanged(activeCategories, next)) return;
    setActiveCategories(next);
    void saveOrder(
      activeGroup === 'flexible' ? next : flexibleCategories,
      activeGroup === 'committed' ? next : committedCategories,
    );
  };

  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      snapPoints={['82%']}
      keyboardAvoidanceEnabled={false}
    >
      <View style={styles.container}>
        <BottomDrawerHeader
          title="Reorder categories"
          variant="withClose"
          closeAccessibilityLabel="Close category reordering"
          onClose={onClose}
        />
        {error ? <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <SegmentedControl
          accessibilityLabel="Category list"
          accessibilityState={{ disabled: saving }}
          onChange={setActiveGroup}
          options={[
            { value: 'flexible', label: 'Flexible spending' },
            { value: 'committed', label: 'Committed spending' },
          ]}
          size="compact"
          style={styles.groupControl}
          testIDPrefix="money-category-reorder.group"
          value={activeGroup}
        />
        <DraggableFlatList
          activationDistance={8}
          contentContainerStyle={styles.listContent}
          data={[...activeCategories]}
          key={activeGroup}
          keyExtractor={(category) => category.sourceId}
          onDragBegin={() => { void HapticsService.trigger('canvas.selection'); }}
          onDragEnd={({ data }) => reorderActiveCategories(data)}
          renderItem={(params) => (
            <CategoryOrderRow
              {...params}
              count={activeCategories.length}
              disabled={saving}
              group={activeGroup}
              groupLabel={activeGroupLabel}
              onMove={moveCategory}
            />
          )}
        />
      </View>
    </BottomDrawer>
  );
}

function CategoryOrderRow({
  count,
  disabled,
  drag,
  getIndex,
  group,
  groupLabel,
  isActive,
  item,
  onMove,
}: RenderItemParams<ReorderCategory> & {
  count: number;
  disabled: boolean;
  group: CategoryGroup;
  groupLabel: string;
  onMove: (group: CategoryGroup, sourceId: string, offset: -1 | 1) => void;
}) {
  const index = getIndex?.() ?? 0;
  const actions = disabled ? [] : [
    ...(index > 0 ? [{ name: 'moveUp', label: 'Move up' }] : []),
    ...(index < count - 1 ? [{ name: 'moveDown', label: 'Move down' }] : []),
  ];
  return (
    <View
      accessible
      accessibilityActions={actions}
      accessibilityLabel={`${item.name}, position ${index + 1} of ${count} in ${groupLabel}`}
      accessibilityState={{ disabled }}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'moveUp') onMove(group, item.sourceId, -1);
        if (event.nativeEvent.actionName === 'moveDown') onMove(group, item.sourceId, 1);
      }}
      style={[styles.row, isActive ? styles.rowActive : null]}
    >
      <Text numberOfLines={2} style={styles.categoryName}>{item.name}</Text>
      <Pressable
        accessibilityLabel={`Drag ${item.name}`}
        accessibilityRole="button"
        delayLongPress={100}
        disabled={disabled}
        hitSlop={10}
        onLongPress={drag}
        style={({ pressed }) => [styles.dragHandle, pressed ? styles.dragHandlePressed : null]}
      >
        <Icon name="menu" size={20} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg },
  listContent: { paddingBottom: spacing.xl },
  groupControl: { alignSelf: 'stretch', marginBottom: spacing.sm },
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    backgroundColor: colors.canvas,
  },
  rowActive: { backgroundColor: colors.fieldFill, borderRadius: 12 },
  categoryName: { flex: 1, color: colors.textPrimary, fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, fontWeight: '500' },
  dragHandle: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  dragHandlePressed: { backgroundColor: colors.fieldFillPressed },
  error: { color: colors.destructive, fontSize: 14, lineHeight: 20, paddingBottom: spacing.sm },
});
