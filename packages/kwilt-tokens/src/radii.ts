/**
 * Semantic corner radii shared across Kwilt clients.
 *
 * Raw numbers belong here. Apps should consume semantic roles instead of
 * hard-coding `borderRadius` values or arbitrary Tailwind radius utilities.
 */
export const radii = {
  none: 0,
  xs: 4,
  sm: 6,
  control: 8,
  menuItem: 8,
  input: 12,
  card: 18,
  compactCard: 16,
  panel: 20,
  menu: 22,
  sheet: 28,
  deviceSheet: 44,
  hero: 28,
  pill: 999,
} as const;

export type RadiusRole = keyof typeof radii;
