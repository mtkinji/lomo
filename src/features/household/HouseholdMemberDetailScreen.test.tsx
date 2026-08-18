import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { resetAllStores } from '../../test/storeFixtures';
import { useAppStore } from '../../store/useAppStore';
import { HouseholdMemberDetailScreen } from './HouseholdMemberDetailScreen';

const mockSnapshot = jest.fn();
const mockResolve = jest.fn();
const mockRemove = jest.fn();
const mockUpload = jest.fn();
const mockLaunchImageLibrary = jest.fn();

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

const baseSnapshot = {
  household: { id: 'household-1', name: 'My household' },
  currentMembershipId: 'owner-1',
  members: [
    { id: 'owner-1', personId: 'person-1', displayName: 'Andrew', kind: 'adult', role: 'owner', avatarUrl: null, avatarSource: 'initials' },
    { id: 'child-1', personId: 'person-2', displayName: 'Riley', kind: 'dependent', role: 'child', avatarUrl: null, avatarSource: 'initials' },
  ],
  activations: [], grants: [],
};

const props = {
  navigation: { goBack: jest.fn() },
  route: { key: 'member', name: 'SettingsHouseholdMember', params: { membershipId: 'child-1' } },
} as any;

describe('HouseholdMemberDetailScreen', () => {
  beforeEach(() => {
    resetAllStores();
    useAppStore.getState().setAuthIdentity({ userId: 'user-1', name: 'Andrew' });
    mockSnapshot.mockReset().mockResolvedValue(baseSnapshot);
    mockResolve.mockReset().mockResolvedValue({});
    mockRemove.mockReset().mockResolvedValue({ avatarSource: 'initials', avatarUrl: null });
    mockUpload.mockReset();
    mockLaunchImageLibrary.mockReset();
  });

  it('lets the owner add a photo to an accountless child', async () => {
    const { getByLabelText, getByText } = renderWithProviders(<HouseholdMemberDetailScreen {...props} />);
    await waitFor(() => expect(getByText('Add photo')).toBeTruthy());
    expect(getByLabelText('Update Riley photo')).toBeTruthy();
    fireEvent.press(getByText('Add photo'));
    expect(getByText('Choose from library')).toBeTruthy();
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
    await waitFor(() => expect(getByText('Add photo')).toBeTruthy());
    fireEvent.press(getByText('Add photo'));
    fireEvent.press(getByText('Choose from library'));

    await waitFor(() => expect(mockUpload).toHaveBeenCalledWith({
      source: 'dependent', membershipId: 'child-1', fileUri: 'file:///riley.jpg',
      mimeType: 'image/jpeg', sizeBytes: 321,
    }));
    expect(getByLabelText('Update Riley photo')).toBeTruthy();
  });
});
