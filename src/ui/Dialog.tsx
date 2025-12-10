import type { ReactNode } from 'react';
import { Modal, Platform, StyleSheet, View, TouchableWithoutFeedback } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { Text, Heading } from './Typography';

type DialogProps = {
  visible: boolean;
  onClose?: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /**
   * Optional footer content. When omitted, the caller is responsible for
   * rendering actions inside `children`.
   */
  footer?: ReactNode;
};

export function Dialog({ visible, onClose, title, description, children, footer }: DialogProps) {
  // On native platforms, prefer a simple, reliable Modal-based implementation
  // so dialogs always render as a centered card with a dimmed backdrop on top
  // of the current app canvas.
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback
            // Capture taps inside the card so they don't bubble to the overlay.
            onPress={() => {}}
          >
            <View style={styles.card}>
              {(title || description) && (
                <View style={styles.header}>
                  {title ? (
                    <Heading style={styles.title} variant="sm">
                      {title}
                    </Heading>
                  ) : null}
                  {description ? (
                    <Text style={styles.description}>
                      {description}
                    </Text>
                  ) : null}
                </View>
              )}
              {children ? <View style={styles.body}>{children}</View> : null}
              {footer ? <View style={styles.footer}>{footer}</View> : null}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    // Dark, neutral scrim shared across overlays.
    backgroundColor: colors.scrimStrong,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 28,
    backgroundColor: colors.canvas,
    padding: spacing.lg,
    shadowColor: '#0F172A',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  header: {
    // Space between title/description block and the main dialog body. We keep
    // the body itself flush so individual child components (like CelebrationGif)
    // don't need to manage their own top margin.
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.titleSm,
    color: colors.textPrimary,
    fontWeight: '700'
  },
  description: {
    marginTop: 0,
    ...typography.body,
    color: colors.textPrimary,
  },
  body: {
    marginTop: 0,
  },
  footer: {
    marginTop: spacing.xl,
  },
});


