import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
   * Accent color used for the icon badge background.
   */
  badgeColor: string;
};

type KeyActionsRowProps = {
  items: KeyActionItem[];
};

export function KeyActionsRow({ items }: KeyActionsRowProps) {
  return (
    <HStack space="sm" style={styles.row}>
      {items.map((item) => (
        <Pressable
          key={item.id}
          onPress={item.onPress}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          style={({ pressed }) => [
            styles.tile,
            { backgroundColor: item.tileBackgroundColor ?? colors.canvas },
            pressed && styles.tilePressed,
          ]}
        >
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: item.badgeColor,
              },
            ]}
          >
            <Icon name={item.icon} size={18} color={colors.primaryForeground} />
          </View>
          <Text
            style={styles.tileLabel}
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
  tilePressed: {
    opacity: 0.92,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    ...typography.bodySm,
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
  },
});


