import { useEffect, useMemo, useState } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { Button } from '../../ui/Button';
import { KeyboardAwareScrollView, Text, VStack, HStack, Heading, Input } from '../../ui/primitives';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { cardSurfaceStyle, colors, spacing, typography } from '../../theme';
import { createProCodeAdmin, getAdminProCodesStatus, grantProSuperAdmin } from '../../services/proCodes';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { getInstallId } from '../../services/installId';
import { adminListInstalls, adminListUsers, type DirectoryInstall, type DirectoryUser } from '../../services/kwiltUsersDirectory';
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

  const [tab, setTab] = useState<'users' | 'devices' | 'utilities'>('users');
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);
  const [installs, setInstalls] = useState<DirectoryInstall[]>([]);
  const [installsLoading, setInstallsLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [grantDrawerVisible, setGrantDrawerVisible] = useState(false);
  const [grantTarget, setGrantTarget] = useState<'user' | 'install'>('user');
  const [grantEmail, setGrantEmail] = useState('');
  const [grantInstallId, setGrantInstallId] = useState('');
  const [grantIsSubmitting, setGrantIsSubmitting] = useState(false);
  const [grantResult, setGrantResult] = useState<{ quotaKey: string; expiresAt: string; userId?: string | null; email?: string | null } | null>(
    null,
  );

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

  useEffect(() => {
    if (!canUseTools) return;
    if (tab !== 'users') return;
    if (usersLoading) return;
    setDirectoryError(null);
    setUsersLoading(true);
    adminListUsers({ page: usersPage, perPage: 100 })
      .then((res) => {
        setUsers(res.users);
      })
      .catch((e: any) => {
        setDirectoryError(typeof e?.message === 'string' ? e.message : 'Unable to load users');
      })
      .finally(() => setUsersLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseTools, tab, usersPage]);

  useEffect(() => {
    if (!canUseTools) return;
    if (tab !== 'devices') return;
    if (installsLoading) return;
    setDirectoryError(null);
    setInstallsLoading(true);
    adminListInstalls({ limit: 150 })
      .then((rows) => setInstalls(rows))
      .catch((e: any) => setDirectoryError(typeof e?.message === 'string' ? e.message : 'Unable to load devices'))
      .finally(() => setInstallsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseTools, tab]);

  const openGrantDrawer = async () => {
    setGrantResult(null);
    setGrantDrawerVisible(true);
    // Best-effort: prefill installId so granting to a device is one tap away.
    if (!grantInstallId.trim()) {
      try {
        const id = await getInstallId();
        setGrantInstallId(id);
      } catch {
        // ignore
      }
    }
  };

  const handleGrantOneYear = async () => {
    if (!canUseTools) {
      Alert.alert('Not authorized', 'You are not authorized for Super Admin tools.');
      return;
    }
    if (grantIsSubmitting) return;
    setGrantIsSubmitting(true);
    setGrantResult(null);
    try {
      if (grantTarget === 'user') {
        const email = grantEmail.trim();
        if (!email) {
          Alert.alert('Missing email', 'Enter the user email to grant Pro.');
          return;
        }
        const res = await grantProSuperAdmin({ targetType: 'user', email });
        if (!res?.quotaKey || !res?.expiresAt) throw new Error('No grant result returned');
        setGrantResult({ quotaKey: res.quotaKey, expiresAt: res.expiresAt, userId: res.userId, email: res.email });
        Alert.alert('Granted', 'Granted Pro for 1 year.');
        return;
      }

      const installId = grantInstallId.trim();
      if (!installId) {
        Alert.alert('Missing install ID', 'Enter the device install ID to grant Pro.');
        return;
      }
      const res = await grantProSuperAdmin({ targetType: 'install', installId });
      if (!res?.quotaKey || !res?.expiresAt) throw new Error('No grant result returned');
      setGrantResult({ quotaKey: res.quotaKey, expiresAt: res.expiresAt, userId: res.userId, email: res.email });
      Alert.alert('Granted', 'Granted Pro for 1 year.');
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Unable to grant Pro';
      Alert.alert('Unable to grant Pro', msg);
    } finally {
      setGrantIsSubmitting(false);
    }
  };

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader title="Kwilt Users" onPressBack={() => navigation.goBack()} />
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.body}>
              Internal directory (production). Requires a signed-in Supabase user allowlisted server-side.
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
              <Text style={styles.cardTitle}>Directory</Text>
              <SegmentedControl
                value={tab}
                onChange={(next) => setTab(next as any)}
                options={
                  [
                    { value: 'users', label: 'Users' },
                    { value: 'devices', label: 'Devices' },
                    { value: 'utilities', label: 'Utilities' },
                  ] as const
                }
              />
              {!canUseTools ? (
                <Text style={styles.body}>Sign in as a Super Admin to view the directory.</Text>
              ) : (
                <>
                  <Input
                    label="Search"
                    placeholder={tab === 'users' ? 'email or name' : 'install id or email'}
                    value={search}
                    onChangeText={setSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="default"
                    returnKeyType="done"
                    variant="outline"
                  />
                  {directoryError ? <Text style={styles.error}>{directoryError}</Text> : null}

                  {tab === 'users' ? (
                    <VStack space="sm">
                      <HStack alignItems="center" space="sm">
                        <Button
                          variant="secondary"
                          disabled={usersLoading}
                          onPress={() => setUsersPage((p) => Math.max(1, p - 1))}
                        >
                          <Text style={styles.secondaryButtonLabel}>Prev</Text>
                        </Button>
                        <Text style={styles.body}>Page {usersPage}</Text>
                        <Button variant="secondary" disabled={usersLoading} onPress={() => setUsersPage((p) => p + 1)}>
                          <Text style={styles.secondaryButtonLabel}>Next</Text>
                        </Button>
                      </HStack>
                      <Text style={styles.body}>
                        Showing {users.length} users (page {usersPage}). RevenueCat status appears when we’ve seen an install and received webhook updates.
                      </Text>
                      <VStack space="xs">
                        {users
                          .filter((u) => {
                            const q = search.trim().toLowerCase();
                            if (!q) return true;
                            const email = (u.email ?? '').toLowerCase();
                            const name = (u.name ?? '').toLowerCase();
                            return email.includes(q) || name.includes(q) || (u.userId ?? '').toLowerCase().includes(q);
                          })
                          .map((u) => (
                            <View key={u.userId} style={styles.row}>
                              <VStack space={0} flex={1}>
                                <Text style={styles.rowTitle}>{u.name || u.email || u.userId}</Text>
                                <Text style={styles.rowMeta}>
                                  installs: {u.installsCount} • last seen: {u.lastSeenAt ? formatExpiresAt(u.lastSeenAt) : 'unknown'}
                                </Text>
                              </VStack>
                              <VStack space={0} style={styles.rowRight}>
                                <Text style={styles.rowTitle}>{u.pro.isPro ? 'Pro' : 'Free'}</Text>
                                <Text style={styles.rowMeta}>
                                  {u.pro.isPro ? `${u.pro.source}${u.pro.expiresAt ? ` • exp ${formatExpiresAt(u.pro.expiresAt)}` : ''}` : ''}
                                </Text>
                              </VStack>
                            </View>
                          ))}
                      </VStack>
                    </VStack>
                  ) : tab === 'devices' ? (
                    <VStack space="sm">
                      <Text style={styles.body}>Showing {installs.length} devices (most recent).</Text>
                      <VStack space="xs">
                        {installs
                          .filter((i) => {
                            const q = search.trim().toLowerCase();
                            if (!q) return true;
                            const id = (i.installId ?? '').toLowerCase();
                            const email = (i.userEmail ?? '').toLowerCase();
                            return id.includes(q) || email.includes(q);
                          })
                          .map((i) => (
                            <View key={i.installId} style={styles.row}>
                              <VStack space={0} flex={1}>
                                <Text style={styles.rowTitle}>{i.installId}</Text>
                                <Text style={styles.rowMeta}>
                                  {i.userEmail ? i.userEmail : 'anonymous'} • last seen:{' '}
                                  {i.lastSeenAt ? formatExpiresAt(i.lastSeenAt) : 'unknown'}
                                </Text>
                              </VStack>
                              <VStack space={0} style={styles.rowRight}>
                                <Text style={styles.rowTitle}>{i.pro.isPro ? 'Pro' : 'Free'}</Text>
                                <Text style={styles.rowMeta}>
                                  {i.pro.isPro ? `${i.pro.source}${i.pro.expiresAt ? ` • exp ${formatExpiresAt(i.pro.expiresAt)}` : ''}` : ''}
                                </Text>
                              </VStack>
                            </View>
                          ))}
                      </VStack>
                    </VStack>
                  ) : null}
                </>
              )}
            </VStack>
          </View>

          {tab === 'utilities' ? (
            <>
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

              <View style={styles.card}>
                <VStack space="sm">
                  <Text style={styles.cardTitle}>Grant Pro (1 year)</Text>
                  <Text style={styles.body}>Manually grant Pro to a user or device. This takes effect immediately.</Text>
                  <Button disabled={!canUseTools} onPress={() => void openGrantDrawer()}>
                    <Text style={styles.buttonLabel}>Open grant tool</Text>
                  </Button>
                </VStack>
              </View>
            </>
          ) : null}
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

        <BottomDrawer
          visible={grantDrawerVisible}
          onClose={() => setGrantDrawerVisible(false)}
          snapPoints={['62%']}
          keyboardAvoidanceEnabled
        >
          <VStack space="md">
            <VStack space="xs">
              <Heading>Grant Pro (1 year)</Heading>
              <Text style={styles.body}>Creates a 1-year Pro entitlement for either a user or a device install ID.</Text>
            </VStack>

            <SegmentedControl
              value={grantTarget}
              onChange={(next) => {
                setGrantTarget(next as 'user' | 'install');
                setGrantResult(null);
              }}
              options={
                [
                  { value: 'user', label: 'User' },
                  { value: 'install', label: 'Device' },
                ] as const
              }
            />

            {grantTarget === 'user' ? (
              <Input
                label="User email"
                placeholder="someone@example.com"
                value={grantEmail}
                onChangeText={(t) => {
                  setGrantEmail(t);
                  setGrantResult(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="done"
                variant="outline"
              />
            ) : (
              <Input
                label="Install ID"
                placeholder="xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
                value={grantInstallId}
                onChangeText={(t) => {
                  setGrantInstallId(t);
                  setGrantResult(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="default"
                returnKeyType="done"
                variant="outline"
              />
            )}

            <Button disabled={!canUseTools || grantIsSubmitting} onPress={() => void handleGrantOneYear()}>
              <Text style={styles.buttonLabel}>{grantIsSubmitting ? 'Granting…' : 'Grant Pro for 1 year'}</Text>
            </Button>

            {grantResult ? (
              <View style={styles.result}>
                <Text style={styles.resultLabel}>Granted</Text>
                <Text style={styles.body}>Quota key: {grantResult.quotaKey}</Text>
                <Text style={styles.body}>Expires: {formatExpiresAt(grantResult.expiresAt)}</Text>
                <HStack space="sm" alignItems="center">
                  <Button
                    variant="secondary"
                    onPress={async () => {
                      await Clipboard.setStringAsync(grantResult.quotaKey);
                      Alert.alert('Copied', 'Quota key copied to clipboard.');
                    }}
                  >
                    <Text style={styles.secondaryButtonLabel}>Copy quota key</Text>
                  </Button>
                </HStack>
              </View>
            ) : null}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
  },
  rowTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  rowMeta: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  rowRight: {
    alignItems: 'flex-end',
    marginLeft: spacing.md,
  },
});


