import { requireOptionalNativeModule } from 'expo-modules-core';
import { Alert } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { LocationPermissionService } from './LocationPermissionService';

jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: jest.fn(),
}));

jest.mock('../store/useAppStore', () => ({
  useAppStore: {
    getState: jest.fn(),
  },
}));

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Linking: {
    openSettings: jest.fn(),
  },
}));

type ExpoLocationModule = {
  getForegroundPermissionsAsync: jest.Mock<Promise<{ status: 'granted' | 'denied' | 'undetermined' }>>;
  requestForegroundPermissionsAsync: jest.Mock<Promise<{ status: 'granted' | 'denied' | 'undetermined' }>>;
  getBackgroundPermissionsAsync: jest.Mock<Promise<{ status: 'granted' | 'denied' | 'undetermined' }>>;
  requestBackgroundPermissionsAsync: jest.Mock<Promise<{ status: 'granted' | 'denied' | 'undetermined' }>>;
};

describe('LocationPermissionService', () => {
  let moduleMock: ExpoLocationModule;
  let lastStatus: string;

  const setStoreState = () => {
    lastStatus = 'notRequested';
    (useAppStore.getState as jest.Mock).mockImplementation(() => ({
      setLocationOfferPreferences: (
        updater: (current: { osPermissionStatus: string; enabled: boolean }) => {
          osPermissionStatus: string;
          enabled: boolean;
        },
      ) => {
        const next = updater({ enabled: false, osPermissionStatus: lastStatus });
        lastStatus = next.osPermissionStatus;
      },
    }));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    setStoreState();
    moduleMock = {
      getForegroundPermissionsAsync: jest.fn(async () => ({ status: 'undetermined' })),
      requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
      getBackgroundPermissionsAsync: jest.fn(async () => ({ status: 'undetermined' })),
      requestBackgroundPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
    };
    (requireOptionalNativeModule as jest.Mock).mockReturnValue(moduleMock);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('maps foreground granted + background denied to foregroundOnly', async () => {
    const granted = await LocationPermissionService.requestOsPermission();

    expect(granted).toBe(false);
    expect(lastStatus).toBe('foregroundOnly');
  });

  it('shows blocked alert for denied location_offers permission', async () => {
    moduleMock.getForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });
    moduleMock.getBackgroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

    const ok = await LocationPermissionService.ensurePermissionWithRationale('location_offers');

    expect(ok).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Location is blocked',
      expect.any(String),
      expect.any(Array),
      expect.any(Object),
    );
  });

  it('re-syncs to authorized after settings-style background change', async () => {
    moduleMock.getForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    moduleMock.getBackgroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

    await LocationPermissionService.syncOsPermissionStatus();
    expect(lastStatus).toBe('foregroundOnly');

    moduleMock.getBackgroundPermissionsAsync.mockResolvedValue({ status: 'granted' });

    await LocationPermissionService.syncOsPermissionStatus();
    expect(lastStatus).toBe('authorized');
  });

  it('allows attach_place flow when location is foregroundOnly', async () => {
    moduleMock.getForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    moduleMock.getBackgroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

    const ok = await LocationPermissionService.ensurePermissionWithRationale('attach_place');

    expect(ok).toBe(true);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('keeps ftue flow non-alerting when foregroundOnly', async () => {
    moduleMock.getForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    moduleMock.getBackgroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

    const ok = await LocationPermissionService.ensurePermissionWithRationale('ftue');

    expect(ok).toBe(false);
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});
