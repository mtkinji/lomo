import { Pressable } from '@/src/ui/HapticPressable';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../theme';
import { ButtonLabel } from '../../ui/primitives';
import {
  RESTING_COMPOSER_COMPACT_BOTTOM_OFFSET_PX,
  RESTING_COMPOSER_HEIGHT_PX,
  RESTING_COMPOSER_HORIZONTAL_INSET_PX,
} from '../../ui/layout/restingComposerMetrics';
import { FloatingControlSurface } from '../activities/FloatingControlSurface';
import { FloatingDockActionButton } from '../activities/FloatingDockActionButton';

type PlanActionDockProps = {
  recommendationsCount: number;
  onOpenRecommendations: () => void;
  onOpenChat: () => void;
};

export function PlanActionDock({
  recommendationsCount,
  onOpenRecommendations,
  onOpenChat,
}: PlanActionDockProps) {
  const recommendationLabel = recommendationsCount > 0
    ? `Plan this day · ${recommendationsCount}`
    : 'Plan this day';

  return (
    <View testID="plan-action-dock" pointerEvents="box-none" style={styles.dock}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={recommendationLabel}
        accessibilityHint="Opens planning recommendations for the selected day"
        onPress={onOpenRecommendations}
        style={({ pressed }) => [styles.planButton, pressed ? styles.pressed : null]}
      >
        <FloatingControlSurface
          borderRadius={RESTING_COMPOSER_HEIGHT_PX / 2}
          isProminent
          style={styles.planSurface}
          surfaceStyle={styles.planSurfaceContent}
        >
          <ButtonLabel tone="inverse">{recommendationLabel}</ButtonLabel>
        </FloatingControlSurface>
      </Pressable>
      <FloatingDockActionButton
        testID="plan-contextual-chat"
        accessibilityLabel="Chat about this day"
        accessibilityHint="Opens Chat with the selected Plan day"
        icon="navAiGuide"
        isProminent
        size={RESTING_COMPOSER_HEIGHT_PX}
        onPress={onOpenChat}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: RESTING_COMPOSER_HORIZONTAL_INSET_PX,
    right: RESTING_COMPOSER_HORIZONTAL_INSET_PX,
    bottom: RESTING_COMPOSER_COMPACT_BOTTOM_OFFSET_PX,
    height: RESTING_COMPOSER_HEIGHT_PX,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    zIndex: 60,
    elevation: 60,
  },
  planButton: {
    flex: 1,
    height: RESTING_COMPOSER_HEIGHT_PX,
  },
  planSurface: {
    flex: 1,
    height: RESTING_COMPOSER_HEIGHT_PX,
    backgroundColor: colors.primary,
  },
  planSurfaceContent: {
    height: RESTING_COMPOSER_HEIGHT_PX,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
});
