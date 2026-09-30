import React from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { OnboardingQuote } from './OnboardingQuote';

const mockPreferences = { reduceMotionEnabled: false, screenReaderEnabled: false };
jest.mock('../../ui/hooks/useAccessibilityPreferences', () => ({
  useAccessibilityPreferences: () => mockPreferences,
}));

const quotes = ['First experience.', 'Second experience.', 'Third experience.'] as const;
describe('OnboardingQuote', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    AppState.currentState = 'active';
    mockPreferences.reduceMotionEnabled = false;
    mockPreferences.screenReaderEnabled = false;
  });
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

  it('allows eight seconds to read each quote and loops through the set', () => {
    const screen = renderWithProviders(<OnboardingQuote quotes={quotes} />);
    fireEvent(screen.getByTestId('onboarding.quotePager'), 'layout', { nativeEvent: { layout: { width: 320, height: 200 } } });
    expect(screen.getByText('“First experience.”')).toBeTruthy();
    act(() => jest.advanceTimersByTime(7999));
    expect(screen.getByText('“First experience.”')).toBeTruthy();
    act(() => jest.advanceTimersByTime(1));
    expect(screen.getByText('“Second experience.”')).toBeTruthy();
    act(() => jest.advanceTimersByTime(8000));
    expect(screen.getByText('“Third experience.”')).toBeTruthy();
    act(() => jest.advanceTimersByTime(8000));
    expect(screen.getByText('“First experience.”')).toBeTruthy();
    screen.unmount();
    expect(jest.getTimerCount()).toBe(0);
  });


  it('pauses in the background and gives a full reading interval on return', () => {
    let onChange: (state: AppStateStatus) => void = () => {};
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      onChange = listener;
      return { remove: jest.fn() };
    });
    const screen = renderWithProviders(<OnboardingQuote quotes={quotes} />);
    fireEvent(screen.getByTestId('onboarding.quotePager'), 'layout', { nativeEvent: { layout: { width: 320, height: 200 } } });
    act(() => onChange('background'));
    act(() => jest.advanceTimersByTime(24000));
    expect(screen.getByText('“First experience.”')).toBeTruthy();
    act(() => onChange('active'));
    act(() => jest.advanceTimersByTime(8000));
    expect(screen.getByText('“Second experience.”')).toBeTruthy();
  });

  it('supports swiping and dot selection, with a fresh reading interval after interaction', () => {
    const screen = renderWithProviders(<OnboardingQuote quotes={quotes} />);
    const pager = screen.getByTestId('onboarding.quotePager');
    fireEvent(pager, 'layout', { nativeEvent: { layout: { width: 320, height: 200 } } });
    fireEvent(pager, 'scrollBeginDrag');
    act(() => jest.advanceTimersByTime(16000));
    expect(screen.getByText('“First experience.”')).toBeTruthy();
    fireEvent(pager, 'momentumScrollEnd', { nativeEvent: { contentOffset: { x: 320 } } });
    expect(screen.getByLabelText('Show quote 2 of 3').props.accessibilityState.selected).toBe(true);
    expect(screen.getByText('“Second experience.”')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Show quote 3 of 3'));
    expect(screen.getByText('“Third experience.”')).toBeTruthy();
    act(() => jest.advanceTimersByTime(7999));
    expect(screen.getByText('“Third experience.”')).toBeTruthy();
    act(() => jest.advanceTimersByTime(1));
    expect(screen.getByText('“First experience.”')).toBeTruthy();
  });

  it.each(['reduceMotionEnabled', 'screenReaderEnabled'] as const)('keeps the quote static with %s', (preference) => {
    mockPreferences[preference] = true;
    const screen = renderWithProviders(<OnboardingQuote quotes={quotes} />);
    fireEvent(screen.getByTestId('onboarding.quotePager'), 'layout', { nativeEvent: { layout: { width: 320, height: 200 } } });
    act(() => jest.advanceTimersByTime(32000));
    expect(screen.getByText('“First experience.”')).toBeTruthy();
  });
});
