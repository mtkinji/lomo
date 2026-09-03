import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, LogBox, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Device from 'expo-device';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { PortalHost } from './src/ui/Portal';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import {
  Urbanist_500Medium,
  Urbanist_700Bold,
  Urbanist_800ExtraBold,
  Urbanist_900Black,
} from '@expo-google-fonts/urbanist';
import { PostHogProvider } from 'posthog-react-native';
import { RootNavigator, RootNavigatorWithPostHog } from './src/navigation/RootNavigator';
import { colors } from './src/theme';
import {
  FirstTimeUxFlow,
  type FirstTimeUxCapabilityReceipt,
} from './src/features/onboarding/FirstTimeUxFlow';
import { useAppStore } from './src/store/useAppStore';
import { useEntitlementsStore } from './src/store/useEntitlementsStore';
import { NotificationService } from './src/services/NotificationService';
import { HapticsService } from './src/services/HapticsService';
import {
  getSupabaseClient,
  resetSupabaseAuthStorage,
  setSupabaseAutoRefreshEnabled,
} from './src/services/backend/supabaseClient';
import { deriveAuthIdentityFromSession } from './src/services/backend/auth';
import { resolveSelfAvatar } from './src/features/household/data/householdAvatars';
import { getAdminProCodesStatus } from './src/services/proCodes';
import { clearAdminEntitlementsOverrideTier } from './src/services/entitlements';
import {
  reconcileNotificationsFiredEstimated,
} from './src/services/notifications/notificationBackgroundTask';
import { registerKwiltBackgroundTasks } from './src/services/background/registerKwiltBackgroundTasks';
import { LocationOfferService } from './src/services/locationOffers/LocationOfferService';
import './src/services/locationOffers/locationOfferGeofenceTask';
import './src/capabilities/explore/runtime/exploreBackgroundTask';
import { ExploreLabsRuntimeHost } from './src/capabilities/explore/runtime/ExploreLabsRuntimeHost';
import { ChoreCaregiverAttentionRuntimeHost } from './src/capabilities/chores/runtime/ChoreCaregiverAttentionRuntimeHost';
import { useFirstTimeUxStore } from './src/store/useFirstTimeUxStore';
import { Logo } from './src/ui/Logo';
import { CelebrationInterstitialHost } from './src/ui/CelebrationInterstitial';
import { PartnerProgressGuideHost } from './src/ui/PartnerProgressGuide';
import { GlobalSearchDrawer } from './src/features/search/GlobalSearchDrawer';
import { LaunchScreen } from './src/features/onboarding/LaunchScreen';
import {
  FULL_LAUNCH_SCREEN_DURATION_MS,
  resolveLaunchScreenDurationForToday,
} from './src/features/onboarding/launchCadence';
import { isPosthogDebugEnabled, isPosthogEnabled } from './src/services/analytics/posthog';
import { applyPosthogConsent, posthogClient } from './src/services/analytics/posthogClient';
import { resolveAnalyticsConsent, useAnalyticsConsentStore } from './src/services/analytics/analyticsConsent';
import {
  identify as identifyPosthog,
  resetAnalyticsIdentity,
  track as trackPosthog,
} from './src/services/analytics/analytics';
import { AnalyticsEvent } from './src/services/analytics/events';
import {
  trackApplicationOpened,
  trackAppStateTransition,
} from './src/services/analytics/appLifecycleAnalytics';
import { ConfigErrorScreen } from './src/features/onboarding/ConfigErrorScreen';
import {
  WorkflowFeedbackHost,
  WorkflowFeedbackProvider,
} from './src/features/workflow-feedback';
import { SignInInterstitial, type SignInResult } from './src/features/onboarding/SignInInterstitial';
import { ReturningUserPermissionsFlow } from './src/features/onboarding/ReturningUserPermissionsFlow';
import { CapabilityDiscoveryRuntimeHost } from './src/navigation/CapabilityDiscoveryRuntimeHost';
import { FocusSessionRuntimeHost } from './src/features/activities/FocusSessionRuntimeHost';
import { MoneyWidgetStateRuntimeHost } from './src/capabilities/money/runtime/MoneyWidgetStateRuntimeHost';
import { startGlanceableStateSync } from './src/services/appleEcosystem/glanceableStateSync';
import { startSpotlightIndexSync } from './src/services/appleEcosystem/spotlightSync';
import { checkUserHasSyncedData, startDomainSync } from './src/services/sync/domainSync';
import { probeReturningUserWithRetry } from './src/services/sync/returningUserProbe';
import { startStreakSync } from './src/services/sync/streakSync';
import { startPartnerProgressService } from './src/services/partnerProgressService';
import { startScreenTimeProtectionForegroundSync } from './src/services/screenTimeProtectionForegroundSync';
import { startScreenTimeHandoffForegroundSync } from './src/features/screen-time/runtime/screenTimeHandoffForegroundSync';
import { moneySnapshotCache } from './src/capabilities/money/runtime/moneySnapshotCache';
import { loadMoneyPrivacyLockSettings } from './src/capabilities/money/runtime/moneyPrivacyLock';
import { fireResendSignupEvent } from './src/services/resendSignupEvent';
import { startPushTokenSync } from './src/services/pushTokenService';
import { startEntitlementsAuthSync } from './src/services/entitlementsAuthSync';
import { resetUserSpecificState } from './src/store/useAppStore';
import { Text } from './src/ui/primitives';
import { getAuthRuntimeDiagnostics } from './src/utils/getEnv';
import { developmentNotificationLogFilters } from './src/services/notifications/developmentNotificationLogFilters';
import { markAppStarted } from './src/services/performance/startupTelemetry';
import { useCapabilityOnboardingStore } from './src/features/capability-onboarding/useCapabilityOnboardingStore';
import { HouseholdModeHost } from './src/features/household/sharedDevice/HouseholdModeHost';
import { useHouseholdModeStore } from './src/features/household/sharedDevice/useHouseholdModeStore';
import { ManagedChildDeviceHost } from './src/features/household/personalDevice/ManagedChildDeviceHost';
import { restoreManagedChildAccess } from './src/features/household/personalDevice/managedChildAccess';
import { useManagedChildAccessStore } from './src/features/household/personalDevice/useManagedChildAccessStore';
import { parseHouseholdDeviceSetupToken } from './src/features/household/data/householdDeviceParticipation';

LogBox.ignoreLogs(developmentNotificationLogFilters({
  isDev: __DEV__,
  isDevice: Device.isDevice,
}));

markAppStarted();

type AuthStartupState = 'boot' | 'hydratingAuth' | 'signedOut' | 'signedIn';

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
    Urbanist_500Medium,
    Urbanist_700Bold,
    Urbanist_800ExtraBold,
    Urbanist_900Black,
  });

  const arcsCount = useAppStore((state) => state.arcs.length);
  const goalsCount = useAppStore((state) => state.goals.length);
  const activitiesCount = useAppStore((state) => state.activities.length);
  const hasCompletedFirstTimeOnboarding = useAppStore(
    (state) => state.hasCompletedFirstTimeOnboarding
  );
  const isFirstTimeFlowActive = useFirstTimeUxStore((state) => state.isFlowActive);
  const startFirstTimeFlow = useFirstTimeUxStore((state) => state.startFlow);
  const dismissFirstTimeFlow = useFirstTimeUxStore((state) => state.dismissFlow);
  const isPro = useEntitlementsStore((state) => state.isPro);
  const lastResolvedEntitlementsAppUserID = useEntitlementsStore((state) => state.lastResolvedAppUserID);
  const llmModel = useAppStore((state) => state.llmModel);
  const hasCustomizedLlmModel = useAppStore((state) => state.hasCustomizedLlmModel);
  const setLlmModelSystem = useAppStore((state) => state.setLlmModelSystem);
  const hapticsEnabled = useAppStore((state) => state.hapticsEnabled);
  const setAuthIdentity = useAppStore((state) => state.setAuthIdentity);
  const clearAuthIdentity = useAppStore((state) => state.clearAuthIdentity);
  const authIdentity = useAppStore((state) => state.authIdentity);
  const householdModeSession = useHouseholdModeStore((state) => state.session);
  const householdModeHydrated = useHouseholdModeStore((state) => state.hydrated);
  const managedChildAccess = useManagedChildAccessStore((state) => state.access);
  const managedChildAccessHydrated = useManagedChildAccessStore((state) => state.hydrated);
  const managedChildPendingSetup = useManagedChildAccessStore((state) => state.pendingSetup);
  const managedChildManualEntryOpen = useManagedChildAccessStore((state) => state.manualEntryOpen);
  const hydrateManagedChildAccess = useManagedChildAccessStore((state) => state.hydrate);
  const receiveManagedChildSetupLink = useManagedChildAccessStore((state) => state.receiveLink);
  const openManagedChildManualEntry = useManagedChildAccessStore((state) => state.openManualEntry);
  const selectedCapabilityOnboardingPathId = useCapabilityOnboardingStore((state) =>
    authIdentity?.userId
      ? state.recordsByUserId[authIdentity.userId]?.selectedPathId ?? null
      : null,
  );
  const dispatchCapabilityOnboarding = useCapabilityOnboardingStore((state) => state.dispatch);
  const updateUserProfile = useAppStore((state) => state.updateUserProfile);
  const didRunAppInitRef = useRef(false);
  const analyticsConsentStatus = useAnalyticsConsentStore((state) => state.status);
  const analyticsConsentPolicyVersion = useAnalyticsConsentStore((state) => state.policyVersion);
  const analyticsConsentHydrated = useAnalyticsConsentStore((state) => state.hydrated);
  const analyticsConsent = resolveAnalyticsConsent({
    status: analyticsConsentStatus,
    policyVersion: analyticsConsentPolicyVersion,
  });
  const [analyticsRuntimeReady, setAnalyticsRuntimeReady] = useState(false);

  // Lightweight bootstrapping flag so we can show an in-app launch screen
  // between the native splash and the main navigation shell.
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [launchScreenDurationMs, setLaunchScreenDurationMs] = useState(FULL_LAUNCH_SCREEN_DURATION_MS);
  const [bootError, setBootError] = useState<Error | null>(null);
  const [authStartupState, setAuthStartupState] = useState<AuthStartupState>('boot');
  const authHydrationGenerationRef = useRef(0);
  const authHydrationDoneRef = useRef(false);
  
  // Track if user is returning (has existing synced data) vs new after sign-in.
  // null = not yet determined, true = returning user, false = new user
  const [isReturningUser, setIsReturningUser] = useState<boolean | null>(null);
  const [showReturningUserFlow, setShowReturningUserFlow] = useState(false);
  const returningUserProbeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!analyticsConsentHydrated) return;
    let active = true;
    setAnalyticsRuntimeReady(false);
    void applyPosthogConsent(analyticsConsent.enabled).then(() => {
      if (!active) return;
      setAnalyticsRuntimeReady(analyticsConsent.enabled && Boolean(posthogClient));
    });
    return () => { active = false; };
  }, [analyticsConsent.enabled, analyticsConsentHydrated]);

  useEffect(() => {
    if (!analyticsRuntimeReady || !posthogClient) return;
    let previousState = AppState.currentState;
    trackApplicationOpened(posthogClient);
    const subscription = AppState.addEventListener('change', (nextState) => {
      trackAppStateTransition(posthogClient, previousState, nextState);
      previousState = nextState;
    });
    return () => subscription.remove();
  }, [analyticsRuntimeReady]);

  useEffect(() => {
    if (!analyticsRuntimeReady || !posthogClient) return;
    if (authIdentity?.userId) identifyPosthog(posthogClient, authIdentity.userId);
    try {
      posthogClient.reloadFeatureFlags?.();
    } catch (error) {
      if (__DEV__) console.warn('[posthog] reloadFeatureFlags failed', error);
    }
  }, [analyticsRuntimeReady, authIdentity?.userId]);

  useEffect(() => {
    resolveLaunchScreenDurationForToday()
      .then(setLaunchScreenDurationMs)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void loadMoneyPrivacyLockSettings();
  }, []);

  useEffect(() => {
    void restoreManagedChildAccess().then(hydrateManagedChildAccess).catch(() => hydrateManagedChildAccess(null));
  }, [hydrateManagedChildAccess]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !useManagedChildAccessStore.getState().access) return;
      void restoreManagedChildAccess()
        .then(hydrateManagedChildAccess)
        .catch(() => undefined);
    });
    return () => subscription.remove();
  }, [hydrateManagedChildAccess]);

  useEffect(() => {
    const receive = (url: string | null | undefined) => {
      if (!url) return;
      const token = parseHouseholdDeviceSetupToken(url);
      if (token) receiveManagedChildSetupLink(token);
    };
    void Linking.getInitialURL().then(receive).catch(() => undefined);
    const subscription = Linking.addEventListener('url', ({ url }) => receive(url));
    return () => subscription.remove();
  }, [receiveManagedChildSetupLink]);

  useEffect(() => {
    let supabase: ReturnType<typeof getSupabaseClient> | null = null;
    try {
      supabase = getSupabaseClient();
    } catch (error) {
      setBootError(error as Error);
      return;
    }
    let cancelled = false;
    const generation = authHydrationGenerationRef.current + 1;
    authHydrationGenerationRef.current = generation;
    authHydrationDoneRef.current = false;
    setAuthStartupState('hydratingAuth');

    const isStaleRun = () => cancelled || authHydrationGenerationRef.current !== generation;

    const applySignedOutState = (reason: string) => {
      if (isStaleRun()) return;
      const previousUserId = useAppStore.getState().authIdentity?.userId?.trim();
      if (previousUserId) void moneySnapshotCache.remove(previousUserId).catch(() => undefined);
      if (previousUserId) resetAnalyticsIdentity(posthogClient);
      setSupabaseAutoRefreshEnabled(false);
      clearAuthIdentity();
      setAuthStartupState('signedOut');
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log(`[auth] signed_out (${reason})`);
      }
    };

    const applySignedInState = (identity: NonNullable<ReturnType<typeof deriveAuthIdentityFromSession>>, reason: string) => {
      if (isStaleRun()) return;
      // When switching between different accounts, reset user-specific local state
      // (onboarding flags, profile, credits, etc.) so the new user starts clean.
      const prevUserId = useAppStore.getState().authIdentity?.userId;
      if (prevUserId && prevUserId !== identity.userId) {
        void moneySnapshotCache.remove(prevUserId).catch(() => undefined);
        resetAnalyticsIdentity(posthogClient);
        resetUserSpecificState();
      }
      setAuthIdentity(identity);
      // Prefill local coaching profile fields from auth identity without overwriting
      // anything the user has already entered in Profile settings.
      updateUserProfile((current) => {
        const nextName = (identity.name ?? '').trim();
        const nextEmail = (identity.email ?? '').trim();
        const nextAvatar = (identity.avatarUrl ?? '').trim();
        return {
          ...current,
          fullName: current.fullName ?? (nextName ? nextName : undefined),
          email: current.email ?? (nextEmail ? nextEmail : undefined),
          avatarUrl: current.avatarUrl ?? (nextAvatar ? nextAvatar : undefined),
        };
      });
      // Refresh the short-lived private URL at auth hydration so every surface,
      // including Chores, uses the account holder's canonical Kwilt photo.
      void resolveSelfAvatar()
        .then((resolved) => {
          if (!resolved.avatarUrl || useAppStore.getState().authIdentity?.userId !== identity.userId) return;
          updateUserProfile((current) => ({ ...current, avatarUrl: resolved.avatarUrl ?? undefined }));
        })
        .catch(() => undefined);
      setSupabaseAutoRefreshEnabled(true);
      setAuthStartupState('signedIn');
      // Attach the Supabase user_id to PostHog so server-side email events
      // (via `resend-webhook` — Phase 6.3 of docs/email-system-ga-plan.md)
      // merge onto the same person profile as in-app events.
      if (identity.userId) {
        identifyPosthog(posthogClient, identity.userId);
      }
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log(`[auth] signed_in (${reason})`);
      }
    };

    // Keep in sync as auth changes.
    // Important: Supabase can emit an INITIAL_SESSION event with a null session while
    // it's still hydrating from storage. Don't treat that as a real sign-out.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (isStaleRun()) return;
      // If the client gets stuck with a stale refresh token, Supabase may emit refresh-failed events.
      // Clear persisted auth state so the dev client doesn't keep surfacing runtime error banners.
      if (String(event) === 'TOKEN_REFRESH_FAILED') {
        void resetSupabaseAuthStorage().catch(() => undefined);
        applySignedOutState('token_refresh_failed');
        return;
      }

      const identity = deriveAuthIdentityFromSession(session);
      if (identity) {
        applySignedInState(identity, `auth_event:${String(event)}`);
        return;
      }

      // During initial hydration we only treat explicit sign-outs as terminal signed-out state.
      // Ignore null-session INITIAL_SESSION races so we don't flap signed-in users.
      if (!authHydrationDoneRef.current && event !== 'SIGNED_OUT') {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log(`[auth] ignored null-session event during hydrate: ${String(event)}`);
        }
        return;
      }

      if (event === 'SIGNED_OUT') {
        applySignedOutState('auth_event:signed_out');
      }
    });

    // Hydrate once on mount (covers cold start with persisted Supabase session).
    // Add a short grace window to avoid showing "signed out" UI during storage races.
    (async () => {
      let session: any = null;
      for (let i = 0; i < 3; i += 1) {
        try {
          const res = await supabase!.auth.getSession();
          const errMsg = (res as any)?.error?.message;
          if (typeof errMsg === 'string' && errMsg.toLowerCase().includes('invalid refresh token')) {
            // Best-effort: clear stale auth state so we can render signed-out UI quietly.
            await resetSupabaseAuthStorage().catch(() => undefined);
            await supabase!.auth.signOut().catch(() => undefined);
          }
          session = res?.data?.session ?? null;
        } catch {
          session = null;
        }
        if (session) break;
        await new Promise((r) => setTimeout(r, 150 * (i + 1)));
      }
      if (isStaleRun()) return;
      const identity = deriveAuthIdentityFromSession(session);
      if (identity) {
        applySignedInState(identity, 'hydrate:get_session');
      } else {
        applySignedOutState('hydrate:no_session');
      }
      authHydrationDoneRef.current = true;
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[auth] hydrate complete:', identity ? 'signed_in' : 'signed_out');
      }
    })().catch(() => {
      if (isStaleRun()) return;
      authHydrationDoneRef.current = true;
      // Be conservative: if hydration fails, don't force-clear here.
      setAuthStartupState((current) => (current === 'signedIn' ? 'signedIn' : 'signedOut'));
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [setAuthIdentity, clearAuthIdentity, updateUserProfile]);

  useEffect(() => {
    if (authStartupState === 'signedIn' && authIdentity?.userId) {
      startDomainSync();
    }
  }, [authIdentity?.userId, authStartupState]);

  useEffect(() => {
    // Safety: super-admin entitlements overrides should never persist across non-super-admin sessions.
    // Gate on auth hydration: authIdentity starts null before Supabase restores the session,
    // and eagerly clearing the override during that window causes Pro status to be lost.
    if (authStartupState === 'boot' || authStartupState === 'hydratingAuth') return;

    let cancelled = false;
    const run = async () => {
      try {
        if (!authIdentity?.userId) {
          await clearAdminEntitlementsOverrideTier().catch(() => undefined);
          return;
        }
        // We *do* want a valid JWT for this check; ensureSignedInWithPrompt won't re-prompt
        // if a session exists, and it will refresh silently if the token is expiring.
        const status = await getAdminProCodesStatus({ requireAuth: true });
        if (cancelled) return;
        // Only clear on an authoritative 200 confirming the user is not super-admin.
        // Transient failures (network, 401/500) should not downgrade — the override
        // will be re-validated on the next successful check.
        if (status.httpStatus === 200 && status.role !== 'super_admin') {
          await clearAdminEntitlementsOverrideTier().catch(() => undefined);
        }
      } catch {
        // Network / server errors are transient — leave the override intact.
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [authIdentity?.userId, authStartupState]);

  useEffect(() => {
    // One-time app init. Guarded because some deps (like store selectors) can
    // legitimately change identity and we do NOT want to re-run side-effectful init.
    if (didRunAppInitRef.current) return;
    didRunAppInitRef.current = true;

    if (__DEV__) {
      const diagnostics = getAuthRuntimeDiagnostics();
      // eslint-disable-next-line no-console
      console.log('[auth][diagnostics]', diagnostics);
      if (diagnostics.warnings.length > 0) {
        diagnostics.warnings.forEach((warning) => {
          // eslint-disable-next-line no-console
          console.warn('[auth][diagnostics] warning:', warning);
        });
      }
    }

    // Ensure remote feature flags / experiments are available as early as possible.
    // Safe no-op when PostHog is disabled or the client isn't initialized.
    if (isPosthogEnabled && posthogClient) {
      try {
        (posthogClient as any).reloadFeatureFlags?.();
      } catch (error) {
        if (__DEV__) {
          console.warn('[posthog] reloadFeatureFlags failed', error);
        }
      }
    }

    // Kick off notifications initialization once per app lifetime.
    NotificationService.init().catch((error) => {
      if (__DEV__) {
        console.warn('[notifications] init failed', error);
      }
    });

    // Location-based prompts (geofence enter/exit -> local notification).
    LocationOfferService.init().catch((error) => {
      if (__DEV__) {
        console.warn('[locationOffers] init failed', error);
      }
    });

    // Initialize haptics (safe no-op if expo-haptics isn't installed).
    HapticsService.init().catch((error) => {
      if (__DEV__) {
        console.warn('[haptics] init failed', error);
      }
    });
    // Best-effort background work registration. The helper preserves the shared
    // native worker's required ordering and interval semantics.
    registerKwiltBackgroundTasks().catch((error) => {
      if (__DEV__) {
        console.warn('[background] failed to register background tasks', error);
      }
    });
    // Reconcile on launch too (covers cases where background fetch doesn't run).
    reconcileNotificationsFiredEstimated('app_launch').catch((error) => {
      if (__DEV__) {
        console.warn('[notifications] launch reconcile failed', error);
      }
    });

    // Keep iOS "glanceable state" in sync for widgets/Shortcuts/Live Activities.
    // Safe no-op on non-iOS and until native App Group plumbing is wired.
    startGlanceableStateSync();
    // Best-effort Spotlight indexing (Core Spotlight) for Activities.
    startSpotlightIndexSync();
    // Best-effort domain sync (Arcs/Goals/Activities) when authenticated.
    startDomainSync();
    // Best-effort streak sync when authenticated; local streak UX remains available offline.
    startStreakSync();
    // Register/unregister push token based on auth state.
    startPushTokenSync();
    // Bind RevenueCat to the signed-in Kwilt user and refresh account entitlements.
    startEntitlementsAuthSync();
    // Partner progress alerts for shared goals (checks on foreground).
    startPartnerProgressService();
    // Keep Meaningful First app shields applied across launches/foreground returns.
    startScreenTimeProtectionForegroundSync();
    // Preserve the current Kwilt route and surface fresh shield handoffs in one root guide.
    startScreenTimeHandoffForegroundSync();
  }, []);

  useEffect(() => {
    // Pro tier default model upgrade: move Pro users onto GPT‑5.2 without overriding
    // explicit speed/latency preferences (e.g. if they chose 4o/4o-mini).
    if (!isPro) return;
    if (llmModel === 'gpt-5.2') return;
    // Always upgrade older "top" model to the latest.
    if (llmModel === 'gpt-5.1') {
      setLlmModelSystem('gpt-5.2');
      return;
    }
    // For everyone else, only switch defaults if the user hasn't explicitly chosen a model.
    if (!hasCustomizedLlmModel) {
      setLlmModelSystem('gpt-5.2');
    }
  }, [hasCustomizedLlmModel, isPro, llmModel, setLlmModelSystem]);

  useEffect(() => {
    const shouldRunFtue =
      authStartupState === 'signedIn' &&
      !hasCompletedFirstTimeOnboarding &&
      !isFirstTimeFlowActive &&
      isReturningUser === false &&
      !showReturningUserFlow;
    if (shouldRunFtue) {
      startFirstTimeFlow();
    }
  }, [
    authStartupState,
    hasCompletedFirstTimeOnboarding,
    isFirstTimeFlowActive,
    isReturningUser,
    showReturningUserFlow,
    startFirstTimeFlow,
  ]);

  useEffect(() => {
    if (authStartupState !== 'signedIn' || !authIdentity?.userId || hasCompletedFirstTimeOnboarding) {
      returningUserProbeRef.current = null;
      setShowReturningUserFlow(false);
      setIsReturningUser(null);
      return;
    }
    if (showReturningUserFlow) return;
    if (returningUserProbeRef.current === authIdentity.userId) return;
    returningUserProbeRef.current = authIdentity.userId;

    let cancelled = false;
    (async () => {
      const hasSyncedData = await probeReturningUserWithRetry(() =>
        checkUserHasSyncedData(authIdentity.userId));
      if (cancelled) return;
      if (!hasSyncedData) {
        setIsReturningUser(false);
        return;
      }
      setIsReturningUser(true);
      // If FTUE briefly started due earlier assumptions, close it before permissions flow.
      dismissFirstTimeFlow();
      setShowReturningUserFlow(true);
    })().catch(() => {
      if (cancelled) return;
      setIsReturningUser(false);
    });

    return () => {
      cancelled = true;
    };
  }, [
    authStartupState,
    authIdentity?.userId,
    dismissFirstTimeFlow,
    hasCompletedFirstTimeOnboarding,
    showReturningUserFlow,
  ]);

  useEffect(() => {
    HapticsService.setEnabled(Boolean(hapticsEnabled));
  }, [hapticsEnabled]);

  const handleLaunchScreenComplete = () => {
    setIsBootstrapped(true);
  };

  const handleSignInComplete = (result: SignInResult) => {
    setIsReturningUser(result.isReturningUser);
    if (result.isReturningUser && !hasCompletedFirstTimeOnboarding) {
      setShowReturningUserFlow(true);
    } else if (!result.isReturningUser) {
      // New user — fire Resend event to trigger the welcome drip automation
      fireResendSignupEvent();
    }
  };

  const handleReturningUserFlowComplete = () => {
    setShowReturningUserFlow(false);
    // hasCompletedFirstTimeOnboarding is already set by ReturningUserPermissionsFlow
  };

  const handleCapabilityOnboardingComplete = useCallback(
    (receipt: FirstTimeUxCapabilityReceipt) => {
      if (!authIdentity?.userId) return;
      dispatchCapabilityOnboarding(authIdentity.userId, {
        type: 'complete-path',
        pathId: receipt.pathId,
        receiptId: receipt.receiptId,
        now: Date.now(),
      });
      trackPosthog(posthogClient, AnalyticsEvent.CapabilityOnboardingPathCompleted, {
        path_id: receipt.pathId,
        outcome: 'completed',
      });
    },
    [authIdentity?.userId, dispatchCapabilityOnboarding],
  );

  const firstTimeUxEntryMode =
    selectedCapabilityOnboardingPathId === 'make-progress'
      ? 'capability-path' as const
      : 'legacy-first-run' as const;

  if (!fontsLoaded) {
    return null;
  }

  if (bootError) {
    return (
      <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.shell }]}>
        <SafeAreaProvider>
          <BottomSheetModalProvider>
            <StatusBar style="dark" />
            <ConfigErrorScreen message={String(bootError.message ?? bootError)} />
            <PortalHost />
          </BottomSheetModalProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (!isBootstrapped) {
    return (
      <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.pine400 }]}>
        <SafeAreaProvider>
          <BottomSheetModalProvider>
            <StatusBar style="dark" backgroundColor={colors.pine400} />
            {/* Preload the Kwilt logo asset without impacting layout to avoid
                a visible "hairline" at the top of launch surfaces. */}
            <Logo size={1} style={styles.logoPreload} />
            <LaunchScreen
              durationMs={launchScreenDurationMs}
              onAnimationComplete={handleLaunchScreenComplete}
            />
            <PortalHost />
          </BottomSheetModalProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  const authHydrated = authStartupState !== 'boot' && authStartupState !== 'hydratingAuth';
  const isResolvingReturningUserSetup =
    authHydrated &&
    authStartupState === 'signedIn' &&
    Boolean(authIdentity?.userId) &&
    !hasCompletedFirstTimeOnboarding &&
    isReturningUser === null &&
    !showReturningUserFlow;
  const isResolvingEntitlements =
    authHydrated &&
    authStartupState === 'signedIn' &&
    Boolean(authIdentity?.userId) &&
    // A background refresh for an already-resolved user must never unmount the app shell.
    lastResolvedEntitlementsAppUserID !== authIdentity?.userId;

  // Always render app surfaces under SafeAreaProvider so any top-level interstitials
  // (sign-in, returning-user flows, etc.) can safely call `useSafeAreaInsets()`.
  const content = !authHydrated || !householdModeHydrated || !managedChildAccessHydrated ? (
    <View style={styles.authHydrationScreen}>
      <Logo size={64} />
      <Text style={styles.authHydrationText}>Restoring your session…</Text>
    </View>
  ) : isResolvingReturningUserSetup ? (
    <View style={styles.authHydrationScreen}>
      <Logo size={64} />
      <Text style={styles.authHydrationText}>Setting up your account…</Text>
    </View>
  ) : isResolvingEntitlements ? (
    <View style={styles.authHydrationScreen}>
      <Logo size={64} />
    </View>
  ) : managedChildAccess || managedChildPendingSetup || managedChildManualEntryOpen ? (
    <ManagedChildDeviceHost />
  ) : authStartupState === 'signedOut' || !authIdentity ? (
    // Require sign-in for all users (including legacy users who onboarded before auth was required).
    // Their local data will automatically sync to their account once they authenticate.
    <SignInInterstitial
      onSetUpChildDevice={openManagedChildManualEntry}
      onSignInComplete={handleSignInComplete}
    />
  ) : householdModeSession ? (
    <HouseholdModeHost />
  ) : showReturningUserFlow ? (
    // Returning user permissions flow (for users who reinstall with existing data)
    <ReturningUserPermissionsFlow
      visible={showReturningUserFlow}
      onComplete={handleReturningUserFlowComplete}
    />
  ) : analyticsConsent.enabled && analyticsRuntimeReady && isPosthogEnabled && posthogClient ? (
    <PostHogProvider
      client={posthogClient}
      autocapture={{
        // React Navigation v7+ requires manual screen capture.
        captureScreens: false,
      }}
      // Default to quiet analytics in dev/offline environments; enable explicitly
      // via `extra.posthogDebug` when needed.
      debug={__DEV__ && isPosthogDebugEnabled}
    >
      <WorkflowFeedbackProvider>
        <RootNavigatorWithPostHog />
        <FirstTimeUxFlow
          entryMode={firstTimeUxEntryMode}
          onCapabilityComplete={handleCapabilityOnboardingComplete}
        />
        <CelebrationInterstitialHost />
        <PartnerProgressGuideHost />
        <GlobalSearchDrawer />
        <WorkflowFeedbackHost />
      </WorkflowFeedbackProvider>
    </PostHogProvider>
  ) : (
    <WorkflowFeedbackProvider>
      <RootNavigator />
      <FirstTimeUxFlow
        entryMode={firstTimeUxEntryMode}
        onCapabilityComplete={handleCapabilityOnboardingComplete}
      />
      <CelebrationInterstitialHost />
      <PartnerProgressGuideHost />
      <GlobalSearchDrawer />
      <WorkflowFeedbackHost />
    </WorkflowFeedbackProvider>
  );

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.shell }]}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <StatusBar style="dark" />
          {/* Preload the Kwilt logo asset as early as possible so coach headers
              can render the mark without a visible pop-in the first time the
              Agent workspace opens. */}
          <Logo size={1} style={styles.logoPreload} />
          <CapabilityDiscoveryRuntimeHost />
          {content}
          <FocusSessionRuntimeHost />
          <MoneyWidgetStateRuntimeHost userId={authIdentity?.userId ?? null} />
          <ExploreLabsRuntimeHost userId={authIdentity?.userId ?? null} />
          <ChoreCaregiverAttentionRuntimeHost userId={authIdentity?.userId ?? null} />
          <PortalHost />
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  authHydrationScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.shell,
    padding: 24,
    gap: 14,
  },
  authHydrationText: {
    color: colors.textSecondary,
  },
  logoPreload: {
    position: 'absolute',
    left: -1000,
    top: -1000,
    opacity: 0,
  },
});
