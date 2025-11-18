import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { HStack, VStack, Heading, Text, Pressable } from '@gluestack-ui/themed';
import { Icon, IconName } from '../Icon';
import { colors, spacing, typography } from '../../theme';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  /**
   * Optional leading icon that visually anchors the page.
   * For main tab screens we currently avoid this to reduce redundancy
   * with the bottom navigation icon.
   */
  iconName?: IconName;
  /**
   * When provided, shows an info icon button to the right of the title.
   */
  onPressInfo?: () => void;
  /**
   * Optional right-aligned element (e.g. primary action button).
   */
  rightElement?: ReactNode;
  /**
   * Optional content rendered below the main header row
   * (filters, tabs, meta, etc).
   */
  children?: ReactNode;
};

export function PageHeader({
  title,
  subtitle,
  iconName,
  onPressInfo,
  rightElement,
  children,
}: PageHeaderProps) {
  return (
    <VStack space="md" style={styles.container}>
      <HStack
        space="lg"
        justifyContent="space-between"
        alignItems="flex-start"
        style={styles.topRow}
      >
        <VStack space="xs" style={styles.leftColumn}>
          <HStack alignItems="center" space="sm">
            {iconName ? (
              <View style={styles.iconContainer}>
                <Icon name={iconName} size={18} color={colors.canvas} />
              </View>
            ) : null}
            <Heading style={styles.title}>{title}</Heading>
            {onPressInfo ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Learn about ${title.toLowerCase()}`}
                hitSlop={8}
                onPress={onPressInfo}
              >
                <Icon name="info" size={18} color={colors.textSecondary} />
              </Pressable>
            ) : null}
          </HStack>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </VStack>
        {rightElement ? <View style={styles.rightElement}>{rightElement}</View> : null}
      </HStack>
      {children}
    </VStack>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  topRow: {
    // Leave horizontal gutters to the AppShell so titles and cards align
  },
  leftColumn: {
    flex: 1,
    paddingRight: spacing.lg,
  },
  title: {
    ...typography.titleLg,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    // Use the pine accent so the header feels branded and consistent across pages
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightElement: {
    alignSelf: 'flex-start',
  },
});


