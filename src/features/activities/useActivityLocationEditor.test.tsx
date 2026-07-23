import { renderHook, waitFor } from '@testing-library/react-native';
import type { Activity } from '../../domain/types';
import { LocationPermissionService } from '../../services/LocationPermissionService';
import { useActivityLocationEditor } from './useActivityLocationEditor';

jest.mock('../../services/LocationPermissionService', () => ({
  LocationPermissionService: {
    requestOsPermission: jest.fn(async () => undefined),
    syncOsPermissionStatus: jest.fn(async () => undefined),
  },
}));

jest.mock('../../services/location/currentLocation', () => ({
  getCurrentLocationBestEffort: jest.fn(async () => null),
}));

describe('useActivityLocationEditor', () => {
  it('hydrates the saved location trigger when visible', async () => {
    const activity = {
      id: 'activity-1',
      location: {
        label: 'School',
        latitude: 39.7,
        longitude: -104.9,
        trigger: 'arrive',
        radiusM: 45.72,
      },
    } as Activity;
    const { result } = renderHook(() =>
      useActivityLocationEditor({
        visible: true,
        activity,
        updateActivity: jest.fn(),
        onClose: jest.fn(),
      }),
    );

    expect(result.current.previewLocation).toEqual({
      label: 'School',
      latitude: 39.7,
      longitude: -104.9,
    });
    expect(result.current.trigger).toBe('arrive');
    expect(result.current.radiusM).toBeCloseTo(45.72);
    expect(result.current.statusHint).toBeNull();
    await waitFor(() => expect(LocationPermissionService.syncOsPermissionStatus).toHaveBeenCalled());
  });
});
