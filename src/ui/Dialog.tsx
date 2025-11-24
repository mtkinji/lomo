import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, spacing } from '../theme';

type DialogProps = {
  visible: boolean;
  /**
   * Optional callback invoked when the user taps the backdrop. When omitted,
   * the dialog behaves as modal-only (backdrop is not tappable).
   */
  onClose?: () => void;
  children: ReactNode;
  /**
   * Optional override for the content card style so individual dialogs can
   * tweak width, padding, or radius while preserving the shared ShadCN-style
   * overlay + elevation.
   */
  contentStyle?: StyleProp<ViewStyle>;
};

export function Dialog({ visible, onClose, children, contentStyle }: DialogProps) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {onClose ? (
        <Pressable style={styles.backdrop} onPress={onClose} />
      ) : (
        <View style={styles.backdrop} />
      )}
      <View style={styles.centerColumn} pointerEvents="box-none">
        <View style={[styles.card, contentStyle]} pointerEvents="auto">
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.35)',
  },
  centerColumn: {
    paddingHorizontal: spacing.lg,
    width: '100%',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    backgroundColor: colors.canvas,
    alignSelf: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
});



