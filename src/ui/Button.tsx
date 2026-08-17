import React, { forwardRef } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, spacing } from '../theme';
import { ButtonContext } from './ButtonContext';
import { ButtonLabel } from './Typography';
import type { HapticsEvent } from '../services/HapticsService';
import {
  BUTTON_SIZE_TOKENS,
  BUTTON_VARIANT_TOKENS,
  type ButtonSizeToken,
  type ButtonTextTone,
  type ButtonVariantToken,
} from './buttonTokens';
import { withHapticPress } from './haptics/withHapticPress';
import { KwiltLoader } from './KwiltLoader';

type ButtonVariant =
  | 'default'
  | 'cta'
  | 'primary'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link'
  | 'accent'
  | 'ai'
  | 'inverse'
  | 'destructive'
  | 'turmeric';
type ButtonSizeProp = 'xs' | 'sm' | 'md' | 'lg' | 'default' | 'small' | 'compact' | 'icon';

type Props = {
  variant?: ButtonVariant;
  size?: ButtonSizeProp;
  /**
   * Primary button content. Prefer passing a string for standard button labels.
   */
  children?: ReactNode;
  /**
   * Backwards-compatible label prop used by older screens. If `children` is not
   * provided, `label` will be used as the button content.
   */
  label?: ReactNode;
  /**
   * Layout-only adjustments such as flex, width, alignment, or margins.
   * Button color and shape belong to semantic variants and the shared primitive.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Optional className carried over from the previous Tailwind/ShadCN
   * implementation. Kept for type compatibility but currently ignored.
   */
  className?: string;
  /**
   * Optional override for circular icon buttons.
   * When provided, sets width/height/borderRadius to this value.
   */
  iconButtonSize?: number;
  /**
   * When true, stretches the button to fill the horizontal space.
   */
  fullWidth?: boolean;
  /**
   * Distinct in-progress state. Loading buttons stay visually prominent, stop
   * accepting presses, expose busy semantics, and show a spinner.
   */
  loading?: boolean;
  /** Replaces the normal label while loading, e.g. "Opening…". */
  loadingLabel?: ReactNode;
  /**
   * Optional haptics event for the press. Defaults to `canvas.selection`.
   * Set to `false` to disable haptics for this button.
   */
  haptic?: HapticsEvent | false;
} & Omit<React.ComponentProps<typeof Pressable>, 'style'>;

export const Button = forwardRef<React.ElementRef<typeof Pressable>, Props>(function Button(
  {
    variant = 'primary',
    size = 'default',
    style,
    iconButtonSize,
    fullWidth,
    loading = false,
    loadingLabel,
    children,
    label,
    className,
    haptic = 'canvas.selection',
    ...rest
  },
  ref,
) {
  const logicalSize: ButtonSizeToken =
    size === 'xs'
      ? 'xs'
      : size === 'sm' || size === 'small' || size === 'compact'
        ? 'sm'
        : size === 'lg'
          ? 'lg'
          : 'md';
  const isIconOnly = size === 'icon' || Boolean(iconButtonSize);

  const sizeTokens = BUTTON_SIZE_TOKENS[logicalSize];
  const contextValue = React.useMemo(() => ({ size: logicalSize }), [logicalSize]);

  const logicalVariant: ButtonVariantToken =
    variant === 'cta' || variant === 'accent'
      ? 'cta'
      : variant === 'secondary'
      ? 'secondary'
      : variant === 'primary'
      ? 'primary'
      : variant === 'outline'
      ? 'outline'
      : variant === 'ghost'
      ? 'ghost'
      : variant === 'link'
      ? 'link'
      : variant === 'ai'
      ? 'ai'
      : variant === 'inverse'
      ? 'inverse'
      : variant === 'destructive'
      ? 'destructive'
      : variant === 'turmeric'
      ? 'turmeric'
      : 'primary';

  const variantTokens = BUTTON_VARIANT_TOKENS[logicalVariant];
  // Ensure button sizing is consistent across variants. Outline/secondary variants
  // draw a 1px border; if other solid variants omit borderWidth entirely, their
  // rendered size can differ by ~2px (top+bottom). We reserve border space for
  // all "button-like" variants while keeping ghost/link borderless.
  const shouldReserveBorderSpace = logicalVariant !== 'ghost' && logicalVariant !== 'link';
  const resolvedBorderWidth =
    variantTokens.borderWidth ?? (shouldReserveBorderSpace ? 1 : 0);
  const resolvedBorderColor =
    variantTokens.borderColor ?? (shouldReserveBorderSpace ? 'transparent' : 'transparent');

  const resolvedChildren = children ?? label;
  const visibleChildren = loading ? loadingLabel ?? resolvedChildren : resolvedChildren;
  const shouldWrapChildrenAsLabel =
    typeof visibleChildren === 'string' || typeof visibleChildren === 'number';
  const labelTone = variantTokens.textTone;
  const { onPress, accessibilityRole, accessibilityState, hitSlop, disabled, ...pressableRest } = rest;
  const isDisabled = Boolean(disabled || loading);
  const resolvedAccessibilityState = {
    ...accessibilityState,
    disabled: isDisabled,
    ...(loading ? { busy: true } : null),
  };
  const onPressWithHaptics = React.useMemo(() => withHapticPress(onPress as any, haptic), [onPress, haptic]);
  const visualTargetSize = isIconOnly ? iconButtonSize ?? 28 : sizeTokens.height;
  const minimumTargetInset = Math.max(0, (44 - visualTargetSize) / 2);
  const resolvedHitSlop = hitSlop ?? (minimumTargetInset > 0
    ? {
        top: minimumTargetInset,
        bottom: minimumTargetInset,
        left: minimumTargetInset,
        right: minimumTargetInset,
      }
    : undefined);

  return (
    <Pressable
      ref={ref}
      {...pressableRest}
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityState={resolvedAccessibilityState}
      disabled={isDisabled}
      hitSlop={resolvedHitSlop}
      onPress={onPressWithHaptics as any}
      style={({ pressed }) => [
        // Base shape + sizing
        !isIconOnly && {
          borderRadius: radii.pill,
          minHeight: sizeTokens.height,
          paddingHorizontal: sizeTokens.paddingHorizontal,
          paddingVertical: sizeTokens.paddingVertical,
          alignItems: 'center',
          justifyContent: 'center',
        },
        // Ensure gradient overlays clip cleanly.
        variant === 'ai'
          ? {
              position: 'relative',
              overflow: 'hidden',
            }
          : null,
        // Variant-specific backgrounds/borders
        {
          backgroundColor: variantTokens.backgroundColor,
          borderWidth: resolvedBorderWidth,
          borderColor: resolvedBorderColor,
          width: fullWidth ? '100%' : undefined,
        },
        // Icon-only circular buttons.
        isIconOnly
          ? {
              width: iconButtonSize ?? 28,
              height: iconButtonSize ?? 28,
              borderRadius: (iconButtonSize ?? 28) / 2,
              alignItems: 'center',
              justifyContent: 'center',
            }
          : null,
        // Press feedback
        pressed
          ? {
              opacity: 0.9,
              transform: [{ scale: 0.97 }],
            }
          : null,
        style,
        disabled && !loading ? { opacity: 0.5 } : null,
      ]}
    >
      {variant === 'ai' ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          <LinearGradient
            colors={[colors.aiGradientStart, colors.aiGradientEnd]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
        </View>
      ) : null}
      <ButtonContext.Provider value={contextValue}>
        {loading ? (
          <View style={styles.loadingContent}>
            <KwiltLoader
              accessible={false}
              color={getIndicatorColor(labelTone)}
              size="small"
            />
            {shouldWrapChildrenAsLabel ? <ButtonLabel tone={labelTone}>{visibleChildren}</ButtonLabel> : visibleChildren}
          </View>
        ) : shouldWrapChildrenAsLabel ? (
          <ButtonLabel tone={labelTone}>{visibleChildren}</ButtonLabel>
        ) : (
          visibleChildren
        )}
      </ButtonContext.Provider>
    </Pressable>
  );
});

type IconButtonProps = Omit<Props, 'size' | 'iconButtonSize'>;

/**
 * Canonical circular icon button: Sumi background, fully rounded, fixed icon
 * sizing. Intended for header actions and compact icon-only controls.
 */
export const IconButton = forwardRef<React.ElementRef<typeof Pressable>, IconButtonProps>(
  function IconButton({ style, children, className, variant = 'primary', loading = false, loadingLabel, ...rest }, ref) {
    const DEFAULT_ICON_BUTTON_SIZE = 44;
    const shouldWrapChildrenAsLabel = typeof children === 'string' || typeof children === 'number';
    const logicalVariant: ButtonVariantToken =
      variant === 'cta' || variant === 'accent'
        ? 'cta'
        : variant === 'secondary'
        ? 'secondary'
        : variant === 'primary'
          ? 'primary'
          : variant === 'outline'
            ? 'outline'
            : variant === 'ghost'
              ? 'ghost'
              : variant === 'link'
                ? 'link'
                : variant === 'ai'
                  ? 'ai'
                  : variant === 'inverse'
                    ? 'inverse'
                    : variant === 'destructive'
                      ? 'destructive'
                      : variant === 'turmeric'
                        ? 'turmeric'
                        : 'primary';
    const variantTokens = BUTTON_VARIANT_TOKENS[logicalVariant];
    const shouldReserveBorderSpace = logicalVariant !== 'ghost' && logicalVariant !== 'link';
    const resolvedBorderWidth =
      variantTokens.borderWidth ?? (shouldReserveBorderSpace ? 1 : 0);
    const resolvedBorderColor =
      variantTokens.borderColor ?? (shouldReserveBorderSpace ? 'transparent' : 'transparent');
    const { onPress, accessibilityRole, accessibilityState, disabled, ...pressableRest } = rest;
    const isDisabled = Boolean(disabled || loading);
    const resolvedAccessibilityState = {
      ...accessibilityState,
      disabled: isDisabled,
      ...(loading ? { busy: true } : null),
    };
    const onPressWithHaptics = React.useMemo(
      () => withHapticPress(onPress as any, 'canvas.selection'),
      [onPress],
    );
    return (
      <Pressable
        ref={ref}
        {...pressableRest}
        accessibilityRole={accessibilityRole ?? 'button'}
        accessibilityState={resolvedAccessibilityState}
        disabled={isDisabled}
        onPress={onPressWithHaptics as any}
        style={({ pressed }) => [
          {
            width: DEFAULT_ICON_BUTTON_SIZE,
            height: DEFAULT_ICON_BUTTON_SIZE,
            borderRadius: DEFAULT_ICON_BUTTON_SIZE / 2,
            backgroundColor: variantTokens.backgroundColor,
            borderWidth: resolvedBorderWidth,
            borderColor: resolvedBorderColor,
            alignItems: 'center',
            justifyContent: 'center',
          },
          pressed
            ? {
                opacity: 0.85,
                transform: [{ scale: 0.95 }],
              }
            : null,
          style,
          disabled && !loading ? { opacity: 0.5 } : null,
        ]}
      >
        {loading ? (
          <KwiltLoader accessible={false} color={getIndicatorColor(variantTokens.textTone)} size="small" />
        ) : shouldWrapChildrenAsLabel ? (
          <ButtonLabel tone={variantTokens.textTone}>{children}</ButtonLabel>
        ) : (
          children
        )}
      </Pressable>
    );
  },
);

function getIndicatorColor(tone: ButtonTextTone): string {
  if (tone === 'inverse') return colors.canvas;
  if (tone === 'accent') return colors.accent; // @kwilt-brand-moment: explicit accent/inverse variant loading indicator
  if (tone === 'destructive') return colors.destructive;
  return colors.textPrimary;
}

const styles = StyleSheet.create({
  loadingContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
  },
});
