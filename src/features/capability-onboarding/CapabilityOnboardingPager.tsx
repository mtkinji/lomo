import {
  ScrollView,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { colors } from '../../theme';
import { FullScreenInterstitial } from '../../ui/FullScreenInterstitial';
import { useAccessibilityPreferences } from '../../ui/hooks/useAccessibilityPreferences';
import type { CapabilityOnboardingContract } from './capabilityOnboardingContracts';
import type { CapabilityOnboardingPageId } from './capabilityOnboardingState';
import { CapabilityValueDoorScreen } from './CapabilityValueDoorScreen';
import { CapabilityWelcomeScreen } from './CapabilityWelcomeScreen';
import { OnboardingPageIndicator } from './OnboardingPageIndicator';

type PagerPage =
  | { id: 'welcome'; kind: 'welcome' }
  | { id: CapabilityOnboardingContract['id']; kind: 'door'; door: CapabilityOnboardingContract };

export function CapabilityOnboardingPager({
  doors,
  initialPageId,
  onExplore,
  onPageChanged,
  onStartDoor,
}: {
  doors: CapabilityOnboardingContract[];
  initialPageId: CapabilityOnboardingPageId;
  onExplore: (input: 'button' | 'swipe-past-last') => void;
  onPageChanged: (pageId: CapabilityOnboardingPageId, index: number) => void;
  onStartDoor: (door: CapabilityOnboardingContract) => void;
}) {
  const insets = useSafeAreaInsets();
  const { reduceMotionEnabled } = useAccessibilityPreferences();
  const pages = useMemo<PagerPage[]>(
    () => [
      { id: 'welcome', kind: 'welcome' },
      ...doors.map((door) => ({ id: door.id, kind: 'door' as const, door })),
    ],
    [doors],
  );
  const initialIndex = Math.max(0, pages.findIndex(({ id }) => id === initialPageId));
  const [index, setIndex] = useState(initialIndex);
  const indexRef = useRef(initialIndex);
  const [width, setWidth] = useState(0);
  const pagerRef = useRef<ScrollView>(null);
  const scrollOffset = useSharedValue(initialIndex * width);
  const handleAnimatedScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffset.value = event.contentOffset.x;
    },
  });

  useEffect(() => {
    const nextIndex = Math.max(0, pages.findIndex(({ id }) => id === initialPageId));
    indexRef.current = nextIndex;
    setIndex(nextIndex);
    scrollOffset.value = nextIndex * width;
    if (width > 0) pagerRef.current?.scrollTo({ x: nextIndex * width, animated: false });
  }, [initialPageId, pages, scrollOffset, width]);

  const commitIndex = useCallback((nextIndex: number) => {
    const clamped = Math.max(0, Math.min(pages.length - 1, nextIndex));
    indexRef.current = clamped;
    setIndex(clamped);
    onPageChanged(pages[clamped].id, clamped);
  }, [onPageChanged, pages]);

  const settleToIndex = useCallback((nextIndex: number) => {
    const clamped = Math.max(0, Math.min(pages.length - 1, nextIndex));
    commitIndex(clamped);
    pagerRef.current?.scrollTo({
      x: clamped * width,
      animated: !reduceMotionEnabled,
    });
  }, [commitIndex, reduceMotionEnabled, width]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    if (nextWidth <= 0 || nextWidth === width) return;
    setWidth(nextWidth);
    scrollOffset.value = indexRef.current * nextWidth;
    pagerRef.current?.scrollTo({ x: indexRef.current * nextWidth, animated: false });
  }, [scrollOffset, width]);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (width <= 0) return;
      commitIndex(Math.round(event.nativeEvent.contentOffset.x / width));
    },
    [commitIndex, width],
  );

  const handleScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (width <= 0 || indexRef.current !== pages.length - 1) return;
      const lastOffset = (pages.length - 1) * width;
      const offset = event.nativeEvent.contentOffset.x;
      const targetOffset = event.nativeEvent.targetContentOffset?.x ?? offset;
      const velocity = event.nativeEvent.velocity?.x ?? 0;
      if (offset > lastOffset + width * 0.08 || targetOffset > lastOffset || velocity > 0.2) {
        onExplore('swipe-past-last');
      }
    },
    [onExplore, pages.length, width],
  );

  const handleAccessibilityAction = useCallback((event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'increment') {
      if (indexRef.current === pages.length - 1) {
        onExplore('swipe-past-last');
      } else {
        settleToIndex(indexRef.current + 1);
      }
    }
    if (event.nativeEvent.actionName === 'decrement') {
      settleToIndex(indexRef.current - 1);
    }
  }, [onExplore, pages.length, settleToIndex]);

  return (
    <FullScreenInterstitial
      backgroundColor="parchment"
      contentStyle={styles.interstitial}
      progression="button"
      visible
      withinModal
    >
      <View onLayout={handleLayout} style={styles.viewport}>
        <Animated.ScrollView
          ref={pagerRef}
          accessibilityActions={[
            { name: 'increment', label: index === pages.length - 1 ? 'Explore Kwilt' : 'Next page' },
            { name: 'decrement', label: 'Previous page' },
          ]}
          accessibilityLabel={`Onboarding page ${index + 1} of ${pages.length}`}
          accessible={false}
          bounces
          directionalLockEnabled
          horizontal
          onAccessibilityAction={handleAccessibilityAction}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          onScroll={handleAnimatedScroll}
          onScrollEndDrag={handleScrollEndDrag}
          pagingEnabled
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          style={styles.pager}
          testID="capabilityOnboarding.pager"
        >
          {pages.map((page, pageIndex) => (
            <View
              accessibilityElementsHidden={pageIndex !== index}
              importantForAccessibility={pageIndex === index ? 'auto' : 'no-hide-descendants'}
              key={page.id}
              style={[styles.page, { width }]}
            >
              {page.kind === 'welcome' ? (
                <CapabilityWelcomeScreen />
              ) : (
                <CapabilityValueDoorScreen
                  door={page.door}
                  onExplore={() => onExplore('button')}
                  onStart={() => onStartDoor(page.door)}
                />
              )}
            </View>
          ))}
        </Animated.ScrollView>
        <View
          pointerEvents="box-none"
          style={[styles.indicator, { bottom: insets.bottom + 4 }]}
        >
          <OnboardingPageIndicator
            count={pages.length}
            currentIndex={index}
            onSelectPage={settleToIndex}
            pageWidth={width}
            reduceMotion={reduceMotionEnabled}
            scrollOffset={scrollOffset}
          />
        </View>
      </View>
    </FullScreenInterstitial>
  );
}

const styles = StyleSheet.create({
  interstitial: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  viewport: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.parchment,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  indicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
