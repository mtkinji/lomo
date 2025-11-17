import { ReactNode } from 'react';
import { StyleSheet, Text, View, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { spacing, typography } from '../theme';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'info';

type BadgeProps = {
  variant?: BadgeVariant;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

const BACKGROUND_BY_VARIANT: Record<BadgeVariant, string> = {
  default: '#18181B',
  secondary: '#F4F4F5',
  destructive: '#DC2626',
  outline: '#FFFFFF',
  info: '#2563EB',
};

const BORDER_BY_VARIANT: Partial<Record<BadgeVariant, string>> = {
  outline: '#E4E4E7',
};

const TEXT_BY_VARIANT: Record<BadgeVariant, string> = {
  default: '#FFFFFF',
  secondary: '#18181B',
  destructive: '#FFFFFF',
  outline: '#18181B',
  info: '#FFFFFF',
};

export function Badge({ variant = 'default', children, style, textStyle }: BadgeProps) {
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: BACKGROUND_BY_VARIANT[variant],
          borderColor: BORDER_BY_VARIANT[variant] ?? BACKGROUND_BY_VARIANT[variant],
          borderWidth: variant === 'outline' ? StyleSheet.hairlineWidth : 0,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color: TEXT_BY_VARIANT[variant] }, textStyle]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  text: {
    ...typography.bodySm,
    fontFamily: typography.label.fontFamily,
    fontSize: 13,
  },
});



