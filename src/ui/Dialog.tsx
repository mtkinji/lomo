import type { ReactNode } from 'react';
import { Modal, Platform, StyleSheet, View, TouchableWithoutFeedback } from 'react-native';
import {
  Dialog as PrimitiveDialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
  if (Platform.OS !== 'web') {
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

  // Web: keep using the Radix-style primitives so the design system matches
  // the shadcn-react reference implementation.
  return (
    <PrimitiveDialog open={visible} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent>
        {(title || description) && (
          <DialogHeader>
            {title ? <DialogTitle>{title}</DialogTitle> : null}
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
        )}
        {children}
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </PrimitiveDialog>
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
    padding: spacing.xl,
    shadowColor: '#0F172A',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  header: {
    marginBottom: 0,
  },
  title: {
    ...typography.titleSm,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  description: {
    marginTop: 0,
    ...typography.body,
    color: colors.textPrimary,
  },
  body: {
    marginTop: spacing.lg,
  },
  footer: {
    marginTop: spacing.xl,
  },
});


