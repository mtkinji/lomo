import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';
import { openPaywallInterstitial } from '../../services/paywall';
import { preloadSoundscape } from '../../services/soundscape';
import { useAppStore } from '../../store/useAppStore';
import { STANDALONE_FOCUS_ACTIVITY_ID } from './focusSessionLifecycle';
import { useFocusSessionStore } from './focusSessionStore';
import { useStandaloneFocusController } from './useStandaloneFocusController';

jest.mock('expo-notifications', () => ({
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
}));

jest.mock('../../services/paywall', () => ({
  openPaywallInterstitial: jest.fn(),
}));

jest.mock('../../services/screenTimeProtectionRuntime', () => ({
  reconcileScreenTimeRestrictions: jest.fn(async () => []),
}));

jest.mock('../../services/soundscape', () => ({
  preloadSoundscape: jest.fn(async () => undefined),
}));

describe('useStandaloneFocusController', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useFocusSessionStore.getState().reset();
    useAppStore.setState({
      soundscapeEnabled: true,
      soundscapeTrackId: 'default',
      focusVideoEnvironmentId: null,
    });
    jest.clearAllMocks();
  });

  it('uses the soundscape configured on this widget launch', async () => {
    const { result } = renderHook(() =>
      useStandaloneFocusController({ maxMinutes: 180, soundscapeTrackId: 'default' }),
    );

    await act(async () => {
      expect(await result.current.start(25, 'rainlitLibrary')).toBe(true);
    });

    expect(useAppStore.getState().soundscapeEnabled).toBe(true);
    expect(useAppStore.getState().soundscapeTrackId).toBe('rainlitLibrary');
    expect(preloadSoundscape).toHaveBeenCalledWith({ soundscapeId: 'rainlitLibrary' });
  });

  it('selects the Canyon Spring visual independently from in-session audio mute', async () => {
    const { result } = renderHook(() =>
      useStandaloneFocusController({ maxMinutes: 180, soundscapeTrackId: 'default' }),
    );

    await act(async () => {
      expect(await result.current.start(25, 'canyonSpring')).toBe(true);
    });

    expect(useAppStore.getState().focusVideoEnvironmentId).toBe('canyonSpring');
    expect(useAppStore.getState().soundscapeTrackId).toBe('canyonSpring');

    await act(async () => {
      useAppStore.getState().setSoundscapeEnabled(false);
      await Promise.resolve();
    });
    expect(useAppStore.getState().focusVideoEnvironmentId).toBe('canyonSpring');
  });

  it('can start silently from a widget configured with no audio', async () => {
    const { result } = renderHook(() =>
      useStandaloneFocusController({ maxMinutes: 180, soundscapeTrackId: 'default' }),
    );

    await act(async () => {
      expect(await result.current.start(25, 'none')).toBe(true);
    });

    expect(useAppStore.getState().soundscapeEnabled).toBe(false);
    expect(preloadSoundscape).not.toHaveBeenCalled();
  });

  it('starts an explicitly unlinked Focus session', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(10_000);
    const { result } = renderHook(() =>
      useStandaloneFocusController({ maxMinutes: 180, soundscapeTrackId: 'default' }),
    );

    await act(async () => {
      expect(await result.current.start(25)).toBe(true);
    });

    expect(useFocusSessionStore.getState().activeSession).toMatchObject({
      sessionId: `${STANDALONE_FOCUS_ACTIVITY_ID}-10000`,
      activityId: STANDALONE_FOCUS_ACTIVITY_ID,
      goalId: null,
      title: 'Focus',
      endAtMs: 1_510_000,
    });
    jest.restoreAllMocks();
  });

  it('preserves the existing Focus entitlement limit', async () => {
    const { result } = renderHook(() =>
      useStandaloneFocusController({ maxMinutes: 10, soundscapeTrackId: 'default' }),
    );

    await act(async () => {
      expect(await result.current.start(25)).toBe(false);
    });

    expect(useFocusSessionStore.getState().activeSession).toBeNull();
    expect(openPaywallInterstitial).toHaveBeenCalledWith({
      reason: 'pro_only_focus_mode',
      source: 'focus_widget',
    });
  });
});
