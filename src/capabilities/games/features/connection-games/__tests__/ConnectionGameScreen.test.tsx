import { act, fireEvent, render } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConnectionGameScreen } from '../ConnectionGameScreen';
import { createOpenSlanguageTable } from '@/src/capabilities/games/remote/remoteSlanguageClient';

let mockGameId = 'same-page';
const mockRemember = jest.fn();
const mockCreateOpenSlanguageTable = createOpenSlanguageTable as jest.Mock;
const mockPatternAudio = {
  beat: jest.fn(), sequence: jest.fn(), stopSequence: jest.fn(),
  success: jest.fn(), failure: jest.fn(),
};
let mockMotionAvailable = false;
let mockMotionListener: ((event: { rotationRate?: { alpha?: number } }) => void) | null = null;
const mockGameFeedback = { success: jest.fn(), failure: jest.fn(), select: jest.fn() };

function launchLocalGame(screen: ReturnType<typeof render>) {
  const first = screen.getByLabelText('Player 1');
  const second = screen.getByLabelText('Player 2');
  const startLabel = first.props.value || second.props.value ? 'Start game' : 'Play now';
  fireEvent.press(screen.getByText(startLabel));
}

jest.mock('@/src/capabilities/games/shell/AuthProvider', () => ({
  useAuth: () => ({ session: null }),
}));

jest.mock('@/src/capabilities/games/platform/auth', () => ({
  permanentUserId: () => null,
}));

jest.mock('@/src/capabilities/games/players/useSavedPlayerRoster', () => ({
  useSavedPlayerRoster: () => ({
    players: [{
      id: 'alden', displayName: 'Alden', linkedUserId: null, playCount: 2,
      lastPlayedAt: '2026-07-11', sortOrder: 0, archivedAt: null,
      createdAt: '2026-07-01', updatedAt: '2026-07-11',
    }],
    loading: false,
    remember: mockRemember,
  }),
}));

jest.mock('@/src/capabilities/games/players/useGamePlayerProfile', () => ({
  useGamePlayerProfile: () => ({ profile: null, loading: false, syncing: false, syncError: null, save: jest.fn() }),
}));

jest.mock('@/src/capabilities/games/navigation/gamesRouter', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ gameId: mockGameId }),
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) };
});

jest.mock('expo-sensors/build/DeviceMotion', () => ({
  __esModule: true,
  default: {
    isAvailableAsync: jest.fn(() => mockMotionAvailable ? Promise.resolve(true) : new Promise<boolean>(() => undefined)),
    setUpdateInterval: jest.fn(),
    addListener: jest.fn((listener) => {
      mockMotionListener = listener;
      return { remove: jest.fn() };
    }),
  },
}));

jest.mock('@/src/capabilities/games/audio/usePatternAudio', () => ({
  usePatternAudio: () => mockPatternAudio,
}));

jest.mock('@/src/capabilities/games/audio/useGameFeedback', () => ({
  useGameFeedback: () => mockGameFeedback,
}));

jest.mock('@/src/capabilities/games/remote/remoteSlanguageClient', () => ({
  createOpenSlanguageTable: jest.fn(),
}));

describe('ConnectionGameScreen', () => {
  beforeEach(() => {
    mockRemember.mockClear();
    mockCreateOpenSlanguageTable.mockReset();
    mockCreateOpenSlanguageTable.mockResolvedValue({ sessionId: 'slanguage-room', userId: 'host-user' });
    Object.values(mockPatternAudio).forEach((mock) => mock.mockClear());
    Object.values(mockGameFeedback).forEach((mock) => mock.mockClear());
    mockMotionAvailable = false;
    mockMotionListener = null;
  });

  const cases = [
    ['common-thread', 'Common Thread', /Pancakes.*Moonlight/],
    ['object-quest', 'Object Quest', /Find something older than you/],
    ['story-relay', 'Story Relay', /Open the scene/],
    ['family-forecast', 'Family Forecast', /Which would Player 1 choose/],
    ['pass-pattern', 'Pass the Pattern', /Choose your rhythm/],
    ['doodle-bridge', 'Doodle Bridge', /Turn the circle into anything/],
    ['clue-circle', 'Clue Circle', /Phone on forehead/],
  ] as const;

  it('starts Show of Hands immediately with no player setup', () => {
    mockGameId = 'same-page';
    const screen = render(<ConnectionGameScreen />);

    expect(screen.getByText('A dragon moved into your house. Where does it sleep?')).toBeTruthy();
    expect(screen.queryByText('Start together')).toBeNull();
    expect(screen.queryByText('Change players')).toBeNull();
  });

  it('opens Slanguage through the canonical player setup as a joined-phone table', () => {
    mockGameId = 'slanguage';
    const screen = render(<ConnectionGameScreen />);
    expect(screen.getByText('Who’s playing?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Use more phones' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add player' })).toBeNull();
    expect(screen.queryByText('Open a private table, then bring in at least two more people.')).toBeNull();
    expect(screen.getByRole('header', { name: 'Slanguage game' })).toBeTruthy();
    expect(screen.queryByText('KWILT')).toBeNull();
    expect(screen.queryByText('Choose the host. Everyone else joins on their phone.')).toBeNull();
  });

  it('opens a Slanguage table with the selected canonical host player', async () => {
    mockGameId = 'slanguage';
    const screen = render(<ConnectionGameScreen />);

    fireEvent.press(screen.getByLabelText('Alden'));
    fireEvent.press(screen.getByRole('button', { name: 'Use more phones' }));
    await act(async () => Promise.resolve());

    expect(mockCreateOpenSlanguageTable).toHaveBeenCalledWith('Alden');
    expect(mockRemember).toHaveBeenCalledWith([{ savedPlayerId: 'alden', displayName: 'Alden' }]);
  });

  it.each(cases)('starts %s from the shared two-player setup', (gameId, title, expected) => {
    mockGameId = gameId;
    const screen = render(<ConnectionGameScreen />);
    expect(screen.getByRole('header', { name: `${title} game` })).toBeTruthy();
    expect(screen.getByText('Who’s playing?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Play now' })).toBeEnabled();
    launchLocalGame(screen);
    expect(screen.getByText(expected)).toBeTruthy();
    screen.unmount();
  });

  it('builds, reveals, and continues a Story Relay chapter', () => {
    mockGameId = 'story-relay';
    const screen = render(<ConnectionGameScreen />);
    launchLocalGame(screen);

    fireEvent.changeText(screen.getByPlaceholderText('Add your part…'), 'The package began to hum.');
    fireEvent.press(screen.getByText('Add to our story'));
    fireEvent.press(screen.getByText('I’m ready'));

    expect(screen.getByText('Land the surprise.')).toBeTruthy();
    fireEvent.press(screen.getByText('a suspicious pancake'));
    fireEvent.changeText(screen.getByPlaceholderText('Add your part…'), 'Inside was a suspicious pancake with a map.');
    fireEvent.press(screen.getByText('Add to our story'));

    expect(screen.getByText('READ IT ALOUD')).toBeTruthy();
    expect(screen.getByLabelText('Player 1: The package began to hum.')).toBeTruthy();
    expect(screen.getByLabelText('Player 2: Inside was a suspicious pancake with a map.')).toBeTruthy();

    fireEvent.press(screen.getByText('One more chapter'));
    expect(screen.getByText('CHAPTER 2 · PLAYER 2')).toBeTruthy();
    expect(screen.getByText(/The package began to hum.*Inside was a suspicious pancake/s)).toBeTruthy();
    screen.unmount();
  });

  it('selects and remembers familiar players for Story Relay', () => {
    mockGameId = 'story-relay';
    const screen = render(<ConnectionGameScreen />);

    fireEvent.press(screen.getByText('Alden'));
    launchLocalGame(screen);

    expect(mockRemember).toHaveBeenCalledWith([
      { displayName: 'Alden', savedPlayerId: 'alden' },
    ]);
    expect(screen.getByText('CHAPTER 1 · ALDEN')).toBeTruthy();
  });

  it('lets iOS keep a focused lower player field above the keyboard', () => {
    mockGameId = 'story-relay';
    const screen = render(<ConnectionGameScreen />);

    const keyboardAwareScroll = screen.UNSAFE_getAllByType(ScrollView)
      .find((view) => view.props.automaticallyAdjustKeyboardInsets);

    expect(keyboardAwareScroll).toBeTruthy();
  });

  it('contains VoiceOver focus within the active game screen', () => {
    mockGameId = 'story-relay';
    const screen = render(<ConnectionGameScreen />);

    expect(screen.UNSAFE_getByType(SafeAreaView).props.accessibilityViewIsModal).toBe(true);
  });

  it('waits for the receiver before playing a Gentle pattern', () => {
    mockGameId = 'pass-pattern';
    const screen = render(<ConnectionGameScreen />);
    launchLocalGame(screen);
    fireEvent.press(screen.getByText('Gentle'));

    expect(screen.getByText('Pass to Player 1')).toBeTruthy();
    expect(mockPatternAudio.sequence).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('We’re ready'));
    expect(mockPatternAudio.sequence).toHaveBeenCalledWith(['coral', 'pine'], expect.objectContaining({ spacingMs: 650 }));

    const options = mockPatternAudio.sequence.mock.calls[0][1];
    act(() => options.onComplete());
    expect(screen.getByText('Play again')).toBeTruthy();
    fireEvent.press(screen.getByText('I’ve got it'));

    expect(screen.getByLabelText('Beat pad')).toBeTruthy();
    expect(screen.getByLabelText('Coral beat')).toBeTruthy();
    expect(screen.getByLabelText('Pine beat')).toBeTruthy();
    expect(screen.getByLabelText('Gold beat')).toBeTruthy();
    expect(screen.queryByLabelText('Sky beat')).toBeNull();
  });

  it('renders six full beat controls for Challenge', () => {
    mockGameId = 'pass-pattern';
    const screen = render(<ConnectionGameScreen />);
    launchLocalGame(screen);
    fireEvent.press(screen.getByText('Challenge'));
    fireEvent.press(screen.getByText('We’re ready'));
    const options = mockPatternAudio.sequence.mock.calls[0][1];
    act(() => options.onComplete());
    fireEvent.press(screen.getByText('I’ve got it'));

    for (const label of ['Coral', 'Pine', 'Gold', 'Sky', 'Violet', 'Rose']) {
      expect(screen.getByLabelText(`${label} beat`)).toBeTruthy();
    }
  });

  it('runs Show of Hands through a shared reveal without capturing players', () => {
    mockGameId = 'same-page';
    const screen = render(<ConnectionGameScreen />);
    fireEvent.press(screen.getByText('Reveal together'));
    fireEvent.press(screen.getByText('Everyone picked 1'));

    expect(screen.getByText('HIGH FIVE!')).toBeTruthy();
    expect(screen.getByLabelText('1 High Five, 0 Chaos')).toBeTruthy();
  });

  it('lets every Object Quest player check in before the reveal', () => {
    mockGameId = 'object-quest';
    const screen = render(<ConnectionGameScreen />);
    launchLocalGame(screen);

    fireEvent.press(screen.getByText("Player 1 is back"));
    expect(screen.getByText(/1 of 2 back/)).toBeTruthy();
    fireEvent.press(screen.getByText("Player 2 is back"));
    expect(screen.getByText('Player 1, show us.')).toBeTruthy();
  });

  it('reveals Family Forecast predictions by player', () => {
    mockGameId = 'family-forecast';
    const screen = render(<ConnectionGameScreen />);
    launchLocalGame(screen);
    fireEvent.press(screen.getByText('Make something'));
    fireEvent.press(screen.getByText('I’m ready'));
    fireEvent.press(screen.getByText('Make something'));

    expect(screen.getByLabelText('Player 2 predicted Make something, correct')).toBeTruthy();
  });

  it('conducts private Doodle Bridge dares and reveals them after a bounded round', () => {
    mockGameId = 'doodle-bridge';
    const screen = render(<ConnectionGameScreen />);
    launchLocalGame(screen);

    expect(screen.getByText('TURN 1 OF 4 · PLAYER 1')).toBeTruthy();
    fireEvent.press(screen.getByText('Pass without drawing'));
    expect(screen.getByText('Hand it to Player 2.')).toBeTruthy();
    expect(screen.queryByText('Hide a tiny face.')).toBeNull();
    fireEvent.press(screen.getByText('Show my turn'));

    fireEvent.press(screen.getByText('Pass without drawing'));
    fireEvent.press(screen.getByText('Show my dare'));
    expect(screen.getByText('Hide a tiny face.')).toBeTruthy();

    fireEvent.press(screen.getByText('Pass without drawing'));
    fireEvent.press(screen.getByText('Show my dare'));
    expect(screen.getByText('Turn an old line into something alive.')).toBeTruthy();
    fireEvent.press(screen.getByText('Reveal our doodle'));

    expect(screen.getByText('Start another doodle')).toBeTruthy();
    expect(screen.getByLabelText("Player 1's secret dare: Hide a tiny face.")).toBeTruthy();
    expect(screen.getByLabelText("Player 2's secret dare: Turn an old line into something alive.")).toBeTruthy();

    fireEvent.press(screen.getByText('Start another doodle'));
    expect(screen.getByText('Take this wandering line somewhere.')).toBeTruthy();
  });

  it('runs rapid timed Clue Circle turns entirely through motion', async () => {
    jest.useFakeTimers();
    mockMotionAvailable = true;
    mockGameId = 'clue-circle';
    const screen = render(<ConnectionGameScreen />);
    launchLocalGame(screen);
    await act(async () => Promise.resolve());
    expect(screen.getByText('Correct')).toBeTruthy();
    expect(screen.getByText('Pass')).toBeTruthy();
    expect(screen.queryByText(/60 seconds/)).toBeNull();
    act(() => mockMotionListener?.({ rotationRate: { alpha: 100 } }));

    expect(screen.getByText(/1:00/)).toBeTruthy();
    expect(screen.queryByText('Correct')).toBeNull();
    expect(screen.queryByText('Pass')).toBeNull();
    expect(screen.queryByText('Change players')).toBeNull();
    expect(screen.queryByText('Describe it without saying any part of the answer.')).toBeNull();
    expect(screen.queryByText('Everyone else: help them guess.')).toBeNull();
    const firstTarget = 'Pillow fight';
    act(() => mockMotionListener?.({ rotationRate: { alpha: 0 } }));
    act(() => mockMotionListener?.({ rotationRate: { alpha: 100 } }));
    expect(screen.queryByText(firstTarget)).toBeNull();
    expect(screen.queryByText('1 correct')).toBeNull();

    const secondTarget = 'Birthday cake';
    act(() => mockMotionListener?.({ rotationRate: { alpha: 0 } }));
    act(() => mockMotionListener?.({ rotationRate: { alpha: -100 } }));
    expect(screen.queryByText(secondTarget)).toBeNull();
    expect(screen.queryByText('1 correct')).toBeNull();
    expect(screen.queryByText('Describe it without saying any part of the answer.')).toBeNull();

    act(() => jest.advanceTimersByTime(60_000));
    expect(screen.getByText('Player 1 found 1')).toBeTruthy();
    fireEvent.press(screen.getByText('Pass to Player 2'));
    act(() => mockMotionListener?.({ rotationRate: { alpha: 0 } }));
    act(() => mockMotionListener?.({ rotationRate: { alpha: 100 } }));
    act(() => mockMotionListener?.({ rotationRate: { alpha: 0 } }));
    act(() => mockMotionListener?.({ rotationRate: { alpha: 100 } }));
    act(() => mockMotionListener?.({ rotationRate: { alpha: 0 } }));
    act(() => mockMotionListener?.({ rotationRate: { alpha: 100 } }));
    act(() => jest.advanceTimersByTime(60_000));
    fireEvent.press(screen.getByText('See our circle'));

    expect(screen.getByText('Everyone took a turn.')).toBeTruthy();
    expect(screen.getByText(/Together you found 3 targets/)).toBeTruthy();
    expect(screen.getByText('Play another circle')).toBeTruthy();
    screen.unmount();
    jest.useRealTimers();
  });

  it('starts Clue Circle with a practice tilt and confirms it with sound', async () => {
    mockMotionAvailable = true;
    mockGameId = 'clue-circle';
    const screen = render(<ConnectionGameScreen />);
    launchLocalGame(screen);
    await act(async () => Promise.resolve());

    expect(screen.getByText('Tilt down to start.')).toBeTruthy();
    expect(screen.queryByText('Start')).toBeNull();
    act(() => mockMotionListener?.({ rotationRate: { alpha: 100 } }));

    expect(screen.getByText('Pillow fight')).toBeTruthy();
    expect(mockGameFeedback.success).toHaveBeenCalledWith('sparkle');
  });

  it('lets the table mute and restore Clue Circle sound from the top bar', () => {
    mockGameId = 'clue-circle';
    const screen = render(<ConnectionGameScreen />);
    launchLocalGame(screen);

    fireEvent.press(screen.getByLabelText('Turn sound off'));
    expect(screen.getByLabelText('Turn sound on')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Turn sound on'));
    expect(screen.getByLabelText('Turn sound off')).toBeTruthy();
  });
});
