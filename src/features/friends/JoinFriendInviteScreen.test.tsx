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
  previewFriendInvite: jest.fn(),
}));

import { renderWithProviders } from '../../test/renderWithProviders';
import { ensureSignedInWithPrompt } from '../../services/backend/auth';
import { acceptFriendInvite, previewFriendInvite } from '../../services/friendships';
import { JoinFriendInviteScreen } from './JoinFriendInviteScreen';

const ensureAuth = ensureSignedInWithPrompt as jest.MockedFunction<typeof ensureSignedInWithPrompt>;
const acceptInvite = acceptFriendInvite as jest.MockedFunction<typeof acceptFriendInvite>;
const previewInvite = previewFriendInvite as jest.MockedFunction<typeof previewFriendInvite>;

describe('JoinFriendInviteScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ensureAuth.mockResolvedValue({ user: { id: 'user-1' } } as never);
    acceptInvite.mockResolvedValue({
      success: true,
      friendshipId: 'friendship-1',
      status: 'active',
    });
    previewInvite.mockResolvedValue({
      inviterName: 'Blaire',
      inviterAvatarUrl: null,
      inviteState: 'active',
      canAccept: true,
    });
  });

  it('requires an explicit decision after explaining zero access', async () => {
    const { getByText } = renderWithProviders(<JoinFriendInviteScreen />);

    await waitFor(() => expect(getByText('Connect with Blaire?')).toBeTruthy());
    expect(getByText('Becoming friends does not share anything by itself.')).toBeTruthy();
    expect(previewInvite).toHaveBeenCalledWith('abc123');
    expect(ensureAuth).not.toHaveBeenCalled();
    expect(acceptInvite).not.toHaveBeenCalled();

    fireEvent.press(getByText('Accept friend invite'));

    await waitFor(() => expect(ensureAuth).toHaveBeenCalledWith('friend'));
    expect(acceptInvite).toHaveBeenCalledWith('abc123');
    await waitFor(() => expect(getByText('You’re friends')).toBeTruthy());

    fireEvent.press(getByText('Open Sharing'));
    expect(mockNavigate).toHaveBeenCalledWith('SettingsSharing');
  });

  it('shows safe recovery copy for an unavailable invite', async () => {
    previewInvite.mockResolvedValue({
      inviterName: 'Blaire',
      inviterAvatarUrl: null,
      inviteState: 'expired',
      canAccept: false,
    });
    const { getByText } = renderWithProviders(<JoinFriendInviteScreen />);

    await waitFor(() => expect(getByText('This invite is unavailable')).toBeTruthy());
    expect(getByText('Ask the sender for a new link, or return to Sharing.')).toBeTruthy();
    expect(getByText('Open Sharing')).toBeTruthy();
    expect(acceptInvite).not.toHaveBeenCalled();
  });
});
