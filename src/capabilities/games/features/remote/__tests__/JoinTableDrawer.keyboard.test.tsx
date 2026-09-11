import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { Dimensions, KeyboardAvoidingView } from 'react-native';
import { renderWithProviders } from '@/src/test/renderWithProviders';
import { JoinTableDrawer } from '../JoinTableDrawer';

jest.mock('@/src/capabilities/games/navigation/gamesRouter', () => ({ router: { replace: jest.fn() } }));
jest.mock('@/src/capabilities/games/remote/remoteBankClient', () => ({
  claimRemoteBankTableInvite: jest.fn(), previewOpenGameTableInvite: jest.fn(),
}));
jest.mock('@/src/capabilities/games/nearby/nearbyTables', () => ({
  nearbyTablesAvailable: () => false, browseNearbyTables: jest.fn(),
}));
jest.mock('@/src/capabilities/games/shell/AuthProvider', () => ({ useAuth: () => ({ session: null }) }));
jest.mock('@/src/capabilities/games/platform/auth', () => ({ permanentUserId: () => null }));
jest.mock('@/src/capabilities/games/players/useGamePlayerProfile', () => ({
  useGamePlayerProfile: () => ({ profile: null, loading: false }),
}));

it('keeps the join sheet anchored when the keyboard reduces its editing area', () => {
  const screen = renderWithProviders(<JoinTableDrawer visible onClose={jest.fn()} />);
  const surface = screen.getByTestId('bottom-drawer.surface');
  fireEvent(surface, 'layout', { persist: jest.fn(), nativeEvent: { layout: {
    x: 0, y: 180, width: 390, height: Dimensions.get('window').height - 180,
  } } });
  const keyboardHost = screen.UNSAFE_getByType(KeyboardAvoidingView);
  // The sheet-relative host accounts for its origin. An overlay-level host
  // instead moves the entire tall sheet above the screen when typing a code.
  expect(keyboardHost.props.keyboardVerticalOffset).toBe(180);
  expect(surface.findAllByType(KeyboardAvoidingView)).toHaveLength(1);
});
