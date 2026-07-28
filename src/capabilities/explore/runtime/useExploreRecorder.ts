import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useAppStore } from '../../../store/useAppStore';
import { locationProfileForExploreMode } from '../domain/exploreRecordingMode';
import type { ExplorePreferences } from '../domain/types';
import { EXPLORE_BACKGROUND_TASK } from './exploreBackgroundTask';
import { startExploreBackgroundUpdates, stopExploreBackgroundUpdates } from './exploreLocationUpdates';
import { useExploreStore } from './useExploreStore';

export type ExploreRecorderStatus =
  | 'idle'
  | 'requesting-permission'
  | 'locating'
  | 'recording'
  | 'permission-denied'
  | 'unavailable';

function expoAccuracy(accuracy: 'balanced' | 'high'): Location.Accuracy {
  return accuracy === 'balanced' ? Location.Accuracy.Balanced : Location.Accuracy.High;
}

export function useExploreRecorder() {
  const [status, setStatus] = useState<ExploreRecorderStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const backgroundAuthorizedRef = useRef(false);
  const startSession = useExploreStore((state) => state.startSession);
  const appendSample = useExploreStore((state) => state.appendSample);
  const stopSession = useExploreStore((state) => state.stopSession);
  const activeSession = useExploreStore((state) => state.activeSession);
  const updatePreferences = useExploreStore((state) => state.updatePreferences);
  const globalNotificationsEnabled = useAppStore((state) => state.notificationPreferences.notificationsEnabled);

  const consumeLocation = useCallback((location: Location.LocationObject) => {
    appendSample({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      altitudeM: location.coords.altitude,
      horizontalAccuracyM: location.coords.accuracy,
      altitudeAccuracyM: location.coords.altitudeAccuracy,
      recordedAt: new Date(location.timestamp).toISOString(),
    });
  }, [appendSample]);

  const stopBackgroundUpdates = useCallback(async () => {
    await stopExploreBackgroundUpdates();
  }, []);

  const startForegroundWatcher = useCallback(async (mode?: ExplorePreferences['recording']) => {
    subscriptionRef.current?.remove();
    const profile = locationProfileForExploreMode(mode ?? useExploreStore.getState().preferences.recording, 'foreground');
    subscriptionRef.current = await Location.watchPositionAsync({
      accuracy: expoAccuracy(profile.accuracy),
      distanceInterval: profile.distanceIntervalM,
      timeInterval: profile.timeIntervalMs,
    }, consumeLocation);
  }, [consumeLocation]);

  const startBackgroundUpdates = useCallback(async (mode?: ExplorePreferences['recording']) => {
    await startExploreBackgroundUpdates(mode ?? useExploreStore.getState().preferences.recording);
  }, []);

  const requestRecordingPermissions = useCallback(async (): Promise<boolean> => {
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (foreground.status !== 'granted') {
      setStatus('permission-denied');
      setMessage('Location stays off. Allow it in Settings when you want to explore.');
      return false;
    }
    const background = await Location.requestBackgroundPermissionsAsync();
    backgroundAuthorizedRef.current = background.status === 'granted';
    if (background.status !== 'granted') {
      setMessage('Allow Always Location so Explore can continue when the screen is locked.');
    } else if (useExploreStore.getState().preferences.recapNotifications && globalNotificationsEnabled) {
      await Notifications.requestPermissionsAsync().catch(() => undefined);
    }
    return true;
  }, [globalNotificationsEnabled]);

  const beginForegroundSession = useCallback(async (mode: ExplorePreferences['recording']) => {
    setStatus('locating');
    if (!useExploreStore.getState().activeSession) startSession();
    const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    consumeLocation(initial);
    await startForegroundWatcher(mode);
    setStatus('recording');
  }, [consumeLocation, startForegroundWatcher, startSession]);

  const beginAutomaticRecording = useCallback(async () => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    setStatus('locating');
    if (!useExploreStore.getState().activeSession) startSession();
    const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    consumeLocation(initial);
    await startBackgroundUpdates('automatic');
    setStatus('recording');
  }, [consumeLocation, startBackgroundUpdates, startSession]);

  const stop = useCallback((reason?: 'background') => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    void stopBackgroundUpdates();
    if (useExploreStore.getState().activeSession) stopSession();
    setStatus('idle');
    setMessage(reason === 'background'
      ? 'This outing stopped because background location is not allowed.'
      : null);
  }, [stopBackgroundUpdates, stopSession]);

  const start = useCallback(async () => {
    if (subscriptionRef.current) return;
    setMessage(null);
    setStatus('requesting-permission');
    try {
      const permitted = await requestRecordingPermissions();
      if (!permitted) return;
      await beginForegroundSession('manual');
    } catch {
      if (useExploreStore.getState().activeSession) stopSession();
      setStatus('unavailable');
      setMessage('Kwilt could not start location recording. Try again when location is available.');
    }
  }, [beginForegroundSession, requestRecordingPermissions, stopSession]);

  const setRecordingMode = useCallback(async (mode: ExplorePreferences['recording']) => {
    if (mode === 'manual') {
      const wasAutomatic = useExploreStore.getState().preferences.recording === 'automatic';
      updatePreferences({ recording: 'manual' });
      if (wasAutomatic) stop();
      return;
    }
    setMessage(null);
    setStatus('requesting-permission');
    try {
      const permitted = await requestRecordingPermissions();
      if (!permitted || !backgroundAuthorizedRef.current) return;
      updatePreferences({ recording: 'automatic' });
      await beginAutomaticRecording();
    } catch {
      setStatus('unavailable');
      setMessage('Kwilt could not enable Always Exploring. Try again when location is available.');
    }
  }, [beginAutomaticRecording, requestRecordingPermissions, stop, updatePreferences]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' && subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
        if (backgroundAuthorizedRef.current) {
          void startBackgroundUpdates().catch(() => stop('background'));
        } else {
          stop('background');
        }
      } else if (nextState === 'active') {
        const currentMode = useExploreStore.getState().preferences.recording;
        if (currentMode === 'automatic') {
          void startBackgroundUpdates('automatic').then(() => setStatus('recording')).catch(() => setStatus('unavailable'));
          return;
        }
        void stopBackgroundUpdates().then(async () => {
          const state = useExploreStore.getState();
          if (state.activeSession) {
            await startForegroundWatcher(state.preferences.recording).catch(() => stop());
            setStatus('recording');
          } else {
            setStatus('idle');
          }
        });
      }
    });
    return () => {
      subscription.remove();
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [startBackgroundUpdates, startForegroundWatcher, stop, stopBackgroundUpdates]);

  useEffect(() => {
    let cancelled = false;
    const reconcileHydratedSession = async () => {
      const state = useExploreStore.getState();
      const foreground = await Location.getForegroundPermissionsAsync().catch(() => null);
      const background = await Location.getBackgroundPermissionsAsync().catch(() => null);
      if (cancelled) return;
      backgroundAuthorizedRef.current = background?.status === 'granted';
      const backgroundStarted = await Location.hasStartedLocationUpdatesAsync(EXPLORE_BACKGROUND_TASK).catch(() => false);
      if (cancelled) return;
      if (
        state.preferences.recording === 'automatic' &&
        foreground?.status === 'granted' &&
        background?.status === 'granted'
      ) {
        if (!backgroundStarted) await beginAutomaticRecording();
        else setStatus('recording');
      } else if (state.activeSession && backgroundStarted) {
        await stopBackgroundUpdates();
        if (cancelled) return;
        await startForegroundWatcher(state.preferences.recording);
        setStatus('recording');
      } else if (state.activeSession) {
        state.recoverInterruptedSession();
        setStatus('idle');
        setMessage('Your last recorded path was saved.');
      } else if (state.preferences.recording === 'automatic') {
        setStatus('permission-denied');
        setMessage('Always Exploring is paused until Always Location is allowed.');
      }
    };
    if (useExploreStore.persist.hasHydrated()) void reconcileHydratedSession();
    const unsubscribe = useExploreStore.persist.onFinishHydration(() => {
      void reconcileHydratedSession();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [beginAutomaticRecording, startForegroundWatcher, stopBackgroundUpdates]);

  return {
    active: Boolean(activeSession) && status === 'recording',
    status,
    message,
    start,
    stop: () => stop(),
    setRecordingMode,
  };
}
