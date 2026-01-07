import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Share, StyleSheet, View, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
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
import { createProCodeAdmin, getAdminProCodesStatus, grantProSuperAdmin, sendProCodeSuperAdmin } from '../../services/proCodes';
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
  const [sendToEmail, setSendToEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [codeDrawerVisible, setCodeDrawerVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [tab, setTab] = useState<'directory' | 'utilities'>('directory');
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersHasMore, setUsersHasMore] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [installs, setInstalls] = useState<DirectoryInstall[]>([]);
  const [installsLimit, setInstallsLimit] = useState(50);
  const [installsHasMore, setInstallsHasMore] = useState(true);
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

  const USERS_PER_PAGE = 50;
  const INSTALLS_PAGE_SIZE = 50;
  const LOAD_MORE_THRESHOLD_PX = 220;

  const isFetchingMoreRef = useRef(false);

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
      setSendToEmail('');
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

  const loadUsersPage = async (page: number) => {
    if (!canUseTools) return;
    if (usersLoading) return;
    if (!usersHasMore && page !== 1) return;
    setDirectoryError(null);
    setUsersLoading(true);
    try {
      const res = await adminListUsers({ page, perPage: USERS_PER_PAGE });
      const nextUsers = Array.isArray(res.users) ? res.users : [];
      setUsers((prev) => {
        if (page === 1) return nextUsers;
        const map = new Map(prev.map((u) => [u.userId, u] as const));
        for (const u of nextUsers) map.set(u.userId, u);
        return Array.from(map.values());
      });
      setUsersPage(page);
      setUsersHasMore(nextUsers.length >= USERS_PER_PAGE);
    } catch (e: any) {
      setDirectoryError(typeof e?.message === 'string' ? e.message : 'Unable to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  const loadInstalls = async (limit: number) => {
    if (!canUseTools) return;
    if (installsLoading) return;
    if (!installsHasMore && limit !== INSTALLS_PAGE_SIZE) return;
    setDirectoryError(null);
    setInstallsLoading(true);
    try {
      const rows = await adminListInstalls({ limit });
      setInstalls(rows);
      setInstallsLimit(limit);
      // Best-effort: if the server returned fewer than requested, we likely reached the end.
      setInstallsHasMore(rows.length >= limit);
    } catch (e: any) {
      setDirectoryError(typeof e?.message === 'string' ? e.message : 'Unable to load devices');
    } finally {
      setInstallsLoading(false);
    }
  };

  useEffect(() => {
    if (!canUseTools) return;
    if (tab !== 'directory') return;
    if (users.length > 0) return;
    void loadUsersPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseTools, tab]);

  useEffect(() => {
    if (!canUseTools) return;
    if (tab !== 'directory') return;
    if (installs.length > 0) return;
    void loadInstalls(INSTALLS_PAGE_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseTools, tab]);

  type DirectoryRow = {
    key: string;
    title: string;
    subtitle: string;
    lastSeenAt: string | null;
    installsCount?: number | null;
    pro: {
      isPro: boolean;
      source: string;
      expiresAt: string | null;
    };
  };

  const directoryRows = useMemo<DirectoryRow[]>(() => {
    const byUserId = new Map<string, DirectoryRow>();
    const byEmail = new Map<string, DirectoryRow>();
    const anonByInstallId = new Map<string, DirectoryRow>();

    // Index installs by userId so we can "reveal" an install id if a user has no email.
    const mostRecentInstallByUserId = new Map<string, DirectoryInstall>();
    for (const i of installs) {
      if (!i.userId) continue;
      const prev = mostRecentInstallByUserId.get(i.userId);
      const prevMs = prev?.lastSeenAt ? Date.parse(prev.lastSeenAt) : -1;
      const nextMs = i.lastSeenAt ? Date.parse(i.lastSeenAt) : -1;
      if (!prev || nextMs > prevMs) mostRecentInstallByUserId.set(i.userId, i);
    }

    // Users (canonical identities when present).
    for (const u of users) {
      const install = mostRecentInstallByUserId.get(u.userId);
      const installIds = Array.isArray(u.installIds) && u.installIds.length > 0 ? u.installIds : install?.installId ? [install.installId] : [];
      const title = u.email?.trim()
        ? u.email
        : install?.installId
          ? install.installId
          : u.userId;
      const subtitle = u.email?.trim()
        ? `${u.name ? `${u.name} • ` : ''}installs: ${u.installsCount} • last seen: ${u.lastSeenAt ? formatExpiresAt(u.lastSeenAt) : 'unknown'}${
            installIds.length > 0 ? ` • device: ${installIds[0]}` : ''
          }`
        : `anonymous • last seen: ${u.lastSeenAt ? formatExpiresAt(u.lastSeenAt) : 'unknown'}`;

      byUserId.set(u.userId, {
        key: `user:${u.userId}`,
        title,
        subtitle,
        lastSeenAt: u.lastSeenAt ?? install?.lastSeenAt ?? null,
        installsCount: u.installsCount,
        pro: u.pro,
      });
    }

    // Installs: fill gaps for users not yet loaded (and anonymous devices).
    for (const i of installs) {
      if (i.userId) {
        // If the user isn't loaded yet, create a "shadow" row keyed by userId.
        if (!byUserId.has(i.userId)) {
          const title = i.userEmail?.trim() ? i.userEmail : i.installId;
          const subtitle = `${i.userEmail?.trim() ? 'email known' : 'anonymous'} • last seen: ${i.lastSeenAt ? formatExpiresAt(i.lastSeenAt) : 'unknown'}`;
          byUserId.set(i.userId, {
            key: `user:${i.userId}`,
            title,
            subtitle,
            lastSeenAt: i.lastSeenAt ?? null,
            installsCount: null,
            pro: i.pro,
          });
        }
        continue;
      }

      // No userId: either anonymous or "email-only" identity.
      if (i.userEmail?.trim()) {
        const emailKey = i.userEmail.trim().toLowerCase();
        const prev = byEmail.get(emailKey);
        const prevMs = prev?.lastSeenAt ? Date.parse(prev.lastSeenAt) : -1;
        const nextMs = i.lastSeenAt ? Date.parse(i.lastSeenAt) : -1;
        if (!prev || nextMs > prevMs) {
          const alsoSeenAs = Array.from(
            new Set((i.identities ?? []).map((x) => (x.userEmail ?? '').trim()).filter(Boolean)),
          )
            .filter((e) => e.toLowerCase() !== emailKey)
            .slice(0, 2);
          byEmail.set(emailKey, {
            key: `email:${emailKey}`,
            title: i.userEmail,
            subtitle: `email-only • last seen: ${i.lastSeenAt ? formatExpiresAt(i.lastSeenAt) : 'unknown'} • device: ${i.installId}${
              alsoSeenAs.length > 0 ? ` • also seen as: ${alsoSeenAs.join(', ')}` : ''
            }`,
            lastSeenAt: i.lastSeenAt ?? null,
            installsCount: null,
            pro: i.pro,
          });
        }
      } else {
        const alsoSeenAs = Array.from(
          new Set((i.identities ?? []).map((x) => (x.userEmail ?? '').trim()).filter(Boolean)),
        ).slice(0, 3);
        anonByInstallId.set(i.installId, {
          key: `install:${i.installId}`,
          title: i.installId,
          subtitle: `anonymous • last seen: ${i.lastSeenAt ? formatExpiresAt(i.lastSeenAt) : 'unknown'}${
            alsoSeenAs.length > 0 ? ` • also seen as: ${alsoSeenAs.join(', ')}` : ''
          }`,
          lastSeenAt: i.lastSeenAt ?? null,
          installsCount: null,
          pro: i.pro,
        });
      }
    }

    const all = [...byUserId.values(), ...byEmail.values(), ...anonByInstallId.values()];
    const q = search.trim().toLowerCase();
    const filtered = !q
      ? all
      : all.filter((r) => {
          const hay = `${r.title} ${r.subtitle}`.toLowerCase();
          return hay.includes(q);
        });

    return filtered.sort((a, b) => {
      const ams = a.lastSeenAt ? Date.parse(a.lastSeenAt) : -1;
      const bms = b.lastSeenAt ? Date.parse(b.lastSeenAt) : -1;
      return bms - ams;
    });
  }, [installs, search, users]);

  const maybeLoadMore = () => {
    if (!canUseTools) return;
    if (isFetchingMoreRef.current) return;
    if (tab === 'directory') {
      // Prefer paging users first; once exhausted, pull more installs to surface anonymous devices.
      if (!usersLoading && usersHasMore) {
        isFetchingMoreRef.current = true;
        void loadUsersPage(usersPage + 1).finally(() => {
          isFetchingMoreRef.current = false;
        });
        return;
      }
      if (!installsLoading && installsHasMore) {
        isFetchingMoreRef.current = true;
        void loadInstalls(installsLimit + INSTALLS_PAGE_SIZE).finally(() => {
          isFetchingMoreRef.current = false;
        });
      }
    }
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - (layoutMeasurement.height + contentOffset.y);
    if (distanceFromBottom <= LOAD_MORE_THRESHOLD_PX) maybeLoadMore();
  };

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
        <PageHeader title="Admin Tools" onPressBack={() => navigation.goBack()} />
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={250}
        >
          <View style={styles.section}>
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

          <SegmentedControl
            value={tab}
            onChange={(next) => setTab(next as any)}
            options={
              [
                { value: 'directory', label: 'Directory' },
                { value: 'utilities', label: 'Utilities' },
              ] as const
            }
          />

          <View style={styles.card}>
            <VStack space="sm">
              {!canUseTools ? (
                <Text style={styles.body}>Sign in as a Super Admin to view the directory.</Text>
              ) : (
                <>
                  {tab === 'utilities' ? (
                    <VStack space="lg">
                      <Text style={styles.cardTitle}>Utilities</Text>

                      <VStack space="sm">
                        <Text style={styles.subSectionTitle}>Simulate plan (device)</Text>
                        <Text style={styles.body}>
                          Current: {isPro ? 'Pro' : isProToolsTrial ? 'Trial' : 'Free'} • source: {lastSource ?? 'unknown'}
                        </Text>
                        <SegmentedControl
                          value={tier}
                          onChange={(next) => handleSetTier(next as AdminEntitlementsOverrideTier)}
                          options={tierOptions as any}
                        />
                        {error ? <Text style={styles.error}>{error}</Text> : null}
                      </VStack>

                      <View style={styles.divider} />

                      <VStack space="sm">
                        <Text style={styles.subSectionTitle}>1-year Pro access code (one-time)</Text>
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

                      <View style={styles.divider} />

                      <VStack space="sm">
                        <Text style={styles.subSectionTitle}>Grant Pro (1 year)</Text>
                        <Text style={styles.body}>Manually grant Pro to a user or device. This takes effect immediately.</Text>
                        <Button disabled={!canUseTools} onPress={() => void openGrantDrawer()}>
                          <Text style={styles.buttonLabel}>Open grant tool</Text>
                        </Button>
                      </VStack>
                    </VStack>
                  ) : (
                    <VStack space="sm">
                      <Text style={styles.cardTitle}>Directory</Text>

                      <Input
                        label="Search"
                        placeholder="email, name, or device id"
                        value={search}
                        onChangeText={setSearch}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="default"
                        returnKeyType="done"
                        variant="outline"
                      />

                      {directoryError ? <Text style={styles.error}>{directoryError}</Text> : null}

                      <Text style={styles.body}>
                        Loaded {users.length} users + {installs.length} devices • {directoryRows.length} shown
                        {usersHasMore || installsHasMore ? ' • scroll to load more' : ''}
                        {usersLoading || installsLoading ? ' • loading…' : ''}
                      </Text>

                      <VStack space="xs">
                        {directoryRows.map((r) => (
                          <View key={r.key} style={styles.row}>
                            <VStack space={0} flex={1}>
                              <Text style={styles.rowTitle}>{r.title}</Text>
                              <Text style={styles.rowMeta}>{r.subtitle}</Text>
                            </VStack>
                            <VStack space={0} style={styles.rowRight}>
                              <Text style={styles.rowTitle}>{r.pro.isPro ? 'Pro' : 'Free'}</Text>
                              <Text style={styles.rowMeta}>
                                {r.pro.isPro
                                  ? `${r.pro.source}${r.pro.expiresAt ? ` • exp ${formatExpiresAt(r.pro.expiresAt)}` : ''}`
                                  : ''}
                              </Text>
                            </VStack>
                          </View>
                        ))}
                      </VStack>
                    </VStack>
                  )}
                </>
              )}
            </VStack>
          </View>
        </KeyboardAwareScrollView>

        <BottomDrawer
          visible={codeDrawerVisible}
          onClose={() => setCodeDrawerVisible(false)}
          snapPoints={['52%']}
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

            <VStack space="xs">
              <Input
                label="Send to email (optional)"
                placeholder="someone@example.com"
                value={sendToEmail}
                onChangeText={setSendToEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="done"
                variant="outline"
              />
              <Button
                variant="secondary"
                disabled={!canUseTools || !lastCode || isSendingEmail || !sendToEmail.trim()}
                onPress={async () => {
                  if (!lastCode) return;
                  const email = sendToEmail.trim();
                  if (!email) return;
                  setError(null);
                  try {
                    setIsSendingEmail(true);
                    await sendProCodeSuperAdmin({
                      channel: 'email',
                      code: lastCode,
                      recipientEmail: email,
                    });
                    Alert.alert('Sent', `Sent code to ${email}.`);
                  } catch (e: any) {
                    const msg = typeof e?.message === 'string' ? e.message : 'Unable to send email';
                    Alert.alert('Unable to send email', msg);
                  } finally {
                    setIsSendingEmail(false);
                  }
                }}
              >
                <Text style={styles.secondaryButtonLabel}>{isSendingEmail ? 'Sending…' : 'Send email'}</Text>
              </Button>
            </VStack>

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
  subSectionTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
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


