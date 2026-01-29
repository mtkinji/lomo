import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { cardSurfaceStyle, colors, spacing, typography } from '../../theme';
import { Button, Card, HStack, Heading, Input, Text, VStack, KeyboardAwareScrollView } from '../../ui/primitives';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { ensureSignedInWithPrompt } from '../../services/backend/auth';
import { listExecutionTargetDefinitions, type ExecutionTargetDefinitionRow } from '../../services/executionTargets/executionTargets';
import { OOTB_DESTINATIONS } from '../../domain/ootbDestinations';
import { Icon } from '../../ui/Icon';
import { useAppStore } from '../../store/useAppStore';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsDestinationsLibrary'>;

export function DestinationsLibraryScreen() {
  const navigation = useNavigation<Nav>();
  const [loading, setLoading] = useState(true);
  const [definitions, setDefinitions] = useState<ExecutionTargetDefinitionRow[]>([]);
  const [query, setQuery] = useState('');

  const enabledSendToDestinations = useAppStore((s) => s.enabledSendToDestinations);

  const cursorDefinition = useMemo(
    () => definitions.find((d) => String(d.kind) === 'cursor_repo') ?? null,
    [definitions],
  );

  const filteredOotb = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return OOTB_DESTINATIONS;
    return OOTB_DESTINATIONS.filter((d) => {
      const hay = `${d.displayName} ${d.description} ${d.kind}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  const filteredDefinitions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = definitions.filter((d) => String(d.kind) !== 'cursor_repo');
    if (!q) return base;
    return base.filter((d) => {
      const hay = `${d.display_name ?? ''} ${d.description ?? ''} ${d.kind ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [definitions, query]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        await ensureSignedInWithPrompt('settings');
        const defs = await listExecutionTargetDefinitions();
        setDefinitions(defs);
      } catch (e: any) {
        Alert.alert('Unable to load', typeof e?.message === 'string' ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader title="Destination library" onPressBack={() => navigation.goBack()} />
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'interactive'}
        >
          <Card style={styles.card}>
            <VStack space="xs">
              <Heading variant="sm">Available destinations</Heading>
              <Text style={styles.subtle}>
                Install a destination to enable “Send to…” handoff.
              </Text>
            </VStack>
          </Card>

          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="Search destinations"
            leadingIcon="search"
            autoCorrect={false}
            autoCapitalize="none"
            containerStyle={styles.search}
          />

          <Card style={styles.card}>
            <VStack space="xs">
              <Heading variant="sm">Built-in destinations</Heading>
              <Text style={styles.subtle}>Always available in-app, even before you connect a backend.</Text>
            </VStack>
          </Card>

          <VStack space="sm">
            {filteredOotb.map((d) => {
              const isCursor = d.kind === 'cursor_repo';
              const canInstallCursor = isCursor && Boolean(cursorDefinition);
              const builtInKind = !isCursor ? String(d.kind) : null;
              const isInstalledBuiltIn = builtInKind ? Boolean((enabledSendToDestinations ?? {})[builtInKind]) : false;
              const showInstalledCheck = !isCursor && isInstalledBuiltIn;

              return (
                <Card key={`ootb:${d.kind}`} style={styles.card}>
                  <VStack space="xs">
                    <HStack justifyContent="space-between" alignItems="center" space="sm">
                      <HStack alignItems="center" space="xs" style={{ flex: 1, paddingRight: spacing.sm }}>
                        <Text style={styles.itemTitle}>{d.displayName}</Text>
                        {showInstalledCheck ? <Icon name="checkCircle" size={16} color={colors.accent} /> : null}
                      </HStack>
                      <Button
                        variant={
                          isCursor ? (canInstallCursor ? 'cta' : 'secondary') : isInstalledBuiltIn ? 'secondary' : 'cta'
                        }
                        size="sm"
                        disabled={loading || (isCursor && !canInstallCursor)}
                        label={isCursor ? (canInstallCursor ? 'Install' : 'Unavailable') : isInstalledBuiltIn ? 'Installed' : 'Install'}
                        onPress={() => {
                          if (loading) return;
                          if (isCursor) {
                            if (!cursorDefinition) return;
                            navigation.navigate('SettingsDestinationDetail', {
                              mode: 'create',
                              definitionId: cursorDefinition.id,
                            });
                            return;
                          }
                          if (!builtInKind) return;
                          navigation.navigate('SettingsBuiltInDestinationDetail', { kind: builtInKind as any });
                        }}
                      />
                    </HStack>
                    <Text style={styles.subtle}>{d.description}</Text>
                    {isCursor && !canInstallCursor ? (
                      <Text style={styles.subtle}>
                        Cursor requires destination definitions in Supabase (apply migrations to enable).
                      </Text>
                    ) : null}
                  </VStack>
                </Card>
              );
            })}
          </VStack>

          <Card style={styles.card}>
            <VStack space="xs">
              <Heading variant="sm">Curated destinations</Heading>
              <Text style={styles.subtle}>Loaded from your connected Supabase project.</Text>
            </VStack>
          </Card>

          {filteredDefinitions.length === 0 ? (
            <Card style={styles.card}>
              <VStack space="xs">
                <Text style={styles.itemTitle}>No curated destinations available</Text>
                <Text style={styles.subtle}>
                  This usually means migrations haven’t been applied to the connected Supabase project yet.
                </Text>
              </VStack>
            </Card>
          ) : (
            <VStack space="sm">
              {filteredDefinitions.map((d) => (
                <Card key={d.id} style={styles.card}>
                  <VStack space="xs">
                    <Text style={styles.itemTitle}>{d.display_name}</Text>
                    <Text style={styles.subtle}>{d.description ?? d.kind}</Text>
                    <HStack justifyContent="flex-end">
                      <Button
                        variant="secondary"
                        size="sm"
                        onPress={() => {
                          navigation.navigate('SettingsDestinationDetail', {
                            mode: 'create',
                            definitionId: d.id,
                          });
                        }}
                        label="Install"
                        disabled={loading}
                      />
                    </HStack>
                  </VStack>
                </Card>
              ))}
            </VStack>
          )}
        </KeyboardAwareScrollView>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
    gap: spacing.lg,
  },
  search: {
    marginTop: spacing.xs,
  },
  card: {
    ...cardSurfaceStyle,
    padding: spacing.lg,
  },
  itemTitle: {
    ...typography.body,
    color: colors.textPrimary,
  },
  subtle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});




