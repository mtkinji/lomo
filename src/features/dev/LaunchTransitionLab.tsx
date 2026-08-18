import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { KWILT_REFRESH_COMPLETION_MS, KwiltLoader } from '../../ui/KwiltLoader';
import { Logo } from '../../ui/Logo';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { useAccessibilityPreferences } from '../../ui/hooks/useAccessibilityPreferences';
import { ButtonLabel, Text } from '../../ui/primitives';

type ReadinessMode = 'quick' | 'delayed';
type MotionMode = 'recede' | 'crossfade' | 'reduced';
type PlaybackStage = 'mark' | 'loading' | 'settling' | 'revealing' | 'complete';

type LaunchTransitionLabProps = {
  visible: boolean;
  onClose: () => void;
};

const QUICK_READY_MS = 900;
const DELAYED_READY_MS = 2400;
const LOADER_START_MS = 680;
const RECEDE_REVEAL_MS = 460;
const CROSSFADE_REVEAL_MS = 360;
const REDUCED_MOTION_REVEAL_MS = 220;
const MARK_SIZE = 92;

const LOGO_PIECES = [
  {
    id: 'spine',
    transform: 'translate(1 -2)',
    path: 'M49 9C70 9 87 26 87 47V187C87 217 70 241 47 247C26 252 10 244 10 228V48C10 26 27 9 49 9Z',
  },
  {
    id: 'upper',
    transform: 'translate(-2 -3)',
    path: 'M166 9C143 10 126 28 126 51V121C126 136 135 143 147 137C172 124 197 108 218 89C236 72 246 49 246 25C246 16 239 10 230 9C209 7 187 7 166 9Z',
  },
  {
    id: 'lower',
    transform: 'translate(9 0)',
    path: 'M218 140C234 139 246 149 246 164V215C246 233 232 247 214 247H113C104 247 100 238 104 229C127 178 168 144 218 140Z',
  },
] as const;

function FullMark() {
  return (
    <Svg width={MARK_SIZE} height={MARK_SIZE} viewBox="0 0 256 256">
      {LOGO_PIECES.map((piece) => (
        <Path
          key={piece.id}
          d={piece.path}
          fill={colors.parchment}
          transform={piece.transform}
        />
      ))}
    </Svg>
  );
}

function MockReadySurface({ scale }: { scale: Animated.AnimatedInterpolation<number> }) {
  const insets = useSafeAreaInsets();

  return (
    <Animated.View style={[styles.mockSurface, { transform: [{ scale }] }]}>
      <View style={[styles.mockHeader, { paddingTop: insets.top + spacing.md }]}>
        <View>
          <Text style={styles.mockEyebrow}>TUESDAY, AUGUST 18</Text>
          <Text style={styles.mockTitle}>Today</Text>
        </View>
        <View style={styles.mockAvatar}>
          <Logo size={24} />
        </View>
      </View>

      <View style={styles.mockBody}>
        <Text style={styles.mockLead}>A few things worth showing up for.</Text>
        <View style={styles.mockList}>
          {[
            ['Send the school forms', 'Family · Today'],
            ['Review August spending', 'Money · 15 min'],
            ['Walk after dinner', 'Health · 30 min'],
          ].map(([title, detail], index) => (
            <View key={title} style={styles.mockRow}>
              <View style={[styles.mockCheck, index === 0 && styles.mockCheckActive]} />
              <View style={styles.mockRowCopy}>
                <Text style={styles.mockRowTitle}>{title}</Text>
                <Text style={styles.mockRowDetail}>{detail}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.mockDock, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Text style={styles.mockDockActive}>Today</Text>
        <Text style={styles.mockDockItem}>Plan</Text>
        <Text style={styles.mockDockItem}>More</Text>
      </View>
    </Animated.View>
  );
}

export function LaunchTransitionLab({ visible, onClose }: LaunchTransitionLabProps) {
  const { reduceMotionEnabled } = useAccessibilityPreferences();
  const insets = useSafeAreaInsets();
  const [readinessMode, setReadinessMode] = useState<ReadinessMode>('quick');
  const [motionMode, setMotionMode] = useState<MotionMode>('recede');
  const [playbackConfig, setPlaybackConfig] = useState<{
    readinessMode: ReadinessMode;
    motionMode: MotionMode;
  }>({ readinessMode: 'quick', motionMode: 'recede' });
  const [stage, setStage] = useState<PlaybackStage>('mark');
  const [runId, setRunId] = useState(0);
  const reveal = useRef(new Animated.Value(0)).current;
  const effectiveReduceMotion = reduceMotionEnabled || playbackConfig.motionMode === 'reduced';
  const recedes = !effectiveReduceMotion && playbackConfig.motionMode === 'recede';

  const replay = useCallback(() => {
    setPlaybackConfig({ readinessMode, motionMode });
    setRunId((current) => current + 1);
  }, [motionMode, readinessMode]);

  useEffect(() => {
    if (!visible) return;

    const timers: Array<ReturnType<typeof setTimeout>> = [];
    reveal.stopAnimation();
    reveal.setValue(0);
    setStage('mark');

    const beginReveal = () => {
      setStage('revealing');
      Animated.timing(reveal, {
        toValue: 1,
        duration: effectiveReduceMotion
          ? REDUCED_MOTION_REVEAL_MS
          : recedes
            ? RECEDE_REVEAL_MS
            : CROSSFADE_REVEAL_MS,
        easing: recedes
          ? Easing.bezier(0.16, 0.84, 0.24, 1)
          : Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setStage('complete');
      });
    };

    const readyAtMs = playbackConfig.readinessMode === 'quick' ? QUICK_READY_MS : DELAYED_READY_MS;

    if (!effectiveReduceMotion && playbackConfig.readinessMode === 'delayed') {
      timers.push(setTimeout(() => setStage('loading'), LOADER_START_MS));
      timers.push(setTimeout(() => setStage('settling'), readyAtMs));
      timers.push(setTimeout(beginReveal, readyAtMs + KWILT_REFRESH_COMPLETION_MS));
    } else {
      timers.push(setTimeout(beginReveal, readyAtMs));
    }

    return () => {
      timers.forEach(clearTimeout);
      reveal.stopAnimation();
    };
  }, [effectiveReduceMotion, playbackConfig.readinessMode, recedes, reveal, runId, visible]);

  const mockScale = reveal.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: recedes ? [1.018, 1.002, 1] : [1, 1, 1],
  });
  const greenOpacity = reveal.interpolate({
    inputRange: recedes ? [0, 0.12, 0.68, 1] : [0, 1],
    outputRange: recedes ? [1, 0.97, 0.12, 0] : [1, 0],
  });
  const markOpacity = reveal.interpolate({
    inputRange: recedes ? [0, 0.18, 0.62, 1] : [0, 1],
    outputRange: recedes ? [1, 0.98, 0, 0] : [1, 0],
  });
  const markScale = reveal.interpolate({
    inputRange: [0, 0.1, 0.62, 1],
    outputRange: recedes ? [1, 0.92, 0.14, 0.12] : [1, 1, 1, 1],
  });
  const wordmarkOpacity = reveal.interpolate({
    inputRange: [0, 0.22, 0.5],
    outputRange: [1, 0.5, 0],
  });
  const controlsOpacity = reveal.interpolate({
    inputRange: [0, 0.88, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      statusBarTranslucent
      visible={visible}
    >
      <View style={styles.root}>
        <MockReadySurface scale={mockScale} />

        <Animated.View
          accessibilityLabel={stage === 'complete' ? undefined : 'Opening Kwilt'}
          accessibilityRole={stage === 'complete' ? undefined : 'progressbar'}
          accessible={stage !== 'complete'}
          pointerEvents={stage === 'complete' ? 'none' : 'auto'}
          style={[styles.greenCurtain, { opacity: greenOpacity }]}
        >
          {stage === 'loading' || stage === 'settling' ? (
            <KwiltLoader
              color={colors.parchment}
              phase={stage === 'loading' ? 'loading' : 'completing'}
              size={MARK_SIZE}
            />
          ) : (
            <View style={styles.markLockup}>
              <View style={styles.markCanvas}>
                <Animated.View
                  style={[
                    styles.markPiece,
                    {
                      opacity: markOpacity,
                      transform: [{ scale: markScale }],
                    },
                  ]}
                >
                  <FullMark />
                </Animated.View>
              </View>
              <Animated.Text style={[styles.wordmark, { opacity: wordmarkOpacity }]}>Kwilt</Animated.Text>
            </View>
          )}
        </Animated.View>

        <Animated.View
          pointerEvents={stage === 'complete' ? 'auto' : 'none'}
          style={[
            styles.controls,
            {
              bottom: Math.max(insets.bottom, spacing.md),
              opacity: controlsOpacity,
            },
          ]}
        >
          <Text style={styles.controlsTitle}>Launch transition lab</Text>
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Readiness</Text>
            <SegmentedControl
              accessibilityLabel="Readiness timing"
              onChange={setReadinessMode}
              options={[
                { value: 'quick', label: 'Quick' },
                { value: 'delayed', label: 'Delayed' },
              ]}
              size="compact"
              testIDPrefix="launch-transition.readiness"
              value={readinessMode}
            />
          </View>
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Motion</Text>
            <SegmentedControl
              accessibilityLabel="Motion treatment"
              onChange={setMotionMode}
              options={[
                { value: 'recede', label: 'Recede' },
                { value: 'crossfade', label: 'Crossfade' },
                { value: 'reduced', label: 'Reduced' },
              ]}
              size="compact"
              testIDPrefix="launch-transition.motion"
              value={motionMode}
            />
          </View>
          {reduceMotionEnabled ? (
            <Text style={styles.systemMotionNote}>System Reduce Motion is on.</Text>
          ) : null}
          <View style={styles.actions}>
            <Button onPress={onClose} variant="secondary" style={styles.actionButton}>
              <ButtonLabel size="md">Close</ButtonLabel>
            </Button>
            <Button onPress={replay} variant="accent" style={styles.actionButton}>
              <ButtonLabel size="md" tone="inverse">Replay</ButtonLabel>
            </Button>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  mockSurface: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.canvas,
  },
  mockHeader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mockEyebrow: {
    ...typography.label,
    color: colors.muted,
  },
  mockTitle: {
    ...typography.titleXl,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  mockAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.shellAlt,
  },
  mockBody: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  mockLead: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  mockList: {
    gap: spacing.xs,
  },
  mockRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  mockCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  mockCheckActive: {
    borderColor: colors.pine700, // @kwilt-brand-moment: mock ready-state completion accent in the launch lab.
    backgroundColor: colors.pine300, // @kwilt-brand-moment: mock ready-state completion accent in the launch lab.
  },
  mockRowCopy: {
    flex: 1,
    gap: 2,
  },
  mockRowTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
  mockRowDetail: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  mockDock: {
    minHeight: 76,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.canvas,
  },
  mockDockActive: {
    ...typography.label,
    color: colors.pine700, // @kwilt-brand-moment: mock active destination accent in the launch lab.
  },
  mockDockItem: {
    ...typography.label,
    color: colors.muted,
  },
  greenCurtain: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pine700, // @kwilt-brand-moment: canonical branded launch curtain under comparison.
  },
  markLockup: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  markCanvas: {
    width: MARK_SIZE,
    height: MARK_SIZE,
  },
  markPiece: {
    ...StyleSheet.absoluteFillObject,
  },
  wordmark: {
    ...typography.brand,
    color: colors.parchment,
    fontSize: 36,
    lineHeight: 44,
  },
  controls: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: 24,
    backgroundColor: colors.canvas,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  controlsTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  controlLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  systemMotionNote: {
    ...typography.bodySm,
    color: colors.muted,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
