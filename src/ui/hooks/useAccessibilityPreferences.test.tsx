import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import {
  getAccessibleAnimationDuration,
  useAccessibilityPreferences,
} from './useAccessibilityPreferences';

describe('useAccessibilityPreferences', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('tracks screen-reader and Reduce Motion changes', async () => {
    const listeners: Record<string, (enabled: boolean) => void> = {};
    const remove = jest.fn();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(false);
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((
      event: string,
      listener: (enabled: boolean) => void,
    ) => {
      listeners[event] = listener;
      return { remove };
    }) as unknown as typeof AccessibilityInfo.addEventListener);

    const { result, unmount } = renderHook(() => useAccessibilityPreferences());

    await waitFor(() => expect(result.current.reduceMotionEnabled).toBe(true));
    expect(result.current.screenReaderEnabled).toBe(false);

    act(() => listeners.screenReaderChanged?.(true));
    expect(result.current.screenReaderEnabled).toBe(true);

    unmount();
    expect(remove).toHaveBeenCalledTimes(2);
  });

  it('turns authored animation durations into immediate state changes', () => {
    expect(getAccessibleAnimationDuration(240, false)).toBe(240);
    expect(getAccessibleAnimationDuration(240, true)).toBe(0);
  });
});
