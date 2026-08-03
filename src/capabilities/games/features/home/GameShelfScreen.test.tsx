import { fireEvent, render, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from '@/src/capabilities/games/navigation/gamesRouter';
import { GameShelfScreen } from './GameShelfScreen';

const mockOpenMenu = jest.fn();
let mockJoinDrawerProps: Record<string, unknown> | null = null;

jest.mock('@/src/navigation/CapabilityShellContext', () => ({
  useCapabilityShellOptional: () => ({ openMenu: mockOpenMenu }),
}));

jest.mock('@/src/capabilities/games/navigation/gamesRouter', () => ({
  router: { push: jest.fn() },
}));

jest.mock('@/src/capabilities/games/features/remote/JoinTableDrawer', () => ({
  JoinTableDrawer: (props: Record<string, unknown>) => {
    mockJoinDrawerProps = props;
    return null;
  },
}));

describe('GameShelfScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJoinDrawerProps = null;
  });

  it('renders the complete committed catalog and utility', () => {
    const screen = render(<GameShelfScreen />);
    [
      'Bank',
      'Farkle',
      'Show of Hands',
      'Common Thread',
      'Object Quest',
      'Story Relay',
      'Family Forecast',
      'Pass the Pattern',
      'Doodle Bridge',
      'Clue Circle',
      'Slanguage',
      'Hourglass',
      'Basic Dice Roller',
    ].forEach((title) => expect(screen.getByText(title)).toBeTruthy());
  });

  it('opens the one-minute hourglass from Utilities', () => {
    const screen = render(<GameShelfScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Open 60-second Hourglass' }));

    expect(router.push).toHaveBeenCalledWith('/hourglass');
  });

  it('lets the inventory scroll through the bottom safe-area region', () => {
    const screen = render(<GameShelfScreen />);
    const safeArea = screen.UNSAFE_getByType(SafeAreaView);

    expect(safeArea.props.edges).toEqual(['top', 'left', 'right']);
    expect(StyleSheet.flatten(safeArea.props.style)?.paddingBottom).toBeUndefined();
  });

  it('keeps the Kwilt capability menu available from the shelf', () => {
    const screen = render(<GameShelfScreen />);
    expect(screen.getByTestId('page.header')).toBeTruthy();
    expect(screen.getByText('Games')).toBeTruthy();
    expect(screen.queryByLabelText('Open Kwilt account')).toBeNull();
    fireEvent.press(screen.getByTestId('nav.drawer.toggle'));
    expect(mockOpenMenu).toHaveBeenCalledTimes(1);
  });

  it('opens joining as a drawer over the shelf', () => {
    const screen = render(<GameShelfScreen />);
    expect(mockJoinDrawerProps?.visible).toBe(false);
    const joinButton = within(screen.getByTestId('page.header')).getByRole('button', { name: 'Find or join a nearby game' });
    expect(screen.getAllByRole('button', { name: 'Find or join a nearby game' })).toHaveLength(1);
    fireEvent.press(joinButton);
    expect(mockJoinDrawerProps?.visible).toBe(true);
  });
});
