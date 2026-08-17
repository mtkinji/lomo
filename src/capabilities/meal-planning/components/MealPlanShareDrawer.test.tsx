import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { MealPlanShareDrawer } from './MealPlanShareDrawer';
import { colors } from '../../../theme';

const mockOpenRound = jest.fn();
const mockGetHouseholdSnapshot = jest.fn();
const mockBottomGuideProps: Array<Record<string, unknown>> = [];

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
  }),
}));

jest.mock('../../../features/household/data/household', () => ({
  ...jest.requireActual('../../../features/household/data/household'),
  getHouseholdSnapshot: (...args: unknown[]) => mockGetHouseholdSnapshot(...args),
}));

jest.mock('../../../services/backend/supabaseClient', () => ({
  getSupabaseClient: () => ({ rpc: jest.fn() }),
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
  });

  afterEach(() => jest.restoreAllMocks());

  it('opens as a household-only request and selects every eligible person by default', async () => {
    const screen = render(
      <MealPlanShareDrawer
        visible
        planId="plan-1"
        planVersion={3}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByRole('header', { name: 'Ask household' })).toBeTruthy();
    expect(mockBottomGuideProps).toContainEqual(expect.objectContaining({
      visible: true,
      scrim: 'light',
      layout: 'floating',
      showDragHandle: false,
      snapPoints: ['46%'],
    }));
    await waitFor(() => expect(screen.getByText('Blaire')).toBeTruthy());
    expect(screen.getByText('Riley')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Exclude Blaire' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Exclude Riley' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Ask 2 people' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Messages' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Email' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'More options' })).toBeNull();
  });

  it('explains when nobody can receive a household request', async () => {
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

    expect(await screen.findByText('No one else in your Household can respond in Kwilt yet.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Ask \d/ })).toBeNull();
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

    const riley = await screen.findByRole('checkbox', { name: 'Exclude Riley' });
    fireEvent.press(riley);
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
});
