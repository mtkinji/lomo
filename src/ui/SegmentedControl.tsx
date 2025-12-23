import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, spacing, typography, fonts } from '../theme';
import { Text } from './Typography';

type SegmentedOption<Value extends string> = {
  value: Value;
  label: ReactNode;
};

type SegmentedControlSize = 'default' | 'compact';

type SegmentedControlProps<Value extends string> = {
  value: Value;
  onChange: (value: Value) => void;
  options: SegmentedOption<Value>[];
  style?: StyleProp<ViewStyle>;
  size?: SegmentedControlSize;
  /**
   * Optional stable testID prefix for E2E tests.
   * Each segment receives `testID="${testIDPrefix}.${option.value}"`.
   */
  testIDPrefix?: string;
};

/**
 * Pills-style segmented control with an animated thumb, used for simple
 * two- or three-way toggles in the app shell (e.g., Dev tools vs Components).
 */
export function SegmentedControl<Value extends string>({
  value,
  onChange,
  options,
  style,
  size = 'default',
  testIDPrefix,
}: SegmentedControlProps<Value>) {
  const [layouts, setLayouts] = useState<Record<string, { x: number; width: number }>>({});
  const thumbX = useRef(new Animated.Value(0)).current;
  const thumbWidth = useRef(new Animated.Value(0)).current;
  const isCompact = size === 'compact';

  useEffect(() => {
    const layout = layouts[value as string];
    if (!layout) return;

    Animated.spring(thumbX, {
      toValue: layout.x,
      damping: 16,
      stiffness: 180,
      mass: 0.7,
      useNativeDriver: false,
    }).start();
    Animated.spring(thumbWidth, {
      toValue: layout.width,
      damping: 16,
      stiffness: 180,
      mass: 0.7,
      useNativeDriver: false,
    }).start();
  }, [layouts, thumbWidth, thumbX, value]);

  return (
    <View style={[styles.outer, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.thumb,
          {
            width: thumbWidth,
            transform: [{ translateX: thumbX }],
          },
        ]}
      />
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            testID={testIDPrefix ? `${testIDPrefix}.${String(option.value)}` : undefined}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            style={[styles.segment, isCompact && styles.segmentCompact]}
            onLayout={(event) => {
              const { x, width } = event.nativeEvent.layout;
              setLayouts((current) => {
                const key = option.value as string;
                const existing = current[key];
                if (existing && existing.x === x && existing.width === width) {
                  return current;
                }
                return {
                  ...current,
                  [key]: { x, width },
                };
              });
            }}
            onPress={() => {
              if (!isSelected) {
                onChange(option.value);
              }
            }}
          >
            <Text
              style={[
                styles.label,
                isSelected && styles.labelActive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const trackPadding = spacing.xs * 0.75;
const segmentGap = trackPadding * 0.2;

const styles = StyleSheet.create({
  outer: {
    flexDirection: 'row',
    // By default, hug content and align to the left edge of the parent
    // (instead of stretching to full width and centering the pills).
    alignSelf: 'flex-start',
    padding: trackPadding,
    borderRadius: 999,
    backgroundColor: colors.shellAlt,
  },
  thumb: {
    position: 'absolute',
    top: trackPadding,
    bottom: trackPadding,
    borderRadius: 999,
    backgroundColor: colors.canvas,
  },
  segment: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    // Horizontal padding defines the pill width around the label.
    paddingHorizontal: spacing.md,
    marginHorizontal: segmentGap,
  },
  segmentCompact: {
    paddingVertical: spacing.sm * 0.75,
    paddingHorizontal: spacing.sm,
  },
  label: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  labelActive: {
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
});


