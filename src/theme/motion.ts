import { Easing, FadeIn, FadeOut } from 'react-native-reanimated';

/**
 * Central motion tokens for small overlays (menus, tiny popovers, etc.).
 * Keep these snappy so interactions feel effectively instant while still
 * having a bit of polish.
 */
export const motion = {
  menu: {
    // Target perceived latency under ~150–200ms for tap → settled state.
    entering: FadeIn.duration(140).easing(Easing.out(Easing.quad)),
    exiting: FadeOut.duration(120).easing(Easing.out(Easing.quad)),
  },
} as const;


