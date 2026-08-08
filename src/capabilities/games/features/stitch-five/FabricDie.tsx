import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text as NativeText, View, type TextProps } from 'react-native';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';

const faces: Record<number, number[]> = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

const fabrics = ['#F5C1BD', '#F4B28C', '#F1D27A', '#93C6A4', '#8FC4D7', '#B7A4D5'];
const Text = (props: TextProps) => <NativeText maxFontSizeMultiplier={1.35} {...props} />;

type Props = {
  value: number;
  rolling: boolean;
  pinned: boolean;
  canPin: boolean;
  onPress: () => void;
};

export function FabricDie({ value, rolling, pinned, canPin, onPress }: Props) {
  const motion = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const pipPositions = useMemo(() => [
    { top: 10, left: 10 }, { top: 10, left: 25 }, { top: 10, right: 10 },
    { top: 25, left: 10 }, { top: 25, left: 25 }, { top: 25, right: 10 },
    { bottom: 10, left: 10 }, { bottom: 10, left: 25 }, { bottom: 10, right: 10 },
  ], []);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!rolling || reduceMotion) {
      motion.setValue(1);
      return;
    }
    motion.setValue(0);
    Animated.spring(motion, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }).start();
  }, [motion, reduceMotion, rolling, value]);

  return <View style={styles.wrap}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Fabric die showing ${value}, ${pinned ? 'pinned' : 'not pinned'}`}
      accessibilityHint={canPin ? (pinned ? 'Unpins this die before the next roll' : 'Pins this die between rolls') : undefined}
      accessibilityState={{ selected: pinned, disabled: !canPin }}
      disabled={!canPin}
      onPress={onPress}
      style={styles.target}
    >
      <Animated.View style={[
        styles.die,
        { backgroundColor: fabrics[value - 1] },
        pinned ? styles.pinned : null,
        { transform: [
          { translateY: motion.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, -22, pinned ? -5 : 0] }) },
          { rotate: motion.interpolate({ inputRange: [0, 1], outputRange: ['0deg', rolling ? '360deg' : '0deg'] }) },
        ] },
      ]}>
        <View pointerEvents="none" style={styles.seamHorizontal} />
        <View pointerEvents="none" style={styles.seamVertical} />
        {pipPositions.map((position, index) => <View key={index} style={[styles.pip, position, { opacity: faces[value]?.includes(index) ? 1 : 0 }]} />)}
      </Animated.View>
    </Pressable>
    <Text style={[styles.pinLabel, !pinned ? styles.pinLabelHidden : null]}>PINNED</Text>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { width: 60, alignItems: 'center' },
  target: { width: 60, minHeight: 60, alignItems: 'center', justifyContent: 'center' },
  die: { width: 56, height: 56, borderRadius: 15, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(32,29,24,0.28)', shadowColor: '#5A3422', shadowOffset: { width: 2, height: 5 }, shadowOpacity: 0.22, shadowRadius: 5 },
  pinned: { borderWidth: 3, borderColor: gamesTheme.colors.ink, shadowOpacity: 0.38 },
  seamHorizontal: { position: 'absolute', left: 5, right: 5, top: 27, borderTopWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.38)' },
  seamVertical: { position: 'absolute', top: 5, bottom: 5, left: 27, borderLeftWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.32)' },
  pip: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: gamesTheme.colors.ink },
  pinLabel: { marginTop: 1, fontFamily: gamesTheme.type.utility, fontSize: 7, letterSpacing: 0.7, color: gamesTheme.colors.ink },
  pinLabelHidden: { opacity: 0 },
});
