import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { resetAllStores } from '../../test/storeFixtures';
import { useAppStore } from '../../store/useAppStore';
import type { HouseholdSnapshot } from './data/household';
import { HouseholdSettingsScreen } from './HouseholdSettingsScreen';

const mockGetHouseholdSnapshot = jest.fn();
const mockAddDependentChild = jest.fn();
const mockSetChildCapabilityActivation = jest.fn();
const mockSetCaregiverCapabilityGrant = jest.fn();
const mockCreateCaregiverInvite = jest.fn();
const mockAcceptCaregiverInvite = jest.fn();

jest.mock('../../services/backend/supabaseClient', () => ({
  getSupabaseClient: () => ({ rpc: jest.fn() }),
}));

jest.mock('./data/household', () => ({
  getHouseholdSnapshot: (...args: unknown[]) => mockGetHouseholdSnapshot(...args),
  addDependentChild: (...args: unknown[]) => mockAddDependentChild(...args),
  setChildCapabilityActivation: (...args: unknown[]) => mockSetChildCapabilityActivation(...args),
  setCaregiverCapabilityGrant: (...args: unknown[]) => mockSetCaregiverCapabilityGrant(...args),
  createCaregiverInvite: (...args: unknown[]) => mockCreateCaregiverInvite(...args),
  acceptCaregiverInvite: (...args: unknown[]) => mockAcceptCaregiverInvite(...args),
}));

const emptySnapshot: HouseholdSnapshot = {
  household: null,
  currentMembershipId: null,
  members: [],
  activations: [],
  grants: [],
};

const familySnapshot: HouseholdSnapshot = {
  household: { id: 'household-1', name: 'My household' },
  currentMembershipId: 'owner-1',
  members: [
    { id: 'owner-1', personId: 'person-1', displayName: 'Andrew', kind: 'adult', role: 'owner' },
    { id: 'child-1', personId: 'person-2', displayName: 'Riley', kind: 'dependent', role: 'child' },
    { id: 'child-2', personId: 'person-3', displayName: 'Casey', kind: 'dependent', role: 'child' },
  ],
  activations: [],
  grants: [],
};

const screenProps = {
  navigation: { goBack: jest.fn() },
  route: { key: 'household', name: 'SettingsHousehold' },
} as any;

describe('HouseholdSettingsScreen', () => {
  beforeEach(() => {
    resetAllStores();
    useAppStore.getState().setAuthIdentity({ userId: 'user-1', email: 'a@example.com', name: 'Andrew' });
    mockGetHouseholdSnapshot.mockReset().mockResolvedValue(emptySnapshot);
    mockAddDependentChild.mockReset().mockResolvedValue(familySnapshot);
    mockSetChildCapabilityActivation.mockReset().mockResolvedValue(familySnapshot);
    mockSetCaregiverCapabilityGrant.mockReset().mockResolvedValue(familySnapshot);
    mockCreateCaregiverInvite.mockReset().mockResolvedValue({ code: 'ABC123', expiresAt: '2026-08-04T00:00:00Z' });
    mockAcceptCaregiverInvite.mockReset().mockResolvedValue(familySnapshot);
  });

  it('creates the Household just in time when the first child is added', async () => {
    const { getByLabelText, getByText } = renderWithProviders(<HouseholdSettingsScreen {...screenProps} />);
    await waitFor(() => expect(getByText('Not set up yet')).toBeTruthy());
    fireEvent.changeText(getByLabelText('Child name'), 'Riley');
    fireEvent.press(getByText('Add child'));

    await waitFor(() => expect(mockAddDependentChild).toHaveBeenCalledWith(expect.anything(), {
      householdId: null,
      displayName: 'Riley',
      ownerDisplayName: 'Andrew',
    }));
    expect(await waitFor(() => getByText('Riley'))).toBeTruthy();
  });

  it('activates Screen Time for only the selected child', async () => {
    mockGetHouseholdSnapshot.mockResolvedValue(familySnapshot);
    const { getAllByLabelText, getByText } = renderWithProviders(<HouseholdSettingsScreen {...screenProps} />);
    await waitFor(() => expect(getByText('Casey')).toBeTruthy());

    fireEvent.press(getAllByLabelText('Screen Time')[0]);

    await waitFor(() => expect(mockSetChildCapabilityActivation).toHaveBeenCalledWith(expect.anything(), {
      childMembershipId: 'child-1',
      capabilityId: 'screen-time',
      enabled: true,
    }));
    expect(mockSetChildCapabilityActivation).toHaveBeenCalledTimes(1);
  });

  it('grants one caregiver authority for one child and capability', async () => {
    const withCaregiver: HouseholdSnapshot = {
      ...familySnapshot,
      members: [
        ...familySnapshot.members,
        { id: 'caregiver-1', personId: 'person-4', displayName: 'Blaire', kind: 'adult', role: 'caregiver' },
      ],
    };
    mockGetHouseholdSnapshot.mockResolvedValue(withCaregiver);
    mockSetCaregiverCapabilityGrant.mockResolvedValue(withCaregiver);
    const { getByLabelText, getByText } = renderWithProviders(<HouseholdSettingsScreen {...screenProps} />);
    await waitFor(() => expect(getByText("Blaire's access")).toBeTruthy());

    fireEvent.press(getByLabelText("Manage Riley's Screen Time"));

    await waitFor(() => expect(mockSetCaregiverCapabilityGrant).toHaveBeenCalledWith(expect.anything(), {
      caregiverMembershipId: 'caregiver-1',
      childMembershipId: 'child-1',
      capabilityId: 'screen-time',
      granted: true,
    }));
    expect(mockSetCaregiverCapabilityGrant).toHaveBeenCalledTimes(1);
  });
});
