import type { ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../theme';
import {
  BUTTON_SIZE_TOKENS,
  BUTTON_VARIANT_TOKENS,
  type ButtonSizeToken,
  type ButtonVariantToken,
} from './buttonTokens';

type ButtonVariant =
  | 'default'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link'
  | 'accent'
  | 'ai'
  | 'destructive';
type ButtonSizeProp = 'sm' | 'md' | 'lg' | 'default' | 'small' | 'icon';

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

export function Button({
  variant = 'default',
  size = 'default',
  style,
  iconButtonSize,
  fullWidth,
  children,
  className,
  ...rest
}: Props) {
  const logicalSize: ButtonSizeToken =
    size === 'sm' || size === 'small' ? 'sm' : size === 'lg' ? 'lg' : 'md';
  const isIconOnly = size === 'icon' || Boolean(iconButtonSize);

  const sizeTokens = BUTTON_SIZE_TOKENS[logicalSize];

  const logicalVariant: ButtonVariantToken =
    variant === 'secondary'
      ? 'secondary'
      : variant === 'outline'
      ? 'outline'
      : variant === 'ghost'
      ? 'ghost'
      : variant === 'link'
      ? 'link'
      : variant === 'destructive'
      ? 'destructive'
      : 'primary';

  const variantTokens = BUTTON_VARIANT_TOKENS[logicalVariant];

  return (
    <Pressable
      {...rest}
      style={({ pressed }) => [
        // Base shape + sizing
        !isIconOnly && {
          borderRadius: 12,
          minHeight: sizeTokens.height,
          paddingHorizontal: sizeTokens.paddingHorizontal,
          paddingVertical: sizeTokens.paddingVertical,
          alignItems: 'center',
          justifyContent: 'center',
        },
        // Variant-specific backgrounds/borders
        {
          backgroundColor: variantTokens.backgroundColor,
          borderWidth: variantTokens.borderWidth ?? 0,
          borderColor: variantTokens.borderColor ?? 'transparent',
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
      {children}
    </Pressable>
  );
}

type IconButtonProps = Omit<Props, 'size' | 'iconButtonSize'>;

/**
 * Canonical circular icon button: pine background, fully rounded, fixed icon
 * sizing. Intended for header actions and compact icon-only controls.
 */
export function IconButton({ style, children, className, ...rest }: IconButtonProps) {
  return (
    <Pressable
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
}

