/**
 * Overlay tokens (scrims, etc.) shared across drawers, sheets, dialogs, and full-screen moments.
 *
 * Important: scrim colors are specified WITHOUT alpha. Components should apply the
 * desired opacity via animated styles so we don't "double alpha" when animating.
 */
export const scrims = {
  /**
   * Subtle dim used for contextual guidance. Draws attention without feeling modal.
   */
  subtle: {
    color: '#0F172A',
    maxOpacity: 0.18,
  },
  /**
   * Default dim for modal drawers/sheets/dialogs.
   */
  default: {
    color: '#0F172A',
    maxOpacity: 0.5,
  },
  /**
   * Strong dim for full takeovers or high-stakes confirmations.
   */
  strong: {
    color: '#0F172A',
    maxOpacity: 0.7,
  },
  /**
   * Brand-tinted subtle dim for guidance moments.
   */
  pineSubtle: {
    color: '#06180D',
    maxOpacity: 0.22,
  },
  /**
   * Brand-tinted dim for immersive drawers (e.g. Agent workspace).
   */
  pine: {
    color: '#06180D',
    maxOpacity: 0.7,
  },
} as const;

export type ScrimToken = keyof typeof scrims;

/**
 * Blur/material tokens (e.g. iOS-like frosted buttons over imagery).
 *
 * Note: use `expo-blur`'s `BlurView` with these intensities/tints, then layer a subtle
 * tinted overlay on top to match our palette.
 */
export const blurs = {
  headerAction: {
    intensity: 34,
    tint: 'light' as const,
    /**
     * Base overlay color layered on top of the blur.
     *
     * We intentionally bias this toward a light (white/gray) material so
     * header action pills remain readable over *dark* hero imagery.
     */
    overlayColor: 'rgba(255,255,255,0.28)',
    /**
     * Use a light border so the pill edge remains visible on dark images.
     * The blur + overlay already provides separation on light images.
     */
    borderColor: 'rgba(255,255,255,0.22)',
  },
  /**
   * Header action material tuned for *light* surfaces (white canvas).
   *
   * The default `headerAction` token is intentionally biased toward dark/hero imagery
   * (very light border/tint) so it can be nearly invisible on white. This variant
   * increases edge contrast while keeping the same frosted feel.
   */
  headerActionOnLight: {
    intensity: 34,
    tint: 'light' as const,
    // Darker overlay so the frosted pill reads clearly on white.
    overlayColor: 'rgba(15,23,42,0.12)',
    // Stronger border to establish the control boundary on white backgrounds.
    borderColor: 'rgba(15,23,42,0.24)',
  },
} as const;


