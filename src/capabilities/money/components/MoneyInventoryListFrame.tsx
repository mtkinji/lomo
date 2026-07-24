import { Children, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts, spacing, typography } from '../../../theme';
import { Icon, type IconName } from '../../../ui/Icon';

export function MoneyInventoryListFrame({
  action,
  children,
  contentStyle,
  controls,
  count,
  style,
  variant = 'cards',
}: {
  action?: ReactNode;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  controls?: ReactNode;
  count?: { visible: number; total: number };
  style?: StyleProp<ViewStyle>;
  variant?: 'cards' | 'list';
}) {
  return (
    <View style={[styles.frame, style]}>
      <View style={styles.header}>
        <View style={styles.controlsSlot}>{controls}</View>
        {count || action ? (
          <View style={styles.trailing}>
            {count ? (
              <View style={styles.meta}>
                <Text style={styles.metaVisible}>{count.visible}</Text>
                <Text style={styles.metaSlash}>/</Text>
                <Text style={styles.metaTotal}>{count.total}</Text>
              </View>
            ) : null}
            {action}
          </View>
        ) : null}
      </View>
      <View style={[styles.content, variant === 'cards' ? styles.contentCards : styles.contentList, contentStyle]}>
        {children}
      </View>
    </View>
  );
}

export function MoneyInventoryControlGroup({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.controlGroup, style]}>
      {Children.toArray(children).map((child, index) => (
        <View key={index} style={styles.controlItem}>
          {index > 0 ? <View style={styles.controlDivider} /> : null}
          {child}
        </View>
      ))}
    </View>
  );
}

export function MoneyInventoryControlSurface({ active = false, count = 0, iconName }: {
  active?: boolean;
  count?: number;
  iconName: IconName;
}) {
  return (
    <View style={[styles.controlSurface, active ? styles.controlSurfaceActive : null]}>
      <Icon name={iconName} size={15} color={active ? colors.primaryForeground : colors.textPrimary} />
      {count > 0 ? <Text style={styles.controlCount}>{count}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { gap: spacing.sm },
  header: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  controlsSlot: { flex: 1, minWidth: 0 },
  trailing: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'baseline' },
  metaVisible: { ...typography.bodySm, fontFamily: fonts.bold, color: colors.textPrimary },
  metaSlash: { ...typography.bodySm, fontFamily: fonts.medium, color: colors.textSecondary, marginHorizontal: 2 },
  metaTotal: { ...typography.bodySm, fontFamily: fonts.medium, color: colors.textSecondary },
  content: { minWidth: 0 },
  contentCards: { gap: spacing.sm },
  contentList: { gap: spacing.sm },
  controlGroup: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.canvas },
  controlItem: { flexDirection: 'row', alignItems: 'stretch' },
  controlDivider: { width: 1, backgroundColor: colors.border },
  controlSurface: { minWidth: 40, height: 34, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: colors.canvas },
  controlSurfaceActive: { backgroundColor: colors.pine700 },
  controlCount: { fontSize: 12, lineHeight: 14, fontFamily: fonts.semibold, color: colors.primaryForeground, textAlign: 'center' },
});
