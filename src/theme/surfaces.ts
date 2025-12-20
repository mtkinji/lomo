import { colors } from './colors';

export const cardElevation = {
  /**
   * Completely flat card surface. Useful for inline groupings and nested
   * cards that should visually merge with the canvas.
   */
  none: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
    elevation: 0,
  },
  /**
   * Default soft elevation used for most interactive cards. Matches the
   * previous global card shadow so existing layouts remain stable.
   */
  soft: {
    // Very soft, tight shadow so stacked lists don’t create a darker central “column”
    shadowColor: colors.accent,
    shadowOpacity: 0.025,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  /**
   * Medium elevation between `soft` and `raised`. Use for prominent in-canvas
   * affordances (like key actions) that need more lift than a card but should
   * not read like an overlay.
   */
  lift: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  /**
   * Stronger elevation for hero cards or key focus panels (e.g., FTUE
   * research questions, reveal cards).
   */
  raised: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
  },
  /**
   * Strong elevation for overlays, dropdowns, and menus that need to
   * clearly separate from the content below. Darker shadow than `raised`
   * to create more visual separation.
   */
  overlay: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 8,
  },
  /**
   * "Floating" elevation tuned for composer surfaces that sit above the page
   * canvas (e.g. chat composer). Slightly punchier than `raised`, less than
   * `overlay`, with a softer spread so it feels like it lifts off the page.
   */
  composer: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
    elevation: 6,
  },
} as const;

export const cardSurfaceStyle = {
  backgroundColor: colors.card,
  // ShadCN-style card radius – a bit larger than buttons so cards feel like containers
  borderRadius: 18,
  borderWidth: 1,
  borderColor: colors.border,
  // Compose in the default soft elevation so existing callers keep the same look.
  ...cardElevation.soft,
} as const;


