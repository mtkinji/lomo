import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { OpenBankTableLobby } from '../OpenBankTableLobby';
import { advertiseNearbyTable } from '@/src/capabilities/games/nearby/nearbyTables';
import { createRemoteBankTableInvite, removeRemoteBankTableParticipant, startRemoteBankTable } from '@/src/capabilities/games/remote/remoteBankClient';
import { tableMarkForCode } from '@/src/capabilities/games/remote/remoteBank';

jest.mock('@/src/capabilities/games/navigation/gamesRouter', () => ({ router: { replace: jest.fn() } }));
jest.mock('@/src/capabilities/games/nearby/nearbyTables', () => ({
  advertiseNearbyTable: jest.fn(),
  stopAdvertisingNearbyTable: jest.fn(),
}));
jest.mock('@/src/capabilities/games/remote/remoteBankClient', () => ({
  createRemoteBankTableInvite: jest.fn(),
  startRemoteBankTable: jest.fn(),
  removeRemoteBankTableParticipant: jest.fn(),
}));
jest.mock('react-native-qrcode-svg', () => () => null);

const mockCreateInvite = createRemoteBankTableInvite as jest.Mock;
const mockStart = startRemoteBankTable as jest.Mock;
const mockRemove = removeRemoteBankTableParticipant as jest.Mock;
const mockAdvertise = advertiseNearbyTable as jest.Mock;

const room = {
  id: 'room-1',
  hostUserId: 'host-user',
  status: 'lobby' as const,
  stateVersion: 1,
  expiresAt: '2099-01-01',
  state: {
    players: [
      { id: 1, name: 'Andrew', score: 0, banked: false },
      { id: 2, name: 'Olive', score: 0, banked: false },
    ],
    capacity: 6,
    bankingRule: 'anyone' as const,
    pot: 0,
    round: 1,
    maxRounds: 10,
    rollInRound: 0,
    activePlayer: 0,
    status: 'playing' as const,
    lastRoll: [3, 5] as [number, number],
    message: 'Waiting for the table',
  },
  participants: [
    { id: 'host-seat', seatIndex: 0, displayName: 'Andrew', userId: 'host-user', controllerUserId: 'host-user', role: 'host' as const, joinStatus: 'local' as const },
    { id: 'olive-seat', seatIndex: 1, displayName: 'Olive', userId: 'olive-user', controllerUserId: 'olive-user', role: 'player' as const, joinStatus: 'joined' as const },
  ],
};

describe('OpenBankTableLobby', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateInvite.mockResolvedValue({ token: 'private-token', code: 'W7K4JP', expiresAt: '2099-01-01' });
    mockAdvertise.mockResolvedValue(true);
    mockStart.mockResolvedValue(undefined);
    mockRemove.mockResolvedValue(undefined);
  });

  it('opens one reusable table and shows everyone in one lobby', async () => {
    const reload = jest.fn().mockResolvedValue(undefined);
    const screen = render(<OpenBankTableLobby room={room} userId="host-user" reload={reload} />);

    expect(await screen.findByText('W7K-4JP')).toBeTruthy();
    expect(screen.getByText('Andrew')).toBeTruthy();
    expect(screen.getByText('Olive')).toBeTruthy();
    expect(mockCreateInvite).toHaveBeenCalledTimes(1);
    expect(mockAdvertise).toHaveBeenCalledWith('W7K4JP');
    expect(screen.getByText('Open nearby')).toBeTruthy();
    expect(screen.getByText('People in Kwilt can find this table while this screen is open.')).toBeTruthy();
    expect(screen.getByText(tableMarkForCode('W7K4JP'))).toBeTruthy();

    fireEvent.press(screen.getByText('Start game'));
    await waitFor(() => expect(mockStart).toHaveBeenCalledWith('room-1'));
  });
});
