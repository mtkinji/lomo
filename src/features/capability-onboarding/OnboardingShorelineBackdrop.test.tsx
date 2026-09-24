import { act, fireEvent } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { OnboardingShorelineBackdrop } from './OnboardingShorelineBackdrop';

let mockReduceMotion = false;
const mockRemove = jest.fn();
const mockPlayer = {
  loop: false, muted: false, volume: 1, audioMixingMode: '', staysActiveInBackground: true,
  play: jest.fn(), pause: jest.fn(), addListener: jest.fn(() => ({ remove: mockRemove })),
};
jest.mock('expo-video', () => ({
  useVideoPlayer: (_source: unknown, setup: (player: typeof mockPlayer) => void) => {
    setup(mockPlayer);
    return mockPlayer;
  },
  VideoView: (props: Record<string, unknown>) => {
    const React = jest.requireActual('react');
    return React.createElement(jest.requireActual('react-native').View, props);
  },
}));
jest.mock('../../ui/hooks/useAccessibilityPreferences', () => ({
  useAccessibilityPreferences: () => ({ reduceMotionEnabled: mockReduceMotion }),
}));

describe('OnboardingShorelineBackdrop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReduceMotion = false;
    jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
  });

  it('plays silently without interrupting other audio and pauses when inactive', () => {
    const listener = jest.spyOn(AppState, 'addEventListener');
    const screen = renderWithProviders(<OnboardingShorelineBackdrop active />);
    act(() => listener.mock.calls.at(-1)?.[1]('active'));
    expect(mockPlayer).toMatchObject({ loop: true, muted: true, volume: 0, audioMixingMode: 'mixWithOthers', staysActiveInBackground: false });
    expect(mockPlayer.play).toHaveBeenCalled();
    act(() => listener.mock.calls.at(-1)?.[1]('background'));
    expect(mockPlayer.pause).toHaveBeenCalled();
    mockPlayer.play.mockClear();
    screen.rerender(<OnboardingShorelineBackdrop active={false} />);
    act(() => listener.mock.calls.at(-1)?.[1]('active'));
    expect(mockPlayer.play).not.toHaveBeenCalled();
    screen.unmount();
    expect(mockRemove).toHaveBeenCalled();
    listener.mockRestore();
  });

  it('uses a poster only for reduced motion', () => {
    mockReduceMotion = true;
    const screen = renderWithProviders(<OnboardingShorelineBackdrop active />);
    expect(screen.getByTestId('onboarding.shoreline.poster', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByTestId('onboarding.shoreline.video', { includeHiddenElements: true })).toBeNull();
    expect(mockPlayer.play).not.toHaveBeenCalled();
  });

  it('keeps the poster until a frame is ready and restores it on decode error', () => {
    const screen = renderWithProviders(<OnboardingShorelineBackdrop active />);
    const video = screen.getByTestId('onboarding.shoreline.video', { includeHiddenElements: true });
    expect(video).toHaveStyle({ opacity: 0 });
    fireEvent(video, 'firstFrameRender');
    expect(video).not.toHaveStyle({ opacity: 0 });
    const callback = (mockPlayer.addListener.mock.calls as unknown as [string, (event: { status: string }) => void][])[0][1];
    act(() => callback({ status: 'error' }));
    expect(screen.queryByTestId('onboarding.shoreline.video', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByTestId('onboarding.shoreline.poster', { includeHiddenElements: true })).toBeTruthy();
  });
});
