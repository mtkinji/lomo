import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../../theme';

type Props = {
  currentIndex: number;
  count: number;
  onSelectPage: (index: number) => void;
  pageWidth?: number;
  reduceMotion?: boolean;
  scrollDirection?: SharedValue<number>;
  scrollOffset?: SharedValue<number>;
};

const TARGET_SIZE = 44;
const SLOT_SPACING = 34;
const DOT_SIZE = 7;
const ACTIVE_WIDTH = 22;
const TEARDROP_WIDTH = 20;
const TEARDROP_HEIGHT = 13;

export function OnboardingPageIndicator({
  currentIndex,
  count,
  onSelectPage,
  pageWidth = 1,
  reduceMotion = false,
  scrollDirection,
  scrollOffset,
}: Props) {
  const fallbackOffset = useSharedValue(currentIndex * Math.max(1, pageWidth));
  const fallbackDirection = useSharedValue(1);
  const resolvedOffset = scrollOffset ?? fallbackOffset;
  const resolvedDirection = scrollDirection ?? fallbackDirection;
  const resolvedPageWidth = Math.max(1, pageWidth);
  const railWidth = (count - 1) * SLOT_SPACING + TARGET_SIZE;

  useEffect(() => {
    if (!scrollOffset) fallbackOffset.value = currentIndex * resolvedPageWidth;
  }, [currentIndex, fallbackOffset, resolvedPageWidth, scrollOffset]);

  return (
    <View
      accessibilityLabel={`Page ${currentIndex + 1} of ${count}`}
      accessible={false}
      style={[styles.container, { width: railWidth }]}
      testID="capabilityOnboarding.pageIndicator"
    >
      <View
        pointerEvents="none"
        style={[styles.visualRail, { width: railWidth }]}
      >
        {Array.from({ length: count }, (_, index) => (
          <View
            key={`base-${index}`}
            style={[styles.visualSlot, { left: index * SLOT_SPACING }]}
          >
            <View style={styles.dot} />
          </View>
        ))}
        {reduceMotion ? (
          <View
            style={[styles.visualSlot, { left: currentIndex * SLOT_SPACING }]}
            testID="capabilityOnboarding.staticSelection"
          >
            <View style={styles.staticSelection} />
          </View>
        ) : (
          <LiquidTraveler
            count={count}
            direction={resolvedDirection}
            pageWidth={resolvedPageWidth}
            scrollOffset={resolvedOffset}
          />
        )}
      </View>
      {Array.from({ length: count }, (_, index) => (
        <Pressable
          accessibilityLabel={`Go to page ${index + 1} of ${count}`}
          accessibilityRole="button"
          accessibilityState={{ selected: index === currentIndex }}
          key={index}
          onPress={() => onSelectPage(index)}
          style={[styles.target, { left: index * SLOT_SPACING }]}
          testID={`capabilityOnboarding.pageIndicator.${index + 1}`}
        />
      ))}
    </View>
  );
}

function LiquidTraveler({
  count,
  direction,
  pageWidth,
  scrollOffset,
}: {
  count: number;
  direction: SharedValue<number>;
  pageWidth: number;
  scrollOffset: SharedValue<number>;
}) {
  const capsuleStyle = useAnimatedStyle(() => {
    const pageProgress = Math.max(0, Math.min(count - 1, scrollOffset.value / pageWidth));
    const distanceFromPage = Math.abs(pageProgress - Math.round(pageProgress));
    const morph = Math.min(1, distanceFromPage * 2);
    const width = interpolate(
      morph,
      [0, 0.5, 1],
      [ACTIVE_WIDTH, 14, 11],
      Extrapolation.CLAMP,
    );
    const height = interpolate(
      morph,
      [0, 0.5, 1],
      [DOT_SIZE, 9, 11],
      Extrapolation.CLAMP,
    );

    return {
      borderRadius: height / 2,
      height,
      left: pageProgress * SLOT_SPACING + (TARGET_SIZE - width) / 2,
      opacity: interpolate(morph, [0, 0.4, 0.7], [1, 1, 0], Extrapolation.CLAMP),
      top: (TARGET_SIZE - height) / 2,
      width,
    };
  }, [count, pageWidth, scrollOffset]);

  const teardropStyle = useAnimatedStyle(() => {
    const pageProgress = Math.max(0, Math.min(count - 1, scrollOffset.value / pageWidth));
    const distanceFromPage = Math.abs(pageProgress - Math.round(pageProgress));
    const morph = Math.min(1, distanceFromPage * 2);

    return {
      left: pageProgress * SLOT_SPACING + (TARGET_SIZE - TEARDROP_WIDTH) / 2,
      opacity: interpolate(morph, [0, 0.12, 0.4], [0, 0.45, 1], Extrapolation.CLAMP),
      top: (TARGET_SIZE - TEARDROP_HEIGHT) / 2,
      transform: [
        { scaleX: direction.value >= 0 ? 1 : -1 },
        { scale: interpolate(morph, [0, 0.45, 1], [0.7, 0.9, 1], Extrapolation.CLAMP) },
      ],
    };
  }, [count, direction, pageWidth, scrollOffset]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[styles.liquidCapsule, capsuleStyle]}
        testID="capabilityOnboarding.liquidCapsule"
      />
      <Animated.View
        style={[styles.liquidTeardrop, teardropStyle]}
        testID="capabilityOnboarding.liquidTeardrop"
      >
        <Svg height={TEARDROP_HEIGHT} viewBox="0 0 24 16" width={TEARDROP_WIDTH}>
          <Path
            d="M1 8 C6 5.5 7.5 1 14.5 1 C19.2 1 23 4.1 23 8 C23 11.9 19.2 15 14.5 15 C7.5 15 6 10.5 1 8 Z"
            fill={colors.primary}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: TARGET_SIZE,
    position: 'relative',
  },
  target: {
    position: 'absolute',
    top: 0,
    width: TARGET_SIZE,
    height: TARGET_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visualRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: TARGET_SIZE,
  },
  visualSlot: {
    position: 'absolute',
    width: TARGET_SIZE,
    height: TARGET_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: 4,
    backgroundColor: colors.primary,
    opacity: 0.34,
  },
  staticSelection: {
    width: ACTIVE_WIDTH,
    height: DOT_SIZE,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  liquidCapsule: {
    position: 'absolute',
    backgroundColor: colors.primary,
  },
  liquidTeardrop: {
    position: 'absolute',
    width: TEARDROP_WIDTH,
    height: TEARDROP_HEIGHT,
  },
});
