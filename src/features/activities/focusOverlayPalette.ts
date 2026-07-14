export const FOCUS_OVERLAY_COLOR_KEYS = [
  'pine',
  'madder',
  'orange',
  'turmeric',
  'blue',
  'indigo',
  'violet',
] as const;

export type FocusOverlayColorKey = (typeof FOCUS_OVERLAY_COLOR_KEYS)[number];

export function focusOverlayColorKeyForIndex(index: number): FocusOverlayColorKey {
  if (!Number.isFinite(index) || index < 0) return 'pine';
  return FOCUS_OVERLAY_COLOR_KEYS[Math.floor(index) % FOCUS_OVERLAY_COLOR_KEYS.length] ?? 'pine';
}
