import * as React from 'react';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomDrawer, type BottomDrawerSnapPoint } from './BottomDrawer';
import { cardElevation, colors } from '../theme';

export type DrawerTopRadius = 'sm' | 'md' | 'lg';
export type DrawerElevationToken = keyof typeof cardElevation;
export type DrawerShadowDirection = 'up' | 'down';

type UnderKeyboardDrawerProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;

  /**
   * When true, the drawer behaves like a "dock": it stays anchored to the
   * bottom of the phone, and the sheet height becomes:
   *   keyboardHeight + measuredVisibleContentHeight
   *
   * This keeps the bottom portion of the drawer hidden under the keyboard,
   * while the visible content stays above it — matching the Activities dock UX.
   */
  dynamicHeightUnderKeyboard?: boolean;

  /**
   * Used until we measure visible content height (only relevant when
   * `dynamicHeightUnderKeyboard` is true).
   */
  visibleContentHeightFallbackPx?: number;
  /**
   * Optional cap on the measured visible content height (only relevant when
   * `dynamicHeightUnderKeyboard` is true). This prevents tall content (e.g. long
   * lists) from expanding the drawer too far; the content can scroll instead.
   */
  maxVisibleContentHeightPx?: number;
  /**
   * Optional minimum for the visible content height (only relevant when
   * `dynamicHeightUnderKeyboard` is true). This prevents the drawer from
   * collapsing to a tiny height when the child view doesn't naturally expand
   * (e.g. when list content uses flex but isn't height-constrained).
   */
  minVisibleContentHeightPx?: number;

  /**
   * Android emits keyboard events after animations; when opening we optionally
   * start from a guess and correct once the real height arrives.
   */
  defaultKeyboardHeightGuessPx?: number;

  /**
   * When true, renders an explicit spacer equal to the keyboard height at the
   * bottom of the sheet (so the surface continues "behind" the keyboard).
   *
   * Defaults to `dynamicHeightUnderKeyboard`.
   */
  includeKeyboardSpacer?: boolean;

  /**
   * Additional height to add to the keyboard spacer. This is useful on iOS when
   * an `InputAccessoryView` toolbar is used: the accessory sits *above* the
   * keyboard but is not always included in keyboard height measurements.
   */
  keyboardSpacerExtraHeightPx?: number;

  /**
   * BottomDrawer configuration passthrough.
   */
  snapPoints?: BottomDrawerSnapPoint[];
  presentation?: 'modal' | 'inline';
  hideBackdrop?: boolean;
  backdropMaxOpacity?: number;
  dismissable?: boolean;
  dismissOnBackdropPress?: boolean;
  keyboardAvoidanceEnabled?: boolean;
  enableContentPanningGesture?: boolean;
  dynamicSizing?: boolean;

  /**
   * Visual tokens for the drawer surface.
   */
  backgroundColor?: string;
  elevationToken?: DrawerElevationToken;
  shadowDirection?: DrawerShadowDirection;
  topRadius?: DrawerTopRadius;
  sheetStyle?: StyleProp<ViewStyle>;
  handleContainerStyle?: StyleProp<ViewStyle>;
  handleStyle?: StyleProp<ViewStyle>;
};

const DEFAULT_VISIBLE_CONTENT_FALLBACK_PX = 160;
const DEFAULT_KEYBOARD_GUESS_PX = 320;

function resolveTopRadius(radius: DrawerTopRadius): number {
  switch (radius) {
    case 'sm':
      return 16;
    case 'md':
      return 22;
    case 'lg':
    default:
      return 40;
  }
}

function resolveDrawerShadow(args: {
  token: DrawerElevationToken;
  direction: DrawerShadowDirection;
}): ViewStyle {
  const { token, direction } = args;
  const base = cardElevation[token] ?? cardElevation.lift;
  const baseOffsetH = Math.abs(base.shadowOffset?.height ?? 0);
  const height = direction === 'up' ? -baseOffsetH : baseOffsetH;
  return {
    shadowColor: base.shadowColor,
    shadowOpacity: base.shadowOpacity,
    shadowRadius: base.shadowRadius,
    shadowOffset: { width: base.shadowOffset?.width ?? 0, height },
    elevation: base.elevation,
  };
}

export function UnderKeyboardDrawer({
  visible,
  onClose,
  children,
  dynamicHeightUnderKeyboard = false,
  visibleContentHeightFallbackPx = DEFAULT_VISIBLE_CONTENT_FALLBACK_PX,
  maxVisibleContentHeightPx,
  minVisibleContentHeightPx,
  defaultKeyboardHeightGuessPx = DEFAULT_KEYBOARD_GUESS_PX,
  includeKeyboardSpacer,
  keyboardSpacerExtraHeightPx = 0,
  snapPoints,
  presentation = 'modal',
  hideBackdrop,
  backdropMaxOpacity,
  dismissable,
  dismissOnBackdropPress,
  // For under-keyboard drawers, default to disabling BottomDrawer's KAV so the
  // sheet doesn't lift above the keyboard.
  keyboardAvoidanceEnabled = false,
  enableContentPanningGesture = false,
  dynamicSizing = false,
  backgroundColor = colors.canvas,
  elevationToken = 'lift',
  shadowDirection = 'up',
  topRadius = 'md',
  sheetStyle,
  handleContainerStyle,
  handleStyle,
}: UnderKeyboardDrawerProps) {
  const insets = useSafeAreaInsets();
  const shouldIncludeKeyboardSpacer = includeKeyboardSpacer ?? dynamicHeightUnderKeyboard;

  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  const lastKnownKeyboardHeightRef = React.useRef<number>(defaultKeyboardHeightGuessPx);
  const [measuredVisibleHeight, setMeasuredVisibleHeight] = React.useState<number | null>(null);

  React.useEffect(() => {
    const setTo = (nextHeight: number) => {
      // iOS `endCoordinates.height` typically includes the home-indicator safe area.
      // BottomDrawer already pads its sheet by `insets.bottom`, so if we use the raw
      // keyboard height here we double-count and the visible content floats too high.
      const adjusted =
        Platform.OS === 'ios' ? Math.max(0, nextHeight - insets.bottom) : nextHeight;
      setKeyboardHeight(adjusted);
      if (adjusted > 0) lastKnownKeyboardHeightRef.current = adjusted;
    };

    if (Platform.OS === 'ios') {
      const showSub = Keyboard.addListener('keyboardWillShow', (e: any) => {
        const next = e?.endCoordinates?.height ?? 0;
        setTo(next);
      });
      const hideSub = Keyboard.addListener('keyboardWillHide', () => setTo(0));
      const frameSub = Keyboard.addListener('keyboardWillChangeFrame', (e: any) => {
        const next = e?.endCoordinates?.height ?? 0;
        setTo(next);
      });
      return () => {
        showSub.remove();
        hideSub.remove();
        frameSub.remove();
      };
    }

    const showSub = Keyboard.addListener('keyboardDidShow', (e: any) => {
      const next = e?.endCoordinates?.height ?? 0;
      setTo(next);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setTo(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [defaultKeyboardHeightGuessPx]);

  // Android: begin with a best-guess height while waiting for keyboardDidShow.
  React.useEffect(() => {
    if (!visible) return;
    if (Platform.OS !== 'android') return;
    if (!dynamicHeightUnderKeyboard) return;
    if (keyboardHeight > 0) return;
    setKeyboardHeight(lastKnownKeyboardHeightRef.current);
  }, [dynamicHeightUnderKeyboard, keyboardHeight, visible]);

  const effectiveKeyboardHeight =
    keyboardHeight > 0
      ? keyboardHeight
      : visible && dynamicHeightUnderKeyboard
        ? lastKnownKeyboardHeightRef.current
        : 0;

  const effectiveSpacerHeight = Math.max(0, effectiveKeyboardHeight + keyboardSpacerExtraHeightPx);

  const radiusPx = resolveTopRadius(topRadius);
  const shadowStyle = resolveDrawerShadow({ token: elevationToken, direction: shadowDirection });

  const unclampedVisibleHeight = measuredVisibleHeight ?? visibleContentHeightFallbackPx;
  const visibleHeight = (() => {
    const min = typeof minVisibleContentHeightPx === 'number' ? minVisibleContentHeightPx : 0;
    const max = typeof maxVisibleContentHeightPx === 'number' ? maxVisibleContentHeightPx : undefined;
    const lowerBounded = Math.max(0, Math.max(unclampedVisibleHeight, min));
    return typeof max === 'number' ? Math.min(lowerBounded, max) : lowerBounded;
  })();
  const dynamicSnapPoints = React.useMemo<BottomDrawerSnapPoint[]>(() => {
    const h = Math.max(0, Math.round(effectiveSpacerHeight + visibleHeight));
    return [h];
  }, [effectiveSpacerHeight, visibleHeight]);

  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      presentation={presentation}
      hideBackdrop={hideBackdrop}
      backdropMaxOpacity={backdropMaxOpacity}
      dismissable={dismissable}
      dismissOnBackdropPress={dismissOnBackdropPress}
      keyboardAvoidanceEnabled={keyboardAvoidanceEnabled}
      snapPoints={dynamicHeightUnderKeyboard ? dynamicSnapPoints : snapPoints}
      enableContentPanningGesture={enableContentPanningGesture}
      dynamicSizing={dynamicSizing}
      sheetStyle={[
        styles.sheetBase,
        {
          backgroundColor,
          borderTopLeftRadius: radiusPx,
          borderTopRightRadius: radiusPx,
          // For bottom-attached drawers, the shadow should cast upward.
          ...shadowStyle,
        },
        sheetStyle,
      ]}
      handleContainerStyle={handleContainerStyle}
      handleStyle={handleStyle}
    >
      {/* BottomDrawer's sheet defaults to `overflow: hidden` which clips iOS shadows.
          We keep the sheet overflow visible, and clip rounded corners inside. */}
      <View
        style={[
          styles.innerClipper,
          {
            backgroundColor,
            borderTopLeftRadius: radiusPx,
            borderTopRightRadius: radiusPx,
          },
        ]}
      >
        {dynamicHeightUnderKeyboard ? (
          <View
            style={{ height: visibleHeight }}
            onLayout={(event) => {
              const next = Math.round(event.nativeEvent.layout.height);
              if (next > 0 && next !== measuredVisibleHeight) {
                setMeasuredVisibleHeight(next);
              }
            }}
          >
            {children}
          </View>
        ) : shouldIncludeKeyboardSpacer ? (
          <View style={styles.flexContent}>{children}</View>
        ) : (
          children
        )}

        {shouldIncludeKeyboardSpacer ? <View style={{ height: effectiveSpacerHeight }} /> : null}
      </View>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  sheetBase: {
    paddingHorizontal: 0,
    paddingTop: 0,
    // We manage bottom padding in callers or via the keyboard spacer, so keep this at 0.
    paddingBottom: 0,
    overflow: 'visible',
  },
  innerClipper: {
    flex: 1,
    overflow: 'hidden',
    flexDirection: 'column',
    minHeight: 0,
  },
  flexContent: {
    flex: 1,
    minHeight: 0,
  },
});


