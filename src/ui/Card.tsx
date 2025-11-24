import { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { cardSurfaceStyle, spacing } from '../theme';

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    ...cardSurfaceStyle,
    // Let the surrounding layout (lists, grids, etc.) control horizontal gutters
    // so cards can align cleanly with headers and page chrome.
    marginHorizontal: 0,
    marginVertical: spacing.xs,
  },
});


