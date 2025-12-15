import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  type ScrollViewProps,
  StyleSheet,
  TextInput,
  findNodeHandle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../theme';

export type KeyboardAwareScrollViewHandle = {
  /**
   * Best-effort: scroll the currently focused TextInput into view.
   * Useful when a sheet is already open and focus moves between fields.
   */
  scrollToFocusedInput: (extraOffset?: number) => void;
};

type Props = ScrollViewProps & {
  /**
   * Extra spacing between the focused input and the top edge of the keyboard.
   * Defaults to `spacing.lg`.
   */
  keyboardClearance?: number;
  /**
   * Override the "resting" bottom padding (when the keyboard is not shown).
   * If omitted, we use any existing `contentContainerStyle.paddingBottom`, and
   * fall back to `spacing['2xl']`.
   */
  basePaddingBottom?: number;
  /**
   * When true (default), listens for keyboard show/hide and automatically
   * scrolls the focused input into view.
   */
  enableAutoScrollToFocusedInput?: boolean;
};

/**
 * Cohesive, app-wide pattern for keyboard-safe forms:
 * - Adds enough bottom padding to scroll content above the keyboard
 * - Best-effort scrolls the focused input into view on keyboard show
 *
 * This is intentionally a ScrollView wrapper (not an Input primitive concern):
 * it owns layout + scrolling, which are the only reliable levers to guarantee
 * inputs are not obscured.
 *
 * Implementation notes + usage guide:
 * - `docs/keyboard-input-safety-implementation.md`
 */
export const KeyboardAwareScrollView = forwardRef<KeyboardAwareScrollViewHandle, Props>(
  (
    {
      keyboardClearance = spacing.lg,
      basePaddingBottom,
      enableAutoScrollToFocusedInput = true,
      contentContainerStyle,
      keyboardShouldPersistTaps = 'handled',
      automaticallyAdjustKeyboardInsets = true,
      ...rest
    },
    ref,
  ) => {
    const insets = useSafeAreaInsets();
    const scrollRef = useRef<ScrollView | null>(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    const scrollToFocusedInput = useCallback(
      (extraOffset: number = keyboardClearance) => {
        const getter = (TextInput.State as any)?.currentlyFocusedInput;
        const focused = typeof getter === 'function' ? getter() : null;
        const nodeHandle =
          typeof focused === 'number' ? focused : focused ? findNodeHandle(focused) : null;
        if (!nodeHandle || !scrollRef.current) return;

        try {
          (scrollRef.current as any).scrollResponderScrollNativeHandleToKeyboard(
            nodeHandle,
            extraOffset,
            true,
          );
        } catch {
          // Best-effort: if the responder API isn't available, do nothing.
        }
      },
      [keyboardClearance],
    );

    useImperativeHandle(ref, () => ({ scrollToFocusedInput }), [scrollToFocusedInput]);

    useEffect(() => {
      if (!enableAutoScrollToFocusedInput) return;

      const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
      const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

      const onShow = (e: any) => {
        const next = e?.endCoordinates?.height ?? 0;
        setKeyboardHeight(next);
        // Wait one frame so focus + layout settle, then reveal the focused field.
        requestAnimationFrame(() => {
          scrollToFocusedInput(keyboardClearance);
        });
      };
      const onHide = () => setKeyboardHeight(0);

      const showSub = Keyboard.addListener(showEvent, onShow);
      const hideSub = Keyboard.addListener(hideEvent, onHide);

      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }, [enableAutoScrollToFocusedInput, keyboardClearance, scrollToFocusedInput]);

    const flattened = useMemo(
      () => StyleSheet.flatten(contentContainerStyle) ?? {},
      [contentContainerStyle],
    );
    const existingPaddingBottom =
      typeof flattened.paddingBottom === 'number' ? flattened.paddingBottom : undefined;
    const base = basePaddingBottom ?? existingPaddingBottom ?? spacing['2xl'];
    const resolvedPaddingBottom =
      base + insets.bottom + (keyboardHeight > 0 ? keyboardHeight + keyboardClearance : 0);

    return (
      <ScrollView
        ref={scrollRef}
        {...rest}
        automaticallyAdjustKeyboardInsets={automaticallyAdjustKeyboardInsets}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        contentContainerStyle={[contentContainerStyle, { paddingBottom: resolvedPaddingBottom }]}
      />
    );
  },
);

KeyboardAwareScrollView.displayName = 'KeyboardAwareScrollView';


