/**
 * Localized from React Native Reusables dialog anatomy.
 * Upstream: https://reactnativereusables.com/docs/components/dialog
 * Reference: founded-labs/react-native-reusables@119d0b101ff0d18408dc392120e12b5c78ae0c05
 * Retrieved: 2026-08-07
 */
import * as DialogPrimitive from '@rn-primitives/dialog';
import {
  forwardRef,
  useEffect,
  useRef,
  type ComponentProps,
  type ElementRef,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import * as ReactNative from 'react-native';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';
import { colors, spacing, typography } from '../theme';
import { cardElevation } from '../theme/surfaces';
import { Icon } from './Icon';

const DialogRoot = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;
const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : View;

type DialogOverlayProps = ComponentProps<typeof DialogPrimitive.Overlay> & {
  style?: StyleProp<ViewStyle>;
};

const DialogOverlay = forwardRef<ElementRef<typeof DialogPrimitive.Overlay>, DialogOverlayProps>(
  function DialogOverlay({ style, ...props }, ref) {
    return (
      <DialogPrimitive.Overlay
        ref={ref}
        testID="dialog.backdrop"
        importantForAccessibility="no"
        style={[styles.overlay, style] as never}
        {...props}
      />
    );
  },
);

type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  portalHost?: string;
  dismissOnBackdrop?: boolean;
  showCloseButton?: boolean;
  surfaceStyle?: StyleProp<ViewStyle>;
};

const DialogContent = forwardRef<ElementRef<typeof DialogPrimitive.Content>, DialogContentProps>(
  function DialogContent(
    {
      portalHost,
      dismissOnBackdrop = true,
      showCloseButton = true,
      surfaceStyle,
      children,
      ...props
    },
    ref,
  ) {
    return (
      <DialogPortal hostName={portalHost}>
        <FullWindowOverlay style={styles.fullWindowOverlay}>
          <DialogOverlay closeOnPress={dismissOnBackdrop}>
            <KeyboardAvoidingView
              style={styles.keyboardFrame}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <DialogPrimitive.Content
                ref={ref}
                testID="dialog.surface"
                accessibilityViewIsModal
                importantForAccessibility="yes"
                style={[styles.surface, surfaceStyle] as never}
                {...props}
              >
                {children}
                {showCloseButton ? <DialogCloseButton /> : null}
              </DialogPrimitive.Content>
            </KeyboardAvoidingView>
          </DialogOverlay>
        </FullWindowOverlay>
      </DialogPortal>
    );
  },
);

function DialogCloseButton(props: Omit<ComponentProps<typeof DialogPrimitive.Close>, 'children'>) {
  return (
    <DialogClose
      accessibilityLabel="Close dialog"
      hitSlop={12}
      style={styles.closeButton}
      {...props}
    >
      <Icon name="close" size={18} color={colors.textSecondary} />
    </DialogClose>
  );
}

function DialogHeader({ style, ...props }: ViewProps) {
  return <View style={[styles.header, style]} {...props} />;
}

const DialogTitle = forwardRef<
  ElementRef<typeof DialogPrimitive.Title>,
  ComponentProps<typeof DialogPrimitive.Title> & { style?: StyleProp<TextStyle>; size?: 'sm' | 'md' }
>(function DialogTitle({ style, size = 'sm', ...props }, ref) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      accessibilityRole="header"
      style={[size === 'md' ? styles.titleMd : styles.titleSm, style] as never}
      {...props}
    />
  );
});

function DialogDescription({ style, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description style={[styles.description, style] as never} {...props} />;
}

function DialogBody({ style, ...props }: ViewProps) {
  return <View testID="dialog.body" style={[styles.body, style]} {...props} />;
}

function DialogFooter({ style, ...props }: ViewProps) {
  return <View testID="dialog.footer" style={[styles.footer, style]} {...props} />;
}

type DialogProps = {
  visible: boolean;
  onClose?: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md';
  showHeaderDivider?: boolean;
  dismissOnBackdrop?: boolean;
  showCloseButton?: boolean;
  portalHost?: string;
  surfaceStyle?: StyleProp<ViewStyle>;
  returnFocusRef?: RefObject<unknown>;
};

/** Compatibility composition for existing controlled callers. */
function Dialog({
  visible,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'sm',
  showHeaderDivider = false,
  dismissOnBackdrop = true,
  showCloseButton = true,
  portalHost,
  surfaceStyle,
  returnFocusRef,
}: DialogProps) {
  const titleRef = useRef<ElementRef<typeof DialogPrimitive.Title>>(null);
  const wasVisibleRef = useRef(false);

  useEffect(() => {
    if (!visible) {
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
    }

    wasVisibleRef.current = true;
    if (!title) return;
    const timeoutId = setTimeout(() => {
      const node = ReactNative.findNodeHandle(titleRef.current);
      if (node != null) AccessibilityInfo.setAccessibilityFocus(node);
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [returnFocusRef, title, visible]);

  return (
    <DialogRoot
      open={visible}
      onOpenChange={(open) => {
        if (!open) onClose?.();
      }}
    >
      <DialogContent
        portalHost={portalHost}
        dismissOnBackdrop={dismissOnBackdrop}
        showCloseButton={showCloseButton}
        surfaceStyle={surfaceStyle}
      >
        {title || description ? (
          <DialogHeader style={showHeaderDivider ? styles.headerDivider : undefined}>
            {title ? <DialogTitle ref={titleRef} size={size}>{title}</DialogTitle> : null}
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
        ) : null}
        {children ? (
          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <DialogBody>{children}</DialogBody>
          </ScrollView>
        ) : null}
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </DialogRoot>
  );
}

const styles = StyleSheet.create({
  fullWindowOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrimModal,
  },
  keyboardFrame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  surface: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '92%',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    padding: spacing.xl,
    ...cardElevation.overlay,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    gap: spacing.xs,
    paddingRight: spacing.xl,
    marginBottom: spacing.lg,
  },
  headerDivider: {
    paddingBottom: spacing.md,
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
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  bodyScroll: {
    flexGrow: 0,
  },
  bodyScrollContent: {
    flexGrow: 0,
  },
  body: {
    width: '100%',
  },
  footer: {
    marginTop: spacing.xl,
  },
});

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
};
