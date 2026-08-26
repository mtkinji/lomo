import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { renderWithProviders } from '../../test/renderWithProviders';
import { resetAllStores } from '../../test/storeFixtures';
import { HouseholdDeviceSetupScreen } from './HouseholdDeviceSetupScreen';

const mockCreate = jest.fn();
const mockList = jest.fn();
const mockCancel = jest.fn();
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('react-native-qrcode-svg', () => () => null);
jest.mock('../../services/backend/supabaseClient', () => ({ getSupabaseClient: () => ({ rpc: jest.fn() }) }));
jest.mock('./data/householdDeviceParticipation', () => ({
  buildHouseholdDeviceSetupUrl: (token: string) => `https://go.kwilt.app/open/household-device/${token}`,
  formatHouseholdDeviceManualCode: (code: string) => `${code.slice(0, 3)}-${code.slice(3)}`,
  createHouseholdDeviceSetupSession: (...args: unknown[]) => mockCreate(...args),
  listHouseholdDevices: (...args: unknown[]) => mockList(...args),
  cancelHouseholdDeviceSetupSession: (...args: unknown[]) => mockCancel(...args),
}));

const props = {
  navigation: { goBack: mockGoBack, navigate: mockNavigate },
  route: {
    key: 'device-setup', name: 'SettingsHouseholdDeviceSetup',
    params: { householdId: 'house-1', childMembershipId: 'child-1', childDisplayName: 'Charlie' },
  },
} as unknown as Parameters<typeof HouseholdDeviceSetupScreen>[0];

describe('HouseholdDeviceSetupScreen', () => {
  beforeEach(() => {
    resetAllStores();
    mockGoBack.mockReset();
    mockNavigate.mockReset();
    useAppStore.getState().setAuthIdentity({ userId: 'user-1', name: 'Andrew' });
    mockCreate.mockReset().mockResolvedValue({
      id: 'session-1', token: 'secret-1', manualCode: '482731',
      expiresAt: '2026-08-26T23:00:00Z', childMembershipId: 'child-1',
    });
    mockList.mockReset().mockResolvedValue([]);
    mockCancel.mockReset().mockResolvedValue(undefined);
  });

  it('renders one pairing receipt with Share in the header and Back as cancellation', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
    const { getByLabelText, getByText, queryByText } = renderWithProviders(<HouseholdDeviceSetupScreen {...props} />);
    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith(expect.anything(), 'child-1'));
    expect(queryByText('Continue')).toBeNull();
    expect(getByText("Scan this with Charlie's iPhone")).toBeTruthy();
    expect(getByText("Open Kwilt on Charlie's iPhone and scan this code. Charlie does not need a separate Kwilt account.")).toBeTruthy();
    expect(getByText('482-731')).toBeTruthy();
    expect(queryByText('Share link')).toBeNull();
    expect(queryByText('Cancel setup')).toBeNull();
    expect(queryByText('Use an existing Kwilt account')).toBeNull();

    fireEvent.press(getByLabelText('Share setup link for Charlie'));
    expect(share).toHaveBeenCalledWith({ message: 'https://go.kwilt.app/open/household-device/secret-1' });

    fireEvent.press(getByLabelText("Go back from Connect Charlie's iPhone"));
    await waitFor(() => expect(mockCancel).toHaveBeenCalledWith(expect.anything(), 'session-1'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('automatically replaces the pairing receipt when Charlie claims the device', async () => {
    jest.useFakeTimers();
    mockList
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        id: 'device-1', householdId: 'house-1', kind: 'personal_child',
        childMembershipId: 'child-1', assignedCaregiverMembershipId: null,
        installId: 'install-1', label: "Charlie's iPhone", platform: 'ios',
        status: 'ready', memberIds: [],
      }]);

    try {
      const { getByTestId, getByText, queryByText } = renderWithProviders(<HouseholdDeviceSetupScreen {...props} />);
      await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1));
      expect(getByText("Scan this with Charlie's iPhone")).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(3_000);
        await Promise.resolve();
      });

      expect(getByText("Charlie's device is connected")).toBeTruthy();
      expect(getByTestId('household-device-connected-illustration', { includeHiddenElements: true })).toBeTruthy();
      expect(queryByText('482-731')).toBeNull();
      expect(getByText('Done')).toBeTruthy();

      act(() => jest.advanceTimersByTime(6_000));
      expect(mockList).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });
});
