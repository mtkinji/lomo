import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { PortalHost } from '@rn-primitives/portal';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import { Urbanist_900Black } from '@expo-google-fonts/urbanist';
import { PostHogProvider } from 'posthog-react-native';
import { RootNavigator, RootNavigatorWithPostHog } from './src/navigation/RootNavigator';
import { colors } from './src/theme';
import { FirstTimeUxFlow } from './src/features/onboarding/FirstTimeUxFlow';
import { useAppStore } from './src/store/useAppStore';
import { useEntitlementsStore } from './src/store/useEntitlementsStore';
import { NotificationService } from './src/services/NotificationService';
import { HapticsService } from './src/services/HapticsService';
import { getSupabaseClient } from './src/services/backend/supabaseClient';
import { deriveAuthIdentityFromSession } from './src/services/backend/auth';
import { getAdminProCodesStatus } from './src/services/proCodes';
import { clearAdminEntitlementsOverrideTier } from './src/services/entitlements';
import {
  reconcileNotificationsFiredEstimated,
  registerNotificationReconcileTask,
} from './src/services/notifications/notificationBackgroundTask';
import { LocationOfferService } from './src/services/locationOffers/LocationOfferService';
import './src/services/locationOffers/locationOfferGeofenceTask';
import { useFirstTimeUxStore } from './src/store/useFirstTimeUxStore';
import { Logo } from './src/ui/Logo';
import { CelebrationInterstitialHost } from './src/ui/CelebrationInterstitial';
import { PartnerProgressGuideHost } from './src/ui/PartnerProgressGuide';
import { LaunchScreen } from './src/features/onboarding/LaunchScreen';
import { isPosthogDebugEnabled, isPosthogEnabled } from './src/services/analytics/posthog';
import { posthogClient } from './src/services/analytics/posthogClient';
import { ConfigErrorScreen } from './src/features/onboarding/ConfigErrorScreen';
import { SignInInterstitial, type SignInResult } from './src/features/onboarding/SignInInterstitial';
import { ReturningUserPermissionsFlow } from './src/features/onboarding/ReturningUserPermissionsFlow';
import { startGlanceableStateSync } from './src/services/appleEcosystem/glanceableStateSync';
import { startSpotlightIndexSync } from './src/services/appleEcosystem/spotlightSync';
import { startDomainSync } from './src/services/sync/domainSync';
import { startPartnerProgressService } from './src/services/partnerProgressService';
import { Text } from './src/ui/primitives';

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
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
  const refreshEntitlements = useEntitlementsStore((state) => state.refreshEntitlements);
  const hapticsEnabled = useAppStore((state) => state.hapticsEnabled);
  const setAuthIdentity = useAppStore((state) => state.setAuthIdentity);
  const clearAuthIdentity = useAppStore((state) => state.clearAuthIdentity);
  const authIdentity = useAppStore((state) => state.authIdentity);
  const didRunAppInitRef = useRef(false);

  // Lightweight bootstrapping flag so we can show an in-app launch screen
  // between the native splash and the main navigation shell.
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [bootError, setBootError] = useState<Error | null>(null);
  const [authHydrated, setAuthHydrated] = useState(false);
  
  // Track if user is returning (has existing synced data) vs new after sign-in.
  // null = not yet determined, true = returning user, false = new user
  const [isReturningUser, setIsReturningUser] = useState<boolean | null>(null);
  const [showReturningUserFlow, setShowReturningUserFlow] = useState(false);

  useEffect(() => {
    let supabase: ReturnType<typeof getSupabaseClient> | null = null;
    try {
      supabase = getSupabaseClient();
    } catch (error) {
      setBootError(error as Error);
      return;
    }
    let cancelled = false;
    setAuthHydrated(false);

    // Keep in sync as auth changes.
    // Important: Supabase can emit an INITIAL_SESSION event with a null session while
    // it's still hydrating from storage. Don't treat that as a real sign-out.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      const identity = deriveAuthIdentityFromSession(session);
      if (identity) {
        setAuthIdentity(identity);
        return;
      }
      if (event === 'SIGNED_OUT') {
        clearAuthIdentity();
      }
    });

    // Hydrate once on mount (covers cold start with persisted Supabase session).
    // Add a short grace window to avoid showing "signed out" UI during storage races.
    (async () => {
      let session: any = null;
      for (let i = 0; i < 3; i += 1) {
        try {
          const res = await supabase!.auth.getSession();
          session = res?.data?.session ?? null;
        } catch {
          session = null;
        }
        if (session) break;
        await new Promise((r) => setTimeout(r, 150 * (i + 1)));
      }
      if (cancelled) return;
      const identity = deriveAuthIdentityFromSession(session);
      if (identity) setAuthIdentity(identity);
      else clearAuthIdentity();
      setAuthHydrated(true);
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[auth] hydrate complete:', identity ? 'signed_in' : 'signed_out');
      }
    })().catch(() => {
      if (cancelled) return;
      // Be conservative: if hydration fails, don't force-clear here.
      setAuthHydrated(true);
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [setAuthIdentity, clearAuthIdentity]);

  useEffect(() => {
    // Safety: super-admin entitlements overrides should never persist across non-super-admin sessions.
    // We don't want to prompt sign-in here; `getAdminProCodesStatus` fails closed.
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
        if (status.role !== 'super_admin') {
          await clearAdminEntitlementsOverrideTier().catch(() => undefined);
        }
      } catch {
        // If we can't confirm super-admin status, fail closed and clear the override.
        await clearAdminEntitlementsOverrideTier().catch(() => undefined);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [authIdentity?.userId]);

  useEffect(() => {
    // When the signed-in identity changes, force-refresh entitlements so:
    // - server-side grants keyed by `user:<id>` become visible immediately
    // - stale cached "Free" doesn't linger after sign-in
    if (!authIdentity?.userId) return;
    refreshEntitlements({ force: true }).catch(() => undefined);
  }, [authIdentity?.userId, refreshEntitlements]);

  useEffect(() => {
    // One-time app init. Guarded because some deps (like store selectors) can
    // legitimately change identity and we do NOT want to re-run side-effectful init.
    if (didRunAppInitRef.current) return;
    didRunAppInitRef.current = true;

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
    // Best-effort background reconciliation for "fired" notifications without a server.
    registerNotificationReconcileTask().catch((error) => {
      if (__DEV__) {
        console.warn('[notifications] failed to register background reconcile task', error);
      }
    });
    // Reconcile on launch too (covers cases where background fetch doesn't run).
    reconcileNotificationsFiredEstimated('app_launch').catch((error) => {
      if (__DEV__) {
        console.warn('[notifications] launch reconcile failed', error);
      }
    });

    // Refresh subscription entitlements early so gating surfaces don’t feel stale.
    // (Do not re-run this on unrelated state changes; it can cause tier flicker.)
    refreshEntitlements({ force: false }).catch((error) => {
      if (__DEV__) {
        console.warn('[entitlements] refresh failed', error);
      }
    });

    // Keep iOS "glanceable state" in sync for widgets/Shortcuts/Live Activities.
    // Safe no-op on non-iOS and until native App Group plumbing is wired.
    startGlanceableStateSync();
    // Best-effort Spotlight indexing (Core Spotlight) for Activities.
    startSpotlightIndexSync();
    // Best-effort domain sync (Arcs/Goals/Activities) when authenticated.
    startDomainSync();
    // Partner progress alerts for shared goals (checks on foreground).
    startPartnerProgressService();
  }, [refreshEntitlements]);

  useEffect(() => {
    const shouldRunFtue = !hasCompletedFirstTimeOnboarding && !isFirstTimeFlowActive;
    if (shouldRunFtue) {
      startFirstTimeFlow();
    }
  }, [hasCompletedFirstTimeOnboarding, isFirstTimeFlowActive, startFirstTimeFlow]);

  useEffect(() => {
    HapticsService.setEnabled(Boolean(hapticsEnabled));
  }, [hapticsEnabled]);

  const handleLaunchScreenComplete = () => {
    setIsBootstrapped(true);
  };

  const handleSignInComplete = (result: SignInResult) => {
    setIsReturningUser(result.isReturningUser);
    if (result.isReturningUser && !hasCompletedFirstTimeOnboarding) {
      // Show permissions-only flow for returning users who haven't finished onboarding on this device
      setShowReturningUserFlow(true);
    }
    // For new users, normal FTUE will start automatically via the effect
  };

  const handleReturningUserFlowComplete = () => {
    setShowReturningUserFlow(false);
    // hasCompletedFirstTimeOnboarding is already set by ReturningUserPermissionsFlow
  };

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
            <LaunchScreen onAnimationComplete={handleLaunchScreenComplete} />
            <PortalHost />
          </BottomSheetModalProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  // Always render app surfaces under SafeAreaProvider so any top-level interstitials
  // (sign-in, returning-user flows, etc.) can safely call `useSafeAreaInsets()`.
  const content = !authHydrated ? (
    <View style={styles.authHydrationScreen}>
      <Logo size={64} />
      <Text style={styles.authHydrationText}>Restoring your session…</Text>
    </View>
  ) : !authIdentity ? (
    // Require sign-in for all users (including legacy users who onboarded before auth was required).
    // Their local data will automatically sync to their account once they authenticate.
    <SignInInterstitial onSignInComplete={handleSignInComplete} />
  ) : showReturningUserFlow ? (
    // Returning user permissions flow (for users who reinstall with existing data)
    <ReturningUserPermissionsFlow
      visible={showReturningUserFlow}
      onComplete={handleReturningUserFlowComplete}
    />
  ) : isPosthogEnabled && posthogClient ? (
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
      <RootNavigatorWithPostHog />
      <FirstTimeUxFlow />
      <CelebrationInterstitialHost />
      <PartnerProgressGuideHost />
    </PostHogProvider>
  ) : (
    <>
      <RootNavigator />
      <FirstTimeUxFlow />
      <CelebrationInterstitialHost />
      <PartnerProgressGuideHost />
    </>
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
          {content}
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
