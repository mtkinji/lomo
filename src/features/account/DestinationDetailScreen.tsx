import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { cardSurfaceStyle, colors, spacing, typography } from '../../theme';
import { Button, Card, HStack, Heading, Input, Text, Textarea, VStack, KeyboardAwareScrollView } from '../../ui/primitives';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { ensureSignedInWithPrompt } from '../../services/backend/auth';
import {
  createExecutionTargetFromDefinition,
  deleteExecutionTarget,
  getKwiltMcpBaseUrl,
  listExecutionTargetDefinitions,
  listExecutionTargets,
  updateExecutionTarget,
  type ExecutionTargetDefinitionRow,
  type ExecutionTargetRow,
} from '../../services/executionTargets/executionTargets';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsDestinationDetail'>;
type Rt = RouteProp<SettingsStackParamList, 'SettingsDestinationDetail'>;

type CursorConfigDraft = {
  displayName: string;
  repoName: string;
  repoUrl: string;
  branchPolicy: string;
  verificationCommandsText: string;
};

function normalizeCommands(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function draftFromTarget(t: ExecutionTargetRow): CursorConfigDraft {
  const cfg = (t.config ?? {}) as any;
  const repoName = typeof cfg.repo_name === 'string' ? cfg.repo_name : '';
  const repoUrl = typeof cfg.repo_url === 'string' ? cfg.repo_url : '';
  const branchPolicy = typeof cfg.branch_policy === 'string' ? cfg.branch_policy : 'feature_branch';
  const cmds = Array.isArray(cfg.verification_commands) ? cfg.verification_commands : [];
  const verificationCommandsText = cmds.map((c: any) => (typeof c === 'string' ? c : '')).filter(Boolean).join('\n');
  return {
    displayName: t.display_name || repoName || 'Cursor',
    repoName,
    repoUrl,
    branchPolicy,
    verificationCommandsText,
  };
}

function missingCursorFields(d: CursorConfigDraft): string[] {
  const missing: string[] = [];
  if (!d.repoName.trim()) missing.push('Repo name');
  if (!d.displayName.trim()) missing.push('Display name');
  return missing;
}

export function DestinationDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const [loading, setLoading] = useState(true);
  const [definitions, setDefinitions] = useState<ExecutionTargetDefinitionRow[]>([]);
  const [target, setTarget] = useState<ExecutionTargetRow | null>(null);
  const [cursorDraft, setCursorDraft] = useState<CursorConfigDraft>({
    displayName: '',
    repoName: '',
    repoUrl: '',
    branchPolicy: 'feature_branch',
    verificationCommandsText: '',
  });
  const [hasCopied, setHasCopied] = useState(false);

  const mcpBaseUrl = useMemo(() => getKwiltMcpBaseUrl(), []);

  const isCreate = (route.params as any)?.mode === 'create';
  const definitionId = isCreate ? String((route.params as any)?.definitionId ?? '') : '';
  const targetId = !isCreate ? String((route.params as any)?.targetId ?? '') : '';

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        await ensureSignedInWithPrompt('settings');
        const defs = await listExecutionTargetDefinitions();
        setDefinitions(defs);
        if (!isCreate) {
          const tgs = await listExecutionTargets();
          const found = tgs.find((t) => t.id === targetId) ?? null;
          setTarget(found);
          if (found?.kind === 'cursor_repo') {
            setCursorDraft(draftFromTarget(found));
          }
        } else {
          // Default draft for Cursor installs.
          const def = defs.find((d) => d.id === definitionId) ?? null;
          if (def?.kind === 'cursor_repo') {
            setCursorDraft({
              displayName: '',
              repoName: '',
              repoUrl: '',
              branchPolicy: 'feature_branch',
              verificationCommandsText: '',
            });
          }
        }
      } catch (e: any) {
        Alert.alert('Unable to load', typeof e?.message === 'string' ? e.message : 'Unknown error');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [definitionId, isCreate, navigation, targetId]);

  const definition = useMemo(
    () => (isCreate ? definitions.find((d) => d.id === definitionId) ?? null : null),
    [definitions, definitionId, isCreate],
  );

  const kind = target?.kind ?? definition?.kind ?? 'unknown';
  const title = kind === 'cursor_repo' ? 'Cursor' : 'Destination';

  const handleCopyCursorSetup = async () => {
    const url = mcpBaseUrl ?? '<your-supabase-functions-base>/functions/v1/kwilt-mcp';
    const instructions =
      `Kwilt MCP (Streamable HTTP)\n` +
      `- URL: ${url}\n` +
      `- Auth: Authorization: Bearer <KWILT_PAT>\n` +
      `- Scope: Choose this destination’s execution_target_id when listing tasks.\n`;
    try {
      await Clipboard.setStringAsync(instructions);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    } catch {
      Alert.alert('Cursor setup', instructions);
    }
  };

  const handleSaveCursor = async () => {
    const missing = missingCursorFields(cursorDraft);
    if (missing.length > 0) {
      Alert.alert('Missing info', `Please fill: ${missing.join(', ')}`);
      return;
    }

    try {
      setLoading(true);
      if (isCreate) {
        if (!definition || definition.kind !== 'cursor_repo') throw new Error('Invalid destination definition');
        const config = {
          ...(definition.default_config ?? {}),
          repo_name: cursorDraft.repoName.trim(),
          repo_url: cursorDraft.repoUrl.trim() || null,
          branch_policy: cursorDraft.branchPolicy.trim() || 'feature_branch',
          verification_commands: normalizeCommands(cursorDraft.verificationCommandsText),
        };
        const created = await createExecutionTargetFromDefinition({
          definitionId: definition.id,
          kind: definition.kind,
          displayName: cursorDraft.displayName.trim(),
          config,
          requirements: definition.default_requirements ?? {},
          playbook: definition.default_playbook ?? {},
        });
        if (!created) throw new Error('Unable to create destination');
        navigation.goBack();
        return;
      }

      if (!target) throw new Error('Destination not found');
      const config = {
        ...(target.config ?? {}),
        repo_name: cursorDraft.repoName.trim(),
        repo_url: cursorDraft.repoUrl.trim() || null,
        branch_policy: cursorDraft.branchPolicy.trim() || 'feature_branch',
        verification_commands: normalizeCommands(cursorDraft.verificationCommandsText),
      };
      const updated = await updateExecutionTarget({
        id: target.id,
        displayName: cursorDraft.displayName.trim(),
        config,
      });
      if (!updated) throw new Error('Unable to update destination');
      setTarget(updated);
      Alert.alert('Saved', 'Destination updated.');
    } catch (e: any) {
      Alert.alert('Save failed', typeof e?.message === 'string' ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async () => {
    if (!target) return;
    try {
      setLoading(true);
      const updated = await updateExecutionTarget({ id: target.id, isEnabled: !target.is_enabled });
      if (!updated) throw new Error('Unable to update destination');
      setTarget(updated);
    } catch (e: any) {
      Alert.alert('Update failed', typeof e?.message === 'string' ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!target) return;
    Alert.alert('Delete destination?', 'This removes the destination from your instance.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          const ok = await deleteExecutionTarget({ id: target.id });
          setLoading(false);
          if (!ok) {
            Alert.alert('Delete failed', 'Unable to delete destination.');
            return;
          }
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader title={isCreate ? `Install ${title}` : title} onPressBack={() => navigation.goBack()} />
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'interactive'}
        >
          {kind === 'cursor_repo' ? (
            <>
              <Card style={styles.card}>
                <VStack space="sm">
                  <Heading size="sm">Cursor setup</Heading>
                  <Text style={styles.subtle}>Copy the MCP endpoint + auth header into Cursor.</Text>
                  <HStack justifyContent="space-between" alignItems="center">
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={handleCopyCursorSetup}
                      label={hasCopied ? 'Copied' : 'Copy setup instructions'}
                      disabled={loading}
                    />
                    <Text style={styles.subtle}>{mcpBaseUrl ? 'MCP URL ready' : 'MCP URL unknown'}</Text>
                  </HStack>
                </VStack>
              </Card>

              <Card style={styles.card}>
                <VStack space="sm">
                  <Heading size="sm">Destination details</Heading>
                  <Input
                    label="Display name"
                    value={cursorDraft.displayName}
                    onChangeText={(t) => setCursorDraft((c) => ({ ...c, displayName: t }))}
                    placeholder="Kwilt iOS app (Cursor)"
                  />
                  <Input
                    label="Repo name"
                    value={cursorDraft.repoName}
                    onChangeText={(t) => setCursorDraft((c) => ({ ...c, repoName: t }))}
                    placeholder="Kwilt"
                  />
                  <Input
                    label="Repo URL (optional)"
                    value={cursorDraft.repoUrl}
                    onChangeText={(t) => setCursorDraft((c) => ({ ...c, repoUrl: t }))}
                    placeholder="https://github.com/…"
                    autoCapitalize="none"
                  />
                  <Input
                    label="Branch policy"
                    value={cursorDraft.branchPolicy}
                    onChangeText={(t) => setCursorDraft((c) => ({ ...c, branchPolicy: t }))}
                    placeholder="feature_branch"
                    autoCapitalize="none"
                  />
                  <Textarea
                    label="Verification commands (one per line)"
                    value={cursorDraft.verificationCommandsText}
                    onChangeText={(t) => setCursorDraft((c) => ({ ...c, verificationCommandsText: t }))}
                    placeholder={'npm test\nnpm run lint'}
                  />

                  <HStack justifyContent="space-between" alignItems="center">
                    {!isCreate && target ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onPress={handleToggleEnabled}
                        disabled={loading}
                        label={target.is_enabled ? 'Disable' : 'Enable'}
                      />
                    ) : (
                      <View />
                    )}
                    <Button onPress={handleSaveCursor} disabled={loading} label={isCreate ? 'Install' : 'Save'} />
                  </HStack>

                  {!isCreate && target ? (
                    <HStack justifyContent="flex-end">
                      <Button variant="destructive" size="sm" onPress={handleDelete} disabled={loading} label="Delete" />
                    </HStack>
                  ) : null}
                </VStack>
              </Card>
            </>
          ) : (
            <Card style={styles.card}>
              <VStack space="xs">
                <Text style={styles.itemTitle}>Unsupported destination type</Text>
                <Text style={styles.subtle}>This destination kind isn’t configurable in-app yet.</Text>
              </VStack>
            </Card>
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



