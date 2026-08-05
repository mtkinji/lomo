import React from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { colors, spacing } from '../../theme';
import { inventoryChromeNativeEasing } from '../../navigation/chromeMotion';
import { HapticsService } from '../../services/HapticsService';
import { Icon } from '../../ui/Icon';
import { FloatingControlSurface } from './FloatingControlSurface';

export const INVENTORY_DOCK_BUTTON_SIZE_PX = 48;
export const INVENTORY_DOCK_BUTTON_GAP_PX = spacing.sm;
export const SCROLL_TO_TOP_SURFACE_SIZE_PX = 40;

const SCROLL_TO_TOP_ACKNOWLEDGE_MS = 90;
const SCROLL_TO_TOP_ENTER_MS = 150;
const SCROLL_TO_TOP_EXIT_MS = 190;
const SCROLL_TO_TOP_COLLAPSED_SCALE = 0.68;
const SCROLL_TO_TOP_ANCHOR_OFFSET_Y_PX = 10;

type InventoryDockAffordancesProps = {
  bottomOffsetPx: number;
  rightInsetPx: number;
  showScrollToTop: boolean;
  isProminent?: boolean;
  reduceMotionOverride?: boolean;
  onSearchPress: () => void;
  onChatPress: () => void;
  onScrollToTopPress: () => void;
};

export function InventoryDockAffordances({
  bottomOffsetPx,
  rightInsetPx,
  showScrollToTop,
  isProminent = true,
  reduceMotionOverride,
  onSearchPress,
  onChatPress,
  onScrollToTopPress,
}: InventoryDockAffordancesProps) {
  const systemReduceMotion = useReducedMotion();
  const reduceMotion = reduceMotionOverride ?? systemReduceMotion;
  const [renderScrollToTop, setRenderScrollToTop] = React.useState(showScrollToTop);
  const [isScrollToTopExiting, setIsScrollToTopExiting] = React.useState(false);
  const scrollToTopOpacity = React.useRef(
    new Animated.Value(showScrollToTop && reduceMotion ? 1 : 0),
  ).current;
  const scrollToTopScale = React.useRef(
    new Animated.Value(showScrollToTop && reduceMotion ? 1 : SCROLL_TO_TOP_COLLAPSED_SCALE),
  ).current;
  const scrollToTopTranslateY = React.useRef(
    new Animated.Value(showScrollToTop && reduceMotion ? 0 : SCROLL_TO_TOP_ANCHOR_OFFSET_Y_PX),
  ).current;
  const pressExitInProgressRef = React.useRef(false);
  const scrollToTopAnimationRef = React.useRef<Animated.CompositeAnimation | null>(null);
  const scrollToTopHideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const startScrollToTopAnimation = React.useCallback((animation: Animated.CompositeAnimation) => {
    scrollToTopAnimationRef.current?.stop();
    scrollToTopAnimationRef.current = animation;
    animation.start(({ finished }) => {
      if (finished) scrollToTopAnimationRef.current = null;
    });
  }, []);

  React.useEffect(() => {
    if (showScrollToTop) {
      if (pressExitInProgressRef.current) return;
      pressExitInProgressRef.current = false;
      setIsScrollToTopExiting(false);
      if (reduceMotion) {
        scrollToTopAnimationRef.current?.stop();
        scrollToTopOpacity.setValue(1);
        scrollToTopScale.setValue(1);
        scrollToTopTranslateY.setValue(0);
        setRenderScrollToTop(true);
        return;
      }
      scrollToTopOpacity.setValue(0);
      scrollToTopScale.setValue(SCROLL_TO_TOP_COLLAPSED_SCALE);
      scrollToTopTranslateY.setValue(SCROLL_TO_TOP_ANCHOR_OFFSET_Y_PX);
      setRenderScrollToTop(true);
      startScrollToTopAnimation(
        Animated.parallel([
          Animated.timing(scrollToTopOpacity, {
            toValue: 1,
            duration: SCROLL_TO_TOP_ENTER_MS,
            easing: inventoryChromeNativeEasing,
            useNativeDriver: true,
          }),
          Animated.timing(scrollToTopScale, {
            toValue: 1,
            duration: SCROLL_TO_TOP_ENTER_MS,
            easing: inventoryChromeNativeEasing,
            useNativeDriver: true,
          }),
          Animated.timing(scrollToTopTranslateY, {
            toValue: 0,
            duration: SCROLL_TO_TOP_ENTER_MS,
            easing: inventoryChromeNativeEasing,
            useNativeDriver: true,
          }),
        ]),
      );
      return;
    }

    if (!renderScrollToTop) {
      pressExitInProgressRef.current = false;
      return;
    }
    if (pressExitInProgressRef.current) return;
    if (reduceMotion) {
      setRenderScrollToTop(false);
      return;
    }
    startScrollToTopAnimation(
      Animated.parallel([
        Animated.timing(scrollToTopScale, {
          toValue: SCROLL_TO_TOP_COLLAPSED_SCALE,
          duration: SCROLL_TO_TOP_EXIT_MS,
          easing: inventoryChromeNativeEasing,
          useNativeDriver: true,
        }),
        Animated.timing(scrollToTopOpacity, {
          toValue: 0,
          duration: SCROLL_TO_TOP_EXIT_MS,
          easing: inventoryChromeNativeEasing,
          useNativeDriver: true,
        }),
        Animated.timing(scrollToTopTranslateY, {
          toValue: SCROLL_TO_TOP_ANCHOR_OFFSET_Y_PX,
          duration: SCROLL_TO_TOP_EXIT_MS,
          easing: inventoryChromeNativeEasing,
          useNativeDriver: true,
        }),
      ]),
    );
    const hideTimer = setTimeout(() => setRenderScrollToTop(false), SCROLL_TO_TOP_EXIT_MS);
    return () => clearTimeout(hideTimer);
  }, [
    renderScrollToTop,
    reduceMotion,
    scrollToTopOpacity,
    scrollToTopScale,
    scrollToTopTranslateY,
    showScrollToTop,
    startScrollToTopAnimation,
  ]);

  React.useEffect(() => () => {
    scrollToTopAnimationRef.current?.stop();
    if (scrollToTopHideTimerRef.current != null) {
      clearTimeout(scrollToTopHideTimerRef.current);
    }
  }, []);

  const handleSearchPress = React.useCallback(() => {
    void HapticsService.trigger('canvas.selection');
    onSearchPress();
  }, [onSearchPress]);

  const handleChatPress = React.useCallback(() => {
    void HapticsService.trigger('canvas.selection');
    onChatPress();
  }, [onChatPress]);

  const handleScrollToTopPress = React.useCallback(() => {
    if (pressExitInProgressRef.current) return;
    pressExitInProgressRef.current = true;
    setIsScrollToTopExiting(true);
    void HapticsService.trigger('canvas.selection');
    onScrollToTopPress();

    if (reduceMotion) {
      scrollToTopAnimationRef.current?.stop();
      scrollToTopOpacity.setValue(0);
      setRenderScrollToTop(false);
      return;
    }

    startScrollToTopAnimation(
      Animated.sequence([
        Animated.timing(scrollToTopScale, {
          toValue: 1.08,
          duration: SCROLL_TO_TOP_ACKNOWLEDGE_MS,
          easing: inventoryChromeNativeEasing,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(scrollToTopScale, {
            toValue: SCROLL_TO_TOP_COLLAPSED_SCALE,
            duration: SCROLL_TO_TOP_EXIT_MS,
            easing: inventoryChromeNativeEasing,
            useNativeDriver: true,
          }),
          Animated.timing(scrollToTopOpacity, {
            toValue: 0,
            duration: SCROLL_TO_TOP_EXIT_MS,
            easing: inventoryChromeNativeEasing,
            useNativeDriver: true,
          }),
          Animated.timing(scrollToTopTranslateY, {
            toValue: SCROLL_TO_TOP_ANCHOR_OFFSET_Y_PX,
            duration: SCROLL_TO_TOP_EXIT_MS,
            easing: inventoryChromeNativeEasing,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    if (scrollToTopHideTimerRef.current != null) {
      clearTimeout(scrollToTopHideTimerRef.current);
    }
    scrollToTopHideTimerRef.current = setTimeout(
      () => setRenderScrollToTop(false),
      SCROLL_TO_TOP_ACKNOWLEDGE_MS + SCROLL_TO_TOP_EXIT_MS,
    );
  }, [
    onScrollToTopPress,
    reduceMotion,
    scrollToTopOpacity,
    scrollToTopScale,
    scrollToTopTranslateY,
    startScrollToTopAnimation,
  ]);

  return (
    <View
      testID="inventory-dock-affordances"
      pointerEvents="box-none"
      style={[styles.container, { bottom: bottomOffsetPx }]}
    >
      {renderScrollToTop ? (
        <Animated.View
          testID="e2e.activities.scrollToTop.positioner"
          pointerEvents={isScrollToTopExiting ? 'none' : 'box-none'}
          style={[
            styles.scrollToTopPositioner,
            {
              opacity: scrollToTopOpacity,
              transform: [
                { translateY: scrollToTopTranslateY },
                { scale: scrollToTopScale },
              ],
            },
          ]}
        >
          <Pressable
            testID="e2e.activities.scrollToTop"
            accessibilityRole="button"
            accessibilityLabel="Scroll to top"
            accessibilityHint="Returns to the beginning of the to-do list"
            accessible={!isScrollToTopExiting}
            importantForAccessibility={isScrollToTopExiting ? 'no-hide-descendants' : 'auto'}
            onPress={handleScrollToTopPress}
            style={({ pressed }) => [
              styles.scrollToTopHitTarget,
              pressed && styles.buttonPressed,
            ]}
          >
            <FloatingControlSurface
              testID="e2e.activities.scrollToTop.surface"
              borderRadius={SCROLL_TO_TOP_SURFACE_SIZE_PX / 2}
              isProminent={isProminent}
              style={styles.scrollToTopSurface}
              surfaceStyle={styles.buttonSurface}
            >
              <View style={styles.buttonContent}>
                <Icon name="arrowUp" size={17} color={colors.textPrimary} />
              </View>
            </FloatingControlSurface>
          </Pressable>
        </Animated.View>
      ) : null}

      <Pressable
        testID="e2e.activities.search"
        accessibilityRole="button"
        accessibilityLabel="Search To-dos"
        accessibilityHint="Opens Search scoped to To-dos"
        onPress={handleSearchPress}
        style={({ pressed }) => [
          styles.searchButton,
          { right: rightInsetPx + INVENTORY_DOCK_BUTTON_SIZE_PX + INVENTORY_DOCK_BUTTON_GAP_PX },
          pressed && styles.buttonPressed,
        ]}
      >
        <FloatingControlSurface
          borderRadius={INVENTORY_DOCK_BUTTON_SIZE_PX / 2}
          isProminent={isProminent}
          style={styles.button}
          surfaceStyle={styles.buttonSurface}
        >
          <View style={styles.buttonContent}>
            <Icon name="search" size={19} color={colors.textPrimary} />
          </View>
        </FloatingControlSurface>
      </Pressable>

      <Pressable
        testID="e2e.activities.chat"
        accessibilityRole="button"
        accessibilityLabel="Chat about to-dos"
        accessibilityHint="Opens Chat with the current To-dos context"
        onPress={handleChatPress}
        style={({ pressed }) => [
          styles.chatButton,
          { right: rightInsetPx },
          pressed && styles.buttonPressed,
        ]}
      >
        <FloatingControlSurface
          borderRadius={INVENTORY_DOCK_BUTTON_SIZE_PX / 2}
          isProminent={isProminent}
          style={styles.button}
          surfaceStyle={styles.buttonSurface}
        >
          <View style={styles.buttonContent}>
            <Icon name="navAiGuide" size={19} color={colors.textPrimary} />
          </View>
        </FloatingControlSurface>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: INVENTORY_DOCK_BUTTON_SIZE_PX,
    zIndex: 60,
    elevation: 60,
  },
  searchButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  chatButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  button: {
    width: INVENTORY_DOCK_BUTTON_SIZE_PX,
    height: INVENTORY_DOCK_BUTTON_SIZE_PX,
  },
  buttonSurface: {
    height: '100%',
  },
  buttonContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollToTopPositioner: {
    position: 'absolute',
    left: '50%',
    marginLeft: -(INVENTORY_DOCK_BUTTON_SIZE_PX / 2),
    bottom: INVENTORY_DOCK_BUTTON_SIZE_PX + INVENTORY_DOCK_BUTTON_GAP_PX,
    width: INVENTORY_DOCK_BUTTON_SIZE_PX,
    height: INVENTORY_DOCK_BUTTON_SIZE_PX,
  },
  scrollToTopHitTarget: {
    width: INVENTORY_DOCK_BUTTON_SIZE_PX,
    height: INVENTORY_DOCK_BUTTON_SIZE_PX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollToTopSurface: {
    width: SCROLL_TO_TOP_SURFACE_SIZE_PX,
    height: SCROLL_TO_TOP_SURFACE_SIZE_PX,
  },
  buttonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
});
