import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { ReactNode } from 'react';
import { renderWithProviders } from '../../test/renderWithProviders';
import {
  fetchExternalConnections,
  revokeExternalConnection,
} from '../../services/externalConnections';
import {
  ConnectedToolDetailScreen,
  ConnectedToolsScreen,
  ConnectKwiltAppScreen,
} from './ConnectedToolsScreen';

jest.mock('../../ui/layout/AppShell', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    AppShell: ({ children }: { children?: ReactNode }) =>
      React.createElement(View, { testID: 'app-shell' }, children),
  };
});

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const goBack = jest.fn();
  const reset = jest.fn();
  const navigate = jest.fn();
  const getState = jest.fn();
  const route = { params: {} };
  return {
    ...actual,
    useNavigation: () => ({ getState, goBack, navigate, reset }),
    useRoute: () => route,
    __navMocks: { getState, goBack, navigate, reset, route },
  };
});

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/externalConnections', () => ({
  fetchExternalConnections: jest.fn(),
  revokeExternalConnection: jest.fn(),
}));

const fetchConnectionsMock = fetchExternalConnections as jest.MockedFunction<typeof fetchExternalConnections>;
const revokeConnectionMock = revokeExternalConnection as jest.MockedFunction<typeof revokeExternalConnection>;
const navModule = require('@react-navigation/native') as {
  __navMocks: {
    getState: jest.Mock;
    goBack: jest.Mock;
    navigate: jest.Mock;
    reset: jest.Mock;
    route: { params: Record<string, unknown> };
  };
};

const activeConnection = {
  client_id: 'active-client',
  client_name: 'Claude',
  connection_type: 'oauth' as const,
  surface: 'claude',
  scope: 'read write',
  connected_at: '2026-08-01T12:00:00.000Z',
  last_used_at: '2026-08-04T15:00:00.000Z',
  revoked_at: null,
  write_count: 1,
  last_action_at: '2026-08-04T15:00:00.000Z',
};

const recentAction = {
  id: 'action-1',
  client_id: 'active-client',
  surface: 'claude',
  tool_name: 'capture_activity',
  tool_kind: 'write',
  object_type: 'activity',
  object_id: 'activity-1',
  success: true,
  error_code: null,
  result_status: 'created',
  result_summary: 'Captured “Walk with Mara” in Family.',
  created_at: '2026-08-04T15:00:00.000Z',
};

describe('ConnectedToolsScreen', () => {
  beforeEach(() => {
    fetchConnectionsMock.mockReset();
    revokeConnectionMock.mockReset().mockResolvedValue(undefined);
    (Clipboard.setStringAsync as jest.Mock).mockClear();
    navModule.__navMocks.getState.mockReset().mockReturnValue({
      routes: [{ name: 'SettingsConnectedTools' }],
    });
    navModule.__navMocks.goBack.mockReset();
    navModule.__navMocks.navigate.mockReset();
    navModule.__navMocks.reset.mockReset();
    navModule.__navMocks.route.params = {};
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a directly opened connections screen to Settings home', async () => {
    fetchConnectionsMock.mockResolvedValue({ connections: [], actions: [] });

    const { getByLabelText } = renderWithProviders(<ConnectedToolsScreen />);
    await waitFor(() => expect(fetchConnectionsMock).toHaveBeenCalled());

    fireEvent.press(getByLabelText('Go back from Apps & connections'));

    expect(navModule.__navMocks.goBack).not.toHaveBeenCalled();
    expect(navModule.__navMocks.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'SettingsHome' }],
    });
  });

  it('shows recognizable app destinations directly on the connections screen', async () => {
    fetchConnectionsMock.mockResolvedValue({ connections: [], actions: [] });

    const { getByText, getAllByText, getByLabelText, getByTestId, queryByText } = renderWithProviders(<ConnectedToolsScreen />);

    await waitFor(() => expect(fetchConnectionsMock).toHaveBeenCalled());
    expect(getByText('Use Kwilt in other apps')).toBeTruthy();
    expect(getByText(/Bring Kwilt’s tools into the AI apps you already use/)).toBeTruthy();
    expect(getByTestId('connected-app-logo-chatgpt')).toBeTruthy();
    expect(getByTestId('connected-app-logo-claude')).toBeTruthy();
    expect(getByTestId('connected-app-logo-cursor')).toBeTruthy();
    expect(getByTestId('connected-app-logo-codex')).toBeTruthy();
    expect(getByLabelText('Set up Kwilt in ChatGPT')).toBeTruthy();
    expect(getByLabelText('Set up Kwilt in Claude')).toBeTruthy();
    expect(getByLabelText('Set up Kwilt in Cursor')).toBeTruthy();
    expect(getByLabelText('Set up Kwilt in Codex')).toBeTruthy();
    expect(getByLabelText('Set up another MCP app')).toBeTruthy();
    expect(getAllByText('Set up')).toHaveLength(4);
    expect(queryByText('No apps connected')).toBeNull();
    expect(queryByText('Checking connections…')).toBeNull();
    expect(queryByText('Connect Kwilt')).toBeNull();
    expect(queryByText('Setup address')).toBeNull();
    expect(queryByText('Recent activity')).toBeNull();

    fireEvent.press(getByLabelText('Set up Kwilt in Claude'));
    expect(navModule.__navMocks.navigate).toHaveBeenCalledWith(
      'SettingsConnectKwiltApp',
      { app: 'claude' },
    );
  });

  it('opens a connected app instead of showing all activity on the list', async () => {
    fetchConnectionsMock.mockResolvedValue({
      connections: [activeConnection],
      actions: [recentAction],
    });

    const { getByLabelText, getByText, getByTestId, queryByText } = renderWithProviders(<ConnectedToolsScreen />);
    await waitFor(() => expect(getByText('1 connection · Last used Aug 4')).toBeTruthy());

    expect(queryByText('Recent activity')).toBeNull();
    expect(queryByText('No apps connected')).toBeNull();
    expect(getByTestId('connected-status-claude', { includeHiddenElements: true })).toBeTruthy();
    expect(queryByText('Connected')).toBeNull();
    fireEvent.press(getByLabelText('Manage Claude connection'));
    expect(navModule.__navMocks.navigate).toHaveBeenCalledWith(
      'SettingsConnectedToolDetail',
      { clientId: 'active-client' },
    );
  });

  it('keeps multiple connections reachable from their app row', async () => {
    fetchConnectionsMock.mockResolvedValue({
      connections: [
        activeConnection,
        {
          ...activeConnection,
          client_id: 'second-client',
          client_name: 'Claude desktop',
          last_used_at: '2026-08-05T15:00:00.000Z',
        },
      ],
      actions: [],
    });
    const alertSpy = jest.spyOn(Alert, 'alert');

    const { getByLabelText, getByText } = renderWithProviders(<ConnectedToolsScreen />);
    await waitFor(() => expect(getByText('2 connections · Last used Aug 5')).toBeTruthy());

    fireEvent.press(getByLabelText('Manage Claude connections'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Claude connections',
      'Choose a connection to manage.',
      expect.any(Array),
    );

    const buttons = alertSpy.mock.calls[0]?.[2] ?? [];
    const firstConnection = buttons.find((button) => button.text === 'Claude');
    firstConnection?.onPress?.();
    expect(navModule.__navMocks.navigate).toHaveBeenCalledWith(
      'SettingsConnectedToolDetail',
      { clientId: 'active-client' },
    );
  });

  it('keeps a retry action when connections cannot load', async () => {
    fetchConnectionsMock.mockRejectedValueOnce(new Error('The connection service is unavailable.'));

    const { getByText, getByLabelText } = renderWithProviders(<ConnectedToolsScreen />);

    await waitFor(() => expect(getByText('Connections unavailable')).toBeTruthy());
    expect(getByText('The connection service is unavailable.')).toBeTruthy();
    expect(getByLabelText('Try again')).toBeTruthy();
  });
});

describe('ConnectKwiltAppScreen', () => {
  beforeEach(() => {
    navModule.__navMocks.route.params = { app: 'claude' };
    (Clipboard.setStringAsync as jest.Mock).mockClear();
  });

  it('explains what the URL is and where it goes before copying it', async () => {
    const { getByText, getByLabelText, queryAllByTestId } = renderWithProviders(<ConnectKwiltAppScreen />);

    expect(getByText('Connect in three steps')).toBeTruthy();
    expect(getByText('1. Open Claude settings')).toBeTruthy();
    expect(getByText('2. Add a custom connector')).toBeTruthy();
    expect(getByText('3. Copy and paste Kwilt’s server URL')).toBeTruthy();
    expect(queryAllByTestId('settings.divider')).toHaveLength(0);
    expect(getByText(/asks for its MCP server or connector endpoint/)).toBeTruthy();
    expect(getByText(/won’t need to create or paste a token/)).toBeTruthy();
    expect(getByText('https://auth.kwilt.app/functions/v1/mcp')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByLabelText('Kwilt MCP server URL. Copy'));
    });

    expect(Clipboard.setStringAsync).toHaveBeenCalledWith(
      'https://auth.kwilt.app/functions/v1/mcp',
    );
    expect(getByLabelText('Kwilt MCP server URL. Copied')).toBeTruthy();
    expect(getByText('https://auth.kwilt.app/functions/v1/mcp')).toBeTruthy();
  });
});

describe('ConnectedToolDetailScreen', () => {
  beforeEach(() => {
    navModule.__navMocks.route.params = { clientId: 'active-client' };
    navModule.__navMocks.goBack.mockReset();
  });

  it('reveals access and activity for only the selected connection', async () => {
    fetchConnectionsMock.mockResolvedValue({
      connections: [activeConnection],
      actions: [
        recentAction,
        { ...recentAction, id: 'other-action', client_id: 'different-client', result_summary: 'Should stay hidden.' },
      ],
    });

    const { getByText, queryByText } = renderWithProviders(<ConnectedToolDetailScreen />);

    await waitFor(() => expect(getByText('Recent activity')).toBeTruthy());
    expect(getByText('Access')).toBeTruthy();
    expect(getByText('Captured “Walk with Mara” in Family.')).toBeTruthy();
    expect(queryByText('Should stay hidden.')).toBeNull();
    expect(getByText('Make changes you request')).toBeTruthy();
  });

  it('explains the consequence before disconnecting', async () => {
    fetchConnectionsMock
      .mockResolvedValueOnce({ connections: [activeConnection], actions: [] })
      .mockResolvedValueOnce({ connections: [activeConnection], actions: [] })
      .mockResolvedValueOnce({
        connections: [{ ...activeConnection, revoked_at: '2026-08-28T00:00:00.000Z' }],
        actions: [],
      });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    const { getByLabelText } = renderWithProviders(<ConnectedToolDetailScreen />);
    await waitFor(() => expect(getByLabelText('Disconnect')).toBeTruthy());

    fireEvent.press(getByLabelText('Disconnect'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Disconnect Claude?',
      'This app will no longer be able to view or change anything in Kwilt.',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Disconnect', style: 'destructive' }),
      ]),
    );

    const disconnectAction = alertSpy.mock.calls[0]?.[2]?.find((action) => action.text === 'Disconnect');
    await act(async () => {
      disconnectAction?.onPress?.();
    });
    expect(revokeConnectionMock).toHaveBeenCalledWith('active-client');
    expect(navModule.__navMocks.goBack).toHaveBeenCalled();
  });
});
