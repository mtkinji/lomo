import type {TextStyle, ViewStyle} from 'react-native';
import {colors, radii, spacing, typography} from '../theme';

export type InputVariant = 'outline' | 'filled' | 'inline' | 'plain';
export type InputParentSurface = 'canvas' | 'muted';
export type InputSurfaceRole = 'field' | 'composer';
type Options = {
  variant?: InputVariant;
  elevation?: 'flat';
  accentLabelOnFocus?: boolean;
  onSurface?: InputParentSurface;
  surfaceRole?: InputSurfaceRole;
  size?: 'md' | 'sm';
};

/** Appearance only. Native editing, persistence and keyboard ownership stay in their hosts. */
export function resolveInputAppearance(options: Options) {
  const variant = options.variant ?? 'filled';
  const elevation = options.elevation ?? 'flat';
  const accentLabelOnFocus = options.accentLabelOnFocus ?? false;
  const plain = variant === 'plain' || variant === 'inline';
  const composer = options.surfaceRole === 'composer';
  const verticalInset = plain ? 0 : composer ? spacing.lg : spacing.sm;
  const textStyle: TextStyle = options.size === 'sm' || variant === 'inline' ? typography.bodySm : typography.body;
  const frameStyle: ViewStyle = {
    backgroundColor: plain ? 'transparent' : variant === 'outline' ? colors.canvas
      : options.onSurface === 'muted' ? colors.inputFillOnMuted : colors.inputFill,
    borderWidth: variant === 'outline' ? 1 : 0,
    borderColor: colors.muted,
    borderRadius: plain ? radii.none : composer ? radii.composer : radii.input,
    paddingHorizontal: plain ? 0 : composer ? spacing.lg : spacing.md,
    paddingVertical: verticalInset,
    minHeight: plain ? undefined : options.size === 'sm' ? 44 : 48,
    shadowOpacity: 0,
    elevation: 0,
  };
  return {variant, elevation, accentLabelOnFocus, frameStyle, textStyle, frameInset: 2 * (verticalInset + (variant === 'outline' ? 1 : 0))};
}

export function getInputTextViewport({viewportHeight, frameInset, footerHeight}: {
  viewportHeight?: number; frameInset: number; footerHeight: number;
}) {
  return viewportHeight == null ? Infinity : Math.max(0, viewportHeight - frameInset - footerHeight);
}
