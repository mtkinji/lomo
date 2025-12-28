import React from 'react';
import {
  Animated,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { colors, spacing, typography, fonts } from '../theme';
import { HStack, VStack } from './primitives';
import { Icon, type IconName } from './Icon';

export type ActionDockItem = {
  id: string;
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
  testID?: string;
  /**
   * Optional label rendered under the icon (used in expanded mode when desired).
   */
  label?: string;
  /**
   * Optional icon/text tint override.
   */
  color?: string;
};

type Props = {
  /**
   * Left dock (multi-action pill).
   */
  leftItems: ActionDockItem[];
  /**
   * Optional single right-side dock button (Notes-style compose).
   */
  rightItem?: ActionDockItem;
  /**
   * Extra items to show when the keyboard is open (Notes-style “expanded dock”).
   */
  keyboardExpandedLeftItems?: ActionDockItem[];
  /**
   * Horizontal inset from the canvas edges. Use to “nestle” into corners while
   * keeping equal distance left/right.
   */
  insetX?: number;
  /**
   * Minimum bottom inset from the canvas edge (safe-area still applies).
   */
  insetBottom?: number;
  /**
   * How much of the bottom safe-area inset (home indicator) to apply when positioning.
   *
   * Notes-style “corner nesting” typically feels better with a partial lift instead
   * of the full safe-area inset.
   */
  safeAreaLift?: 'none' | 'half' | 'full';
  /**
   * When true, show small labels under icons (primarily useful in expanded mode).
   */
  showLabels?: boolean;
  style?: StyleProp<ViewStyle>;
  /**
   * Optional layout callback so screens can measure dock geometry (e.g. for scroll fades).
   */
  onLayout?: ViewProps['onLayout'];
};

const DEFAULT_KEYBOARD_GUESS_PX = 320;
// Slightly larger than the initial Notes-style sizing for better tap targets:
// 44px inner button + 6px padding top/bottom = 56px.
const DOCK_PADDING_Y = 6;
const DOCK_PADDING_X = 8;
const DOCK_RADIUS = 99;
const DOCK_ICON_SIZE = 20;
const LEFT_ITEM_SIZE = 44;
const RIGHT_ITEM_SIZE = 56;

export function ActionDock({
  leftItems,
  rightItem,
  keyboardExpandedLeftItems,
  insetX = spacing.lg,
  insetBottom = spacing.xs,
  safeAreaLift = 'half',
  showLabels = false,
  style,
  onLayout,
}: Props) {
  const insets = useSafeAreaInsets();

  const translateY = React.useRef(new Animated.Value(0)).current;
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  const lastKnownKeyboardHeightRef = React.useRef<number>(DEFAULT_KEYBOARD_GUESS_PX);

  const setTo = React.useCallback(
    (nextHeight: number, duration?: number) => {
      // iOS `endCoordinates.height` typically includes the home-indicator safe area.
      // Since we already respect `insets.bottom` in layout, subtract it to avoid double-lift.
      const adjusted =
        Platform.OS === 'ios' ? Math.max(0, nextHeight - insets.bottom) : Math.max(0, nextHeight);
      setKeyboardHeight(adjusted);
      if (adjusted > 0) lastKnownKeyboardHeightRef.current = adjusted;
      Animated.timing(translateY, {
        toValue: adjusted > 0 ? -adjusted : 0,
        duration: typeof duration === 'number' ? duration : 220,
        useNativeDriver: true,
      }).start();
    },
    [insets.bottom, translateY],
  );

  React.useEffect(() => {
    if (Platform.OS === 'ios') {
      const showSub = Keyboard.addListener('keyboardWillShow', (e: any) => {
        setTo(e?.endCoordinates?.height ?? 0, e?.duration);
      });
      const hideSub = Keyboard.addListener('keyboardWillHide', (e: any) => {
        setTo(0, e?.duration);
      });
      const frameSub = Keyboard.addListener('keyboardWillChangeFrame', (e: any) => {
        setTo(e?.endCoordinates?.height ?? 0, e?.duration);
      });
      return () => {
        showSub.remove();
        hideSub.remove();
        frameSub.remove();
      };
    }

    const showSub = Keyboard.addListener('keyboardDidShow', (e: any) => {
      setTo(e?.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setTo(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [setTo]);

  // Android: begin with a best-guess height while waiting for keyboardDidShow.
  React.useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (keyboardHeight > 0) return;
    // No-op until keyboard opens; but keep the ref warmed for later.
  }, [keyboardHeight]);

  const expanded = keyboardHeight > 0;
  const effectiveLeftItems =
    expanded && keyboardExpandedLeftItems?.length ? [...leftItems, ...keyboardExpandedLeftItems] : leftItems;

  return (
    <Animated.View
      pointerEvents="box-none"
      onLayout={onLayout}
      style={[
        styles.host,
        {
          paddingHorizontal: insetX,
          // Position the dock using an explicit bottom offset (more predictable than paddingBottom).
          bottom:
            (safeAreaLift === 'full'
              ? insets.bottom
              : safeAreaLift === 'half'
                ? Math.round(insets.bottom * 0.5)
                : 0) + insetBottom,
          transform: [{ translateY }],
        },
        style,
      ]}
    >
      <HStack alignItems="center" justifyContent="space-between">
        <View style={styles.dockShadow}>
          <View style={styles.dock}>
            <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFillObject} />
            <View pointerEvents="none" style={styles.dockTint} />
            <HStack alignItems="center" justifyContent="space-between" style={styles.row}>
              {effectiveLeftItems.map((item) => {
              const tint = item.color ?? colors.textPrimary;
              return (
                <Pressable
                  key={item.id}
                  testID={item.testID}
                  accessibilityRole="button"
                  accessibilityLabel={item.accessibilityLabel}
                  hitSlop={10}
                  onPress={item.onPress}
                  style={({ pressed }) => [
                    styles.item,
                    pressed ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null,
                  ]}
                >
                  <VStack alignItems="center" space="xs">
                    <Icon name={item.icon} size={DOCK_ICON_SIZE} color={tint} />
                    {showLabels && item.label ? (
                      <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
                        {item.label}
                      </Text>
                    ) : null}
                  </VStack>
                </Pressable>
              );
            })}
            </HStack>
          </View>
        </View>

        {rightItem ? (
          <View style={styles.dockShadow}>
            <Pressable
              testID={rightItem.testID}
              accessibilityRole="button"
              accessibilityLabel={rightItem.accessibilityLabel}
              hitSlop={12}
              onPress={rightItem.onPress}
              style={({ pressed }) => [
                styles.rightButton,
                pressed ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null,
              ]}
            >
              <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFillObject} />
              <View pointerEvents="none" style={styles.dockTint} />
              <Icon
                name={rightItem.icon}
                size={DOCK_ICON_SIZE}
                color={rightItem.color ?? colors.textPrimary}
              />
            </Pressable>
          </View>
        ) : null}
      </HStack>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 60,
    paddingTop: spacing.sm,
  },
  dockShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  dock: {
    borderRadius: DOCK_RADIUS,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  dockTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  row: {
    paddingHorizontal: DOCK_PADDING_X,
    paddingVertical: DOCK_PADDING_Y,
  },
  item: {
    width: LEFT_ITEM_SIZE,
    height: LEFT_ITEM_SIZE,
    borderRadius: LEFT_ITEM_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightButton: {
    width: RIGHT_ITEM_SIZE,
    height: RIGHT_ITEM_SIZE,
    borderRadius: RIGHT_ITEM_SIZE / 2,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.bodySm,
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 13,
  },
});


