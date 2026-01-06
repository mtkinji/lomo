import { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { cardSurfaceStyle, colors, spacing, typography } from '../../theme';
import { Button, Card, HStack, Heading, Text, VStack, KeyboardAwareScrollView } from '../../ui/primitives';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { ensureSignedInWithPrompt } from '../../services/backend/auth';
import { listExecutionTargetDefinitions, type ExecutionTargetDefinitionRow } from '../../services/executionTargets/executionTargets';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsDestinationsLibrary'>;

export function DestinationsLibraryScreen() {
  const navigation = useNavigation<Nav>();
  const [loading, setLoading] = useState(true);
  const [definitions, setDefinitions] = useState<ExecutionTargetDefinitionRow[]>([]);

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
              <Heading size="sm">Available destinations</Heading>
              <Text style={styles.subtle}>
                Destinations are Kwilt-curated executors that can call Kwilt MCP and consume Work Packets.
              </Text>
            </VStack>
          </Card>

          {definitions.length === 0 ? (
            <Card style={styles.card}>
              <VStack space="xs">
                <Text style={styles.itemTitle}>No destinations available</Text>
                <Text style={styles.subtle}>
                  This usually means migrations haven’t been applied to the connected Supabase project yet.
                </Text>
              </VStack>
            </Card>
          ) : (
            <VStack space="sm">
              {definitions.map((d) => (
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


