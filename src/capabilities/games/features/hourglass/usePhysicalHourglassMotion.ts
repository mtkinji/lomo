import { useEffect, useRef, useState } from 'react';
import DeviceMotion from 'expo-sensors/build/DeviceMotion';
import { advancePhysicalFlip, createPhysicalFlipState, type HourglassEnd } from './hourglassMotion';

type MotionAvailability = 'checking' | 'available' | 'unavailable';

type UsePhysicalHourglassMotionOptions = {
  enabled: boolean;
  onFlip: (end: HourglassEnd) => void;
  now?: () => number;
};

export function usePhysicalHourglassMotion({
  enabled,
  onFlip,
  now = Date.now,
}: UsePhysicalHourglassMotionOptions) {
  const [availability, setAvailability] = useState<MotionAvailability>('checking');
  const [armedEnd, setArmedEnd] = useState<HourglassEnd | null>(null);
  const motionState = useRef(createPhysicalFlipState());
  const onFlipRef = useRef(onFlip);
  const nowRef = useRef(now);
  onFlipRef.current = onFlip;
  nowRef.current = now;

  useEffect(() => {
    motionState.current = createPhysicalFlipState();
    setArmedEnd(null);
    if (!enabled) {
      setAvailability('checking');
      return undefined;
    }

    let active = true;
    let subscription: { remove: () => void } | null = null;
    setAvailability('checking');

    void DeviceMotion.isAvailableAsync().then((available) => {
      if (!active) return;
      if (!available) {
        setAvailability('unavailable');
        return;
      }

      setAvailability('available');
      DeviceMotion.setUpdateInterval(80);
      subscription = DeviceMotion.addListener(({ accelerationIncludingGravity }) => {
        const result = advancePhysicalFlip(
          motionState.current,
          accelerationIncludingGravity.y,
          nowRef.current(),
        );
        motionState.current = result.state;
        setArmedEnd(result.state.armedEnd);
        if (result.flippedTo) onFlipRef.current(result.flippedTo);
      });
    }).catch(() => {
      if (active) setAvailability('unavailable');
    });

    return () => {
      active = false;
      subscription?.remove();
    };
  }, [enabled]);

  return { availability, armedEnd };
}
