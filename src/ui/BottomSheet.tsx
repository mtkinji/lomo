import { ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetModalProps,
} from '@gorhom/bottom-sheet';
import { colors, spacing } from '../theme';

const DEFAULT_SNAP_POINTS: (string | number)[] = ['85%'];

type TakadoBottomSheetProps = {
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

export function TakadoBottomSheet({
  visible,
  onClose,
  children,
  snapPoints,
  nonDismissable = false,
  hideBackdrop = false,
  ...rest
}: TakadoBottomSheetProps) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const points = useMemo<(string | number)[]>(
    () => snapPoints ?? DEFAULT_SNAP_POINTS,
    [snapPoints]
  );
  useEffect(() => {
    if (__DEV__) {
      console.log('[bottomSheet] effect', {
        visible,
        hasRef: Boolean(sheetRef.current),
        snapPoints: points,
      });
    }

    if (visible) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible, points]);

  const renderBackdrop: BottomSheetModalProps['backdropComponent'] = useCallback(
    (backdropProps) =>
      hideBackdrop ? null : (
        <BottomSheetBackdrop
          {...backdropProps}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior={nonDismissable ? 'none' : 'close'}
          opacity={0.45}
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




