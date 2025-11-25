import type { ReactNode } from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';
import { spacing } from '../theme/spacing';

type SpacingKey = keyof typeof spacing | number | undefined;

interface StackProps extends ViewProps {
  children: ReactNode;
  /**
   * Logical spacing between children. Mirrors the Gluestack `space` prop
   * but is implemented using React Native gap style on modern RN.
   */
  space?: SpacingKey;
  alignItems?: ViewStyle['alignItems'];
  justifyContent?: ViewStyle['justifyContent'];
  flex?: ViewStyle['flex'];
  marginTop?: ViewStyle['marginTop'];
}

function resolveGap(space: SpacingKey): number | undefined {
  if (space == null) return undefined;
  if (typeof space === 'number') return space;
  return spacing[space] ?? undefined;
}

export function VStack({
  children,
  style,
  space,
  alignItems,
  justifyContent,
  flex,
  marginTop,
  ...rest
}: StackProps) {
  const gap = resolveGap(space);

  return (
    <View
      {...rest}
      style={[
        {
          flexDirection: 'column',
          // Modern React Native supports gap/rowGap/columnGap; this keeps the
          // semantics close to Gluestack's `space` prop without re‑implementing
          // its entire style system.
          rowGap: gap,
          alignItems,
          justifyContent,
          flex,
          marginTop,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function HStack({
  children,
  style,
  space,
  alignItems,
  justifyContent,
  flex,
  marginTop,
  ...rest
}: StackProps) {
  const gap = resolveGap(space);

  return (
    <View
      {...rest}
      style={[
        {
          flexDirection: 'row',
          columnGap: gap,
          alignItems,
          justifyContent,
          flex,
          marginTop,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}


