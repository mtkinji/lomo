import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Card as ReusableCard } from '@/components/ui/card';

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, style }: CardProps) {
  return (
    <ReusableCard
      // Preserve existing spacing expectations from the old implementation.
      className="my-1"
      // Allow legacy callers to continue using React Native style objects for layout.
      style={style as any}
    >
      {children}
    </ReusableCard>
  );
}
