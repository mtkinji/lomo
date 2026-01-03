import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { Button } from '../../ui/Button';
import { Input, KeyboardAwareScrollView, Text, VStack } from '../../ui/primitives';
import { cardSurfaceStyle, colors, spacing, typography } from '../../theme';
import { createProCodeAdmin, getAdminProCodesStatus } from '../../services/proCodes';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsAdminProCodes'>;

export function AdminProCodesScreen() {
  const navigation = useNavigation<Nav>();
  const [isChecking, setIsChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [statusEmail, setStatusEmail] = useState<string | null>(null);

  const [maxUsesRaw, setMaxUsesRaw] = useState('1');
  const [expiresAt, setExpiresAt] = useState('');
  const [note, setNote] = useState('');
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maxUses = useMemo(() => {
    const n = Number(maxUsesRaw);
    if (!Number.isFinite(n)) return 1;
    return Math.max(1, Math.floor(n));
  }, [maxUsesRaw]);

  useEffect(() => {
    setIsChecking(true);
    getAdminProCodesStatus({ requireAuth: true })
      .then((s) => {
        setIsAdmin(Boolean(s.isAdmin));
        setStatusEmail(typeof s.email === 'string' ? s.email : null);
      })
      .catch((e: any) => {
        const msg = typeof e?.message === 'string' ? e.message : 'Unable to check admin status';
        setError(msg);
        setIsAdmin(false);
      })
      .finally(() => setIsChecking(false));
  }, []);

  const canSubmit = isAdmin && !isChecking && !isSubmitting;

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader title="Admin • Pro codes" onPressBack={() => navigation.goBack()} />
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.body}>
              Generate Kwilt Pro access codes. This requires a signed-in Supabase user that is allowlisted on the
              server.
            </Text>
            {statusEmail ? <Text style={styles.body}>Signed in as: {statusEmail}</Text> : null}
            {!isChecking && !isAdmin ? (
              <Text style={styles.warning}>
                You are not authorized for Admin tools (or admin allowlist is not configured in Supabase).
              </Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <VStack space="sm">
              <Input
                label="Max uses"
                placeholder="1"
                value={maxUsesRaw}
                onChangeText={(t) => {
                  setMaxUsesRaw(t);
                  if (error) setError(null);
                }}
                keyboardType="number-pad"
                returnKeyType="done"
                variant="outline"
              />
              <Input
                label="Expires at (optional)"
                placeholder="2026-02-01T00:00:00Z"
                value={expiresAt}
                onChangeText={(t) => {
                  setExpiresAt(t);
                  if (error) setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="default"
                returnKeyType="done"
                variant="outline"
              />
              <Input
                label="Note (optional)"
                placeholder="internal QA"
                value={note}
                onChangeText={(t) => {
                  setNote(t);
                  if (error) setError(null);
                }}
                autoCapitalize="sentences"
                autoCorrect={false}
                keyboardType="default"
                returnKeyType="done"
                variant="outline"
                errorText={error ?? undefined}
              />

              <Button
                disabled={!canSubmit}
                onPress={() => {
                  if (!canSubmit) return;
                  setIsSubmitting(true);
                  setError(null);
                  createProCodeAdmin({
                    maxUses,
                    expiresAt: expiresAt.trim() ? expiresAt.trim() : undefined,
                    note: note.trim() ? note.trim() : undefined,
                  })
                    .then(async ({ code }) => {
                      setLastCode(code);
                      await Clipboard.setStringAsync(code);
                      Alert.alert('Created', 'Pro code copied to clipboard.');
                    })
                    .catch((e: any) => {
                      const msg = typeof e?.message === 'string' ? e.message : 'Unable to create code';
                      setError(msg);
                    })
                    .finally(() => setIsSubmitting(false));
                }}
              >
                <Text style={styles.buttonLabel}>{isSubmitting ? 'Generating…' : 'Generate code'}</Text>
              </Button>

              {lastCode ? (
                <View style={styles.result}>
                  <Text style={styles.resultLabel}>Last code</Text>
                  <Text style={styles.resultCode}>{lastCode}</Text>
                  <Button
                    variant="secondary"
                    onPress={async () => {
                      await Clipboard.setStringAsync(lastCode);
                      Alert.alert('Copied', 'Code copied to clipboard.');
                    }}
                  >
                    <Text style={styles.secondaryButtonLabel}>Copy again</Text>
                  </Button>
                </View>
              ) : null}
            </VStack>
          </View>
        </KeyboardAwareScrollView>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  body: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  warning: {
    ...typography.bodySm,
    color: colors.warning,
  },
  card: {
    ...(cardSurfaceStyle as any),
    padding: spacing.lg,
    gap: spacing.md,
  },
  buttonLabel: {
    ...typography.body,
    color: colors.canvas,
  },
  secondaryButtonLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  result: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  resultLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  resultCode: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
});


