import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Button, HStack, Text, VStack } from '../../ui/primitives';
import { colors, spacing, typography } from '../../theme';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { createPat } from '../../services/executionTargets/pats';
import { getKwiltMcpBaseUrl } from '../../services/executionTargets/executionTargets';
import { useToastStore } from '../../store/useToastStore';
import {
  fetchExternalConnections,
  revokeExternalConnection,
  type ExternalConnection,
} from '../../services/externalConnections';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsConnectedTools'>;

function formatSurface(surface: string): string {
  if (surface === 'claude') return 'Claude';
  if (surface === 'chatgpt') return 'ChatGPT';
  if (surface === 'cursor') return 'Cursor';
  if (surface === 'claude_desktop') return 'Claude Desktop';
  if (surface === 'manual') return 'Access key';
  return 'Connected tool';
}

function formatDate(value: string | null): string {
  if (!value) return 'Never';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Unknown';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ConnectedToolsScreen() {
  const navigation = useNavigation<Nav>();
  const [connections, setConnections] = useState<ExternalConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingKey, setCreatingKey] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string>('');
  const [revokingClientId, setRevokingClientId] = useState<string | null>(null);
  const showToast = useToastStore((s) => s.showToast);

  const mcpUrl = getKwiltMcpBaseUrl() ?? 'https://<your-project>.supabase.co/functions/v1/kwilt-mcp';

  const buildConfigSnippet = useCallback((token: string) => JSON.stringify(
    {
      kwilt: {
        url: mcpUrl,
        headers: {
          Authorization: `Bearer ${token || '<create an access key first>'}`,
        },
      },
    },
    null,
    2,
  ), [mcpUrl]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchExternalConnections();
      setConnections(result.connections);
    } catch (error: any) {
      Alert.alert('Unable to load connected tools', typeof error?.message === 'string' ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const copy = useCallback(async (text: string, message = 'Copied') => {
    try {
      await Clipboard.setStringAsync(text);
      showToast({ message, variant: 'success', durationMs: 1800 });
    } catch {
      showToast({ message: 'Unable to copy', variant: 'danger', durationMs: 2000 });
    }
  }, [showToast]);

  const createAccessKey = useCallback(async () => {
    setCreatingKey(true);
    try {
      const result = await createPat({ label: 'Manual access key' });
      setGeneratedKey(result.token);
      await copy(result.token, 'Access key copied');
      await load();
    } catch (error: any) {
      Alert.alert('Unable to create access key', typeof error?.message === 'string' ? error.message : 'Please try again.');
    } finally {
      setCreatingKey(false);
    }
  }, [copy, load]);

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

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader title="Connected tools" onPressBack={() => navigation.goBack()} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.helperText}>
            Manage tools that can read or update Kwilt.
          </Text>

          <VStack space="sm" style={styles.setupCard}>
            <HStack alignItems="flex-start" justifyContent="space-between" space="md">
              <VStack flex={1} space={4}>
                <Text style={styles.setupTitle}>Add a tool</Text>
                <Text style={styles.setupText}>
                  Create a key for Cursor or another MCP client.
                </Text>
              </VStack>
              <Button
                variant="secondary"
                size="sm"
                onPress={createAccessKey}
                disabled={creatingKey}
                label={creatingKey ? 'Creating...' : 'Create key'}
              />
            </HStack>
            {generatedKey ? (
              <VStack space="sm" style={styles.generatedKeyBlock}>
                <Text style={styles.metaText}>
                  Copy this now. It will not be shown again.
                </Text>
                <View style={styles.codeBlock}>
                  <Text selectable style={styles.codeText}>{buildConfigSnippet(generatedKey)}</Text>
                </View>
                <HStack justifyContent="flex-end" space="sm">
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={() => copy(`Authorization: Bearer ${generatedKey}`, 'Auth header copied')}
                    label="Copy header"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={() => copy(buildConfigSnippet(generatedKey), 'Config copied')}
                    label="Copy config"
                  />
                </HStack>
              </VStack>
            ) : null}
          </VStack>

          <VStack space="sm">
            <Text style={styles.sectionTitle}>Connections</Text>
            {connections.length === 0 && !loading ? (
              <Text style={styles.emptyText}>No tools connected yet.</Text>
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
                        {connection.connection_type === 'pat'
                          ? 'Manual access key'
                          : `${connection.write_count} recent write${connection.write_count === 1 ? '' : 's'}`}
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
    padding: spacing.xl,
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
  },
  helperText: {
    ...typography.bodySm,
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
  setupCard: {
    borderRadius: 16,
    backgroundColor: colors.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  setupTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  setupText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  generatedKeyBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  codeBlock: {
    borderRadius: 14,
    backgroundColor: colors.cardMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  codeText: {
    ...typography.mono,
    color: colors.textPrimary,
    fontSize: 12,
    lineHeight: 18,
  },
  card: {
    borderRadius: 16,
    backgroundColor: colors.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '600',
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
});
