import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts, spacing, typography } from '../../../theme';

export {
  InventoryControlGroup as MoneyInventoryControlGroup,
  InventoryControlSurface as MoneyInventoryControlSurface,
} from '../../../ui/InventoryControlGroup';

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
});
