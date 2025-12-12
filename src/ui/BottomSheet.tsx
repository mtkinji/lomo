import { ReactNode, useCallback, useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetModalProps,
} from '@gorhom/bottom-sheet';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { colors, spacing } from '../theme';

const DEFAULT_SNAP_POINTS: (string | number)[] = ['85%'];

type KwiltBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  snapPoints?: (string | number)[];
  /**
   * When true, the sheet cannot be dismissed by panning down or tapping the
   * backdrop. This is useful for "anchored" sheets that behave like permanent
   * panels rather than transient modals.
   */
  nonDismissable?: boolean;
  /**
   * When true, disables the backdrop entirely so the underlying content
   * remains fully visible and interactive (no scrim).
   */
  hideBackdrop?: boolean;
} & Partial<BottomSheetModalProps>;

export function KwiltBottomSheet({
  visible,
  onClose,
  children,
  snapPoints,
  nonDismissable = false,
  hideBackdrop = false,
  ...rest
}: KwiltBottomSheetProps) {
  const sheetRef = useRef<BottomSheetModal>(null);
  // Keep snapPoints stable across renders even when callers pass inline literals
  // like `['35%']`. This prevents effect churn that can cancel a scheduled
  // `present()` call before it fires.
  const nextPoints = snapPoints ?? DEFAULT_SNAP_POINTS;
  const pointsRef = useRef<(string | number)[]>(nextPoints);
  if (!areSnapPointsEqual(pointsRef.current, nextPoints)) {
    pointsRef.current = nextPoints;
  }
  const points = pointsRef.current;
  const lastVisibleRef = useRef<boolean>(visible);

  useEffect(() => {
    if (__DEV__ && lastVisibleRef.current !== visible) {
      // eslint-disable-next-line no-console
      console.log('[bottomSheet] visible-changed', {
        visible,
        hasRef: Boolean(sheetRef.current),
        snapPoints: points,
      });
      lastVisibleRef.current = visible;
    }
    if (visible) {
      // Present on the next tick so navigation transitions/layout settle first.
      // Without this, BottomSheetModal can occasionally fail to appear when a
      // screen flips `visible` to true immediately on mount.
      const timeoutId = setTimeout(() => {
        sheetRef.current?.present();
      }, 0);
      return () => clearTimeout(timeoutId);
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  const renderBackdrop: BottomSheetModalProps['backdropComponent'] = useCallback(
    (backdropProps: Parameters<NonNullable<BottomSheetModalProps['backdropComponent']>>[0]) =>
      hideBackdrop ? null : (
        <KwiltSheetBackdrop
          {...backdropProps}
          nonDismissable={nonDismissable}
        />
      ),
    [hideBackdrop, nonDismissable]
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      // Let `present()` / `dismiss()` control visibility; don't set `index` explicitly.
      snapPoints={points}
      enableDismissOnClose={!nonDismissable}
      enablePanDownToClose={!nonDismissable}
      onDismiss={nonDismissable ? undefined : onClose}
      backdropComponent={hideBackdrop ? undefined : renderBackdrop}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
      {...rest}
    >
      {children}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  handle: {
    backgroundColor: colors.border,
    width: 64,
    height: 5,
    borderRadius: 999,
    marginTop: spacing.sm,
  },
});

// Custom backdrop that keeps the scrim at full opacity until the sheet is
// mostly closed, then fades out over the last ~25% of the drag.
type KwiltSheetBackdropProps = Parameters<
  NonNullable<BottomSheetModalProps['backdropComponent']>
>[0] & {
  nonDismissable?: boolean;
};

const SCRIM_BASE_OPACITY = 0.45;
// Start fading the scrim only when the sheet is mostly closed so it stays
// fully opaque for the majority of the swipe gesture. Index typically ranges
// from 0 (open) to -1 (closed), so -0.75 ≈ 75% closed.
const FADE_START_INDEX = -0.75;

function KwiltSheetBackdrop({
  animatedIndex,
  style,
  nonDismissable,
  ...rest
}: KwiltSheetBackdropProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const index = animatedIndex?.value ?? 0;
    // Modal index typically ranges from 0 (open) to -1 (closed).
    const clamped = Math.max(Math.min(index, 0), -1);

    if (clamped >= FADE_START_INDEX) {
      // Sheet is mostly open – keep scrim at full base opacity.
      return { opacity: SCRIM_BASE_OPACITY };
    }

    // Fade only over the last 25% of the close gesture: map
    // index [-1, FADE_START_INDEX] -> opacity [0, SCRIM_BASE_OPACITY].
    const t = (clamped - -1) / (FADE_START_INDEX - -1); // 0 at -1, 1 at FADE_START_INDEX
    return { opacity: SCRIM_BASE_OPACITY * Math.max(0, Math.min(t, 1)) };
  }, []);

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: colors.scrim },
          animatedStyle,
        ]}
      />
      <BottomSheetBackdrop
        {...rest}
        animatedIndex={animatedIndex}
        style={style}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={nonDismissable ? 'none' : 'close'}
        opacity={0}
      />
    </>
  );
}

function areSnapPointsEqual(
  current: (string | number)[],
  next: (string | number)[]
) {
  if (current === next) {
    return true;
  }
  if (current.length !== next.length) {
    return false;
  }
  for (let index = 0; index < current.length; index += 1) {
    if (current[index] !== next[index]) {
      return false;
    }
  }
  return true;
}




