import type { ComponentProps } from 'react';
import { View } from 'react-native';

type LinearGradientProps = ComponentProps<typeof View> & {
  colors?: readonly string[];
  end?: { x: number; y: number };
  locations?: readonly number[];
  start?: { x: number; y: number };
};

export function LinearGradient({ colors, style, ...props }: LinearGradientProps) {
  const backgroundColor = colors?.[0] ?? 'transparent';

  return <View {...props} style={[{ backgroundColor }, style]} />;
}
