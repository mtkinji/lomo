declare module 'expo-linear-gradient' {
  import * as React from 'react';
  import { ViewStyle, StyleProp } from 'react-native';

  export interface LinearGradientProps {
    colors: string[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    style?: StyleProp<ViewStyle>;
    children?: React.ReactNode;
  }

  export const LinearGradient: React.ComponentType<LinearGradientProps>;
}


