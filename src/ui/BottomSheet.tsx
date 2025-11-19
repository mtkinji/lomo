import { ReactNode, useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetModalProps,
} from '@gorhom/bottom-sheet';
import { colors, spacing } from '../theme';

type LomoBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  snapPoints?: (string | number)[];
} & Partial<BottomSheetModalProps>;

export function LomoBottomSheet({
  visible,
  onClose,
  children,
  snapPoints,
  ...rest
}: LomoBottomSheetProps) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const points = useMemo<(string | number)[]>(
    () => snapPoints ?? ['85%'],
    [snapPoints]
  );

  useEffect(() => {
    if (visible) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  const renderBackdrop: BottomSheetModalProps['backdropComponent'] = (backdropProps) => (
    <BottomSheetBackdrop
      {...backdropProps}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      pressBehavior="close"
      opacity={0.45}
    />
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={points}
      enableDismissOnClose
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
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




