import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import type { WinnerCelebration as WinnerCelebrationData } from '@/src/capabilities/games/domain/celebration';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { createConfettiPieces } from './confetti';

const colors = [gamesTheme.colors.turmeric, gamesTheme.colors.coral, '#F9F1D0', '#63B89C', '#D889B2'];
const pieces = createConfettiPieces();

type Props = { celebration: WinnerCelebrationData | null; onComplete: () => void };

export function WinCelebration({ celebration, onComplete }: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const particleProgress = useRef(pieces.map(() => new Animated.Value(0))).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!celebration) return;
    progress.setValue(0);
    particleProgress.forEach((value) => value.setValue(0));
    const cardAnimation = reduceMotion ? null : Animated.timing(progress, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    const confettiAnimation = reduceMotion ? null : Animated.parallel(pieces.map((piece, index) => (
      Animated.sequence([
        Animated.delay(piece.delay),
        Animated.timing(particleProgress[index], {
          toValue: 1,
          duration: piece.duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    )));
    cardAnimation?.start();
    confettiAnimation?.start();
    const timer = setTimeout(onComplete, reduceMotion ? 3000 : 4200);
    return () => {
      cardAnimation?.stop();
      confettiAnimation?.stop();
      clearTimeout(timer);
    };
  }, [celebration, onComplete, particleProgress, progress, reduceMotion]);

  if (!celebration) return null;
  const names = celebration.names.join(' & ');
  const verb = celebration.names.length === 1 ? 'wins' : 'win';

  return (
    <View pointerEvents="none" style={styles.overlay}>
      {!reduceMotion ? pieces.map((piece, index) => (
        <Animated.View
          key={piece.id}
          style={[
            styles.confetti,
            {
              left: piece.left,
              top: piece.originTop,
              backgroundColor: colors[piece.id % colors.length],
              opacity: particleProgress[index].interpolate({ inputRange: [0, 0.04, 0.78, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateX: particleProgress[index].interpolate({ inputRange: [0, 0.18, 0.48, 1], outputRange: [0, piece.burstX, piece.burstX * 1.35, piece.driftX] }) },
                { translateY: particleProgress[index].interpolate({ inputRange: [0, 0.16, 0.34, 1], outputRange: [0, piece.burstY, piece.burstY * 0.35, piece.fallY] }) },
                { rotate: particleProgress[index].interpolate({ inputRange: [0, 1], outputRange: ['0deg', piece.turn] }) },
                { scaleX: particleProgress[index].interpolate({ inputRange: [0, 0.18, 0.38, 0.58, 0.78, 1], outputRange: [1, 0.25, 1, 0.3, 1, 0.4] }) },
              ],
            },
          ]}
        />
      )) : null}
      <Animated.View
        accessible
        accessibilityRole="alert"
        accessibilityLabel={`${names} ${verb} with ${celebration.score.toLocaleString()} points`}
        accessibilityLiveRegion="assertive"
        style={[styles.card, { transform: [{ scale: reduceMotion ? 1 : progress.interpolate({ inputRange: [0, 0.08, 0.16, 1], outputRange: [0.7, 1.08, 1, 1] }) }] }]}
      >
        <Text style={styles.eyebrow}>GAME WINNER</Text>
        <Text numberOfLines={2} adjustsFontSizeToFit style={styles.winner}>{names} {verb}!</Text>
        <Text style={styles.score}>{celebration.score.toLocaleString()} points</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  confetti: { position: 'absolute', top: 0, width: 10, height: 18, borderRadius: 3 },
  card: { width: '84%', maxWidth: 360, alignItems: 'center', paddingHorizontal: 22, paddingVertical: 24, borderRadius: gamesTheme.radius.lg, backgroundColor: gamesTheme.colors.turmeric, borderWidth: 3, borderColor: gamesTheme.colors.ink, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.28, shadowRadius: 20 },
  eyebrow: { fontFamily: gamesTheme.type.utility, fontSize: 11, letterSpacing: 2, color: 'rgba(32,29,24,0.62)' },
  winner: { marginTop: 6, textAlign: 'center', fontFamily: gamesTheme.type.display, fontSize: 38, lineHeight: 41, color: gamesTheme.colors.ink },
  score: { marginTop: 5, fontFamily: gamesTheme.type.utility, fontSize: 15, color: gamesTheme.colors.ink },
});
