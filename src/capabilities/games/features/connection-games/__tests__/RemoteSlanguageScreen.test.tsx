import { fireEvent, render } from '@testing-library/react-native';
import { SLANGUAGE_PROMPTS, dealSlanguageHand } from '@/src/capabilities/games/domain/slanguage';
import { RemoteSlanguageScreen } from '../RemoteSlanguageScreen';
import { useRemoteSlanguageRoom } from '@/src/capabilities/games/remote/useRemoteSlanguageRoom';

const mockCommand = jest.fn();
jest.mock('@/src/capabilities/games/navigation/gamesRouter', () => ({
  router: { replace: jest.fn() },
  useLocalSearchParams: () => ({ sessionId: 'room-1', hostUserId: 'user-1' }),
}));
jest.mock('@/src/capabilities/games/shell/AuthProvider', () => ({ useAuth: () => ({ session: { user: { id: 'user-1' } } }) }));
jest.mock('@/src/capabilities/games/remote/useRemoteSlanguageRoom', () => ({ useRemoteSlanguageRoom: jest.fn() }));
jest.mock('@/src/capabilities/games/remote/remoteBankClient', () => ({ removeRemoteBankTableParticipant: jest.fn() }));
jest.mock('@/src/capabilities/games/remote/remoteSlanguageClient', () => ({ createOpenGameTableInvite: jest.fn() }));
jest.mock('@/src/capabilities/games/nearby/nearbyTables', () => ({ advertiseNearbyTable: jest.fn(), stopAdvertisingNearbyTable: jest.fn() }));

const mockUseRoom = useRemoteSlanguageRoom as jest.Mock;
const prompt = SLANGUAGE_PROMPTS[0];
const participants = [
  { id: 'p1', seatIndex: 0, displayName: 'Andrew', userId: 'user-1', controllerUserId: 'user-1', role: 'host', joinStatus: 'local' },
  { id: 'p2', seatIndex: 1, displayName: 'Olive', userId: 'user-2', controllerUserId: 'user-2', role: 'player', joinStatus: 'joined' },
  { id: 'p3', seatIndex: 2, displayName: 'Grandma', userId: 'user-3', controllerUserId: 'user-3', role: 'player', joinStatus: 'joined' },
];

function room(phase: 'build' | 'reveal' | 'vote' | 'result' | 'finished') {
  return {
    id: 'room-1', hostUserId: 'user-1', status: 'active', stateVersion: 3, participants, currentParticipantId: 'p1',
    prompt, hand: dealSlanguageHand(prompt, 0), ownPlacements: null, submittedCount: 0, hasVoted: false,
    revealedSubmissions: [
      { participantId: 'p1', text: 'My translation', slangScore: 5 },
      { participantId: 'p2', text: 'Olive was hilariously groovy.', slangScore: 7 },
      { participantId: 'p3', text: 'Grandma had to bounce, no cap.', slangScore: 6 },
    ],
    state: {
      phase, status: phase === 'finished' ? 'finished' : 'playing', capacity: 8, roundIndex: 0, totalRounds: 5, promptId: prompt.id,
      deadline: new Date(Date.now() + 60_000).toISOString(), revealOrder: ['p1', 'p2', 'p3'], revealIndex: 0,
      revealStartedAt: new Date(Date.now() - 4_000).toISOString(), crowns: {}, crownScores: {}, roundWinnerIds: ['p2'], winnerIds: ['p2'],
    },
  };
}

describe('RemoteSlanguageScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRoom.mockReturnValue({ room: room('build'), loading: false, sending: false, error: null, reload: jest.fn(), command: mockCommand });
  });

  test('makes the sentence a guided Mad Lib and advances after the first swap', () => {
    const screen = render(<RemoteSlanguageScreen />);
    expect(screen.getByText('CHOOSE A SWAP FOR')).toBeTruthy();
    expect(screen.getByText('“was excited”')).toBeTruthy();
    expect(screen.getByLabelText(`Swap was excited. Current words: was excited`)).toBeTruthy();
    expect(screen.queryByLabelText(/text input/i)).toBeNull();
    fireEvent.press(screen.getByText('was hyped'));
    expect(screen.getByLabelText(/Sentence: I was hyped about the party/)).toBeTruthy();
    expect(screen.getByText('“the party”')).toBeTruthy();
    expect(screen.queryByLabelText(/points/i)).toBeNull();
    fireEvent.press(screen.getByLabelText('Swap was excited. Current words: was hyped'));
    expect(screen.getByText('“was excited”')).toBeTruthy();
    fireEvent.press(screen.getByText('Add some sauce'));
    expect(screen.getByText('OPTIONAL · ADD SOME SAUCE')).toBeTruthy();
    expect(screen.getByText('Start with…')).toBeTruthy();
    expect(screen.getByText('No cap,')).toBeTruthy();
    fireEvent.press(screen.getByText('Back to phrase swaps'));
    expect(screen.getByText('“the party”')).toBeTruthy();
    fireEvent.press(screen.getByText('Submit my sentence'));
    expect(mockCommand).toHaveBeenCalledWith({ type: 'submit_translation', placements: { energy: 'energy-hyped' } });
  });

  test('reveals one translation and advances after the hold', () => {
    mockUseRoom.mockReturnValue({ room: room('reveal'), loading: false, sending: false, error: null, reload: jest.fn(), command: mockCommand });
    const screen = render(<RemoteSlanguageScreen />);
    expect(screen.getByText('My translation')).toBeTruthy();
    fireEvent.press(screen.getByText('Next translation'));
    expect(mockCommand).toHaveBeenCalledWith({ type: 'advance_reveal' });
  });

  test('excludes the current player from the private ballot', () => {
    mockUseRoom.mockReturnValue({ room: room('vote'), loading: false, sending: false, error: null, reload: jest.fn(), command: mockCommand });
    const screen = render(<RemoteSlanguageScreen />);
    expect(screen.queryByText('My translation')).toBeNull();
    fireEvent.press(screen.getByText('Olive was hilariously groovy.'));
    expect(mockCommand).toHaveBeenCalledWith({ type: 'submit_vote', submissionParticipantId: 'p2' });
  });

  test('explains a defensive empty ballot instead of showing a blank voting screen', () => {
    const singleSubmissionRoom = room('vote');
    singleSubmissionRoom.revealedSubmissions = [singleSubmissionRoom.revealedSubmissions[0]];
    singleSubmissionRoom.state.revealOrder = ['p1'];
    mockUseRoom.mockReturnValue({ room: singleSubmissionRoom, loading: false, sending: false, error: null, reload: jest.fn(), command: mockCommand });

    const screen = render(<RemoteSlanguageScreen />);
    expect(screen.getByText('No vote needed.')).toBeTruthy();
    expect(screen.getByText('Only one translation made it in. No Crown this round.')).toBeTruthy();
    expect(screen.queryByText('Crown one translation.')).toBeNull();
  });

  test('explains why a result has no Crown when only one translation made it in', () => {
    const singleSubmissionRoom = room('result');
    singleSubmissionRoom.revealedSubmissions = [singleSubmissionRoom.revealedSubmissions[0]];
    singleSubmissionRoom.state.revealOrder = ['p1'];
    singleSubmissionRoom.state.roundWinnerIds = [];
    mockUseRoom.mockReturnValue({ room: singleSubmissionRoom, loading: false, sending: false, error: null, reload: jest.fn(), command: mockCommand });

    const screen = render(<RemoteSlanguageScreen />);
    expect(screen.getByText('No Crown this round.')).toBeTruthy();
    expect(screen.getByText('Only one translation made it in.')).toBeTruthy();
  });

  test('shows the Crown winner and moves to the next sentence', () => {
    mockUseRoom.mockReturnValue({ room: room('result'), loading: false, sending: false, error: null, reload: jest.fn(), command: mockCommand });
    const screen = render(<RemoteSlanguageScreen />);
    expect(screen.getByText('Olive wins the Crown.')).toBeTruthy();
    fireEvent.press(screen.getByText('Next sentence'));
    expect(mockCommand).toHaveBeenCalledWith({ type: 'next_round' });
  });
});
