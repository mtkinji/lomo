import { act, fireEvent, render } from '@testing-library/react-native';
import { StitchFiveScreen } from './StitchFiveScreen';

const mockFeedback = {
  roll: jest.fn(async () => undefined),
  success: jest.fn(async () => undefined),
  failure: jest.fn(async () => undefined),
  bank: jest.fn(async () => undefined),
  doubles: jest.fn(async () => undefined),
  skip: jest.fn(async () => undefined),
  select: jest.fn(),
};

jest.mock('@/src/capabilities/games/audio/useGameFeedback', () => ({
  useGameFeedback: () => mockFeedback,
}));

jest.mock('@/src/capabilities/games/players/useSavedPlayerRoster', () => ({
  useSavedPlayerRoster: () => ({
    players: [], loading: false, remember: jest.fn((players) => players), rename: jest.fn(), archive: jest.fn(), updateIdentity: jest.fn(),
  }),
}));

jest.mock('@/src/capabilities/games/platform/useActiveGameOrientation', () => ({
  useActiveGameOrientation: jest.fn(),
}));

jest.mock('@/src/capabilities/games/settings/useGamesSettingsStore', () => ({
  useGamesSettingsStore: (selector: (state: { soundEnabled: boolean }) => unknown) => selector({ soundEnabled: true }),
}));

jest.mock('@/src/capabilities/games/navigation/gamesRouter', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => false), replace: jest.fn(), push: jest.fn() },
}));

describe('StitchFiveScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('moves from optional-name setup into roll, pin, preview, and stitch selection', () => {
    const screen = render(<StitchFiveScreen />);
    expect(screen.getByText('Who’s playing?')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Start stitching' }));
    expect(screen.getByText("Player 1's stitch")).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Roll all five dice' })).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Roll all five dice' }));
    act(() => { jest.advanceTimersByTime(500); });

    expect(screen.getByRole('button', { name: 'Ones, would score 5' })).toBeTruthy();
    const firstDie = screen.getAllByRole('button', { name: 'Fabric die showing 1, not pinned' })[0];
    fireEvent.press(firstDie);
    expect(screen.getByRole('button', { name: 'Fabric die showing 1, pinned' })).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Ones, would score 5' }));
    expect(screen.getByRole('button', { name: 'Stitch 5 to Ones' })).toBeTruthy();
  });

  it('keeps the complete rules reference available without leaving the quilt', () => {
    const screen = render(<StitchFiveScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Start stitching' }));
    fireEvent.press(screen.getByRole('button', { name: 'How to play Stitch Five' }));

    expect(screen.getByRole('header', { name: 'How to stitch' })).toBeTruthy();
    expect(screen.getAllByText('House Block').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Five of a kind · 50').length).toBeGreaterThan(1);
  });
});
