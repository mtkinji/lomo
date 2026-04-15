import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ProfileAvatar } from './ProfileAvatar';
import { Icon } from './Icon';
import { colors, spacing, typography, fonts } from '../theme';

type StreakCapsuleProps = {
  avatarName?: string;
  avatarUrl?: string | null;
  streakCount: number;
  showedUpToday: boolean;
  graceDaysRemaining?: number;
  onPress?: () => void;
};

export function StreakCapsule({
  avatarName,
  avatarUrl,
  streakCount,
  showedUpToday,
  graceDaysRemaining,
  onPress,
}: StreakCapsuleProps) {
  const hasStreak = streakCount > 0;
  const flameColor = showedUpToday ? colors.pine700 : '#A8A29E';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${streakCount}-day streak. Open settings.`}
      onPress={onPress}
      style={({ pressed }) => [styles.capsule, pressed && styles.capsulePressed]}
    >
      <ProfileAvatar name={avatarName} avatarUrl={avatarUrl} size={32} borderRadius={16} />
      {hasStreak ? (
        <View style={styles.streakInfo}>
          <Icon name="flame" size={22} color={flameColor} />
          <Text style={[styles.streakCount, { color: flameColor }]}>{streakCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.xs,
    paddingRight: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.fieldFill,
  },
  capsulePressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  streakInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  streakCount: {
    ...typography.body,
    fontFamily: fonts.bold,
  },
});
