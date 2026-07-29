import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import {
  createSevenOutPieces,
  fittedPotFontSize,
  formatPotValue,
  potTier,
  sevenOutEffect,
  type PotSizeMode,
  type SevenOutEffect,
} from './bankPotPresentation';

type Props = {
  pot: number;
  rollInRound: number;
  message: string;
  rolling: boolean;
  mode?: PotSizeMode;
};

const tierColors = {
  small: gamesTheme.colors.white,
  building: gamesTheme.colors.turmeric,
  maximum: gamesTheme.colors.coral,
} as const;

export function BankPot({ pot, rollInRound, message, rolling, mode = 'portrait' }: Props) {
  const previousPot = useRef(pot);
  const previousRollInRound = useRef(rollInRound);
  const counterProgress = useRef(new Animated.Value(1)).current;
  const theaterProgress = useRef(new Animated.Value(1)).current;
  const riskProgress = useRef(new Animated.Value(1)).current;
  const [fromPot, setFromPot] = useState(pot);
  const [animatingCounter, setAnimatingCounter] = useState(false);
  const [effect, setEffect] = useState<SevenOutEffect | null>(null);
  const [lostPot, setLostPot] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const oldPot = previousPot.current;
    const oldRollInRound = previousRollInRound.current;
    const enteredRisk = oldRollInRound < 3 && rollInRound >= 3;
    const sevenOut = oldPot > 0 && pot === 0 && message.startsWith('Seven out');
    let counterAnimation: Animated.CompositeAnimation | undefined;
    let theaterAnimation: Animated.CompositeAnimation | undefined;
    let riskAnimation: Animated.CompositeAnimation | undefined;

    if (enteredRisk && !reduceMotion) {
      riskProgress.setValue(0);
      riskAnimation = Animated.timing(riskProgress, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      riskAnimation.start();
    }

    if (pot !== oldPot) {
      setFromPot(oldPot);
      setAnimatingCounter(true);
      counterProgress.setValue(reduceMotion ? 1 : 0);

      if (sevenOut && !reduceMotion) {
        const nextEffect = sevenOutEffect(oldPot);
        setLostPot(oldPot);
        setEffect(nextEffect);
        theaterProgress.setValue(0);
        theaterAnimation = Animated.parallel([
          Animated.timing(theaterProgress, {
            toValue: 1,
            duration: nextEffect === 'catastrophe' ? 920 : 760,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(nextEffect === 'catastrophe' ? 480 : 390),
            Animated.timing(counterProgress, {
              toValue: 1,
              duration: 260,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
        ]);
        theaterAnimation.start(({ finished }) => {
          if (!finished) return;
          setAnimatingCounter(false);
          setEffect(null);
        });
      } else if (reduceMotion) {
        setAnimatingCounter(false);
        setEffect(null);
      } else {
        setEffect(null);
        counterAnimation = Animated.timing(counterProgress, {
          toValue: 1,
          duration: 560,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        });
        counterAnimation.start(({ finished }) => {
          if (finished) setAnimatingCounter(false);
        });
      }
    }

    previousPot.current = pot;
    previousRollInRound.current = rollInRound;
    return () => {
      counterAnimation?.stop();
      theaterAnimation?.stop();
      riskAnimation?.stop();
    };
  }, [counterProgress, message, pot, reduceMotion, riskProgress, rollInRound, theaterProgress]);

  const tier = potTier(Math.max(pot, animatingCounter ? fromPot : pot));
  const color = tierColors[tier];
  const fontSize = fittedPotFontSize(Math.max(pot, animatingCounter ? fromPot : pot), mode);
  const lineHeight = Math.ceil(fontSize * 1.06);
  const atRisk = rollInRound >= 3;
  const label = rolling ? 'ROLLING' : atRisk ? 'AT RISK' : 'POT';
  const pieces = useMemo(() => effect ? createSevenOutPieces(effect) : [], [effect]);
  const sevenOut = message.startsWith('Seven out') && pot === 0;

  const shake = effect === 'rattle' || effect === 'catastrophe'
    ? theaterProgress.interpolate({ inputRange: [0, 0.1, 0.2, 0.3, 0.42, 0.56, 1], outputRange: [0, -9, 9, -7, 7, -3, 0] })
    : 0;
  const theaterScale = effect === 'explosion' || effect === 'catastrophe'
    ? theaterProgress.interpolate({ inputRange: [0, 0.18, 0.38, 1], outputRange: [1, 1.18, 0.88, 1] })
    : 1;
  const riskX = riskProgress.interpolate({ inputRange: [0, 0.2, 0.4, 0.62, 0.82, 1], outputRange: [0, -5, 5, -3, 3, 0] });

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLiveRegion={sevenOut ? 'assertive' : 'polite'}
      accessibilityLabel={sevenOut ? `Seven out. Pot reset to zero.` : `${atRisk ? 'At risk' : 'Pot'}, ${formatPotValue(pot)} points`}
      style={[styles.root, mode !== 'portrait' ? styles.rootWide : null]}
    >
      <Text style={[styles.label, atRisk ? styles.labelRisk : null]}>{label}</Text>
      <Animated.View style={[styles.counterStage, { transform: [{ translateX: riskX }, { translateX: shake }, { scale: theaterScale }] }]}>
        {effect === 'catastrophe' ? <Animated.View style={[styles.flash, { opacity: theaterProgress.interpolate({ inputRange: [0, 0.08, 0.28, 1], outputRange: [0, 0.5, 0.12, 0] }) }]} /> : null}
        {pieces.map((piece) => {
          const start = 0.02 + piece.delay / 1_000;
          const end = Math.min(0.98, start + piece.duration / 1_000);
          return <Animated.View key={`${effect}-${piece.id}`} style={[
            styles.piece,
            piece.round ? styles.pieceRound : null,
            {
              width: piece.size,
              height: piece.size,
              backgroundColor: effect === 'poof' ? 'rgba(255,249,237,0.72)' : piece.id % 2 === 0 ? gamesTheme.colors.turmeric : gamesTheme.colors.coral,
              opacity: theaterProgress.interpolate({ inputRange: [0, start, Math.min(end, start + 0.1), end, 1], outputRange: [0, 0, 1, 0, 0] }),
              transform: [
                { translateX: theaterProgress.interpolate({ inputRange: [0, end, 1], outputRange: [0, piece.x, piece.x] }) },
                { translateY: theaterProgress.interpolate({ inputRange: [0, end, 1], outputRange: [0, piece.y, piece.y + 34] }) },
                { scale: theaterProgress.interpolate({ inputRange: [0, start, end, 1], outputRange: [0.35, 0.35, effect === 'poof' ? 1.5 : 1, 0.7] }) },
                { rotate: `${piece.id % 2 === 0 ? 135 : -135}deg` },
              ],
            },
          ]} />;
        })}
        <MechanicalValue
          from={animatingCounter ? fromPot : pot}
          to={pot}
          progress={counterProgress}
          fontSize={fontSize}
          lineHeight={lineHeight}
          color={color}
        />
      </Animated.View>
      {effect ? <Text style={styles.effectLabel}>{effect === 'catastrophe' ? `${formatPotValue(lostPot)} GONE!` : 'SEVEN OUT'}</Text> : null}
    </View>
  );
}

function MechanicalValue({ from, to, progress, fontSize, lineHeight, color }: {
  from: number;
  to: number;
  progress: Animated.Value;
  fontSize: number;
  lineHeight: number;
  color: string;
}) {
  const fromText = formatPotValue(from);
  const toText = formatPotValue(to);
  const length = Math.max(fromText.length, toText.length);
  const fromChars = fromText.padStart(length, ' ').split('');
  const toChars = toText.padStart(length, ' ').split('');

  return <View style={styles.digits} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {toChars.map((next, index) => {
      const previous = fromChars[index];
      const punctuation = next === ',' || previous === ',';
      const slotWidth = Math.ceil(fontSize * (punctuation ? 0.3 : 0.61));
      const changed = previous !== next;
      if (!changed) return <Text key={index} style={[styles.digit, { width: slotWidth, fontSize, lineHeight, color }]}>{next}</Text>;
      const orderFromRight = length - index - 1;
      const start = 0.02 + Math.min(0.4, orderFromRight * 0.055);
      const end = Math.min(0.96, start + 0.48);
      return <View key={index} style={{ width: slotWidth, height: lineHeight, overflow: 'hidden' }}>
        <Animated.View style={{ transform: [{ translateY: progress.interpolate({ inputRange: [0, start, end, 1], outputRange: [0, 0, -lineHeight, -lineHeight] }) }] }}>
          <Text style={[styles.digit, { width: slotWidth, height: lineHeight, fontSize, lineHeight, color }]}>{previous}</Text>
          <Text style={[styles.digit, { width: slotWidth, height: lineHeight, fontSize, lineHeight, color }]}>{next}</Text>
        </Animated.View>
      </View>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  root: { minWidth: '76%', minHeight: 78, alignSelf: 'center', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 8 },
  rootWide: { minHeight: 94, justifyContent: 'center' },
  label: { fontFamily: gamesTheme.type.utility, fontSize: 9, letterSpacing: 1.8, color: 'rgba(255,255,255,0.62)' },
  labelRisk: { color: gamesTheme.colors.turmeric },
  counterStage: { minWidth: '100%', alignItems: 'center', justifyContent: 'center' },
  digits: { zIndex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  digit: { textAlign: 'center', fontFamily: gamesTheme.type.display },
  piece: { position: 'absolute', zIndex: 3, left: '50%', top: '50%', marginLeft: -5, marginTop: -5, borderRadius: 2 },
  pieceRound: { borderRadius: 999 },
  flash: { position: 'absolute', width: 220, height: 90, borderRadius: 45, backgroundColor: gamesTheme.colors.coral, zIndex: 1 },
  effectLabel: { position: 'absolute', bottom: 0, fontFamily: gamesTheme.type.utility, fontSize: 9, letterSpacing: 1.5, color: gamesTheme.colors.turmeric },
});
