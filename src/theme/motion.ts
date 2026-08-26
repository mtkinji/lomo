import { Easing, FadeInDown, FadeInUp, FadeOutDown, FadeOutUp, ReduceMotion } from 'react-native-reanimated';

/**
 * Central motion tokens for small overlays (menus, tiny popovers, etc.).
 * Keep these snappy so interactions feel effectively instant while still
 * having a bit of polish.
 */
export const motion = {
  menu: {
    // Target perceived latency under ~150–200ms for tap → settled state.
    entering: FadeInDown.duration(160)
      .easing(Easing.out(Easing.quad))
      .reduceMotion(ReduceMotion.System),
    exiting: FadeOutUp.duration(120)
      .easing(Easing.out(Easing.quad))
      .reduceMotion(ReduceMotion.System),
  },
  tray: {
    entering: FadeInUp.duration(260)
      .easing(Easing.out(Easing.quad))
      .reduceMotion(ReduceMotion.System),
    exiting: FadeOutDown.duration(150)
      .easing(Easing.in(Easing.quad))
      .reduceMotion(ReduceMotion.System),
  },
  drawer: {
    // Drawers cover meaningful distance, so the entrance must shed most of its
    // velocity early instead of reading as a constant-speed lift.
    enter: {
      character: 'decelerate',
      durationMs: 220,
      easing: Easing.out(Easing.cubic),
    },
    exit: {
      character: 'accelerate',
      durationMs: 180,
      easing: Easing.in(Easing.cubic),
    },
    resize: {
      character: 'decelerate',
      durationMs: 160,
      easing: Easing.out(Easing.cubic),
    },
    settle: {
      character: 'decelerate',
      durationMs: 200,
      easing: Easing.out(Easing.cubic),
    },
    rebound: {
      character: 'decelerate',
      durationMs: 180,
      easing: Easing.out(Easing.cubic),
    },
  },
} as const;
