import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Icon } from '../../ui/Icon';
import { HStack, Text, VStack } from '../../ui/primitives';
import { colors, spacing, typography } from '../../theme';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import {
  fetchExternalConnections,
  revokeExternalConnection,
  type ExternalActionHistoryItem,
  type ExternalConnection,
} from '../../services/externalConnections';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsConnectedTools'>;

function formatSurface(surface: string): string {
  if (surface === 'claude') return 'Claude';
  if (surface === 'chatgpt') return 'ChatGPT';
  return 'Connected tool';
}

function formatDate(value: string | null): string {
  if (!value) return 'Never';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Unknown';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function linkForAction(action: ExternalActionHistoryItem): string | null {
  if (!action.object_type || !action.object_id) return null;
  if (action.object_type === 'arc') return `kwilt://arc/${encodeURIComponent(action.object_id)}`;
  if (action.object_type === 'goal') return `kwilt://goal/${encodeURIComponent(action.object_id)}`;
  if (action.object_type === 'activity') return `kwilt://activity/${encodeURIComponent(action.object_id)}`;
  return null;
}

export function ConnectedToolsScreen() {
  const navigation = useNavigation<Nav>();
  const [connections, setConnections] = useState<ExternalConnection[]>([]);
  const [actions, setActions] = useState<ExternalActionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingClientId, setRevokingClientId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchExternalConnections();
      setConnections(result.connections);
      setActions(result.actions);
    } catch (error: any) {
      Alert.alert('Unable to load connected tools', typeof error?.message === 'string' ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const revoke = useCallback((connection: ExternalConnection) => {
    Alert.alert(
      'Revoke this connection?',
      `${connection.client_name || formatSurface(connection.surface)} will no longer be able to read or write in Kwilt.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            setRevokingClientId(connection.client_id);
            try {
              await revokeExternalConnection(connection.client_id);
              await load();
            } catch (error: any) {
              Alert.alert('Unable to revoke', typeof error?.message === 'string' ? error.message : 'Please try again.');
            } finally {
              setRevokingClientId(null);
            }
          },
        },
      ],
    );
  }, [load]);

  const openAction = useCallback((action: ExternalActionHistoryItem) => {
    const link = linkForAction(action);
    if (link) void Linking.openURL(link);
  }, []);

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader title="Connected tools" onPressBack={() => navigation.goBack()} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          showsVerticalScrollIndicator={false}
        >
          <VStack space="sm" style={styles.introCard}>
            <Text style={styles.introTitle}>Agent connections</Text>
            <Text style={styles.introText}>
              Tools connected through Kwilt MCP act just like you do in the app. Arcs, Goals, and To-dos they create or edit do not carry special badges; this page keeps the audit trail.
            </Text>
          </VStack>

          <VStack space="sm">
            <Text style={styles.sectionTitle}>Connections</Text>
            {connections.length === 0 && !loading ? (
              <Text style={styles.emptyText}>No connected tools yet.</Text>
            ) : null}
            {connections.map((connection) => {
              const revoked = Boolean(connection.revoked_at);
              return (
                <View key={connection.client_id} style={styles.card}>
                  <HStack alignItems="flex-start" justifyContent="space-between" space="sm">
                    <VStack flex={1} space={2}>
                      <Text style={styles.cardTitle}>{connection.client_name || formatSurface(connection.surface)}</Text>
                      <Text style={styles.metaText}>
                        {formatSurface(connection.surface)} · Last used {formatDate(connection.last_used_at)}
                      </Text>
                      <Text style={styles.metaText}>
                        {connection.write_count} recent write{connection.write_count === 1 ? '' : 's'}
                      </Text>
                    </VStack>
                    <View style={[styles.statusPill, revoked ? styles.statusPillRevoked : null]}>
                      <Text style={[styles.statusLabel, revoked ? styles.statusLabelRevoked : null]}>
                        {revoked ? 'Revoked' : 'Active'}
                      </Text>
                    </View>
                  </HStack>
                  {!revoked ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={revokingClientId === connection.client_id}
                      onPress={() => revoke(connection)}
                      style={styles.revokeButton}
                    >
                      <Text style={styles.revokeButtonLabel}>
                        {revokingClientId === connection.client_id ? 'Revoking...' : 'Revoke connection'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </VStack>

          <VStack space="sm">
            <Text style={styles.sectionTitle}>Recent actions</Text>
            {actions.length === 0 && !loading ? (
              <Text style={styles.emptyText}>No agent write history yet.</Text>
            ) : null}
            {actions.map((action) => {
              const link = linkForAction(action);
              return (
                <Pressable
                  key={action.id}
                  accessibilityRole={link ? 'button' : undefined}
                  disabled={!link}
                  onPress={() => openAction(action)}
                  style={styles.actionRow}
                >
                  <VStack flex={1} space={2}>
                    <Text style={styles.actionTitle}>
                      {action.result_summary || action.tool_name.replace(/_/g, ' ')}
                    </Text>
                    <Text style={styles.metaText}>
                      {formatSurface(action.surface)} · {formatDate(action.created_at)}
                    </Text>
                  </VStack>
                  {link ? <Icon name="chevronRight" size={18} color={colors.textSecondary} /> : null}
                </Pressable>
              );
            })}
          </VStack>
        </ScrollView>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  introCard: {
    borderRadius: 24,
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  introTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  introText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  sectionTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  card: {
    borderRadius: 20,
    backgroundColor: colors.canvas,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  metaText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statusPill: {
    borderRadius: 999,
    backgroundColor: colors.pine50,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  statusPillRevoked: {
    backgroundColor: colors.cardMuted,
  },
  statusLabel: {
    ...typography.caption,
    fontFamily: typography.bodyBold.fontFamily,
    color: colors.accent,
  },
  statusLabelRevoked: {
    color: colors.textSecondary,
  },
  revokeButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.madder50,
  },
  revokeButtonLabel: {
    ...typography.caption,
    fontFamily: typography.bodyBold.fontFamily,
    color: colors.accentRoseStrong,
  },
  actionRow: {
    minHeight: 64,
    borderRadius: 18,
    backgroundColor: colors.canvas,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
});
