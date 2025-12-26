import React, { forwardRef } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';
import { ButtonContext } from './ButtonContext';
import {
  BUTTON_SIZE_TOKENS,
  BUTTON_VARIANT_TOKENS,
  type ButtonSizeToken,
  type ButtonVariantToken,
} from './buttonTokens';

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
type ButtonSizeProp = 'xs' | 'sm' | 'md' | 'lg' | 'default' | 'small' | 'icon';

type Props = {
  variant?: ButtonVariant;
  size?: ButtonSizeProp;
  children: ReactNode;
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
} & Omit<React.ComponentProps<typeof Pressable>, 'style'>;

export const Button = forwardRef<React.ElementRef<typeof Pressable>, Props>(function Button(
  {
    variant = 'default',
    size = 'default',
    style,
    iconButtonSize,
    fullWidth,
    children,
    className,
    ...rest
  },
  ref,
) {
  const logicalSize: ButtonSizeToken =
    size === 'xs'
      ? 'xs'
      : size === 'sm' || size === 'small'
        ? 'sm'
        : size === 'lg'
          ? 'lg'
          : 'md';
  const isIconOnly = size === 'icon' || Boolean(iconButtonSize);

  const sizeTokens = BUTTON_SIZE_TOKENS[logicalSize];
  const contextValue = React.useMemo(() => ({ size: logicalSize }), [logicalSize]);

  const logicalVariant: ButtonVariantToken =
    variant === 'secondary'
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
      : 'cta';

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

  return (
    <Pressable
      ref={ref}
      {...rest}
      style={({ pressed }) => [
        // Base shape + sizing
        !isIconOnly && {
          borderRadius: 12,
          height: sizeTokens.height,
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
      <ButtonContext.Provider value={contextValue}>{children}</ButtonContext.Provider>
    </Pressable>
  );
});

type IconButtonProps = Omit<Props, 'size' | 'iconButtonSize'>;

/**
 * Canonical circular icon button: pine background, fully rounded, fixed icon
 * sizing. Intended for header actions and compact icon-only controls.
 */
export const IconButton = forwardRef<React.ElementRef<typeof Pressable>, IconButtonProps>(
  function IconButton({ style, children, className, ...rest }, ref) {
    return (
      <Pressable
        ref={ref}
        {...rest}
        style={({ pressed }) => [
          {
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.accent,
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
        ]}
      >
        {children}
      </Pressable>
    );
  },
);

