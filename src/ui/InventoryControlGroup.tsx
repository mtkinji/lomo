import { Children, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, spacing } from '../theme';
import { Icon, type IconName } from './Icon';

export const INVENTORY_CONTROL_HEIGHT_PX = 34;
export const INVENTORY_CONTROL_MIN_WIDTH_PX = 40;

export function InventoryControlGroup({
  children,
  style,
  testID,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <View testID={testID} style={[styles.controlGroup, style]}>
      {Children.toArray(children).map((child, index) => (
        <View key={index} style={styles.controlItem}>
          {index > 0 ? <View style={styles.controlDivider} /> : null}
          {child}
        </View>
      ))}
    </View>
  );
}

export function InventoryControlSurface({
  active = false,
  count = 0,
  iconName,
  testID,
}: {
  active?: boolean;
  count?: number;
  iconName: IconName;
  testID?: string;
}) {
  return (
    <View testID={testID} style={[styles.controlSurface, active ? styles.controlSurfaceActive : null]}>
      <Icon name={iconName} size={15} color={active ? colors.primaryForeground : colors.textPrimary} />
      {count > 0 ? <Text style={styles.controlCount}>{count}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  controlGroup: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.canvas,
  },
  controlItem: { flexDirection: 'row', alignItems: 'stretch' },
  controlDivider: { width: 1, backgroundColor: colors.border },
  controlSurface: {
    minWidth: INVENTORY_CONTROL_MIN_WIDTH_PX,
    height: INVENTORY_CONTROL_HEIGHT_PX,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: colors.canvas,
  },
  controlSurfaceActive: { backgroundColor: colors.pine700 },
  controlCount: {
    fontSize: 12,
    lineHeight: 14,
    fontFamily: fonts.semibold,
    color: colors.primaryForeground,
    textAlign: 'center',
  },
});
