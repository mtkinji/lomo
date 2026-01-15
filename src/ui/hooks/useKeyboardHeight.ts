import React from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Hook to track keyboard visibility and height.
 * Returns both the current height and the last known height
 * (useful for animations when keyboard hides).
 */
export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  const lastKnownKeyboardHeightRef = React.useRef<number>(320);

  React.useEffect(() => {
    const setTo = (next: number) => {
      setKeyboardHeight(next);
      if (next > 0) lastKnownKeyboardHeightRef.current = next;
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const frameEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : null;

    const onShow = (e: any) => {
      const next = e?.endCoordinates?.height ?? 0;
      setTo(next);
    };
    const onHide = () => setTo(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    const frameSub = frameEvent ? Keyboard.addListener(frameEvent, onShow) : null;

    return () => {
      showSub.remove();
      hideSub.remove();
      frameSub?.remove();
    };
  }, []);

  return {
    keyboardHeight,
    lastKnownKeyboardHeight: lastKnownKeyboardHeightRef.current,
    isKeyboardVisible: keyboardHeight > 0,
  };
}

