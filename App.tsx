import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
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
import {
  reconcileNotificationsFiredEstimated,
  registerNotificationReconcileTask,
} from './src/services/notifications/notificationBackgroundTask';
import { useFirstTimeUxStore } from './src/store/useFirstTimeUxStore';
import { Logo } from './src/ui/Logo';
import { LaunchScreen } from './src/features/onboarding/LaunchScreen';
import { isPosthogDebugEnabled, isPosthogEnabled } from './src/services/analytics/posthog';
import { posthogClient } from './src/services/analytics/posthogClient';

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

  // Lightweight bootstrapping flag so we can show an in-app launch screen
  // between the native splash and the main navigation shell.
  const [isBootstrapped, setIsBootstrapped] = useState(false);

  useEffect(() => {
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
    refreshEntitlements({ force: false }).catch((error) => {
      if (__DEV__) {
        console.warn('[entitlements] refresh failed', error);
      }
    });

    const shouldRunFtue =
      !hasCompletedFirstTimeOnboarding && !isFirstTimeFlowActive;

    if (shouldRunFtue) {
      startFirstTimeFlow();
    }
  }, [
    arcsCount,
    goalsCount,
    activitiesCount,
    hasCompletedFirstTimeOnboarding,
    isFirstTimeFlowActive,
    startFirstTimeFlow,
    refreshEntitlements,
    hapticsEnabled,
  ]);

  useEffect(() => {
    HapticsService.setEnabled(Boolean(hapticsEnabled));
  }, [hapticsEnabled]);

  const handleLaunchScreenComplete = () => {
    setIsBootstrapped(true);
  };

  if (!fontsLoaded) {
    return null;
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

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.shell }]}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <StatusBar style="dark" />
          {/* Preload the Kwilt logo asset as early as possible so coach headers
              can render the mark without a visible pop-in the first time the
              Agent workspace opens. */}
          <Logo size={1} style={styles.logoPreload} />
          {isPosthogEnabled && posthogClient ? (
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
            </PostHogProvider>
          ) : (
            <>
              <RootNavigator />
              <FirstTimeUxFlow />
            </>
          )}
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
  logoPreload: {
    position: 'absolute',
    left: -1000,
    top: -1000,
    opacity: 0,
  },
});
