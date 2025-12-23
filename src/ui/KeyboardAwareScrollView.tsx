import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Keyboard,
  Dimensions,
  Platform,
  ScrollView,
  type ScrollViewProps,
  StyleSheet,
  TextInput,
  UIManager,
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
  /**
   * Best-effort: scroll a specific view into view above the keyboard.
   * Useful for composite controls where the focused TextInput is smaller than
   * the visual "field" container (e.g. tag chip inputs).
   */
  scrollToNodeHandle: (nodeHandle: number, extraOffset?: number) => void;
  /**
   * Set a one-shot reveal target that will be used the next time the keyboard
   * opens. This is how composite controls can request that the *field container*
   * (not the inner TextInput) is revealed on first focus.
   */
  setNextRevealTarget: (nodeHandle: number | null, extraOffset?: number) => void;
  /**
   * Generic ScrollView escape hatch for non-keyboard-driven navigation
   * (e.g. "jump to section" buttons).
   */
  scrollTo: (args: { x?: number; y?: number; animated?: boolean }) => void;
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

type KeyboardAwareScrollContextValue = {
  scrollToFocusedInput: (extraOffset?: number) => void;
  scrollToNodeHandle: (nodeHandle: number, extraOffset?: number) => void;
  setNextRevealTarget: (nodeHandle: number | null, extraOffset?: number) => void;
  keyboardHeight: number;
  keyboardClearance: number;
};

const KeyboardAwareScrollContext = createContext<KeyboardAwareScrollContextValue | null>(null);

/**
 * Access the nearest `KeyboardAwareScrollView` behavior (if any).
 *
 * This enables input primitives to request a "reveal focused input" scroll on focus
 * (especially important when switching focus while the keyboard is already open).
 */
export function useKeyboardAwareScroll() {
  return useContext(KeyboardAwareScrollContext);
}

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
      // This component already manages keyboard padding + focused-input scrolling.
      // Leaving RN's automatic inset adjustment on can cause double-adjustment and
      // "scroll settles to the wrong spot" behavior on iOS.
      automaticallyAdjustKeyboardInsets = false,
      ...rest
    },
    ref,
  ) => {
    const insets = useSafeAreaInsets();
    const scrollRef = useRef<ScrollView | null>(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const keyboardTopYRef = useRef<number | null>(null);
    const pendingRevealRef = useRef(false);
    const nextRevealTargetRef = useRef<{ nodeHandle: number; extraOffset: number } | null>(null);

    const measureInWindow = useCallback(async (nodeHandle: number) => {
      return await new Promise<{ x: number; y: number; width: number; height: number } | null>(
        (resolve) => {
          try {
            UIManager.measureInWindow(nodeHandle, (x, y, width, height) => {
              resolve({ x, y, width, height });
            });
          } catch {
            resolve(null);
          }
        },
      );
    }, []);

    const maybeScrollNodeAboveKeyboard = useCallback(
      async (nodeHandle: number, extraOffset: number) => {
        if (!nodeHandle || !scrollRef.current) return;
        const topY = keyboardTopYRef.current;
        if (!topY || topY <= 0) return;

        const layout = await measureInWindow(nodeHandle);
        if (!layout) return;
        const inputBottom = layout.y + layout.height;
        // If the focused input won't be covered, keep it exactly where it is.
        if (inputBottom + extraOffset <= topY) return;

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
      [measureInWindow],
    );

    const scrollToNodeHandle = useCallback(
      (nodeHandle: number, extraOffset: number = keyboardClearance) => {
        if (!nodeHandle || !scrollRef.current) return;
        void maybeScrollNodeAboveKeyboard(nodeHandle, extraOffset);
      },
      [keyboardClearance, maybeScrollNodeAboveKeyboard],
    );

    const scrollToFocusedInput = useCallback(
      (extraOffset: number = keyboardClearance) => {
        const getter = (TextInput.State as any)?.currentlyFocusedInput;
        const focused = typeof getter === 'function' ? getter() : null;
        const nodeHandle =
          typeof focused === 'number' ? focused : focused ? findNodeHandle(focused) : null;
        if (!nodeHandle) return;
        scrollToNodeHandle(nodeHandle, extraOffset);
      },
      [keyboardClearance, scrollToNodeHandle],
    );

    const setNextRevealTarget = useCallback((nodeHandle: number | null, extraOffset = 0) => {
      if (!nodeHandle) {
        nextRevealTargetRef.current = null;
        return;
      }
      nextRevealTargetRef.current = { nodeHandle, extraOffset };
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        scrollToFocusedInput,
        scrollToNodeHandle,
        setNextRevealTarget,
        scrollTo: (args) => {
          (scrollRef.current as any)?.scrollTo?.(args);
        },
      }),
      [scrollToFocusedInput, scrollToNodeHandle, setNextRevealTarget],
    );

    useEffect(() => {
      if (!enableAutoScrollToFocusedInput) return;

      // Use DidShow/DidHide even on iOS to avoid RN "Error measuring text field."
      // warnings that can happen when measuring during the keyboard's animation.
      const showEvent = 'keyboardDidShow';
      const hideEvent = 'keyboardDidHide';

      const onShow = (e: any) => {
        const screenY =
          typeof e?.endCoordinates?.screenY === 'number'
            ? e.endCoordinates.screenY
            : (() => {
                const h = typeof e?.endCoordinates?.height === 'number' ? e.endCoordinates.height : 0;
                return Dimensions.get('window').height - h;
              })();
        keyboardTopYRef.current = screenY;
        const next = e?.endCoordinates?.height ?? 0;
        setKeyboardHeight(next);
        // Defer the reveal until *after* the paddingBottom update has been committed,
        // otherwise we can get a second "settling" scroll when layout changes.
        pendingRevealRef.current = true;
      };
      const onHide = () => {
        keyboardTopYRef.current = null;
        setKeyboardHeight(0);
      };

      const showSub = Keyboard.addListener(showEvent, onShow);
      const hideSub = Keyboard.addListener(hideEvent, onHide);

      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }, [enableAutoScrollToFocusedInput, keyboardClearance, scrollToFocusedInput]);

    // Run the reveal after the keyboardHeight-driven padding update has been applied.
    // This avoids the "scroll to correct spot, then nudge to wrong spot" double animation.
    useLayoutEffect(() => {
      if (!enableAutoScrollToFocusedInput) return;
      if (keyboardHeight <= 0) return;
      if (!pendingRevealRef.current) return;
      pendingRevealRef.current = false;

      // Don't wait for arbitrary "interactions" to finish; it can feel laggy.
      // At this point the keyboard is already shown and our padding is committed.
      requestAnimationFrame(() => {
        const nextTarget = nextRevealTargetRef.current;
        if (nextTarget) {
          // One-shot: once used, clear it so subsequent keyboard shows fall back
          // to the focused-input reveal.
          nextRevealTargetRef.current = null;
          scrollToNodeHandle(nextTarget.nodeHandle, keyboardClearance + nextTarget.extraOffset);
          return;
        }
        scrollToFocusedInput(keyboardClearance);
      });
    }, [
      enableAutoScrollToFocusedInput,
      keyboardClearance,
      keyboardHeight,
      scrollToFocusedInput,
      scrollToNodeHandle,
    ]);

    const flattened = useMemo(
      () => StyleSheet.flatten(contentContainerStyle) ?? {},
      [contentContainerStyle],
    );
    const existingPaddingBottom =
      typeof flattened.paddingBottom === 'number' ? flattened.paddingBottom : undefined;
    const base = basePaddingBottom ?? existingPaddingBottom ?? spacing['2xl'];
    // iOS reports keyboard height including the home-indicator safe area. Since we
    // already include `insets.bottom` in our baseline padding, subtract it to avoid
    // double-counting and landing the reveal at the wrong vertical offset.
    const keyboardInset =
      keyboardHeight > 0
        ? Platform.OS === 'ios'
          ? Math.max(0, keyboardHeight - insets.bottom)
          : Math.max(0, keyboardHeight)
        : 0;
    const resolvedPaddingBottom =
      base + insets.bottom + (keyboardInset > 0 ? keyboardInset + keyboardClearance : 0);

    const contextValue = useMemo<KeyboardAwareScrollContextValue>(
      () => ({
        scrollToFocusedInput,
        scrollToNodeHandle,
        setNextRevealTarget,
        keyboardHeight: keyboardInset,
        keyboardClearance,
      }),
      [scrollToFocusedInput, scrollToNodeHandle, setNextRevealTarget, keyboardInset, keyboardClearance],
    );

    return (
      <KeyboardAwareScrollContext.Provider value={contextValue}>
        <ScrollView
          ref={scrollRef}
          {...rest}
          automaticallyAdjustKeyboardInsets={automaticallyAdjustKeyboardInsets}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          contentContainerStyle={[contentContainerStyle, { paddingBottom: resolvedPaddingBottom }]}
        />
      </KeyboardAwareScrollContext.Provider>
    );
  },
);

KeyboardAwareScrollView.displayName = 'KeyboardAwareScrollView';


