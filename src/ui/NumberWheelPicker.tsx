import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { FlatList, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { fonts } from '../theme/typography';

type NumberWheelPickerProps = {
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  step?: number;
  /**
   * Height of each row in the wheel.
   */
  itemHeight?: number;
  /**
   * How many items should be visible at once (must be odd).
   */
  visibleItemCount?: number;
  /**
   * Render function for labels (defaults to String(value)).
   */
  formatLabel?: (value: number) => string;
};

export function NumberWheelPicker({
  value,
  onChange,
  min,
  max,
  step = 1,
  itemHeight = 44,
  visibleItemCount = 5,
  formatLabel,
}: NumberWheelPickerProps) {
  const listRef = useRef<FlatList<number> | null>(null);

  const safeVisibleCount = visibleItemCount % 2 === 1 ? visibleItemCount : visibleItemCount + 1;
  const paddingVertical = (Math.floor(safeVisibleCount / 2) * itemHeight);

  const values = useMemo(() => {
    const start = Math.min(min, max);
    const end = Math.max(min, max);
    const out: number[] = [];
    for (let v = start; v <= end; v += step) out.push(v);
    return out;
  }, [min, max, step]);

  const clampedValue = Math.min(Math.max(value, Math.min(min, max)), Math.max(min, max));
  const indexForValue = useCallback(
    (v: number) => {
      const idx = Math.round((v - Math.min(min, max)) / step);
      return Math.min(values.length - 1, Math.max(0, idx));
    },
    [min, max, step, values.length],
  );

  const scrollToValue = useCallback(
    (v: number, animated: boolean) => {
      const index = indexForValue(v);
      listRef.current?.scrollToOffset({ offset: index * itemHeight, animated });
    },
    [indexForValue, itemHeight],
  );

  useEffect(() => {
    // initial positioning
    scrollToValue(clampedValue, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // keep the wheel aligned if value changes externally
    scrollToValue(clampedValue, true);
  }, [clampedValue, scrollToValue]);

  const commitFromOffset = useCallback(
    (offsetY: number) => {
      const rawIndex = Math.round(offsetY / itemHeight);
      const index = Math.min(values.length - 1, Math.max(0, rawIndex));
      const next = values[index] ?? clampedValue;
      if (next !== clampedValue) onChange(next);
    },
    [clampedValue, itemHeight, onChange, values],
  );

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      commitFromOffset(e.nativeEvent.contentOffset.y);
    },
    [commitFromOffset],
  );

  const onScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      // If the user drags slowly and releases without momentum, this fires.
      commitFromOffset(e.nativeEvent.contentOffset.y);
    },
    [commitFromOffset],
  );

  const labelFor = useCallback(
    (v: number) => (formatLabel ? formatLabel(v) : String(v)),
    [formatLabel],
  );

  return (
    <View style={[styles.container, { height: safeVisibleCount * itemHeight }]}>
      <FlatList
        ref={(r) => {
          listRef.current = r;
        }}
        data={values}
        keyExtractor={(item) => String(item)}
        showsVerticalScrollIndicator={false}
        bounces={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumEnd}
        onScrollEndDrag={onScrollEndDrag}
        contentContainerStyle={{ paddingVertical }}
        getItemLayout={(_, index) => ({
          length: itemHeight,
          offset: itemHeight * index,
          index,
        })}
        renderItem={({ item }) => {
          const selected = item === clampedValue;
          return (
            <View style={[styles.row, { height: itemHeight }]}>
              <Text style={[styles.label, selected && styles.labelSelected]}>{labelFor(item)}</Text>
            </View>
          );
        }}
      />

      {/* Selection rails */}
      <View
        pointerEvents="none"
        style={[
          styles.rail,
          { top: paddingVertical + itemHeight, height: 1 },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.rail,
          { top: paddingVertical + itemHeight * 2, height: 1 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.titleSm,
    fontFamily: fonts.semibold,
    color: colors.textSecondary,
  },
  labelSelected: {
    color: colors.textPrimary,
  },
  rail: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.border,
    borderRadius: 999,
    opacity: 0.8,
  },
});


