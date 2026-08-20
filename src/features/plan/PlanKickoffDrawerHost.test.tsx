import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { resetAllStores } from '../../test/storeFixtures';
import { useAppStore } from '../../store/useAppStore';
import { useFirstTimeUxStore } from '../../store/useFirstTimeUxStore';
import { PlanKickoffDrawerHost } from './PlanKickoffDrawerHost';

const mockNavigate = jest.fn();

jest.mock('../../navigation/rootNavigationRef', () => ({
  rootNavigationRef: {
    isReady: () => true,
    navigate: (...args: unknown[]) => mockNavigate(...args),
  },
}));

jest.mock('../../ui/BottomGuide', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BottomGuide: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
      visible ? React.createElement(View, { testID: 'plan-kickoff-guide' }, children) : null,
  };
});

describe('PlanKickoffDrawerHost', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 7, 20, 10, 12));
    mockNavigate.mockReset();
    resetAllStores();
    useFirstTimeUxStore.setState({ isFlowActive: false });
    useAppStore.getState().setHasCompletedFirstTimeOnboarding(true);
    useAppStore.getState().setNotificationPreferences((current) => ({
      ...current,
      allowPlanKickoff: true,
      planKickoffCadence: 'daily',
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps prompt administration quiet and routes it to Notifications settings', async () => {
    const { getByRole, queryByText } = renderWithProviders(<PlanKickoffDrawerHost />);

    const managePrompts = await waitFor(() => getByRole('button', { name: 'Manage prompts' }));

    expect(queryByText('Turn off prompts')).toBeNull();
    fireEvent.press(managePrompts);

    expect(mockNavigate).toHaveBeenCalledWith('Settings', {
      screen: 'SettingsNotifications',
    });
    expect(useAppStore.getState().lastKickoffShownDateKey).toBe('2026-08-20');
  });
});
