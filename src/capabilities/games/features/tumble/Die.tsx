import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, View } from 'react-native';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';

const faces: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

export function Die({ value, rolling, selected, candidate, onPress, small = false, large = false }: { value: number; rolling: boolean; selected?: boolean; candidate?: boolean; onPress?: () => void; small?: boolean; large?: boolean }) {
  const motion = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const size = large ? 92 : small ? 58 : 70;
  const pipPositions = useMemo(() => {
    const edge = Math.round(size * 0.2);
    const center = Math.round((size - 9) / 2);
    return [
      { top: edge, left: edge }, { top: edge, left: center }, { top: edge, right: edge },
      { top: center, left: edge }, { top: center, left: center }, { top: center, right: edge },
      { bottom: edge, left: edge }, { bottom: edge, left: center }, { bottom: edge, right: edge },
    ];
  }, [size]);

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
    Animated.spring(motion, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }).start();
  }, [motion, reduceMotion, rolling, value]);

  return (
    <Pressable accessibilityRole={onPress ? 'button' : 'image'} accessibilityLabel={`Die showing ${value}${selected ? ', selected' : candidate ? ', can score' : ''}`} accessibilityState={onPress ? { selected } : undefined} disabled={onPress ? false : undefined} onPress={onPress}>
      <Animated.View style={[
        styles.die,
        { width: size, height: size },
        candidate ? styles.candidate : null,
        selected ? styles.selected : null,
        { transform: [
          { translateY: motion.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, -44, selected ? -10 : 0] }) },
          { rotate: motion.interpolate({ inputRange: [0, 1], outputRange: ['0deg', rolling ? '720deg' : '0deg'] }) },
          { scale: selected ? 1.05 : 1 },
        ] },
      ]}>
        <View pointerEvents="none" style={styles.faceHighlight} />
        {pipPositions.map((position, index) => <View key={index} style={[styles.pip, position, { opacity: faces[value].includes(index) ? 1 : 0 }]}><View style={styles.pipHighlight} /></View>)}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  die: { borderRadius: 16, backgroundColor: '#FFF8E9', borderWidth: 1, borderColor: '#CFC3AE', shadowColor: '#041D17', shadowOffset: { width: 5, height: 10 }, shadowOpacity: 0.32, shadowRadius: 7 },
  faceHighlight: { position: 'absolute', top: 4, right: 5, bottom: 7, left: 4, borderRadius: 12, borderTopWidth: 2, borderLeftWidth: 2, borderColor: 'rgba(255,255,255,0.85)' },
  pip: { position: 'absolute', width: 9, height: 9, borderRadius: 5, overflow: 'hidden', backgroundColor: '#17140F', borderWidth: 1, borderColor: '#080705' },
  pipHighlight: { width: 3, height: 2, marginTop: 1, marginLeft: 1, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.28)' },
  candidate: { borderColor: gamesTheme.colors.turmeric, borderWidth: 3, shadowColor: gamesTheme.colors.turmeric, shadowOpacity: 0.7, shadowRadius: 10 },
  selected: { backgroundColor: '#FFF2B7', borderColor: gamesTheme.colors.turmeric, borderWidth: 3 },
});
