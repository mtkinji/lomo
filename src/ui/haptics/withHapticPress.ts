import type { GestureResponderEvent } from 'react-native';
import { HapticsService, type HapticsEvent } from '../../services/HapticsService';

/**
 * Wrap an `onPress` handler to also fire a canonical haptic event.
 *
 * Notes:
 * - Respects the global in-app haptics toggle via `HapticsService.setEnabled`.
 * - Haptics are best-effort and never block the press handler.
 * - Defaults should generally use `canvas.selection` for lightweight tap feedback.
 */
export function withHapticPress<T extends (event: GestureResponderEvent) => void>(
  onPress: T | undefined,
  haptic: HapticsEvent | false | undefined,
): T | undefined {
  if (!onPress) return undefined;
  if (haptic === false || !haptic) return onPress;

  const wrapped = ((event: GestureResponderEvent) => {
    void HapticsService.trigger(haptic);
    onPress(event);
  }) as T;

  return wrapped;
}


