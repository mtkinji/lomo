import type { ReactNode } from 'react';
import React from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../theme';
import { IconButton } from '../Button';
import { bottomDrawerChromeTokens } from '../drawerTokens';
import { Icon } from '../Icon';
import { HStack, VStack } from '../Stack';
import { Heading, Text } from '../Typography';

type BottomDrawerHeaderVariant = 'default' | 'withClose' | 'navbar' | 'minimal' | 'immersive';

type BottomDrawerHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
  onClose?: () => void;
  closeAccessibilityLabel?: string;
  closeTone?: 'default' | 'inverse';
  titleVariant?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'center';
  variant?: BottomDrawerHeaderVariant;
  showDivider?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
};

/**
 * Bottom drawer header patterns:
 * - default: custom left/right actions (no implicit close)
 * - withClose: auto-inject close icon if onClose provided
 * - navbar: centered title with explicit left/right actions (Cancel/Done pattern)
 * - minimal: title-only (no actions)
 *
 * @example Default with close
 * <BottomDrawerHeader variant="withClose" title="Share goal" onClose={dismiss} />
 *
 * @example Edit context
 * <BottomDrawerHeader variant="navbar" title="Edit" leftAction={...} rightAction={...} />
 *
 * @example With footer CTA
 * <BottomDrawerHeader variant="minimal" title="Filters" />
 */
export function BottomDrawerHeader({
  title,
  subtitle,
  leftAction,
  rightAction,
  onClose,
  closeAccessibilityLabel = 'Close',
  closeTone = 'default',
  titleVariant = bottomDrawerChromeTokens.standard.titleVariant,
  align = 'left',
  variant = 'default',
  showDivider = false,
  containerStyle,
  titleStyle,
  subtitleStyle,
}: BottomDrawerHeaderProps) {
  const effectiveAlign: 'left' | 'center' = variant === 'navbar' ? 'center' : align;
  const textAlign: TextStyle['textAlign'] = effectiveAlign === 'center' ? 'center' : 'left';
  const stackAlign: ViewStyle['alignItems'] =
    effectiveAlign === 'center' ? 'center' : 'flex-start';
  const effectiveLeftAction = variant === 'minimal' ? undefined : leftAction;
  const effectiveRightAction = (() => {
    if (variant === 'minimal') {
      return undefined;
    }
    if (variant === 'withClose' && !rightAction && onClose) {
      return (
        <BottomDrawerHeaderClose
          onPress={onClose}
          accessibilityLabel={closeAccessibilityLabel}
          tone={closeTone}
        />
      );
    }
    return rightAction;
  })();
  const renderTitle = () => {
    if (typeof title === 'string' || typeof title === 'number') {
      return (
        <Heading variant={titleVariant} style={[styles.title, { textAlign }, titleStyle]}>
          {title}
        </Heading>
      );
    }
    return title;
  };

  return (
    <View
      testID="bottom-drawer.header"
      style={[
        styles.container,
        variant === 'immersive' ? styles.immersiveContainer : null,
        containerStyle,
      ]}
    >
      <HStack alignItems="center" justifyContent="space-between">
        {effectiveLeftAction ? (
          <View testID="bottom-drawer.header-left-action" style={[styles.actionSlot, styles.leftActionSlot]}>
            {effectiveLeftAction}
          </View>
        ) : null}
        <VStack space="xs" style={styles.titleStack} alignItems={stackAlign}>
          {renderTitle()}
          {subtitle ? (
            <Text style={[styles.subtitle, { textAlign }, subtitleStyle]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </VStack>
        {effectiveRightAction ? (
          <View testID="bottom-drawer.header-right-action" style={[styles.actionSlot, styles.rightActionSlot]}>
            {effectiveRightAction}
          </View>
        ) : null}
      </HStack>
      {showDivider ? <View style={styles.divider} /> : null}
    </View>
  );
}

export function BottomDrawerHeaderClose(props: {
  onPress: () => void;
  accessibilityLabel?: string;
  tone?: 'default' | 'inverse';
}) {
  const { onPress, accessibilityLabel = 'Close', tone = 'default' } = props;
  return (
    <IconButton accessibilityLabel={accessibilityLabel} onPress={onPress} variant="ghost">
      <Icon name="close" size={18} color={tone === 'inverse' ? colors.parchment : colors.textPrimary} />
    </IconButton>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  titleStack: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.textPrimary,
  },
  subtitle: {
    color: colors.textSecondary,
  },
  actionSlot: {
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftActionSlot: { marginLeft: -spacing.md },
  rightActionSlot: { marginRight: -spacing.md },
  divider: {
    marginTop: spacing.sm,
    height: 1,
    backgroundColor: colors.border,
  },
  immersiveContainer: {
    minHeight: 48,
    justifyContent: 'center',
    paddingTop: spacing.sm,
    paddingBottom: 0,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
