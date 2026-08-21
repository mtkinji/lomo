import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { bottomDockGeometry } from '../theme';
import { BUTTON_SIZE_TOKENS } from './buttonTokens';
import {
  resolvePhoneFloatingActionContentInset,
  resolvePhoneFloatingBottomInset,
} from './layout/bottomDockGeometry';

const ACTION_HEIGHT = BUTTON_SIZE_TOKENS.lg.height;

type Props = {
  children: ReactNode;
  dockTestID?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Canonical host for one persistent full-width page action.
 *
 * The host owns the phone's inline and bottom safe-area geometry. Callers
 * provide one full-width `Button` and reserve body clearance with
 * `useFullWidthActionDockClearance`; they do not pass numeric inset overrides.
 */
export function FullWidthActionDock({ children, dockTestID, style }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.host,
        {
          bottom: resolvePhoneFloatingBottomInset(insets.bottom),
          paddingHorizontal: bottomDockGeometry.phoneFloating.inlineGap,
        },
        style,
      ]}
      testID={dockTestID}
    >
      {children}
    </View>
  );
}

export function useFullWidthActionDockClearance(): number {
  const insets = useSafeAreaInsets();
  return resolvePhoneFloatingActionContentInset(insets.bottom, ACTION_HEIGHT);
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 60,
  },
});
