import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { colors, spacing, typography, fonts, cardElevation } from '../theme';
import { Icon, type IconName } from './Icon';
import { HStack, Text } from './primitives';

export type KeyActionItem = {
  id: string;
  icon: IconName;
  label: string;
  /**
   * Optional extra context read by screen readers (not shown visually).
   * Keep short and action-oriented.
   */
  accessibilityHint?: string;
  /**
   * Optional override for the accessibility label. Defaults to `label`.
   */
  accessibilityLabel?: string;
  onPress: () => void;
  /**
   * Tile (button) background. Defaults to the canvas (white) so these read as
   * in-canvas "key actions" rather than primary CTAs.
   */
  tileBackgroundColor?: string;
  /**
   * Optional overrides for dark / branded tiles.
   */
  tileBorderColor?: string;
  tileLabelColor?: string;
  /**
   * Icon color for the action tile (used directly on the icon — no background).
   */
  iconColor?: string;
  /**
   * @deprecated Previously used as the icon badge background color.
   * Kept for backward compatibility; will fall back to `iconColor`.
   */
  badgeColor?: string;
};

type KeyActionsRowProps = {
  items: KeyActionItem[];
  /**
   * Visual sizing for touch targets. Use "lg" for app-picker style rows.
   */
  size?: 'md' | 'lg';
  /**
   * Optional stable testID prefix for E2E tests.
   * Each tile receives `testID="${testIDPrefix}.${item.id}"`.
   */
  testIDPrefix?: string;
};

export function KeyActionsRow({ items, size = 'md', testIDPrefix }: KeyActionsRowProps) {
  const iconSize = size === 'lg' ? 24 : 20;
  const tileStyle = size === 'lg' ? styles.tileLg : styles.tile;
  const shouldWrap = items.length >= 4;
  return (
    <HStack space="sm" style={[styles.row, shouldWrap ? styles.rowWrap : null]}>
      {items.map((item) => (
        <Pressable
          key={item.id}
          testID={testIDPrefix ? `${testIDPrefix}.${item.id}` : undefined}
          onPress={item.onPress}
          accessibilityRole="button"
          accessibilityLabel={item.accessibilityLabel ?? item.label}
          accessibilityHint={item.accessibilityHint}
          style={({ pressed }) => [
            tileStyle,
            shouldWrap ? styles.tileWrap : null,
            {
              backgroundColor: item.tileBackgroundColor ?? colors.canvas,
              borderColor: item.tileBorderColor ?? colors.border,
            },
            pressed && styles.tilePressed,
          ]}
        >
          <Icon
            name={item.icon}
            size={iconSize}
            color={
              item.iconColor ??
              item.badgeColor ??
              item.tileLabelColor ??
              colors.textPrimary
            }
          />
          <Text
            style={[
              styles.tileLabel,
              { color: item.tileLabelColor ?? colors.textPrimary },
            ]}
            numberOfLines={2}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </HStack>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
  },
  rowWrap: {
    flexWrap: 'wrap',
    rowGap: spacing.sm,
  },
  tileWrap: {
    // Two-column grid for 4+ actions so labels can be read without truncation.
    flexBasis: '48%',
  },
  tile: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 56,
    overflow: 'hidden',
    // Tokenized: keep lift below "card" prominence.
    ...cardElevation.lift,
  },
  tileLg: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    minHeight: 72,
    overflow: 'hidden',
    ...cardElevation.lift,
  },
  tilePressed: {
    opacity: 0.92,
  },
  tileLabel: {
    ...typography.bodySm,
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
    flexShrink: 1,
    minWidth: 0,
    textAlign: 'center',
  },
});


