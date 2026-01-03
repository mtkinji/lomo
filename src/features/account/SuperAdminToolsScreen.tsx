import { useEffect, useMemo, useState } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { Button } from '../../ui/Button';
import { KeyboardAwareScrollView, Text, VStack, HStack, Heading } from '../../ui/primitives';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { cardSurfaceStyle, colors, spacing, typography } from '../../theme';
import { createProCodeAdmin, getAdminProCodesStatus } from '../../services/proCodes';
import { BottomDrawer } from '../../ui/BottomDrawer';
import {
  clearAdminEntitlementsOverrideTier,
  getAdminEntitlementsOverrideTier,
  setAdminEntitlementsOverrideTier,
  type AdminEntitlementsOverrideTier,
} from '../../services/entitlements';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import { useAppStore } from '../../store/useAppStore';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsSuperAdminTools'>;

const oneYearFromNowIso = () => {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString();
};

const formatExpiresAt = (iso: string): string => {
  try {
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms)) return iso;
    return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
};

function buildShareMessage(args: { code: string; expiresAt?: string | null }) {
  const expires =
    args.expiresAt && args.expiresAt.trim()
      ? `\nExpires: ${formatExpiresAt(args.expiresAt)}`
      : '\nExpires: 1 year after generation';
  return `Kwilt Pro access code (one-time): ${args.code}${expires}\n\nOpen Kwilt → Settings → Redeem Pro code.`;
}

export function SuperAdminToolsScreen() {
  const navigation = useNavigation<Nav>();
  const [isChecking, setIsChecking] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [statusEmail, setStatusEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusHttp, setStatusHttp] = useState<number | null>(null);
  const [statusErrorMessage, setStatusErrorMessage] = useState<string | null>(null);
  const [debugBaseUrl, setDebugBaseUrl] = useState<string | null>(null);
  const [debugSupabaseUrl, setDebugSupabaseUrl] = useState<string | null>(null);
  const authIdentity = useAppStore((s) => s.authIdentity);

  const [tier, setTier] = useState<AdminEntitlementsOverrideTier>('real');
  const isPro = useEntitlementsStore((s) => s.isPro);
  const isProToolsTrial = useEntitlementsStore((s) => s.isProToolsTrial);
  const lastSource = useEntitlementsStore((s) => s.lastSource);
  const refreshEntitlements = useEntitlementsStore((s) => s.refreshEntitlements);

  const [lastCode, setLastCode] = useState<string | null>(null);
  const [lastExpiresAt, setLastExpiresAt] = useState<string | null>(null);
  const [codeDrawerVisible, setCodeDrawerVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    setIsChecking(true);
    getAdminProCodesStatus({ requireAuth: true })
      .then((s) => {
        if (!mounted) return;
        setIsSuperAdmin(Boolean(s.role === 'super_admin'));
        setStatusEmail(typeof s.email === 'string' ? s.email : null);
        setStatusHttp(typeof s.httpStatus === 'number' ? s.httpStatus : null);
        setStatusErrorMessage(typeof s.errorMessage === 'string' ? s.errorMessage : null);
        setDebugBaseUrl(typeof s.debugProCodesBaseUrl === 'string' ? s.debugProCodesBaseUrl : null);
        setDebugSupabaseUrl(typeof s.debugSupabaseUrl === 'string' ? s.debugSupabaseUrl : null);
      })
      .catch((e: any) => {
        if (!mounted) return;
        const msg = typeof e?.message === 'string' ? e.message : 'Unable to check admin status';
        setError(msg);
        setIsSuperAdmin(false);
        setStatusHttp(null);
        setStatusErrorMessage(null);
        setDebugBaseUrl(null);
        setDebugSupabaseUrl(null);
      })
      .finally(() => {
        if (!mounted) return;
        setIsChecking(false);
      });

    getAdminEntitlementsOverrideTier()
      .then((v) => {
        if (!mounted) return;
        setTier(v);
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  const canUseTools = isSuperAdmin && !isChecking;
  const canGenerate = !isChecking && !isSubmitting;

  const tierOptions = useMemo(
    () =>
      [
        { value: 'real', label: 'Real' },
        { value: 'free', label: 'Free' },
        { value: 'trial', label: 'Trial' },
        { value: 'pro', label: 'Pro' },
      ] as const,
    [],
  );

  const handleSetTier = async (next: AdminEntitlementsOverrideTier) => {
    setTier(next);
    setError(null);
    try {
      if (next === 'real') {
        await clearAdminEntitlementsOverrideTier();
      } else {
        await setAdminEntitlementsOverrideTier(next);
      }
      await refreshEntitlements({ force: true });
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Unable to update tier';
      setError(msg);
    }
  };

  const handleCreateOneYear = async () => {
    if (isChecking || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const expiresAt = oneYearFromNowIso();
      const { code } = await createProCodeAdmin({
        maxUses: 1,
        expiresAt,
      });
      setLastCode(code);
      setLastExpiresAt(expiresAt);
      await Clipboard.setStringAsync(code);
      setCodeDrawerVisible(true);
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Unable to create/send code';
      setError(msg);
      Alert.alert('Unable to create code', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader title="Super Admin" onPressBack={() => navigation.goBack()} />
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.body}>
              Super Admin tools (production). Requires a signed-in Supabase user allowlisted server-side.
            </Text>
            {authIdentity?.email ? (
              <Text style={styles.body}>Signed in as: {authIdentity.email}</Text>
            ) : statusEmail ? (
              <Text style={styles.body}>Signed in as: {statusEmail}</Text>
            ) : null}
            {!isChecking && !isSuperAdmin ? (
              <Text style={styles.warning}>
                You are not authorized for Super Admin tools.
                {__DEV__ && statusHttp ? ` (status: ${statusHttp})` : ''}
                {__DEV__ && statusErrorMessage ? ` ${statusErrorMessage}` : ''}
                {__DEV__ && statusHttp === 403 ? ' Signed in, but not allowlisted in Supabase function secrets.' : ''}
              </Text>
            ) : null}
            {__DEV__ && !isChecking && !isSuperAdmin && (debugSupabaseUrl || debugBaseUrl) ? (
              <Text style={styles.debugMeta}>
                Debug: supabaseUrl={debugSupabaseUrl ?? 'unknown'} • proCodesBase={debugBaseUrl ?? 'unknown'}
              </Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <VStack space="sm">
              <Text style={styles.cardTitle}>Simulate plan (device)</Text>
              <Text style={styles.body}>
                Current: {isPro ? 'Pro' : isProToolsTrial ? 'Trial' : 'Free'} • source:{' '}
                {lastSource ?? 'unknown'}
              </Text>
              <SegmentedControl
                value={tier}
                onChange={(next) => handleSetTier(next as AdminEntitlementsOverrideTier)}
                options={tierOptions as any}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </VStack>
          </View>

          <View style={styles.card}>
            <VStack space="sm">
              <Text style={styles.cardTitle}>1-year Pro access code (one-time)</Text>
              <Text style={styles.body}>One-time use. Expires 1 year after generation.</Text>

              <Button disabled={!canGenerate} onPress={() => handleCreateOneYear()}>
                <Text style={styles.buttonLabel}>
                  {isChecking ? 'Checking access…' : isSubmitting ? 'Working…' : 'Generate one-time code'}
                </Text>
              </Button>

              {lastCode ? (
                <View style={styles.result}>
                  <Text style={styles.resultLabel}>Last generated</Text>
                  <Text style={styles.body}>Open to view + share the code.</Text>
                  <Button variant="secondary" onPress={() => setCodeDrawerVisible(true)}>
                    <Text style={styles.secondaryButtonLabel}>Open</Text>
                  </Button>
                </View>
              ) : null}
            </VStack>
          </View>
        </KeyboardAwareScrollView>

        <BottomDrawer
          visible={codeDrawerVisible}
          onClose={() => setCodeDrawerVisible(false)}
          snapPoints={['42%']}
          keyboardAvoidanceEnabled={false}
        >
          <VStack space="md">
            <VStack space="xs">
              <Heading>Pro code</Heading>
              {lastExpiresAt ? (
                <Text style={styles.body}>One-time use • expires {formatExpiresAt(lastExpiresAt)}</Text>
              ) : (
                <Text style={styles.body}>One-time use</Text>
              )}
            </VStack>

            <View style={styles.drawerCodeBox}>
              <Text style={styles.drawerCode}>{lastCode ?? ''}</Text>
            </View>

            <Text style={styles.drawerHint}>Copied to clipboard on generation.</Text>

            <View style={styles.drawerActions}>
              <Button
                variant="secondary"
                disabled={!lastCode}
                onPress={async () => {
                  if (!lastCode) return;
                  await Clipboard.setStringAsync(lastCode);
                  Alert.alert('Copied', 'Code copied to clipboard.');
                }}
              >
                <Text style={styles.secondaryButtonLabel}>Copy</Text>
              </Button>
              <Button
                variant="secondary"
                disabled={!lastCode}
                onPress={async () => {
                  if (!lastCode) return;
                  await Share.share({ message: buildShareMessage({ code: lastCode, expiresAt: lastExpiresAt }) });
                }}
              >
                <Text style={styles.secondaryButtonLabel}>Share</Text>
              </Button>
            </View>
          </VStack>
        </BottomDrawer>
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
  error: {
    ...typography.bodySm,
    color: colors.accentRoseStrong,
  },
  debugMeta: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  card: {
    ...(cardSurfaceStyle as any),
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
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
  resultMeta: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  drawerCodeBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
  },
  drawerCode: {
    ...typography.titleMd,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  drawerHint: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  drawerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});


