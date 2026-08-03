import { act, fireEvent, render } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { HourglassScreen } from './HourglassScreen';

const mockStart = jest.fn();
const mockReset = jest.fn();
const mockSuccess = jest.fn(async () => undefined);
const mockUseGameMusic = jest.fn();
const mockAnnounce = jest.fn();
const mockSetHourglassStyle = jest.fn();
const mockUsePhysicalMotion = jest.fn();
let mockIsFocused = true;
let mockHourglassStyle: 'physical' | 'classic' | 'simple' = 'physical';
let mockMotion = {
  availability: 'available' as 'checking' | 'available' | 'unavailable',
  armedEnd: 'upright' as 'upright' | 'inverted' | null,
};
let mockTimer = {
  phase: 'ready' as 'ready' | 'running' | 'finished',
  deadlineMs: null as number | null,
  remainingMs: 60_000,
  remainingSeconds: 60,
  progress: 1,
  start: mockStart,
  reset: mockReset,
};

jest.mock('./useHourglassTimer', () => ({
  useHourglassTimer: () => mockTimer,
}));

jest.mock('@/src/capabilities/games/audio/useGameFeedback', () => ({
  useGameFeedback: () => ({ success: mockSuccess }),
}));

jest.mock('@/src/capabilities/games/audio/useGameMusic', () => ({
  useGameMusic: (...args: unknown[]) => mockUseGameMusic(...args),
}));

jest.mock('@/src/capabilities/games/settings/useGamesSettingsStore', () => ({
  useGamesSettingsStore: (selector: (state: {
    soundEnabled: boolean;
    hourglassStyle: 'physical' | 'classic' | 'simple';
    setHourglassStyle: typeof mockSetHourglassStyle;
  }) => unknown) => selector({ soundEnabled: true, hourglassStyle: mockHourglassStyle, setHourglassStyle: mockSetHourglassStyle }),
}));

jest.mock('./usePhysicalHourglassMotion', () => ({
  usePhysicalHourglassMotion: (options: unknown) => {
    mockUsePhysicalMotion(options);
    return mockMotion;
  },
}));

jest.mock('@/src/capabilities/games/navigation/gamesRouter', () => ({
  router: { back: jest.fn() },
}));

jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockIsFocused,
}));

describe('HourglassScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTimer = {
      phase: 'ready',
      deadlineMs: null,
      remainingMs: 60_000,
      remainingSeconds: 60,
      progress: 1,
      start: mockStart,
      reset: mockReset,
    };
    mockIsFocused = true;
    mockHourglassStyle = 'physical';
    mockMotion = { availability: 'available', armedEnd: 'upright' };
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(mockAnnounce);
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() } as never);
  });

  afterEach(() => jest.restoreAllMocks());

  async function renderScreen() {
    const screen = render(<HourglassScreen />);
    await act(async () => undefined);
    return screen;
  }

  it('starts one minute through the Physical touch fallback and exposes session music', async () => {
    const screen = await renderScreen();

    expect(screen.getByText('Turn phone over')).toBeTruthy();
    expect(screen.getByLabelText('60-second hourglass ready. Turn phone over')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Start hourglass by touch' }));
    expect(mockStart).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByRole('switch', { name: 'Turn music on' }));
    expect(screen.getByRole('switch', { name: 'Turn music off' }).props.accessibilityState).toEqual({ checked: true });
  });

  it('starts the clock on press before the normal-motion flip finishes', async () => {
    jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(false);
    mockHourglassStyle = 'classic';
    const screen = await renderScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Flip hourglass for 60 seconds' }));

    expect(mockStart).toHaveBeenCalledTimes(1);
    screen.unmount();
  });

  it('remembers the selected face and renders the Simple touch surface', async () => {
    const screen = await renderScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Simple style' }));
    expect(mockSetHourglassStyle).toHaveBeenCalledWith('simple');

    mockHourglassStyle = 'simple';
    screen.rerender(<HourglassScreen />);
    expect(screen.getByRole('button', { name: 'Start simple timer for 60 seconds' })).toBeTruthy();
  });

  it('starts from a stable Physical turn to the opposite end', async () => {
    await renderScreen();
    const options = mockUsePhysicalMotion.mock.calls.at(-1)?.[0] as { onFlip: (end: 'upright' | 'inverted') => void };

    act(() => options.onFlip('inverted'));

    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it('offers only reset while sand is running', async () => {
    mockTimer = { ...mockTimer, phase: 'running', remainingMs: 41_200, remainingSeconds: 42, progress: 0.686 };
    const screen = await renderScreen();

    expect(screen.getByLabelText('42 seconds remaining')).toBeTruthy();
    expect(screen.queryByLabelText('Flip hourglass for 60 seconds')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Reset hourglass' }));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('plays the completion cue once when a running glass finishes', async () => {
    mockHourglassStyle = 'classic';
    mockTimer = { ...mockTimer, phase: 'running', remainingMs: 100, remainingSeconds: 1, progress: 0.0017 };
    const screen = await renderScreen();
    mockTimer = { ...mockTimer, phase: 'finished', remainingMs: 0, remainingSeconds: 0, progress: 0 };

    screen.rerender(<HourglassScreen />);

    expect(mockSuccess).toHaveBeenCalledTimes(1);
    expect(mockSuccess).toHaveBeenCalledWith('chime');
    expect(mockAnnounce).toHaveBeenCalledWith('Time is up');
    expect(screen.getByRole('button', { name: 'Flip hourglass again for 60 seconds' })).toBeTruthy();
  });

  it('silences presentation effects while the Hourglass route is not focused', async () => {
    mockIsFocused = false;
    mockTimer = { ...mockTimer, phase: 'running', remainingMs: 30_000, remainingSeconds: 30, progress: 0.5 };
    const screen = await renderScreen();
    mockTimer = { ...mockTimer, phase: 'finished', remainingMs: 0, remainingSeconds: 0, progress: 0 };

    screen.rerender(<HourglassScreen />);

    expect(mockUseGameMusic).toHaveBeenLastCalledWith(null, false);
    expect(mockSuccess).not.toHaveBeenCalled();
    expect(mockAnnounce).not.toHaveBeenCalled();
  });
});
