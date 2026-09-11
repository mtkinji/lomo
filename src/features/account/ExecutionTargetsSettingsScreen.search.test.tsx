import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { resetAllStores } from '../../test/storeFixtures';
import { useAppStore } from '../../store/useAppStore';
import { ExecutionTargetsSettingsScreen } from './ExecutionTargetsSettingsScreen';

const mockNavigate = jest.fn();
const mockLoadInventory = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));
jest.mock('../../services/backend/auth', () => ({ ensureSignedInWithPrompt: jest.fn().mockResolvedValue(undefined) }));
jest.mock('./actions/executionTargetActionsBoundary', () => ({
  executionTargetActions: { loadNativeInventory: () => mockLoadInventory() },
}));
jest.mock('../../ui/layout/AppShell', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { AppShell: ({ children }: { children: React.ReactNode }) => React.createElement(View, {}, children) };
});
jest.mock('../../ui/BottomDrawer', () => {
  const React = require('react');
  const { View, ScrollView } = require('react-native');
  return {
    BottomDrawer: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
      visible ? React.createElement(View, { testID: 'library-drawer' }, children) : null,
    BottomDrawerScrollView: ScrollView,
  };
});

describe('Destination library query composition', () => {
  beforeEach(() => {
    resetAllStores();
    jest.clearAllMocks();
    mockLoadInventory.mockResolvedValue({ definitions: [
      { id: 'lunar', kind: 'link', display_name: 'Lunar documents', description: 'Read a document' },
      { id: 'garden', kind: 'link', display_name: 'Garden drafts', description: 'Write a draft' },
    ], targets: [] });
  });

  it.each(['inline', 'drawer'] as const)('clears the %s query without installing or navigating', async (mode) => {
    useAppStore.setState({ enabledSendToDestinations: mode === 'drawer' ? { amazon: true } : {} });
    const view = renderWithProviders(<ExecutionTargetsSettingsScreen />);
    await waitFor(() => expect(mockLoadInventory).toHaveBeenCalledTimes(1));
    if (mode === 'drawer') fireEvent.press(view.getByLabelText('Add destination'));
    await waitFor(() => expect(view.getByText('Garden drafts')).toBeTruthy());
    fireEvent.changeText(view.getByPlaceholderText('Search destinations'), 'Lunar');
    expect(view.queryByText('Garden drafts')).toBeNull();
    expect(view.getByText('Lunar documents')).toBeTruthy();
    fireEvent.press(view.getByLabelText('Clear destination search'));
    expect(view.getByText('Garden drafts')).toBeTruthy();
    expect(view.getByPlaceholderText('Search destinations').props.value).toBe('');
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockLoadInventory).toHaveBeenCalledTimes(1);
    if (mode === 'drawer') expect(view.getByTestId('library-drawer')).toBeTruthy();
  });
});
