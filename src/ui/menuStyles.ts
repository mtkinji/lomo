import { StyleSheet } from 'react-native';
import { colors, fonts, spacing, typography } from '../theme';

export const menuStyles = StyleSheet.create({
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    columnGap: spacing.sm,
    width: '100%',
  },
  menuItemText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  destructiveMenuItemText: {
    ...typography.body,
    color: colors.destructive,
    fontFamily: fonts.medium,
  },
});

export const menuItemTextProps = {
  numberOfLines: 1,
  ellipsizeMode: 'tail',
} as const;

