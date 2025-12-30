import type { ReactNode, Ref } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { Card, type CardElevation, type CardPadding } from './Card';
import { Button } from './Button';
import { Icon } from './Icon';
import { ButtonLabel, Heading, HStack, Text, VStack } from './primitives';
import { colors, spacing, typography } from '../theme';
import { opportunityElevation } from '../theme/surfaces';

type OpportunityCardProps = {
  /**
   * Optional header row rendered above the title/body. Useful for "Suggested" style
   * modules that need a left label + right pill.
   */
  header?: ReactNode;
  title: ReactNode;
  body: ReactNode;

  ctaLabel: ReactNode;
  onPressCta: () => void;
  ctaVariant?: React.ComponentProps<typeof Button>['variant'];
  ctaLeadingIconName?: React.ComponentProps<typeof Icon>['name'];
  ctaAccessibilityLabel?: string;
  ctaSize?: React.ComponentProps<typeof Button>['size'];
  /**
   * Optional ref hook for coachmarks / guided tours (points at the primary CTA target).
   */
  ctaTargetRef?: Ref<View>;

  /**
   * Optional secondary CTA (e.g. "Not now").
   */
  secondaryCtaLabel?: ReactNode;
  onPressSecondaryCta?: () => void;
  secondaryCtaVariant?: React.ComponentProps<typeof Button>['variant'];
  secondaryCtaLeadingIconName?: React.ComponentProps<typeof Icon>['name'];
  secondaryCtaAccessibilityLabel?: string;
  secondaryCtaSize?: React.ComponentProps<typeof Button>['size'];

  /**
   * Alignment for the CTA row (especially for "inline" actions inside list canvases).
   * Defaults to 'left' to preserve existing card layouts.
   */
  ctaAlign?: 'left' | 'right';

  /**
   * Surface tint for opportunity/highlight cards.
   * - 'brand' (default): solid brand panel (upgrade-invite style)
   * - 'full': stronger pine-tinted surface to read as a highlighted module
   * - 'opportunity': lighter pine tint
   * - 'default': standard white card surface
   */
  tone?: 'brand' | 'full' | 'opportunity' | 'default';
  /**
   * Shadow treatment for opportunity/highlight cards.
   * - 'layered' (default): double-shadow "floating surface" (ambient + contact)
   * - 'single': use Card elevation tokens
   */
  shadow?: 'layered' | 'single';
  elevation?: CardElevation;
  padding?: CardPadding;
  style?: StyleProp<ViewStyle>;
};

export function OpportunityCard({
  header,
  title,
  body,
  ctaLabel,
  onPressCta,
  ctaVariant = 'ai',
  ctaLeadingIconName = 'sparkles',
  ctaAccessibilityLabel,
  ctaSize,
  ctaTargetRef,
  secondaryCtaLabel,
  onPressSecondaryCta,
  secondaryCtaVariant = 'outline',
  secondaryCtaLeadingIconName,
  secondaryCtaAccessibilityLabel,
  secondaryCtaSize,
  ctaAlign = 'left',
  tone = 'brand',
  shadow = 'layered',
  elevation = 'composer',
  padding = 'md',
  style,
}: OpportunityCardProps) {
  const isBrand = tone === 'brand';

  const resolveCtaLabelTone = (
    variant: React.ComponentProps<typeof Button>['variant'] | undefined,
  ): 'inverse' | 'accent' | 'default' => {
    // On saturated brand surfaces, "ghost" CTAs should read as white text.
    // (We use this for subtle secondary actions like "Not now".)
    if (isBrand && variant === 'ghost') return 'inverse';

    if (
      variant === 'ai' ||
      variant === 'cta' ||
      variant === 'primary' ||
      variant === 'destructive' ||
      variant === 'turmeric'
    ) {
      return 'inverse';
    }

    if (variant === 'link' || variant === 'inverse') return 'accent';

    return 'default';
  };

  const resolveCtaIconColor = (tone: 'inverse' | 'accent' | 'default') =>
    tone === 'inverse' ? colors.canvas : tone === 'accent' ? colors.accent : colors.textPrimary;

  const primaryCtaLabelTone = resolveCtaLabelTone(ctaVariant);
  const primaryCtaIconColor = resolveCtaIconColor(primaryCtaLabelTone);

  const secondaryCtaLabelTone = resolveCtaLabelTone(secondaryCtaVariant);
  const secondaryCtaIconColor = resolveCtaIconColor(secondaryCtaLabelTone);

  const surfaceStyle =
    tone === 'brand'
      ? { backgroundColor: colors.pine700, borderColor: 'transparent', borderWidth: 0 }
      : tone === 'full'
      ? { backgroundColor: colors.pine100, borderColor: colors.pine200 }
      : tone === 'opportunity'
        ? { backgroundColor: colors.pine50, borderColor: colors.pine200 }
        : null;

  const titleTone = isBrand ? 'inverse' : 'default';
  const bodyTone = isBrand ? 'inverse' : 'secondary';
  const brandCopyStyle = isBrand ? { color: colors.parchment } : null;
  const brandBodyStyle = isBrand ? { color: colors.parchment, opacity: 0.92 } : null;
  const isBodyText = typeof body === 'string' || typeof body === 'number';

  const content = (
    <VStack space="sm">
      {header ? <View style={styles.headerRow}>{header}</View> : null}
      {title != null ? (
        <Heading variant="sm" tone={titleTone} style={[styles.title, brandCopyStyle]}>
          {title}
        </Heading>
      ) : null}
      {body != null && isBodyText ? (
        <Text tone={bodyTone} style={[styles.body, brandBodyStyle]}>
          {body}
        </Text>
      ) : body != null ? (
        <View style={styles.bodySlot}>{body}</View>
      ) : null}

      <View style={[styles.ctaRow, ctaAlign === 'right' ? styles.ctaRowRight : null]}>
        {secondaryCtaLabel && onPressSecondaryCta ? (
          <HStack
            alignItems="center"
            space="sm"
            justifyContent={ctaAlign === 'right' ? 'flex-end' : undefined}
          >
            {ctaAlign === 'right' ? (
              <>
                <Button
                  variant={secondaryCtaVariant}
                  size={secondaryCtaSize}
                  onPress={onPressSecondaryCta}
                  accessibilityLabel={
                    secondaryCtaAccessibilityLabel ??
                    (typeof secondaryCtaLabel === 'string' ? secondaryCtaLabel : 'Secondary call to action')
                  }
                >
                  <HStack alignItems="center" justifyContent="center" space="xs">
                    {secondaryCtaLeadingIconName ? (
                      <Icon name={secondaryCtaLeadingIconName} size={14} color={secondaryCtaIconColor} />
                    ) : null}
                    <ButtonLabel tone={secondaryCtaLabelTone}>{secondaryCtaLabel}</ButtonLabel>
                  </HStack>
                </Button>
                <Button
                  ref={ctaTargetRef as any}
                  collapsable={false}
                  variant={ctaVariant}
                  size={ctaSize}
                  onPress={onPressCta}
                  accessibilityLabel={
                    ctaAccessibilityLabel ?? (typeof ctaLabel === 'string' ? ctaLabel : 'Call to action')
                  }
                >
                  <HStack alignItems="center" justifyContent="center" space="xs">
                    {ctaLeadingIconName ? (
                      <Icon name={ctaLeadingIconName} size={14} color={primaryCtaIconColor} />
                    ) : null}
                    <ButtonLabel tone={primaryCtaLabelTone}>{ctaLabel}</ButtonLabel>
                  </HStack>
                </Button>
              </>
            ) : (
              <>
                <Button
                  ref={ctaTargetRef as any}
                  collapsable={false}
                  variant={ctaVariant}
                  size={ctaSize}
                  onPress={onPressCta}
                  accessibilityLabel={
                    ctaAccessibilityLabel ?? (typeof ctaLabel === 'string' ? ctaLabel : 'Call to action')
                  }
                >
                  <HStack alignItems="center" justifyContent="center" space="xs">
                    {ctaLeadingIconName ? (
                      <Icon name={ctaLeadingIconName} size={14} color={primaryCtaIconColor} />
                    ) : null}
                    <ButtonLabel tone={primaryCtaLabelTone}>{ctaLabel}</ButtonLabel>
                  </HStack>
                </Button>
                <Button
                  variant={secondaryCtaVariant}
                  size={secondaryCtaSize}
                  onPress={onPressSecondaryCta}
                  accessibilityLabel={
                    secondaryCtaAccessibilityLabel ??
                    (typeof secondaryCtaLabel === 'string' ? secondaryCtaLabel : 'Secondary call to action')
                  }
                >
                  <HStack alignItems="center" justifyContent="center" space="xs">
                    {secondaryCtaLeadingIconName ? (
                      <Icon name={secondaryCtaLeadingIconName} size={14} color={secondaryCtaIconColor} />
                    ) : null}
                    <ButtonLabel tone={secondaryCtaLabelTone}>{secondaryCtaLabel}</ButtonLabel>
                  </HStack>
                </Button>
              </>
            )}
          </HStack>
        ) : (
          <Button
            ref={ctaTargetRef as any}
            collapsable={false}
            fullWidth
            variant={ctaVariant}
            size={ctaSize}
            onPress={onPressCta}
            accessibilityLabel={
              ctaAccessibilityLabel ?? (typeof ctaLabel === 'string' ? ctaLabel : 'Call to action')
            }
          >
            <HStack alignItems="center" justifyContent="center" space="xs">
              {ctaLeadingIconName ? <Icon name={ctaLeadingIconName} size={14} color={primaryCtaIconColor} /> : null}
              <ButtonLabel tone={primaryCtaLabelTone}>{ctaLabel}</ButtonLabel>
            </HStack>
          </Button>
        )}
      </View>
    </VStack>
  );

  if (shadow === 'single') {
    return (
      <Card elevation={elevation} padding={padding} style={[styles.card, surfaceStyle, style]}>
        {content}
      </Card>
    );
  }

  // Layered/double shadow (outer ambient + inner contact).
  // Card itself is rendered flat so it doesn't contribute an extra shadow layer.
  return (
    <View style={[styles.layerOuter, opportunityElevation.outer, surfaceStyle, style]}>
      <View style={[styles.layerInner, opportunityElevation.inner, surfaceStyle]}>
        <Card elevation="none" padding={padding} style={[styles.card, surfaceStyle]}>
          {content}
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 0,
  },
  layerOuter: {
    borderRadius: 18,
  },
  layerInner: {
    borderRadius: 18,
  },
  title: {
    ...typography.titleSm,
  },
  body: {
    ...typography.bodySm,
  },
  headerRow: {
    // Let callers control typography; just keep the rhythm consistent.
    marginBottom: spacing.xs,
  },
  bodySlot: {
    width: '100%',
  },
  ctaRow: {
    marginTop: spacing.xs,
  },
  ctaRowRight: {
    alignItems: 'flex-end',
  },
});


