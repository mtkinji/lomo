/**
 * Motion tokens — raw primitives suitable for web, desktop, and anywhere that
 * doesn't ship `react-native-reanimated`.
 *
 * Mobile's `src/theme/motion.ts` continues to emit Reanimated-specific objects
 * (entering/exiting animators) and is NOT replaced by this module. In a future
 * refactor mobile can derive its Reanimated values from these primitives so the
 * numbers stay in lockstep across clients.
 *
 * Shape:
 *   - `durations` (ms, number) — mapped onto CSS transition-duration.
 *   - `easings` (cubic-bezier strings) — mapped onto CSS transition-timing-function.
 *
 * Values mirror the mobile `motion.menu` token exactly so there is zero visual
 * change at M0.
 */
export const durations = {
  /** Menu / small popover enter. Matches mobile's Reanimated `FadeInDown.duration(160)`. */
  menuEnter: 160,
  /** Menu / small popover exit. Matches mobile's Reanimated `FadeOutUp.duration(120)`. */
  menuExit: 120,
} as const;

export const easings = {
  /** Approximates Reanimated `Easing.out(Easing.quad)`. */
  quadOut: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
} as const;

export type DurationToken = keyof typeof durations;
export type EasingToken = keyof typeof easings;
