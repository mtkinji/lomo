import React from 'react';
import { View, Text, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, spacing, typography, fonts } from '../theme';

export type BreadcrumbItem = {
  id: string;
  label: string;
  onPress?: () => void;
};

type Props = {
  items: BreadcrumbItem[];
  style?: StyleProp<ViewStyle>;
};

export function BreadcrumbBar({ items, style }: Props) {
  const visible = items.filter((item) => item.label.trim().length > 0);
  if (visible.length === 0) return null;

  return (
    <View style={[styles.row, style]} accessibilityRole="header">
      {visible.map((item, idx) => {
        const isLast = idx === visible.length - 1;
        const isClickable = Boolean(item.onPress) && !isLast;
        const content = (
          <Text
            style={[styles.crumbText, isLast ? styles.crumbTextCurrent : styles.crumbTextLink]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.label}
          </Text>
        );

        return (
          <React.Fragment key={item.id}>
            {isClickable ? (
              <Pressable
                onPress={item.onPress}
                accessibilityRole="button"
                accessibilityLabel={`Navigate to ${item.label}`}
                hitSlop={8}
                style={({ pressed }) => [styles.crumbPressable, pressed && styles.crumbPressed]}
              >
                {content}
              </Pressable>
            ) : (
              <View style={styles.crumbStatic}>{content}</View>
            )}
            {!isLast ? <Text style={styles.separator}>›</Text> : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minHeight: 36,
  },
  crumbPressable: {
    flexShrink: 1,
    paddingVertical: spacing.xs / 2,
  },
  crumbPressed: {
    opacity: 0.7,
  },
  crumbStatic: {
    flexShrink: 1,
    paddingVertical: spacing.xs / 2,
  },
  crumbText: {
    ...typography.bodySm,
    fontFamily: fonts.medium,
    flexShrink: 1,
  },
  crumbTextLink: {
    color: colors.textSecondary,
  },
  crumbTextCurrent: {
    color: colors.textPrimary,
  },
  separator: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginHorizontal: spacing.xs,
  },
});






