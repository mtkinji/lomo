import { act, fireEvent, render } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { GameTimerScreen } from './GameTimerScreen';

const mockStart = jest.fn();
const mockReset = jest.fn();
const mockSuccess = jest.fn(async () => undefined);
const mockUseGameMusic = jest.fn();
const mockTick = jest.fn(async () => undefined);
let mockIsFocused = true;
let mockTimer = {
  phase: 'ready' as 'ready' | 'running' | 'finished',
  deadlineMs: null as number | null,
  durationMs: 60_000,
  remainingMs: 60_000,
  remainingSeconds: 60,
  progress: 1,
  start: mockStart,
  reset: mockReset,
};

jest.mock('./useGameTimer', () => ({ useGameTimer: () => mockTimer }));
jest.mock('./useTimerTickAudio', () => ({ useTimerTickAudio: () => mockTick }));
jest.mock('@/src/capabilities/games/audio/useGameFeedback', () => ({ useGameFeedback: () => ({ success: mockSuccess }) }));
jest.mock('@/src/capabilities/games/audio/useGameMusic', () => ({ useGameMusic: (...args: unknown[]) => mockUseGameMusic(...args) }));
jest.mock('@/src/capabilities/games/settings/useGamesSettingsStore', () => ({
  useGamesSettingsStore: (selector: (state: { soundEnabled: boolean }) => unknown) => selector({ soundEnabled: true }),
}));
jest.mock('@/src/capabilities/games/navigation/gamesRouter', () => ({ router: { back: jest.fn() } }));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockIsFocused }));

describe('GameTimerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFocused = true;
    mockTimer = { phase: 'ready', deadlineMs: null, durationMs: 60_000, remainingMs: 60_000, remainingSeconds: 60, progress: 1, start: mockStart, reset: mockReset };
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(jest.fn());
  });

  afterEach(() => jest.restoreAllMocks());

  it('makes duration selection explicit and starts the selected preset', () => {
    const screen = render(<GameTimerScreen />);
    expect(screen.getByText('1:00')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Set timer to 2 min' }));
    expect(screen.getByText('2:00')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Start 2:00 timer' }));
    expect(mockStart).toHaveBeenCalledWith(120_000);
  });

  it('adjusts the duration in 15-second steps', () => {
    const screen = render(<GameTimerScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Decrease timer by 15 seconds' }));
    expect(screen.getByText('0:45')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Increase timer by 15 seconds' }));
    expect(screen.getByText('1:00')).toBeTruthy();
  });

  it('ticks while focused, exposes reset while running, and announces finish', () => {
    mockTimer = { ...mockTimer, phase: 'running', remainingMs: 10_000, remainingSeconds: 10, progress: 1 / 6 };
    const screen = render(<GameTimerScreen />);
    expect(screen.getByText('0:10')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reset game timer' })).toBeTruthy();
    mockTimer = { ...mockTimer, remainingMs: 9_000, remainingSeconds: 9, progress: 0.15 };
    screen.rerender(<GameTimerScreen />);
    expect(mockTick).toHaveBeenCalledTimes(1);
    mockTimer = { ...mockTimer, phase: 'finished', remainingMs: 0, remainingSeconds: 0, progress: 0 };
    screen.rerender(<GameTimerScreen />);
    expect(mockSuccess).toHaveBeenCalledWith('chime');
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Time is up');
  });

  it('keeps completion effects silent off-route and retains optional music', () => {
    mockTimer = { ...mockTimer, phase: 'running' };
    const screen = render(<GameTimerScreen />);
    fireEvent.press(screen.getByRole('switch', { name: 'Turn music on' }));
    expect(screen.getByRole('switch', { name: 'Turn music off' })).toBeTruthy();
    mockIsFocused = false;
    mockTimer = { ...mockTimer, phase: 'finished', remainingMs: 0, remainingSeconds: 0, progress: 0 };
    act(() => screen.rerender(<GameTimerScreen />));
    expect(mockSuccess).not.toHaveBeenCalled();
  });
});
