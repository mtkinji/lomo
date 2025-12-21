import { StyleSheet, View } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { Text } from './primitives';

export type ToastVariant = 'default' | 'success' | 'warning';

export function Toast(props: {
  visible: boolean;
  message: string;
  bottomOffset?: number;
  variant?: ToastVariant;
}) {
  const { visible, message, bottomOffset = spacing.lg, variant = 'default' } = props;
  if (!visible || !message.trim()) return null;

  const tone =
    variant === 'success'
      ? colors.pine200
      : variant === 'warning'
        ? colors.turmeric200
        : colors.border;

  return (
    <View pointerEvents="none" style={[styles.container, { bottom: bottomOffset }]}>
      <View style={[styles.surface, { borderColor: tone }]}>
        <Text style={styles.label}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
    zIndex: 20,
  },
  surface: {
    maxWidth: 520,
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  label: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
  },
});


