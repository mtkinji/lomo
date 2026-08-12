import { act } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { FocusEnvironmentBackdrop } from './FocusEnvironmentBackdrop';

const mockPlayer = {
  loop: false,
  muted: false,
  volume: 1,
  play: jest.fn(),
  pause: jest.fn(),
};
const mockUseVideoPlayer = jest.fn((_source, setup?: (value: typeof mockPlayer) => void) => {
  setup?.(mockPlayer);
  return mockPlayer;
});
let mockReduceMotionEnabled = false;

jest.mock('expo-video', () => ({
  useVideoPlayer: (source: unknown, setup?: (value: typeof mockPlayer) => void) =>
    mockUseVideoPlayer(source, setup),
  VideoView: ({
    onFirstFrameRender,
    ...props
  }: Record<string, unknown> & { onFirstFrameRender?: () => void }) => {
    const React = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return React.createElement(View, {
      ...props,
      testID: 'focus-environment-video',
      onFirstFrameRender,
    });
  },
}));

jest.mock('../../ui/hooks/useAccessibilityPreferences', () => ({
  useAccessibilityPreferences: () => ({ reduceMotionEnabled: mockReduceMotionEnabled, screenReaderEnabled: false }),
}));

describe('FocusEnvironmentBackdrop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReduceMotionEnabled = false;
    mockPlayer.loop = false;
    mockPlayer.muted = false;
    mockPlayer.volume = 1;
  });

  it('owns a muted looping visual while the independent Focus audio remains elsewhere', () => {
    const screen = renderWithProviders(
      <FocusEnvironmentBackdrop soundscapeId="canyonSpring" running />,
    );

    expect(screen.getByTestId('focus-environment-poster', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId('focus-environment-video', { includeHiddenElements: true })).toBeTruthy();
    expect(mockPlayer.loop).toBe(true);
    expect(mockPlayer.muted).toBe(true);
    expect(mockPlayer.volume).toBe(0);
    expect(mockPlayer.play).toHaveBeenCalledTimes(1);
  });

  it('pauses video decoding with a paused Focus session and in the background', () => {
    const addListenerSpy = jest.spyOn(AppState, 'addEventListener');
    const screen = renderWithProviders(
      <FocusEnvironmentBackdrop soundscapeId="canyonSpring" running />,
    );

    const appStateListener = addListenerSpy.mock.calls.at(-1)?.[1];
    act(() => appStateListener?.('background'));
    expect(mockPlayer.pause).toHaveBeenCalled();

    mockPlayer.pause.mockClear();
    screen.rerender(<FocusEnvironmentBackdrop soundscapeId="canyonSpring" running={false} />);
    expect(mockPlayer.pause).toHaveBeenCalled();
  });

  it('uses only the quiet poster when Reduce Motion is enabled', () => {
    mockReduceMotionEnabled = true;
    const screen = renderWithProviders(
      <FocusEnvironmentBackdrop soundscapeId="canyonSpring" running />,
    );

    expect(screen.getByTestId('focus-environment-poster', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByTestId('focus-environment-video', { includeHiddenElements: true })).toBeNull();
    expect(mockUseVideoPlayer).not.toHaveBeenCalled();
  });

  it('renders nothing for an audio-only environment', () => {
    const screen = renderWithProviders(
      <FocusEnvironmentBackdrop soundscapeId="quietRain" running />,
    );

    expect(screen.queryByTestId('focus-environment-poster', { includeHiddenElements: true })).toBeNull();
    expect(screen.queryByTestId('focus-environment-video', { includeHiddenElements: true })).toBeNull();
  });
});
