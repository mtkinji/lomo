import { useEffect } from 'react';
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
import { Poppins_700Bold } from '@expo-google-fonts/poppins';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme';
import { FirstTimeUxFlow } from './src/features/onboarding/FirstTimeUxFlow';
import { useAppStore } from './src/store/useAppStore';
import { NotificationService } from './src/services/NotificationService';
import { useFirstTimeUxStore } from './src/store/useFirstTimeUxStore';
import { Logo } from './src/ui/Logo';

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
    Poppins_700Bold,
  });

  const arcsCount = useAppStore((state) => state.arcs.length);
  const goalsCount = useAppStore((state) => state.goals.length);
  const activitiesCount = useAppStore((state) => state.activities.length);
  const hasCompletedFirstTimeOnboarding = useAppStore(
    (state) => state.hasCompletedFirstTimeOnboarding
  );
  const isFirstTimeFlowActive = useFirstTimeUxStore((state) => state.isFlowActive);
  const startFirstTimeFlow = useFirstTimeUxStore((state) => state.startFlow);

  useEffect(() => {
    // Kick off notifications initialization once per app lifetime.
    NotificationService.init().catch((error) => {
      if (__DEV__) {
        console.warn('[notifications] init failed', error);
      }
    });

    const isFreshInstall = arcsCount === 0 && goalsCount === 0 && activitiesCount === 0;
    if (isFreshInstall && !hasCompletedFirstTimeOnboarding && !isFirstTimeFlowActive) {
      startFirstTimeFlow();
    }
  }, [
    arcsCount,
    goalsCount,
    activitiesCount,
    hasCompletedFirstTimeOnboarding,
    isFirstTimeFlowActive,
    startFirstTimeFlow,
  ]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.shell }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <StatusBar style="dark" />
          {/* Preload the kwilt logo asset as early as possible so coach headers
              can render the mark without a visible pop-in the first time the
              Agent workspace opens. */}
          <Logo size={1} />
          <RootNavigator />
          <FirstTimeUxFlow />
          <PortalHost />
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

