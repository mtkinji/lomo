import { colors } from './colors';
import { spacing } from './spacing';
import { fonts, typography } from './typography';
import { cardElevation } from './surfaces';
import { durations, easings } from './motion';
import { hexToRgba } from './colorUtils';

function pxify(record: Record<string, number>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(record)) out[k] = `${v}px`;
  return out;
}

function buildFontSize(): Record<string, [string, { lineHeight: string; letterSpacing?: string }]> {
  const out: Record<string, [string, { lineHeight: string; letterSpacing?: string }]> = {};
  for (const [name, t] of Object.entries(typography)) {
    const size = `${(t as any).fontSize as number}px`;
    const lineHeight = `${(t as any).lineHeight as number}px`;
    const letterSpacing =
      typeof (t as any).letterSpacing === 'number' ? `${(t as any).letterSpacing}px` : undefined;
    out[name] = [size, letterSpacing ? { lineHeight, letterSpacing } : { lineHeight }];
  }
  return out;
}

function shadowToCss(s: {
  shadowColor: string;
  shadowOpacity: number;
  shadowOffset: { width: number; height: number };
  shadowRadius: number;
}): string {
  const color = s.shadowColor === 'transparent' ? 'transparent' : hexToRgba(s.shadowColor, s.shadowOpacity);
  return `${s.shadowOffset.width}px ${s.shadowOffset.height}px ${s.shadowRadius}px ${color}`;
}

function buildBoxShadow(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, spec] of Object.entries(cardElevation)) {
    out[name] = shadowToCss(spec as any);
  }
  return out;
}

/**
 * Kwilt Tailwind preset. Mechanical token -> theme mapping:
 *
 *   colors              <- @kwilt/tokens/colors
 *   spacing             <- @kwilt/tokens/spacing
 *   fontFamily          <- @kwilt/tokens/typography (fonts)
 *   fontSize            <- @kwilt/tokens/typography (typography.*)
 *   boxShadow           <- @kwilt/tokens/surfaces (cardElevation)
 *   transitionDuration  <- @kwilt/tokens/motion (durations)
 *   transitionTimingFunction <- @kwilt/tokens/motion (easings)
 *
 * The preset only extends; it does not override any default Tailwind keys, so
 * merging with an existing kwilt-site / desktop config is additive.
 */
export const kwiltTailwindPreset = {
  theme: {
    extend: {
      colors: { ...colors },
      spacing: pxify(spacing as unknown as Record<string, number>),
      fontFamily: {
        sans: [fonts.regular, 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        brand: [fonts.logo, 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'Menlo', 'monospace'],
      },
      fontSize: buildFontSize(),
      boxShadow: buildBoxShadow(),
      transitionDuration: Object.fromEntries(
        Object.entries(durations).map(([k, v]) => [k, `${v}ms`]),
      ),
      transitionTimingFunction: { ...easings },
    },
  },
};

export default kwiltTailwindPreset;
