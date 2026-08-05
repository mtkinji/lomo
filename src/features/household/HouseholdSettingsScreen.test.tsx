import { Share } from 'react-native';
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
const mockCreateHouseholdMemberInvite = jest.fn();
const mockPreviewHouseholdInvite = jest.fn();
const mockAcceptHouseholdMemberInvite = jest.fn();

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
  createHouseholdMemberInvite: (...args: unknown[]) => mockCreateHouseholdMemberInvite(...args),
  previewHouseholdInvite: (...args: unknown[]) => mockPreviewHouseholdInvite(...args),
  acceptHouseholdMemberInvite: (...args: unknown[]) => mockAcceptHouseholdMemberInvite(...args),
  buildHouseholdInviteUrl: (code: string) => `https://go.kwilt.app/open/household/${code.trim().toUpperCase()}`,
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
  navigation: { goBack: jest.fn(), navigate: jest.fn() },
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
    mockCreateHouseholdMemberInvite.mockReset().mockResolvedValue({
      code: 'CHILD12', expiresAt: '2026-08-05T00:00:00Z', role: 'child',
    });
    mockPreviewHouseholdInvite.mockReset().mockResolvedValue({
      householdName: 'My household',
      inviterDisplayName: 'Andrew',
      role: 'child',
      expiresAt: '2026-08-05T00:00:00Z',
    });
    mockAcceptHouseholdMemberInvite.mockReset().mockResolvedValue(familySnapshot);
    screenProps.navigation.navigate.mockReset();
  });

  it('creates the Household just in time when the first child is added', async () => {
    const { getByLabelText, getByText } = renderWithProviders(<HouseholdSettingsScreen {...screenProps} />);
    await waitFor(() => expect(getByText('Start with your people')).toBeTruthy());
    fireEvent.press(getByText('Add a child'));
    fireEvent.press(getByText('Create a profile'));
    fireEvent.changeText(getByLabelText('Child name'), 'Riley');
    fireEvent.press(getByText('Add child'));

    await waitFor(() => expect(mockAddDependentChild).toHaveBeenCalledWith(expect.anything(), {
      householdId: null,
      displayName: 'Riley',
      ownerDisplayName: 'Andrew',
    }));
    expect(await waitFor(() => getByText('Riley'))).toBeTruthy();
  });

  it('invites a child who already uses Kwilt without creating a profile', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
    const { getByLabelText, getByText } = renderWithProviders(<HouseholdSettingsScreen {...screenProps} />);
    await waitFor(() => expect(getByText('Start with your people')).toBeTruthy());

    fireEvent.press(getByText('Add a child'));
    fireEvent.press(getByText('Already uses Kwilt'));
    fireEvent.changeText(getByLabelText('Child account email'), 'charlie@example.com');
    fireEvent.press(getByText('Create invitation'));

    await waitFor(() => expect(mockCreateHouseholdMemberInvite).toHaveBeenCalledWith(expect.anything(), {
      householdId: null,
      role: 'child',
      invitedEmail: 'charlie@example.com',
      ownerDisplayName: 'Andrew',
    }));
    expect(mockAddDependentChild).not.toHaveBeenCalled();
    expect(getByText('Child invitation code: CHILD12')).toBeTruthy();
    fireEvent.press(getByText('Share invitation'));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://go.kwilt.app/open/household/CHILD12',
      message: expect.stringContaining('not your private Goals, chats, Money, or Activities'),
    }));
  });

  it('opens an invitation link at review without joining automatically', async () => {
    const linkedProps = {
      ...screenProps,
      route: {
        key: 'linked-household',
        name: 'SettingsHousehold',
        params: { inviteCode: 'child12' },
      },
    } as any;

    const { getByText } = renderWithProviders(<HouseholdSettingsScreen {...linkedProps} />);

    await waitFor(() => expect(mockPreviewHouseholdInvite).toHaveBeenCalledWith(
      expect.anything(),
      'CHILD12',
    ));
    expect(getByText('Andrew invited you')).toBeTruthy();
    expect(getByText('Join My household as a child.')).toBeTruthy();
    expect(mockAcceptHouseholdMemberInvite).not.toHaveBeenCalled();
  });

  it('reviews a child invitation before joining the Household', async () => {
    const { getByLabelText, getByText } = renderWithProviders(<HouseholdSettingsScreen {...screenProps} />);
    await waitFor(() => expect(getByText('Start with your people')).toBeTruthy());

    fireEvent.press(getByText('Join a household'));
    fireEvent.changeText(getByLabelText('Household invitation code'), 'child12');
    fireEvent.press(getByText('Review invitation'));

    await waitFor(() => expect(getByText('Andrew invited you')).toBeTruthy());
    expect(getByText('Join My household as a child.')).toBeTruthy();
    expect(mockAcceptHouseholdMemberInvite).not.toHaveBeenCalled();

    fireEvent.press(getByText('Join household'));

    await waitFor(() => expect(mockAcceptHouseholdMemberInvite).toHaveBeenCalledWith(expect.anything(), {
      code: 'child12',
      displayName: 'Andrew',
    }));
  });

  it('reveals only the household setup path the user chooses', async () => {
    const { getByLabelText, getByText, queryByLabelText } = renderWithProviders(<HouseholdSettingsScreen {...screenProps} />);
    await waitFor(() => expect(getByText('Start with your people')).toBeTruthy());

    expect(queryByLabelText('Child name')).toBeNull();
    expect(queryByLabelText('Caregiver email')).toBeNull();
    expect(queryByLabelText('Household invitation code')).toBeNull();

    fireEvent.press(getByText('Join a household'));

    expect(getByLabelText('Household invitation code')).toBeTruthy();
    expect(queryByLabelText('Child name')).toBeNull();
    expect(queryByLabelText('Caregiver email')).toBeNull();
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

  it('opens the selected child Screen Time setup after activation', async () => {
    mockGetHouseholdSnapshot.mockResolvedValue({
      ...familySnapshot,
      activations: [{
        childMembershipId: 'child-1',
        capabilityId: 'screen-time',
        state: 'pending_setup',
      }],
    });
    const { getAllByText, getByText } = renderWithProviders(<HouseholdSettingsScreen {...screenProps} />);

    await waitFor(() => expect(getByText("Riley's Screen Time")).toBeTruthy());
    expect(getAllByText('Set up').length).toBeGreaterThan(0);
    fireEvent.press(getByText("Riley's Screen Time"));

    expect(screenProps.navigation.navigate).toHaveBeenCalledWith('SettingsFamilyScreenTime', {
      childMembershipId: 'child-1',
      childDisplayName: 'Riley',
    });
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
