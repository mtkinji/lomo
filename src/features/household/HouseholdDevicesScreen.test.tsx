import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { renderWithProviders } from '../../test/renderWithProviders';
import { resetAllStores } from '../../test/storeFixtures';
import { HouseholdDevicesScreen } from './HouseholdDevicesScreen';

const mockSnapshot = jest.fn();
const mockList = jest.fn();
const mockDesignate = jest.fn();
const mockSetMembers = jest.fn();
const mockUpdateDevice = jest.fn();
const mockRevoke = jest.fn();

jest.mock('../../services/installId', () => ({ getInstallId: async () => 'install-123' }));
jest.mock('../../services/backend/supabaseClient', () => ({ getSupabaseClient: () => ({ rpc: jest.fn() }) }));
jest.mock('./data/household', () => ({ getHouseholdSnapshot: (...args: unknown[]) => mockSnapshot(...args) }));
jest.mock('./data/householdDeviceParticipation', () => ({
  listHouseholdDevices: (...args: unknown[]) => mockList(...args),
  designateSharedHouseholdDevice: (...args: unknown[]) => mockDesignate(...args),
  setSharedHouseholdDeviceMembers: (...args: unknown[]) => mockSetMembers(...args),
  revokeHouseholdDevice: (...args: unknown[]) => mockRevoke(...args),
}));
jest.mock('./data/householdManagementActions', () => ({
  updateHouseholdDevice: (...args: unknown[]) => mockUpdateDevice(...args),
  revokeHouseholdDeviceReviewed: (...args: unknown[]) => mockRevoke(...args),
}));

const props = {
  navigation: { goBack: jest.fn(), navigate: jest.fn() },
  route: { key: 'devices', name: 'SettingsHouseholdDevices', params: { householdId: 'house-1' } },
} as unknown as Parameters<typeof HouseholdDevicesScreen>[0];

describe('HouseholdDevicesScreen', () => {
  beforeEach(() => {
    resetAllStores();
    useAppStore.getState().setAuthIdentity({ userId: 'user-1', name: 'Andrew' });
    mockSnapshot.mockReset().mockResolvedValue({
      household: { id: 'house-1', name: 'My household' }, currentMembershipId: 'owner-1',
      members: [
        { id: 'owner-1', personId: 'p1', displayName: 'Andrew', kind: 'adult', role: 'owner', updatedAt: '2026-08-27T18:00:00.000Z' },
        { id: 'child-1', personId: 'p2', displayName: 'Charlie', kind: 'dependent', role: 'child', updatedAt: '2026-08-27T18:00:00.000Z' },
        { id: 'child-2', personId: 'p3', displayName: 'Olive', kind: 'dependent', role: 'child', updatedAt: '2026-08-27T18:00:00.000Z' },
      ], activations: [], grants: [],
    });
    mockList.mockReset().mockResolvedValue([]);
    mockDesignate.mockReset().mockResolvedValue({ id: 'device-1', status: 'ready' });
    mockSetMembers.mockReset().mockResolvedValue(undefined);
    mockUpdateDevice.mockReset().mockImplementation(async (input) => ({ result: {
      id: 'device-1', householdId: 'house-1', kind: 'shared_household', childMembershipId: null,
      assignedCaregiverMembershipId: 'owner-1', installId: 'install-123', label: 'Shared iPad',
      platform: 'ipados', status: 'ready', memberIds: input.fields.memberIds ?? [],
      updatedAt: '2026-08-27T18:01:00.000Z',
    } }));
    mockRevoke.mockReset().mockImplementation(async (input) => ({ result: {
      id: input.deviceId, householdId: 'house-1', kind: 'shared_household', childMembershipId: null,
      assignedCaregiverMembershipId: 'owner-1', installId: 'install-123', label: 'Shared iPad',
      platform: 'ipados', status: 'revoked', memberIds: [], updatedAt: '2026-08-27T18:01:00.000Z',
    } }));
  });

  it('designates the signed-in iPad once, then selects eligible children without pairing', async () => {
    mockList.mockResolvedValueOnce([]).mockResolvedValue([{
      id: 'device-1', householdId: 'house-1', kind: 'shared_household', childMembershipId: null,
      assignedCaregiverMembershipId: 'owner-1', installId: 'install-123', label: 'Shared iPad',
      platform: 'ipados', status: 'ready', memberIds: [], updatedAt: '2026-08-27T18:00:00.000Z',
    }]);
    const { getByLabelText, getByText, queryByText } = renderWithProviders(<HouseholdDevicesScreen {...props} />);
    await waitFor(() => expect(getByText('Set up this iPad')).toBeTruthy());
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    expect(queryByText('Scan a code')).toBeNull();
    fireEvent.press(getByText('Set up this iPad'));
    await waitFor(() => expect(mockDesignate).toHaveBeenCalledWith(expect.anything(), {
      householdId: 'house-1', installId: 'install-123', label: 'Shared iPad', platform: 'ipados',
    }));
    await waitFor(() => expect(getByText("Who can use this iPad?")).toBeTruthy());
    fireEvent.press(getByLabelText('Charlie'));
    await waitFor(() => expect(mockUpdateDevice).toHaveBeenCalledWith(expect.objectContaining({
      householdId: 'house-1', deviceId: 'device-1', fields: { memberIds: ['child-1'] }, confirmed: true,
    }), expect.anything()));
  });

  it('requires explicit confirmation before removing shared Household Mode', async () => {
    mockList.mockResolvedValue([{
      id: 'device-1', householdId: 'house-1', kind: 'shared_household', childMembershipId: null,
      assignedCaregiverMembershipId: 'owner-1', installId: 'install-123', label: 'Shared iPad',
      platform: 'ipados', status: 'ready', memberIds: [], updatedAt: '2026-08-27T18:00:00.000Z',
    }]);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { getByText } = renderWithProviders(<HouseholdDevicesScreen {...props} />);
    await waitFor(() => expect(getByText('Remove this iPad')).toBeTruthy());

    fireEvent.press(getByText('Remove this iPad'));
    expect(mockRevoke).not.toHaveBeenCalled();
    const buttons = alert.mock.calls[0]?.[2] ?? [];
    act(() => buttons.find((button) => button.style === 'destructive')?.onPress?.());
    await waitFor(() => expect(mockRevoke).toHaveBeenCalledWith(expect.objectContaining({
      householdId: 'house-1', deviceId: 'device-1', expectedUpdatedAt: '2026-08-27T18:00:00.000Z', confirmed: true,
    }), expect.anything()));
    alert.mockRestore();
  });
});
