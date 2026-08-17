import { Pressable, StyleSheet, View } from 'react-native';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';

import { HapticsService } from '../../../services/HapticsService';
import { colors, fonts, spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { Icon } from '../../../ui/Icon';
import { Text } from '../../../ui/Typography';
import type { RetailerPreference } from '../domain/onlineShoppingPreferences';

type Props = {
  retailers: RetailerPreference[];
  onOrderChange(retailers: RetailerPreference[]): void;
  onRemove(retailerId: RetailerPreference['id']): void;
};

function withRanks(retailers: RetailerPreference[]): RetailerPreference[] {
  return retailers.map((retailer, index) => ({ ...retailer, enabled: true, rank: index + 1 }));
}

export function RetailerPreferenceList({ retailers, onOrderChange, onRemove }: Props) {
  const ranked = [...retailers].sort((left, right) => left.rank - right.rank);
  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= ranked.length) return;
    const next = [...ranked];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onOrderChange(withRanks(next));
  };

  return (
    <DraggableFlatList
      accessibilityRole="list"
      activationDistance={8}
      data={ranked}
      keyExtractor={(retailer) => retailer.id}
      onDragBegin={() => { void HapticsService.trigger('canvas.selection'); }}
      onDragEnd={({ data }) => onOrderChange(withRanks(data))}
      scrollEnabled={false}
      renderItem={(params) => (
        <RetailerPreferenceRow
          {...params}
          count={ranked.length}
          onMove={move}
          onRemove={onRemove}
        />
      )}
    />
  );
}

function RetailerPreferenceRow({
  count,
  drag,
  getIndex,
  isActive,
  item,
  onMove,
  onRemove,
}: RenderItemParams<RetailerPreference> & {
  count: number;
  onMove(from: number, to: number): void;
  onRemove(retailerId: RetailerPreference['id']): void;
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
      accessibilityLabel={`${item.label}, position ${index + 1} of ${count}`}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'moveUp') onMove(index, index - 1);
        if (event.nativeEvent.actionName === 'moveDown') onMove(index, index + 1);
      }}
      style={[styles.row, isActive ? styles.rowActive : null]}
    >
      <Pressable
        accessibilityLabel={`Drag ${item.label}`}
        accessibilityRole="button"
        delayLongPress={100}
        hitSlop={10}
        onLongPress={drag}
        style={({ pressed }) => [styles.dragHandle, pressed ? styles.pressed : null]}
      >
        <Icon name="menu" size={20} color={colors.textSecondary} />
      </Pressable>
      <Text variant="body" style={styles.label}>{item.label}</Text>
      <Button
        accessibilityLabel={`Remove ${item.label}`}
        haptic={false}
        iconButtonSize={44}
        onPress={() => onRemove(item.id)}
        size="icon"
        variant="ghost"
      >
        <Icon name="close" size={19} color={colors.textSecondary} />
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.canvas,
  },
  rowActive: {
    backgroundColor: colors.fieldFill,
  },
  dragHandle: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  label: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    fontFamily: fonts.medium,
  },
  pressed: {
    backgroundColor: colors.fieldFillPressed,
  },
});
