import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { spacing } from '../../theme';

type Props = {
  left?: ReactNode;
  children: ReactNode;
  right?: ReactNode;
  /**
   * When provided, the row becomes pressable.
   */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
};

/**
 * Canonical "3-column" row layout used throughout the app:
 * - left: fixed-width icon/checkbox column
 * - middle: flexible content column
 * - right: fixed-width affordance/actions column
 *
 * This is the foundation for the "column consistency" found in best-in-class task apps.
 */
export function ThreeColumnRow({
  left,
  children,
  right,
  onPress,
  style,
  contentStyle,
  accessibilityLabel,
  testID,
}: Props) {
  const content = (
    <View style={[styles.row, style]}>
      <View style={styles.left}>{left}</View>
      <View style={[styles.middle, contentStyle]}>{children}</View>
      <View style={styles.right}>{right}</View>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      // Ensure the pressable wrapper stretches so the middle flex column
      // can actually claim space (otherwise long labels can disappear).
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

// Match the "task app" grid: left column slightly wider to accommodate the main checkbox,
// right column slightly narrower but still tappable for affordances.
const LEFT_COLUMN_WIDTH = 46; // +12px vs prior 34 (within requested +8–16 range)
const RIGHT_COLUMN_WIDTH = 34;

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  left: {
    width: LEFT_COLUMN_WIDTH,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  middle: {
    flex: 1,
    // Critical for proper truncation/shrinking of long text in the middle column.
    // Without this, iOS can clip the entire label when the right column is present.
    minWidth: 0,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  right: {
    width: RIGHT_COLUMN_WIDTH,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});


