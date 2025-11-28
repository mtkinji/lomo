import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Button as ReusableButton } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { colors, spacing } from '../theme';

type ButtonVariant =
  | 'default'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link'
  | 'accent'
  | 'ai'
  | 'destructive';
type ButtonSize = 'default' | 'small' | 'icon';

type Props = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Optional override for circular icon buttons.
   * When provided, sets width/height/borderRadius to this value.
   */
  iconButtonSize?: number;
} & Omit<React.ComponentProps<typeof ReusableButton>, 'variant' | 'size'>;

export function Button({
  variant = 'default',
  size = 'default',
  style,
  iconButtonSize,
  children,
  ...rest
}: Props) {
  const mappedSize: 'default' | 'sm' | 'lg' | 'icon' =
    size === 'small' ? 'sm' : size === 'icon' ? 'icon' : 'default';

  const isSmall = size === 'small';
  const baseMinHeight = isSmall ? 32 : 40;
  const basePaddingHorizontal = isSmall ? spacing.md : spacing.lg;

  const combinedStyle: StyleProp<ViewStyle> = [
    // Minimal visual fallback so critical actions (e.g., destructive) still
    // read as buttons even if Tailwind styling is unavailable.
    // Skip these for explicit icon buttons so they can remain perfectly
    // circular and rely on iconButtonSize overrides instead.
    variant === 'destructive' && !iconButtonSize
      ? {
          backgroundColor: colors.destructive,
          borderRadius: 8,
          minHeight: baseMinHeight,
          paddingHorizontal: basePaddingHorizontal,
          alignItems: 'center',
          justifyContent: 'center',
        }
      : null,
    // For non-destructive variants, ensure the control still looks like a
    // tappable button (especially on native where Tailwind may be disabled),
    // again only when we are *not* in the special circular icon mode.
    variant !== 'destructive' && !iconButtonSize
      ? {
          borderRadius: 8,
          minHeight: baseMinHeight,
          paddingHorizontal: basePaddingHorizontal,
          alignItems: 'center',
          justifyContent: 'center',
          ...(variant === 'outline'
            ? {
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.canvas,
              }
            : null),
          ...(variant === 'ai'
            ? {
                backgroundColor: colors.accent,
              }
            : null),
        }
      : null,
    // Structural sizing only; all visual styling (colors, radius, borders)
    // from iconButtonSize overrides for circular icon buttons.
    iconButtonSize
      ? {
          width: iconButtonSize,
          height: iconButtonSize,
          borderRadius: iconButtonSize / 2,
        }
      : null,
    style,
  ];

  return (
    <ReusableButton
      {...rest}
      variant={variant === 'accent' || variant === 'ai' ? 'default' : variant}
      size={mappedSize}
      className={cn(
        iconButtonSize && 'rounded-full'
      )}
      // Preserve support for legacy React Native `style` usage while letting
      // NativeWind handle visual styling via `className`.
      style={combinedStyle}
    >
      {children}
    </ReusableButton>
  );
}

type IconButtonProps = Omit<Props, 'size' | 'iconButtonSize'>;

/**
 * Canonical circular icon button: pine background, fully rounded, fixed icon
 * sizing. Intended for header actions and compact icon-only controls.
 */
export function IconButton({ style, ...rest }: IconButtonProps) {
  return (
    <Button
      {...rest}
      size="icon"
      // Explicitly size + center the icon chip via React Native styles so it
      // looks correct even if NativeWind classes aren't fully applied.
      iconButtonSize={28}
      style={[
        {
          backgroundColor: colors.accent,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    />
  );
}

