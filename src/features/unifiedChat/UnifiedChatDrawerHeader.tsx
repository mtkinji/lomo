import { StyleSheet, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { Icon } from '../../ui/Icon';
import { BottomDrawerHeader } from '../../ui/layout/BottomDrawerHeader';
import { Text } from '../../ui/Typography';

export function UnifiedChatDrawerHeader({ title }: { title: string }) {
  const usesCompactTitle = title.length <= 22;

  return (
    <BottomDrawerHeader
      variant="immersive"
      title={(
        <View style={styles.titleContent}>
          <Icon name="messageSquare" size={16} color={colors.textSecondary} />
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
        </View>
      )}
      containerStyle={usesCompactTitle ? styles.titleRailCompact : styles.titleRailLong}
    />
  );
}

const styles = StyleSheet.create({
  titleRailCompact: {
    minHeight: 48,
    paddingTop: spacing.sm,
    paddingRight: '48%',
  },
  titleRailLong: {
    minHeight: 60,
    paddingTop: spacing.xl,
  },
  titleContent: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    minWidth: 0,
    flexShrink: 1,
    ...typography.bodySm,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
