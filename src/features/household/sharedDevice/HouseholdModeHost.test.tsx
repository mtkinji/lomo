import { fireEvent, waitFor } from '@testing-library/react-native';
import { useAppStore } from '../../../store/useAppStore';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { resetAllStores } from '../../../test/storeFixtures';
import { HouseholdModeHost } from './HouseholdModeHost';
import { useHouseholdModeStore } from './useHouseholdModeStore';

const mockSignOut = jest.fn();
const mockReconcile = jest.fn();
jest.mock('../../../services/backend/supabaseClient', () => ({
  getSupabaseClient: () => ({ auth: { signOut: (...args: unknown[]) => mockSignOut(...args) } }),
}));
jest.mock('./householdModeReconciliation', () => ({
  reconcileHouseholdModeSession: (...args: unknown[]) => mockReconcile(...args),
}));

describe('HouseholdModeHost', () => {
  beforeEach(() => {
    resetAllStores();
    useHouseholdModeStore.getState().reset();
    useAppStore.getState().setAuthIdentity({ userId: 'caregiver-user', name: 'Andrew' });
    useHouseholdModeStore.getState().enter({
      deviceId: 'device-1', householdId: 'house-1', assignedCaregiverUserId: 'caregiver-user',
      assignedCaregiverName: 'Andrew', members: [{ id: 'child-1', displayName: 'Charlie', capabilityIds: [] }],
    });
    mockSignOut.mockReset().mockResolvedValue({ error: null });
    mockReconcile.mockReset().mockImplementation(async (_client: unknown, session: unknown) => session);
  });

  it('clears the old caregiver identity before arming fresh sign-in', async () => {
    const { getByRole } = renderWithProviders(<HouseholdModeHost />);
    await waitFor(() => expect(mockReconcile).toHaveBeenCalled());
    const button = await waitFor(() => {
      const candidate = getByRole('button', { name: 'Caregiver sign in' });
      expect(candidate.props.accessibilityState?.disabled).toBe(false);
      return candidate;
    });
    fireEvent.press(button);
    await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
    await waitFor(() => expect(useAppStore.getState().authIdentity).toBeNull());
    expect(useHouseholdModeStore.getState().session?.requiresCaregiverReauthentication).toBe(true);
  });

  it('requires caregiver reauthentication when the shared device was revoked remotely', async () => {
    mockReconcile.mockResolvedValue(null);
    renderWithProviders(<HouseholdModeHost />);

    await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
    expect(useAppStore.getState().authIdentity).toBeNull();
    expect(useHouseholdModeStore.getState().session?.requiresCaregiverReauthentication).toBe(true);
  });

  it('fails persisted member access closed while server authority is unavailable', async () => {
    mockReconcile.mockRejectedValue(new Error('offline'));
    const { getByText, queryByText } = renderWithProviders(<HouseholdModeHost />);

    await waitFor(() => expect(getByText('Household Mode is unavailable')).toBeTruthy());
    expect(queryByText('Charlie')).toBeNull();
    expect(useHouseholdModeStore.getState().session).toMatchObject({
      verification: 'unavailable', members: [], activeMemberId: null,
    });
  });
});
