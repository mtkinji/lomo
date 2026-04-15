import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { colors, spacing, typography, fonts } from '../theme';

const REPAIR_AMBER = '#F59E0B';

type StreakCapsuleProps = {
  streakCount: number;
  showedUpToday: boolean;
  shieldCount?: number;
  repairWindowActive?: boolean;
  onPress?: () => void;
};

export function StreakCapsule({
  streakCount,
  showedUpToday,
  shieldCount = 0,
  repairWindowActive = false,
  onPress,
}: StreakCapsuleProps) {
  const hasStreak = streakCount > 0;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!repairWindowActive) {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [repairWindowActive, pulseAnim]);

  const flameColor = repairWindowActive ? REPAIR_AMBER : showedUpToday ? '#F97316' : colors.sumi400;
  const shieldColor = colors.textSecondary;

  if (!hasStreak && shieldCount === 0 && !repairWindowActive) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        repairWindowActive
          ? `Streak broke! Repair window active. Tap to show up.`
          : `${streakCount}-day streak, ${shieldCount} shields.`
      }
      onPress={onPress}
      style={({ pressed }) => [styles.capsule, pressed && styles.capsulePressed]}
    >
      {(hasStreak || repairWindowActive) ? (
        <Animated.View style={[styles.stat, repairWindowActive && { opacity: pulseAnim }]}>
          <Icon name="flame" size={22} color={flameColor} />
          <Text style={[styles.statText, { color: flameColor }]}>{streakCount}</Text>
        </Animated.View>
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
