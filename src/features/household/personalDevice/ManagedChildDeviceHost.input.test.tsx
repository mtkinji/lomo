import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { ManagedChildDeviceHost } from './ManagedChildDeviceHost';
import { useManagedChildAccessStore } from './useManagedChildAccessStore';

jest.mock('../../../ui/layout/AppShell', () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('./managedChildAccess', () => ({ claimManagedChildSetup: jest.fn(), previewManagedChildSetup: jest.fn() }));

it('formats the setup draft and submits six normalized digits only on Continue', () => {
  const original = useManagedChildAccessStore.getState();
  const submitManualCode = jest.fn();
  useManagedChildAccessStore.setState({ access: null, pendingSetup: null, manualEntryOpen: true, submitManualCode });
  const view = renderWithProviders(<ManagedChildDeviceHost />);
  try {
    const input = () => view.getByLabelText('Device setup code');
    fireEvent.changeText(input(), '48273');
    expect(view.getByRole('button', { name: 'Continue' }).props.accessibilityState.disabled).toBe(true);
    fireEvent.changeText(input(), '482731');
    expect(input().props.value).toBe('482-731');
    expect(input().props.keyboardType).toBe('number-pad');
    expect(submitManualCode).not.toHaveBeenCalled();
    fireEvent.press(view.getByRole('button', { name: 'Continue' }));
    expect(submitManualCode).toHaveBeenCalledTimes(1);
    expect(submitManualCode).toHaveBeenCalledWith('482731');
  } finally {
    view.unmount();
    useManagedChildAccessStore.setState(original, true);
  }
});
