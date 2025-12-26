import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, spacing } from '../theme';

type Props = {
  /**
   * Optional extra styling (e.g. to adjust margins per screen).
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Vertical spacing around the divider. Defaults to `spacing.lg`.
   */
  marginVertical?: number;
};

/**
 * Lightweight section divider (Airbnb-style <hr>).
 */
export function Hr({ style, marginVertical = spacing.lg }: Props) {
  return <View style={[styles.hr, { marginVertical }, style]} />;
}

const styles = StyleSheet.create({
  hr: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    opacity: 0.85,
    width: '100%',
  },
});


