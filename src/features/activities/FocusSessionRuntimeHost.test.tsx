import { act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { renderWithProviders } from '../../test/renderWithProviders';
import { useAppStore } from '../../store/useAppStore';
import { FocusSessionRuntimeHost } from './FocusSessionRuntimeHost';
import { useFocusSessionStore } from './focusSessionStore';

jest.mock('../../services/HapticsService', () => ({
  HapticsService: { trigger: jest.fn(async () => undefined) },
}));

jest.mock('../../services/appleEcosystem/glanceableState', () => ({
  setGlanceableFocusSession: jest.fn(async () => undefined),
}));

jest.mock('../../services/appleEcosystem/liveActivity', () => ({
  endLiveActivity: jest.fn(async () => undefined),
  syncLiveActivity: jest.fn(async () => undefined),
}));

jest.mock('../../services/checkinNudgeDrafts', () => ({
  queueCheckinDraftFromProgress: jest.fn(async () => undefined),
}));

jest.mock('../../services/screenTimeProtectionRuntime', () => ({
  reconcileScreenTimeRestrictions: jest.fn(async () => []),
}));

jest.mock('../../services/soundscape', () => ({
  startSoundscapeLoop: jest.fn(async () => undefined),
  stopSoundscapeLoop: jest.fn(async () => undefined),
}));

jest.mock('../../store/useCelebrationStore', () => ({
  recordShowUpWithCelebration: jest.fn(),
}));

const scheduleNotificationAsync = Notifications.scheduleNotificationAsync as jest.Mock;
const cancelScheduledNotificationAsync = Notifications.cancelScheduledNotificationAsync as jest.Mock;

describe('FocusSessionRuntimeHost', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(10_000);
    jest.clearAllMocks();
    await AsyncStorage.clear();
    useFocusSessionStore.getState().reset();
    useAppStore.setState({
      notificationPreferences: {
        notificationsEnabled: true,
        osPermissionStatus: 'authorized',
        allowActivityReminders: true,
        allowDailyShowUp: false,
        dailyShowUpTime: null,
        allowPlanKickoff: true,
        planKickoffCadence: 'daily',
        planKickoffWeeklyDay: 1,
        allowDailyFocus: false,
        dailyFocusTime: null,
        dailyFocusTimeMode: 'auto',
        allowGoalNudges: true,
        goalNudgeTime: null,
        allowStreakAndReactivation: true,
      },
      soundscapeEnabled: true,
      soundscapeTrackId: 'default',
    });
    scheduleNotificationAsync.mockResolvedValue('focus-complete-notification');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not cancel the scheduled completion notification when a session naturally expires', async () => {
    const session = useFocusSessionStore.getState().startSession({
      activityId: 'activity-1',
      title: 'Budget remaining app MVP',
      minutes: 1,
      startedAtMs: 10_000,
    });

    renderWithProviders(<FocusSessionRuntimeHost />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: 'Focus session complete',
          body: 'Budget remaining app MVP',
          data: expect.objectContaining({ sessionId: session.sessionId }),
        }),
        trigger: expect.objectContaining({ seconds: 60 }),
      }),
    );
    expect(useFocusSessionStore.getState().activeSession?.notificationId).toBe('focus-complete-notification');

    cancelScheduledNotificationAsync.mockClear();

    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(useFocusSessionStore.getState().activeSession).toBeNull();
    expect(cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('focus-complete-notification');
  });
});
