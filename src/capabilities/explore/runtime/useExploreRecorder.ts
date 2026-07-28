import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { EXPLORE_BACKGROUND_TASK } from './exploreBackgroundTask';
import { useExploreStore } from './useExploreStore';
import { useAppStore } from '../../../store/useAppStore';

export type ExploreRecorderStatus =
  | 'idle'
  | 'requesting-permission'
  | 'locating'
  | 'recording'
  | 'permission-denied'
  | 'unavailable';

export function useExploreRecorder() {
  const [status, setStatus] = useState<ExploreRecorderStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const backgroundAuthorizedRef = useRef(false);
  const startSession = useExploreStore((state) => state.startSession);
  const appendSample = useExploreStore((state) => state.appendSample);
  const stopSession = useExploreStore((state) => state.stopSession);
  const activeSession = useExploreStore((state) => state.activeSession);
  const preferences = useExploreStore((state) => state.preferences);
  const globalNotificationsEnabled = useAppStore((state) => state.notificationPreferences.notificationsEnabled);

  const consumeLocation = useCallback(
    (location: Location.LocationObject) => {
      appendSample({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitudeM: location.coords.altitude,
        horizontalAccuracyM: location.coords.accuracy,
        altitudeAccuracyM: location.coords.altitudeAccuracy,
        recordedAt: new Date(location.timestamp).toISOString(),
      });
    },
    [appendSample],
  );

  const stopBackgroundUpdates = useCallback(async () => {
    const started = await Location.hasStartedLocationUpdatesAsync(EXPLORE_BACKGROUND_TASK).catch(() => false);
    if (started) await Location.stopLocationUpdatesAsync(EXPLORE_BACKGROUND_TASK).catch(() => undefined);
  }, []);

  const stop = useCallback(
    (reason?: 'background') => {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      void stopBackgroundUpdates();
      if (useExploreStore.getState().activeSession) stopSession();
      setStatus('idle');
      setMessage(reason === 'background' ? 'Adventure stopped when Kwilt left the foreground.' : null);
    },
    [stopBackgroundUpdates, stopSession],
  );

  const startForegroundWatcher = useCallback(async () => {
    subscriptionRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Highest, distanceInterval: 4, timeInterval: 3_000 },
      consumeLocation,
    );
  }, [consumeLocation]);

  const startBackgroundUpdates = useCallback(async () => {
    await Location.startLocationUpdatesAsync(EXPLORE_BACKGROUND_TASK, {
      accuracy: Location.Accuracy.High,
      distanceInterval: 8,
      timeInterval: 15_000,
      deferredUpdatesDistance: 20,
      deferredUpdatesInterval: 30_000,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Explore is recording',
        notificationBody: 'Kwilt is keeping this outing on your private map.',
      },
    });
  }, []);

  const start = useCallback(async () => {
    if (subscriptionRef.current) return;
    setMessage(null);
    setStatus('requesting-permission');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setStatus('permission-denied');
        setMessage('Location stays off. Allow it in Settings when you want to explore.');
        return;
      }
      if (preferences.keepRecordingInBackground) {
        const backgroundPermission = await Location.requestBackgroundPermissionsAsync();
        backgroundAuthorizedRef.current = backgroundPermission.status === 'granted';
        if (backgroundPermission.status !== 'granted') {
          setMessage('Background location is off. This outing will record while Kwilt is open.');
        } else if (preferences.recapNotifications && globalNotificationsEnabled) {
          await Notifications.requestPermissionsAsync().catch(() => undefined);
        }
      }
      setStatus('locating');
      startSession();
      const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      consumeLocation(initial);
      await startForegroundWatcher();
      setStatus('recording');
    } catch {
      if (useExploreStore.getState().activeSession) stopSession();
      setStatus('unavailable');
      setMessage('Kwilt could not start location recording. Try again when location is available.');
    }
  }, [consumeLocation, globalNotificationsEnabled, preferences.keepRecordingInBackground, preferences.recapNotifications, startForegroundWatcher, startSession, stopSession]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' && subscriptionRef.current) {
        if (useExploreStore.getState().preferences.keepRecordingInBackground && backgroundAuthorizedRef.current) {
          subscriptionRef.current.remove();
          subscriptionRef.current = null;
          void startBackgroundUpdates().catch(() => stop('background'));
        } else {
          stop('background');
        }
      } else if (nextState === 'active') {
        void stopBackgroundUpdates().then(async () => {
          if (useExploreStore.getState().activeSession && !subscriptionRef.current) {
            await startForegroundWatcher().catch(() => stop());
          } else if (!useExploreStore.getState().activeSession) {
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
      if (!state.activeSession) return;
      const backgroundStarted = await Location.hasStartedLocationUpdatesAsync(EXPLORE_BACKGROUND_TASK).catch(() => false);
      if (cancelled) return;
      if (backgroundStarted) {
        await stopBackgroundUpdates();
        if (cancelled) return;
        await startForegroundWatcher();
        setStatus('recording');
      } else {
        state.recoverInterruptedSession();
        setStatus('idle');
        setMessage('Your last recorded path was saved.');
      }
    };
    if (useExploreStore.persist.hasHydrated()) {
      void reconcileHydratedSession();
    }
    const unsubscribe = useExploreStore.persist.onFinishHydration(() => {
      void reconcileHydratedSession();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [startForegroundWatcher, stopBackgroundUpdates]);

  return {
    active: Boolean(activeSession) && status === 'recording',
    status,
    message,
    start,
    stop: () => stop(),
  };
}
