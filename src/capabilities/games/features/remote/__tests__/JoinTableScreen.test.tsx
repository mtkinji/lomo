import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from '@/src/capabilities/games/navigation/gamesRouter';
import { JoinTableDrawer } from '../JoinTableDrawer';
import { browseNearbyTables } from '@/src/capabilities/games/nearby/nearbyTables';
import { tableMarkForCode } from '@/src/capabilities/games/remote/remoteBank';
import { claimRemoteBankTableInvite } from '@/src/capabilities/games/remote/remoteBankClient';

let mockBottomDrawerProps: Record<string, unknown> | null = null;

jest.mock('@/src/capabilities/games/navigation/gamesRouter', () => ({
  router: { replace: jest.fn() },
}));
jest.mock('@/src/ui/BottomDrawer', () => {
  const { View } = jest.requireActual('react-native');
  return {
    BottomDrawer: ({ visible, children, ...props }: { visible: boolean; children: React.ReactNode } & Record<string, unknown>) => {
      mockBottomDrawerProps = props;
      return visible ? <View>{children}</View> : null;
    },
    BottomDrawerScrollView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});
jest.mock('@/src/capabilities/games/remote/remoteBankClient', () => ({ claimRemoteBankTableInvite: jest.fn() }));
jest.mock('@/src/capabilities/games/nearby/nearbyTables', () => ({
  nearbyTablesAvailable: () => true,
  browseNearbyTables: jest.fn(),
}));

const mockClaim = claimRemoteBankTableInvite as jest.Mock;
const mockBrowse = browseNearbyTables as jest.Mock;
const mockReplace = router.replace as jest.Mock;

describe('JoinTableScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBottomDrawerProps = null;
    mockBrowse.mockImplementation(async (onChange: (tables: { code: string; game: 'bank' }[]) => void) => {
      onChange([{ code: 'W7K4JP', game: 'bank' }]);
      return jest.fn();
    });
    mockClaim.mockResolvedValue({ sessionId: 'room-1', participantId: 'seat-2', tableCode: 'W7K4JP' });
  });

  it('names a discovered Slanguage table correctly', async () => {
    mockBrowse.mockImplementation(async (onChange: (tables: { code: string; game: 'slanguage' }[]) => void) => {
      onChange([{ code: 'ABC123', game: 'slanguage' }]);
      return jest.fn();
    });
    const screen = render(<JoinTableDrawer visible onClose={jest.fn()} />);
    await act(async () => undefined);
    expect(await screen.findByText('Slanguage nearby')).toBeTruthy();
    expect(screen.getByLabelText(`Join Slanguage table ${tableMarkForCode('ABC123')}`)).toBeTruthy();
  });

  it('opens compactly with an expanded snap available', () => {
    render(<JoinTableDrawer visible onClose={jest.fn()} />);
    expect(mockBottomDrawerProps?.snapPoints).toEqual(['72%', '92%']);
    expect(mockBottomDrawerProps?.initialSnapIndex).toBe(0);
    expect(mockBottomDrawerProps?.scrimToken).toBe('pineSubtle');
  });

  it('lets a nearby player name themselves and join the shared table', async () => {
    const screen = render(<JoinTableDrawer visible onClose={jest.fn()} />);
    await act(async () => undefined);

    fireEvent.changeText(screen.getByLabelText('Your player name'), 'Olive');
    fireEvent.press(await screen.findByLabelText(`Join Bank table ${tableMarkForCode('W7K4JP')}`));

    await waitFor(() => expect(mockClaim).toHaveBeenCalledWith({ shortCode: 'W7K4JP', displayName: 'Olive' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(expect.objectContaining({ params: expect.objectContaining({ sessionId: 'room-1', tableCode: 'W7K4JP' }) })));
  });

  it('uses the same name-first flow for a scanned table link', async () => {
    const screen = render(<JoinTableDrawer visible token="private-token" onClose={jest.fn()} />);
    fireEvent.changeText(screen.getByLabelText('Your player name'), 'Grant');
    fireEvent.press(screen.getByText('Join table'));

    await waitFor(() => expect(mockClaim).toHaveBeenCalledWith({ token: 'private-token', displayName: 'Grant' }));
    expect(mockBrowse).not.toHaveBeenCalled();
  });
});
