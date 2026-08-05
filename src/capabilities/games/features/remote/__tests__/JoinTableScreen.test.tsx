import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from '@/src/capabilities/games/navigation/gamesRouter';
import { JoinTableDrawer } from '../JoinTableDrawer';
import { browseNearbyTables } from '@/src/capabilities/games/nearby/nearbyTables';
import { tableMarkForCode } from '@/src/capabilities/games/remote/remoteBank';
import { claimRemoteBankTableInvite, previewOpenGameTableInvite } from '@/src/capabilities/games/remote/remoteBankClient';

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
jest.mock('@/src/capabilities/games/remote/remoteBankClient', () => ({
  claimRemoteBankTableInvite: jest.fn(),
  previewOpenGameTableInvite: jest.fn(),
}));
jest.mock('@/src/capabilities/games/nearby/nearbyTables', () => ({
  nearbyTablesAvailable: () => true,
  browseNearbyTables: jest.fn(),
}));

const mockClaim = claimRemoteBankTableInvite as jest.Mock;
const mockPreview = previewOpenGameTableInvite as jest.Mock;
const mockBrowse = browseNearbyTables as jest.Mock;
const mockReplace = router.replace as jest.Mock;
let mockProfile: { displayName: string } | null = { displayName: 'Olive' };

jest.mock('@/src/capabilities/games/shell/AuthProvider', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1', is_anonymous: false, user_metadata: { full_name: 'Olive' } } } }),
}));
jest.mock('@/src/capabilities/games/platform/auth', () => ({ permanentUserId: () => 'user-1' }));
jest.mock('@/src/capabilities/games/players/useGamePlayerProfile', () => ({
  useGamePlayerProfile: () => ({ profile: mockProfile, loading: false }),
}));

describe('JoinTableScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBottomDrawerProps = null;
    mockProfile = { displayName: 'Olive' };
    mockBrowse.mockImplementation(async (onChange: (tables: { code: string; game: 'bank' }[]) => void) => {
      onChange([{ code: 'W7K4JP', game: 'bank' }]);
      return jest.fn();
    });
    mockClaim.mockResolvedValue({ sessionId: 'room-1', participantId: 'seat-2', tableCode: 'W7K4JP' });
    mockPreview.mockResolvedValue({
      gameKey: 'bank',
      hostDisplayName: 'Andrew',
      participantCount: 3,
      capacity: 6,
      inviteState: 'available',
      canJoin: true,
      alreadyJoined: false,
      sessionId: 'room-1',
      tableCode: 'W7K4JP',
    });
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

  it('makes nearby search, its host dependency, and its privacy boundary explicit', async () => {
    mockBrowse.mockResolvedValue(jest.fn());
    const screen = render(<JoinTableDrawer visible onClose={jest.fn()} />);

    expect(screen.getByText('Find a table nearby')).toBeTruthy();
    expect(screen.getByText('Searching while this sheet is open. Other players can’t see you.')).toBeTruthy();
    expect(screen.getByText('Looking for open tables…')).toBeTruthy();
    expect(screen.getByText('Ask the host to open a table in Kwilt.')).toBeTruthy();
    expect(screen.getByText('HAVE A CODE?')).toBeTruthy();
  });

  it('prefills the signed-in Games player name', async () => {
    const screen = render(<JoinTableDrawer visible onClose={jest.fn()} />);

    await waitFor(() => expect(screen.getByDisplayValue('Olive')).toBeTruthy());
  });

  it('explains the missing name instead of silently disabling a nearby table', async () => {
    mockProfile = null;
    const screen = render(<JoinTableDrawer visible onClose={jest.fn()} />);
    await act(async () => undefined);

    fireEvent.press(await screen.findByLabelText(`Join Bank table ${tableMarkForCode('W7K4JP')}`));

    expect(screen.getByText('Add your name to join this table.')).toBeTruthy();
    expect(mockClaim).not.toHaveBeenCalled();
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

    fireEvent.press(await screen.findByLabelText(`Join Bank table ${tableMarkForCode('W7K4JP')}`));

    await waitFor(() => expect(mockClaim).toHaveBeenCalledWith({ shortCode: 'W7K4JP', displayName: 'Olive' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(expect.objectContaining({ params: expect.objectContaining({ sessionId: 'room-1', tableCode: 'W7K4JP' }) })));
  });

  it('returns an existing nearby participant to an active table without claiming again', async () => {
    mockPreview.mockResolvedValue({
      gameKey: 'bank', hostDisplayName: 'Andrew', participantCount: 2, capacity: 6,
      inviteState: 'already_joined', canJoin: false, alreadyJoined: true,
      sessionId: 'room-active', tableCode: 'W7K4JP',
    });
    const screen = render(<JoinTableDrawer visible onClose={jest.fn()} />);
    await act(async () => undefined);

    fireEvent.press(await screen.findByLabelText(`Join Bank table ${tableMarkForCode('W7K4JP')}`));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(expect.objectContaining({
      params: expect.objectContaining({ sessionId: 'room-active', tableCode: 'W7K4JP' }),
    })));
    expect(mockClaim).not.toHaveBeenCalled();
  });

  it('uses the same name-first flow for a scanned table link', async () => {
    const screen = render(<JoinTableDrawer visible token="private-token" onClose={jest.fn()} />);
    expect(await screen.findByText("Join Andrew’s Bank table")).toBeTruthy();
    expect(screen.getByText('3 playing · 3 places open')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Your player name'), 'Grant');
    fireEvent.press(screen.getByText('Join table'));

    await waitFor(() => expect(mockClaim).toHaveBeenCalledWith({ token: 'private-token', displayName: 'Grant' }));
    expect(mockBrowse).not.toHaveBeenCalled();
  });

  it('returns an existing participant to the same table without claiming again', async () => {
    mockPreview.mockResolvedValue({
      gameKey: 'slanguage', hostDisplayName: 'Ruth', participantCount: 4, capacity: 8,
      inviteState: 'already_joined', canJoin: false, alreadyJoined: true,
      sessionId: 'room-2', tableCode: 'ABC123',
    });
    const screen = render(<JoinTableDrawer visible token="private-token" onClose={jest.fn()} />);

    fireEvent.press(await screen.findByText('Return to table'));

    expect(mockClaim).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith(expect.objectContaining({
      params: expect.objectContaining({ sessionId: 'room-2', tableCode: 'ABC123' }),
    }));
  });

  it.each([
    ['full', 'That Bank table is full.'],
    ['closed', 'That Bank table has closed.'],
    ['expired', 'That Bank invitation has expired.'],
  ])('explains a %s invitation before asking the person to join', async (inviteState, message) => {
    mockPreview.mockResolvedValue({
      gameKey: 'bank', hostDisplayName: 'Andrew', participantCount: 6, capacity: 6,
      inviteState, canJoin: false, alreadyJoined: false, sessionId: 'room-1', tableCode: 'W7K4JP',
    });
    const screen = render(<JoinTableDrawer visible token="private-token" onClose={jest.fn()} />);

    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.queryByText('Join table')).toBeNull();
  });

  it('gives an unavailable link a truthful recovery action', async () => {
    mockPreview.mockRejectedValue(new Error('not found'));
    const screen = render(<JoinTableDrawer visible token="bad-token" onClose={jest.fn()} />);

    expect(await screen.findByText('Invitation unavailable')).toBeTruthy();
    expect(screen.getByText('Ask the host for a fresh link or table code.')).toBeTruthy();
    expect(screen.getByText('That table invitation is unavailable.')).toBeTruthy();
  });
});
