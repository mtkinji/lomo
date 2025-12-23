import * as React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../theme';
import { useToastStore } from '../store/useToastStore';
import { Toast } from './Toast';

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const message = useToastStore((s) => s.message);
  const variant = useToastStore((s) => s.variant);
  const durationMs = useToastStore((s) => s.durationMs);
  const bottomOffset = useToastStore((s) => s.bottomOffset);
  const actionLabel = useToastStore((s) => s.actionLabel);
  const actionOnPress = useToastStore((s) => s.actionOnPress);
  const id = useToastStore((s) => s.id);
  const clearToast = useToastStore((s) => s.clearToast);

  // Remount on each showToast() so the Toast timer/animation restarts even if the
  // message text repeats.
  return (
    <Toast
      key={String(id)}
      visible={message.trim().length > 0}
      message={message}
      variant={variant}
      durationMs={durationMs}
      actionLabel={actionLabel}
      onPressAction={actionOnPress}
      bottomOffset={bottomOffset ?? Math.max(insets.bottom, spacing.lg)}
      onDismiss={clearToast}
    />
  );
}


