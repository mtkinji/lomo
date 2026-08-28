import { fireEvent } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn() }),
}));

jest.mock('../../services/ai', () => ({
  buildUserProfileSummary: () => 'A bounded inferred summary.',
}));

import { renderWithProviders } from '../../test/renderWithProviders';
import { resetAllStores } from '../../test/storeFixtures';
import { useAppStore } from '../../store/useAppStore';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import { AiModelSettingsScreen } from './AiModelSettingsScreen';

test('selects and confirms a model against the live store instead of a stale render', () => {
  resetAllStores();
  useAppStore.setState({ llmModel: 'gpt-5.2' });
  useEntitlementsStore.setState({ isPro: true });
  const { getByLabelText } = renderWithProviders(<AiModelSettingsScreen />);

  fireEvent.press(getByLabelText('Balanced'));

  expect(useAppStore.getState().llmModel).toBe('gpt-4o');
  expect(getByLabelText('Balanced').props.accessibilityState).toMatchObject({ checked: true });
});
