import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';
import { HapticsService } from '../../../services/HapticsService';
import { colors, fonts, spacing } from '../../../theme';
import { BottomDrawer } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import { Icon } from '../../../ui/Icon';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { moneyCategoryOrderChanged, moveMoneyCategory } from '../domain/moneyCategoryOrder';

type ReorderCategory = {
  sourceId: string;
  name: string;
};

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
  const [localCategories, setLocalCategories] = useState<readonly ReorderCategory[]>(categories);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLocalCategories(categories);
    setError(null);
  }, [categories, visible]);

  const changed = moneyCategoryOrderChanged(categories, localCategories);
  const handleClose = () => {
    if (!saving) onClose();
  };
  const handleSave = async () => {
    if (!changed || saving) return;
    setError(null);
    try {
      await onSave(localCategories.map((category) => category.sourceId));
      void HapticsService.trigger('outcome.success');
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The category order could not be saved.');
    }
  };

  const moveCategory = (sourceId: string, offset: -1 | 1) => {
    setLocalCategories((current) => moveMoneyCategory(current, sourceId, offset));
    void HapticsService.trigger('canvas.selection');
  };

  return (
    <BottomDrawer
      visible={visible}
      onClose={handleClose}
      dismissable={!saving}
      snapPoints={['82%']}
      keyboardAvoidanceEnabled={false}
    >
      <View style={styles.container}>
        <BottomDrawerHeader
          title="Reorder categories"
          variant="navbar"
          leftAction={(
            <Button accessibilityLabel="Cancel category reordering" disabled={saving} haptic={false} onPress={handleClose} size="sm" variant="link">
              Cancel
            </Button>
          )}
          rightAction={(
            <Button
              accessibilityLabel="Save category order"
              disabled={!changed || saving}
              haptic={false}
              onPress={() => { void handleSave(); }}
              size="sm"
              variant="link"
            >
              {saving ? 'Saving…' : 'Done'}
            </Button>
          )}
        />
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <DraggableFlatList
          activationDistance={8}
          contentContainerStyle={styles.listContent}
          data={[...localCategories]}
          keyExtractor={(category) => category.sourceId}
          onDragBegin={() => { void HapticsService.trigger('canvas.selection'); }}
          onDragEnd={({ data }) => setLocalCategories(data)}
          renderItem={(params) => (
            <CategoryOrderRow
              {...params}
              count={localCategories.length}
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
  drag,
  getIndex,
  isActive,
  item,
  onMove,
}: RenderItemParams<ReorderCategory> & {
  count: number;
  onMove: (sourceId: string, offset: -1 | 1) => void;
}) {
  const index = getIndex?.() ?? 0;
  const actions = [
    ...(index > 0 ? [{ name: 'moveUp', label: 'Move up' }] : []),
    ...(index < count - 1 ? [{ name: 'moveDown', label: 'Move down' }] : []),
  ];
  return (
    <View
      accessible
      accessibilityActions={actions}
      accessibilityLabel={`${item.name}, position ${index + 1} of ${count}`}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'moveUp') onMove(item.sourceId, -1);
        if (event.nativeEvent.actionName === 'moveDown') onMove(item.sourceId, 1);
      }}
      style={[styles.row, isActive ? styles.rowActive : null]}
    >
      <Text numberOfLines={2} style={styles.categoryName}>{item.name}</Text>
      <Pressable
        accessibilityLabel={`Drag ${item.name}`}
        accessibilityRole="button"
        delayLongPress={100}
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
  listContent: { paddingBottom: spacing['3xl'] },
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
