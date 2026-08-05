import React from 'react';
import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('../../ui/BottomDrawer', () => ({
  BottomDrawer: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => {
    const { View: MockView } = require('react-native');
    return visible ? <MockView>{children}</MockView> : null;
  },
}));

jest.mock('../../services/invites', () => ({
  buildInviteOpenUrl: jest.fn(() => ({ primary: 'kwilt://invite?code=generic', alt: 'kwilt://invite?code=generic' })),
  createGoalInvite: jest.fn(),
  extractInviteCode: jest.fn((value: string) => value.includes('target') ? 'target' : 'generic'),
  listGoalShareRecipients: jest.fn(),
  sendGoalInviteEmail: jest.fn(),
}));

jest.mock('../../services/referrals', () => ({
  createReferralCode: jest.fn().mockResolvedValue(''),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(undefined),
}));

const mockCapture = jest.fn();
jest.mock('../../services/analytics/useAnalytics', () => ({
  useAnalytics: () => ({ capture: mockCapture }),
}));

jest.mock('../../utils/share', () => ({
  shareUrlWithPreview: jest.fn(),
}));

jest.mock('./goalInviteDestinationUrl', () => ({
  selectGoalInviteDestinationUrls: jest.fn(({ primaryOpenUrl }: { primaryOpenUrl: string }) => ({
    tapUrl: primaryOpenUrl,
  })),
}));

jest.mock('./goalInviteReferralUrl', () => ({
  appendGoalInviteReferralCode: jest.fn((url: string) => url),
}));

import { renderWithProviders } from '../../test/renderWithProviders';
import * as invites from '../../services/invites';
import { ShareGoalDrawer } from './ShareGoalDrawer';

const service = invites as jest.Mocked<typeof invites>;

describe('ShareGoalDrawer known recipients', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    service.listGoalShareRecipients.mockResolvedValue([
      {
        kind: 'household',
        relationshipId: 'membership-1',
        displayName: 'Blaire',
        avatarUrl: null,
      },
      {
        kind: 'friend',
        relationshipId: 'friendship-1',
        displayName: 'Ruth',
        avatarUrl: null,
      },
    ]);
    service.createGoalInvite.mockImplementation(async (input) => ({
      inviteCode: input.recipient ? 'target' : 'generic',
      inviteUrl: input.recipient ? 'kwilt://invite?code=target' : 'kwilt://invite?code=generic',
      inviteRedirectUrl: input.recipient ? 'https://go.kwilt.app/i/target' : 'https://go.kwilt.app/i/generic',
      inviteLandingUrl: null,
    }));
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows authenticated Household members and Friends above generic channels', async () => {
    const screen = renderWithProviders(
      <ShareGoalDrawer
        visible
        onClose={jest.fn()}
        goalId="goal-1"
        goalTitle="Walk together"
      />,
    );

    await waitFor(() => expect(screen.getByText('Blaire')).toBeTruthy());
    expect(screen.getByText('Household')).toBeTruthy();
    expect(screen.getByText('Ruth')).toBeTruthy();
    expect(screen.getByText('Friend')).toBeTruthy();
    expect(screen.getByText('Text message')).toBeTruthy();
  });

  it('does not create a generic invitation merely because the drawer opened', async () => {
    const screen = renderWithProviders(
      <ShareGoalDrawer
        visible
        onClose={jest.fn()}
        goalId="goal-1"
        goalTitle="Walk together"
      />,
    );

    await waitFor(() => expect(screen.getByText('Blaire')).toBeTruthy());
    expect(service.createGoalInvite).not.toHaveBeenCalled();
  });

  it('creates one generic invitation only after a generic channel is chosen', async () => {
    const screen = renderWithProviders(
      <ShareGoalDrawer
        visible
        onClose={jest.fn()}
        goalId="goal-1"
        goalTitle="Walk together"
      />,
    );

    await waitFor(() => expect(screen.getByText('Copy link')).toBeTruthy());
    fireEvent.press(screen.getByText('Copy link'));

    await waitFor(() => expect(service.createGoalInvite).toHaveBeenCalledTimes(1));
    expect(service.createGoalInvite).toHaveBeenCalledWith({
      goalId: 'goal-1',
      goalTitle: 'Walk together',
      kind: 'people',
    });
    await waitFor(() => expect(Clipboard.setStringAsync).toHaveBeenCalledWith('kwilt://invite?code=generic'));
  });

  it('previews the Goal-only boundary before creating and sharing a targeted invitation', async () => {
    const onInviteCreated = jest.fn();
    const screen = renderWithProviders(
      <ShareGoalDrawer
        visible
        onClose={jest.fn()}
        goalId="goal-1"
        goalTitle="Walk together"
        onInviteCreated={onInviteCreated}
      />,
    );

    await waitFor(() => expect(screen.getByText('Blaire')).toBeTruthy());
    fireEvent.press(screen.getByText('Blaire'));

    expect(screen.getByText('Invite Blaire?')).toBeTruthy();
    expect(screen.getByText(/invited to this Goal only/)).toBeTruthy();
    expect(service.createGoalInvite.mock.calls.filter(([input]) => input.recipient != null)).toHaveLength(0);

    fireEvent.press(screen.getByText('Invite Blaire'));

    await waitFor(() => expect(service.createGoalInvite).toHaveBeenCalledWith(expect.objectContaining({
      goalId: 'goal-1',
      goalTitle: 'Walk together',
      recipient: { kind: 'household', relationshipId: 'membership-1' },
    })));
    expect(Share.share).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Only Blaire can accept this invitation'),
    }));
    expect(onInviteCreated).toHaveBeenCalled();
  });
});
