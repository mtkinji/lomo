import { StyleSheet, ViewStyle, StyleProp, TouchableOpacity, View } from 'react-native';
import { VStack, Heading, Text, HStack } from './primitives';
import { Icon } from './Icon';
import { cardSurfaceStyle, colors, spacing, typography } from '../theme';

type GoalCardProps = {
  title: string;
  /**
   * Optional secondary line just under the title – for example, the Arc name.
   */
  subtitle?: string;
  /**
   * Optional body text describing the goal ("why" or description).
   */
  body?: string;
  /**
   * Optional meta text shown on the left side of the footer row – typically
   * status or timeframe.
   */
  metaLeft?: string;
  /**
   * Optional meta text shown on the right side of the footer row – for example,
   * force/intent progress ("Activity 3/3 · Mastery 2/3").
   */
  metaRight?: string;
  /**
   * Optional priority indicator (1 = high, 2 = medium, 3 = low). When set to 1,
   * a star icon is displayed next to the title.
   */
  priority?: 1 | 2 | 3;
  /**
   * Optional click handler. When provided, the entire card becomes tappable.
   */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function GoalCard({
  title,
  subtitle,
  body,
  metaLeft,
  metaRight,
  priority,
  onPress,
  style,
}: GoalCardProps) {
  const Container: typeof TouchableOpacity | typeof View = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[styles.goalCard, style]}
      {...(onPress
        ? {
            activeOpacity: 0.85,
            onPress,
          }
        : null)}
    >
      <VStack space="xs">
        <HStack alignItems="center" space="xs">
          <Heading style={[styles.goalTitle, { flex: 1 }]}>{title}</Heading>
          {priority === 1 && <Icon name="starFilled" size={14} color={colors.turmeric} />}
        </HStack>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {body ? (
          <Text style={styles.goalDescription} numberOfLines={2}>
            {body}
          </Text>
        ) : null}
        {(metaLeft || metaRight) && (
          <HStack justifyContent="space-between" alignItems="center">
            {metaLeft ? <Text style={styles.metaText}>{metaLeft}</Text> : <View />}
            {metaRight ? <Text style={styles.metaText}>{metaRight}</Text> : null}
          </HStack>
        )}
      </VStack>
    </Container>
  );
}

const styles = StyleSheet.create({
  goalCard: {
    ...cardSurfaceStyle,
    padding: spacing.sm,
  },
  goalTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  goalDescription: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  metaText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});


