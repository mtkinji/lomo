import { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

type LinearGradientProps = ViewProps & {
  colors?: ReadonlyArray<string>;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  locations?: ReadonlyArray<number>;
  children?: ReactNode;
};

export function LinearGradient({ children, ...rest }: LinearGradientProps) {
  return <View {...rest}>{children}</View>;
}

export default { LinearGradient };
