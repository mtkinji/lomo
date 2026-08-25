import { act } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { useAppStore } from '../../../store/useAppStore';
import { approveChoreOccurrence, createChoreLearningRecord } from '../domain/choreLearning';
import { useChoreLearningStore } from './useChoreLearningStore';
import { ChoreCaregiverAttentionRuntimeHost } from './ChoreCaregiverAttentionRuntimeHost';

jest.mock('expo-notifications', () => ({
  setBadgeCountAsync: jest.fn(async () => true),
}));

const setBadgeCountAsync = Notifications.setBadgeCountAsync as jest.Mock;

async function flushEffects(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('ChoreCaregiverAttentionRuntimeHost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.setState((state) => ({
      notificationPreferences: {
        ...state.notificationPreferences,
        notificationsEnabled: true,
        osPermissionStatus: 'authorized',
      },
    }));
    useChoreLearningStore.setState({ record: createChoreLearningRecord() });
    useChoreLearningStore.getState().selectMember('member-andrew');
  });

  it('sets the app badge to the number of pending caregiver responses', async () => {
    renderWithProviders(<ChoreCaregiverAttentionRuntimeHost userId="caregiver-user" />);
    await flushEffects();

    expect(setBadgeCountAsync).toHaveBeenLastCalledWith(2);
  });

  it('decrements the badge when a caregiver resolves a request and clears it when none remain', async () => {
    renderWithProviders(<ChoreCaregiverAttentionRuntimeHost userId="caregiver-user" />);
    await flushEffects();

    const firstRecord = useChoreLearningStore.getState().record;
    act(() => {
      useChoreLearningStore.setState({
        record: approveChoreOccurrence(
          firstRecord,
          'activity-occurrence-charlie-entry-shoes-2026-08-17',
          'member-andrew',
          '2026-08-18T16:00:00.000Z',
        ),
      });
    });
    await flushEffects();
    expect(setBadgeCountAsync).toHaveBeenLastCalledWith(1);

    const secondRecord = useChoreLearningStore.getState().record;
    act(() => {
      useChoreLearningStore.setState({
        record: approveChoreOccurrence(
          secondRecord,
          'activity-occurrence-olive-dishwasher-2026-08-18',
          'member-andrew',
          '2026-08-18T16:01:00.000Z',
        ),
      });
    });
    await flushEffects();
    expect(setBadgeCountAsync).toHaveBeenLastCalledWith(0);
  });

  it('clears the badge in a child member context', async () => {
    useChoreLearningStore.getState().selectMember('member-charlie');

    renderWithProviders(<ChoreCaregiverAttentionRuntimeHost userId="caregiver-user" />);
    await flushEffects();

    expect(setBadgeCountAsync).toHaveBeenLastCalledWith(0);
  });

  it.each([
    ['the user is signed out', { userId: null, notificationsEnabled: true, osPermissionStatus: 'authorized' }],
    ['app notifications are disabled', { userId: 'caregiver-user', notificationsEnabled: false, osPermissionStatus: 'authorized' }],
    ['OS notification permission is unavailable', { userId: 'caregiver-user', notificationsEnabled: true, osPermissionStatus: 'denied' }],
  ])('clears the app badge when %s', async (_label, setup) => {
    useAppStore.setState((state) => ({
      notificationPreferences: {
        ...state.notificationPreferences,
        notificationsEnabled: setup.notificationsEnabled,
        osPermissionStatus: setup.osPermissionStatus as 'authorized' | 'denied',
      },
    }));

    renderWithProviders(<ChoreCaregiverAttentionRuntimeHost userId={setup.userId} />);
    await flushEffects();

    expect(setBadgeCountAsync).toHaveBeenLastCalledWith(0);
  });
});
