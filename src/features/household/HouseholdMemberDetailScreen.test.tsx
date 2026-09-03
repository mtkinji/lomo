import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { resetAllStores } from '../../test/storeFixtures';
import { useAppStore } from '../../store/useAppStore';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import { usePaywallStore } from '../../store/usePaywallStore';
import { HouseholdMemberDetailScreen } from './HouseholdMemberDetailScreen';

const mockSnapshot = jest.fn();
const mockResolve = jest.fn();
const mockRemove = jest.fn();
const mockUpload = jest.fn();
const mockLaunchImageLibrary = jest.fn();
const mockListDevices = jest.fn();
const mockRevokeDevice = jest.fn();
const mockUpdateMember = jest.fn();
const mockPreviewRemoval = jest.fn();
const mockRemoveMember = jest.fn();

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunchImageLibrary(...args),
}));
jest.mock('expo-file-system', () => ({ File: class { size = 321; type = 'image/jpeg'; } }));

jest.mock('../../services/backend/supabaseClient', () => ({ getSupabaseClient: () => ({ rpc: jest.fn() }) }));
jest.mock('./data/household', () => ({ getHouseholdSnapshot: (...args: unknown[]) => mockSnapshot(...args) }));
jest.mock('./data/householdAvatars', () => ({
  resolveHouseholdAvatars: (...args: unknown[]) => mockResolve(...args),
  uploadAvatar: (...args: unknown[]) => mockUpload(...args),
  removeAvatar: (...args: unknown[]) => mockRemove(...args),
}));
jest.mock('./data/householdDeviceParticipation', () => ({
  listHouseholdDevices: (...args: unknown[]) => mockListDevices(...args),
  revokeHouseholdDevice: (...args: unknown[]) => mockRevokeDevice(...args),
}));
jest.mock('./data/householdManagementActions', () => ({
  revokeHouseholdDeviceReviewed: (...args: unknown[]) => mockRevokeDevice(...args),
  updateHouseholdMember: (...args: unknown[]) => mockUpdateMember(...args),
  previewHouseholdMemberRemoval: (...args: unknown[]) => mockPreviewRemoval(...args),
  removeHouseholdMemberReviewed: (...args: unknown[]) => mockRemoveMember(...args),
}));

const baseSnapshot = {
  household: { id: 'household-1', name: 'My household' },
  currentMembershipId: 'owner-1',
  members: [
    { id: 'owner-1', personId: 'person-1', displayName: 'Andrew', kind: 'adult', role: 'owner', updatedAt: '2026-08-27T18:00:00.000Z', avatarUrl: null, avatarSource: 'initials' },
    { id: 'child-1', personId: 'person-2', displayName: 'Riley', kind: 'dependent', role: 'child', updatedAt: '2026-08-27T18:00:00.000Z', avatarUrl: null, avatarSource: 'initials' },
  ],
  activations: [], grants: [],
};

const props = {
  navigation: { goBack: jest.fn(), navigate: jest.fn() },
  route: { key: 'member', name: 'SettingsHouseholdMember', params: { membershipId: 'child-1' } },
} as any;

describe('HouseholdMemberDetailScreen', () => {
  beforeEach(() => {
    resetAllStores();
    props.navigation.goBack.mockReset();
    props.navigation.navigate.mockReset();
    useAppStore.getState().setAuthIdentity({ userId: 'user-1', name: 'Andrew' });
    useEntitlementsStore.setState({ isPro: true });
    mockSnapshot.mockReset().mockResolvedValue(baseSnapshot);
    mockResolve.mockReset().mockResolvedValue({});
    mockRemove.mockReset().mockResolvedValue({ avatarSource: 'initials', avatarUrl: null });
    mockUpload.mockReset();
    mockLaunchImageLibrary.mockReset();
    mockListDevices.mockReset().mockResolvedValue([]);
    mockRevokeDevice.mockReset().mockImplementation(async (input) => ({ result: {
      id: input.deviceId, householdId: 'household-1', kind: 'personal_child', childMembershipId: 'child-1',
      assignedCaregiverMembershipId: null, installId: 'install-123', label: "Riley's iPhone",
      platform: 'ios', status: 'revoked', memberIds: [], updatedAt: '2026-08-27T18:01:00.000Z',
    } }));
    mockUpdateMember.mockReset();
    mockPreviewRemoval.mockReset();
    mockRemoveMember.mockReset();
  });

  it('lets the owner explicitly confirm revoking a connected personal device', async () => {
    mockListDevices.mockResolvedValue([{
      id: 'device-1', householdId: 'household-1', kind: 'personal_child', childMembershipId: 'child-1',
      assignedCaregiverMembershipId: null, installId: 'install-123', label: "Riley's iPhone",
      platform: 'ios', status: 'ready', memberIds: [], updatedAt: '2026-08-27T18:00:00.000Z',
    }]);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { getByText, queryByText } = renderWithProviders(<HouseholdMemberDetailScreen {...props} />);
    await waitFor(() => expect(getByText("Riley's iPhone")).toBeTruthy());

    fireEvent.press(getByText("Riley's iPhone"));
    expect(mockRevokeDevice).not.toHaveBeenCalled();
    const buttons = alert.mock.calls[0]?.[2] ?? [];
    act(() => buttons.find((button) => button.style === 'destructive')?.onPress?.());
    await waitFor(() => expect(mockRevokeDevice).toHaveBeenCalledWith(expect.objectContaining({
      householdId: 'household-1', deviceId: 'device-1', expectedUpdatedAt: '2026-08-27T18:00:00.000Z', confirmed: true,
    }), expect.anything()));
    await waitFor(() => expect(queryByText("Riley's iPhone")).toBeNull());
    expect(getByText('No device connected')).toBeTruthy();
    alert.mockRestore();
  });

  it('does not show devices that were already revoked', async () => {
    mockListDevices.mockResolvedValue([{
      id: 'device-1', householdId: 'household-1', kind: 'personal_child', childMembershipId: 'child-1',
      assignedCaregiverMembershipId: null, installId: 'install-123', label: "Riley's old iPhone",
      platform: 'ios', status: 'revoked', memberIds: [], updatedAt: '2026-08-27T18:01:00.000Z',
    }]);

    const { getByText, queryByText } = renderWithProviders(<HouseholdMemberDetailScreen {...props} />);

    await waitFor(() => expect(getByText('No device connected')).toBeTruthy());
    expect(queryByText("Riley's old iPhone")).toBeNull();
  });

  it('lets the owner add a photo to an accountless child', async () => {
    const { getByLabelText, getByText, queryByText } = renderWithProviders(<HouseholdMemberDetailScreen {...props} />);
    await waitFor(() => expect(getByLabelText('Update Riley photo')).toBeTruthy());
    expect(queryByText('Add photo')).toBeNull();
    fireEvent.press(getByLabelText('Update Riley photo'));
    expect(getByText('Choose from library')).toBeTruthy();
  });

  it('offers optional personal-device setup without requiring a child account', async () => {
    const { getByText, queryByText } = renderWithProviders(<HouseholdMemberDetailScreen {...props} />);
    await waitFor(() => expect(getByText('No device connected')).toBeTruthy());
    expect(queryByText('Riley can still participate in your household without one.')).toBeNull();
    fireEvent.press(getByText("Connect Riley's device"));
    expect(props.navigation.navigate).toHaveBeenCalledWith('SettingsHouseholdDeviceSetup', {
      childMembershipId: 'child-1', childDisplayName: 'Riley', householdId: 'household-1',
    });
  });

  it('gives a managed child a private help action for another Household member', async () => {
    mockSnapshot.mockResolvedValue({
      ...baseSnapshot,
      currentMembershipId: 'child-1',
    });
    const ownerProps = {
      ...props,
      route: { ...props.route, params: { membershipId: 'owner-1' } },
    };

    const { getByText } = renderWithProviders(<HouseholdMemberDetailScreen {...ownerProps} />);

    await waitFor(() => expect(getByText('Get help with this person')).toBeTruthy());
    expect(getByText('Your report stays private from Household members.')).toBeTruthy();
  });

  it('keeps named-child Household device connection in Pro', async () => {
    useEntitlementsStore.setState({ isPro: false });
    const { getByText } = renderWithProviders(<HouseholdMemberDetailScreen {...props} />);
    await waitFor(() => expect(getByText('No device connected')).toBeTruthy());

    fireEvent.press(getByText("Connect Riley's device"));

    expect(props.navigation.navigate).not.toHaveBeenCalledWith('SettingsHouseholdDeviceSetup', expect.anything());
    expect(usePaywallStore.getState()).toMatchObject({
      visible: true,
      reason: 'pro_family_screen_time',
      source: 'screen_time_family',
    });
  });

  it('uses a connected child account photo without caregiver editing', async () => {
    mockResolve.mockResolvedValue({
      'child-1': { avatarSource: 'account', avatarUrl: 'https://signed.test/riley' },
    });
    const { getByText, queryByLabelText, queryByText } = renderWithProviders(<HouseholdMemberDetailScreen {...props} />);
    await waitFor(() => expect(getByText("Photo comes from Riley's Kwilt account.")).toBeTruthy());
    expect(queryByLabelText('Update Riley photo')).toBeNull();
    expect(queryByText('Add photo')).toBeNull();
  });

  it('confirms a selected dependent photo before replacing the visible avatar', async () => {
    mockLaunchImageLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///riley.jpg', mimeType: 'image/jpeg', fileSize: 321 }],
    });
    mockUpload.mockResolvedValue({ avatarSource: 'dependent', avatarUrl: 'https://signed.test/riley-new' });
    const { getByLabelText, getByText } = renderWithProviders(<HouseholdMemberDetailScreen {...props} />);
    await waitFor(() => expect(getByLabelText('Update Riley photo')).toBeTruthy());
    fireEvent.press(getByLabelText('Update Riley photo'));
    fireEvent.press(getByText('Choose from library'));

    await waitFor(() => expect(mockUpload).toHaveBeenCalledWith({
      source: 'dependent', membershipId: 'child-1', fileUri: 'file:///riley.jpg',
      mimeType: 'image/jpeg', sizeBytes: 321,
    }));
    expect(getByLabelText('Update Riley photo')).toBeTruthy();
  });
});
