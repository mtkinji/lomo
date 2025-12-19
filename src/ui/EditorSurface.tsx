import React, { useEffect, useMemo, useState } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

export type EditorSurfaceProps = {
  /**
   * Optional header content. Typically includes title and action buttons.
   */
  header?: React.ReactNode;
  /**
   * Main body content. Should be scrollable if needed (e.g., TextInput with multiline).
   */
  children: React.ReactNode;
  /**
   * Optional toolbar that attaches to the keyboard.
   * On iOS, this renders via InputAccessoryView.
   * On Android, this renders absolutely positioned above the keyboard.
   */
  toolbar?: React.ReactNode;
  /**
   * Controls how the toolbar is attached/positioned.
   *
   * - `auto` (default): iOS uses InputAccessoryView (requires a focused native TextInput
   *   with matching `inputAccessoryViewID`), Android uses absolute positioning above keyboard.
   * - `absolute`: always position the toolbar above the keyboard using keyboard height.
   *
   * This is important for WebView-based editors (e.g. rich text) which cannot participate
   * in iOS InputAccessoryView attachment via `inputAccessoryViewID`.
   */
  toolbarAttachment?: 'auto' | 'absolute';
  /**
   * Unique identifier for the InputAccessoryView (iOS only).
   * If not provided, a default will be generated.
   */
  accessoryId?: string;
  /**
   * Additional padding at the top of the body. Defaults to spacing.lg.
   */
  bodyTopPadding?: number;
  /**
   * Additional padding at the bottom of the body. Defaults to spacing.sm + safe area bottom.
   */
  bodyBottomPadding?: number;
  /**
   * Extra padding added to the body when keyboard is visible, to ensure content
   * can scroll above the keyboard. Defaults to 14pt.
   */
  keyboardClearance?: number;
  /**
   * When true, EditorSurface will NOT add keyboard height padding into the body.
   *
   * This is useful when the parent component already handles keyboard avoidance
   * or runs its own "drawer" animation (e.g., QuickAddDock). In that scenario,
   * adding keyboard padding here creates a large dead zone between the content
   * and the keyboard/toolbar.
   */
  disableBodyKeyboardPadding?: boolean;
  /**
   * Custom styles for the root container.
   */
  style?: ViewStyle;
  /**
   * Custom styles for the body container.
   */
  bodyStyle?: ViewStyle;
  /**
   * Whether the editor is currently visible/active. Used to optimize keyboard listeners.
   */
  visible?: boolean;
  /**
   * Optional external keyboard height. If provided, EditorSurface will use this
   * instead of tracking keyboard events internally. Useful when the parent component
   * has its own keyboard animation logic (e.g., QuickAddDock).
   */
  keyboardHeight?: number;
};

/**
 * EditorSurface
 *
 * A reusable primitive for editor interfaces that need to work seamlessly with
 * the iOS keyboard. Provides:
 * - Optional header (pinned at top)
 * - Flexible body content
 * - Optional toolbar that attaches to keyboard (iOS InputAccessoryView)
 *
 * Keyboard handling:
 * - Tracks keyboard height automatically
 * - Adds internal padding to body when keyboard is visible
 * - On iOS, toolbar attaches via InputAccessoryView
 * - On Android, toolbar positions absolutely above keyboard
 *
 * Usage:
 * ```tsx
 * <EditorSurface
 *   header={<EditorHeader title="Edit" onDone={handleDone} />}
 *   toolbar={<Toolbar>...</Toolbar>}
 *   accessoryId="my-editor-accessory"
 * >
 *   <TextInput inputAccessoryViewID="my-editor-accessory" />
 * </EditorSurface>
 * ```
 */
export function EditorSurface({
  header,
  children,
  toolbar,
  toolbarAttachment = 'auto',
  accessoryId,
  bodyTopPadding,
  bodyBottomPadding,
  keyboardClearance = 14,
  disableBodyKeyboardPadding = false,
  style,
  bodyStyle,
  visible = true,
  keyboardHeight: externalKeyboardHeight,
}: EditorSurfaceProps) {
  const insets = useSafeAreaInsets();
  const [internalKeyboardHeight, setInternalKeyboardHeight] = useState(0);

  // Generate a unique accessory ID if not provided
  const resolvedAccessoryId = useMemo(
    () => accessoryId ?? `editor-surface-${Math.random().toString(36).slice(2, 9)}`,
    [accessoryId]
  );

  // Track keyboard height when visible (only if not provided externally)
  useEffect(() => {
    if (externalKeyboardHeight !== undefined) return; // Use external value

    if (!visible) {
      setInternalKeyboardHeight(0);
      return;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: any) => {
      const next = e?.endCoordinates?.height ?? 0;
      setInternalKeyboardHeight(next);
    };
    const onHide = () => setInternalKeyboardHeight(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible, externalKeyboardHeight]);

  // Use external keyboard height if provided, otherwise use internal tracking
  const keyboardHeight = externalKeyboardHeight ?? internalKeyboardHeight;

  // Calculate body padding
  const topPadding = bodyTopPadding ?? spacing.lg;
  const baseBottomPadding = bodyBottomPadding ?? spacing.sm + insets.bottom;
  const inputBottomPadding = useMemo(() => {
    if (keyboardHeight <= 0) return baseBottomPadding;
    if (disableBodyKeyboardPadding) return baseBottomPadding;
    // Add internal scroll padding so content can scroll above the keyboard
    return baseBottomPadding + keyboardHeight + keyboardClearance;
  }, [baseBottomPadding, keyboardHeight, keyboardClearance, disableBodyKeyboardPadding]);

  return (
    <View style={[styles.root, style]}>
      {header ? <View style={styles.header}>{header}</View> : null}

      <View style={[styles.body, { paddingTop: topPadding, paddingBottom: inputBottomPadding }, bodyStyle]}>
        {children}
      </View>

      {/* Keyboard accessory toolbar */}
      {toolbar ? (
        toolbarAttachment === 'absolute' ? (
          <View
            style={[
              styles.toolbarAbsolute,
              // If the parent is already handling keyboard avoidance (e.g. UnderKeyboardDrawer),
              // the visible editor surface bottom is already "at" the keyboard top.
              // In that case, keep the toolbar pinned to the surface bottom.
              { bottom: disableBodyKeyboardPadding ? 0 : keyboardHeight },
            ]}
          >
            {toolbar}
          </View>
        ) : Platform.OS === 'ios' ? (
          <InputAccessoryView nativeID={resolvedAccessoryId}>{toolbar}</InputAccessoryView>
        ) : keyboardHeight > 0 ? (
          <View style={[styles.toolbarAbsolute, { bottom: keyboardHeight }]}>{toolbar}</View>
        ) : null
      ) : null}
    </View>
  );
}

/**
 * EditorHeader
 *
 * A common header pattern for editor surfaces with left, center, and right slots.
 */
export type EditorHeaderProps = {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  style?: ViewStyle;
};

export function EditorHeader({ left, center, right, style }: EditorHeaderProps) {
  return (
    <View style={[styles.headerContainer, style]}>
      <View style={styles.headerLeft}>{left}</View>
      <View style={styles.headerCenter}>{center}</View>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
    // Allow override for absolute positioning contexts
    minHeight: 0,
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.canvas,
  },
  headerContainer: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  headerLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    width: 80,
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  toolbarAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    // Ensure toolbars render above WebView-based editors (RichEditor) which can
    // otherwise visually occlude sibling views on iOS.
    zIndex: 50,
    elevation: 50,
  },
});

