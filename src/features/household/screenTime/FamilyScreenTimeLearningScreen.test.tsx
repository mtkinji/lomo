import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { resetAllStores, setProEntitlement } from '../../../test/storeFixtures';
import { useAppStore } from '../../../store/useAppStore';
import { FamilyScreenTimeLearningScreen } from './FamilyScreenTimeLearningScreen';
import {
  familyScreenTimeLearningKey,
  resetFamilyScreenTimeLearningStoreForTests,
  useFamilyScreenTimeLearningStore,
} from './useFamilyScreenTimeLearningStore';

const mockSimulatePolicyDelivery = jest.fn();
const mockListDevices = jest.fn();

jest.mock('./simulatedFamilyScreenTimeDevice', () => ({
  simulateFamilyScreenTimePolicyDelivery: (...args: unknown[]) => mockSimulatePolicyDelivery(...args),
}));
jest.mock('../../../services/backend/supabaseClient', () => ({ getSupabaseClient: () => ({ rpc: jest.fn() }) }));
jest.mock('../data/householdDeviceParticipation', () => ({
  listHouseholdDevices: (...args: unknown[]) => mockListDevices(...args),
}));

const screenProps = {
  navigation: { goBack: jest.fn(), navigate: jest.fn() },
  now: () => new Date('2026-07-30T15:00:00.000Z'),
  route: {
    key: 'family-screen-time',
    name: 'SettingsFamilyScreenTime',
    params: { householdId: 'household-1', childMembershipId: 'child-1', childDisplayName: 'Charlie' },
  },
};

const recordKey = familyScreenTimeLearningKey('user-1', 'child-1');

describe('FamilyScreenTimeLearningScreen', () => {
  beforeEach(() => {
    resetAllStores();
    setProEntitlement(true);
    resetFamilyScreenTimeLearningStoreForTests();
    useAppStore.getState().setAuthIdentity({ userId: 'user-1', email: 'a@example.com', name: 'Andrew' });
    screenProps.navigation.navigate.mockReset();
    mockListDevices.mockReset().mockResolvedValue([]);
    mockSimulatePolicyDelivery.mockReset().mockResolvedValue({
      policyVersion: 1,
      acknowledgedAtIso: '2026-07-29T22:00:01.000Z',
    });
  });

  it('shows one device setup sentence and one action before setup', () => {
    const { getAllByRole, getByText, queryByText } = renderWithProviders(
      <FamilyScreenTimeLearningScreen {...screenProps} />,
    );

    expect(getByText('Set up a device for Charlie to continue.')).toBeTruthy();
    expect(getByText('Set up a device')).toBeTruthy();
    expect(getAllByRole('button')).toHaveLength(2); // Back and the one screen action.
    expect(queryByText('One clear agreement')).toBeNull();
    expect(queryByText('Delivery')).toBeNull();
    expect(queryByText(/simulated|Apple authorization/i)).toBeNull();

    fireEvent.press(getByText('Set up a device'));
    expect(screenProps.navigation.navigate).toHaveBeenCalledWith('SettingsHouseholdDeviceSetup', {
      householdId: 'household-1',
      childMembershipId: 'child-1',
      childDisplayName: 'Charlie',
    });
  });

  it('shows the starter agreement once with one activation action when ready', () => {
    useFamilyScreenTimeLearningStore.getState().prepareSimulatedDevice(recordKey);

    const { getAllByText, getByText, queryByText } = renderWithProviders(
      <FamilyScreenTimeLearningScreen {...screenProps} />,
    );

    expect(getAllByText('Games')).toHaveLength(1);
    expect(getByText('Weekdays, 4–7 PM · 30 min/day')).toBeTruthy();
    expect(getByText('Turn on')).toBeTruthy();
    expect(queryByText(/available on school days from/i)).toBeNull();
    expect(queryByText('Delivery')).toBeNull();
  });

  it('moves from applying to the compact applied agreement', async () => {
    let resolveDelivery: ((receipt: { policyVersion: number; acknowledgedAtIso: string }) => void) | null = null;
    mockSimulatePolicyDelivery.mockImplementation((policyVersion: number) => new Promise((resolve) => {
      expect(policyVersion).toBe(1);
      resolveDelivery = resolve;
    }));
    useFamilyScreenTimeLearningStore.getState().prepareSimulatedDevice(recordKey);

    const { getAllByText, getByText, queryByText } = renderWithProviders(
      <FamilyScreenTimeLearningScreen {...screenProps} />,
    );

    fireEvent.press(getByText('Turn on'));
    expect(getByText('Applying to Charlie’s iPhone…')).toBeTruthy();
    expect(queryByText('Turn on')).toBeNull();

    await act(async () => {
      resolveDelivery?.({
        policyVersion: 1,
        acknowledgedAtIso: '2026-07-29T22:00:01.000Z',
      });
    });

    await waitFor(() => expect(getByText('Edit')).toBeTruthy());
    expect(getAllByText('Games')).toHaveLength(1);
    expect(getByText('Games open at 4:00 PM.')).toBeTruthy();
    expect(queryByText(/will follow this agreement after device setup/i)).toBeNull();
  });

  it('edits the schedule and reapplies the changed agreement', async () => {
    const store = useFamilyScreenTimeLearningStore.getState();
    store.prepareSimulatedDevice(recordKey);
    const firstVersion = store.activateAgreement(recordKey, '2026-07-29T22:00:00.000Z');
    store.acknowledgePolicy(recordKey, firstVersion, '2026-07-29T22:00:01.000Z');
    let resolveDelivery: ((receipt: { policyVersion: number; acknowledgedAtIso: string }) => void) | null = null;
    mockSimulatePolicyDelivery.mockImplementation((policyVersion: number) => new Promise((resolve) => {
      expect(policyVersion).toBe(2);
      resolveDelivery = resolve;
    }));

    const { getByText } = renderWithProviders(<FamilyScreenTimeLearningScreen {...screenProps} />);
    fireEvent.press(getByText('Edit'));

    expect(getByText('When can Games start?')).toBeTruthy();
    expect(getByText('How much each day?')).toBeTruthy();
    fireEvent.press(getByText('5 PM'));
    fireEvent.press(getByText('45 min'));
    fireEvent.press(getByText('Save changes'));

    expect(getByText('Applying to Charlie’s iPhone…')).toBeTruthy();
    await act(async () => {
      resolveDelivery?.({
        policyVersion: 2,
        acknowledgedAtIso: '2026-07-30T22:00:01.000Z',
      });
    });
    await waitFor(() => expect(getByText('Weekdays, 5–7 PM · 45 min/day')).toBeTruthy());
  });

  it('retries the same desired policy version after delivery fails', async () => {
    mockSimulatePolicyDelivery
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({
        policyVersion: 1,
        acknowledgedAtIso: '2026-07-30T22:00:01.000Z',
      });
    useFamilyScreenTimeLearningStore.getState().prepareSimulatedDevice(recordKey);

    const { getByText } = renderWithProviders(<FamilyScreenTimeLearningScreen {...screenProps} />);
    fireEvent.press(getByText('Turn on'));

    await waitFor(() => expect(getByText('Fix device')).toBeTruthy());
    expect(useFamilyScreenTimeLearningStore.getState().records[recordKey].desiredPolicyVersion).toBe(1);

    fireEvent.press(getByText('Fix device'));

    await waitFor(() => expect(getByText('Edit')).toBeTruthy());
    expect(mockSimulatePolicyDelivery).toHaveBeenNthCalledWith(1, 1);
    expect(mockSimulatePolicyDelivery).toHaveBeenNthCalledWith(2, 1);
    expect(useFamilyScreenTimeLearningStore.getState().records[recordKey].desiredPolicyVersion).toBe(1);
  });
});
