import { StyleSheet, ViewStyle, StyleProp, TouchableOpacity, View } from 'react-native';
import { VStack, Heading, Text, HStack } from '@gluestack-ui/themed';
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
        <Heading style={styles.goalTitle}>{title}</Heading>
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
    padding: spacing.lg,
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


