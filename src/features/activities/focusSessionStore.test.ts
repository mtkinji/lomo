import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusSessionStore } from './focusSessionStore';

describe('useFocusSessionStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useFocusSessionStore.getState().reset();
  });

  it('starts a durable focus session with activity context', () => {
    useFocusSessionStore.getState().startSession({
      activityId: 'activity-1',
      title: 'Write budget plan',
      minutes: 25,
      startedAtMs: 10_000,
    });

    expect(useFocusSessionStore.getState().activeSession).toEqual({
      sessionId: 'activity-1-10000',
      activityId: 'activity-1',
      goalId: null,
      title: 'Write budget plan',
      mode: 'running',
      startedAtMs: 10_000,
      endAtMs: 1_510_000,
      notificationId: null,
    });
  });

  it('pauses and resumes the active session without changing identity', () => {
    const store = useFocusSessionStore.getState();
    store.startSession({
      activityId: 'activity-1',
      title: 'Write budget plan',
      minutes: 25,
      startedAtMs: 10_000,
    });

    expect(useFocusSessionStore.getState().pauseSession('activity-1-10000', 70_000)).toEqual({
      sessionId: 'activity-1-10000',
      notificationId: null,
    });
    expect(useFocusSessionStore.getState().activeSession?.mode).toBe('paused');

    expect(useFocusSessionStore.getState().resumeSession('activity-1-10000', 100_000)).toEqual({
      sessionId: 'activity-1-10000',
      activityId: 'activity-1',
      goalId: null,
      title: 'Write budget plan',
      mode: 'running',
      startedAtMs: 10_000,
      endAtMs: 1_540_000,
      notificationId: null,
    });
  });

  it('stores and clears the active focus notification id', () => {
    const store = useFocusSessionStore.getState();
    store.startSession({
      activityId: 'activity-1',
      title: 'Write budget plan',
      minutes: 25,
      startedAtMs: 10_000,
    });

    store.setNotificationId('activity-1-10000', 'notification-1');
    expect(useFocusSessionStore.getState().activeSession?.notificationId).toBe('notification-1');

    expect(store.clearNotificationId('activity-1-10000')).toBe('notification-1');
    expect(useFocusSessionStore.getState().activeSession?.notificationId).toBeNull();
  });

  it('completes an expired running session exactly once', () => {
    const store = useFocusSessionStore.getState();
    store.startSession({
      activityId: 'activity-1',
      title: 'Write budget plan',
      minutes: 1,
      startedAtMs: 10_000,
    });

    expect(store.completeExpiredSession(69_999)).toBeNull();

    const completed = store.completeExpiredSession(70_000);
    expect(completed?.sessionId).toBe('activity-1-10000');
    expect(completed?.durationMinutes).toBe(1);
    expect(useFocusSessionStore.getState().activeSession).toBeNull();

    expect(store.completeExpiredSession(70_001)).toBeNull();
  });

  it('ignores stale session actions', () => {
    const store = useFocusSessionStore.getState();
    store.startSession({
      activityId: 'activity-1',
      title: 'Write budget plan',
      minutes: 25,
      startedAtMs: 10_000,
    });

    expect(store.pauseSession('activity-1-9999', 70_000)).toBeNull();
    expect(store.resumeSession('activity-1-9999', 100_000)).toBeNull();
    expect(store.endSession('activity-1-9999')).toBeNull();
    expect(useFocusSessionStore.getState().activeSession?.sessionId).toBe('activity-1-10000');
  });
});
