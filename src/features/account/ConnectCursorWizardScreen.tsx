import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Button, Card, HStack, Heading, Input, Text, Textarea, VStack, KeyboardAwareScrollView, Badge } from '../../ui/primitives';
import { colors, spacing, typography, cardSurfaceStyle } from '../../theme';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { ensureSignedInWithPrompt } from '../../services/backend/auth';
import { createPat } from '../../services/executionTargets/pats';
import { BottomDrawer } from '../../ui/BottomDrawer';
import {
  createExecutionTargetFromDefinition,
  getKwiltMcpBaseUrl,
  listExecutionTargetDefinitions,
  listExecutionTargets,
  updateExecutionTarget,
  type ExecutionTargetDefinitionRow,
  type ExecutionTargetRow,
} from '../../services/executionTargets/executionTargets';
import { testKwiltMcpConnection } from '../../services/executionTargets/kwiltMcpHealth';
import { useToastStore } from '../../store/useToastStore';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsHome'>;

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

type StepId = 'destination' | 'key' | 'cursor' | 'test';
const STEPS: Array<{ id: StepId; label: string }> = [
  { id: 'destination', label: 'Destination' },
  { id: 'key', label: 'Cursor Key' },
  { id: 'cursor', label: 'Add to Cursor' },
  { id: 'test', label: 'Test' },
];

export function ConnectCursorWizardScreen() {
  const navigation = useNavigation<Nav>();
  const [loading, setLoading] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex]?.id ?? 'destination';

  const [definitions, setDefinitions] = useState<ExecutionTargetDefinitionRow[]>([]);
  const [target, setTarget] = useState<ExecutionTargetRow | null>(null);
  const [cursorDraft, setCursorDraft] = useState<CursorConfigDraft>({
    displayName: '',
    repoName: '',
    repoUrl: '',
    branchPolicy: 'feature_branch',
    verificationCommandsText: '',
  });

  // Cursor Key (PAT) is held in-memory only.
  const [cursorKey, setCursorKey] = useState<string>('');
  const [cursorKeyPrefix, setCursorKeyPrefix] = useState<string>('');

  // Test status
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; tools?: string[] } | null>(null);
  const [dialog, setDialog] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  const mcpUrl = useMemo(() => getKwiltMcpBaseUrl(), []);
  const showToast = useToastStore((s) => s.showToast);

  const cursorDefinition = useMemo(
    () => definitions.find((d) => String(d.kind) === 'cursor_repo') ?? null,
    [definitions],
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await ensureSignedInWithPrompt('settings');
        const [defs, tgs] = await Promise.all([listExecutionTargetDefinitions(), listExecutionTargets()]);
        setDefinitions(defs);

        const cursorTarget = tgs.find((t) => String(t.kind) === 'cursor_repo') ?? null;
        setTarget(cursorTarget);
        if (cursorTarget) {
          setCursorDraft(draftFromTarget(cursorTarget));
        } else {
          setCursorDraft({
            displayName: 'Kwilt (Cursor)',
            repoName: '',
            repoUrl: '',
            branchPolicy: 'feature_branch',
            verificationCommandsText: '',
          });
        }
      } catch (e: any) {
        setDialog({
          visible: true,
          title: 'Unable to load',
          message: typeof e?.message === 'string' ? e.message : 'Unknown error',
        });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [navigation]);

  const goNext = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const goBackStep = () => setStepIndex((i) => Math.max(i - 1, 0));

  const copy = async (text: string, msg = 'Copied') => {
    try {
      await Clipboard.setStringAsync(text);
      showToast({ message: msg, variant: 'success', durationMs: 1800 });
    } catch {
      setDialog({ visible: true, title: 'Copy', message: text });
    }
  };

  const buildCursorConfigSnippet = () => {
    const url = mcpUrl ?? '<your-supabase-functions-base>/functions/v1/kwilt-mcp';
    return JSON.stringify(
      {
        mcpServers: {
          'kwilt-mcp': {
            url,
            headers: {
              Authorization: 'Bearer ${env:KWILT_CURSOR_KEY}',
            },
          },
        },
      },
      null,
      2,
    );
  };

  const saveDestination = async () => {
    const missing = missingCursorFields(cursorDraft);
    if (missing.length > 0) {
      setDialog({ visible: true, title: 'Missing info', message: `Please fill: ${missing.join(', ')}` });
      return;
    }
    if (!cursorDefinition) {
      setDialog({
        visible: true,
        title: 'Unavailable',
        message: 'Cursor destination definition not found. Have migrations been applied?',
      });
      return;
    }

    setLoading(true);
    try {
      const config = {
        ...(target?.config ?? cursorDefinition.default_config ?? {}),
        repo_name: cursorDraft.repoName.trim(),
        repo_url: cursorDraft.repoUrl.trim() || null,
        branch_policy: cursorDraft.branchPolicy.trim() || 'feature_branch',
        verification_commands: normalizeCommands(cursorDraft.verificationCommandsText),
      };

      if (target) {
        const updated = await updateExecutionTarget({
          id: target.id,
          displayName: cursorDraft.displayName.trim(),
          config,
        });
        if (!updated) throw new Error('Unable to save destination');
        setTarget(updated);
      } else {
        const created = await createExecutionTargetFromDefinition({
          definitionId: cursorDefinition.id,
          kind: cursorDefinition.kind,
          displayName: cursorDraft.displayName.trim(),
          config,
          requirements: cursorDefinition.default_requirements ?? {},
          playbook: cursorDefinition.default_playbook ?? {},
        });
        if (!created) throw new Error('Unable to create destination');
        setTarget(created);
      }

      showToast({ message: 'Destination saved', variant: 'success', durationMs: 1800 });
      goNext();
    } catch (e: any) {
      setDialog({
        visible: true,
        title: 'Save failed',
        message: typeof e?.message === 'string' ? e.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateCursorKey = async () => {
    setLoading(true);
    try {
      await ensureSignedInWithPrompt('settings');
      const label = `Cursor (${cursorDraft.repoName.trim() || 'repo'})`;
      const res = await createPat({ label });
      setCursorKey(res.token);
      setCursorKeyPrefix(res.tokenPrefix);
      await copy(res.token, 'Cursor Key copied');
    } catch (e: any) {
      setDialog({
        visible: true,
        title: 'Unable to create Cursor Key',
        message: typeof e?.message === 'string' ? e.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const runTest = async () => {
    setLoading(true);
    try {
      const res = await testKwiltMcpConnection({ token: cursorKey, url: mcpUrl });
      if (!res.ok) {
        setTestResult({ ok: false, message: res.message });
        return;
      }
      setTestResult({ ok: true, message: `Connected (${res.tools.length} tools)`, tools: res.tools });
    } catch (e: any) {
      setTestResult({ ok: false, message: typeof e?.message === 'string' ? e.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const renderStepHeader = () => (
    <Card style={styles.stepperCard}>
      <HStack justifyContent="space-between" alignItems="center">
        <VStack space="xs" style={{ flex: 1 }}>
          <Text style={styles.stepTitle}>Connect Cursor</Text>
          <Text style={styles.subtle}>Set up a Cursor destination so Cursor can create and manage your Activities.</Text>
        </VStack>
      </HStack>
      <HStack space="xs" alignItems="center" style={styles.stepperRow}>
        {STEPS.map((s, idx) => {
          const isActive = idx === stepIndex;
          const isDone = idx < stepIndex;
          return (
            <Badge key={s.id} variant={isActive ? 'default' : 'secondary'}>
              {isDone ? `✓ ${s.label}` : s.label}
            </Badge>
          );
        })}
      </HStack>
    </Card>
  );

  const renderDestinationStep = () => (
    <VStack space="sm">
      <Card style={styles.card}>
        <VStack space="sm">
          <Heading variant="sm">1) Destination</Heading>
          <Text style={styles.subtle}>Tell Kwilt which repo Cursor should operate on and how to verify changes.</Text>
          <Input
            label="Display name"
            value={cursorDraft.displayName}
            onChangeText={(t) => setCursorDraft((c) => ({ ...c, displayName: t }))}
            placeholder="Kwilt (Cursor)"
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
          <HStack justifyContent="flex-end">
            <Button onPress={saveDestination} disabled={loading} label={target ? 'Save & continue' : 'Install & continue'} />
          </HStack>
        </VStack>
      </Card>
    </VStack>
  );

  const renderKeyStep = () => (
    <VStack space="sm">
      <Card style={styles.card}>
        <VStack space="sm">
          <Heading variant="sm">2) Cursor Key</Heading>
          <Text style={styles.subtle}>
            Generate a Cursor Key so Cursor can authenticate. This is a Personal Access Token (PAT).
          </Text>
          <HStack justifyContent="space-between" alignItems="center">
            <Button
              variant="cta"
              size="sm"
              onPress={generateCursorKey}
              disabled={loading}
              label={cursorKey ? 'Generate new key' : 'Generate key'}
            />
            {cursorKeyPrefix ? <Text style={styles.subtle}>Last key: {cursorKeyPrefix}…</Text> : <View />}
          </HStack>
          {cursorKey ? (
            <Card style={styles.monoCard}>
              <VStack space="xs">
                <Text style={styles.subtle}>Key (copied on generation)</Text>
                <Text style={styles.monoText} selectable>
                  {cursorKey}
                </Text>
                <HStack justifyContent="flex-end" space="xs">
                  <Button variant="secondary" size="sm" onPress={() => copy(cursorKey, 'Cursor Key copied')} label="Copy key" />
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={() => copy(`Authorization: Bearer ${cursorKey}`, 'Auth header copied')}
                    label="Copy auth header"
                  />
                </HStack>
              </VStack>
            </Card>
          ) : null}

          <HStack justifyContent="space-between" alignItems="center">
            <Button variant="secondary" size="sm" onPress={goBackStep} disabled={loading} label="Back" />
            <Button onPress={goNext} disabled={loading || !cursorKey} label="Continue" />
          </HStack>
        </VStack>
      </Card>
    </VStack>
  );

  const renderCursorStep = () => {
    const url = mcpUrl ?? '<your-supabase-functions-base>/functions/v1/kwilt-mcp';
    const authHeader = cursorKey ? `Authorization: Bearer ${cursorKey}` : 'Authorization: Bearer <CURSOR_KEY>';
    return (
      <VStack space="sm">
        <Card style={styles.card}>
          <VStack space="sm">
            <Heading variant="sm">3) Add to Cursor</Heading>
            <Text style={styles.subtle}>Paste these into Cursor MCP settings.</Text>

            <Card style={styles.monoCard}>
              <VStack space="xs">
                <Text style={styles.subtle}>Cursor server URL</Text>
                <Text style={styles.monoText} selectable>
                  {url}
                </Text>
                <HStack justifyContent="flex-end">
                  <Button variant="secondary" size="sm" onPress={() => copy(url, 'URL copied')} label="Copy URL" />
                </HStack>
              </VStack>
            </Card>

            <Card style={styles.monoCard}>
              <VStack space="xs">
                <Text style={styles.subtle}>Auth header</Text>
                <Text style={styles.monoText} selectable>
                  {authHeader}
                </Text>
                <HStack justifyContent="flex-end">
                  <Button variant="secondary" size="sm" onPress={() => copy(authHeader, 'Auth header copied')} label="Copy header" />
                </HStack>
              </VStack>
            </Card>

            <Card style={styles.monoCard}>
              <VStack space="xs">
                <Text style={styles.subtle}>Config snippet</Text>
                <Text style={styles.monoText} selectable>
                  {buildCursorConfigSnippet()}
                </Text>
                <Text style={styles.subtle}>
                  Set env var <Text style={styles.inlineMono}>KWILT_CURSOR_KEY</Text> in the shell running Cursor.
                </Text>
                <HStack justifyContent="flex-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={() => copy(buildCursorConfigSnippet(), 'Config snippet copied')}
                    label="Copy snippet"
                  />
                </HStack>
              </VStack>
            </Card>

            <HStack justifyContent="space-between" alignItems="center">
              <Button variant="secondary" size="sm" onPress={goBackStep} disabled={loading} label="Back" />
              <Button onPress={goNext} disabled={loading} label="Continue" />
            </HStack>
          </VStack>
        </Card>
      </VStack>
    );
  };

  const renderTestStep = () => (
    <VStack space="sm">
      <Card style={styles.card}>
        <VStack space="sm">
          <Heading variant="sm">4) Test</Heading>
          <Text style={styles.subtle}>
            Run a quick check to confirm your Cursor Key can reach Kwilt MCP and list tools.
          </Text>
          <HStack justifyContent="space-between" alignItems="center">
            <Button variant="secondary" size="sm" onPress={goBackStep} disabled={loading} label="Back" />
            <Button onPress={runTest} disabled={loading || !cursorKey} label="Run test" />
          </HStack>

          {testResult ? (
            <Card style={[styles.statusCard, testResult.ok ? styles.statusOk : styles.statusBad]}>
              <VStack space="xs">
                <Text style={styles.statusTitle}>{testResult.ok ? 'Connected' : 'Not connected'}</Text>
                <Text style={styles.subtle}>{testResult.message}</Text>
                {testResult.ok && testResult.tools ? (
                  <Text style={styles.subtle} numberOfLines={2}>
                    Tools: {testResult.tools.slice(0, 6).join(', ')}
                  </Text>
                ) : null}
              </VStack>
            </Card>
          ) : null}

          <HStack justifyContent="flex-end">
            <Button
              variant="secondary"
              size="sm"
              onPress={() => {
                // Clear sensitive token when leaving.
                setCursorKey('');
                setCursorKeyPrefix('');
                navigation.goBack();
              }}
              label="Done"
            />
          </HStack>
        </VStack>
      </Card>
    </VStack>
  );

  const renderStepBody = () => {
    if (step === 'destination') return renderDestinationStep();
    if (step === 'key') return renderKeyStep();
    if (step === 'cursor') return renderCursorStep();
    return renderTestStep();
  };

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader title="Connect Cursor" onPressBack={() => navigation.goBack()} />
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'interactive'}
        >
          {renderStepHeader()}
          {renderStepBody()}
        </KeyboardAwareScrollView>
      </View>

      <BottomDrawer
        visible={dialog.visible}
        onClose={() => setDialog((d) => ({ ...d, visible: false }))}
        snapPoints={['45%']}
        scrimToken="pineSubtle"
      >
        <View style={styles.dialogContainer}>
          <VStack space="sm">
            <Heading variant="sm">{dialog.title}</Heading>
            <Card style={styles.monoCard}>
              <VStack space="xs">
                <Text style={styles.monoText} selectable>
                  {dialog.message}
                </Text>
                <HStack justifyContent="flex-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={() => copy(dialog.message, 'Copied')}
                    label="Copy"
                    disabled={loading}
                  />
                </HStack>
              </VStack>
            </Card>
            <HStack justifyContent="flex-end">
              <Button onPress={() => setDialog((d) => ({ ...d, visible: false }))} label="OK" />
            </HStack>
          </VStack>
        </View>
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
  stepperCard: {
    ...cardSurfaceStyle,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  stepperRow: {
    flexWrap: 'wrap',
  },
  stepTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  card: {
    ...cardSurfaceStyle,
    padding: spacing.lg,
  },
  subtle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  monoCard: {
    ...cardSurfaceStyle,
    padding: spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.cardBorder,
  },
  monoText: {
    ...typography.mono,
    color: colors.textPrimary,
  },
  inlineMono: {
    ...typography.mono,
    color: colors.textSecondary,
  },
  statusCard: {
    ...cardSurfaceStyle,
    padding: spacing.md,
  },
  statusOk: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  statusBad: {
    borderWidth: 1,
    borderColor: colors.destructive,
  },
  statusTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  dialogContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
});


