import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { useExploreStore } from './useExploreStore';

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
  const startSession = useExploreStore((state) => state.startSession);
  const appendSample = useExploreStore((state) => state.appendSample);
  const stopSession = useExploreStore((state) => state.stopSession);
  const activeSession = useExploreStore((state) => state.activeSession);

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

  const stop = useCallback(
    (reason?: 'background') => {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      if (useExploreStore.getState().activeSession) stopSession();
      setStatus('idle');
      setMessage(reason === 'background' ? 'Adventure stopped when Kwilt left the foreground.' : null);
    },
    [stopSession],
  );

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
      setStatus('locating');
      startSession();
      const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      consumeLocation(initial);
      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          distanceInterval: 4,
          timeInterval: 3_000,
        },
        consumeLocation,
      );
      setStatus('recording');
    } catch {
      if (useExploreStore.getState().activeSession) stopSession();
      setStatus('unavailable');
      setMessage('Kwilt could not start location recording. Try again when location is available.');
    }
  }, [consumeLocation, startSession, stopSession]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' && subscriptionRef.current) stop('background');
    });
    return () => {
      subscription.remove();
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [stop]);

  return {
    active: Boolean(activeSession) && status === 'recording',
    status,
    message,
    start,
    stop: () => stop(),
  };
}
