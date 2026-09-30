import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { bottomDockGeometry } from '../theme';
import { BUTTON_SIZE_TOKENS } from './buttonTokens';
import {
  resolvePhoneFloatingActionContentInset,
  resolvePhoneFloatingBottomInset,
  resolveRestingFloatingControlContentInset,
} from './layout/bottomDockGeometry';

const ACTION_HEIGHT = BUTTON_SIZE_TOKENS.lg.height;
type Placement = 'phoneFloating' | 'restingFloatingControl';

type Props = {
  children: ReactNode;
  dockTestID?: string;
  style?: StyleProp<ViewStyle>;
  placement?: Placement;
};

/**
 * Canonical host for one persistent full-width page action.
 *
 * The host owns the phone's inline and bottom safe-area geometry. Callers
 * provide one full-width `Button` and reserve body clearance with
 * `useFullWidthActionDockClearance`; they do not pass numeric inset overrides.
 */
export function FullWidthActionDock({ children, dockTestID, style, placement = 'phoneFloating' }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.host,
        {
          bottom: placement === 'restingFloatingControl'
            ? bottomDockGeometry.restingFloatingControl.bottomGap
            : resolvePhoneFloatingBottomInset(insets.bottom),
          paddingHorizontal: bottomDockGeometry[placement].inlineGap,
        },
        style,
      ]}
      testID={dockTestID}
    >
      {children}
    </View>
  );
}

export function useFullWidthActionDockClearance(placement: Placement = 'phoneFloating'): number {
  const insets = useSafeAreaInsets();
  return placement === 'restingFloatingControl'
    ? resolveRestingFloatingControlContentInset(ACTION_HEIGHT)
    : resolvePhoneFloatingActionContentInset(insets.bottom, ACTION_HEIGHT);
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 60,
  },
});
