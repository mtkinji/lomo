import { fireEvent, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
    useRoute: () => ({ params: { inviteCode: 'abc123' } }),
  };
});

jest.mock('../../services/backend/auth', () => ({
  ensureSignedInWithPrompt: jest.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}));

jest.mock('../../services/friendships', () => ({
  acceptFriendInvite: jest.fn(),
}));

import { renderWithProviders } from '../../test/renderWithProviders';
import { ensureSignedInWithPrompt } from '../../services/backend/auth';
import { acceptFriendInvite } from '../../services/friendships';
import { JoinFriendInviteScreen } from './JoinFriendInviteScreen';

const ensureAuth = ensureSignedInWithPrompt as jest.MockedFunction<typeof ensureSignedInWithPrompt>;
const acceptInvite = acceptFriendInvite as jest.MockedFunction<typeof acceptFriendInvite>;

describe('JoinFriendInviteScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ensureAuth.mockResolvedValue({ user: { id: 'user-1' } } as never);
    acceptInvite.mockResolvedValue({
      success: true,
      friendshipId: 'friendship-1',
      status: 'active',
    });
  });

  it('requires an explicit decision after explaining zero access', async () => {
    const { getByText } = renderWithProviders(<JoinFriendInviteScreen />);

    expect(getByText('Becoming friends does not share anything by itself.')).toBeTruthy();
    expect(acceptInvite).not.toHaveBeenCalled();

    fireEvent.press(getByText('Accept friend invite'));

    await waitFor(() => expect(ensureAuth).toHaveBeenCalledWith('friend'));
    expect(acceptInvite).toHaveBeenCalledWith('abc123');
    await waitFor(() => expect(getByText('You’re friends')).toBeTruthy());

    fireEvent.press(getByText('Open Sharing'));
    expect(mockNavigate).toHaveBeenCalledWith('SettingsSharing');
  });

  it('shows safe recovery copy for an unavailable invite', async () => {
    acceptInvite.mockResolvedValue({ success: false, error: 'This invite has expired' });
    const { getByText } = renderWithProviders(<JoinFriendInviteScreen />);

    fireEvent.press(getByText('Accept friend invite'));

    await waitFor(() => expect(getByText('This invite is unavailable')).toBeTruthy());
    expect(getByText('Ask the sender for a new link, or return to Sharing.')).toBeTruthy();
    expect(getByText('Open Sharing')).toBeTruthy();
  });
});
