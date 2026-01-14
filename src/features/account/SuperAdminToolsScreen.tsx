import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  Share,
  StyleSheet,
  View,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { Button } from '../../ui/Button';
import { KeyboardAwareScrollView, Text, VStack, HStack, Heading, Input, Badge } from '../../ui/primitives';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { cardSurfaceStyle, colors, spacing, typography } from '../../theme';
import { ProfileAvatar } from '../../ui/ProfileAvatar';
import { FREE_GENERATIVE_CREDITS_PER_MONTH, PRO_GENERATIVE_CREDITS_PER_MONTH, getMonthKey } from '../../domain/generativeCredits';
import { createProCodeAdmin, getAdminProCodesStatus, grantProSuperAdmin, revokeProSuperAdmin, sendProCodeSuperAdmin } from '../../services/proCodes';
import { grantBonusCreditsSuperAdmin } from '../../services/referrals';
import { BottomDrawer, BottomDrawerScrollView, BottomDrawerNativeGestureView } from '../../ui/BottomDrawer';
import { getInstallId } from '../../services/installId';
import {
  adminGetUseSummary,
  adminListInstalls,
  adminListUsers,
  adminGetAdoptionMetrics,
  type DirectoryInstall,
  type DirectoryUseSummary,
  type DirectoryUser,
  type AdoptionMetrics,
  type MetricsTimePeriod,
} from '../../services/kwiltUsersDirectory';
import {
  clearAdminEntitlementsOverrideTier,
  getAdminEntitlementsOverrideTier,
  setAdminEntitlementsOverrideTier,
  type AdminEntitlementsOverrideTier,
} from '../../services/entitlements';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import { useAppStore } from '../../store/useAppStore';
import { StaticMapImage } from '../../ui/maps/StaticMapImage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '../../ui/DropdownMenu';
import { Icon } from '../../ui/Icon';
import MapView, { Circle } from 'react-native-maps';

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

const formatProSourceLabel = (source?: string | null): string => {
  const s = (source ?? '').trim().toLowerCase();
  if (!s) return '—';
  switch (s) {
    case 'revenuecat':
      return 'Apple subscription (RevenueCat)';
    case 'code':
      return 'Redeemed Pro code';
    case 'admin':
      return 'Admin grant';
    case 'dev':
      return 'Dev override';
    case 'cache':
      return 'Cached';
    case 'none':
      return 'None';
    default:
      return source ?? '—';
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

  const [tab, setTab] = useState<'directory' | 'metrics' | 'utilities'>('directory');
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
  const [adoptionMetrics, setAdoptionMetrics] = useState<AdoptionMetrics | null>(null);
  const [adoptionMetricsLoading, setAdoptionMetricsLoading] = useState(false);
  
  // Metrics tab state
  const [metricsTimePeriod, setMetricsTimePeriod] = useState<MetricsTimePeriod>('this_month');
  const [metricsData, setMetricsData] = useState<AdoptionMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  
  // Full-screen modal for User Hotspots map
  const [hotspotsMapModalVisible, setHotspotsMapModalVisible] = useState(false);

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

  const loadAdoptionMetrics = async () => {
    if (!canUseTools) return;
    if (adoptionMetricsLoading) return;
    setAdoptionMetricsLoading(true);
    try {
      const metrics = await adminGetAdoptionMetrics({ timePeriod: 'all_time' });
      setAdoptionMetrics(metrics);
    } catch {
      // Fail silently - metrics are non-critical
    } finally {
      setAdoptionMetricsLoading(false);
    }
  };

  const loadMetricsForPeriod = async (period: MetricsTimePeriod) => {
    if (!canUseTools) return;
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const metrics = await adminGetAdoptionMetrics({ timePeriod: period });
      setMetricsData(metrics);
    } catch (e: any) {
      setMetricsError(typeof e?.message === 'string' ? e.message : 'Unable to load metrics');
    } finally {
      setMetricsLoading(false);
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
    if (adoptionMetrics) return;
    void loadAdoptionMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseTools, tab]);

  // Load metrics for dedicated Metrics tab
  useEffect(() => {
    if (!canUseTools) return;
    if (tab !== 'metrics') return;
    void loadMetricsForPeriod(metricsTimePeriod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseTools, tab, metricsTimePeriod]);

  useEffect(() => {
    if (!canUseTools) return;
    if (tab !== 'directory') return;
    if (installs.length > 0) return;
    void loadInstalls(INSTALLS_PAGE_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseTools, tab]);

  type DirectoryRow = {
    key: string;
    kind: 'user' | 'email' | 'install';
    title: string;
    secondary: string;
    lastSeenAt: string | null;
    installsCount?: number | null;
    creditsUsed?: number;
    user?: DirectoryUser;
    install?: DirectoryInstall;
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
      const secondary = u.email?.trim()
        ? `last seen: ${u.lastSeenAt ? formatExpiresAt(u.lastSeenAt) : 'unknown'}`
        : `anonymous • last seen: ${u.lastSeenAt ? formatExpiresAt(u.lastSeenAt) : 'unknown'}`;

      byUserId.set(u.userId, {
        key: `user:${u.userId}`,
        kind: 'user',
        title,
        secondary,
        lastSeenAt: u.lastSeenAt ?? install?.lastSeenAt ?? null,
        installsCount: u.installsCount,
        creditsUsed: u.creditsUsed,
        user: u,
        install: install ?? undefined,
        pro: u.pro,
      });
    }

    // Installs: fill gaps for users not yet loaded (and anonymous devices).
    for (const i of installs) {
      if (i.userId) {
        // If the user isn't loaded yet, create a "shadow" row keyed by userId.
        if (!byUserId.has(i.userId)) {
          const title = i.userEmail?.trim() ? i.userEmail : i.installId;
          const secondary = `last seen: ${i.lastSeenAt ? formatExpiresAt(i.lastSeenAt) : 'unknown'}`;
          byUserId.set(i.userId, {
            key: `user:${i.userId}`,
            kind: 'user',
            title,
            secondary,
            lastSeenAt: i.lastSeenAt ?? null,
            installsCount: null,
            creditsUsed: i.creditsUsed,
            install: i,
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
          byEmail.set(emailKey, {
            key: `email:${emailKey}`,
            kind: 'email',
            title: i.userEmail,
            secondary: `last seen: ${i.lastSeenAt ? formatExpiresAt(i.lastSeenAt) : 'unknown'}`,
            lastSeenAt: i.lastSeenAt ?? null,
            installsCount: null,
            creditsUsed: i.creditsUsed,
            install: i,
            pro: i.pro,
          });
        }
      } else {
        anonByInstallId.set(i.installId, {
          key: `install:${i.installId}`,
          kind: 'install',
          title: i.installId,
          secondary: `anonymous • last seen: ${i.lastSeenAt ? formatExpiresAt(i.lastSeenAt) : 'unknown'}`,
          lastSeenAt: i.lastSeenAt ?? null,
          installsCount: null,
          creditsUsed: i.creditsUsed,
          install: i,
          pro: i.pro,
        });
      }
    }

    const all = [...byUserId.values(), ...byEmail.values(), ...anonByInstallId.values()];
    const q = search.trim().toLowerCase();
    const filtered = !q
      ? all
      : all.filter((r) => {
          const hay = `${r.title} ${r.secondary}`.toLowerCase();
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

  const refreshDirectory = async () => {
    // Users: reload page 1 (replaces list) and reset "hasMore" to whatever server says.
    await loadUsersPage(1);
    // Installs: reload base page size.
    await loadInstalls(INSTALLS_PAGE_SIZE);
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

  const [directoryDetailRow, setDirectoryDetailRow] = useState<DirectoryRow | null>(null);
  const directoryDetailVisible = Boolean(directoryDetailRow);
  const [detailTab, setDetailTab] = useState<'details' | 'subscription' | 'use'>('details');
  const [useSummary, setUseSummary] = useState<DirectoryUseSummary | null>(null);
  const [useSummaryLoading, setUseSummaryLoading] = useState(false);
  const [useSummaryError, setUseSummaryError] = useState<string | null>(null);
  const useSummaryLoadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const useSummaryCacheRef = useRef<Map<string, DirectoryUseSummary>>(new Map());
  const useSummaryAttemptedRef = useRef<Set<string>>(new Set());

  const openDirectoryDetail = (row: DirectoryRow) => {
    setDirectoryDetailRow(row);
    setDetailTab('details'); // Reset to details tab when opening
    const nextUserId = (row.user?.userId ?? row.install?.userId ?? '').trim();
    setUseSummary(nextUserId ? useSummaryCacheRef.current.get(nextUserId) ?? null : null);
    setUseSummaryError(null);
    setUseSummaryLoading(false);
    if (useSummaryLoadingTimerRef.current) {
      clearTimeout(useSummaryLoadingTimerRef.current);
      useSummaryLoadingTimerRef.current = null;
    }
    if (nextUserId) {
      // Allow exactly one attempt per drawer open (prevents retry flicker).
      useSummaryAttemptedRef.current.delete(nextUserId);
    }
    // Prefetch so the Use tab is usually instant (and avoids loading-label flicker).
    startLoadUseSummary(row);
  };
  const closeDirectoryDetail = () => setDirectoryDetailRow(null);

  const formatUseActionType = (t: string | null | undefined): string => {
    const key = (t ?? '').trim().toLowerCase();
    if (!key || key === 'none') return '—';
    if (key === 'ai') return 'AI';
    if (key === 'checkin') return 'Check-in';
    if (key === 'activity') return 'Activity';
    if (key === 'goal') return 'Goal';
    if (key === 'arc') return 'Arc';
    return key;
  };

  const startLoadUseSummary = (row: DirectoryRow) => {
    if (!canUseTools) return;
    if (useSummaryLoading) return;

    const userId = (row.user?.userId ?? row.install?.userId ?? '').trim();
    if (!userId) return;
    if (useSummaryCacheRef.current.has(userId)) {
      // Keep UI stable: reuse cached summary immediately.
      setUseSummary(useSummaryCacheRef.current.get(userId) ?? null);
      return;
    }
    if (useSummaryAttemptedRef.current.has(userId)) {
      // Avoid infinite retry loops (e.g. when the backend route isn't deployed yet).
      return;
    }
    useSummaryAttemptedRef.current.add(userId);

    const installIdsRaw: string[] = Array.isArray(row.user?.installIds)
      ? row.user!.installIds!
      : row.install?.installId
        ? [row.install.installId]
        : [];
    const installIds = installIdsRaw.map((x) => (x ?? '').trim()).filter(Boolean).slice(0, 25);

    setUseSummaryLoading(true);
    setUseSummaryError(null);
    if (useSummaryLoadingTimerRef.current) clearTimeout(useSummaryLoadingTimerRef.current);
    useSummaryLoadingTimerRef.current = null;

    void adminGetUseSummary({ userId, installIds, windowDays: 7 })
      .then((s) => {
        if (s) useSummaryCacheRef.current.set(userId, s);
        setUseSummary(s);
      })
      .catch((e: any) => {
        setUseSummary(null);
        setUseSummaryError(typeof e?.message === 'string' ? e.message : 'Unable to load usage');
      })
      .finally(() => {
        setUseSummaryLoading(false);
        if (useSummaryLoadingTimerRef.current) {
          clearTimeout(useSummaryLoadingTimerRef.current);
          useSummaryLoadingTimerRef.current = null;
        }
      });
  };

  useEffect(() => {
    if (!canUseTools) return;
    if (!directoryDetailVisible) return;
    if (detailTab !== 'use') return;
    if (!directoryDetailRow) return;
    startLoadUseSummary(directoryDetailRow);
  }, [canUseTools, detailTab, directoryDetailRow, directoryDetailVisible]);

  const renderDetailField = (args: {
    label: string;
    value: string;
    multiline?: boolean;
    helperText?: string;
    trailingElement?: ReactNode;
    inputStyle?: StyleProp<TextStyle>;
  }) => {
    return (
      <Input
        label={args.label}
        value={args.value}
        variant="filled"
        editable={false}
        multiline={args.multiline}
        helperText={args.helperText}
        trailingElement={args.trailingElement}
        inputStyle={args.inputStyle}
        // Make long IDs / lists readable without horizontal scrolling.
        {...(args.multiline ? { multilineMinHeight: 44, multilineMaxHeight: 140 } : null)}
      />
    );
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
                { value: 'metrics', label: 'Metrics' },
                { value: 'utilities', label: 'Utilities' },
              ] as const
            }
          />

          {!canUseTools ? (
            <Text style={styles.body}>Sign in as a Super Admin to view the directory.</Text>
          ) : tab === 'metrics' ? (
            <VStack space="md">
              {/* Time period selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Pressable style={styles.metricsTimePeriodDropdown}>
                    <Text style={styles.metricsTimePeriodDropdownLabel}>
                      {(() => {
                        const options = [
                          { value: 'all_time', label: 'All-time' },
                          { value: 'this_year', label: 'This Year' },
                          { value: 'this_quarter', label: 'This Quarter' },
                          { value: 'this_month', label: 'This Month' },
                          { value: 'this_week', label: 'This Week' },
                        ] as const;
                        return options.find((opt) => opt.value === metricsTimePeriod)?.label ?? 'Select period';
                      })()}
                    </Text>
                    <Icon name="chevronDown" size={16} color={colors.textSecondary} />
                  </Pressable>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuRadioGroup
                    value={metricsTimePeriod}
                    onValueChange={(value) => {
                      if (value) setMetricsTimePeriod(value as MetricsTimePeriod);
                    }}
                  >
                    <DropdownMenuRadioItem value="all_time">
                      <Text style={styles.metricsTimePeriodMenuItem}>All-time</Text>
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="this_year">
                      <Text style={styles.metricsTimePeriodMenuItem}>This Year</Text>
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="this_quarter">
                      <Text style={styles.metricsTimePeriodMenuItem}>This Quarter</Text>
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="this_month">
                      <Text style={styles.metricsTimePeriodMenuItem}>This Month</Text>
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="this_week">
                      <Text style={styles.metricsTimePeriodMenuItem}>This Week</Text>
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {metricsError ? (
                <Text style={styles.error}>{metricsError}</Text>
              ) : null}

              {/* Period indicator */}
              {metricsData?.periodStartIso && metricsData?.periodEndIso ? (
                <Text style={styles.metricsPeriodIndicator}>
                  {formatExpiresAt(metricsData.periodStartIso)} — {formatExpiresAt(metricsData.periodEndIso)}
                </Text>
              ) : null}

              {/* Hero metrics - Key Business Metrics */}
              <View style={styles.metricsHeroCard}>
                <HStack style={styles.metricsHeroRow} alignItems="stretch" justifyContent="space-between">
                  <View style={styles.metricsHeroCell}>
                    <Text style={styles.metricsHeroValue}>
                      {metricsLoading ? '…' : metricsData?.aiSpend != null ? `$${(metricsData.aiSpend / 100).toFixed(2)}` : '—'}
                    </Text>
                    <Text style={styles.metricsHeroLabel}>AI Spend</Text>
                  </View>
                  <View style={styles.metricsHeroDivider} />
                  <View style={styles.metricsHeroCell}>
                    <Text style={styles.metricsHeroValue}>
                      {metricsLoading ? '…' : metricsData?.userAcquisition ?? '—'}
                    </Text>
                    <Text style={styles.metricsHeroLabel}>
                      {metricsTimePeriod === 'all_time' ? 'Total Users' : 'New Users'}
                    </Text>
                  </View>
                  <View style={styles.metricsHeroDivider} />
                  <View style={styles.metricsHeroCell}>
                    <Text style={styles.metricsHeroValue}>
                      {metricsLoading ? '…' : metricsData?.weeklyActiveUsers ?? '—'}
                    </Text>
                    <Text style={styles.metricsHeroLabel}>WAU</Text>
                  </View>
                </HStack>
              </View>

              {/* User Metrics Card */}
              <View style={styles.metricsCard}>
                <Text style={styles.metricsCardTitle}>Users</Text>
                <View style={styles.metricsGrid}>
                  <View style={styles.metricsGridItem}>
                    <Text style={styles.metricsGridValue}>
                      {metricsLoading ? '…' : metricsData?.totalUsers ?? '—'}
                    </Text>
                    <Text style={styles.metricsGridLabel}>Total</Text>
                  </View>
                  <View style={styles.metricsGridItem}>
                    <Text style={styles.metricsGridValue}>
                      {metricsLoading ? '…' : metricsData?.activatedUsers ?? '—'}
                    </Text>
                    <Text style={styles.metricsGridLabel}>Activated</Text>
                  </View>
                  <View style={styles.metricsGridItem}>
                    <Text style={styles.metricsGridValue}>
                      {metricsLoading ? '…' : metricsData?.proUsers ?? '—'}
                    </Text>
                    <Text style={styles.metricsGridLabel}>Pro</Text>
                  </View>
                  <View style={styles.metricsGridItem}>
                    <Text style={styles.metricsGridValue}>
                      {metricsLoading ? '…' : 
                        metricsData?.totalUsers && metricsData?.activatedUsers
                          ? `${Math.round((metricsData.activatedUsers / metricsData.totalUsers) * 100)}%`
                          : '—'}
                    </Text>
                    <Text style={styles.metricsGridLabel}>Activation %</Text>
                  </View>
                </View>
              </View>

              {/* Engagement Metrics Card */}
              <View style={styles.metricsCard}>
                <Text style={styles.metricsCardTitle}>Engagement</Text>
                <View style={styles.metricsGrid}>
                  <View style={styles.metricsGridItem}>
                    <Text style={styles.metricsGridValue}>
                      {metricsLoading ? '…' : metricsData?.arcsCreated ?? '—'}
                    </Text>
                    <Text style={styles.metricsGridLabel}>Arcs</Text>
                  </View>
                  <View style={styles.metricsGridItem}>
                    <Text style={styles.metricsGridValue}>
                      {metricsLoading ? '…' : metricsData?.goalsCreated ?? '—'}
                    </Text>
                    <Text style={styles.metricsGridLabel}>Goals</Text>
                  </View>
                  <View style={styles.metricsGridItem}>
                    <Text style={styles.metricsGridValue}>
                      {metricsLoading ? '…' : metricsData?.activitiesCreated ?? '—'}
                    </Text>
                    <Text style={styles.metricsGridLabel}>Activities</Text>
                  </View>
                  <View style={styles.metricsGridItem}>
                    <Text style={styles.metricsGridValue}>
                      {metricsLoading ? '…' : metricsData?.checkinsCompleted ?? '—'}
                    </Text>
                    <Text style={styles.metricsGridLabel}>Check-ins</Text>
                  </View>
                  <View style={styles.metricsGridItem}>
                    <Text style={styles.metricsGridValue}>
                      {metricsLoading ? '…' : metricsData?.focusSessionsCompleted ?? '—'}
                    </Text>
                    <Text style={styles.metricsGridLabel}>Focus</Text>
                  </View>
                </View>
              </View>

              {/* AI Usage Card */}
              <View style={styles.metricsCard}>
                <Text style={styles.metricsCardTitle}>AI Usage</Text>
                <View style={styles.metricsGrid}>
                  <View style={styles.metricsGridItem}>
                    <Text style={styles.metricsGridValue}>
                      {metricsLoading ? '…' : metricsData?.aiActionsTotal ?? '—'}
                    </Text>
                    <Text style={styles.metricsGridLabel}>Total Actions</Text>
                  </View>
                  <View style={styles.metricsGridItem}>
                    <Text style={styles.metricsGridValue}>
                      {metricsLoading ? '…' : metricsData?.aiActionsPerActiveUser?.toFixed(1) ?? '—'}
                    </Text>
                    <Text style={styles.metricsGridLabel}>Per Active User</Text>
                  </View>
                </View>
              </View>

              {/* User Locations Map */}
              <View style={styles.metricsCard}>
                <Text style={styles.metricsCardTitle}>User Hotspots</Text>
                {(() => {
                  const locations = metricsData?.userLocations ?? [];
                  if (metricsLoading) {
                    return (
                      <View style={styles.metricsMapPlaceholder}>
                        <Text style={styles.metricsMapPlaceholderText}>Loading locations…</Text>
                      </View>
                    );
                  }
                  if (locations.length === 0) {
                    return (
                      <View style={styles.metricsMapPlaceholder}>
                        <Text style={styles.metricsMapPlaceholderText}>
                          No location data available yet
                        </Text>
                        <Text style={styles.metricsMapHint}>
                          Locations are collected from activities with place data
                        </Text>
                      </View>
                    );
                  }

                  // Calculate map region to fit all markers
                  const lats = locations.map((l) => l.lat);
                  const lons = locations.map((l) => l.lon);
                  const minLat = Math.min(...lats);
                  const maxLat = Math.max(...lats);
                  const minLon = Math.min(...lons);
                  const maxLon = Math.max(...lons);
                  const centerLat = (minLat + maxLat) / 2;
                  const centerLon = (minLon + maxLon) / 2;
                  const latDelta = Math.max(0.1, (maxLat - minLat) * 1.5);
                  const lonDelta = Math.max(0.1, (maxLon - minLon) * 1.5);

                  // Get max count for scaling markers
                  const maxCount = Math.max(...locations.map((l) => l.count));

                  return (
                    <Pressable
                      style={styles.metricsMapContainer}
                      onPress={() => setHotspotsMapModalVisible(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Open full-screen map"
                    >
                      {Platform.OS === 'ios' ? (
                        <MapView
                          style={styles.metricsMap}
                          mapType="standard"
                          initialRegion={{
                            latitude: centerLat,
                            longitude: centerLon,
                            latitudeDelta: latDelta,
                            longitudeDelta: lonDelta,
                          }}
                          scrollEnabled={false}
                          zoomEnabled={false}
                          rotateEnabled={false}
                          pitchEnabled={false}
                          pointerEvents="none"
                        >
                          {locations.map((loc, idx) => {
                            const radiusM = 5000 + (loc.count / maxCount) * 20000;
                            return (
                              <Circle
                                key={`${loc.lat}-${loc.lon}-${idx}`}
                                center={{ latitude: loc.lat, longitude: loc.lon }}
                                radius={radiusM}
                                strokeWidth={2}
                                strokeColor={colors.accent}
                                fillColor="rgba(49,85,69,0.25)"
                              />
                            );
                          })}
                        </MapView>
                      ) : (
                        // Fallback for Android - show summary
                        <View style={styles.metricsMapPlaceholder}>
                          <Text style={styles.metricsMapPlaceholderText}>
                            {locations.length} location{locations.length !== 1 ? 's' : ''} with activity
                          </Text>
                          {locations.slice(0, 5).map((loc, idx) => (
                            <Text key={idx} style={styles.metricsMapHint}>
                              {loc.city || `${loc.lat.toFixed(2)}, ${loc.lon.toFixed(2)}`} ({loc.count})
                            </Text>
                          ))}
                        </View>
                      )}
                      <Text style={styles.metricsMapLegend}>
                        {locations.length} location{locations.length !== 1 ? 's' : ''} • {locations.reduce((sum, l) => sum + l.count, 0)} activities
                      </Text>
                      <View style={styles.metricsMapTapHint}>
                        <Text style={styles.metricsMapTapHintText}>Tap to explore</Text>
                      </View>
                    </Pressable>
                  );
                })()}
              </View>

              {metricsData?.computedAtIso ? (
                <Text style={styles.metricsComputedAt}>
                  Data computed {formatExpiresAt(metricsData.computedAtIso)}
                </Text>
              ) : null}
            </VStack>
          ) : tab === 'utilities' ? (
            <VStack space="md">
              <View style={styles.card}>
                <VStack space="sm">
                  <Text style={styles.cardTitle}>Simulate plan (device)</Text>
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
            </VStack>
          ) : (
            <VStack space="sm">
              <Input
                placeholder="email, name, or device id"
                leadingIcon="search"
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
                  <Pressable
                    key={r.key}
                    style={styles.row}
                    onPress={() => openDirectoryDetail(r)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open details for ${r.title}`}
                  >
                    <VStack space={0} flex={1}>
                      <Text style={styles.rowTitle}>{r.title}</Text>
                      <Text style={styles.rowMeta}>{r.secondary}</Text>
                    </VStack>
                    <View style={styles.rowBadgeWrap} pointerEvents="none">
                      <Badge
                        variant={r.pro.isPro ? 'default' : 'outline'}
                        style={r.pro.isPro ? styles.proBadge : styles.freeBadge}
                        textStyle={r.pro.isPro ? styles.proBadgeText : styles.freeBadgeText}
                      >
                        {r.pro.isPro ? 'Pro' : 'Free'}
                      </Badge>
                    </View>
                  </Pressable>
                ))}
              </VStack>
            </VStack>
          )}
        </KeyboardAwareScrollView>

        {/* Full-screen modal for User Hotspots map */}
        <Modal
          visible={hotspotsMapModalVisible}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setHotspotsMapModalVisible(false)}
        >
          <SafeAreaView style={styles.hotspotsModalContainer}>
            <PageHeader
              title="User Hotspots"
              onPressBack={() => setHotspotsMapModalVisible(false)}
            />
            {(() => {
              const locations = metricsData?.userLocations ?? [];
              if (locations.length === 0) {
                return (
                  <View style={styles.hotspotsModalPlaceholder}>
                    <Text style={styles.metricsMapPlaceholderText}>No location data available</Text>
                  </View>
                );
              }

              const lats = locations.map((l) => l.lat);
              const lons = locations.map((l) => l.lon);
              const minLat = Math.min(...lats);
              const maxLat = Math.max(...lats);
              const minLon = Math.min(...lons);
              const maxLon = Math.max(...lons);
              const centerLat = (minLat + maxLat) / 2;
              const centerLon = (minLon + maxLon) / 2;
              const latDelta = Math.max(0.1, (maxLat - minLat) * 1.5);
              const lonDelta = Math.max(0.1, (maxLon - minLon) * 1.5);
              const maxCount = Math.max(...locations.map((l) => l.count));

              return (
                <MapView
                  style={styles.hotspotsModalMap}
                  mapType="standard"
                  initialRegion={{
                    latitude: centerLat,
                    longitude: centerLon,
                    latitudeDelta: latDelta,
                    longitudeDelta: lonDelta,
                  }}
                  scrollEnabled={true}
                  zoomEnabled={true}
                  rotateEnabled={false}
                  pitchEnabled={false}
                >
                  {locations.map((loc, idx) => {
                    const radiusM = 5000 + (loc.count / maxCount) * 20000;
                    return (
                      <Circle
                        key={`${loc.lat}-${loc.lon}-${idx}`}
                        center={{ latitude: loc.lat, longitude: loc.lon }}
                        radius={radiusM}
                        strokeWidth={2}
                        strokeColor={colors.accent}
                        fillColor="rgba(49,85,69,0.25)"
                      />
                    );
                  })}
                </MapView>
              );
            })()}
            <View style={styles.hotspotsModalLegend}>
              <Text style={styles.metricsMapLegend}>
                {(metricsData?.userLocations ?? []).length} location{(metricsData?.userLocations ?? []).length !== 1 ? 's' : ''} • {(metricsData?.userLocations ?? []).reduce((sum, l) => sum + l.count, 0)} activities
              </Text>
            </View>
          </SafeAreaView>
        </Modal>

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

        <BottomDrawer
          visible={directoryDetailVisible}
          onClose={closeDirectoryDetail}
          snapPoints={['92%']}
          keyboardAvoidanceEnabled={false}
          enableContentPanningGesture
        >
          <BottomDrawerScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: spacing['2xl'] }}
          >
            {directoryDetailRow ? (
              <VStack space="md">
                {/* Header with avatar */}
                <HStack space="md" alignItems="center">
                  <ProfileAvatar
                    name={directoryDetailRow.user?.name ?? directoryDetailRow.title}
                    avatarUrl={null}
                    size={56}
                  />
                  <VStack space="xs" flex={1}>
                    <Heading>{directoryDetailRow.title}</Heading>
                    <HStack space="xs" alignItems="center" style={{ flexWrap: 'wrap' }}>
                      <Badge
                        variant={directoryDetailRow.pro.isPro ? 'default' : 'outline'}
                        style={directoryDetailRow.pro.isPro ? styles.proBadge : styles.freeBadge}
                        textStyle={directoryDetailRow.pro.isPro ? styles.proBadgeText : styles.freeBadgeText}
                      >
                        {directoryDetailRow.pro.isPro ? 'Pro' : 'Free'}
                      </Badge>
                      {directoryDetailRow.pro.isPro ? (
                        <Text style={styles.body}>
                          {formatProSourceLabel(directoryDetailRow.pro.source)}
                          {directoryDetailRow.pro.expiresAt ? ` • exp ${formatExpiresAt(directoryDetailRow.pro.expiresAt)}` : ''}
                        </Text>
                      ) : null}
                    </HStack>
                  </VStack>
                </HStack>

                {/* Segmented control for tabs */}
                <SegmentedControl
                  value={detailTab}
                  onChange={(next) => setDetailTab(next as 'details' | 'subscription' | 'use')}
                  options={
                    [
                      { value: 'details', label: 'Details' },
                      { value: 'subscription', label: 'Subscription' },
                      { value: 'use', label: 'Use' },
                    ] as const
                  }
                />

                {/* Details tab */}
                {detailTab === 'details' ? (
                  <VStack space="md">
                    <VStack space="xs">
                      {directoryDetailRow.user?.name
                        ? renderDetailField({ label: 'Name', value: directoryDetailRow.user.name })
                        : null}
                      {directoryDetailRow.user?.email
                        ? renderDetailField({ label: 'Email', value: directoryDetailRow.user.email })
                        : null}
                      {directoryDetailRow.user?.userId
                        ? renderDetailField({ label: 'User ID', value: directoryDetailRow.user.userId })
                        : null}
                      {typeof directoryDetailRow.user?.installsCount === 'number'
                        ? renderDetailField({ label: 'Installs', value: String(directoryDetailRow.user.installsCount) })
                        : null}
                      {Array.isArray(directoryDetailRow.user?.installIds) && directoryDetailRow.user?.installIds?.length
                        ? renderDetailField({
                            label: 'Install IDs',
                            value: directoryDetailRow.user.installIds.join('\n'),
                            multiline: true,
                          })
                        : directoryDetailRow.install?.installId
                          ? renderDetailField({
                              label: 'Install ID',
                              value: directoryDetailRow.install.installId,
                              multiline: true,
                            })
                          : null}
                    </VStack>

                    {directoryDetailRow.install?.identities?.length ? (
                      <VStack space="xs">
                        {renderDetailField({
                          label: 'Also seen as',
                          value: Array.from(
                            new Set(
                              directoryDetailRow.install.identities
                                .map((x) => (x.userEmail ?? '').trim())
                                .filter(Boolean),
                            ),
                          )
                            .slice(0, 8)
                            .join('\n'),
                          multiline: true,
                        })}
                      </VStack>
                    ) : null}

                    {/* Geolocation (city-level when available, otherwise country/region) */}
                    {(() => {
                      const loc = directoryDetailRow.user?.roughLocation ?? directoryDetailRow.install?.roughLocation;
                      if (!loc) return null;
                      
                      // Build location string with available precision
                      const parts: string[] = [];
                      if (loc.city) parts.push(loc.city);
                      if (loc.region) parts.push(loc.region);
                      if (loc.country) parts.push(loc.country);
                      if (parts.length === 0 && loc.countryCode) parts.push(loc.countryCode);
                      if (parts.length === 0) return null;
                      
                      // Determine precision label based on source and available data
                      const hasCityLevel = Boolean(loc.city);
                      const sourceLabel = loc.source === 'gps' 
                        ? 'GPS (~5mi)' 
                        : loc.source === 'activity_place' 
                        ? 'Activity place' 
                        : 'IP-based';
                      const precisionNote = hasCityLevel 
                        ? `City-level precision • ${sourceLabel}` 
                        : `Country/region level • ${sourceLabel}`;
                      
                      return (
                        <VStack space="xs">
                          {renderDetailField({
                            label: 'Location',
                            value: parts.join(', '),
                            helperText: precisionNote + (loc.updatedAtIso ? ` • ${formatExpiresAt(loc.updatedAtIso)}` : ''),
                          })}
                        </VStack>
                      );
                    })()}

                    <HStack space="sm" alignItems="center">
                      <Button
                        variant="secondary"
                        onPress={async () => {
                          await Clipboard.setStringAsync(directoryDetailRow.title);
                          Alert.alert('Copied', 'Copied to clipboard.');
                        }}
                      >
                        <Text style={styles.secondaryButtonLabel}>Copy</Text>
                      </Button>
                    </HStack>
                  </VStack>
                ) : null}

                {/* Subscription tab */}
                {detailTab === 'subscription' ? (
                  <VStack space="md">
                    <VStack space="xs">
                      {renderDetailField({
                        label: 'Status',
                        value: '',
                        // Hide the TextInput "value" and render the tier as a badge so
                        // it matches the rest of the admin directory UI.
                        inputStyle: { flex: 0, width: 0, paddingHorizontal: 0, paddingVertical: 0 },
                        trailingElement: (
                          <Badge
                            variant={directoryDetailRow.pro.isPro ? 'default' : 'outline'}
                            style={directoryDetailRow.pro.isPro ? styles.proBadge : styles.freeBadge}
                            textStyle={directoryDetailRow.pro.isPro ? styles.proBadgeText : styles.freeBadgeText}
                          >
                            {directoryDetailRow.pro.isPro ? 'Pro' : 'Free'}
                          </Badge>
                        ),
                      })}
                      {renderDetailField({
                        label: 'Source',
                        value: formatProSourceLabel(directoryDetailRow.pro.source),
                        helperText: "Where Kwilt got this user's Pro status (subscription vs redeemed code vs admin grant).",
                      })}
                      {directoryDetailRow.pro.expiresAt
                        ? renderDetailField({
                            label: 'Expires',
                            value: formatExpiresAt(directoryDetailRow.pro.expiresAt),
                          })
                        : renderDetailField({
                            label: 'Expires',
                            value: 'Never',
                          })}

                      {renderDetailField({
                        label: 'Base monthly limit',
                        value: String(
                          directoryDetailRow.pro.isPro
                            ? PRO_GENERATIVE_CREDITS_PER_MONTH
                            : FREE_GENERATIVE_CREDITS_PER_MONTH,
                        ),
                      })}
                      {renderDetailField({
                        label: 'Credits used this month',
                        value: typeof directoryDetailRow.creditsUsed === 'number' ? String(directoryDetailRow.creditsUsed) : '0',
                      })}
                      {renderDetailField({
                        label: 'Current month',
                        value: getMonthKey(new Date()),
                      })}
                    </VStack>

                    <VStack space="sm">
                      <Text style={styles.body}>
                        {directoryDetailRow.pro.isPro
                          ? 'This user has an active Pro subscription. Granting Pro temporarily will create a separate entitlement that bypasses Apple subscription management.'
                          : 'Grant Pro temporarily (1 year). This creates a quota-based entitlement that bypasses Apple subscription management.'}
                      </Text>
                      <Text style={styles.body}>
                        Note: Temporary grants do not affect Apple subscription status. Users with active Apple subscriptions will continue to be billed through Apple.
                      </Text>
                      <Button
                        disabled={!canUseTools}
                        onPress={async () => {
                          if (!canUseTools) return;
                          try {
                            const email = (
                              directoryDetailRow.user?.email ??
                              directoryDetailRow.install?.userEmail ??
                              (Array.isArray(directoryDetailRow.install?.identities) && directoryDetailRow.install?.identities?.length
                                ? directoryDetailRow.install.identities[0]?.userEmail
                                : null) ??
                              ''
                            ).trim();
                            const installId =
                              (Array.isArray(directoryDetailRow.user?.installIds) && directoryDetailRow.user!.installIds!.length
                                ? directoryDetailRow.user!.installIds![0]
                                : directoryDetailRow.install?.installId) ?? '';
                            if (email) {
                              await grantProSuperAdmin({ targetType: 'user', email });
                              Alert.alert('Upgraded', 'Granted Pro for 1 year.');
                              await refreshDirectory();
                              return;
                            }
                            if (installId) {
                              await grantProSuperAdmin({ targetType: 'install', installId });
                              Alert.alert('Upgraded', 'Granted Pro for 1 year.');
                              await refreshDirectory();
                              return;
                            }
                            Alert.alert('Missing target', 'No email or install ID available to grant Pro.');
                          } catch (e: any) {
                            Alert.alert('Unable to upgrade', typeof e?.message === 'string' ? e.message : 'Please try again.');
                          }
                        }}
                      >
                        <Text style={styles.buttonLabel}>
                          {directoryDetailRow.pro.isPro ? 'Grant Pro again (1 year)' : 'Upgrade to Pro'}
                        </Text>
                      </Button>

                      <Button
                        variant="secondary"
                        disabled={!canUseTools || !directoryDetailRow.pro.isPro}
                        onPress={async () => {
                          if (!canUseTools) return;
                          if (!directoryDetailRow.pro.isPro) return;

                          Alert.alert(
                            'Downgrade to Free?',
                            'This revokes Kwilt’s admin-granted Pro entitlement. If the user has a real paid subscription (RevenueCat/Apple), they will remain Pro.',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Downgrade',
                                style: 'destructive',
                                onPress: async () => {
                                  try {
                                    const email = (
                                      directoryDetailRow.user?.email ??
                                      directoryDetailRow.install?.userEmail ??
                                      (Array.isArray(directoryDetailRow.install?.identities) && directoryDetailRow.install?.identities?.length
                                        ? directoryDetailRow.install.identities[0]?.userEmail
                                        : null) ??
                                      ''
                                    ).trim();
                                    const installId =
                                      (Array.isArray(directoryDetailRow.user?.installIds) && directoryDetailRow.user!.installIds!.length
                                        ? directoryDetailRow.user!.installIds![0]
                                        : directoryDetailRow.install?.installId) ?? '';
                                    if (email) {
                                      await revokeProSuperAdmin({ targetType: 'user', email });
                                      Alert.alert('Downgraded', 'Revoked admin Pro entitlement.');
                                      await refreshDirectory();
                                      return;
                                    }
                                    if (installId) {
                                      await revokeProSuperAdmin({ targetType: 'install', installId });
                                      Alert.alert('Downgraded', 'Revoked admin Pro entitlement.');
                                      await refreshDirectory();
                                      return;
                                    }
                                    Alert.alert('Missing target', 'No email or install ID available to revoke Pro.');
                                  } catch (e: any) {
                                    Alert.alert('Unable to downgrade', typeof e?.message === 'string' ? e.message : 'Please try again.');
                                  }
                                },
                              },
                            ],
                          );
                        }}
                      >
                        <Text style={styles.secondaryButtonLabel}>Downgrade to Free</Text>
                      </Button>
                    </VStack>

                    <VStack space="sm">
                      <Text style={styles.body}>Add AI credits</Text>
                      <Text style={styles.body}>
                        Grant bonus credits that add to the user's monthly limit. These are tracked separately from base monthly credits.
                      </Text>
                      <HStack space="sm" alignItems="center">
                        {[25, 100].map((delta) => (
                          <Button
                            key={delta}
                            variant="secondary"
                            disabled={!canUseTools}
                            onPress={async () => {
                              if (!canUseTools) return;
                              try {
                                const installId =
                                  (Array.isArray(directoryDetailRow.user?.installIds) && directoryDetailRow.user!.installIds!.length
                                    ? directoryDetailRow.user!.installIds![0]
                                    : directoryDetailRow.install?.installId) ?? '';
                                if (!installId) {
                                  Alert.alert('Missing install ID', 'We need a device install ID to grant AI credits.');
                                  return;
                                }
                                const res = await grantBonusCreditsSuperAdmin({ installId, bonusActions: delta });
                                Alert.alert(
                                  'Credits granted',
                                  res.bonusThisMonth != null
                                    ? `Granted +${delta}. Bonus credits this month: ${res.bonusThisMonth}.`
                                    : `Granted +${delta}.`,
                                );
                                await refreshDirectory();
                              } catch (e: any) {
                                Alert.alert('Unable to grant credits', typeof e?.message === 'string' ? e.message : 'Please try again.');
                              }
                            }}
                          >
                            <Text style={styles.secondaryButtonLabel}>+{delta}</Text>
                          </Button>
                        ))}
                      </HStack>
                    </VStack>
                  </VStack>
                ) : null}

                {/* Use tab - Dashboard layout */}
                {detailTab === 'use' ? (
                  <VStack space="md">
                    {(() => {
                      const userId = (directoryDetailRow.user?.userId ?? directoryDetailRow.install?.userId ?? '').trim();
                      if (!userId) {
                        return <Text style={styles.body}>No account usage available for this entry.</Text>;
                      }
                      if (useSummaryError) {
                        return <Text style={styles.error}>{useSummaryError}</Text>;
                      }
                      const s = useSummary;
                      const loading = useSummaryLoading && !s;
                      
                      return (
                        <VStack space="md">
                          {/* Hero metrics - key adoption signals */}
                          <View style={styles.useDashboardCard}>
                            <HStack style={styles.useDashboardRow} alignItems="stretch" justifyContent="space-between">
                              <View style={styles.useDashboardCell}>
                                <Text style={styles.useDashboardValue}>
                                  {loading ? '…' : s?.arcs_touched ?? '—'}
                                </Text>
                                <Text style={styles.useDashboardLabel}>Arcs</Text>
                              </View>
                              <View style={styles.useDashboardDivider} />
                              <View style={styles.useDashboardCell}>
                                <Text style={styles.useDashboardValue}>
                                  {loading ? '…' : s?.goals_touched ?? '—'}
                                </Text>
                                <Text style={styles.useDashboardLabel}>Goals</Text>
                              </View>
                              <View style={styles.useDashboardDivider} />
                              <View style={styles.useDashboardCell}>
                                <Text style={styles.useDashboardValue}>
                                  {loading ? '…' : s?.activities_created ?? '—'}
                                </Text>
                                <Text style={styles.useDashboardLabel}>Activities</Text>
                              </View>
                            </HStack>
                          </View>

                          {/* Secondary metrics grid - 2 columns */}
                          <View style={styles.useDashboardCard}>
                            <View style={styles.useMetricsGrid}>
                              <View style={styles.useMetricItem}>
                                <Text style={styles.useMetricValue}>
                                  {loading ? '…' : s?.active_days ?? '—'}
                                </Text>
                                <Text style={styles.useMetricLabel}>Active days (7d)</Text>
                              </View>
                              <View style={styles.useMetricItem}>
                                <Text style={styles.useMetricValue}>
                                  {loading ? '…' : s?.checkins_count ?? '—'}
                                </Text>
                                <Text style={styles.useMetricLabel}>Check-ins (7d)</Text>
                              </View>
                              <View style={styles.useMetricItem}>
                                <Text style={styles.useMetricValue}>
                                  {loading ? '…' : s?.ai_actions_count ?? '—'}
                                </Text>
                                <Text style={styles.useMetricLabel}>AI actions (7d)</Text>
                              </View>
                              <View style={styles.useMetricItem}>
                                <Text style={styles.useMetricValue}>
                                  {loading ? '…' : s?.credits_this_month ?? '—'}
                                </Text>
                                <Text style={styles.useMetricLabel}>Credits (month)</Text>
                              </View>
                              <View style={styles.useMetricItem}>
                                <Text style={styles.useMetricValue}>
                                  {loading ? '…' : s?.credits_per_active_day_7d?.toFixed(1) ?? '—'}
                                </Text>
                                <Text style={styles.useMetricLabel}>Credits/active day</Text>
                              </View>
                              <View style={styles.useMetricItem}>
                                <Text style={styles.useMetricValue}>
                                  {loading ? '…' : s?.days_since_last_credit != null ? `${s.days_since_last_credit}d` : '—'}
                                </Text>
                                <Text style={styles.useMetricLabel}>Since last credit</Text>
                              </View>
                            </View>
                          </View>

                          {/* Status row - activation and recency */}
                          <View style={styles.useDashboardCard}>
                            <HStack space="md" alignItems="center" justifyContent="space-between">
                              <VStack space="xs" style={{ flex: 1 }}>
                                <Text style={styles.useStatusLabel}>Status</Text>
                                <HStack space="xs" alignItems="center">
                                  <View style={[
                                    styles.useStatusDot,
                                    { backgroundColor: s?.is_activated ? colors.indigo600 : colors.gray400 }
                                  ]} />
                                  <Text style={styles.useStatusValue}>
                                    {loading ? '…' : s?.is_activated ? 'Activated' : 'Not activated'}
                                  </Text>
                                </HStack>
                                {s?.activated_at ? (
                                  <Text style={styles.useStatusMeta}>{formatExpiresAt(s.activated_at)}</Text>
                                ) : null}
                              </VStack>
                              <VStack space="xs" style={{ flex: 1 }}>
                                <Text style={styles.useStatusLabel}>Last seen</Text>
                                <Text style={styles.useStatusValue}>
                                  {directoryDetailRow.lastSeenAt 
                                    ? formatExpiresAt(directoryDetailRow.lastSeenAt) 
                                    : '—'}
                                </Text>
                              </VStack>
                            </HStack>
                            {s?.last_meaningful_action_at ? (
                              <View style={styles.useLastActionRow}>
                                <Text style={styles.useStatusMeta}>
                                  Last action: {formatUseActionType(s.last_meaningful_action_type)} • {formatExpiresAt(s.last_meaningful_action_at)}
                                </Text>
                              </View>
                            ) : null}
                          </View>

                          {/* Location map card - always show */}
                          {(() => {
                            const loc = directoryDetailRow.user?.roughLocation ?? directoryDetailRow.install?.roughLocation;
                            
                            // Build location label if we have data
                            const labelParts: string[] = [];
                            if (loc?.city) labelParts.push(loc.city);
                            if (loc?.region) labelParts.push(loc.region);
                            if (loc?.country) labelParts.push(loc.country);
                            if (labelParts.length === 0 && loc?.countryCode) labelParts.push(loc.countryCode);
                            const locationLabel = labelParts.length > 0 ? labelParts.join(', ') : null;
                            
                            // Determine precision info
                            const hasCityLevel = Boolean(loc?.city);
                            const sourceLabel = loc?.source === 'gps' 
                              ? 'GPS' 
                              : loc?.source === 'activity_place' 
                              ? 'Activity' 
                              : loc?.source === 'ip'
                              ? 'IP'
                              : null;
                            
                            // Calculate zoom based on precision
                            const hasCoords = typeof loc?.latitude === 'number' && typeof loc?.longitude === 'number';
                            const zoom = loc?.source === 'gps' ? 13 
                              : loc?.source === 'activity_place' ? 14 
                              : hasCityLevel ? 11 
                              : 6; // Country-level zoom
                            
                            return (
                              <View style={styles.useDashboardCard}>
                                <VStack space="sm">
                                  <HStack space="xs" alignItems="center" justifyContent="space-between">
                                    <Text style={styles.useStatusLabel}>Location</Text>
                                    {sourceLabel ? (
                                      <Text style={styles.useLocationBadge}>
                                        {sourceLabel} {hasCityLevel ? '~5mi' : ''}
                                      </Text>
                                    ) : null}
                                  </HStack>
                                  
                                  <View style={styles.useLocationMapContainer}>
                                    {hasCoords ? (
                                      Platform.OS === 'ios' ? (
                                        <BottomDrawerNativeGestureView style={styles.useLocationMapGestureWrapper}>
                                          <MapView
                                            style={styles.useLocationMap}
                                            mapType="standard"
                                            initialRegion={{
                                              latitude: loc!.latitude!,
                                              longitude: loc!.longitude!,
                                              latitudeDelta: 180 / Math.pow(2, zoom),
                                              longitudeDelta: 180 / Math.pow(2, zoom),
                                            }}
                                            scrollEnabled={true}
                                            zoomEnabled={true}
                                            rotateEnabled={false}
                                            pitchEnabled={false}
                                          >
                                            <Circle
                                              center={{ latitude: loc!.latitude!, longitude: loc!.longitude! }}
                                              radius={loc!.accuracyM || 8000}
                                              strokeWidth={2}
                                              strokeColor={colors.accent}
                                              fillColor="rgba(49,85,69,0.12)"
                                            />
                                          </MapView>
                                        </BottomDrawerNativeGestureView>
                                      ) : (
                                        <StaticMapImage
                                          latitude={loc!.latitude!}
                                          longitude={loc!.longitude!}
                                          heightPx={280}
                                          zoom={zoom}
                                          radiusM={loc!.accuracyM}
                                        />
                                      )
                                    ) : (
                                      <View style={styles.useLocationPlaceholder}>
                                        <Text style={styles.useLocationPlaceholderText}>
                                          {loc ? 'Coordinates not available' : 'No location data'}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                  
                                  {locationLabel ? (
                                    <Text style={styles.useLocationLabel}>{locationLabel}</Text>
                                  ) : (
                                    <Text style={styles.useStatusMeta}>
                                      Location will appear when backend provides roughLocation data
                                    </Text>
                                  )}
                                  {loc?.updatedAtIso ? (
                                    <Text style={styles.useStatusMeta}>
                                      Updated {formatExpiresAt(loc.updatedAtIso)}
                                    </Text>
                                  ) : null}
                                </VStack>
                              </View>
                            );
                          })()}
                        </VStack>
                      );
                    })()}
                  </VStack>
                ) : null}
              </VStack>
            ) : null}
          </BottomDrawerScrollView>
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
    paddingHorizontal: spacing.lg,
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    position: 'relative',
    // Reserve space so the top-right badge never overlaps the row title/meta.
    paddingRight: spacing.md + 72,
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
  rowBadgeWrap: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
  },
  proBadge: {
    backgroundColor: colors.accentMuted,
    borderWidth: 0,
  },
  proBadgeText: {
    color: colors.canvas,
  },
  freeBadge: {
    backgroundColor: colors.fieldFill,
    borderColor: colors.border,
  },
  freeBadgeText: {
    color: colors.textSecondary,
  },
  heroMetricsCard: {
    ...(cardSurfaceStyle as any),
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  heroMetricsRow: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  heroMetricCell: {
    minWidth: 72,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMetricValue: {
    ...typography.bodySm,
    fontFamily: typography.titleSm.fontFamily,
    color: colors.textPrimary,
  },
  heroMetricLabel: {
    fontSize: 11,
    lineHeight: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  heroMetricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: colors.border,
    opacity: 0.6,
    alignSelf: 'center',
    marginHorizontal: spacing.sm,
  },
  // User detail dashboard styles
  useDashboardCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  useDashboardRow: {
    paddingVertical: spacing.xs,
  },
  useDashboardCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  useDashboardValue: {
    ...typography.titleMd,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  useDashboardLabel: {
    fontSize: 11,
    lineHeight: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  useDashboardDivider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
    backgroundColor: colors.border,
    opacity: 0.6,
    alignSelf: 'center',
  },
  useMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  useMetricItem: {
    width: '50%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  useMetricValue: {
    ...typography.body,
    fontFamily: typography.titleSm.fontFamily,
    color: colors.textPrimary,
  },
  useMetricLabel: {
    fontSize: 11,
    lineHeight: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  useStatusLabel: {
    fontSize: 11,
    lineHeight: 14,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  useStatusValue: {
    ...typography.bodySm,
    fontFamily: typography.titleSm.fontFamily,
    color: colors.textPrimary,
  },
  useStatusMeta: {
    fontSize: 11,
    lineHeight: 14,
    color: colors.textSecondary,
  },
  useStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  useLastActionRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  useLocationBadge: {
    fontSize: 10,
    lineHeight: 12,
    color: colors.textSecondary,
    backgroundColor: colors.shellAlt,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  useLocationLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  useLocationMapContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  useLocationMapGestureWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  useLocationMap: {
    flex: 1,
  },
  useLocationPlaceholder: {
    flex: 1,
    backgroundColor: colors.shellAlt,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useLocationPlaceholderText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  // Metrics tab styles
  metricsTimePeriodDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.fieldFill,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 44,
  },
  metricsTimePeriodDropdownLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  metricsTimePeriodMenuItem: {
    ...typography.body,
    color: colors.textPrimary,
  },
  metricsPeriodIndicator: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  metricsHeroCard: {
    backgroundColor: colors.accentMuted,
    borderRadius: 16,
    padding: spacing.lg,
  },
  metricsHeroRow: {
    paddingVertical: spacing.xs,
  },
  metricsHeroCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  metricsHeroValue: {
    ...typography.titleLg,
    color: colors.canvas,
    fontFamily: typography.titleSm.fontFamily,
  },
  metricsHeroLabel: {
    fontSize: 11,
    lineHeight: 14,
    color: colors.canvas,
    opacity: 0.8,
    marginTop: 4,
  },
  metricsHeroDivider: {
    width: StyleSheet.hairlineWidth,
    height: 40,
    backgroundColor: colors.canvas,
    opacity: 0.3,
    alignSelf: 'center',
  },
  metricsCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  metricsCardTitle: {
    ...typography.bodySm,
    fontFamily: typography.titleSm.fontFamily,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  metricsGridItem: {
    width: '33.33%',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  metricsGridValue: {
    ...typography.titleMd,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  metricsGridLabel: {
    fontSize: 11,
    lineHeight: 14,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  metricsComputedAt: {
    fontSize: 11,
    lineHeight: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  metricsMapContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  metricsMap: {
    flex: 1,
    borderRadius: 12,
  },
  metricsMapPlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: colors.shellAlt,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  metricsMapPlaceholderText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  metricsMapHint: {
    fontSize: 11,
    lineHeight: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  metricsMapLegend: {
    fontSize: 11,
    lineHeight: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  metricsMapTapHint: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  metricsMapTapHintText: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.canvas,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    overflow: 'hidden',
  },
  hotspotsModalContainer: {
    flex: 1,
    backgroundColor: colors.shell,
  },
  hotspotsModalMap: {
    flex: 1,
  },
  hotspotsModalPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotspotsModalLegend: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.shell,
  },
});


