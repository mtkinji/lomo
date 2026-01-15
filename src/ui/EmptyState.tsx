import type { ReactNode } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, spacing, typography } from '../theme';
import { Button } from './Button';
import { HStack, VStack } from './Stack';
import { ButtonLabel, Heading, Text } from './Typography';
import { Icon, type IconName } from './Icon';

type EmptyStateVariant = 'screen' | 'list' | 'compact';

export type EmptyStateProps = {
  title: ReactNode;
  /**
   * Single-sentence instruction. Keep this short and lightweight.
   */
  instructions?: ReactNode;
  /**
   * Controls vertical density and whether the illustration should be emphasized.
   * - 'list' (default): aligned with existing list empty states across canvases
   * - 'screen': larger illustration + more breathing room
   * - 'compact': tight spacing (useful for nested empties like Goal:Plan)
   */
  variant?: EmptyStateVariant;
  /**
   * Optional override for the illustration. Set to `null` to suppress the image.
   */
  illustration?: ImageSourcePropType | null;
  /**
   * Optional icon to show instead of an illustration.
   */
  iconName?: IconName;
  /**
   * Optional action slot (buttons/links). This stays flexible for cases that need
   * refs/wrappers (e.g. onboarding rings) without the EmptyState owning button logic.
   */
  actions?: ReactNode;
  /**
   * Convenience actions for the common "simple + CTA" empty-state pattern.
   * If `actions` is provided, it takes precedence.
   */
  primaryAction?: Omit<React.ComponentProps<typeof Button>, 'children'> & { label: ReactNode };
  secondaryAction?: Omit<React.ComponentProps<typeof Button>, 'children'> & { label: ReactNode };
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
};

const DEFAULT_ILLUSTRATION = require('../../assets/illustrations/empty.png');

export function EmptyState({
  title,
  instructions,
  actions,
  primaryAction,
  secondaryAction,
  variant = 'list',
  illustration = DEFAULT_ILLUSTRATION,
  iconName,
  style,
  contentStyle,
  imageStyle,
}: EmptyStateProps) {
  const showIllustration = illustration != null && !iconName;
  const imageSize = variant === 'screen' ? 220 : variant === 'compact' ? 120 : 170;
  const iconSize = variant === 'screen' ? 120 : variant === 'compact' ? 64 : 80;

  const renderAction = (
    action: (Omit<React.ComponentProps<typeof Button>, 'children'> & { label: ReactNode }) | undefined,
    fallbackVariant: React.ComponentProps<typeof Button>['variant'],
  ) => {
    if (!action) return null;

    const { label, variant: providedVariant, size, ...rest } = action;
    const resolvedVariant = providedVariant ?? fallbackVariant;
    const labelTone =
      resolvedVariant === 'outline' || resolvedVariant === 'ghost' || resolvedVariant === 'link'
        ? 'default'
        : 'inverse';

    return (
      <Button {...rest} variant={resolvedVariant} size={size}>
        <ButtonLabel tone={labelTone}>{label}</ButtonLabel>
      </Button>
    );
  };

  return (
    <View style={[styles.container, variant === 'screen' ? styles.containerScreen : styles.containerList, style]}>
      <VStack space="sm" style={[styles.content, contentStyle]}>
        {iconName ? (
          <View style={styles.iconWrapper} accessibilityElementsHidden accessibilityRole="none">
            <Icon
              name={iconName}
              size={iconSize}
              color={colors.border}
              strokeWidth={1}
            />
          </View>
        ) : showIllustration ? (
          <View style={styles.imageWrapper} accessibilityElementsHidden accessibilityRole="none">
            <Image
              source={illustration as ImageSourcePropType}
              style={[{ width: imageSize, height: imageSize }, styles.image, imageStyle]}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </View>
        ) : null}

        <Heading style={styles.title}>{title}</Heading>
        {instructions ? <Text style={styles.instructions}>{instructions}</Text> : null}
        {actions ? (
          <View style={styles.actions}>{actions}</View>
        ) : primaryAction || secondaryAction ? (
          <HStack style={styles.actions} space="sm" alignItems="center">
            {renderAction(primaryAction, 'default')}
            {renderAction(secondaryAction, 'outline')}
          </HStack>
        ) : null}
      </VStack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  containerList: {
    marginTop: spacing['2xl'],
  },
  containerScreen: {
    marginTop: spacing.xl,
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    opacity: 0.5,
  },
  imageWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  image: {
    opacity: 0.95,
  },
  title: {
    ...typography.titleSm,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  instructions: {
    ...typography.bodySm,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 340,
  },
  actions: {
    marginTop: spacing.sm,
  },
});


