import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useAppStore } from '../../../store/useAppStore';
import { trackingPolicyForRecordingMode } from '../domain/exploreAdaptiveTracking';
import { locationProfileForExploreMode } from '../domain/exploreRecordingMode';
import type { ExplorePreferences } from '../domain/types';
import {
  isExploreLocationServiceStarted,
  startExploreBackgroundUpdates,
  stopExploreBackgroundUpdates,
} from './exploreLocationUpdates';
import { useExploreStore } from './useExploreStore';
import { posthogClient } from '../../../services/analytics/posthogClient';
import { track } from '../../../services/analytics/analytics';
import { AnalyticsEvent } from '../../../services/analytics/events';

export type ExploreRecorderStatus =
  | 'idle'
  | 'requesting-permission'
  | 'locating'
  | 'recording'
  | 'permission-denied'
  | 'unavailable';

function expoAccuracy(accuracy: 'balanced' | 'high' | 'navigation'): Location.Accuracy {
  if (accuracy === 'navigation') return Location.Accuracy.BestForNavigation;
  return accuracy === 'balanced' ? Location.Accuracy.Balanced : Location.Accuracy.High;
}

export function useExploreRecorder() {
  const [status, setStatus] = useState<ExploreRecorderStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const backgroundAuthorizedRef = useRef(false);
  const permissionPromptActiveRef = useRef(false);
  const desiredAppStateRef = useRef(AppState.currentState);
  const acquisitionQueueRef = useRef(Promise.resolve());
  const enqueueAcquisition = useCallback((work: () => Promise<void>) => {
    const operation = acquisitionQueueRef.current.then(work);
    acquisitionQueueRef.current = operation.catch(() => undefined);
    return operation;
  }, []);
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
      speedMps: location.coords.speed,
      courseDeg: location.coords.heading,
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

  const requestForegroundPermission = useCallback(async (): Promise<boolean> => {
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (foreground.status === 'granted') return true;
    setStatus('permission-denied');
    setMessage('Location stays off. Allow it in Settings when you want to explore.');
    return false;
  }, []);

  const requestRecordingPermissions = useCallback(async (): Promise<{
    foregroundGranted: boolean;
    backgroundGranted: boolean;
  }> => {
    const foregroundGranted = await requestForegroundPermission();
    if (!foregroundGranted) return { foregroundGranted: false, backgroundGranted: false };
    permissionPromptActiveRef.current = true;
    let background: Location.LocationPermissionResponse;
    try {
      background = await Location.requestBackgroundPermissionsAsync();
    } finally {
      permissionPromptActiveRef.current = false;
    }
    const backgroundGranted = background.status === 'granted';
    backgroundAuthorizedRef.current = backgroundGranted;
    if (!backgroundGranted) {
      setMessage('Allow Always Location so Explore can continue when the screen is locked.');
    } else if (useExploreStore.getState().preferences.recapNotifications && globalNotificationsEnabled) {
      await Notifications.requestPermissionsAsync().catch(() => undefined);
    }
    return { foregroundGranted: true, backgroundGranted };
  }, [globalNotificationsEnabled, requestForegroundPermission]);

  const beginForegroundSession = useCallback(async (mode: ExplorePreferences['recording']) => {
    setStatus('locating');
    const nextPolicy = trackingPolicyForRecordingMode(mode);
    const current = useExploreStore.getState();
    if (current.activeSession && current.activeSession.trackingPolicy !== nextPolicy) {
      if (current.activeSession.points.length) {
        current.stopSession(
          new Date().toISOString(),
          current.activeSession.trackingPolicy === 'ambient' ? 'background-stillness' : 'interrupted',
        );
      } else {
        current.recoverInterruptedSession();
      }
    }
    if (!useExploreStore.getState().activeSession) {
      startSession(undefined, undefined, nextPolicy);
    }
    const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    consumeLocation(initial);
    await startForegroundWatcher(mode);
    setStatus('recording');
    track(posthogClient, AnalyticsEvent.ExploreRecordingStarted, {
      recording_mode: mode,
      outcome: 'recording',
    });
  }, [consumeLocation, startForegroundWatcher, startSession]);

  const beginAutomaticRecording = useCallback(async () => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    setStatus('locating');
    if (!useExploreStore.getState().activeSession) startSession(undefined, undefined, 'ambient');
    else useExploreStore.getState().resumeTracking();
    const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    consumeLocation(initial);
    await startBackgroundUpdates('automatic');
    setStatus('recording');
  }, [consumeLocation, startBackgroundUpdates, startSession]);

  const stop = useCallback(async (reason?: 'background') => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    await stopBackgroundUpdates();
    const session = useExploreStore.getState().activeSession;
    if (session) {
      stopSession();
      track(posthogClient, AnalyticsEvent.ExploreRecordingCompleted, {
        recording_mode: session.trackingPolicy,
        outcome: reason === 'background' ? 'background_stopped' : 'completed',
      });
    }
    const shouldResumeAmbient =
      reason !== 'background' &&
      session?.trackingPolicy === 'adventure' &&
      useExploreStore.getState().preferences.recording === 'automatic' &&
      backgroundAuthorizedRef.current;
    if (shouldResumeAmbient) {
      await beginAutomaticRecording();
      setMessage(null);
      return;
    }
    setStatus('idle');
    setMessage(reason === 'background'
      ? 'This outing stopped because background location is not allowed.'
      : null);
  }, [beginAutomaticRecording, stopBackgroundUpdates, stopSession]);

  const start = useCallback(async () => {
    if (subscriptionRef.current) return;
    setMessage(null);
    setStatus('requesting-permission');
    try {
      const permission = await requestRecordingPermissions();
      if (!permission.foregroundGranted) return;
      await stopBackgroundUpdates();
      await beginForegroundSession('manual');
    } catch {
      if (useExploreStore.getState().activeSession) stopSession();
      setStatus('unavailable');
      setMessage('Kwilt could not start location recording. Try again when location is available.');
    }
  }, [beginForegroundSession, requestRecordingPermissions, stopBackgroundUpdates, stopSession]);

  const beginOnboarding = useCallback(async () => {
    if (subscriptionRef.current) return;
    setMessage(null);
    setStatus('requesting-permission');
    try {
      const permission = await requestRecordingPermissions();
      if (!permission.foregroundGranted) return;
      await stopBackgroundUpdates();
      await beginForegroundSession('manual');
    } catch {
      if (useExploreStore.getState().activeSession) stopSession();
      setStatus('unavailable');
      setMessage('Kwilt could not start your Explore history. Try again when location is available.');
    }
  }, [beginForegroundSession, requestRecordingPermissions, stopBackgroundUpdates, stopSession]);

  const setRecordingMode = useCallback(async (mode: ExplorePreferences['recording']): Promise<boolean> => {
    if (mode === 'manual') {
      const wasAutomatic = useExploreStore.getState().preferences.recording === 'automatic';
      updatePreferences({ recording: 'manual' });
      if (wasAutomatic && useExploreStore.getState().activeSession?.trackingPolicy === 'ambient') await stop();
      return true;
    }
    setMessage(null);
    setStatus('requesting-permission');
    try {
      const permission = await requestRecordingPermissions();
      if (!permission.foregroundGranted || !permission.backgroundGranted) return false;
      updatePreferences({ recording: 'automatic' });
      if (useExploreStore.getState().activeSession?.trackingPolicy === 'adventure') return true;
      await beginAutomaticRecording();
      return true;
    } catch {
      setStatus('unavailable');
      setMessage('Kwilt could not enable Always Exploring. Try again when location is available.');
      return false;
    }
  }, [beginAutomaticRecording, requestRecordingPermissions, stop, updatePreferences]);

  const locate = useCallback(async (): Promise<{ latitude: number; longitude: number } | null> => {
    setMessage(null);
    setStatus('locating');
    try {
      let foreground = await Location.getForegroundPermissionsAsync();
      if (foreground.status !== 'granted') {
        foreground = await Location.requestForegroundPermissionsAsync();
      }
      if (foreground.status !== 'granted') {
        setStatus('permission-denied');
        setMessage('Location stays off. Allow it in Settings when you want to center the map.');
        return null;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setStatus(useExploreStore.getState().activeSession ? 'recording' : 'idle');
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch {
      setStatus('unavailable');
      setMessage('Kwilt could not find your current location. Try again when location is available.');
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const reconcile = async () => {
      if (cancelled || permissionPromptActiveRef.current) return;
      const state = useExploreStore.getState();
      if (!state.activeSession) return;
      if (desiredAppStateRef.current !== 'active') {
        subscriptionRef.current?.remove();
        subscriptionRef.current = null;
        if (backgroundAuthorizedRef.current) {
          await startBackgroundUpdates(state.activeSession.trackingPolicy === 'adventure' ? 'manual' : 'automatic')
            .catch(() => stop('background'));
        } else await stop('background');
        return;
      }
      if (state.activeSession.trackingPolicy !== 'adventure' && state.preferences.recording === 'automatic') {
        state.resumeTracking();
        await startBackgroundUpdates('automatic');
      } else {
        await stopBackgroundUpdates();
        if (cancelled || desiredAppStateRef.current !== 'active') return;
        const current = useExploreStore.getState();
        if (!current.activeSession) return;
        current.resumeTracking();
        await startForegroundWatcher(current.activeSession.trackingPolicy === 'adventure' ? 'manual' : current.preferences.recording);
        // watchPositionAsync can resolve after another lock or after unmount.
        if (cancelled || desiredAppStateRef.current !== 'active') {
          subscriptionRef.current?.remove();
          subscriptionRef.current = null;
          return;
        }
      }
      if (!cancelled) setStatus('recording');
    };
    const subscription = AppState.addEventListener('change', (nextState) => {
      desiredAppStateRef.current = nextState;
      // Serialize native start/stop calls. A pending resume must never replace the
      // background manager after the user has already locked the phone again.
      void enqueueAcquisition(reconcile).catch(() => {
        if (!cancelled) setStatus('unavailable');
      });
    });
    return () => {
      cancelled = true;
      subscription.remove();
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [enqueueAcquisition, startBackgroundUpdates, startForegroundWatcher, stop, stopBackgroundUpdates]);

  useEffect(() => {
    let cancelled = false;
    const reconcileHydratedSession = async () => {
      if (cancelled) return;
      const state = useExploreStore.getState();
      const foreground = await Location.getForegroundPermissionsAsync().catch(() => null);
      const background = await Location.getBackgroundPermissionsAsync().catch(() => null);
      if (cancelled) return;
      if (useExploreStore.getState().activeSession?.id !== state.activeSession?.id) return;
      backgroundAuthorizedRef.current = background?.status === 'granted';
      const backgroundStarted = await isExploreLocationServiceStarted();
      if (cancelled) return;
      if (state.activeSession?.trackingPolicy === 'adventure' && desiredAppStateRef.current !== 'active' && backgroundAuthorizedRef.current) {
        await startBackgroundUpdates('manual');
        if (!cancelled) setStatus('recording');
        return;
      }
      if (state.activeSession?.trackingPolicy === 'adventure') {
        if (backgroundStarted) {
          await stopBackgroundUpdates();
          if (cancelled || desiredAppStateRef.current !== 'active' ||
            useExploreStore.getState().activeSession?.id !== state.activeSession.id) return;
          state.resumeTracking();
          await startForegroundWatcher('manual');
          if (cancelled || desiredAppStateRef.current !== 'active') {
            subscriptionRef.current?.remove();
            subscriptionRef.current = null;
            return;
          }
          setStatus('recording');
        } else {
          state.recoverInterruptedSession();
          setStatus('idle');
          setMessage('Your last recorded path was saved.');
        }
      } else if (
        state.preferences.recording === 'automatic' &&
        foreground?.status === 'granted' &&
        background?.status === 'granted'
      ) {
        if (!backgroundStarted || state.tracking.phase === 'deep-sleep') await beginAutomaticRecording();
        else setStatus('recording');
      } else if (state.activeSession && backgroundStarted) {
        await stopBackgroundUpdates();
        if (cancelled) return;
        state.resumeTracking();
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
    const restoreSession = () => {
      void enqueueAcquisition(reconcileHydratedSession).catch(() => {
        if (!cancelled) setStatus('unavailable');
      });
    };
    if (useExploreStore.persist.hasHydrated()) restoreSession();
    const unsubscribe = useExploreStore.persist.onFinishHydration(restoreSession);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [beginAutomaticRecording, enqueueAcquisition, startBackgroundUpdates, startForegroundWatcher, stopBackgroundUpdates]);

  return {
    active: activeSession?.trackingPolicy === 'adventure' && status === 'recording',
    status,
    message,
    beginOnboarding,
    start,
    stop: () => stop(),
    locate,
    setRecordingMode,
  };
}
