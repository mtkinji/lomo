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
  /**
   * Optional visual size for the dialog header. Use `md` for primary flows
   * where the title should feel closer to a section heading, and `sm` for
   * lighter confirmations / utility dialogs.
   */
  size?: 'sm' | 'md';
  /**
   * When true, renders a subtle divider under the header to separate it from
   * the body content. Useful for denser dialogs with form fields or strong
   * footers where the title should feel more structurally anchored.
   */
  showHeaderDivider?: boolean;
};

export function Dialog({
  visible,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'sm',
  showHeaderDivider = false,
}: DialogProps) {
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
                <View style={[styles.header, showHeaderDivider && styles.headerDivider]}>
                  {title ? (
                    <Heading style={size === 'md' ? styles.titleMd : styles.titleSm} variant="sm">
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
  headerDivider: {
    paddingBottom: spacing.sm,
    marginBottom: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  titleSm: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  titleMd: {
    ...typography.titleMd,
    color: colors.textPrimary,
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


