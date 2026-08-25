import { Pressable } from '@/src/ui/HapticPressable';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  SettingsDivider,
  SettingsCopyField,
  SettingsGroup,
  SettingsInstructionSection,
  SettingsPage,
  SettingsRow,
} from '../../ui/SettingsSurface';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { colors, fonts, spacing } from '../../theme';
import { Heading, Text } from '../../ui/Typography';
import { Icon } from '../../ui/Icon';
import { ConnectedAppLogo } from './ConnectedAppLogo';
import {
  fetchExternalConnections,
  revokeExternalConnection,
  type ExternalActionHistoryItem,
  type ExternalConnection,
} from '../../services/externalConnections';

type Nav = NativeStackNavigationProp<SettingsStackParamList>;
type ConnectionRoute = RouteProp<SettingsStackParamList, 'SettingsConnectedToolDetail'>;
type SetupRoute = RouteProp<SettingsStackParamList, 'SettingsConnectKwiltApp'>;

export type ConnectableApp = 'chatgpt' | 'claude' | 'cursor' | 'codex' | 'other';

const MCP_SERVER_URL = 'https://auth.kwilt.app/functions/v1/mcp';

const APP_DESTINATIONS: Array<{ id: Exclude<ConnectableApp, 'other'>; name: string }> = [
  { id: 'chatgpt', name: 'ChatGPT' },
  { id: 'claude', name: 'Claude' },
  { id: 'cursor', name: 'Cursor' },
  { id: 'codex', name: 'Codex' },
];

const ALL_DESTINATIONS: Array<{ id: ConnectableApp; name: string }> = [
  ...APP_DESTINATIONS,
  { id: 'other', name: 'Another MCP app' },
];

const SETUP_STEPS: Record<ConnectableApp, { name: string; open: string; add: string }> = {
  chatgpt: {
    name: 'ChatGPT',
    open: 'Open ChatGPT settings',
    add: 'Create a custom app',
  },
  claude: {
    name: 'Claude',
    open: 'Open Claude settings',
    add: 'Add a custom connector',
  },
  cursor: {
    name: 'Cursor',
    open: 'Open Cursor settings',
    add: 'Add a remote MCP server',
  },
  codex: {
    name: 'Codex',
    open: 'Open Codex settings',
    add: 'Add a remote MCP server',
  },
  other: {
    name: 'Manual setup',
    open: 'Open the other app’s settings',
    add: 'Add a connector or MCP server',
  },
};

function formatSurface(surface: string): string {
  if (surface === 'claude') return 'Claude';
  if (surface === 'chatgpt') return 'ChatGPT';
  if (surface === 'cursor') return 'Cursor';
  if (surface === 'codex') return 'Codex';
  if (surface === 'claude_desktop') return 'Claude Desktop';
  return 'AI app';
}

function connectionName(connection: ExternalConnection): string {
  return connection.client_name?.trim() || formatSurface(connection.surface);
}

function connectionDestination(connection: ExternalConnection): ConnectableApp {
  const identity = `${connection.surface} ${connection.client_name ?? ''}`.toLowerCase();
  if (identity.includes('chatgpt')) return 'chatgpt';
  if (identity.includes('claude')) return 'claude';
  if (identity.includes('cursor')) return 'cursor';
  if (identity.includes('codex')) return 'codex';
  return 'other';
}

function formatDate(value: string | null): string {
  if (!value) return 'Never';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Unknown';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function lastUsedValue(value: string | null): string {
  return value ? formatDate(value) : 'Never used';
}

function canWrite(scope: string): boolean {
  return new Set(scope.split(/\s+/).map((value) => value.trim().toLowerCase())).has('write');
}

function actionDescription(action: ExternalActionHistoryItem): string {
  if (action.result_summary?.trim()) return action.result_summary.trim();
  const descriptionByTool: Record<string, string> = {
    capture_activity: 'Captured an Activity.',
    mark_activity_done: 'Marked an Activity done.',
    set_focus_today: 'Updated today’s focus.',
    create_goal: 'Created a Goal.',
    propose_arc: 'Proposed an Arc.',
    update_activity: 'Updated an Activity.',
  };
  const description = descriptionByTool[action.tool_name] ?? 'Made a change in Kwilt.';
  return action.success ? description : `Couldn’t complete: ${description.replace(/\.$/, '').toLowerCase()}.`;
}

function Rows({ children }: { children: ReactNode[] }) {
  return children.map((child, index) => (
    <Fragment key={index}>
      {index > 0 ? <SettingsDivider /> : null}
      {child}
    </Fragment>
  ));
}

function latestConnectionUse(connections: ExternalConnection[]): string | null {
  const latest = connections.reduce<string | null>((current, connection) => {
    if (!connection.last_used_at) return current;
    if (!current) return connection.last_used_at;
    return new Date(connection.last_used_at).getTime() > new Date(current).getTime()
      ? connection.last_used_at
      : current;
  }, null);
  return latest;
}

function connectionStatus(connections: ExternalConnection[]): string {
  const count = connections.length;
  const latest = latestConnectionUse(connections);
  const countLabel = `${count} connection${count === 1 ? '' : 's'}`;
  return latest ? `${countLabel} · Last used ${formatDate(latest)}` : `${countLabel} · Never used`;
}

function AppDestinationGallery({
  connectionsByApp,
  loading,
  onPress,
}: {
  connectionsByApp: Record<ConnectableApp, ExternalConnection[]>;
  loading: boolean;
  onPress: (app: ConnectableApp, connections: ExternalConnection[]) => void;
}) {
  return (
    <View style={styles.gallery}>
      <View style={styles.galleryIntroduction}>
        <Heading selectable variant="sm">Use Kwilt in other apps</Heading>
        <Text selectable tone="secondary">
          Bring Kwilt’s tools into the AI apps you already use.
        </Text>
      </View>

      <View style={styles.destinationList}>
        {ALL_DESTINATIONS.map((app) => {
          const appConnections = connectionsByApp[app.id];
          const connected = appConnections.length > 0;
          const accessibilityLabel = connected
            ? `Manage ${app.name} connection${appConnections.length === 1 ? '' : 's'}`
            : app.id === 'other'
              ? 'Set up another MCP app'
              : `Set up Kwilt in ${app.name}`;
          const status = connected
            ? connectionStatus(appConnections)
            : app.id === 'other'
              ? 'Set up with Kwilt’s server URL'
              : 'Set up';

          return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            key={app.id}
            onPress={() => onPress(app.id, appConnections)}
            style={({ pressed }) => [
              styles.destinationRow,
              app.id === 'other' ? styles.manualDestination : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <ConnectedAppLogo kind={app.id} size={36} />
            <View style={styles.destinationCopy}>
              <View style={styles.destinationTitleRow}>
                <Text numberOfLines={1} style={styles.destinationName} variant="body">
                  {app.name}
                </Text>
                {connected ? (
                  <View
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={styles.connectedStatusDot}
                    testID={`connected-status-${app.id}`}
                  />
                ) : null}
              </View>
              {!loading || connected || app.id === 'other' ? (
                <Text numberOfLines={1} tone="secondary">{status}</Text>
              ) : null}
            </View>
            <Icon name="chevronRight" size={17} color={colors.textSecondary} />
          </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function useSettingsBack(title: string) {
  const navigation = useNavigation<Nav>();
  const handleBack = useCallback(() => {
    const routes = navigation.getState().routes;
    if (routes.length <= 1) {
      navigation.reset({ index: 0, routes: [{ name: 'SettingsHome' }] });
      return;
    }
    navigation.goBack();
  }, [navigation]);
  return { handleBack, navigation, title };
}

export function ConnectedToolsScreen() {
  const { handleBack, navigation } = useSettingsBack('Apps & connections');
  const [connections, setConnections] = useState<ExternalConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await fetchExternalConnections();
      setConnections(result.connections);
    } catch (error: unknown) {
      setLoadError(error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeConnections = useMemo(
    () => connections.filter((connection) => !connection.revoked_at),
    [connections],
  );
  const connectionsByApp = useMemo<Record<ConnectableApp, ExternalConnection[]>>(() => {
    const grouped: Record<ConnectableApp, ExternalConnection[]> = {
      chatgpt: [],
      claude: [],
      cursor: [],
      codex: [],
      other: [],
    };
    activeConnections.forEach((connection) => {
      grouped[connectionDestination(connection)].push(connection);
    });
    return grouped;
  }, [activeConnections]);

  const openDestination = useCallback((app: ConnectableApp, appConnections: ExternalConnection[]) => {
    if (appConnections.length === 0) {
      navigation.navigate('SettingsConnectKwiltApp', { app });
      return;
    }
    if (appConnections.length === 1) {
      navigation.navigate('SettingsConnectedToolDetail', { clientId: appConnections[0].client_id });
      return;
    }
    const name = ALL_DESTINATIONS.find((destination) => destination.id === app)?.name ?? 'App';
    Alert.alert(
      `${name} connections`,
      'Choose a connection to manage.',
      [
        ...appConnections.map((connection) => ({
          text: connectionName(connection),
          onPress: () => navigation.navigate('SettingsConnectedToolDetail', { clientId: connection.client_id }),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  }, [navigation]);

  return (
    <SettingsPage onBack={handleBack} title="Apps & connections">
      <AppDestinationGallery
        connectionsByApp={connectionsByApp}
        loading={loading}
        onPress={openDestination}
      />

      {loadError ? (
        <SettingsGroup footer={loadError} title="Connections unavailable">
          <SettingsRow onPress={() => void load()} title="Try again" />
        </SettingsGroup>
      ) : null}

    </SettingsPage>
  );
}

export function ConnectKwiltAppScreen() {
  const route = useRoute<SetupRoute>();
  const setup = SETUP_STEPS[route.params.app];
  const { handleBack } = useSettingsBack(setup.name);
  const [copied, setCopied] = useState(false);

  const copyServerUrl = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(MCP_SERVER_URL);
      setCopied(true);
    } catch {
      Alert.alert('Kwilt MCP server URL', MCP_SERVER_URL);
    }
  }, []);

  return (
    <SettingsPage onBack={handleBack} title={setup.name}>
      <SettingsInstructionSection
        footer="Paste this URL when the app asks for its MCP server or connector endpoint. Kwilt uses OAuth, so you won’t need to create or paste a token. The app will open Kwilt for sign-in and approval."
        steps={[setup.open, setup.add, 'Copy and paste Kwilt’s server URL']}
        title="Connect in three steps"
      >
        <SettingsCopyField
          copied={copied}
          label="Kwilt MCP server URL"
          onPress={() => void copyServerUrl()}
          value={MCP_SERVER_URL}
        />
      </SettingsInstructionSection>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  gallery: {
    gap: spacing.md,
  },
  galleryIntroduction: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  destinationList: {
    gap: spacing.sm,
  },
  destinationRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  destinationCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  destinationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  destinationName: {
    fontFamily: fonts.semibold,
  },
  connectedStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.success,
  },
  manualDestination: {
    marginTop: spacing.xs,
  },
  pressed: {
    opacity: 0.72,
  },
});

export function ConnectedToolDetailScreen() {
  const route = useRoute<ConnectionRoute>();
  const { handleBack, navigation } = useSettingsBack('Connection');
  const [connection, setConnection] = useState<ExternalConnection | null>(null);
  const [actions, setActions] = useState<ExternalActionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await fetchExternalConnections();
      const match = result.connections.find((item) => item.client_id === route.params.clientId && !item.revoked_at) ?? null;
      setConnection(match);
      setActions(result.actions.filter((action) => action.client_id === route.params.clientId).slice(0, 10));
    } catch (error: unknown) {
      setLoadError(error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [route.params.clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const disconnect = useCallback(async () => {
    if (!connection) return;
    setDisconnecting(true);
    try {
      await revokeExternalConnection(connection.client_id);
      navigation.goBack();
    } catch (error: unknown) {
      Alert.alert('Unable to disconnect', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setDisconnecting(false);
    }
  }, [connection, navigation]);

  const confirmDisconnect = useCallback(() => {
    if (!connection) return;
    Alert.alert(
      `Disconnect ${connectionName(connection)}?`,
      'This app will no longer be able to view or change anything in Kwilt.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: () => void disconnect() },
      ],
    );
  }, [connection, disconnect]);

  const title = connection ? connectionName(connection) : 'Connection';

  return (
    <SettingsPage onBack={handleBack} title={title}>
      {loadError ? (
        <SettingsGroup footer={loadError} title="Connection unavailable">
          <SettingsRow onPress={() => void load()} title="Try again" />
        </SettingsGroup>
      ) : null}

      {loading && !connection ? (
        <SettingsGroup>
          <SettingsRow disabled title="Checking connection…" />
        </SettingsGroup>
      ) : null}

      {!loading && !connection && !loadError ? (
        <SettingsGroup footer="This connection may already have been disconnected.">
          <SettingsRow title="Connection not found" />
        </SettingsGroup>
      ) : null}

      {connection ? (
        <>
          <SettingsGroup title="Connection">
            <Rows>
              <SettingsRow title="Connected" value={formatDate(connection.connected_at)} />
              <SettingsRow title="Last used" value={lastUsedValue(connection.last_used_at)} />
            </Rows>
          </SettingsGroup>

          <SettingsGroup footer="The app only gets access after you approve the connection." title="Access">
            <Rows>
              <SettingsRow title="View Kwilt information" value="Allowed" />
              <SettingsRow title="Make changes you request" value={canWrite(connection.scope) ? 'Allowed' : 'Not allowed'} />
            </Rows>
          </SettingsGroup>

          <SettingsGroup
            footer={actions.length > 0 ? 'Actions from this connection only.' : 'This connection has not made any changes yet.'}
            title="Recent activity"
          >
            {actions.length > 0 ? (
              <Rows>
                {actions.map((action) => (
                  <SettingsRow
                    key={action.id}
                    title={actionDescription(action)}
                    value={formatDate(action.created_at)}
                  />
                ))}
              </Rows>
            ) : (
              <SettingsRow title="No recent activity" />
            )}
          </SettingsGroup>

          <SettingsGroup footer="You can connect this app again later.">
            <SettingsRow
              destructive
              disabled={disconnecting}
              onPress={confirmDisconnect}
              showsDisclosureIndicator={false}
              title={disconnecting ? 'Disconnecting…' : 'Disconnect'}
            />
          </SettingsGroup>
        </>
      ) : null}
    </SettingsPage>
  );
}
