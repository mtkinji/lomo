import { render } from '@testing-library/react-native';
import { OpenSlanguageTableLobby } from '../OpenSlanguageTableLobby';
import { advertiseNearbyTable } from '@/src/capabilities/games/nearby/nearbyTables';
import { createOpenGameTableInvite } from '@/src/capabilities/games/remote/remoteSlanguageClient';

jest.mock('@/src/capabilities/games/navigation/gamesRouter', () => ({ router: { replace: jest.fn() } }));
jest.mock('@/src/capabilities/games/nearby/nearbyTables', () => ({
  advertiseNearbyTable: jest.fn(),
  stopAdvertisingNearbyTable: jest.fn(),
}));
jest.mock('@/src/capabilities/games/remote/remoteBankClient', () => ({ removeRemoteBankTableParticipant: jest.fn() }));
jest.mock('@/src/capabilities/games/remote/remoteSlanguageClient', () => ({ createOpenGameTableInvite: jest.fn() }));
jest.mock('react-native-qrcode-svg', () => () => null);

const mockCreateInvite = createOpenGameTableInvite as jest.Mock;
const mockAdvertise = advertiseNearbyTable as jest.Mock;

const room = {
  id: 'room-1',
  hostUserId: 'host-user',
  status: 'lobby' as const,
  stateVersion: 1,
  currentParticipantId: 'host-seat',
  prompt: null,
  hand: [],
  ownPlacements: null,
  submittedCount: 0,
  hasVoted: false,
  revealedSubmissions: [],
  state: { capacity: 8, phase: 'lobby' as const, status: 'lobby' as const },
  participants: [
    { id: 'host-seat', seatIndex: 0, displayName: 'Andrew', userId: 'host-user', controllerUserId: 'host-user', role: 'host' as const, joinStatus: 'local' as const },
  ],
};

describe('OpenSlanguageTableLobby', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateInvite.mockResolvedValue({ token: 'private-token', code: 'ABC123', expiresAt: '2099-01-01' });
    mockAdvertise.mockResolvedValue(true);
  });

  it('tells the host that the table is discoverable only while the lobby is open', async () => {
    const screen = render(<OpenSlanguageTableLobby
      room={room as never}
      userId="host-user"
      sending={false}
      error={null}
      reload={jest.fn()}
      start={jest.fn()}
    />);

    expect(await screen.findByText('Open nearby')).toBeTruthy();
    expect(screen.getByText('People in Kwilt can find this table while this screen is open.')).toBeTruthy();
    expect(mockAdvertise).toHaveBeenCalledWith('ABC123', 'slanguage');
  });
});
