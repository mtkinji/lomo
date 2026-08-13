import type { ReactNode } from 'react';
import { Modal, Platform } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';

export function FocusSessionOverlay({ children, onRequestClose }: {
  children: ReactNode;
  onRequestClose: () => void;
}) {
  if (Platform.OS === 'ios') {
    return <FullWindowOverlay>{children}</FullWindowOverlay>;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onRequestClose}>
      {children}
    </Modal>
  );
}
