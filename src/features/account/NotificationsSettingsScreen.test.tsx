import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { resetAllStores } from '../../test/storeFixtures';
import { useAppStore } from '../../store/useAppStore';
import { NotificationService } from '../../services/NotificationService';
import { NotificationsSettingsScreen } from './NotificationsSettingsScreen';

jest.mock('../../ui/layout/AppShell', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    AppShell: ({ children }: any) =>
      React.createElement(View, { testID: 'app-shell' }, children),
  };
});

jest.mock('../../ui/BottomDrawer', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BottomDrawer: ({ visible, children }: any) =>
      visible
        ? React.createElement(View, { testID: 'bottom-drawer' }, children)
        : null,
  };
});

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
    useFocusEffect: (effect: any) => {
      effect();
    },
  };
});

jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ onChange }: any) =>
      React.createElement(
        Pressable,
        {
          accessibilityRole: 'button',
          accessibilityLabel: 'Mock time picker',
          onPress: () => onChange({ type: 'set' }, new Date(2026, 0, 1, 14, 0, 0, 0)),
        },
        React.createElement(Text, null, 'Mock time picker'),
      ),
  };
});

jest.mock('../../services/LocationPermissionService', () => ({
  LocationPermissionService: {
    syncOsPermissionStatus: jest.fn().mockResolvedValue('notRequested'),
    ensurePermissionWithRationale: jest.fn().mockResolvedValue(false),
  },
}));

describe('NotificationsSettingsScreen', () => {
  beforeEach(() => {
    resetAllStores();
    jest.spyOn(NotificationService, 'syncOsPermissionStatus').mockResolvedValue('authorized');
    jest.spyOn(NotificationService, 'applySettings').mockImplementation(async (next: any) => {
      useAppStore.getState().setNotificationPreferences(next);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    {
      label: 'daily show-up',
      openLabel: 'Change daily reminder time',
      saveLabel: 'Save daily show-up time',
      expected: {
        allowDailyShowUp: true,
        dailyShowUpTime: '14:00',
        notificationsEnabled: true,
      },
    },
    {
      label: 'daily focus',
      openLabel: 'Change daily focus reminder time',
      saveLabel: 'Save daily focus time',
      expected: {
        allowDailyFocus: true,
        dailyFocusTime: '14:00',
        dailyFocusTimeMode: 'manual',
        notificationsEnabled: true,
      },
    },
    {
      label: 'goal nudges',
      openLabel: 'Change goal nudge time',
      saveLabel: 'Save goal nudges time',
      expected: {
        allowGoalNudges: true,
        goalNudgeTime: '14:00',
        notificationsEnabled: true,
      },
    },
  ])('auto-saves $label time changes and keeps Done available to close the picker', async ({ openLabel, saveLabel, expected }) => {
    useAppStore.getState().setNotificationPreferences({
      notificationsEnabled: true,
      osPermissionStatus: 'authorized',
      allowActivityReminders: true,
      allowDailyShowUp: true,
      dailyShowUpTime: '08:00',
      allowPlanKickoff: true,
      planKickoffCadence: 'daily',
      planKickoffWeeklyDay: 1,
      allowDailyFocus: true,
      dailyFocusTime: '20:30',
      dailyFocusTimeMode: 'auto',
      allowGoalNudges: true,
      goalNudgeTime: '16:00',
      allowStreakAndReactivation: true,
    });

    const { getByLabelText, queryByTestId } = renderWithProviders(<NotificationsSettingsScreen />);

    fireEvent.press(getByLabelText(openLabel));
    fireEvent.press(getByLabelText('Mock time picker'));

    await waitFor(() => {
      expect(NotificationService.applySettings).toHaveBeenCalledWith(
        expect.objectContaining(expected),
      );
    });

    expect(queryByTestId('bottom-drawer')).toBeTruthy();
    fireEvent.press(getByLabelText(saveLabel));
    await waitFor(() => {
      expect(queryByTestId('bottom-drawer')).toBeNull();
    });
  });
});
