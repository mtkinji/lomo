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


