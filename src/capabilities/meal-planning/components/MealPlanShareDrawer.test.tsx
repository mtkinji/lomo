import React from 'react';
import { Linking, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { MealPlanShareDrawer } from './MealPlanShareDrawer';
import { colors } from '../../../theme';

const mockOpenRound = jest.fn();
const mockCreateGuestFeedbackInvite = jest.fn();
const mockGetGuestFeedbackSummary = jest.fn();
const mockRevokeGuestFeedbackInvite = jest.fn();
const mockGetHouseholdSnapshot = jest.fn();
const mockBottomGuideProps: Array<Record<string, unknown>> = [];
const mockShowToast = jest.fn();

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../ui/BottomGuide', () => ({
  BottomGuide: ({ visible, children, ...props }: { visible: boolean; children: React.ReactNode }) => {
    const { View } = require('react-native');
    mockBottomGuideProps.push({ visible, ...props });
    return visible ? <View>{children}</View> : null;
  },
}));

jest.mock('../../../ui/BottomDrawer', () => ({
  BottomDrawerScrollView: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

jest.mock('../data/mealPlanningRepository', () => ({
  createMealPlanningRepository: () => ({
    openRound: (...args: unknown[]) => mockOpenRound(...args),
    createGuestFeedbackInvite: (...args: unknown[]) => mockCreateGuestFeedbackInvite(...args),
    getGuestFeedbackSummary: (...args: unknown[]) => mockGetGuestFeedbackSummary(...args),
    revokeGuestFeedbackInvite: (...args: unknown[]) => mockRevokeGuestFeedbackInvite(...args),
  }),
}));

jest.mock('../../../features/household/data/household', () => ({
  ...jest.requireActual('../../../features/household/data/household'),
  getHouseholdSnapshot: (...args: unknown[]) => mockGetHouseholdSnapshot(...args),
}));

jest.mock('../../../services/backend/supabaseClient', () => ({
  getSupabaseClient: () => ({ rpc: jest.fn() }),
}));

jest.mock('../../../store/useAppStore', () => ({
  useAppStore: Object.assign(
    (selector: (state: unknown) => unknown) => selector({
      authIdentity: { userId: 'user-1', name: 'Andrew' },
    }),
    {
      subscribe: jest.fn(() => () => undefined),
      getState: jest.fn(() => ({ authIdentity: { userId: 'user-1', name: 'Andrew' } })),
    },
  ),
}));

jest.mock('../../../store/useToastStore', () => ({
  useToastStore: Object.assign(
    (selector: (state: unknown) => unknown) => selector({ showToast: mockShowToast }),
    {
      subscribe: jest.fn(() => () => undefined),
      getState: jest.fn(() => ({ showToast: mockShowToast })),
    },
  ),
}));

const snapshot = {
  household: { id: 'household-1', name: 'Watanabe household' },
  currentMembershipId: 'owner-1',
  members: [
    { id: 'owner-1', personId: 'person-1', displayName: 'Andrew', kind: 'adult', role: 'owner' },
    { id: 'caregiver-1', personId: 'person-2', displayName: 'Blaire', kind: 'adult', role: 'caregiver' },
    { id: 'child-1', personId: 'person-3', displayName: 'Riley', kind: 'dependent', role: 'child' },
  ],
  activations: [{ childMembershipId: 'child-1', capabilityId: 'meal-planning', state: 'active' }],
  grants: [],
};

describe('MealPlanShareDrawer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBottomGuideProps.length = 0;
    mockGetHouseholdSnapshot.mockResolvedValue(snapshot);
    mockOpenRound.mockResolvedValue(undefined);
    mockCreateGuestFeedbackInvite.mockResolvedValue({
      inviteId: 'invite-1', token: 'guest-token', expiresAt: '2026-08-20T00:00:00.000Z',
    });
    mockGetGuestFeedbackSummary.mockResolvedValue({ candidates: [], invites: [] });
    mockRevokeGuestFeedbackInvite.mockResolvedValue({ inviteId: 'invite-1', state: 'revoked' });
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
  });

  afterEach(() => jest.restoreAllMocks());

  it('keeps Household people and external channels in one compact bottom guide', async () => {
    const screen = render(
      <MealPlanShareDrawer
        visible
        planId="plan-1"
        planVersion={3}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByRole('header', { name: 'Share Plan' })).toBeTruthy();
    expect(mockBottomGuideProps).toContainEqual(expect.objectContaining({
      visible: true,
      scrim: 'light',
      layout: 'floating',
      showDragHandle: false,
      dynamicSizing: true,
    }));
    await waitFor(() => expect(screen.getByText('Blaire')).toBeTruthy());
    expect(screen.getByText('Riley')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Messages' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Email' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'More options' })).toBeTruthy();
    expect(screen.getAllByTestId('plan-share-channel-sms-icon').some(
      (element) => element.props.stroke === colors.communicationText,
    )).toBe(true);
    expect(screen.getAllByTestId('plan-share-channel-email-icon').some(
      (element) => element.props.stroke === colors.communicationEmail,
    )).toBe(true);
    expect(screen.queryByText('Ask the family')).toBeNull();
  });

  it('hides the people section when nobody can be selected', async () => {
    mockGetHouseholdSnapshot.mockResolvedValueOnce({
      ...snapshot,
      members: [snapshot.members[0]],
      activations: [],
    });
    const screen = render(
      <MealPlanShareDrawer
        visible
        planId="plan-1"
        planVersion={3}
        onClose={jest.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'Messages' })).toBeEnabled());
    expect(screen.queryByText('People in your Household')).toBeNull();
    expect(screen.queryByText('No one in your Household is available yet.')).toBeNull();
    expect(screen.getByText('Share outside your Household')).toBeTruthy();
  });

  it('asks the selected Household people without leaving for another screen', async () => {
    const onClose = jest.fn();
    const onShared = jest.fn();
    const screen = render(
      <MealPlanShareDrawer
        visible
        planId="plan-1"
        planVersion={3}
        onClose={onClose}
        onShared={onShared}
      />,
    );

    fireEvent.press(await screen.findByRole('checkbox', { name: 'Include Blaire' }));
    fireEvent.press(screen.getByRole('button', { name: 'Ask 1 person' }));

    await waitFor(() => expect(mockOpenRound).toHaveBeenCalledWith({
      planId: 'plan-1',
      expectedVersion: 3,
      participantMembershipIds: ['caregiver-1'],
      closesAt: null,
    }));
    expect(onShared).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['Messages', 'sms:'],
    ['Email', 'mailto:'],
  ])('creates a guest feedback link only after choosing %s', async (channel, urlPrefix) => {
    const screen = render(
      <MealPlanShareDrawer
        visible
        planId="plan-1"
        planVersion={3}
        onClose={jest.fn()}
      />,
    );

    await screen.findByText('Blaire');
    expect(mockCreateGuestFeedbackInvite).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: channel }));

    await waitFor(() => expect(mockCreateGuestFeedbackInvite).toHaveBeenCalledWith({
      planId: 'plan-1', expectedVersion: 3, expiresAt: null,
    }));
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^${urlPrefix}`))));
    const composerUrl = (Linking.openURL as jest.Mock).mock.calls[0][0] as string;
    if (channel === 'Messages') {
      expect(decodeURIComponent(composerUrl)).toContain('Help with our meal plan.');
    } else {
      expect(decodeURIComponent(composerUrl)).toContain('Andrew would like your help with a meal plan.');
    }
    expect(decodeURIComponent(composerUrl)).toMatch(/https:\/\/go\.kwilt\.app\/meal-plan\/guest-token$/);
  });

  it('copies only the invitation link and keeps the guide open', async () => {
    const onClose = jest.fn();
    const screen = render(
      <MealPlanShareDrawer visible planId="plan-1" planVersion={3} onClose={onClose} />,
    );

    const copyLink = await screen.findByRole('button', { name: 'Copy link' });
    await waitFor(() => expect(copyLink).toBeEnabled());
    fireEvent.press(copyLink);

    await waitFor(() => expect(Clipboard.setStringAsync).toHaveBeenCalledWith(
      'https://go.kwilt.app/meal-plan/guest-token',
    ));
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ message: 'Link copied' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('opens the native share sheet with the invitation URL as the rich-preview item', async () => {
    const screen = render(
      <MealPlanShareDrawer visible planId="plan-1" planVersion={3} onClose={jest.fn()} />,
    );

    const moreOptions = await screen.findByRole('button', { name: 'More options' });
    await waitFor(() => expect(moreOptions).toBeEnabled());
    fireEvent.press(moreOptions);

    await waitFor(() => expect(Share.share).toHaveBeenCalledWith(
      { url: 'https://go.kwilt.app/meal-plan/guest-token' },
      { subject: 'Help with our meal plan' },
    ));
  });
});
