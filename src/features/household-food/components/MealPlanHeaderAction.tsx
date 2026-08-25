import { forwardRef, useLayoutEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../../theme';
import { Badge } from '../../../ui/Badge';
import { Pressable } from '../../../ui/HapticPressable';
import { Icon } from '../../../ui/Icon';
import { Text } from '../../../ui/Typography';
import { useAccessibilityPreferences } from '../../../ui/hooks/useAccessibilityPreferences';

function formatCount(count: number): string {
  return count > 99 ? '99+' : String(count);
}

export const MealPlanHeaderAction = forwardRef<View, {
  count?: number;
  needsAttention?: boolean;
  onPress(): void;
}>(function MealPlanHeaderAction({
  count = 0,
  needsAttention = false,
  onPress,
}, ref) {
  const countLabel = count === 1 ? '1 meal' : `${count} meals`;
  const { reduceMotionEnabled } = useAccessibilityPreferences();
  const badgeScale = useRef(new Animated.Value(1)).current;
  const numberProgress = useRef(new Animated.Value(1)).current;
  const transitionId = useRef(0);
  const [settledCount, setSettledCount] = useState(count);
  const numberDirection = count >= settledCount ? 1 : -1;
  const countIsChanging = settledCount !== count;

  useLayoutEffect(() => {
    if (!countIsChanging) return;
    if (reduceMotionEnabled) {
      transitionId.current += 1;
      badgeScale.stopAnimation();
      numberProgress.stopAnimation();
      badgeScale.setValue(1);
      numberProgress.setValue(1);
      setSettledCount(count);
      return;
    }
    transitionId.current += 1;
    const currentTransitionId = transitionId.current;
    badgeScale.stopAnimation();
    numberProgress.stopAnimation();
    numberProgress.setValue(0);
    const badgePulse = Animated.sequence([
      Animated.timing(badgeScale, {
        toValue: 1.18,
        duration: 110,
        useNativeDriver: true,
      }),
      Animated.spring(badgeScale, {
        toValue: 1,
        damping: 11,
        stiffness: 220,
        mass: 0.7,
        useNativeDriver: true,
      }),
    ]);
    const numberChange = Animated.timing(numberProgress, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    });
    Animated.parallel([badgePulse, numberChange]).start(({ finished }) => {
      if (finished && transitionId.current === currentTransitionId) {
        setSettledCount(count);
      }
    });
  }, [badgeScale, count, countIsChanging, numberProgress, reduceMotionEnabled]);

  const incomingNumberStyle = {
    opacity: numberProgress,
    transform: [{
      translateY: numberProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [numberDirection * 4, 0],
      }),
    }],
  };
  const outgoingNumberStyle = {
    opacity: numberProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    }),
    transform: [{
      translateY: numberProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, numberDirection * -4],
      }),
    }],
  };

  const accessibilityLabel = [
    'Meal plan',
    count > 0 ? countLabel : null,
    needsAttention ? 'new meal ideas' : null,
  ].filter(Boolean).join(', ');

  return (
    <Pressable
      ref={ref}
      testID="meal-plan-header-action"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
    >
      <Icon name="meal" size={15} color={colors.textPrimary} />
      <Text variant="label" style={styles.label}>
        Meal plan
      </Text>
      {count > 0 ? (
        <Animated.View style={{ transform: [{ scale: badgeScale }] }}>
          <Badge
            testID="meal-plan-header-count"
            style={styles.countBadge}
          >
            <View style={styles.countWindow}>
              {countIsChanging && !reduceMotionEnabled && settledCount > 0 ? (
                <Animated.Text
                  testID="meal-plan-header-count-outgoing"
                  accessible={false}
                  style={[styles.countText, styles.outgoingCountText, outgoingNumberStyle]}
                >
                  {formatCount(settledCount)}
                </Animated.Text>
              ) : null}
              <Animated.Text
                testID="meal-plan-header-count-current"
                accessible={false}
                style={[styles.countText, incomingNumberStyle]}
              >
                {formatCount(count)}
              </Animated.Text>
            </View>
          </Badge>
        </Animated.View>
      ) : needsAttention ? (
        <View testID="meal-plan-header-attention" style={styles.attention} />
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  action: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.fieldFill,
  },
  label: { color: colors.textPrimary },
  countBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    paddingVertical: 0,
    borderRadius: radii.pill,
    alignSelf: 'center',
    backgroundColor: colors.actionAttention,
  },
  countText: {
    ...typography.label,
    color: colors.actionAttentionForeground,
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
  },
  countWindow: {
    minWidth: 8,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  outgoingCountText: {
    position: 'absolute',
  },
  attention: {
    alignSelf: 'center',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.actionAttention,
  },
  pressed: { opacity: 0.64 },
});
