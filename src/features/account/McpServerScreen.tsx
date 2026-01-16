import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Button, Card, HStack, Heading, Text, VStack, KeyboardAwareScrollView } from '../../ui/primitives';
import { colors, spacing, typography, cardSurfaceStyle } from '../../theme';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { ensureSignedInWithPrompt } from '../../services/backend/auth';
import { createPat } from '../../services/executionTargets/pats';
import { getKwiltMcpBaseUrl } from '../../services/executionTargets/executionTargets';
import { useToastStore } from '../../store/useToastStore';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsHome'>;

export function McpServerScreen() {
  const navigation = useNavigation<Nav>();
  const [loading, setLoading] = useState(false);
  const [pat, setPat] = useState<string>('');
  const showToast = useToastStore((s) => s.showToast);

  const mcpUrl = useMemo(() => getKwiltMcpBaseUrl(), []);

  useEffect(() => {
    void ensureSignedInWithPrompt('settings');
  }, []);

  const copy = async (text: string, msg = 'Copied') => {
    try {
      await Clipboard.setStringAsync(text);
      showToast({ message: msg, variant: 'success', durationMs: 1800 });
    } catch {
      showToast({ message: 'Unable to copy', variant: 'danger', durationMs: 2000 });
    }
  };

  const generateKey = async () => {
    setLoading(true);
    try {
      await ensureSignedInWithPrompt('settings');
      const res = await createPat({ label: 'MCP Server' });
      setPat(res.token);
      showToast({ message: 'Key generated', variant: 'success', durationMs: 1800 });
    } catch (e: any) {
      showToast({
        message: typeof e?.message === 'string' ? e.message : 'Unable to generate key',
        variant: 'danger',
        durationMs: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const buildConfigSnippet = () => {
    const url = mcpUrl ?? 'https://<your-project>.supabase.co/functions/v1/kwilt-mcp';
    const token = pat || '<generate a key first>';
    return JSON.stringify(
      {
        'kwilt': {
          url,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      },
      null,
      2,
    );
  };

  const hasKey = Boolean(pat);

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader title="MCP Server" onPressBack={() => navigation.goBack()} />
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'interactive'}
        >
          <VStack space="sm">
            <Heading variant="sm">Connect via MCP</Heading>
            <Text style={styles.subtle}>
              Let any MCP client (Cursor, Claude Desktop, etc.) create and manage Activities in Kwilt.
            </Text>
          </VStack>

          {!hasKey ? (
            <VStack space="sm">
              <Text style={styles.body}>
                Generate a personal access token to get started.
              </Text>
              <Button
                variant="cta"
                onPress={generateKey}
                disabled={loading}
                label={loading ? 'Generating…' : 'Generate Key'}
              />
            </VStack>
          ) : (
            <VStack space="lg">
              <VStack space="sm">
                <Text style={styles.label}>Server config</Text>
                <Card style={styles.codeCard}>
                  <Text style={styles.codeText} selectable>
                    {buildConfigSnippet()}
                  </Text>
                </Card>
                <HStack space="sm" justifyContent="flex-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={generateKey}
                    disabled={loading}
                    label="Regenerate Key"
                  />
                  <Button
                    variant="cta"
                    size="sm"
                    onPress={() => copy(buildConfigSnippet(), 'Config copied')}
                    label="Copy Config"
                  />
                </HStack>
              </VStack>

              <Card style={styles.instructionCard}>
                <VStack space="xs">
                  <Text style={styles.instructionTitle}>Setup</Text>
                  <Text style={styles.instructionText}>
                    Cursor: Settings → MCP → Add server{'\n'}
                    Claude: Edit claude_desktop_config.json
                  </Text>
                </VStack>
              </Card>
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
  subtle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  body: {
    ...typography.body,
    color: colors.textPrimary,
  },
  label: {
    ...typography.label,
    color: colors.textPrimary,
  },
  codeCard: {
    ...cardSurfaceStyle,
    padding: spacing.md,
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  codeText: {
    ...typography.mono,
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 20,
  },
  instructionCard: {
    ...cardSurfaceStyle,
    padding: spacing.md,
    backgroundColor: colors.gray100,
  },
  instructionTitle: {
    ...typography.label,
    color: colors.textPrimary,
  },
  instructionText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
