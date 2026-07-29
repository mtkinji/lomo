import { Alert, Share } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('../../services/friendships', () => ({
  listFriends: jest.fn(),
  getPendingFriendRequests: jest.fn(),
  createFriendInvite: jest.fn(),
  buildFriendInviteUrl: jest.fn((code: string) => `https://kwilt.app/friend/${code}`),
  acceptFriendRequest: jest.fn(),
  declineFriendRequest: jest.fn(),
  endFriendship: jest.fn(),
  blockFriendship: jest.fn(),
}));

import { renderWithProviders } from '../../test/renderWithProviders';
import * as friendships from '../../services/friendships';
import { FriendshipSettingsSection } from './FriendshipSettingsSection';

const service = friendships as jest.Mocked<typeof friendships>;

describe('FriendshipSettingsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    service.listFriends.mockResolvedValue([]);
    service.getPendingFriendRequests.mockResolvedValue([]);
    service.acceptFriendRequest.mockResolvedValue(true);
    service.declineFriendRequest.mockResolvedValue(true);
    service.endFriendship.mockResolvedValue(true);
    service.blockFriendship.mockResolvedValue(true);
    service.createFriendInvite.mockResolvedValue({
      id: 'invite-1',
      code: 'abc123',
      createdAt: '2026-07-28T10:00:00.000Z',
      expiresAt: '2026-08-04T10:00:00.000Z',
      uses: 0,
      maxUses: 1,
    });
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('leads with the zero-access boundary and a calm empty state', async () => {
    const { getAllByText, getByText } = renderWithProviders(<FriendshipSettingsSection />);

    expect(getByText('Becoming friends does not share anything by itself.')).toBeTruthy();
    await waitFor(() => expect(getByText('No friends yet')).toBeTruthy());
    expect(getAllByText('Friends make someone easier to choose when you decide to share.')).toHaveLength(2);
  });

  it('creates a one-use invite with precise zero-access copy', async () => {
    const { getByText } = renderWithProviders(<FriendshipSettingsSection />);
    await waitFor(() => expect(getByText('Invite a friend')).toBeTruthy());

    fireEvent.press(getByText('Invite a friend'));

    await waitFor(() => expect(service.createFriendInvite).toHaveBeenCalledWith({
      expiresInDays: 7,
      maxUses: 1,
    }));
    expect(Share.share).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Becoming friends does not share anything by itself.'),
    }));
  });

  it('keeps incoming Accept and Decline decisions distinct', async () => {
    service.getPendingFriendRequests.mockResolvedValue([
      {
        friendshipId: 'friendship-1',
        fromUserId: 'user-2',
        fromUserName: 'Blaire',
        fromUserAvatarUrl: null,
        createdAt: '2026-07-28T10:00:00.000Z',
      },
    ]);

    const first = renderWithProviders(<FriendshipSettingsSection />);
    const { getByText } = first;
    await waitFor(() => expect(getByText('Blaire')).toBeTruthy());

    fireEvent.press(getByText('Accept'));
    await waitFor(() => expect(service.acceptFriendRequest).toHaveBeenCalledWith('friendship-1'));

    first.unmount();
    const second = renderWithProviders(<FriendshipSettingsSection />);
    await waitFor(() => expect(second.getByText('Decline')).toBeTruthy());
    fireEvent.press(second.getByText('Decline'));
    await waitFor(() => expect(service.declineFriendRequest).toHaveBeenCalledWith('friendship-1'));
  });

  it('offers normal end and safety block as separate relationship actions', async () => {
    service.listFriends.mockResolvedValue([
      {
        id: 'friendship-1',
        friendUserId: 'user-2',
        status: 'active',
        initiatedByMe: true,
        createdAt: '2026-07-28T10:00:00.000Z',
        acceptedAt: '2026-07-28T10:05:00.000Z',
        name: 'Blaire',
        avatarUrl: null,
      },
    ]);
    const alert = jest.spyOn(Alert, 'alert');

    const { getByLabelText } = renderWithProviders(<FriendshipSettingsSection />);
    await waitFor(() => expect(getByLabelText('Manage friendship with Blaire')).toBeTruthy());
    fireEvent.press(getByLabelText('Manage friendship with Blaire'));

    const options = alert.mock.calls[0]?.[2] ?? [];
    expect(options.map((option) => option.text)).toEqual([
      'Cancel',
      'End friendship',
      'Block',
    ]);

    await act(async () => {
      options.find((option) => option.text === 'End friendship')?.onPress?.();
    });
    await waitFor(() => expect(service.endFriendship).toHaveBeenCalledWith('friendship-1'));

    fireEvent.press(getByLabelText('Manage friendship with Blaire'));
    const nextOptions = alert.mock.calls[1]?.[2] ?? [];
    await act(async () => {
      nextOptions.find((option) => option.text === 'Block')?.onPress?.();
    });
    await waitFor(() => expect(service.blockFriendship).toHaveBeenCalledWith('friendship-1'));
  });
});
