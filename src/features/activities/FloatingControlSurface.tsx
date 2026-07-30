import React from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors } from '../../theme';
import { INVENTORY_CHROME_ANIMATION_MS, inventoryChromeNativeEasing } from '../../navigation/chromeMotion';
import { QUICK_ADD_COLLAPSED_SURFACE_ELEVATION } from './quickAddDockTokens';

type FloatingControlSurfaceProps = React.PropsWithChildren<{
  borderRadius: number;
  isProminent: boolean;
  style?: StyleProp<ViewStyle>;
  surfaceStyle?: StyleProp<ViewStyle>;
  testID?: string;
}>;

export function FloatingControlSurface({
  borderRadius,
  isProminent,
  style,
  surfaceStyle,
  testID,
  children,
}: FloatingControlSurfaceProps) {
  const contactShadowOpacity = React.useRef(new Animated.Value(isProminent ? 1 : 0)).current;
  const previousProminentRef = React.useRef(isProminent);

  React.useEffect(() => {
    if (previousProminentRef.current === isProminent) return;
    previousProminentRef.current = isProminent;

    const animation = Animated.timing(contactShadowOpacity, {
      toValue: isProminent ? 1 : 0,
      duration: INVENTORY_CHROME_ANIMATION_MS,
      easing: inventoryChromeNativeEasing,
      useNativeDriver: true,
    });
    animation.start();

    return () => animation.stop();
  }, [contactShadowOpacity, isProminent]);

  return (
    <View
      testID={testID}
      style={[
        styles.broadShadow,
        { borderRadius },
        style,
      ]}
    >
      <Animated.View
        testID={testID ? `${testID}.contactShadow` : undefined}
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          styles.contactShadow,
          { borderRadius, opacity: contactShadowOpacity },
        ]}
      />
      <View style={[styles.surface, { borderRadius }, surfaceStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  broadShadow: {
    backgroundColor: colors.card,
    ...QUICK_ADD_COLLAPSED_SURFACE_ELEVATION,
  },
  contactShadow: {
    backgroundColor: colors.card,
    shadowColor: '#0F172A',
    shadowOpacity: 0.21,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  surface: {
    width: '100%',
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
  },
});
