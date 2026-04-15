import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { colors, spacing, typography, fonts } from '../theme';

type StreakCapsuleProps = {
  streakCount: number;
  showedUpToday: boolean;
  shieldCount?: number;
  onPress?: () => void;
};

export function StreakCapsule({
  streakCount,
  showedUpToday,
  shieldCount = 0,
  onPress,
}: StreakCapsuleProps) {
  const hasStreak = streakCount > 0;
  const flameColor = showedUpToday ? '#F97316' : colors.sumi400;
  const shieldColor = colors.textSecondary;

  if (!hasStreak && shieldCount === 0) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${streakCount}-day streak, ${shieldCount} shields.`}
      onPress={onPress}
      style={({ pressed }) => [styles.capsule, pressed && styles.capsulePressed]}
    >
      {hasStreak ? (
        <View style={styles.stat}>
          <Icon name="flame" size={22} color={flameColor} />
          <Text style={[styles.statText, { color: flameColor }]}>{streakCount}</Text>
        </View>
      ) : null}
      <View style={styles.stat}>
        <Icon name="shield" size={20} color={shieldColor} />
        <Text style={[styles.statText, { color: shieldColor }]}>{shieldCount}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.fieldFill,
  },
  capsulePressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    ...typography.body,
    fontFamily: fonts.bold,
  },
});
