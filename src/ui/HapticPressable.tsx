import React, { forwardRef } from 'react';
import {
  Pressable as NativePressable,
  TouchableOpacity as NativeTouchableOpacity,
} from 'react-native';

import type { HapticsEvent } from '../services/HapticsService';
import { HapticsService } from '../services/HapticsService';
import { withHapticPress } from './haptics/withHapticPress';

type HapticControlProps = {
  /** A semantic override for this interaction, or false when the caller owns feedback. */
  haptic?: HapticsEvent | false;
};

type PressableProps = React.ComponentProps<typeof NativePressable> & HapticControlProps;

function withDefaultPressFeedback<T extends (...args: any[]) => void>(
  onPress: T | undefined,
  haptic: HapticsEvent | false,
): T | undefined {
  if (!onPress || haptic === false) return onPress;
  if (haptic !== 'canvas.selection') return withHapticPress(onPress as any, haptic) as T;

  return ((...args: Parameters<T>) => {
    const getTriggerSequence = HapticsService.getTriggerSequence?.bind(HapticsService);
    const triggerSequenceBeforePress = getTriggerSequence?.() ?? null;
    onPress(...args);
    if (triggerSequenceBeforePress === null || getTriggerSequence?.() === triggerSequenceBeforePress) {
      void HapticsService.trigger('canvas.selection');
    }
  }) as T;
}

/**
 * App-owned Pressable boundary. Every enabled press receives quiet feedback by
 * default while specialized controls can select a stronger semantic event.
 */
export const Pressable = forwardRef<React.ElementRef<typeof NativePressable>, PressableProps>(
  function HapticPressable({ haptic = 'canvas.selection', onPress, ...props }, ref) {
    const onPressWithHaptics = React.useMemo(
      () => withDefaultPressFeedback(onPress as any, haptic),
      [haptic, onPress],
    );

    return <NativePressable ref={ref} {...props} onPress={onPressWithHaptics as any} />;
  },
);

type TouchableOpacityProps = React.ComponentProps<typeof NativeTouchableOpacity> & HapticControlProps;

/** Backwards-compatible haptic boundary for the few remaining opacity controls. */
export const TouchableOpacity = forwardRef<
  React.ElementRef<typeof NativeTouchableOpacity>,
  TouchableOpacityProps
>(function HapticTouchableOpacity({ haptic = 'canvas.selection', onPress, ...props }, ref) {
  const onPressWithHaptics = React.useMemo(
    () => withDefaultPressFeedback(onPress as any, haptic),
    [haptic, onPress],
  );

  return <NativeTouchableOpacity ref={ref} {...props} onPress={onPressWithHaptics as any} />;
});
