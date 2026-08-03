import { act, renderHook } from '@testing-library/react-native';
import type { DeviceMotionMeasurement } from 'expo-sensors/build/DeviceMotion';
import DeviceMotion from 'expo-sensors/build/DeviceMotion';
import { PHYSICAL_END_STABLE_MS } from './hourglassMotion';
import { usePhysicalHourglassMotion } from './usePhysicalHourglassMotion';

const mockDeviceMotion = DeviceMotion as jest.Mocked<typeof DeviceMotion>;
let motionListener: ((measurement: DeviceMotionMeasurement) => void) | null = null;

jest.mock('expo-sensors/build/DeviceMotion', () => ({
  __esModule: true,
  default: {
    isAvailableAsync: jest.fn(),
    setUpdateInterval: jest.fn(),
    addListener: jest.fn((listener: (measurement: DeviceMotionMeasurement) => void) => {
      motionListener = listener;
      return { remove: jest.fn() };
    }),
  },
}));

function measurement(gravityY: number): DeviceMotionMeasurement {
  return { accelerationIncludingGravity: { x: 0, y: gravityY, z: 0, timestamp: 0 } } as DeviceMotionMeasurement;
}

describe('usePhysicalHourglassMotion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    motionListener = null;
  });

  it('reports unavailable motion without blocking the screen fallback', async () => {
    mockDeviceMotion.isAvailableAsync.mockResolvedValue(false);

    const { result } = renderHook(() => usePhysicalHourglassMotion({ enabled: true, onFlip: jest.fn() }));
    await act(async () => undefined);

    expect(result.current.availability).toBe('unavailable');
    expect(result.current.armedEnd).toBeNull();
    expect(mockDeviceMotion.addListener).not.toHaveBeenCalled();
  });

  it('arms one end and emits only a stable opposite-end flip', async () => {
    let now = 1_000;
    const onFlip = jest.fn();
    mockDeviceMotion.isAvailableAsync.mockResolvedValue(true);
    const { result } = renderHook(() => usePhysicalHourglassMotion({ enabled: true, onFlip, now: () => now }));
    await act(async () => undefined);

    act(() => motionListener?.(measurement(-9)));
    now += PHYSICAL_END_STABLE_MS;
    act(() => motionListener?.(measurement(-9)));
    expect(result.current.armedEnd).toBe('upright');

    now += 100;
    act(() => motionListener?.(measurement(9)));
    expect(onFlip).not.toHaveBeenCalled();
    now += PHYSICAL_END_STABLE_MS;
    act(() => motionListener?.(measurement(9)));

    expect(onFlip).toHaveBeenCalledWith('inverted');
    expect(result.current.armedEnd).toBe('inverted');
  });
});
