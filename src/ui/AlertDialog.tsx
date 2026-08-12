/**
 * Localized from React Native Reusables alert-dialog anatomy.
 * Upstream: https://reactnativereusables.com/docs/components/alert-dialog
 * Reference: founded-labs/react-native-reusables@119d0b101ff0d18408dc392120e12b5c78ae0c05
 * Retrieved: 2026-08-07
 */
import * as AlertDialogPrimitive from '@rn-primitives/alert-dialog';
import {
  forwardRef,
  useEffect,
  useRef,
  type ComponentProps,
  type ElementRef,
  type ReactNode,
  type RefObject,
} from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View, type ViewProps } from 'react-native';
import * as ReactNative from 'react-native';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';
import { colors, spacing, typography } from '../theme';
import { cardElevation } from '../theme/surfaces';
import { Button } from './Button';

const AlertDialogRoot = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;
const AlertDialogCancel = AlertDialogPrimitive.Cancel;
const AlertDialogAction = AlertDialogPrimitive.Action;
const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : View;

const AlertDialogTitle = forwardRef<
  ElementRef<typeof AlertDialogPrimitive.Title>,
  ComponentProps<typeof AlertDialogPrimitive.Title>
>(function AlertDialogTitle({ style, ...props }, ref) {
  return (
    <AlertDialogPrimitive.Title
      ref={ref}
      accessibilityRole="header"
      style={[styles.title, style] as never}
      {...props}
    />
  );
});

function AlertDialogDescription({ style, ...props }: ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return <AlertDialogPrimitive.Description style={[styles.description, style] as never} {...props} />;
}

function AlertDialogHeader({ style, ...props }: ViewProps) {
  return <View style={[styles.header, style]} {...props} />;
}

function AlertDialogFooter({ style, ...props }: ViewProps) {
  return <View style={[styles.footer, style]} {...props} />;
}

type AlertDialogContentProps = ComponentProps<typeof AlertDialogPrimitive.Content> & {
  portalHost?: string;
};

const AlertDialogContent = forwardRef<
  ElementRef<typeof AlertDialogPrimitive.Content>,
  AlertDialogContentProps
>(function AlertDialogContent({ portalHost, style, children, ...props }, ref) {
  return (
    <AlertDialogPortal hostName={portalHost}>
      <FullWindowOverlay style={styles.fullWindowOverlay}>
        <AlertDialogPrimitive.Overlay
          testID="alert-dialog.backdrop"
          importantForAccessibility="no"
          style={styles.overlay}
        >
          <View style={styles.frame}>
            <AlertDialogPrimitive.Content
              ref={ref}
              testID="alert-dialog.surface"
              accessibilityViewIsModal
              importantForAccessibility="yes"
              style={[styles.surface, style] as never}
              {...props}
            >
              {children}
            </AlertDialogPrimitive.Content>
          </View>
        </AlertDialogPrimitive.Overlay>
      </FullWindowOverlay>
    </AlertDialogPortal>
  );
});

type AlertDialogProps = {
  visible: boolean;
  title: ReactNode;
  description?: ReactNode;
  cancelLabel: string;
  actionLabel: string;
  onClose: () => void;
  onCancel?: () => void;
  onAction: () => void;
  actionVariant?: 'destructive' | 'primary';
  disabled?: boolean;
  portalHost?: string;
  returnFocusRef?: RefObject<unknown>;
};

function AlertDialog({
  visible,
  title,
  description,
  cancelLabel,
  actionLabel,
  onClose,
  onCancel,
  onAction,
  actionVariant = 'destructive',
  disabled = false,
  portalHost,
  returnFocusRef,
}: AlertDialogProps) {
  const wasVisibleRef = useRef(false);

  useEffect(() => {
    if (visible) {
      wasVisibleRef.current = true;
      return;
    }
    if (!wasVisibleRef.current || !returnFocusRef?.current) {
      wasVisibleRef.current = false;
      return;
    }
    wasVisibleRef.current = false;
    const timeoutId = setTimeout(() => {
      const node = ReactNative.findNodeHandle(
        returnFocusRef.current as ElementRef<typeof View>,
      );
      if (node != null) AccessibilityInfo.setAccessibilityFocus(node);
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [returnFocusRef, visible]);

  return (
    <AlertDialogRoot
      open={visible}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent portalHost={portalHost}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button
              variant="outline"
              accessibilityLabel={cancelLabel}
              disabled={disabled}
              onPress={onCancel}
              style={styles.actionButton}
            >
              {cancelLabel}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant={actionVariant}
              accessibilityLabel={actionLabel}
              disabled={disabled}
              onPress={onAction}
              style={styles.actionButton}
            >
              {actionLabel}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialogRoot>
  );
}

const styles = StyleSheet.create({
  fullWindowOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrimStrong,
  },
  frame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  surface: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    padding: spacing.xl,
    ...cardElevation.overlay,
  },
  header: {
    gap: spacing.sm,
  },
  title: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  description: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  actionButton: {
    minWidth: 120,
  },
});

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
  AlertDialogTrigger,
};
