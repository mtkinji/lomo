import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import { resetAllStores } from '../../test/storeFixtures';
import { DestinationDetailScreen } from './DestinationDetailScreen';

const mockNavigation = { goBack: jest.fn() };
const mockInstall = jest.fn().mockResolvedValue({ id: 'destination-1' });
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: { mode: 'create', definitionId: 'cursor' } }),
}));
jest.mock('../../services/backend/auth', () => ({ ensureSignedInWithPrompt: jest.fn().mockResolvedValue(undefined) }));
jest.mock('./actions/executionTargetActionsBoundary', () => ({ executionTargetActions: {
  loadNativeInventory: jest.fn().mockResolvedValue({ definitions: [{ id: 'cursor', kind: 'cursor_repo', display_name: 'Cursor' }], targets: [] }),
  createNativeCursor: (...args: unknown[]) => mockInstall(...args),
} }));
jest.mock('../../ui/layout/AppShell', () => {
  const { View } = jest.requireActual('react-native');
  return { AppShell: View };
});

it('allows separate command lines and saves them only through Install', async () => {
  resetAllStores();
  useEntitlementsStore.setState({ isPro: true });
  const screen = renderWithProviders(<DestinationDetailScreen />);
  await waitFor(() => expect(screen.getByLabelText('Verification commands (one per line)')).toBeTruthy());
  const input = screen.getByLabelText('Verification commands (one per line)');
  expect(input.props.multiline).toBe(true);
  fireEvent.changeText(screen.getByLabelText('Display name'), 'My repo');
  fireEvent.changeText(screen.getByLabelText('Repo name'), 'my-repo');
  fireEvent.changeText(input, ' npm test\n\n npm run lint ');
  fireEvent(input, 'blur');
  expect(mockInstall).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Install'));
  await waitFor(() => expect(mockInstall).toHaveBeenCalledWith(expect.objectContaining({ verificationCommands: ['npm test', 'npm run lint'] })));
});
