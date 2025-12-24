import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { spacing } from '../../theme';

export type MasonryColumnSplit<T> = {
  left: T[];
  right: T[];
};

export function splitMasonryTwoColumn<T>(params: {
  items: T[];
  estimateItemHeight: (item: T) => number;
  rowGap?: number;
}): MasonryColumnSplit<T> {
  const { items, estimateItemHeight, rowGap = spacing.sm } = params;
  const left: T[] = [];
  const right: T[] = [];

  let leftTotal = 0;
  let rightTotal = 0;

  for (const item of items) {
    const h = estimateItemHeight(item);
    const hWithGap = h + rowGap;
    if (leftTotal <= rightTotal) {
      left.push(item);
      leftTotal += hWithGap;
    } else {
      right.push(item);
      rightTotal += hWithGap;
    }
  }

  return { left, right };
}

type MasonryTwoColumnProps<T> = {
  items: T[];
  /**
   * Width of the masonry container *inside* the app canvas gutters.
   * Typically measured via `onLayout`.
   */
  containerWidth: number;
  columnGap?: number;
  rowGap?: number;
  keyExtractor: (item: T, index: number) => string;
  estimateItemHeight: (item: T, params: { columnWidth: number }) => number;
  renderItem: (item: T, params: { columnWidth: number }) => React.ReactElement | null;
  style?: StyleProp<ViewStyle>;
};

export function MasonryTwoColumn<T>({
  items,
  containerWidth,
  columnGap = spacing.sm,
  rowGap = spacing.sm,
  keyExtractor,
  estimateItemHeight,
  renderItem,
  style,
}: MasonryTwoColumnProps<T>) {
  const columnWidth = React.useMemo(() => {
    if (!Number.isFinite(containerWidth) || containerWidth <= 0) return 0;
    return Math.max(0, (containerWidth - columnGap) / 2);
  }, [containerWidth, columnGap]);

  const columns = React.useMemo(() => {
    if (columnWidth <= 0) return { left: [] as T[], right: [] as T[] };
    return splitMasonryTwoColumn({
      items,
      rowGap,
      estimateItemHeight: (item) => estimateItemHeight(item, { columnWidth }),
    });
  }, [columnWidth, estimateItemHeight, items, rowGap]);

  if (columnWidth <= 0) return null;

  return (
    <View style={[styles.row, style]}>
      <View style={styles.column}>
        {columns.left.map((item, index) => (
          <View key={keyExtractor(item, index)} style={{ marginBottom: rowGap }}>
            {renderItem(item, { columnWidth })}
          </View>
        ))}
      </View>
      <View style={[styles.column, { marginLeft: columnGap }]}>
        {columns.right.map((item, index) => (
          <View key={keyExtractor(item, index)} style={{ marginBottom: rowGap }}>
            {renderItem(item, { columnWidth })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  column: {
    flex: 1,
  },
});


