import { act, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Toast } from './Toast';

const mockUseAccessibilityPreferences = jest.fn(() => ({
  reduceMotionEnabled: false,
  screenReaderEnabled: false,
}));

jest.mock('./hooks/useAccessibilityPreferences', () => ({
  useAccessibilityPreferences: () => mockUseAccessibilityPreferences(),
}));

describe('Toast accessibility contract', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUseAccessibilityPreferences.mockReturnValue({
      reduceMotionEnabled: false,
      screenReaderEnabled: false,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('announces transient feedback without turning action buttons into one grouped element', () => {
    const { getByText, getByRole, getByTestId } = render(
      <Toast visible message="Goal saved" onDismiss={jest.fn()} />,
    );

    expect(getByText('Goal saved').props).toMatchObject({
      accessibilityRole: 'alert',
      accessibilityLiveRegion: 'polite',
    });
    expect(getByRole('button', { name: 'Dismiss notification' })).toBeTruthy();
    expect(StyleSheet.flatten(getByTestId('toast-container').props.style)).toMatchObject({
      zIndex: 4000,
      elevation: 4000,
    });
  });

  it('does not auto-dismiss while a screen reader is active', () => {
    mockUseAccessibilityPreferences.mockReturnValue({
      reduceMotionEnabled: false,
      screenReaderEnabled: true,
    });
    const onDismiss = jest.fn();

    render(<Toast visible message="Goal saved" durationMs={1000} onDismiss={onDismiss} />);
    act(() => jest.advanceTimersByTime(5000));

    expect(onDismiss).not.toHaveBeenCalled();
  });
});
