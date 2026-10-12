import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { renderWithProviders } from '../../test/renderWithProviders';
import { goalFixture, resetAllStores } from '../../test/storeFixtures';
import { useAppStore } from '../../store/useAppStore';
import { GoalsScreen } from './GoalsScreen';

jest.mock('../../services/analytics/useAnalytics', () => ({
  useAnalytics: () => ({ capture: jest.fn() }),
}));
jest.mock('../ai/AgentWorkspace', () => ({ AgentWorkspace: () => null }));
jest.mock('../unifiedChat/UnifiedChatDrawer', () => ({ UnifiedChatDrawer: () => null }));
jest.mock('react-native-webview', () => ({ WebView: require('react-native').View }));
// Keep the actual screen, creation drawer content, buttons and navigation.
// Only replace the native sheet transport with its visibility contract.
jest.mock('../../ui/BottomDrawer', () => ({
  BottomDrawer: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
    visible ? children : null,
}));

const Stack = createNativeStackNavigator();

describe('Goals inventory creation entry point', () => {
  beforeEach(() => resetAllStores());

  it('opens goal creation from a populated inventory without a bottom navigation bar', () => {
    useAppStore.setState({ goals: [goalFixture({ title: 'Walk every day' })] });
    const screen = renderWithProviders(
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="GoalsList" component={GoalsScreen} />
      </Stack.Navigator>,
      { withNavigation: true },
    );

    expect(screen.queryByLabelText('Close new Goal')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Create a new goal' }));
    expect(screen.getByLabelText('Close new Goal')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Close new Goal'));
    expect(screen.queryByLabelText('Close new Goal')).toBeNull();
    expect(screen.getByRole('button', { name: 'Chat about goals' })).toBeTruthy();
  });
});
