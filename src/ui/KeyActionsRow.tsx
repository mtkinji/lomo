import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { colors, spacing, typography, fonts, cardElevation } from '../theme';
import { Icon, type IconName } from './Icon';
import { HStack, Text } from './primitives';

export type KeyActionItem = {
  id: string;
  icon: IconName;
  label: string;
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
};

export function KeyActionsRow({ items, size = 'md' }: KeyActionsRowProps) {
  const iconSize = size === 'lg' ? 22 : 18;
  const tileStyle = size === 'lg' ? styles.tileLg : styles.tile;
  return (
    <HStack space="sm" style={styles.row}>
      {items.map((item) => (
        <Pressable
          key={item.id}
          onPress={item.onPress}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          style={({ pressed }) => [
            tileStyle,
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
            numberOfLines={1}
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
  tile: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 72,
    ...cardElevation.lift,
  },
  tilePressed: {
    opacity: 0.92,
  },
  tileLabel: {
    ...typography.bodySm,
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
  },
});


