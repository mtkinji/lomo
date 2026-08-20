import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { colors } from '../../theme';

type Props = {
  currentIndex: number;
  count: number;
  onSelectPage: (index: number) => void;
  pageWidth?: number;
  reduceMotion?: boolean;
  scrollOffset?: SharedValue<number>;
};

const TARGET_SIZE = 44;
const DOT_SIZE = 7;
const ACTIVE_WIDTH = 22;

export function OnboardingPageIndicator({
  currentIndex,
  count,
  onSelectPage,
  pageWidth = 1,
  reduceMotion = false,
  scrollOffset,
}: Props) {
  const fallbackOffset = useSharedValue(currentIndex * Math.max(1, pageWidth));
  const resolvedOffset = scrollOffset ?? fallbackOffset;
  const resolvedPageWidth = Math.max(1, pageWidth);

  useEffect(() => {
    if (!scrollOffset) fallbackOffset.value = currentIndex * resolvedPageWidth;
  }, [currentIndex, fallbackOffset, resolvedPageWidth, scrollOffset]);

  return (
    <View
      accessibilityLabel={`Page ${currentIndex + 1} of ${count}`}
      accessible={false}
      style={styles.container}
      testID="capabilityOnboarding.pageIndicator"
    >
      <View
        pointerEvents="none"
        style={[styles.visualRail, { width: count * TARGET_SIZE }]}
      >
        {Array.from({ length: count }, (_, index) => (
          <View
            key={`base-${index}`}
            style={[styles.visualSlot, { left: index * TARGET_SIZE }]}
          >
            <View style={styles.dot} />
          </View>
        ))}
        {reduceMotion ? (
          <View
            style={[styles.visualSlot, { left: currentIndex * TARGET_SIZE }]}
            testID="capabilityOnboarding.staticSelection"
          >
            <View style={styles.staticSelection} />
          </View>
        ) : (
          <>
            {Array.from({ length: count - 1 }, (_, index) => (
              <LiquidBridge
                index={index}
                key={`bridge-${index}`}
                pageWidth={resolvedPageWidth}
                scrollOffset={resolvedOffset}
              />
            ))}
            {Array.from({ length: count }, (_, index) => (
              <LiquidBlob
                index={index}
                key={`blob-${index}`}
                pageWidth={resolvedPageWidth}
                scrollOffset={resolvedOffset}
              />
            ))}
          </>
        )}
      </View>
      {Array.from({ length: count }, (_, index) => (
        <Pressable
          accessibilityLabel={`Go to page ${index + 1} of ${count}`}
          accessibilityRole="button"
          accessibilityState={{ selected: index === currentIndex }}
          key={index}
          onPress={() => onSelectPage(index)}
          style={styles.target}
          testID={`capabilityOnboarding.pageIndicator.${index + 1}`}
        />
      ))}
    </View>
  );
}

function LiquidBlob({
  index,
  pageWidth,
  scrollOffset,
}: {
  index: number;
  pageWidth: number;
  scrollOffset: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const pageProgress = scrollOffset.value / pageWidth;
    const distance = Math.abs(pageProgress - index);
    return {
      opacity: interpolate(distance, [0, 0.5, 1], [1, 1, 0], Extrapolation.CLAMP),
      width: interpolate(
        distance,
        [0, 0.5, 1],
        [ACTIVE_WIDTH, 13, DOT_SIZE],
        Extrapolation.CLAMP,
      ),
    };
  }, [index, pageWidth, scrollOffset]);

  return (
    <View
      pointerEvents="none"
      style={[styles.visualSlot, { left: index * TARGET_SIZE }]}
    >
      <Animated.View
        style={[styles.liquidBlob, animatedStyle]}
        testID="capabilityOnboarding.liquidBlob"
      />
    </View>
  );
}

function LiquidBridge({
  index,
  pageWidth,
  scrollOffset,
}: {
  index: number;
  pageWidth: number;
  scrollOffset: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const pageProgress = scrollOffset.value / pageWidth;
    const segmentProgress = Math.max(0, Math.min(1, pageProgress - index));
    const pull = 1 - Math.abs(segmentProgress - 0.5) * 2;
    const insideSegment = pageProgress >= index && pageProgress <= index + 1;
    return {
      height: 2.5 + pull * 1.5,
      opacity: insideSegment ? pull * 0.88 : 0,
      transform: [{ scaleX: 0.08 + pull * 0.92 }],
    };
  }, [index, pageWidth, scrollOffset]);

  return (
    <View
      pointerEvents="none"
      style={[styles.bridgeSlot, { left: index * TARGET_SIZE + TARGET_SIZE / 2 }]}
    >
      <Animated.View
        style={[styles.liquidBridge, animatedStyle]}
        testID="capabilityOnboarding.liquidBridge"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  target: {
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
  bridgeSlot: {
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
  liquidBlob: {
    height: DOT_SIZE,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  liquidBridge: {
    width: TARGET_SIZE,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
