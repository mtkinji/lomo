import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { MealChoiceInviteScreen } from './MealChoiceInviteScreen';

const mockList = jest.fn();
const mockOpenRound = jest.fn();
const mockGetHouseholdSnapshot = jest.fn();
const mockCreateHouseholdMemberInvite = jest.fn();

jest.mock('../data/mealPlanningRepository', () => ({
  createMealPlanningRepository: () => ({
    list: (...args: unknown[]) => mockList(...args),
    openRound: (...args: unknown[]) => mockOpenRound(...args),
  }),
}));

jest.mock('../../../features/household/data/household', () => ({
  ...jest.requireActual('../../../features/household/data/household'),
  getHouseholdSnapshot: (...args: unknown[]) => mockGetHouseholdSnapshot(...args),
  createHouseholdMemberInvite: (...args: unknown[]) => mockCreateHouseholdMemberInvite(...args),
}));

jest.mock('../../../services/backend/supabaseClient', () => ({
  getSupabaseClient: () => ({ rpc: jest.fn() }),
}));

jest.mock('../../../services/analytics/useAnalytics', () => ({
  useAnalytics: () => ({ capture: jest.fn() }),
}));

jest.mock('../../../store/useAppStore', () => ({
  useAppStore: (selector: (state: unknown) => unknown) => selector({
    authIdentity: { userId: 'user-1', name: 'Andrew' },
  }),
}));

jest.mock('../../../ui/layout/AppShell', () => {
  const { View } = require('react-native');
  return { AppShell: ({ children }: { children: React.ReactNode }) => <View>{children}</View> };
});

jest.mock('../../../ui/layout/PageHeader', () => {
  const { Text } = require('react-native');
  return { PageHeader: ({ title }: { title: string }) => <Text>{title}</Text> };
});

describe('MealChoiceInviteScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockList.mockResolvedValue([{ id: 'plan-1', householdId: 'household-1', version: 3 }]);
    mockGetHouseholdSnapshot.mockResolvedValue({
      household: { id: 'household-1', name: 'Watanabe household' },
      currentMembershipId: 'owner-1',
      members: [{ id: 'owner-1', personId: 'person-1', displayName: 'Andrew', kind: 'adult', role: 'owner' }],
      activations: [],
      grants: [],
    });
    mockCreateHouseholdMemberInvite.mockResolvedValue({
      code: 'CARE12',
      expiresAt: '2026-08-20T00:00:00.000Z',
      role: 'caregiver',
    });
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  it('does not show an impossible family-choice action when nobody can be selected', async () => {
    const screen = render(
      <MealChoiceInviteScreen
        navigation={{ goBack: jest.fn(), replace: jest.fn() } as never}
        route={{ key: 'invite', name: 'MealChoiceInvite', params: { planId: 'plan-1' } }}
      />,
    );

    await screen.findByText('No activated household members are available yet.');

    expect(screen.queryByRole('button', { name: 'Open family choices' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Invite an adult by text' })).toBeEnabled();
  });

  it('creates a caregiver invitation and opens a truthful text message', async () => {
    const screen = render(
      <MealChoiceInviteScreen
        navigation={{ goBack: jest.fn(), replace: jest.fn() } as never}
        route={{ key: 'invite', name: 'MealChoiceInvite', params: { planId: 'plan-1' } }}
      />,
    );

    await waitFor(() => expect(
      screen.getByRole('button', { name: 'Invite an adult by text' }),
    ).toBeEnabled());
    fireEvent.press(screen.getByRole('button', { name: 'Invite an adult by text' }));

    await waitFor(() => expect(mockCreateHouseholdMemberInvite).toHaveBeenCalledWith(
      expect.anything(),
      {
        householdId: 'household-1',
        role: 'caregiver',
        ownerDisplayName: 'Andrew',
      },
    ));
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledTimes(1));
    const smsUrl = (Linking.openURL as jest.Mock).mock.calls[0][0] as string;
    expect(decodeURIComponent(smsUrl)).toContain('You’ll review what joining shares before you accept');
    expect(decodeURIComponent(smsUrl)).toMatch(/https:\/\/go\.kwilt\.app\/open\/household\/CARE12$/);
  });

  it('does not open family choices for an unattached personal Plan', async () => {
    mockList.mockResolvedValue([{ id: 'plan-1', householdId: null, version: 3 }]);
    const replace = jest.fn();
    const screen = render(
      <MealChoiceInviteScreen
        navigation={{ goBack: jest.fn(), replace } as never}
        route={{ key: 'invite', name: 'MealChoiceInvite', params: { planId: 'plan-1' } }}
      />,
    );

    await screen.findByText('Share this plan with a Household first.');
    expect(screen.queryByRole('button', { name: 'Open family choices' })).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Back to meal plan' }));

    expect(replace).toHaveBeenCalledWith('NextMeals');
    expect(mockOpenRound).not.toHaveBeenCalled();
  });
});
