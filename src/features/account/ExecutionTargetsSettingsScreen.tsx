import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { colors, spacing, typography, cardSurfaceStyle } from '../../theme';
import { Badge, Button, Card, HStack, Heading, Input, Text, VStack, KeyboardAwareScrollView } from '../../ui/primitives';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { ensureSignedInWithPrompt } from '../../services/backend/auth';
import {
  listExecutionTargetDefinitions,
  listExecutionTargets,
  type ExecutionTargetDefinitionRow,
  type ExecutionTargetRow,
} from '../../services/executionTargets/executionTargets';
import { BottomDrawer, BottomDrawerScrollView } from '../../ui/BottomDrawer';
import { formatActivityTypeLabel, getDestinationSupportedActivityTypes } from '../../domain/destinationCapabilities';
import { OOTB_DESTINATIONS } from '../../domain/ootbDestinations';
import { Icon } from '../../ui/Icon';
import { FloatingActionButton } from '../../ui/FloatingActionButton';
import { useAppStore } from '../../store/useAppStore';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsExecutionTargets'>;

export function ExecutionTargetsSettingsScreen() {
  const navigation = useNavigation<Nav>();
  const [loading, setLoading] = useState(true);
  const [definitions, setDefinitions] = useState<ExecutionTargetDefinitionRow[]>([]);
  const [targets, setTargets] = useState<ExecutionTargetRow[]>([]);
  const [libraryVisible, setLibraryVisible] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState('');
  const enabledSendToDestinations = useAppStore((s) => s.enabledSendToDestinations);
  const toggleSendToDestinationEnabled = useAppStore((s) => s.toggleSendToDestinationEnabled);

  const load = async () => {
    setLoading(true);
    try {
      await ensureSignedInWithPrompt('settings');
      const [defs, tgs] = await Promise.all([listExecutionTargetDefinitions(), listExecutionTargets()]);
      setDefinitions(defs);
      setTargets(tgs);
    } catch (e: any) {
      Alert.alert('Unable to load', typeof e?.message === 'string' ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  // Load definitions in the background so “Library” can show a hint if it’s empty.
  const definitionsCount = useMemo(() => definitions.length, [definitions.length]);
  const installedBuiltInDestinations = useMemo(() => {
    const enabled = enabledSendToDestinations ?? {};
    return OOTB_DESTINATIONS.filter((d) => d.kind !== 'cursor_repo').filter((d) => Boolean((enabled as any)[String(d.kind)]));
  }, [enabledSendToDestinations]);
  const hasInstalledDestinations = targets.length > 0 || installedBuiltInDestinations.length > 0;
  const installedDefinitionIds = useMemo(() => new Set(targets.map((t) => String(t.definition_id ?? ''))), [targets]);
  const cursorDefinition = useMemo(
    () => definitions.find((d) => String(d.kind) === 'cursor_repo') ?? null,
    [definitions],
  );
  const installedCursorTarget = useMemo(() => {
    if (!cursorDefinition) return null;
    return targets.find((t) => String(t.definition_id ?? '') === String(cursorDefinition.id)) ?? null;
  }, [cursorDefinition, targets]);

  const filteredDefinitions = useMemo(() => {
    const q = libraryQuery.trim().toLowerCase();
    if (!q) return definitions;
    return definitions.filter((d) => {
      const hay = `${d.display_name ?? ''} ${d.description ?? ''} ${d.kind ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [definitions, libraryQuery]);

  const openLibrary = () => setLibraryVisible(true);
  const afterSelectFromLibrary = () => setLibraryVisible(false);

  const renderInstalledTargets = () => {
    if (targets.length === 0 && installedBuiltInDestinations.length === 0) {
      // When empty, the offer card above serves as the single empty-state surface.
      return null;
    }

    return (
      <VStack space={spacing.xs / 2}>
        {installedBuiltInDestinations.map((d) => {
          const kind = String(d.kind);
          return (
            <Card key={`installed:ootb:${kind}`} style={styles.card}>
              <HStack justifyContent="space-between" alignItems="center" space="sm">
                <VStack flex={1} space="xs">
                  <Text style={styles.itemTitle}>{d.displayName}</Text>
                  <Text style={styles.subtle}>
                    {kind} • Enabled
                  </Text>
                </VStack>
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => navigation.navigate('SettingsBuiltInDestinationDetail', { kind: kind as any })}
                  label="Manage"
                  disabled={loading}
                />
              </HStack>
            </Card>
          );
        })}
        {targets.map((t) => {
          const isEnabled = Boolean(t.is_enabled);
          const label = t.display_name || t.kind;
          return (
            <Card key={t.id} style={styles.card}>
              <HStack justifyContent="space-between" alignItems="center" space="sm">
                <VStack flex={1} space="xs">
                  <Text style={styles.itemTitle}>{label}</Text>
                  <Text style={styles.subtle}>
                    {t.kind} • {isEnabled ? 'Enabled' : 'Disabled'}
                  </Text>
                </VStack>
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => navigation.navigate('SettingsDestinationDetail', { mode: 'edit', targetId: t.id })}
                  label="Manage"
                />
              </HStack>
            </Card>
          );
        })}
      </VStack>
    );
  };

  const renderDestinationInventory = (opts: { mode: 'inline' | 'drawer' }) => {
    const onAfterSelect = opts.mode === 'drawer' ? afterSelectFromLibrary : () => undefined;

    const filteredOotb = OOTB_DESTINATIONS.filter((d) => {
      const q = libraryQuery.trim().toLowerCase();
      if (!q) return true;
      const hay = `${d.displayName} ${d.description} ${d.kind}`.toLowerCase();
      return hay.includes(q);
    });

    // Curated definitions: already filtered by `filteredDefinitions`, but avoid duplicating Cursor
    // because it's listed as an OOTB destination.
    const curated = filteredDefinitions.filter((d) => String(d.kind) !== 'cursor_repo');
    const showNoMatches = filteredOotb.length === 0 && curated.length === 0 && definitions.length > 0;

    const list = (
      <>
        {showNoMatches ? (
          <Card style={styles.card}>
            <VStack space="xs">
              <Text style={styles.itemTitle}>No matches</Text>
              <Text style={styles.subtle}>Try a different search.</Text>
            </VStack>
          </Card>
        ) : (
          <VStack space={spacing.xs / 2}>
            {/* OOTB destinations (retailers + Cursor). */}
            {filteredOotb.map((d) => {
              const supported = d.supportedTypes;
              const isCursor = d.kind === 'cursor_repo';
              const canInstallCursor = isCursor && Boolean(cursorDefinition);
              const alreadyInstalledCursor =
                isCursor && Boolean(cursorDefinition) && installedDefinitionIds.has(String(cursorDefinition?.id ?? ''));
              const isBuiltInRetailer = !isCursor;
              const builtInKind = isBuiltInRetailer ? String(d.kind) : null;
              const isInstalledBuiltIn = builtInKind ? Boolean((enabledSendToDestinations ?? {})[builtInKind]) : false;

              return (
                <Card key={`ootb:${d.kind}`} padding="sm" style={styles.libraryCard}>
                  <Pressable
                    disabled={loading}
                    accessibilityRole="button"
                    accessibilityLabel={`${d.displayName} destination`}
                    onPress={() => {
                      if (isCursor) return;
                      if (!builtInKind) return;
                      onAfterSelect();
                      navigation.navigate('SettingsBuiltInDestinationDetail', { kind: builtInKind as any });
                    }}
                    style={styles.libraryCardInner}
                  >
                    <VStack space={spacing.xs}>
                      <HStack justifyContent="space-between" alignItems="center" space="xs">
                        <HStack alignItems="center" space="xs" style={{ flex: 1, paddingRight: spacing.sm }}>
                          <Text style={styles.itemTitle}>{d.displayName}</Text>
                          {isCursor ? null : isInstalledBuiltIn ? (
                            <Icon name="checkCircle" size={16} color={colors.accent} />
                          ) : null}
                        </HStack>
                        <Button
                          variant={
                            isCursor
                              ? alreadyInstalledCursor
                                ? 'secondary'
                                : 'cta'
                              : isInstalledBuiltIn
                                ? 'secondary'
                                : 'cta'
                          }
                          size="xs"
                          disabled={loading || (isCursor && !canInstallCursor)}
                          label={
                            isCursor
                              ? alreadyInstalledCursor
                                ? 'Manage'
                                : canInstallCursor
                                  ? 'Install'
                                  : 'Unavailable'
                              : isInstalledBuiltIn
                                ? 'Installed'
                                : 'Install'
                          }
                          onPress={() => {
                            onAfterSelect();
                            if (isCursor) {
                              if (!cursorDefinition) return;
                              if (alreadyInstalledCursor && installedCursorTarget) {
                                navigation.navigate('SettingsDestinationDetail', {
                                  mode: 'edit',
                                  targetId: installedCursorTarget.id,
                                });
                                return;
                              }
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

                      <Text style={styles.subtle} numberOfLines={1}>
                        {d.description}
                      </Text>

                      <HStack space="xs" alignItems="center" style={styles.typeBadgeWrap}>
                        {supported.slice(0, 1).map((t) => (
                          <Badge key={`ootb:${d.kind}:${String(t)}`} variant="secondary">
                            {formatActivityTypeLabel(t)}
                          </Badge>
                        ))}
                      </HStack>
                    </VStack>
                  </Pressable>
                </Card>
              );
            })}

            {/* Curated (server) destinations. */}
            {curated.map((d) => {
              const isInstalled = installedDefinitionIds.has(String(d.id));
              const supported = getDestinationSupportedActivityTypes(d.kind as any);
              const installedTarget =
                isInstalled ? targets.find((t) => String(t.definition_id ?? '') === String(d.id)) ?? null : null;
              return (
                <Card key={d.id} padding="sm" style={styles.libraryCard}>
                  <View style={styles.libraryCardInner}>
                    {isInstalled ? (
                      <View style={styles.selectionIcon} pointerEvents="none">
                        <Icon name="checkCircle" size={18} color={colors.accent} />
                      </View>
                    ) : null}

                    <HStack justifyContent="space-between" alignItems="center" space="sm">
                      <VStack flex={1} space="xs" style={{ paddingRight: spacing.sm }}>
                        <HStack justifyContent="space-between" alignItems="center" space="xs">
                          <HStack alignItems="center" space="xs" style={{ flex: 1, paddingRight: spacing.sm }}>
                            <Text style={styles.itemTitle}>{d.display_name}</Text>
                            {isInstalled ? <Icon name="checkCircle" size={16} color={colors.accent} /> : null}
                          </HStack>
                        </HStack>
                        <Text style={styles.subtle} numberOfLines={1}>
                          {d.description ?? d.kind}
                        </Text>
                        <HStack space="xs" alignItems="center" style={styles.typeBadgeWrap}>
                          {supported.slice(0, 1).map((t) => (
                            <Badge key={`${d.id}:${String(t)}`} variant="secondary">
                              {formatActivityTypeLabel(t)}
                            </Badge>
                          ))}
                        </HStack>
                      </VStack>

                      <Button
                        variant={isInstalled ? 'secondary' : 'cta'}
                        size="xs"
                        disabled={loading}
                        label={isInstalled ? 'Manage' : 'Install'}
                        onPress={() => {
                          onAfterSelect();
                          if (isInstalled && installedTarget) {
                            navigation.navigate('SettingsDestinationDetail', {
                              mode: 'edit',
                              targetId: installedTarget.id,
                            });
                            return;
                          }
                          navigation.navigate('SettingsDestinationDetail', {
                            mode: 'create',
                            definitionId: d.id,
                          });
                        }}
                      />
                    </HStack>
                  </View>
                </Card>
              );
            })}
          </VStack>
        )}
      </>
    );

    if (opts.mode === 'drawer') {
      return <BottomDrawerScrollView contentContainerStyle={styles.libraryContent}>{list}</BottomDrawerScrollView>;
    }

    return <View style={styles.libraryInlineWrap}>{list}</View>;
  };

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader
          title="Destinations"
          onPressBack={() => navigation.goBack()}
        />
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'interactive'}
        >
          {!hasInstalledDestinations ? (
            <>
              <View style={styles.offerWrap}>
                <LinearGradient
                  colors={[colors.aiGradientStart, colors.aiGradientMid, colors.aiGradientEnd]}
                  start={{ x: 0, y: 0.1 }}
                  end={{ x: 1, y: 0.9 }}
                  style={styles.offerGradient}
                >
                  <VStack space="sm">
                    <Text style={styles.offerKicker}>Destinations</Text>
                    <Text style={styles.offerTitle}>Continue Anywhere</Text>
                    <Text style={styles.offerBody}>
                      Work doesn’t stop where capture ends. Install a destination (like Cursor) so you can continue
                      where real execution happens—without starting over.
                    </Text>
                  </VStack>
                </LinearGradient>
              </View>

              <View style={styles.libraryHeader}>
                <Heading variant="sm">Destination library</Heading>
                <Text style={styles.subtle}>Install a destination to enable “Send to…” handoff.</Text>
                <Input
                  value={libraryQuery}
                  onChangeText={setLibraryQuery}
                  placeholder="Search destinations"
                  leadingIcon="search"
                  autoCorrect={false}
                  autoCapitalize="none"
                  containerStyle={styles.librarySearch}
                />
              </View>

              {renderDestinationInventory({ mode: 'inline' })}
            </>
          ) : null}

          {renderInstalledTargets()}
        </KeyboardAwareScrollView>
      </View>

      {hasInstalledDestinations ? (
        <FloatingActionButton
          onPress={openLibrary}
          accessibilityLabel="Add destination"
          icon={<Icon name="plus" size={22} color={colors.primaryForeground} />}
        />
      ) : null}

      <BottomDrawer
        visible={libraryVisible}
        onClose={() => setLibraryVisible(false)}
        snapPoints={['85%']}
        scrimToken="pineSubtle"
        enableContentPanningGesture
      >
        <View style={styles.libraryHeader}>
          <Heading variant="sm">Destination library</Heading>
          <Text style={styles.subtle}>Install a destination to enable “Send to…” handoff.</Text>
          <Input
            value={libraryQuery}
            onChangeText={setLibraryQuery}
            placeholder="Search destinations"
            leadingIcon="search"
            autoCorrect={false}
            autoCapitalize="none"
            containerStyle={styles.librarySearch}
          />
        </View>

        {renderDestinationInventory({ mode: 'drawer' })}
      </BottomDrawer>
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
  card: {
    ...cardSurfaceStyle,
    padding: spacing.lg,
  },
  sectionTop: {
    marginTop: spacing.sm,
  },
  itemTitle: {
    ...typography.body,
    color: colors.textPrimary,
  },
  subtle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  offerWrap: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  offerGradient: {
    borderRadius: 18,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.aiBorder,
  },
  offerKicker: {
    ...typography.bodySm,
    color: colors.aiForeground,
    opacity: 0.9,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  offerTitle: {
    ...typography.titleLg,
    color: colors.aiForeground,
  },
  offerSectionTitle: {
    ...typography.body,
    color: colors.aiForeground,
    opacity: 0.95,
    fontFamily: typography.titleSm.fontFamily,
    marginTop: spacing.xs,
  },
  offerBody: {
    ...typography.bodySm,
    color: colors.aiForeground,
    opacity: 0.92,
  },
  offerHint: {
    ...typography.bodySm,
    color: colors.aiForeground,
    opacity: 0.8,
    marginTop: spacing.xs,
  },
  libraryHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  librarySearch: {
    marginTop: spacing.xs,
  },
  libraryContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  libraryInlineWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  typeBadgeWrap: {
    flexWrap: 'wrap',
  },
  libraryCard: {
    // Preserve the shared card surface, but keep the layout compact in the library list.
    ...cardSurfaceStyle,
    marginVertical: 0,
  },
  libraryCardInner: {
    position: 'relative',
  },
  selectionIcon: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
});


