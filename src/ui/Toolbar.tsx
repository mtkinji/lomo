import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../theme';
import { Icon, type IconName } from './Icon';

export type ToolbarButtonVariant = 'secondary' | 'primary';
type GroupPosition = 'single' | 'first' | 'middle' | 'last';

export type ToolbarButtonProps = {
  accessibilityLabel: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: ToolbarButtonVariant;
  /**
   * Optional visual tone overlays. Use `ai` to apply the app-wide AI gradient
   * styling while keeping the underlying button variant semantics intact.
   */
  tone?: 'ai';
  /**
   * Optional icon rendered on the left of the label (or centered if no label).
   */
  icon?: IconName;
  label?: string;
  /**
   * Internal: provided by ToolbarGroup to render a segmented set.
   */
  groupPosition?: GroupPosition;
  grouped?: boolean;
};

export function Toolbar({
  children,
  style,
  center = false,
}: {
  children: React.ReactNode;
  style?: any;
  center?: boolean;
}) {
  return (
    <View style={[styles.container, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={[styles.row, center ? styles.rowCentered : null]}
        // Toolbars frequently sit near active text inputs. We never want incidental taps
        // on "toolbar whitespace" to dismiss the keyboard; only explicit actions should.
        keyboardShouldPersistTaps="always"
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function ToolbarGroup({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  const items = React.Children.toArray(children).filter(Boolean);

  return (
    <View style={[styles.group, style]}>
      {items.map((child, idx) => {
        if (!React.isValidElement(child)) return child;
        const pos: GroupPosition =
          items.length === 1
            ? 'single'
            : idx === 0
              ? 'first'
              : idx === items.length - 1
                ? 'last'
                : 'middle';
        return React.cloneElement(child as React.ReactElement<any>, {
          grouped: true,
          groupPosition: pos,
        });
      })}
    </View>
  );
}

export function ToolbarButton({
  accessibilityLabel,
  onPress,
  disabled,
  variant = 'secondary',
  tone,
  icon,
  label,
  groupPosition = 'single',
  grouped = false,
}: ToolbarButtonProps) {
  const isPrimary = variant === 'primary';
  const isAi = tone === 'ai';
  const hasLabel = Boolean(label && label.trim().length > 0);

  const cornerRadius = 8;
  const foregroundColor = isPrimary
    ? colors.primaryForeground
    : isAi
      ? colors.aiForeground
      : colors.secondaryForeground;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled || !onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.pillBase,
        isPrimary ? styles.pillPrimary : styles.pillSecondary,
        isAi ? styles.pillAi : null,
        grouped
          ? [
              styles.segmentBase,
              // Keep inner edges square; only outer edges get the radius.
              { borderRadius: 0 },
              groupPosition === 'single'
                ? { borderRadius: cornerRadius }
                : null,
              groupPosition === 'first'
                ? { borderTopLeftRadius: cornerRadius, borderBottomLeftRadius: cornerRadius }
                : null,
              groupPosition === 'last'
                ? { borderTopRightRadius: cornerRadius, borderBottomRightRadius: cornerRadius }
                : null,
            ]
          : null,
        pressed && !disabled ? { opacity: 0.9 } : null,
        (disabled || !onPress) ? { opacity: 0.55 } : null,
      ]}
    >
      {isAi ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          <LinearGradient
            colors={[colors.aiGradientStart, colors.aiGradientEnd]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
        </View>
      ) : null}
      <View style={[styles.pillInner, !hasLabel ? styles.pillInnerIconOnly : null]}>
        {icon ? <Icon name={icon} size={14} color={foregroundColor} /> : null}
        {hasLabel ? (
          <Text
            style={[
              styles.pillText,
              isAi ? styles.pillTextAi : isPrimary ? styles.pillTextPrimary : styles.pillTextSecondary,
            ]}
          >
            {label}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    // backgroundColor: colors.canvas,
    paddingHorizontal: spacing.lg,
    // paddingVertical: spacing.xs,
  },
  scroll: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  rowCentered: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    // Show the underlying surface between buttons (2pt gap) while still behaving
    // like a cohesive "set".
    columnGap: 3,
  },
  pillBase: {
    borderRadius: 8,
    minHeight: 32,
    justifyContent: 'center',
    position: 'relative',
  },
  segmentBase: {
    borderRadius: 0,
  },
  pillInner: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pillInnerIconOnly: {
    paddingHorizontal: spacing.sm * 1.25,
  },
  pillSecondary: {
    backgroundColor: colors.secondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pillPrimary: {
    backgroundColor: colors.accent,
    borderWidth: 0,
  },
  pillAi: {
    // Keep the same secondary pill shape + border, but let the gradient show through.
    backgroundColor: 'transparent',
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pillText: {
    ...typography.bodySm,
  },
  pillTextSecondary: {
    color: colors.secondaryForeground,
  },
  pillTextPrimary: {
    color: colors.primaryForeground,
  },
  pillTextAi: {
    color: colors.aiForeground,
  },
});


